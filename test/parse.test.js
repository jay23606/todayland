import test from 'node:test'
import assert from 'node:assert/strict'
import { parseHeadline, BIOME_NAMES, MOOD_NAMES, CREATURE_NAMES } from '../src/parse.js'

test('an empty or nonsense headline still returns a full, sane set of concepts', () => {
 for (const h of ['', '   ', 'asdf qwer zxcv', null, undefined]) {
  const c = parseHeadline(h)
  assert.ok(BIOME_NAMES.includes(c.biome))
  assert.ok(MOOD_NAMES.includes(c.mood))
  assert.ok(c.creatures.length >= 1 && c.creatures.every(x => CREATURE_NAMES.includes(x)))
  assert.ok(c.intensity >= 1 && c.intensity <= 5)
 }
})

test('an ocean-storm headline reads as ocean and alarming', () => {
 const c = parseHeadline('Massive hurricane floods coastal city, thousands flee')
 assert.equal(c.biome, 'ocean')
 assert.equal(c.mood, 'alarming')
})

test('a cheerful space headline reads as space and bright', () => {
 const c = parseHeadline('NASA celebrates record rocket launch breakthrough')
 assert.equal(c.biome, 'space')
 assert.equal(c.mood, 'bright')
})

test('a quiet research headline reads as calm', () => {
 const c = parseHeadline('Scientists publish a new study on forest soil')
 assert.equal(c.mood, 'calm')
})

test('creatures reflect the nouns present, and always include at least one', () => {
 const c = parseHeadline('The CEO and the robot team up to launch a satellite')
 assert.ok(c.creatures.includes('people'))
 assert.ok(c.creatures.includes('machine'))
})

test('intensifier words push intensity up, and it is always clamped to 1..5', () => {
 const mild = parseHeadline('A small update')
 const wild = parseHeadline('Historic record-breaking unprecedented massive giant biggest worst crisis')
 assert.ok(wild.intensity > mild.intensity)
 assert.ok(wild.intensity <= 5 && mild.intensity >= 1)
})

test('parsing is pure: the same headline always gives the same concepts', () => {
 const h = 'A record storm hits the mountain city'
 assert.deepEqual(parseHeadline(h), parseHeadline(h))
})
