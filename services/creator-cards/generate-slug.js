const { randomBytes } = require('@app-core/randomness');

const SLUG_MIN = 5;
const SLUG_MAX = 50;
const SUFFIX_LENGTH = 6;
const SUFFIX_SEPARATOR = '-';

/**
 * Convert a title into a slug base, per the assessment algorithm:
 *  1. lowercase
 *  2. replace whitespace runs with a single hyphen
 *  3. remove any character that is not a letter, number, hyphen or underscore
 * Trailing/leading separators are trimmed for cleanliness (non-conflicting).
 *
 * @param {string} title
 * @returns {string}
 */
function slugifyTitle(title) {
  return String(title)
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .replace(/^[-_]+|[-_]+$/g, '');
}

/** A random alphanumeric suffix (hex is a valid alphanumeric subset). */
function randomSuffix() {
  return randomBytes(SUFFIX_LENGTH);
}

/** Clamp a slug base to at most `max` characters, trimming any trailing separators. */
function clamp(base, max) {
  if (base.length <= max) return base;
  return base.slice(0, max).replace(/[-_]+$/g, '');
}

/**
 * Generate a unique slug from a title.
 *
 * If the slugified base is shorter than 5 chars OR already taken, a hyphen + 6-char
 * alphanumeric suffix is appended, looping until a free slug is found. The base is clamped
 * so the final slug never exceeds 50 chars.
 *
 * @param {string} title
 * @param {(slug: string) => Promise<boolean>} isTaken - resolves true if the slug already exists
 * @returns {Promise<string>}
 */
async function generateUniqueSlug(title, isTaken) {
  const base = clamp(slugifyTitle(title), SLUG_MAX);

  if (base.length >= SLUG_MIN && !(await isTaken(base))) {
    return base;
  }

  // Append a suffix; clamp the base so `base-XXXXXX` stays within the 50-char limit.
  const clampedBase = clamp(base, SLUG_MAX - SUFFIX_LENGTH - SUFFIX_SEPARATOR.length);

  // Loop until a free slug is found (collisions are astronomically unlikely but handled).
  // eslint-disable-next-line no-await-in-loop, no-constant-condition
  while (true) {
    const candidate = `${clampedBase}${SUFFIX_SEPARATOR}${randomSuffix()}`;
    // eslint-disable-next-line no-await-in-loop
    if (!(await isTaken(candidate))) {
      return candidate;
    }
  }
}

module.exports = { slugifyTitle, generateUniqueSlug, SLUG_MIN, SLUG_MAX };
