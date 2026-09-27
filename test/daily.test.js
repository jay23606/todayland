import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchHeadlines, headlinesFor, dayKey, FALLBACK_HEADLINES, MAX_REGIONS } from '../src/daily.js'

const day = new Date(Date.UTC(2026, 2, 15))

test('dayKey is a stable, UTC-based date string', () => {
 assert.equal(dayKey(day), '2026-03-15')
 assert.equal(dayKey(new Date(Date.UTC(2026, 0, 5))), '2026-01-05')
})

test('fetchHeadlines reads each story from the feed, stripped of markup and cut to its first sentence', async () => {
 const fetchImpl = async () => ({ ok: true, json: async () => ({ news: [
  { story: '<a href="x">A city</a> floods after a storm. More details follow here.' },
  { story: 'A robot wins an award.' }
 ] }) })
 const texts = await fetchHeadlines(day, { fetchImpl })
 assert.deepEqual(texts, ['A city floods after a storm.', 'A robot wins an award.'])
})

test('fetchHeadlines returns [] on a bad response, empty feed, or a thrown error, never throwing itself', async () => {
 for (const fetchImpl of [
  async () => ({ ok: false }),
  async () => ({ ok: true, json: async () => ({ news: [] }) }),
  async () => ({ ok: true, json: async () => ({}) }),
  async () => { throw new Error('offline') },
  async () => ({ ok: true, json: async () => { throw new Error('bad json') } })
 ]) {
  assert.deepEqual(await fetchHeadlines(day, { fetchImpl }), [])
 }
})

test('fetchHeadlines drops empty or duplicate stories and caps at MAX_REGIONS', async () => {
 const news = Array.from({ length: MAX_REGIONS + 4 }, (_, i) => ({ story: `Story number ${i % 3}.` }))
 news.push({ story: '' })
 const fetchImpl = async () => ({ ok: true, json: async () => ({ news }) })
 const texts = await fetchHeadlines(day, { fetchImpl })
 assert.ok(texts.length <= MAX_REGIONS)
 assert.equal(new Set(texts).size, texts.length)
})

test('headlinesFor falls back to the fixed set when the feed fails, and the same day always picks the same one', async () => {
 const fetchImpl = async () => ({ ok: false })
 const a = await headlinesFor(day, { fetchImpl })
 const b = await headlinesFor(day, { fetchImpl })
 assert.equal(a.real, false)
 assert.deepEqual(a, b)
 assert.deepEqual(a.texts, FALLBACK_HEADLINES.slice(0, MAX_REGIONS))
})

test('headlinesFor prefers the real headlines when the feed works', async () => {
 const fetchImpl = async () => ({ ok: true, json: async () => ({ news: [{ story: 'Real event happens.' }] }) })
 const { texts, real } = await headlinesFor(day, { fetchImpl })
 assert.deepEqual(texts, ['Real event happens.'])
 assert.equal(real, true)
})
