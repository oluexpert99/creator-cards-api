const { throwAppError } = require('@app-core/errors');
const creatorCardRepository = require('@app/repository/creator-card');
const serializeCard = require('./serialize-card');

const VALIDATION_CODE = 'SPCL_VALIDATION';
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const STATUSES = ['draft', 'published'];

function toPositiveInt(value, fallback, max) {
  const n = parseInt(value, 10);
  if (!Number.isInteger(n) || n < 1) return fallback;
  return max ? Math.min(n, max) : n;
}

/**
 * F2 (additive feature): list a creator's own cards, paginated.
 * Requires creator_reference (the owner key) so it never leaks other creators' cards.
 *
 * @param {{ creator_reference?: any, status?: any, page?: any, limit?: any }} serviceData
 * @returns {Promise<{ items: Object[], page: number, limit: number, total: number }>}
 */
async function listCards(serviceData) {
  const creatorReference = serviceData.creator_reference;
  if (typeof creatorReference !== 'string' || creatorReference.length === 0) {
    throwAppError('creator_reference query parameter is required', VALIDATION_CODE);
  }

  const query = { creator_reference: creatorReference };

  if (serviceData.status !== undefined) {
    if (!STATUSES.includes(serviceData.status)) {
      throwAppError('status must be one of draft, published', VALIDATION_CODE);
    }
    query.status = serviceData.status;
  }

  const page = toPositiveInt(serviceData.page, 1);
  const limit = toPositiveInt(serviceData.limit, DEFAULT_LIMIT, MAX_LIMIT);

  const total = await creatorCardRepository.raw().countDocuments({ ...query, deleted: 0 });
  const cards = await creatorCardRepository.findMany({
    query,
    options: { sort: { created: -1 }, skip: (page - 1) * limit, limit },
  });

  return {
    items: cards.map((card) => serializeCard(card, { includeAccessCode: false })),
    page,
    limit,
    total,
  };
}

module.exports = listCards;
