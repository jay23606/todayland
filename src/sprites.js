// Procedural pixel-art sprites. No art files and no image model: every creature or object is a small
// blocky bitmap assembled from a pool of interchangeable parts (a head shape, a body shape, a limb
// count, an accessory...) chosen by the object's own seed, so the space of possible sprites is large
// rather than four fixed silhouettes with a coat of paint -- two "machine" objects should be able to
// look nothing alike. Left/right are mirrored from the left half, which is all that gets drawn below,
// keeping everything symmetric the way blocky pixel-art creatures read best.
//
// A cell holds one of: 0 empty, 1 base fill, 2 outline/shade, 3 accent, 4 eye/bright highlight. Colour
// itself is not decided here (see sprite-cache.js) -- this module only ever emits those five codes, so
// it stays a plain, seed-in grid-out function with no document/canvas involved.

import { rng, int } from './rng.js'

export const GRID = 16 // both width and height; sprites are square

const grid = () => Array.from({ length: GRID }, () => new Array(GRID).fill(0))
const set = (g, x, y, v) => { if (x >= 0 && x < GRID && y >= 0 && y < GRID) g[y][x] = v }
const rect = (g, x0, y0, w, h, v) => { for (let y = Math.round(y0); y < Math.round(y0 + h); y++) for (let x = Math.round(x0); x < Math.round(x0 + w); x++) set(g, x, y, v) }
const circle = (g, cx, cy, r, v) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + 0.6) set(g, cx + x, cy + y, v) }
const diamond = (g, cx, cy, r, v) => { for (let y = -r; y <= r; y++) { const half = r - Math.abs(y); rect(g, cx - half, cy + y, half * 2 + 1, 1, v) } }
const ring = (g, cx, cy, r, v) => { for (let a = 0; a < 16; a++) set(g, Math.round(cx + Math.cos(a / 16 * Math.PI * 2) * r), Math.round(cy + Math.sin(a / 16 * Math.PI * 2) * r), v) }
const outlineOf = (g, from, to) => { for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) if (g[y][x] === from) { const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const v = g[y + dy]?.[x + dx]; return v === 0 || v === undefined }); if (edge) g[y][x] = to } }

// Mirrors the left half (columns 0..GRID/2-1) onto the right half, so only the left need be drawn.
function mirror(g) {
 const half = GRID / 2
 for (let y = 0; y < GRID; y++) for (let x = 0; x < half; x++) g[y][GRID - 1 - x] = g[y][x]
 return g
}

const HEAD_SHAPES = ['round', 'square', 'diamond']
const pick = (rand, list) => list[Math.floor(rand() * list.length)]

function drawHead(g, cx, cy, r, shape) {
 if (shape === 'square') rect(g, cx - r, cy - r, r * 2 + 1, r * 2 + 1, 1)
 else if (shape === 'diamond') diamond(g, cx, cy, r, 1)
 else circle(g, cx, cy, r, 1)
}

// people: a head (one of three shapes, its own size), a torso, arms and legs that each vary in count
// and stance, and one of a few accessories -- easily dozens of visibly different silhouettes.
function drawPeople(rand) {
 const g = grid()
 const headR = int(rand, 2, 3), headCy = headR + 1, headShape = pick(rand, HEAD_SHAPES)
 drawHead(g, 5, headCy, headR, headShape)
 const torsoTop = headCy + headR, torsoW = int(rand, 3, 4), torsoH = int(rand, 4, 6)
 rect(g, 5 - Math.floor(torsoW / 2), torsoTop, torsoW, torsoH, 1)
 const armLen = int(rand, 2, 4)
 if (rand() < 0.85) rect(g, 5 - Math.floor(torsoW / 2) - 1, torsoTop + 1, 1, armLen, 1) // an arm out to the side
 const legGap = rand() < 0.5 ? 1 : 2, legH = int(rand, 2, 4)
 rect(g, 5 - Math.floor(torsoW / 2), torsoTop + torsoH, 1, legH, 1)
 rect(g, 5 - Math.floor(torsoW / 2) + legGap, torsoTop + torsoH, 1, legH, 1)
 const acc = pick(rand, ['hat', 'antenna', 'halo', 'none', 'none'])
 if (acc === 'hat') rect(g, 5 - headR, headCy - headR - 2, headR * 2 + 1, 2, 3)
 else if (acc === 'antenna') { rect(g, 5, headCy - headR - 3, 1, 3, 2); set(g, 5, headCy - headR - 4, 4) }
 else if (acc === 'halo') ring(g, 5, headCy - headR - 3, 2, 4)
 set(g, 4, headCy - 1, 4)
 const m = mirror(g)
 outlineOf(m, 1, 2)
 return m
}

