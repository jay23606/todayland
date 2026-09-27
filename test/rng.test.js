import test from 'node:test'
import assert from 'node:assert/strict'
import { rng, hash, pick, int, range } from '../src/rng.js'

test('the same seed always gives the same stream, and different seeds usually do not', () => {
 const a = rng('hello'), b = rng('hello'), c = rng('world')
 const seqA = [a(), a(), a()], seqB = [b(), b(), b()], seqC = [c(), c(), c()]
 assert.deepEqual(seqA, seqB)
 assert.notDeepEqual(seqA, seqC)
})

test('the stream stays in [0,1) over many draws', () => {
 const r = rng('stress-test')
 for (let i = 0; i < 5000; i++) { const v = r(); assert.ok(v >= 0 && v < 1) }
})

test('hash is stable for the same string and a number seed is fine too', () => {
 assert.equal(hash('abc'), hash('abc'))
 assert.doesNotThrow(() => rng(12345)())
})

test('pick, int and range stay within bounds and are seed-repeatable', () => {
 const r1 = rng('bounds'), r2 = rng('bounds')
 for (let i = 0; i < 200; i++) {
  const p = pick(r1, ['a', 'b', 'c']); assert.ok(['a', 'b', 'c'].includes(p))
  const n = int(r1, 3, 7); assert.ok(Number.isInteger(n) && n >= 3 && n <= 7)
  const x = range(r1, 2, 2); assert.equal(x, 2)
 }
 assert.equal(pick(r2, ['a', 'b', 'c']), pick(rng('bounds'), ['a', 'b', 'c']))
})
