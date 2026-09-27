import { rng, pick, int, range } from './rng.js'
import { headlinesFor, dayKey } from './daily.js'
import { parseHeadline } from './parse.js'

// Turns several parsed headlines into one wide, side-scrolling world: a strip of regions laid out left
// to right, one per headline, each with its own ground profile, palette, weather and placed objects.
// Everything is derived from one seed (the day, or the day plus the headlines), so the same headlines
// always build the identical world for everyone -- nothing here is per-player, and nothing here is a
// class or holds a canvas; it is plain, diffable data a renderer and a physics step both just read.

export const REGION_W = 44 // tiles per region
export const H = 18 // world height, tiles, every region
export const TILE = 24 // pixels per tile, for the renderer

export const PALETTES = {
 desert: { base: '#d9b569', low: '#c49f52', high: '#e8ce93', accent: '#8a5a2b', sky: ['#e8b96a', '#fbe0a6'] },
 ocean: { base: '#1c5f8a', low: '#164b6e', high: '#2f86bb', accent: '#eaf6ff', sky: ['#0e3a5c', '#5fb0d6'] },
 ice: { base: '#cfe9f4', low: '#b3dbea', high: '#eef9ff', accent: '#4a89a8', sky: ['#8fbfd8', '#e7f6ff'] },
 forest: { base: '#2f7a3d', low: '#245e30', high: '#3f9950', accent: '#8a5a2b', sky: ['#2c5a3f', '#a7d98a'] },
 mountain: { base: '#8a8579', low: '#726d63', high: '#a8a296', accent: '#4a4640', sky: ['#5a5f73', '#c2cbe0'] },
 city: { base: '#2a2c3a', low: '#1e2029', high: '#3b3e52', accent: '#7c6fe0', sky: ['#161726', '#4a3e63'] },
 space: { base: '#141230', low: '#0c0b1e', high: '#221f45', accent: '#e0d8ff', sky: ['#05040f', '#231b4a'] },
 tech: { base: '#0d2b2b', low: '#092020', high: '#164343', accent: '#4ce0d8', sky: ['#061a1a', '#0f4444'] }
}

// baseline (row the ground sits near, smaller = higher up the screen), amplitude of the terrain noise,
// and how many floating platforms per unit of intensity -- shapes what walking through a biome feels like.
const TERRAIN_PROFILE = {
 desert: { baseline: 12, amp: 1.4, platforms: 0.6 },
 ocean: { baseline: 13, amp: 0.6, platforms: 0.8 },
 ice: { baseline: 12, amp: 1, platforms: 0.7 },
 forest: { baseline: 11, amp: 2.4, platforms: 1 },
 mountain: { baseline: 8, amp: 4.6, platforms: 0.5 },
 city: { baseline: 12, amp: 0.4, platforms: 1.4 },
 space: { baseline: 15, amp: 0.8, platforms: 2.2 },
 tech: { baseline: 12, amp: 1, platforms: 1.2 }
}

export const WEATHER_OF_MOOD = { alarming: 'storm', bright: 'sparkle', calm: 'mist' }
export const CREATURE_TYPES = ['people', 'animal', 'machine', 'treasure']

// Relation kinds a headline's action word can imply, and the visual property changes they apply to the
// pair of objects they link -- this is where "sentiment/actions" turn into "scale, colour, glow".
const RELATION_STYLE = {
 clash: { glow: '#ff4d4d', scaleMul: 1.25, jitter: true, spread: 1 },
 bond: { glow: '#ffd75d', scaleMul: 1.05, jitter: false, spread: 0.6 },
 boost: { glow: '#5dff9a', scaleMul: 1.3, jitter: false, spread: 0.8 },
 flee: { glow: '#5db3ff', scaleMul: 0.85, jitter: false, spread: 1.6 },
 link: { glow: '#f2f2f2', scaleMul: 1, jitter: false, spread: 0.6 }
}
export const RELATION_STYLES = RELATION_STYLE

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const cosLerp = (a, b, t) => a + (b - a) * (1 - Math.cos(t * Math.PI)) / 2

// A smooth 1-D ground line for one region: control points every 6 tiles, cosine-interpolated between
// them, so it reads as rolling terrain rather than static. `startAt` anchors the first control point to
// where the previous region's ground ended, so regions join without a cliff at the seam.
function buildGround(rand, profile, width, startAt) {
 const step = 6
 const points = [startAt]
 for (let x = step; x < width + step; x += step) points.push(clamp(Math.round(profile.baseline + range(rand, -profile.amp, profile.amp)), 2, H - 2))
 const ground = new Array(width)
 for (let x = 0; x < width; x++) {
  const i = Math.floor(x / step), t = (x % step) / step
  ground[x] = Math.round(cosLerp(points[i], points[i + 1] ?? points[i], t))
 }
 return ground
}

function buildPlatforms(rand, profile, width, ground, x0) {
 const count = Math.round(profile.platforms * 3)
 const out = []
 for (let i = 0; i < count; i++) {
  const w = int(rand, 2, 5)
  const x = int(rand, 1, Math.max(1, width - w - 1))
  const localGroundNear = ground[clamp(x, 0, width - 1)]
  const y = clamp(localGroundNear - int(rand, 3, 8), 2, H - 3)
  out.push({ x: x0 + x, y, w })
 }
 return out
}

