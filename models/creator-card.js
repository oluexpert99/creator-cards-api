const { ModelSchema, SchemaTypes, DatabaseModel } = require('@app-core/mongoose');

const modelName = 'creator_cards';

/**
 * @typedef {Object} CreatorCardSchema
 * @property {String} _id          ULID, serialized as `id` in API responses
 * @property {String} title
 * @property {String} description
 * @property {String} slug         unique public identifier
 * @property {String} creator_reference
 * @property {Array}  links        [{ title, url }]
 * @property {Object} service_rates { currency, rates: [{ name, description, amount }] }
 * @property {String} status       'draft' | 'published'
 * @property {String} access_type  'public' | 'private'
 * @property {String} access_code  6 alphanumeric chars (private only)
 * @property {String} idempotency_key
 * @property {Number} view_count
 * @property {Number} created
 * @property {Number} updated
 * @property {Number} deleted      0 = live; ms epoch once soft-deleted
 */

const schemaConfig = {
  _id: { type: SchemaTypes.ULID, required: true },
  title: { type: SchemaTypes.String, required: true },
  description: { type: SchemaTypes.String },
  slug: { type: SchemaTypes.String, required: true, unique: true, index: true },
  creator_reference: { type: SchemaTypes.String, required: true, index: true },
  links: { type: SchemaTypes.Array, default: [] },
  service_rates: { type: SchemaTypes.Mixed, default: null },
  status: { type: SchemaTypes.String, required: true, index: true },
  // Schema default guards against a Mongoose ValidationError→500 if a path ever
  // omits access_type; the service also defaults it explicitly.
  access_type: { type: SchemaTypes.String, default: 'public' },
  access_code: { type: SchemaTypes.String, default: null },
  idempotency_key: { type: SchemaTypes.String, index: true, default: null },
  idempotency_fingerprint: { type: SchemaTypes.String, default: null },
  view_count: { type: SchemaTypes.Number, default: 0 },
  created: { type: SchemaTypes.Number, required: true },
  updated: { type: SchemaTypes.Number, required: true },
  deleted: { type: SchemaTypes.Number, default: 0, index: true },
};

const modelSchema = new ModelSchema(schemaConfig, { collection: modelName });

/** @type {CreatorCardSchema} */
module.exports = DatabaseModel.model(modelName, modelSchema, { paranoid: true });
