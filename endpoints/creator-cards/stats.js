const { createHandler } = require('@app-core/server');
const { CreatorCardMessages } = require('@app/messages');
const getStats = require('@app/services/creator-cards/get-stats');

// F5 (additive): GET /creator-cards/:slug/stats — view analytics.
module.exports = createHandler({
  path: '/creator-cards/:slug/stats',
  method: 'get',
  middlewares: [],
  async handler(rc, helpers) {
    const data = await getStats({
      slug: rc.params.slug,
      access_code: rc.query.access_code,
    });

    return {
      status: helpers.http_statuses.HTTP_200_OK,
      message: CreatorCardMessages.STATS_RETRIEVED,
      data,
    };
  },
});
