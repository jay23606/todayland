import test from 'node:test'
import assert from 'node:assert/strict'
import { spriteGrid, GRID, SPRITE_TYPES } from '../src/sprites.js'

test('every sprite type draws a full, square, symmetric, non-empty grid', () => {
 for (const type of SPRITE_TYPES) {
  const g = spriteGrid(type, 'a')
  assert.equal(g.length, GRID)
  for (const row of g) assert.equal(row.length, GRID)
  const filled = g.flat().filter(v => v !== 0).length
  assert.ok(filled > 8, `${type} should draw something`)
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID / 2; x++) assert.equal(g[y][x], g[y][GRID - 1 - x], `${type} row ${y} col ${x} mirrors`)
 }
})

test('an unknown type falls back to a sane drawing instead of throwing', () => {
 assert.doesNotThrow(() => spriteGrid('nonsense', 'x'))
})

test('the same type and seed always draws the identical grid; a different seed usually differs', () => {
 const a = spriteGrid('animal', 'seed-1')
 const b = spriteGrid('animal', 'seed-1')
 assert.deepEqual(a, b)
 let differences = 0
 for (let i = 2; i < 40; i++) if (JSON.stringify(spriteGrid('animal', 'seed-' + i)) !== JSON.stringify(a)) differences++
 assert.ok(differences > 0, 'at least some seeds should draw a visibly different sprite')
})

test('sprites are genuinely varied, not a small handful of shapes recolored: most of a big sample of seeds are unique', () => {
 for (const type of SPRITE_TYPES) {
  const seen = new Set()
  for (let i = 0; i < 80; i++) seen.add(JSON.stringify(spriteGrid(type, 'variety-' + i)))
  assert.ok(seen.size >= 50, `${type}: only ${seen.size}/80 distinct sprites`)
 }
})

test('sprite sizes vary: the drawn silhouette is not the same footprint every time', () => {
 for (const type of SPRITE_TYPES) {
  const footprints = new Set()
  for (let i = 0; i < 30; i++) {
   const g = spriteGrid(type, 'size-' + i)
   footprints.add(g.flat().filter(v => v !== 0).length)
  }
  assert.ok(footprints.size >= 5, `${type}: sprite silhouettes barely vary in size`)
 }
})

test('cell values are only the five known codes', () => {
 const known = new Set([0, 1, 2, 3, 4])
 for (const type of SPRITE_TYPES) for (const row of spriteGrid(type, 'check')) for (const v of row) assert.ok(known.has(v))
})
