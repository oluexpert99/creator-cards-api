const { createHandler } = require('@app-core/server');
const { CreatorCardMessages } = require('@app/messages');
const listCards = require('@app/services/creator-cards/list-cards');

// F2 (additive): GET /creator-cards?creator_reference=&status=&page=&limit=
module.exports = createHandler({
  path: '/creator-cards',
  method: 'get',
  middlewares: [],
  async handler(rc, helpers) {
    const data = await listCards({
      creator_reference: rc.query.creator_reference,
      status: rc.query.status,
      page: rc.query.page,
      limit: rc.query.limit,
    });

    return {
      status: helpers.http_statuses.HTTP_200_OK,
      message: CreatorCardMessages.CARDS_RETRIEVED,
      data,
    };
  },
});
