module.exports = {
  // Success messages (exact strings expected by the assessment contract)
  CARD_CREATED: 'Creator Card Created Successfully.',
  CARD_RETRIEVED: 'Creator Card Retrieved Successfully.',
  CARD_DELETED: 'Creator Card Deleted Successfully.',
  CARD_UPDATED: 'Creator Card Updated Successfully.',
  CARDS_RETRIEVED: 'Creator Cards Retrieved Successfully.',
  STATS_RETRIEVED: 'Creator Card Stats Retrieved Successfully.',

  // Business-rule error messages
  SLUG_TAKEN: 'Slug is already taken',
  ACCESS_CODE_REQUIRED: 'access_code is required when access_type is private',
  ACCESS_CODE_NOT_ALLOWED: 'access_code can only be set on private cards',
  CARD_NOT_FOUND: 'Creator card not found',
  CARD_PRIVATE: 'This card is private. An access code is required',
  INVALID_ACCESS_CODE: 'Invalid access code',
  NOT_CARD_OWNER: 'creator_reference does not match the card owner',
  IDEMPOTENCY_CONFLICT: 'Idempotency-Key was already used with a different payload',

  // Field-shape messages (returned as HTTP 400, validation-class)
  INVALID_SLUG_FORMAT:
    'slug must be 5-50 characters and contain only letters, numbers, hyphens and underscores',
  INVALID_LINK_URL: 'each link url must start with http:// or https://',
  INVALID_AMOUNT: 'each service rate amount must be a positive integer (minor units)',
  INVALID_ACCESS_CODE_FORMAT: 'access_code must be exactly 6 alphanumeric characters',
};
