const { createHandler } = require('@app-core/server');
const { CreatorCardMessages } = require('@app/messages');
const deleteCard = require('@app/services/creator-cards/delete-card');

module.exports = createHandler({
  path: '/creator-cards/:slug',
  method: 'delete',
  middlewares: [],
  async handler(rc, helpers) {
    const data = await deleteCard({
      slug: rc.params.slug,
      creator_reference: rc.body.creator_reference,
    });

    return {
      status: helpers.http_statuses.HTTP_200_OK,
      message: CreatorCardMessages.CARD_DELETED,
      data,
    };
  },
});
