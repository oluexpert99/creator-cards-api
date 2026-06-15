/**
 * Maps a raw persisted Creator Card document to the public API shape.
 *
 * Responsibilities (the repo factory returns raw docs via lean()/_doc, bypassing any
 * Mongoose toJSON transform, so this is the single source of truth for the wire shape):
 *  - expose the identifier as `id`, NEVER `_id` (and never leak `__v`)
 *  - map `deleted: 0` → `null`
 *  - include `access_code` only on create/delete responses, never on retrieval
 *
 * @param {Object} doc - raw creator card document
 * @param {{ includeAccessCode?: boolean }} [options]
 * @returns {Object|null}
 */
function serializeCard(doc, options = {}) {
  if (!doc) return null;

  const { includeAccessCode = false } = options;

  const serialized = {
    id: doc._id,
    title: doc.title,
    description: doc.description ?? null,
    slug: doc.slug,
    creator_reference: doc.creator_reference,
    links: Array.isArray(doc.links) ? doc.links : [],
    service_rates: doc.service_rates ?? null,
    status: doc.status,
    access_type: doc.access_type,
  };

  if (includeAccessCode) {
    serialized.access_code = doc.access_code ?? null;
  }

  serialized.created = doc.created;
  serialized.updated = doc.updated;
  serialized.deleted = doc.deleted ? doc.deleted : null;

  return serialized;
}

module.exports = serializeCard;
