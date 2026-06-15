const { expect } = require('chai');
const request = require('supertest');
const { startTestApp, stopTestApp, clearDb } = require('../helpers/app');

const CREF = 'crt_8f2k1m9x4p7w3q5z'; // exactly 20 chars
const CREF2 = 'crt_a1b2c3d4e5f6g7h8';

function fullCard(overrides = {}) {
  return {
    title: 'George Cooks',
    description: 'Weekly cooking podcast',
    slug: 'george-cooks',
    creator_reference: CREF,
    links: [{ title: 'YouTube', url: 'https://youtube.com/@georgecooks' }],
    service_rates: {
      currency: 'NGN',
      rates: [{ name: 'IG Story Post', description: 'One story mention', amount: 5000000 }],
    },
    status: 'published',
    ...overrides,
  };
}

describe('Creator Cards API — contract', function () {
  this.timeout(60000);
  let app;

  before(async () => {
    app = await startTestApp();
  });
  after(async () => {
    await stopTestApp();
  });
  beforeEach(async () => {
    await clearDb();
  });

  // ---- POST /creator-cards ----
  describe('POST /creator-cards', () => {
    it('TC1: full creation → 200, access_type defaults public, id not _id', async () => {
      const res = await request(app).post('/creator-cards').send(fullCard());
      expect(res.status).to.equal(200);
      expect(res.body.status).to.equal('success');
      expect(res.body.message).to.equal('Creator Card Created Successfully.');
      expect(res.body.data).to.have.property('id');
      expect(res.body.data).to.not.have.property('_id');
      expect(res.body.data.access_type).to.equal('public');
      expect(res.body.data.access_code).to.equal(null);
      expect(res.body.data.created).to.equal(res.body.data.updated);
      expect(res.body.data.deleted).to.equal(null);
    });

    it('TC2: slug auto-generation from title', async () => {
      const res = await request(app)
        .post('/creator-cards')
        .send({ title: 'Ada Designs Things', creator_reference: CREF2, status: 'published' });
      expect(res.status).to.equal(200);
      expect(res.body.data.slug).to.equal('ada-designs-things');
    });

    it('TC3: private card creation returns access_code', async () => {
      const res = await request(app).post('/creator-cards').send({
        title: 'VIP Rate Card',
        creator_reference: CREF,
        status: 'published',
        access_type: 'private',
        access_code: 'A1B2C3',
      });
      expect(res.status).to.equal(200);
      expect(res.body.data.access_code).to.equal('A1B2C3');
    });

    it('TC7: duplicate slug → 400 SL02 (exact body)', async () => {
      await request(app).post('/creator-cards').send(fullCard());
      const res = await request(app)
        .post('/creator-cards')
        .send(fullCard({ title: 'Another George', creator_reference: 'crt_m1n2b3v4c5x6z7l8' }));
      expect(res.status).to.equal(400);
      expect(res.body).to.deep.equal({
        status: 'error',
        message: 'Slug is already taken',
        code: 'SL02',
      });
    });

    it('TC8: missing access_code on private → 400 AC01', async () => {
      const res = await request(app).post('/creator-cards').send({
        title: 'Secret Card',
        creator_reference: CREF,
        status: 'published',
        access_type: 'private',
      });
      expect(res.status).to.equal(400);
      expect(res.body.code).to.equal('AC01');
    });

    it('TC9: access_code on public card → 400 AC05', async () => {
      const res = await request(app).post('/creator-cards').send({
        title: 'Public Card',
        creator_reference: CREF,
        status: 'published',
        access_type: 'public',
        access_code: 'A1B2C3',
      });
      expect(res.status).to.equal(400);
      expect(res.body.code).to.equal('AC05');
    });

    it('TC10: invalid enum status → 400, no business code', async () => {
      const res = await request(app)
        .post('/creator-cards')
        .send({ title: 'Bad Status Card', creator_reference: CREF, status: 'archived' });
      expect(res.status).to.equal(400);
      expect(res.body).to.not.have.property('code');
    });

    it('rejects title < 3 chars (400)', async () => {
      const res = await request(app)
        .post('/creator-cards')
        .send(fullCard({ title: 'ab', slug: 'abcde' }));
      expect(res.status).to.equal(400);
    });

    it('rejects creator_reference not exactly 20 chars (400)', async () => {
      const res = await request(app)
        .post('/creator-cards')
        .send(fullCard({ creator_reference: 'short' }));
      expect(res.status).to.equal(400);
    });

    it('rejects link url without http(s):// (400)', async () => {
      const res = await request(app)
        .post('/creator-cards')
        .send(fullCard({ links: [{ title: 'Bad', url: 'ftp://x.com' }] }));
      expect(res.status).to.equal(400);
    });

    it('rejects non-integer / zero / negative amount (400)', async () => {
      const amounts = [5.5, 0, -3];
      const responses = await Promise.all(
        amounts.map((amount) =>
          request(app)
            .post('/creator-cards')
            .send(
              fullCard({
                slug: undefined,
                service_rates: { currency: 'NGN', rates: [{ name: 'Svc', amount }] },
              })
            )
        )
      );
      responses.forEach((res, i) => expect(res.status, `amount=${amounts[i]}`).to.equal(400));
    });

    it('rejects empty rates array when service_rates present (400)', async () => {
      const res = await request(app)
        .post('/creator-cards')
        .send(fullCard({ slug: undefined, service_rates: { currency: 'NGN', rates: [] } }));
      expect(res.status).to.equal(400);
    });

    it('rejects access_code that is not 6 alphanumeric (400)', async () => {
      const res = await request(app).post('/creator-cards').send({
        title: 'Card',
        creator_reference: CREF,
        status: 'published',
        access_type: 'private',
        access_code: 'AB!@#$',
      });
      expect(res.status).to.equal(400);
    });
  });

  // ---- GET /creator-cards/:slug ----
  describe('GET /creator-cards/:slug', () => {
    it('TC4: retrieve public published card → 200, no access_code, id not _id', async () => {
      await request(app).post('/creator-cards').send(fullCard());
      const res = await request(app).get('/creator-cards/george-cooks');
      expect(res.status).to.equal(200);
      expect(res.body.message).to.equal('Creator Card Retrieved Successfully.');
      expect(res.body.data).to.have.property('id');
      expect(res.body.data).to.not.have.property('_id');
      expect(res.body.data).to.not.have.property('access_code');
    });

    it('TC5: retrieve private card with correct pin → 200, no access_code field', async () => {
      await request(app).post('/creator-cards').send({
        title: 'VIP Rate Card',
        creator_reference: CREF,
        status: 'published',
        access_type: 'private',
        access_code: 'A1B2C3',
      });
      const res = await request(app).get('/creator-cards/vip-rate-card?access_code=A1B2C3');
      expect(res.status).to.equal(200);
      expect(res.body.data).to.not.have.property('access_code');
    });

    it('TC11: non-existent card → 404 NF01', async () => {
      const res = await request(app).get('/creator-cards/does-not-exist-123');
      expect(res.status).to.equal(404);
      expect(res.body.code).to.equal('NF01');
    });

    it('TC12: draft card → 404 NF02', async () => {
      await request(app)
        .post('/creator-cards')
        .send(fullCard({ slug: 'my-draft-card', status: 'draft' }));
      const res = await request(app).get('/creator-cards/my-draft-card');
      expect(res.status).to.equal(404);
      expect(res.body.code).to.equal('NF02');
    });

    it('TC13: private card without pin → 403 AC03', async () => {
      await request(app).post('/creator-cards').send({
        title: 'VIP Rate Card',
        creator_reference: CREF,
        status: 'published',
        access_type: 'private',
        access_code: 'A1B2C3',
      });
      const res = await request(app).get('/creator-cards/vip-rate-card');
      expect(res.status).to.equal(403);
      expect(res.body.code).to.equal('AC03');
    });

    it('TC14: private card with wrong pin → 403 AC04', async () => {
      await request(app).post('/creator-cards').send({
        title: 'VIP Rate Card',
        creator_reference: CREF,
        status: 'published',
        access_type: 'private',
        access_code: 'A1B2C3',
      });
      const res = await request(app).get('/creator-cards/vip-rate-card?access_code=WRONG1');
      expect(res.status).to.equal(403);
      expect(res.body.code).to.equal('AC04');
    });

    it('rule ordering: draft + private → NF02 (draft precedes private)', async () => {
      await request(app).post('/creator-cards').send({
        title: 'Hidden',
        slug: 'hidden-draft',
        creator_reference: CREF,
        status: 'draft',
        access_type: 'private',
        access_code: 'A1B2C3',
      });
      const res = await request(app).get('/creator-cards/hidden-draft');
      expect(res.status).to.equal(404);
      expect(res.body.code).to.equal('NF02');
    });

    it('NoSQL injection on access_code is handled (never 500)', async () => {
      await request(app).post('/creator-cards').send({
        title: 'VIP Rate Card',
        creator_reference: CREF,
        status: 'published',
        access_type: 'private',
        access_code: 'A1B2C3',
      });
      const res = await request(app).get('/creator-cards/vip-rate-card?access_code[$ne]=x');
      expect(res.status).to.equal(403);
    });
  });

  // ---- DELETE /creator-cards/:slug ----
  describe('DELETE /creator-cards/:slug', () => {
    it('TC6 + TC16: delete returns deleted card, then GET → 404 NF01', async () => {
      await request(app)
        .post('/creator-cards')
        .send({ title: 'Ada Designs Things', creator_reference: CREF2, status: 'published' });

      const del = await request(app)
        .delete('/creator-cards/ada-designs-things')
        .send({ creator_reference: CREF2 });
      expect(del.status).to.equal(200);
      expect(del.body.message).to.equal('Creator Card Deleted Successfully.');
      expect(del.body.data.slug).to.equal('ada-designs-things');
      expect(del.body.data).to.have.property('access_code');
      expect(del.body.data.deleted).to.be.a('number');

      const get = await request(app).get('/creator-cards/ada-designs-things');
      expect(get.status).to.equal(404);
      expect(get.body.code).to.equal('NF01');
    });

    it('TC15: delete non-existent → 404 NF01', async () => {
      const res = await request(app)
        .delete('/creator-cards/does-not-exist-123')
        .send({ creator_reference: CREF });
      expect(res.status).to.equal(404);
      expect(res.body.code).to.equal('NF01');
    });

    it('rejects bad creator_reference length (400)', async () => {
      await request(app).post('/creator-cards').send(fullCard());
      const res = await request(app)
        .delete('/creator-cards/george-cooks')
        .send({ creator_reference: 'nope' });
      expect(res.status).to.equal(400);
    });
  });

  // ---- Cross-cutting ----
  describe('cross-cutting', () => {
    it('malformed JSON → 400, no crash', async () => {
      const res = await request(app)
        .post('/creator-cards')
        .set('Content-Type', 'application/json')
        .send('{ "title": ');
      expect(res.status).to.equal(400);
    });

    it('GET /health → 200', async () => {
      const res = await request(app).get('/health');
      expect(res.status).to.equal(200);
      expect(res.body.data.status).to.equal('ok');
    });
  });

  // ---- Additional features ----
  describe('features', () => {
    it('F1: PATCH publishes a draft and enforces ownership (OW01)', async () => {
      await request(app)
        .post('/creator-cards')
        .send(fullCard({ slug: 'edit-me', status: 'draft' }));

      const wrong = await request(app)
        .patch('/creator-cards/edit-me')
        .send({ creator_reference: CREF2, status: 'published' });
      expect(wrong.status).to.equal(403);
      expect(wrong.body.code).to.equal('OW01');

      const ok = await request(app)
        .patch('/creator-cards/edit-me')
        .send({ creator_reference: CREF, status: 'published', title: 'Edited Title' });
      expect(ok.status).to.equal(200);
      expect(ok.body.data.status).to.equal('published');
      expect(ok.body.data.title).to.equal('Edited Title');
    });

    it('F2: GET /creator-cards lists a creator’s cards, paginated', async () => {
      await request(app)
        .post('/creator-cards')
        .send(fullCard({ slug: 'card-a' }));
      await request(app)
        .post('/creator-cards')
        .send(fullCard({ slug: 'card-b' }));
      const res = await request(app).get(`/creator-cards?creator_reference=${CREF}`);
      expect(res.status).to.equal(200);
      expect(res.body.data.total).to.equal(2);
      expect(res.body.data.items).to.have.length(2);
      expect(res.body.data.items[0]).to.not.have.property('access_code');
    });

    it('F2: missing creator_reference → 400', async () => {
      const res = await request(app).get('/creator-cards');
      expect(res.status).to.equal(400);
    });

    it('F4: Idempotency-Key returns the original card on replay (no duplicate)', async () => {
      const body = fullCard({ slug: 'idem-card' });
      const first = await request(app)
        .post('/creator-cards')
        .set('Idempotency-Key', 'key-123')
        .send(body);
      const second = await request(app)
        .post('/creator-cards')
        .set('Idempotency-Key', 'key-123')
        .send(body);
      expect(first.status).to.equal(200);
      expect(second.status).to.equal(200);
      expect(second.body.data.id).to.equal(first.body.data.id);

      const list = await request(app).get(`/creator-cards?creator_reference=${CREF}`);
      expect(list.body.data.total).to.equal(1);
    });

    it('F4: same key + different payload → 409 ID01', async () => {
      await request(app)
        .post('/creator-cards')
        .set('Idempotency-Key', 'key-x')
        .send(fullCard({ slug: 'idem-x' }));
      const res = await request(app)
        .post('/creator-cards')
        .set('Idempotency-Key', 'key-x')
        .send(fullCard({ slug: 'idem-x', title: 'Totally Different' }));
      expect(res.status).to.equal(409);
      expect(res.body.code).to.equal('ID01');
    });

    it('F5: stats reflect views and honor access rules', async () => {
      await request(app)
        .post('/creator-cards')
        .send(fullCard({ slug: 'stat-card' }));
      await request(app).get('/creator-cards/stat-card');
      await request(app).get('/creator-cards/stat-card');
      // small wait for the fire-and-forget increment to flush
      await new Promise((resolve) => {
        setTimeout(resolve, 150);
      });
      const res = await request(app).get('/creator-cards/stat-card/stats');
      expect(res.status).to.equal(200);
      expect(res.body.data.view_count).to.be.at.least(2);
    });
  });
});
