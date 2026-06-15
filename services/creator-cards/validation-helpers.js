const { throwAppError } = require('@app-core/errors');
const { CreatorCardMessages } = require('@app/messages');

// Throwing these as SPCL_VALIDATION keeps them in the framework-validation class:
// HTTP 400 with no business `code` (the catch block in core/express/server.js suppresses a
// `code` for SPCL_VALIDATION). These are field-shape rules VSL cannot express, not the
// named business rules (SL02/AC0x/NF0x).
const VALIDATION_CODE = 'SPCL_VALIDATION';

const SLUG_REGEX = /^[A-Za-z0-9_-]+$/;
const ACCESS_CODE_REGEX = /^[A-Za-z0-9]{6}$/;
const URL_PREFIX_REGEX = /^https?:\/\//;

/** A client-provided slug must contain only letters, numbers, hyphens and underscores. */
function assertSlugCharset(slug) {
  if (!SLUG_REGEX.test(slug)) {
    throwAppError(CreatorCardMessages.INVALID_SLUG_FORMAT, VALIDATION_CODE);
  }
}

/** Every link url must start with http:// or https:// (VSL cannot OR two prefixes). */
function assertLinkUrls(links) {
  if (!Array.isArray(links)) return;
  const ok = links.every((link) => link && URL_PREFIX_REGEX.test(String(link.url)));
  if (!ok) {
    throwAppError(CreatorCardMessages.INVALID_LINK_URL, VALIDATION_CODE);
  }
}

/** Each service rate amount must be a positive integer (VSL min:1 doesn't enforce integer-ness). */
function assertRateAmounts(serviceRates) {
  if (!serviceRates || !Array.isArray(serviceRates.rates)) return;
  const ok = serviceRates.rates.every((rate) => Number.isInteger(rate.amount) && rate.amount >= 1);
  if (!ok) {
    throwAppError(CreatorCardMessages.INVALID_AMOUNT, VALIDATION_CODE);
  }
}

/** access_code must be exactly 6 alphanumeric characters (VSL only checks length). */
function assertAccessCodeFormat(accessCode) {
  if (!ACCESS_CODE_REGEX.test(String(accessCode))) {
    throwAppError(CreatorCardMessages.INVALID_ACCESS_CODE_FORMAT, VALIDATION_CODE);
  }
}

module.exports = {
  assertSlugCharset,
  assertLinkUrls,
  assertRateAmounts,
  assertAccessCodeFormat,
};
