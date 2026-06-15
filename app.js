/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */
if (!process.env.__ALREADY_BOOTSTRAPPED_ENVS) require('dotenv').config();

const fs = require('fs');
const { createServer } = require('@app-core/server');
const { createConnection } = require('@app-core/mongoose');
const { createQueue } = require('@app-core/queue');
const { appLogger } = require('@app-core/logger');

const canLogEndpointInformation = process.env.CAN_LOG_ENDPOINT_INFORMATION;

createConnection({
  uri: process.env.MONGODB_URI,
});

createQueue();

const server = createServer({
  port: process.env.PORT,
  JSONLimit: '150mb',
  enableCors: true,
});

const ENDPOINT_CONFIGS = [
  {
    path: './endpoints/onboarding/',
  },
  {
    path: './endpoints/creator-cards/',
  },
];

function logEndpointMetaData(endpointConfigs) {
  const endpointData = [];
  const storageDirName = './endpoint-data';
  const EXEMPTED_ENDPOINTS_REGEX = /onboarding/;

  endpointConfigs.forEach((endpointConfig) => {
    const { path: basePath, options } = endpointConfig;

    const dirs = fs.readdirSync(basePath);

    dirs.forEach((file) => {
      const handler = require(`${basePath}${file}`);

      if (!EXEMPTED_ENDPOINTS_REGEX.test(basePath) && handler.middlewares?.length) {
        const entry = { method: handler.method, endpoint: handler.path };
        entry.name = file.replaceAll('-', ' ').replace('.js', '');
        entry.display_name = `can ${entry.name}`;

        if (options?.pathPrefix) {
          entry.endpoint = `${options.pathPrefix}${entry.endpoint}`;
          entry.name = `${entry.name} (${options.pathPrefix.replace('/', '')})`;
        }

        endpointData.push(entry);
      }
    });
  });

  if (!fs.existsSync(storageDirName)) {
    fs.mkdirSync(storageDirName);
  }

  fs.writeFileSync(`${storageDirName}/endpoints.json`, JSON.stringify(endpointData, null, 2), {
    encoding: 'utf-8',
  });
}

if (canLogEndpointInformation) {
  logEndpointMetaData(ENDPOINT_CONFIGS);
}

function setupEndpointHandlers(basePath, options = {}) {
  const dirs = fs.readdirSync(basePath);

  dirs.forEach((file) => {
    const handler = require(`${basePath}${file}`);

    if (options.pathPrefix) {
      handler.path = `${options.pathPrefix}${handler.path}`;
    }

    server.addHandler(handler);
  });
}

ENDPOINT_CONFIGS.forEach((config) => {
  setupEndpointHandlers(config.path, config.options);
});

// Interactive API docs at /docs (Swagger UI) and the raw spec at /openapi.json.
// Mounted on the raw express app before startServer() registers the 404 catch-all.
try {
  const swaggerUi = require('swagger-ui-express');
  const yaml = require('js-yaml');
  const openapiDoc = yaml.load(fs.readFileSync(`${__dirname}/openapi.yaml`, 'utf8'));

  server.app.get('/openapi.json', (_req, res) => res.json(openapiDoc));
  server.app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiDoc));
} catch (e) {
  // Docs are non-critical; never block server startup on them.
  appLogger.errorX(e, 'api-docs-mount-failed');
}

server.startServer();
