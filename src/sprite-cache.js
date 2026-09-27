import { spriteGrid, GRID } from './sprites.js'

// Turns a sprite grid (see sprites.js) into an actual small canvas, once per (type, seed, accent)
// combination, so the render loop can just drawImage it every frame instead of re-painting pixels.
// Colour, like the silhouette itself, is derived from the seed rather than fixed per type: each type
// keeps to a hue/saturation/lightness band so a person still reads as organic and a machine still reads
// as metallic, but the exact hue drifts per instance, so two of the same type are never just the same
// sprite repainted. This is the only place sprites.js's plain grids meet a document/canvas, keeping
// sprites.js itself testable without a DOM.

const TYPE_RANGE = {
 people: { hue: [10, 45], sat: [35, 60], light: [55, 75] }, // skin-tone-ish band
 animal: { hue: [0, 360], sat: [40, 75], light: [35, 60] }, // any hue -- fur/feather/scale colour is wide open
 machine: { hue: [185, 235], sat: [10, 35], light: [45, 70] }, // steely blues and greys
 treasure: { hue: [30, 65], sat: [70, 95], light: [50, 70] } // gold/amber; a gem's accent can still push further
}

const hashUnit = (seed, salt) => {
 let h = 0
 const s = `${seed}|${salt}`
 for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
 return ((h >>> 0) % 10000) / 10000
}
const hsl = (h, s, l) => `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%)`

// Exported (unlike the rest of this file) because it's plain seed-in colour-out logic with nothing
// canvas-shaped about it, and is worth the same test coverage the rest of the game's logic gets.
export function baseColorsFor(type, seed) {
 const r = TYPE_RANGE[type] || TYPE_RANGE.people
 const hue = r.hue[0] + hashUnit(seed, 'hue') * (r.hue[1] - r.hue[0])
 const sat = r.sat[0] + hashUnit(seed, 'sat') * (r.sat[1] - r.sat[0])
 const light = r.light[0] + hashUnit(seed, 'light') * (r.light[1] - r.light[0])
 return { base: hsl(hue, sat, light), shade: hsl(hue, Math.min(100, sat + 12), Math.max(8, light - 28)) }
}

const cache = new Map()

export function spriteCanvas(type, seed, accent = '#f2f2f2') {
 const key = `${type}|${seed}|${accent}`
 const hit = cache.get(key)
 if (hit) return hit
 const grid = spriteGrid(type, seed)
 const colors = baseColorsFor(type, seed)
 const palette = { 1: colors.base, 2: colors.shade, 3: accent, 4: '#ffffff' }
 const c = document.createElement('canvas')
 c.width = GRID; c.height = GRID
 const ctx = c.getContext('2d')
 for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
  const v = grid[y][x]
  if (!v) continue
  ctx.fillStyle = palette[v]
  ctx.fillRect(x, y, 1, 1)
 }
 cache.set(key, c)
 return c
}
