/** Heraldic crest colors generated deterministically from the name — cosmetic only, zero information. */
export function crestGradient(name: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < name.length; i++) {
    h ^= name.toLowerCase().charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  const hue = h % 360;
  const c1 = `hsl(${hue} 29% 33%)`;
  const c2 = `hsl(${hue} 31% 22%)`;
  return `linear-gradient(135deg, ${c1} 50%, ${c2} 50%)`;
}