// animal: a body (round or low), a head out front, a variable number of legs, and a tail or wings/fins
// that come and go -- a two-legged bird-thing and a four-legged low beast both come from this one path.
function drawAnimal(rand) {
 const g = grid()
 const bodyR = int(rand, 3, 5), bodyCy = 11 - Math.floor(bodyR / 2)
 circle(g, 5, bodyCy, bodyR, 1)
 const headR = int(rand, 1, 2)
 circle(g, 5 - bodyR + 1, bodyCy - Math.floor(bodyR / 2), headR, 1)
 const legs = pick(rand, [2, 4]), legH = int(rand, 2, 4)
 const spread = Math.max(1, Math.floor(bodyR / 2))
 for (let i = 0; i < legs / 2; i++) rect(g, 1 + i * spread, bodyCy + bodyR - 1, 1, legH, 1)
 const extra = pick(rand, ['tail', 'wing', 'fin', 'none'])
 if (extra === 'tail') rect(g, 0, bodyCy - 1, 2, 1, 2)
 else if (extra === 'wing') rect(g, 3, bodyCy - bodyR, 3, 1, 3)
 else if (extra === 'fin') diamond(g, 3, bodyCy, 2, 3)
 set(g, 5 - bodyR, bodyCy - Math.floor(bodyR / 2) - 1, 4)
 const m = mirror(g)
 outlineOf(m, 1, 2)
 return m
}

// machine: a boxy or turret-topped body of varying proportions, antennae, a base (treads, legs, or
// wheels), and a sensor array that is one bright eye, two, or a row of three.
function drawMachine(rand) {
 const g = grid()
 const w = int(rand, 4, 6), h = int(rand, 5, 7), top = 12 - h
 rect(g, 2, top, w, h, 1)
 if (rand() < 0.5) rect(g, 3, top - 2, Math.max(2, w - 2), 2, 1) // a turret block on top
 const antennae = pick(rand, [0, 1, 2])
 for (let i = 0; i < antennae; i++) { const ax = 3 + i * 2; rect(g, ax, top - 3, 1, 3, 2); set(g, ax, top - 4, 4) }
 const base = pick(rand, ['treads', 'legs', 'wheels'])
 if (base === 'treads') rect(g, 1, 12, w + 2, 2, 2)
 else if (base === 'wheels') { circle(g, 3, 13, 1, 2); circle(g, 2 + w - 1, 13, 1, 2) }
 else { rect(g, 2, 12, 1, 2, 2); rect(g, 1 + w, 12, 1, 2, 2) }
 const eyes = pick(rand, [1, 2, 3])
 for (let i = 0; i < eyes; i++) set(g, 3 + i * Math.max(1, Math.floor(w / (eyes + 1))), top + 2, 4)
 const m = mirror(g)
 outlineOf(m, 1, 2)
 return m
}

// treasure: a faceted gem, a stacked hex, or a round pearl, in a size that varies well beyond the
// others (a "tiny" or "biggest" headline reads straight through to how big the treasure itself is
// drawn), with a scatter of sparkle accents.
function drawTreasure(rand) {
 const g = grid()
 // centred within the left half (so mirror() -- which overwrites columns 8..15 from 0..7 -- doesn't
 // clobber anything drawn past the midline); r's range is where "how big is this treasure" really shows.
 const shape = pick(rand, ['gem', 'hex', 'pearl']), r = int(rand, 2, 4), cx = 5, cy = 8
 if (shape === 'pearl') circle(g, cx, cy, r, 1)
 else if (shape === 'hex') { rect(g, cx - r, cy - Math.floor(r / 2), r * 2, r, 1); diamond(g, cx, cy - Math.floor(r / 2), r, 1); diamond(g, cx, cy + Math.floor(r / 2), r, 1) }
 else diamond(g, cx, cy, r, 1)
 const sparkles = int(rand, 1, 3)
 for (let i = 0; i < sparkles; i++) set(g, int(rand, Math.max(0, cx - r + 1), cx), int(rand, cy - r + 1, cy + r - 1), 4)
 const m = mirror(g)
 outlineOf(m, 1, 2)
 return m
}

const DRAWERS = { people: drawPeople, animal: drawAnimal, machine: drawMachine, treasure: drawTreasure }

// A deterministic sprite grid for one object: `type` picks the pool of parts it draws from, `seed`
// (any string) picks which parts, their sizes and their arrangement -- so no two seeds need look alike,
// but the same seed always redraws the identical sprite. The player uses type 'people' with their own seed.
export function spriteGrid(type, seed) {
 const rand = rng(`sprite|${type}|${seed}`)
 const draw = DRAWERS[type] || DRAWERS.people
 return draw(rand)
}

export const SPRITE_TYPES = Object.keys(DRAWERS)
