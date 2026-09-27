import test from 'node:test'
import assert from 'node:assert/strict'
import { hostileFire, checkPlayerHits, checkContactDamage, HOSTILE_RANGE, FIRE_INTERVAL, CONTACT_COOLDOWN, ENEMY_DAMAGE, CONTACT_DAMAGE, isHostile } from '../src/combat.js'
import { fireLaser, stepLasers } from '../src/weapons.js'

const hostileObj = (id, x, y, extra = {}) => ({ id, x, y, scale: 1, destroyed: false, hostile: true, ...extra })
const player = (x, y) => ({ x, y, vx: 0, vy: 0, onGround: true, facing: 1 })

test('isHostile is only true for objects actually marked hostile', () => {
 assert.equal(isHostile({ hostile: true }), true)
 assert.equal(isHostile({ hostile: false }), false)
 assert.equal(isHostile({}), false)
})

test('a hostile object in range fires once, aimed at the player, and mutates its own cooldown', () => {
 const o = hostileObj('a', 5, 10)
 const p = player(6, 10)
 const shots = hostileFire([o], p, 1000)
 assert.equal(shots.length, 1)
 assert.equal(shots[0].tx, p.x)
 assert.ok(o.lastFired === 1000)
 assert.deepEqual(hostileFire([o], p, 1000), [], 'fired again immediately: still on cooldown')
 assert.equal(hostileFire([o], p, 1000 + FIRE_INTERVAL * 1000 + 1).length, 1, 'cooldown has elapsed')
})

test('a non-hostile or destroyed object never fires, however close the player is', () => {
 const calm = { id: 'b', x: 5, y: 10, scale: 1, destroyed: false, hostile: false }
 const gone = hostileObj('c', 5, 10, { destroyed: true })
 assert.deepEqual(hostileFire([calm, gone], player(5, 10), 0), [])
})

test('a hostile object out of range does not fire', () => {
 const o = hostileObj('a', 5, 10)
 const far = player(5 + HOSTILE_RANGE + 1, 10)
 assert.deepEqual(hostileFire([o], far, 0), [])
})

test('an enemy beam that reaches the player deals damage once and dies', () => {
 let laser = fireLaser(0, 10, 10, 10, 'enemy-1')
 laser = stepLasers([laser], 0.29)[0] // roughly x=9.86, close enough to a player standing at x=10
 const hits = checkPlayerHits([laser], player(10, 10))
 assert.equal(hits.length, 1)
 assert.equal(hits[0].damage, ENEMY_DAMAGE)
 assert.equal(hits[0].by, 'enemy-1')
 assert.equal(laser.dead, true)
 assert.deepEqual(checkPlayerHits([laser], player(10, 10)), [], 'a dead beam cannot hit again')
})

test('an enemy beam nowhere near the player never hits', () => {
 const laser = fireLaser(0, 0, 1, 0, 'enemy-1')
 assert.deepEqual(checkPlayerHits([laser], player(50, 50)), [])
})

test('touching a hostile object deals contact damage, at most once per cooldown, and never from a destroyed one', () => {
 const o = hostileObj('a', 10, 10)
 const p = player(10, 10)
 const first = checkContactDamage([o], p, 0)
 assert.equal(first.length, 1)
 assert.equal(first[0].damage, CONTACT_DAMAGE)
 assert.equal(checkContactDamage([o], p, 100).length, 0, 'still on cooldown')
 assert.equal(checkContactDamage([o], p, CONTACT_COOLDOWN * 1000 + 1).length, 1, 'cooldown elapsed')
 o.destroyed = true
 assert.equal(checkContactDamage([o], p, 999999).length, 0, 'destroyed things do not hurt you')
})

test('standing apart from a hostile object never deals contact damage', () => {
 const o = hostileObj('a', 10, 10)
 assert.deepEqual(checkContactDamage([o], player(50, 50), 0), [])
})
