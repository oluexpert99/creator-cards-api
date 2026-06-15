const mongoose = require('mongoose');
const { createHandler } = require('@app-core/server');

// Lightweight readiness probe (lives outside /creator-cards, so it never affects the contract).
// Helps Render/Heroku health checks and surfaces DB connectivity at a glance.
module.exports = createHandler({
  path: '/health',
  method: 'get',
  middlewares: [],
  async handler(rc, helpers) {
    const dbReady = mongoose.connection?.readyState === 1;

    return {
      status: helpers.http_statuses.HTTP_200_OK,
      message: 'OK',
      data: {
        status: 'ok',
        db: dbReady ? 'connected' : 'disconnected',
        uptime: Math.round(process.uptime()),
      },
    };
  },
});
