const validator = require('@app-core/validator');
const { throwAppError, ERROR_CODE } = require('@app-core/errors');
const { CreatorCardMessages } = require('@app/messages');
const creatorCardRepository = require('@app/repository/creator-card');
const serializeCard = require('./serialize-card');

// creator_reference is required and must be exactly 20 chars (validator → HTTP 400).
// Per design decision D2 we validate its format but do NOT enforce it matches the card owner,
// because the contract defines no error code for a mismatch.
const deleteSpec = `root {
  creator_reference string<length:20>
}`;

const parsedDeleteSpec = validator.parse(deleteSpec);

/**
 * Soft-delete a Creator Card by slug and return the deleted card (creation format).
 *
 * @param {{ slug: any, creator_reference?: any }} serviceData
 * @returns {Promise<Object>} serialized deleted card (includes access_code, `deleted` set)
 */
async function deleteCard(serviceData) {
  validator.validate(serviceData, parsedDeleteSpec);

  const slug = typeof serviceData.slug === 'string' ? serviceData.slug : '';

  const card = await creatorCardRepository.findOne({ query: { slug } });

  if (!card) {
    throwAppError(CreatorCardMessages.CARD_NOT_FOUND, ERROR_CODE.NF01);
  }

  // Paranoid soft-delete: sets `deleted` and mangles the unique slug in the DB. We build the
  // response from the pre-delete snapshot so the returned slug stays clean.
  await creatorCardRepository.deleteOne({ query: { _id: card._id } });

  return serializeCard({ ...card, deleted: Date.now() }, { includeAccessCode: true });
}

module.exports = deleteCard;
