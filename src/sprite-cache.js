import { spriteGrid, GRID } from './sprites.js'

// Turns a sprite grid (see sprites.js) into an actual small canvas, once per (type, seed, accent)
// combination, so the render loop can just drawImage it every frame instead of re-painting pixels.
// This is the only place sprites.js's plain grids meet a document/canvas, keeping sprites.js itself
// testable without a DOM.

const TYPE_COLORS = {
 people: { base: '#e8b98a', shade: '#a9764f' },
 animal: { base: '#c98a4b', shade: '#8f5f30' },
 machine: { base: '#9fb4c9', shade: '#5b6b7a' },
 treasure: { base: '#ffd23f', shade: '#c98f12' }
}

const cache = new Map()

export function spriteCanvas(type, seed, accent = '#f2f2f2') {
 const key = `${type}|${seed}|${accent}`
 const hit = cache.get(key)
 if (hit) return hit
 const grid = spriteGrid(type, seed)
 const colors = TYPE_COLORS[type] || TYPE_COLORS.people
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
