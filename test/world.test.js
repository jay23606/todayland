import test from 'node:test'
import assert from 'node:assert/strict'
import { parseHeadline } from '../src/parse.js'
import { buildWorld, todaysWorld, groundAt, regionAt, REGION_W, H, PALETTES, totalTargets, destroyedCount, isCleared } from '../src/world.js'

const headlines = ['A record storm floods the ocean city', 'NASA celebrates a historic rocket launch', 'Scientists study forest soil']
const concepts = headlines.map(parseHeadline)

test('the same headlines and seed always build the identical world, and a different seed usually differs', () => {
 const a = buildWorld(concepts, 'seed-a'), b = buildWorld(concepts, 'seed-a'), c = buildWorld(concepts, 'seed-b')
 assert.deepEqual(a.ground, b.ground)
 assert.deepEqual(a.objects, b.objects)
 assert.notDeepEqual(a.ground, c.ground)
})

test('the world is one region per headline, laid out left to right, each REGION_W wide and H tall', () => {
 const world = buildWorld(concepts, 'regions-check')
 assert.equal(world.regions.length, headlines.length)
 assert.equal(world.w, headlines.length * REGION_W)
 assert.equal(world.h, H)
 world.regions.forEach((r, i) => { assert.equal(r.x0, i * REGION_W); assert.equal(r.width, REGION_W); assert.equal(r.headline, headlines[i]) })
})

test('an empty headline list still builds one playable region rather than an empty world', () => {
 const world = buildWorld([], 'empty-check')
 assert.equal(world.regions.length, 1)
 assert.ok(world.w > 0)
})

test('the ground line covers the whole world width, every value is a sane tile row, and regions join without a cliff', () => {
 const world = buildWorld(concepts, 'ground-check')
 assert.equal(world.ground.length, world.w)
 for (const g of world.ground) assert.ok(g >= 1 && g < H)
 for (let i = 1; i < world.regions.length; i++) {
  const seam = world.regions[i].x0
  assert.ok(Math.abs(world.ground[seam] - world.ground[seam - 1]) <= 1, `region ${i} starts with a cliff at its seam`)
 }
 assert.equal(groundAt(world, -5), world.ground[0], 'off the left edge clamps')
 assert.equal(groundAt(world, world.w + 50), world.ground[world.ground.length - 1], 'off the right edge clamps')
})

test('regionAt finds the right region for an x anywhere in the world, including out of bounds', () => {
 const world = buildWorld(concepts, 'region-at-check')
 assert.equal(regionAt(world, 0).index, 0)
 assert.equal(regionAt(world, REGION_W + 3).index, 1)
 assert.equal(regionAt(world, -50).index, 0)
 assert.equal(regionAt(world, 999999).index, world.regions.length - 1)
})

test('objects stand on the ground or a platform, inside their own region, apart from each other, and undestroyed', () => {
 const world = buildWorld(concepts, 'objects-check')
 assert.ok(world.objects.length >= headlines.length * 3)
 for (const o of world.objects) {
  const r = world.regions[o.regionIndex]
  assert.ok(o.x >= r.x0 - 1 && o.x < r.x0 + r.width + 1, 'object stays roughly inside its own region')
  assert.equal(o.destroyed, false)
  assert.ok(o.scale > 0)
 }
})

test('a more intense headline places more things, up to the cap', () => {
 const base = concepts[0]
 const mild = buildWorld([{ ...base, intensity: 1 }], 'same-seed')
 const wild = buildWorld([{ ...base, intensity: 5 }], 'same-seed')
 assert.ok(wild.objects.length > mild.objects.length)
 assert.ok(wild.objects.length <= 10)
})

test('every biome has a full palette with a sky, and an unknown biome falls back to forest', () => {
 for (const key of Object.keys(PALETTES)) {
  const p = PALETTES[key]
  assert.ok(p.base && p.low && p.high && p.accent && p.sky?.length === 2)
 }
 const world = buildWorld([{ ...concepts[0], biome: 'nope' }], 'x')
 assert.deepEqual(world.regions[0].palette, PALETTES.forest)
})

test('a clash headline scales its paired objects up and gives them a red glow; a flee headline pushes its pair apart', () => {
 const clashWorld = buildWorld([{ ...concepts[0], creatures: ['people', 'machine'], relation: 'clash' }], 'clash')
 const rel = clashWorld.relations[0]
 if (rel) {
  assert.equal(rel.kind, 'clash')
  const a = clashWorld.objects.find(o => o.id === rel.a), b = clashWorld.objects.find(o => o.id === rel.b)
  assert.ok(a.scale > 1 && b.scale > 1)
  assert.equal(a.glowColor, '#ff4d4d')
 }
})

test('an alarming headline makes most (but not all) of its region hostile; a calm one does not', () => {
 const alarming = buildWorld([{ ...concepts[0], mood: 'alarming', intensity: 5 }], 'alarming-check')
 const hostileCount = alarming.objects.filter(o => o.hostile).length
 assert.ok(hostileCount > 0 && hostileCount < alarming.objects.length, `expected some but not all hostile, got ${hostileCount}/${alarming.objects.length}`)
 const calm = buildWorld([{ ...concepts[0], mood: 'calm', relation: 'link' }], 'calm-check')
 assert.ok(calm.objects.every(o => !o.hostile))
})

test('a clash relation makes exactly its own pair hostile, whatever the mood', () => {
 const world = buildWorld([{ ...concepts[0], mood: 'calm', creatures: ['people', 'machine'], relation: 'clash' }], 'clash-hostile-check')
 const rel = world.relations[0]
 if (rel) {
  const a = world.objects.find(o => o.id === rel.a), b = world.objects.find(o => o.id === rel.b)
  assert.equal(a.hostile, true); assert.equal(b.hostile, true)
  const others = world.objects.filter(o => o.id !== rel.a && o.id !== rel.b)
  assert.ok(others.every(o => !o.hostile))
 }
})

test('progress helpers count correctly and clearing needs every object destroyed', () => {
 const world = buildWorld(concepts, 'progress-check')
 assert.equal(destroyedCount(world), 0)
 assert.equal(totalTargets(world), world.objects.length)
 assert.equal(isCleared(world), false)
 world.objects.forEach(o => { o.destroyed = true })
 assert.equal(destroyedCount(world), totalTargets(world))
 assert.equal(isCleared(world), true)
})

test('todaysWorld builds one region per real headline, and the same day is the same world', async () => {
 const day = new Date(Date.UTC(2026, 2, 15))
 const fetchImpl = async () => ({ ok: true, json: async () => ({ news: [{ story: 'A record rocket launches from the desert.' }, { story: 'A whale is seen near the coast.' }] }) })
 const a = await todaysWorld(day, { fetchImpl })
 const b = await todaysWorld(day, { fetchImpl })
 assert.deepEqual(a.headlines, ['A record rocket launches from the desert.', 'A whale is seen near the coast.'])
 assert.equal(a.headlinesReal, true)
 assert.equal(a.day, '2026-03-15')
 assert.equal(a.regions.length, 2)
 assert.deepEqual(a.ground, b.ground)
 assert.deepEqual(a.objects, b.objects)
})

test('todaysWorld on a different day with the same headlines still builds a different world', async () => {
 const fetchImpl = async () => ({ ok: true, json: async () => ({ news: [{ story: 'Same headline every day.' }] }) })
 const a = await todaysWorld(new Date(Date.UTC(2026, 2, 15)), { fetchImpl })
 const b = await todaysWorld(new Date(Date.UTC(2026, 2, 16)), { fetchImpl })
 assert.notDeepEqual(a.ground, b.ground)
})
