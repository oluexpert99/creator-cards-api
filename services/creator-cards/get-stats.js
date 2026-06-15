const { throwAppError, ERROR_CODE } = require('@app-core/errors');
const { CreatorCardMessages } = require('@app/messages');
const creatorCardRepository = require('@app/repository/creator-card');

/**
 * F5 (additive feature): view analytics for a card. Honors the same draft/private access
 * rules as public retrieval, so private stats need the access code.
 *
 * @param {{ slug: any, access_code?: any }} serviceData
 * @returns {Promise<{ slug: string, view_count: number, created: number, updated: number }>}
 */
async function getStats(serviceData) {
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

  return {
    slug: card.slug,
    view_count: card.view_count || 0,
    created: card.created,
    updated: card.updated,
  };
}

module.exports = getStats;
