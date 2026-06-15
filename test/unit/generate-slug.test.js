const { expect } = require('chai');
const { slugifyTitle, generateUniqueSlug } = require('../../services/creator-cards/generate-slug');

describe('slugifyTitle', () => {
  it('lowercases, hyphenates whitespace, strips invalid chars', () => {
    expect(slugifyTitle('Ada Designs Things')).to.equal('ada-designs-things');
    expect(slugifyTitle('George Cooks!! @Home')).to.equal('george-cooks-home');
  });

  it('trims leading/trailing separators', () => {
    expect(slugifyTitle('  Hello  ')).to.equal('hello');
    expect(slugifyTitle('***wow***')).to.equal('wow');
  });
});

describe('generateUniqueSlug', () => {
  it('returns the clean base when long enough and free', async () => {
    const slug = await generateUniqueSlug('Ada Designs Things', async () => false);
    expect(slug).to.equal('ada-designs-things');
  });

  it('appends a 6-char suffix when the base is shorter than 5 chars', async () => {
    const slug = await generateUniqueSlug('Hi', async () => false);
    expect(slug).to.match(/^hi-[a-z0-9]{6}$/);
  });

  it('appends a suffix when the base is already taken', async () => {
    const taken = new Set(['ada-designs-things']);
    const slug = await generateUniqueSlug('Ada Designs Things', async (s) => taken.has(s));
    expect(slug).to.match(/^ada-designs-things-[a-z0-9]{6}$/);
  });

  it('never exceeds 50 characters', async () => {
    const longTitle = 'a'.repeat(80);
    const freeBase = await generateUniqueSlug(longTitle, async () => false);
    expect(freeBase.length).to.be.at.most(50);
    // force a suffix (base taken, suffixed free): the suffixed slug still fits in 50
    const suffixed = await generateUniqueSlug(longTitle, async (s) => !s.includes('-'));
    expect(suffixed.length).to.be.at.most(50);
  });
});
