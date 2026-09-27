// A small seeded generator, so the same seed always gives the same stream. Everything about a day's
// world comes from one seed (the date, or the date plus the headline), so it can be regenerated
// identically by anyone, tested, and stored as just a string rather than a whole scene.
export function rng(seed) {
 let a = hash(String(seed)) >>> 0
 return () => {
  a = (a + 0x6d2b79f5) >>> 0
  let t = a
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
 }
}

// A stable string hash (djb2), so any seed text becomes a good starting integer.
export function hash(str) {
 let h = 5381
 for (let i = 0; i < str.length; i++) h = (h * 33) ^ str.charCodeAt(i)
 return h >>> 0
}

export const pick = (rand, list) => list[Math.floor(rand() * list.length)]
export const range = (rand, lo, hi) => lo + rand() * (hi - lo)
export const int = (rand, lo, hi) => Math.floor(range(rand, lo, hi + 1))
