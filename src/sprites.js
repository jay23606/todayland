// Procedural pixel-art sprites. No art files and no image model: every creature, object and the player
// themselves is a small blocky bitmap built from geometric primitives (a circle for a head, rectangles
// for limbs, a diamond for a gem...) onto a fixed low-res grid, seeded so the same object always draws
// the same sprite. A little per-instance jitter (limb length, an antenna, a sparkle) keeps a row of the
// same creature type from looking identical. Left/right are mirrored from the left half, which is all
// that gets hand-shaped below, so everything stays symmetric the way blocky pixel-art creatures do.
//
// A cell holds one of: 0 empty, 1 base fill, 2 outline/shade, 3 accent, 4 eye/bright highlight.

import { rng, int } from './rng.js'

export const GRID = 16 // both width and height; sprites are square

const grid = () => Array.from({ length: GRID }, () => new Array(GRID).fill(0))
const set = (g, x, y, v) => { if (x >= 0 && x < GRID && y >= 0 && y < GRID) g[y][x] = v }
const rect = (g, x0, y0, w, h, v) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(g, x, y, v) }
const circle = (g, cx, cy, r, v) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + 0.6) set(g, cx + x, cy + y, v) }

// Mirrors the left half (columns 0..GRID/2-1) onto the right half, so only the left need be drawn.
function mirror(g) {
 const half = GRID / 2
 for (let y = 0; y < GRID; y++) for (let x = 0; x < half; x++) g[y][GRID - 1 - x] = g[y][x]
 return g
}

// people: a round head, a torso, two legs, arms out at the sides; a hat or backpack sometimes.
function drawPeople(rand) {
 const g = grid()
 circle(g, 5, 4, 3, 1)
 circle(g, 5, 4, 3, 2); circle(g, 5, 4, 2, 1) // outline ring then refill so only the rim is dark
 set(g, 4, 3, 4); set(g, 4, 3, 4)
 rect(g, 3, 7, 4, 5, 1); rect(g, 3, 7, 4, 1, 2)
 rect(g, 1, 8, 2, 3, 1) // arm
 rect(g, 3, 12, 2, 3, 1); rect(g, 5, 12, 1, 3, 1) // legs, slightly offset for a stride pose
 if (rand() < 0.4) rect(g, 4, 0, 2, 2, 3) // a hat
 return mirror(g)
}

// animal: a low oval body, a small head out front, four short legs, a tail.
function drawAnimal(rand) {
 const g = grid()
 circle(g, 4, 9, 4, 1)
 circle(g, 1, 8, 2, 1)
 set(g, 0, 7, 4)
 rect(g, 1, 11, 1, 3, 1); rect(g, 5, 12, 1, 3, 1)
 rect(g, 0, 9, 2, 1, 2) // tail base
 if (rand() < 0.5) rect(g, 6, 7, 2, 1, 3) // a wing or fin flick
 return mirror(g)
}

// machine: a boxy body with a border, an antenna, glowing eyes, tank-tread feet.
function drawMachine(rand) {
 const g = grid()
 rect(g, 2, 5, 6, 6, 1)
 rect(g, 2, 5, 6, 1, 2); rect(g, 2, 10, 6, 1, 2); rect(g, 2, 5, 1, 6, 2)
 set(g, 4, 7, 4); set(g, 6, 7, 4)
 rect(g, 4, 2, 1, 3, 2); set(g, 4, 1, 3)
 rect(g, 1, 11, 7, 2, 2)
 if (rand() < 0.4) rect(g, 0, 7, 1, 2, 3) // a side vent
 return mirror(g)
}

// treasure: a faceted gem/diamond with sparkle accents that move a little between instances.
function drawTreasure(rand) {
 const g = grid()
 for (let y = 3; y < 13; y++) {
  const half = Math.min(y - 2, 13 - y)
  rect(g, 8 - half, y, half, 1, 1)
 }
 for (let y = 3; y < 13; y++) set(g, 8 - Math.min(y - 2, 13 - y), y, 2)
 set(g, 6, 6, 4); set(g, 5, 9, 3)
 if (rand() < 0.6) set(g, int(rand, 3, 6), int(rand, 4, 10), 4)
 return mirror(g)
}

const DRAWERS = { people: drawPeople, animal: drawAnimal, machine: drawMachine, treasure: drawTreasure }

// A deterministic sprite grid for one object: `type` picks the silhouette, `seed` (any string) picks
// its per-instance variation. The player uses type 'people' with their own seed.
export function spriteGrid(type, seed) {
 const rand = rng(`sprite|${type}|${seed}`)
 const draw = DRAWERS[type] || DRAWERS.people
 return draw(rand)
}

export const SPRITE_TYPES = Object.keys(DRAWERS)
