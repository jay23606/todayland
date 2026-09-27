import test from 'node:test'
import assert from 'node:assert/strict'
import { presenceListFrom, laserPayload, hitPayload, colorFor, PEER_COLORS } from '../src/multiplayer.js'

test('presenceListFrom flattens a presence state to one row per peer, dropping ourselves', () => {
 const state = {
  me: [{ id: 'me', name: 'Me' }],
  p1: [{ id: 'p1', name: 'Peer 1' }],
  p2: [{ id: 'p2', name: 'Peer 2 (old)' }, { id: 'p2', name: 'Peer 2 (new)' }]
 }
 const list = presenceListFrom(state, 'me')
 assert.equal(list.length, 2)
 assert.ok(!list.some(p => p.id === 'me'))
 assert.deepEqual(list.find(p => p.id === 'p2'), { id: 'p2', name: 'Peer 2 (new)' }, 'the newest presence entry wins')
})

test('presenceListFrom copes with an empty or missing state', () => {
 assert.deepEqual(presenceListFrom(undefined, 'me'), [])
 assert.deepEqual(presenceListFrom({}, 'me'), [])
 assert.deepEqual(presenceListFrom({ p1: [] }, 'me'), [])
})

test('laserPayload and hitPayload carry what a peer needs to reproduce the shot', () => {
 const laser = laserPayload('p1', 1, 2, 10, 20)
 assert.deepEqual({ ...laser, t: null }, { by: 'p1', x: 1, y: 2, tx: 10, ty: 20, t: null })
 const hit = hitPayload('obj-3', 'p1')
 assert.deepEqual({ ...hit, t: null }, { objectId: 'obj-3', by: 'p1', t: null })
})

test('colorFor is deterministic for an id and always one of the palette', () => {
 assert.equal(colorFor('same-id'), colorFor('same-id'))
 for (const id of ['a', 'bb', 'ccc', 'dddd', 'e']) assert.ok(PEER_COLORS.includes(colorFor(id)))
})
