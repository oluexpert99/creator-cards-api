/* eslint-disable global-require, import/no-dynamic-require */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Real Mongo (in-process, no Docker) so the unique slug index and paranoid soft-delete behave
// exactly as in production. USE_MOCK_MODEL must NOT be set, or the repo factory swaps in stubs.
delete process.env.USE_MOCK_MODEL;

let mongod;

async function startTestApp() {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  process.env.MONGODB_URI = uri;

  const { createConnection } = require('@app-core/mongoose');
  const { createServer } = require('@app-core/server');
  const models = require('@app/models');

  await createConnection({ uri });
  // Build indexes (unique slug) so duplicate-key behavior is enforced in tests.
  await models.CreatorCard.init();

  const server = createServer({ JSONLimit: '5mb', enableCors: false });

  const endpointDir = path.resolve(__dirname, '../../endpoints/creator-cards');
  fs.readdirSync(endpointDir).forEach((file) => {
    server.addHandler(require(path.join(endpointDir, file)));
  });

  return server.executeRequest;
}

async function stopTestApp() {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}

async function clearDb() {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
}

module.exports = { startTestApp, stopTestApp, clearDb };
