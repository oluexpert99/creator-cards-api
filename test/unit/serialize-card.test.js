const { expect } = require('chai');
const serializeCard = require('../../services/creator-cards/serialize-card');

const baseDoc = {
  _id: '01JG8XYZA2B3C4D5E6F7G8H9J0',
  title: 'George Cooks',
  description: 'Weekly cooking podcast',
  slug: 'george-cooks',
  creator_reference: 'crt_8f2k1m9x4p7w3q5z',
  links: [{ title: 'YouTube', url: 'https://youtube.com/@georgecooks' }],
  service_rates: { currency: 'NGN', rates: [{ name: 'IG Story Post', amount: 5000000 }] },
  status: 'published',
  access_type: 'public',
  access_code: null,
  created: 1767052800000,
  updated: 1767052800000,
  deleted: 0,
  __v: 0,
  view_count: 3,
};

describe('serializeCard', () => {
  it('exposes id, never _id or __v', () => {
    const out = serializeCard(baseDoc, { includeAccessCode: true });
    expect(out.id).to.equal(baseDoc._id);
    expect(out).to.not.have.property('_id');
    expect(out).to.not.have.property('__v');
    expect(out).to.not.have.property('view_count');
  });

  it('maps deleted:0 → null and a timestamp through unchanged', () => {
    expect(serializeCard(baseDoc, {}).deleted).to.equal(null);
    expect(serializeCard({ ...baseDoc, deleted: 1767139200000 }, {}).deleted).to.equal(
      1767139200000
    );
  });

  it('includes access_code only when requested', () => {
    expect(serializeCard(baseDoc, { includeAccessCode: true })).to.have.property('access_code');
    expect(serializeCard(baseDoc, { includeAccessCode: false })).to.not.have.property(
      'access_code'
    );
    expect(serializeCard(baseDoc, {})).to.not.have.property('access_code');
  });

  it('defaults absent optionals (description→null, links→[], service_rates→null)', () => {
    const out = serializeCard(
      {
        _id: 'x',
        title: 't',
        slug: 's',
        creator_reference: 'c',
        status: 'published',
        access_type: 'public',
        created: 1,
        updated: 1,
      },
      {}
    );
    expect(out.description).to.equal(null);
    expect(out.links).to.deep.equal([]);
    expect(out.service_rates).to.equal(null);
  });
});
