import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchHeadline, headlineFor, todaysWorld, dayKey, FALLBACK_HEADLINES } from '../src/daily.js'

const day = new Date(Date.UTC(2026, 2, 15))

test('dayKey is a stable, UTC-based date string', () => {
 assert.equal(dayKey(day), '2026-03-15')
 assert.equal(dayKey(new Date(Date.UTC(2026, 0, 5))), '2026-01-05')
})

test('fetchHeadline reads the first news story from the feed and strips markup', async () => {
 const fetchImpl = async () => ({ ok: true, json: async () => ({ news: [{ story: '<a href="x">A city</a> floods after a storm.' }] }) })
 const text = await fetchHeadline(day, { fetchImpl })
 assert.equal(text, 'A city floods after a storm.')
})

test('fetchHeadline returns null on a bad response, empty feed, or a thrown error, never throwing itself', async () => {
 for (const fetchImpl of [
  async () => ({ ok: false }),
  async () => ({ ok: true, json: async () => ({ news: [] }) }),
  async () => ({ ok: true, json: async () => ({}) }),
  async () => { throw new Error('offline') },
  async () => ({ ok: true, json: async () => { throw new Error('bad json') } })
 ]) {
  const text = await fetchHeadline(day, { fetchImpl })
  assert.equal(text, null)
 }
})

test('headlineFor falls back to a fixed headline when the feed fails, and the same day always picks the same one', async () => {
 const fetchImpl = async () => ({ ok: false })
 const a = await headlineFor(day, { fetchImpl })
 const b = await headlineFor(day, { fetchImpl })
 assert.equal(a.real, false)
 assert.deepEqual(a, b)
 assert.ok(FALLBACK_HEADLINES.includes(a.text))
})

test('headlineFor prefers the real headline when the feed works', async () => {
 const fetchImpl = async () => ({ ok: true, json: async () => ({ news: [{ story: 'Real event happens' }] }) })
 const { text, real } = await headlineFor(day, { fetchImpl })
 assert.equal(text, 'Real event happens')
 assert.equal(real, true)
})

test('todaysWorld builds a full world from the headline, real or fallback, and the same day is the same world', async () => {
 const fetchImpl = async () => ({ ok: true, json: async () => ({ news: [{ story: 'A record rocket launches from the desert' }] }) })
 const a = await todaysWorld(day, { fetchImpl })
 const b = await todaysWorld(day, { fetchImpl })
 assert.equal(a.headline, 'A record rocket launches from the desert')
 assert.equal(a.headlineReal, true)
 assert.equal(a.day, '2026-03-15')
 assert.ok(a.objects.length > 0)
 assert.deepEqual(a.terrain, b.terrain)
 assert.deepEqual(a.objects, b.objects)
})

test('a different day with the same headline still builds a different world (the seed includes the day)', async () => {
 const fetchImpl = async () => ({ ok: true, json: async () => ({ news: [{ story: 'Same headline every day' }] }) })
 const a = await todaysWorld(day, { fetchImpl })
 const b = await todaysWorld(new Date(Date.UTC(2026, 2, 16)), { fetchImpl })
 assert.notDeepEqual(a.terrain, b.terrain)
})
