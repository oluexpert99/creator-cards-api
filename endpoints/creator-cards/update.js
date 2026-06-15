const { createHandler } = require('@app-core/server');
const { CreatorCardMessages } = require('@app/messages');
const updateCard = require('@app/services/creator-cards/update-card');

// F1 (additive): PATCH /creator-cards/:slug — edit a card / publish a draft / rotate access_code.
module.exports = createHandler({
  path: '/creator-cards/:slug',
  method: 'patch',
  middlewares: [],
  async handler(rc, helpers) {
    const data = await updateCard({ slug: rc.params.slug, ...rc.body });

    return {
      status: helpers.http_statuses.HTTP_200_OK,
      message: CreatorCardMessages.CARD_UPDATED,
      data,
    };
  },
});
