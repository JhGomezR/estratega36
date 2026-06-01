import { slugify } from '@/lib/slug';

describe('slugify', () => {
  it('lowercases and hyphenates words', () => {
    expect(slugify('Campaña Acme 2026')).toBe('campana-acme-2026');
  });

  it('strips accents/diacritics', () => {
    expect(slugify('José Político')).toBe('jose-politico');
  });

  it('collapses separators and trims leading/trailing hyphens', () => {
    expect(slugify('  --Hola   Mundo!!  ')).toBe('hola-mundo');
  });

  it('caps length at 40 characters', () => {
    expect(slugify('a'.repeat(60)).length).toBe(40);
  });

  it('returns empty string for symbol-only input', () => {
    expect(slugify('!!!')).toBe('');
  });
});
