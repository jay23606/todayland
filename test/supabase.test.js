import test from 'node:test'
import assert from 'node:assert/strict'
import { freezeDay, recordVisit, recordFind, readVisits } from '../src/supabase.js'

test('every call resolves to null/undefined instead of throwing when the backend is unreachable', async () => {
 const fetchImpl = async () => { throw new Error('offline') }
 await assert.doesNotReject(async () => {
  assert.equal(await freezeDay('2026-01-01', 'x', true, { fetchImpl }), null)
  await recordVisit('2026-01-01', { fetchImpl })
  assert.equal(await recordFind('2026-01-01', 1, { fetchImpl }), null)
  assert.equal(await readVisits('2026-01-01', { fetchImpl }), null)
 })
})

test('a non-ok response is also treated as "not available", not an error', async () => {
 const fetchImpl = async () => ({ ok: false, status: 404 })
 assert.equal(await freezeDay('d', 'h', true, { fetchImpl }), null)
 assert.equal(await readVisits('d', { fetchImpl }) , null)
})

test('freezeDay returns the frozen row when the backend answers normally', async () => {
 const fetchImpl = async () => ({ ok: true, json: async () => [{ headline: 'Frozen headline', is_real: true }] })
 const row = await freezeDay('2026-01-01', 'Frozen headline', true, { fetchImpl })
 assert.deepEqual(row, { headline: 'Frozen headline', is_real: true })
})

test('readVisits reads the one row for the day', async () => {
 const calls = []
 const fetchImpl = async url => { calls.push(url); return { ok: true, json: async () => [{ finds: 12, visitors: 4 }] } }
 const row = await readVisits('2026-01-01', { fetchImpl })
 assert.deepEqual(row, { finds: 12, visitors: 4 })
 assert.ok(calls[0].includes('day=eq.2026-01-01'))
})

test('recordFind returns the new total', async () => {
 const fetchImpl = async () => ({ ok: true, json: async () => 42 })
 assert.equal(await recordFind('2026-01-01', 1, { fetchImpl }), 42)
})
