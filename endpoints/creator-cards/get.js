const { createHandler } = require('@app-core/server');
const { CreatorCardMessages } = require('@app/messages');
const getCard = require('@app/services/creator-cards/get-card');

module.exports = createHandler({
  path: '/creator-cards/:slug',
  method: 'get',
  middlewares: [],
  async handler(rc, helpers) {
    const data = await getCard({
      slug: rc.params.slug,
      access_code: rc.query.access_code,
    });

    return {
      status: helpers.http_statuses.HTTP_200_OK,
      message: CreatorCardMessages.CARD_RETRIEVED,
      data,
    };
  },
});
