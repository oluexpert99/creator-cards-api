const { createHandler } = require('@app-core/server');
const { appLogger } = require('@app-core/logger');
const { CreatorCardMessages } = require('@app/messages');
const createCard = require('@app/services/creator-cards/create-card');

module.exports = createHandler({
  path: '/creator-cards',
  method: 'post',
  middlewares: [],
  async onResponseEnd(rc, rs) {
    appLogger.info({ slug: rs?.body?.data?.slug }, 'creator-card-create-completed');
  },
  async handler(rc, helpers) {
    const idempotencyKey = rc.headers['idempotency-key'];

    const data = await createCard(rc.body, { idempotencyKey });

    return {
      status: helpers.http_statuses.HTTP_200_OK,
      message: CreatorCardMessages.CARD_CREATED,
      data,
    };
  },
});
