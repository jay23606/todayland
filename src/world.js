import { rng, pick, int, range } from './rng.js'

// Turns a parsed headline into a small explorable world: a terrain grid, a palette, a weather feel,
// and a handful of placed things to find. Everything is derived from one seed, so the same headline
// (and the same day) always builds the identical world for everyone -- nothing here is per-player.

export const W = 26
export const H = 16
export const TILE = 28

export const PALETTES = {
 desert: { base: '#d9b569', low: '#c49f52', high: '#e8ce93', accent: '#8a5a2b' },
 ocean: { base: '#1c5f8a', low: '#164b6e', high: '#2f86bb', accent: '#eaf6ff' },
 ice: { base: '#cfe9f4', low: '#b3dbea', high: '#eef9ff', accent: '#4a89a8' },
 forest: { base: '#2f7a3d', low: '#245e30', high: '#3f9950', accent: '#8a5a2b' },
 mountain: { base: '#8a8579', low: '#726d63', high: '#a8a296', accent: '#4a4640' },
 city: { base: '#2a2c3a', low: '#1e2029', high: '#3b3e52', accent: '#7c6fe0' },
 space: { base: '#0c0b1e', low: '#080715', high: '#171532', accent: '#e0d8ff' },
 tech: { base: '#0d2b2b', low: '#092020', high: '#164343', accent: '#4ce0d8' }
}

export const WEATHER_OF_MOOD = { alarming: 'storm', bright: 'sparkle', calm: 'mist' }

export const CREATURE_GLYPHS = {
 people: ['🧍', '🕴️', '🧑‍🚀'],
 animal: ['🐦', '🐟', '🦋', '🐾'],
 machine: ['🤖', '🚀', '🛰️'],
 treasure: ['💰', '💎', '🪙']
}

const inBounds = (x, y) => x >= 0 && x < W && y >= 0 && y < H

// A terrain grid of small integer variants (0, 1 or 2 -- low/base/high), lightly smoothed so it reads
// as patches rather than static.
function buildTerrain(rand) {
 const raw = Array.from({ length: H }, () => Array.from({ length: W }, () => (rand() < 0.18 ? 2 : rand() < 0.36 ? 0 : 1)))
 const smoothed = raw.map((row, y) => row.map((_, x) => {
  const counts = [0, 0, 0]
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
   const nx = x + dx, ny = y + dy
   if (inBounds(nx, ny)) counts[raw[ny][nx]]++
  }
  let best = 1
  for (let v = 0; v < 3; v++) if (counts[v] > counts[best]) best = v
  return best
 }))
 return smoothed
}

// Object placements, kept apart from each other and the starting point.
function placeObjects(rand, concepts, avoid) {
 const count = Math.max(4, Math.min(18, 4 + concepts.intensity * 3))
 const placed = [...avoid]
 const out = []
 for (let i = 0; i < count; i++) {
  let spot = null
  for (let tries = 0; tries < 40 && !spot; tries++) {
   const x = int(rand, 1, W - 2), y = int(rand, 1, H - 2)
   if (placed.every(p => Math.hypot(p[0] - x, p[1] - y) >= 2)) spot = [x, y]
  }
  if (!spot) break
  placed.push(spot)
  const type = pick(rand, concepts.creatures)
  const glyphs = CREATURE_GLYPHS[type] || CREATURE_GLYPHS.people
  out.push({ id: i, x: spot[0], y: spot[1], type, glyph: pick(rand, glyphs), scale: range(rand, 0.85, 1.25), spin: rand() < 0.3, found: false })
 }
 return out
}

// The full world for one seed. `concepts` is the output of parseHeadline; `seed` is usually the date
// plus the headline, so the day's world is fixed however many times it is rebuilt.
export function buildWorld(concepts, seed) {
 const rand = rng(seed)
 const terrain = buildTerrain(rand)
 const start = [Math.floor(W / 2), Math.floor(H / 2)]
 const objects = placeObjects(rand, concepts, [start])
 const palette = PALETTES[concepts.biome] || PALETTES.forest
 const weather = WEATHER_OF_MOOD[concepts.mood] || 'clear'
 return { seed: String(seed), concepts, terrain, objects, start, palette, weather, w: W, h: H }
}

export const totalToFind = world => world.objects.length
export const foundCount = world => world.objects.filter(o => o.found).length
export const isComplete = world => totalToFind(world) > 0 && foundCount(world) === totalToFind(world)
