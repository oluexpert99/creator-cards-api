const { throwAppError, ERROR_CODE } = require('@app-core/errors');
const { appLogger } = require('@app-core/logger');
const { CreatorCardMessages } = require('@app/messages');
const creatorCardRepository = require('@app/repository/creator-card');
const serializeCard = require('./serialize-card');

/**
 * Public retrieval of a Creator Card by slug.
 *
 * Access rules are applied in the exact order mandated by the contract:
 *   1. unknown slug          → NF01 (404)
 *   2. draft card            → NF02 (404)
 *   3. private, no code      → AC03 (403)
 *   4. private, wrong code   → AC04 (403)
 *   5. otherwise             → 200 (access_code omitted from the response)
 *
 * `slug` and `access_code` are type-guarded to strings (NoSQL-injection safety) so a crafted
 * object/array query parameter can never reach Mongo or crash the service.
 *
 * @param {{ slug: any, access_code?: any }} serviceData
 * @returns {Promise<Object>} serialized card (no access_code field)
 */
async function getCard(serviceData) {
  const slug = typeof serviceData.slug === 'string' ? serviceData.slug : '';

  const card = await creatorCardRepository.findOne({ query: { slug } });

  if (!card) {
    throwAppError(CreatorCardMessages.CARD_NOT_FOUND, ERROR_CODE.NF01);
  }

  if (card.status === 'draft') {
    throwAppError(CreatorCardMessages.CARD_NOT_FOUND, ERROR_CODE.NF02);
  }

  if (card.access_type === 'private') {
    const provided = serviceData.access_code !== undefined;
    const accessCode = typeof serviceData.access_code === 'string' ? serviceData.access_code : null;

    if (!provided) {
      throwAppError(CreatorCardMessages.CARD_PRIVATE, ERROR_CODE.AC03);
    }
    if (accessCode === null || accessCode !== card.access_code) {
      throwAppError(CreatorCardMessages.INVALID_ACCESS_CODE, ERROR_CODE.AC04);
    }
  }

  // View analytics (F5): increment asynchronously; never block or fail the response.
  creatorCardRepository
    .updateOne({ query: { _id: card._id }, updateValues: { $inc: { view_count: 1 } } })
    .catch((err) => appLogger.error({ err, slug }, 'creator-card-view-count-failed'));

  return serializeCard(card, { includeAccessCode: false });
}

module.exports = getCard;
