/**
 * Hash a character address into the deterministic numeric form used by list generators.
 */
export function hashCharacterAddress(address: string): number {
  let hash = 0;
  for (const character of address.toLowerCase()) {
    hash = (hash * 33 + character.charCodeAt(0)) % 4_294_967_291;
  }

  return hash;
}