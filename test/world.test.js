import test from 'node:test'
import assert from 'node:assert/strict'
import { parseHeadline } from '../src/parse.js'
import { buildWorld, W, H, PALETTES, totalToFind, foundCount, isComplete } from '../src/world.js'

const concepts = parseHeadline('A record storm floods the ocean city')

test('the same seed always builds the identical world, and a different seed usually differs', () => {
 const a = buildWorld(concepts, 'seed-a'), b = buildWorld(concepts, 'seed-a'), c = buildWorld(concepts, 'seed-b')
 assert.deepEqual(a.terrain, b.terrain)
 assert.deepEqual(a.objects, b.objects)
 assert.notDeepEqual(a.terrain, c.terrain)
})

test('the terrain grid is the full size, every cell is a valid variant, and it is not just static', () => {
 const world = buildWorld(concepts, 'terrain-check')
 assert.equal(world.terrain.length, H)
 for (const row of world.terrain) {
  assert.equal(row.length, W)
  for (const v of row) assert.ok([0, 1, 2].includes(v))
 }
 // smoothing should leave visible patches, not every cell different from its neighbours
 let same = 0, total = 0
 for (let y = 0; y < H; y++) for (let x = 1; x < W; x++) { total++; if (world.terrain[y][x] === world.terrain[y][x - 1]) same++ }
 assert.ok(same / total > 0.3, 'patches, not noise')
})

test('objects are placed on the grid, apart from each other and the start, and none overlap', () => {
 const world = buildWorld(concepts, 'objects-check')
 assert.ok(world.objects.length >= 4)
 for (const o of world.objects) {
  assert.ok(o.x >= 0 && o.x < W && o.y >= 0 && o.y < H)
  assert.ok(Math.hypot(o.x - world.start[0], o.y - world.start[1]) >= 2)
  assert.equal(o.found, false)
 }
 for (let i = 0; i < world.objects.length; i++) for (let j = i + 1; j < world.objects.length; j++) {
  const a = world.objects[i], b = world.objects[j]
  assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= 2, `objects ${i} and ${j} overlap`)
 }
})

test('a more intense headline places more things to find, up to the cap', () => {
 const mild = buildWorld({ ...concepts, intensity: 1 }, 'same-seed')
 const wild = buildWorld({ ...concepts, intensity: 5 }, 'same-seed')
 assert.ok(wild.objects.length > mild.objects.length)
 assert.ok(wild.objects.length <= 18)
})

test('every biome has a full palette, and an unknown biome falls back to forest', () => {
 for (const key of Object.keys(PALETTES)) {
  const p = PALETTES[key]
  assert.ok(p.base && p.low && p.high && p.accent)
 }
 const world = buildWorld({ ...concepts, biome: 'nope' }, 'x')
 assert.deepEqual(world.palette, PALETTES.forest)
})

test('progress helpers count correctly and completion needs every object found', () => {
 const world = buildWorld(concepts, 'progress-check')
 assert.equal(foundCount(world), 0)
 assert.equal(totalToFind(world), world.objects.length)
 assert.equal(isComplete(world), false)
 world.objects.forEach(o => { o.found = true })
 assert.equal(foundCount(world), totalToFind(world))
 assert.equal(isComplete(world), true)
})