// Object placements for a region, kept apart from each other; each stands on the ground or a platform.
function placeObjects(rand, concepts, ground, platforms, x0, width, regionIndex, avoidLocalX) {
 const count = Math.max(3, Math.min(10, 3 + concepts.intensity * 2))
 const usedX = [avoidLocalX]
 const out = []
 for (let i = 0; i < count; i++) {
  let lx = null
  for (let tries = 0; tries < 30 && lx === null; tries++) {
   const cand = int(rand, 2, width - 3)
   if (usedX.every(u => Math.abs(u - cand) >= 3)) lx = cand
  }
  if (lx === null) break
  usedX.push(lx)
  const onPlatform = platforms.length && rand() < 0.4 ? pick(rand, platforms) : null
  const gx = onPlatform ? int(rand, onPlatform.x - x0, onPlatform.x - x0 + onPlatform.w - 1) : lx
  const gy = onPlatform ? onPlatform.y - 1 : ground[clamp(gx, 0, width - 1)] - 1
  const type = pick(rand, concepts.creatures)
  out.push({
   id: `${regionIndex}-${i}`, regionIndex, x: x0 + gx, y: gy, type,
   spriteSeed: `${regionIndex}-${i}-${type}`, scale: range(rand, 0.85, 1.2), glow: null, glowColor: null,
   jitter: false, destroyed: false, label: concepts.subjects[i % Math.max(1, concepts.subjects.length)] || null
  })
 }
 return out
}

// Relations between pairs of objects of different types in the same region -- up to two, styled by the
// headline's action word. Nudges the pair's x apart when the relation calls for distance ('flee').
function buildRelations(rand, objects, relationKind, width, x0) {
 const style = RELATION_STYLE[relationKind] || RELATION_STYLE.link
 const relations = []
 const byType = {}
 for (const o of objects) (byType[o.type] ??= []).push(o)
 const types = Object.keys(byType)
 for (let i = 0; i < types.length - 1 && relations.length < 2; i++) {
  const a = pick(rand, byType[types[i]]), b = pick(rand, byType[types[i + 1]])
  if (!a || !b || a === b) continue
  a.scale *= style.scaleMul; b.scale *= style.scaleMul
  a.glowColor = b.glowColor = style.glow
  a.jitter = b.jitter = style.jitter
  if (style.spread > 1) { const dir = a.x <= b.x ? -1 : 1; a.x = clamp(a.x + dir * 2, x0, x0 + width - 1) }
  relations.push({ a: a.id, b: b.id, kind: relationKind, glow: style.glow })
 }
 return relations
}

function buildRegion(concepts, seed, index, x0, prevGroundEnd) {
 const rand = rng(`${seed}|region${index}`)
 const profile = TERRAIN_PROFILE[concepts.biome] || TERRAIN_PROFILE.forest
 const ground = buildGround(rand, profile, REGION_W, prevGroundEnd ?? profile.baseline)
 const platforms = buildPlatforms(rand, profile, REGION_W, ground, x0)
 const objects = placeObjects(rand, concepts, ground, platforms, x0, REGION_W, index, index === 0 ? 2 : 0)
 const relations = objects.length >= 2 ? buildRelations(rand, objects, concepts.relation, REGION_W, x0) : []
 return {
  index, x0, width: REGION_W, headline: concepts.headline, concepts,
  palette: PALETTES[concepts.biome] || PALETTES.forest, weather: WEATHER_OF_MOOD[concepts.mood] || 'clear',
  ground, platforms, objects, relations
 }
}

// The full world for the day's headlines. `conceptsList` is parseHeadline(...) for each headline, in
// the order they become regions left to right; `seed` is usually the day plus the headlines, so it is
// fixed however many times it is rebuilt, and reproducible from just that string.
export function buildWorld(conceptsList, seed) {
 const list = conceptsList.length ? conceptsList : [{ headline: '', biome: 'forest', mood: 'calm', creatures: ['people'], relation: 'link', subjects: [], intensity: 1, tokens: [] }]
 const regions = []
 let prevEnd = null
 for (let i = 0; i < list.length; i++) {
  const region = buildRegion(list[i], seed, i, i * REGION_W, prevEnd)
  regions.push(region)
  prevEnd = region.ground[region.ground.length - 1]
 }
 const ground = regions.flatMap(r => r.ground)
 const platforms = regions.flatMap(r => r.platforms)
 const objects = regions.flatMap(r => r.objects)
 const relations = regions.flatMap(r => r.relations)
 const w = regions.length * REGION_W
 const start = [2.5, regions[0].ground[2] - 1]
 return { seed: String(seed), regions, ground, platforms, objects, relations, start, w, h: H, tile: TILE }
}

// The ground row (tile units, smaller = higher) directly under a given x, tile coordinates. Clamped to
// the world's edges so a physics step never reads past the ends.
export function groundAt(world, x) {
 const i = clamp(Math.floor(x), 0, world.ground.length - 1)
 return world.ground[i]
}

export const regionAt = (world, x) => world.regions[clamp(Math.floor(x / REGION_W), 0, world.regions.length - 1)]

// Today's whole world, built from today's headlines. `seedExtra` is folded into the seed only through
// the headline text itself, which is already unique per day; a caller can force a specific day for
// testing by passing that day's Date and a matching fetchImpl.
export async function todaysWorld(date = new Date(), opts = {}) {
 const { texts, real } = await headlinesFor(date, opts)
 const conceptsList = texts.map(parseHeadline)
 const day = dayKey(date)
 const world = buildWorld(conceptsList, `${day}|${texts.join('|')}`)
 return { ...world, day, headlines: texts, headlinesReal: real }
}

export const totalTargets = world => world.objects.length
export const destroyedCount = world => world.objects.filter(o => o.destroyed).length
export const isCleared = world => totalTargets(world) > 0 && destroyedCount(world) === totalTargets(world)
