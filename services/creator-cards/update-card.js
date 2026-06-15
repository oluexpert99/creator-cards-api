const validator = require('@app-core/validator');
const { throwAppError, ERROR_CODE } = require('@app-core/errors');
const { CreatorCardMessages } = require('@app/messages');
const creatorCardRepository = require('@app/repository/creator-card');
const serializeCard = require('./serialize-card');
const {
  assertSlugCharset,
  assertLinkUrls,
  assertRateAmounts,
  assertAccessCodeFormat,
} = require('./validation-helpers');

// F1 (additive feature). All fields optional except creator_reference (used for ownership).
const updateSpec = `root {
  creator_reference string<length:20>
  title? string<trim|minLength:3|maxLength:100>
  description? string<trim|maxLength:500>
  slug? string<trim|minLength:5|maxLength:50>
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
  status? string(draft|published)
  access_type? string(public|private)
  access_code? string<length:6>
}`;

const parsedUpdateSpec = validator.parse(updateSpec);

async function isSlugTaken(slug) {
  const existing = await creatorCardRepository.findOne({ query: { slug } });
  return Boolean(existing);
}

/**
 * Update a Creator Card by slug. Owner is verified via creator_reference (OW01 on mismatch).
 * @param {Object} serviceData - { slug, ...body }
 * @returns {Promise<Object>} serialized updated card (includes access_code)
 */
async function updateCard(serviceData) {
  const data = validator.validate(serviceData, parsedUpdateSpec);
  const slug = typeof serviceData.slug === 'string' ? serviceData.slug : '';

  const card = await creatorCardRepository.findOne({ query: { slug } });
  if (!card) {
    throwAppError(CreatorCardMessages.CARD_NOT_FOUND, ERROR_CODE.NF01);
  }

  if (data.creator_reference !== card.creator_reference) {
    throwAppError(CreatorCardMessages.NOT_CARD_OWNER, ERROR_CODE.OW01);
  }

  const updateValues = {};

  if (data.title !== undefined) updateValues.title = data.title;
  if (data.description !== undefined) updateValues.description = data.description;
  if (data.status !== undefined) updateValues.status = data.status;
  if (data.links !== undefined) {
    assertLinkUrls(data.links);
    updateValues.links = data.links;
  }
  if (data.service_rates !== undefined) {
    assertRateAmounts(data.service_rates);
    updateValues.service_rates = data.service_rates;
  }

  if (data.slug !== undefined && data.slug !== card.slug) {
    assertSlugCharset(data.slug);
    if (await isSlugTaken(data.slug)) {
      throwAppError(CreatorCardMessages.SLUG_TAKEN, ERROR_CODE.SL02);
    }
    updateValues.slug = data.slug;
  }

  // Keep access_type/access_code consistent after the change.
  const effectiveAccessType = data.access_type || card.access_type;
  const accessCodeProvided =
    serviceData.access_code !== undefined && serviceData.access_code !== null;

  if (effectiveAccessType === 'private') {
    if (accessCodeProvided) {
      assertAccessCodeFormat(data.access_code);
      updateValues.access_code = data.access_code;
    } else if (!card.access_code) {
      throwAppError(CreatorCardMessages.ACCESS_CODE_REQUIRED, ERROR_CODE.AC01);
    }
    if (data.access_type === 'private') updateValues.access_type = 'private';
  } else {
    if (accessCodeProvided) {
      throwAppError(CreatorCardMessages.ACCESS_CODE_NOT_ALLOWED, ERROR_CODE.AC05);
    }
    if (data.access_type === 'public') {
      updateValues.access_type = 'public';
      updateValues.access_code = null;
    }
  }

  try {
    await creatorCardRepository.updateOne({ query: { _id: card._id }, updateValues });
  } catch (err) {
    if (err.errorCode === ERROR_CODE.DUPLRCRD) {
      throwAppError(CreatorCardMessages.SLUG_TAKEN, ERROR_CODE.SL02);
    }
    throw err;
  }

  const updated = await creatorCardRepository.findOne({ query: { _id: card._id } });
  return serializeCard(updated, { includeAccessCode: true });
}

module.exports = updateCard;
