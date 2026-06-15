/* eslint-disable global-require */
/**
 * Dev convenience: boot the app against an in-process MongoDB (no Docker / no Atlas needed).
 * Usage: node scripts/dev-memory.js   (run from the project root)
 *
 * For real deployments use `npm start` (node bootstrap.js) with MONGODB_URI set.
 */
const { MongoMemoryServer } = require('mongodb-memory-server');

(async () => {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  if (!process.env.PORT) process.env.PORT = '3000';

  require('../app.js');

  const { appLogger } = require('@app-core/logger');
  const base = `http://localhost:${process.env.PORT}`;
  appLogger.info({ base, docs: `${base}/docs`, health: `${base}/health` }, 'dev-memory-server-ready');

  const shutdown = async () => {
    await mongod.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
})();
