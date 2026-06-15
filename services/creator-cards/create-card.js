const crypto = require('crypto');
const validator = require('@app-core/validator');
const { throwAppError, ERROR_CODE } = require('@app-core/errors');
const { appLogger } = require('@app-core/logger');
const { CreatorCardMessages } = require('@app/messages');
const creatorCardRepository = require('@app/repository/creator-card');
const serializeCard = require('./serialize-card');
const { generateUniqueSlug } = require('./generate-slug');
const {
  assertSlugCharset,
  assertLinkUrls,
  assertRateAmounts,
  assertAccessCodeFormat,
} = require('./validation-helpers');

// VSL handles types, required/optional, lengths, numeric min and enums.
// Charset / url-prefix / integer-ness / conditional access_code rules are business logic.
const createSpec = `root {
  title string<trim|minLength:3|maxLength:100>
  description? string<trim|maxLength:500>
  slug? string<trim|minLength:5|maxLength:50>
  creator_reference string<length:20>
  links[]? {
    title string<trim|minLength:1|maxLength:100>
    url string<trim|maxLength:200>
  }
  service_rates? {
    currency string(NGN|USD|GBP|GHS)
    rates[] {
      name string<trim|minLength:3|maxLength:100>
      description? string<trim|maxLength:250>
      amount number<min:1>
    }
  }
  status string(draft|published)
  access_type? string(public|private)
  access_code? string<length:6>
}`;

const parsedCreateSpec = validator.parse(createSpec);

async function isSlugTaken(slug) {
  const existing = await creatorCardRepository.findOne({ query: { slug } });
  return Boolean(existing);
}

/** Stable fingerprint of the meaningful create payload (for idempotent replay detection). */
function fingerprintPayload(data) {
  const stable = JSON.stringify(data, Object.keys(data).sort());
  return crypto.createHash('sha256').update(stable).digest('hex');
}

/**
 * Create a Creator Card.
 * @param {Object} serviceData - raw request body
 * @param {{ idempotencyKey?: string }} [options]
 * @returns {Promise<Object>} serialized card (includes access_code)
 */
async function createCard(serviceData, options = {}) {
  const data = validator.validate(serviceData, parsedCreateSpec);

  // Field-shape rules VSL cannot express (all HTTP 400).
  if (data.slug) assertSlugCharset(data.slug);
  assertLinkUrls(data.links);
  assertRateAmounts(data.service_rates);

  // access_type defaults to public when omitted.
  const accessType = data.access_type || 'public';

  // Conditional access_code rules — presence is read from the RAW body, because the validator
  // drops fields and we must know what the client actually sent.
  const accessCodeProvided =
    serviceData.access_code !== undefined && serviceData.access_code !== null;

  if (accessType === 'private') {
    if (!accessCodeProvided) {
      throwAppError(CreatorCardMessages.ACCESS_CODE_REQUIRED, ERROR_CODE.AC01);
    }
    assertAccessCodeFormat(data.access_code);
  } else if (accessCodeProvided) {
    throwAppError(CreatorCardMessages.ACCESS_CODE_NOT_ALLOWED, ERROR_CODE.AC05);
  }

  const payload = {
    title: data.title,
    description: data.description ?? null,
    creator_reference: data.creator_reference,
    links: data.links || [],
    service_rates: data.service_rates ?? null,
    status: data.status,
    access_type: accessType,
    access_code: accessType === 'private' ? data.access_code : null,
  };

  // Idempotency-Key replay (F4): same key + same payload returns the original card.
  const { idempotencyKey } = options;
  let fingerprint;
  if (idempotencyKey) {
    fingerprint = fingerprintPayload({ ...payload, slug: data.slug || null });
    const prior = await creatorCardRepository.findOne({
      query: { idempotency_key: idempotencyKey, creator_reference: data.creator_reference },
    });
    if (prior) {
      if (prior.idempotency_fingerprint && prior.idempotency_fingerprint !== fingerprint) {
        throwAppError(CreatorCardMessages.IDEMPOTENCY_CONFLICT, ERROR_CODE.ID01);
      }
      return serializeCard(prior, { includeAccessCode: true });
    }
    payload.idempotency_key = idempotencyKey;
    payload.idempotency_fingerprint = fingerprint;
  }

  // Slug resolution: provided slug must be unique (SL02); otherwise auto-generate.
  if (data.slug) {
    if (await isSlugTaken(data.slug)) {
      throwAppError(CreatorCardMessages.SLUG_TAKEN, ERROR_CODE.SL02);
    }
    payload.slug = data.slug;
  } else {
    payload.slug = await generateUniqueSlug(data.title, isSlugTaken);
  }

  let card;
  try {
    card = await creatorCardRepository.create(payload);
  } catch (err) {
    // Race-safe net: the unique slug index throws E11000 → DUPLICATE_RECORD; map to SL02.
    if (err.errorCode === ERROR_CODE.DUPLRCRD) {
      appLogger.info({ slug: payload.slug }, 'creator-card-duplicate-slug');
      throwAppError(CreatorCardMessages.SLUG_TAKEN, ERROR_CODE.SL02);
    }
    throw err;
  }

  return serializeCard(card, { includeAccessCode: true });
}

module.exports = createCard;
