/**
 * Converts an arbitrary display name into a safe slug for use as a Firestore
 * document id / database id segment: lowercase, ASCII, hyphen-separated,
 * max 40 chars. Pure (no I/O) so it is easy to unit-test.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}
