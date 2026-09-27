import test from 'node:test'
import assert from 'node:assert/strict'
import { createPlayer, step, collectNearby, SPEED, FIND_RADIUS } from '../src/player.js'
import { W, H } from '../src/world.js'

test('a new player starts centred on its start tile', () => {
 const p = createPlayer([3, 4])
 assert.equal(p.x, 3.5); assert.equal(p.y, 4.5)
})

test('stepping moves at the given speed, and a diagonal input is normalised so it is not faster', () => {
 const p = createPlayer([5, 5])
 const straight = step(p, { x: 1, y: 0 }, 1)
 assert.ok(Math.abs(straight.x - (5.5 + SPEED)) < 1e-9)
 const diag = step(p, { x: 1, y: 1 }, 1)
 const dist = Math.hypot(diag.x - p.x, diag.y - p.y)
 assert.ok(Math.abs(dist - SPEED) < 1e-6, `diagonal distance ${dist} should equal SPEED`)
})

test('no input leaves the player exactly where it was', () => {
 const p = createPlayer([2, 2])
 const after = step(p, { x: 0, y: 0 }, 1)
 assert.equal(after.x, p.x); assert.equal(after.y, p.y)
})

test('the player cannot be pushed off the grid in any direction', () => {
 let p = createPlayer([0, 0])
 for (let i = 0; i < 50; i++) p = step(p, { x: -1, y: -1 }, 1)
 assert.ok(p.x >= 0.5 && p.y >= 0.5)
 let q = createPlayer([W - 1, H - 1])
 for (let i = 0; i < 50; i++) q = step(q, { x: 1, y: 1 }, 1)
 assert.ok(q.x <= W - 0.5 && q.y <= H - 0.5)
})

test('collectNearby marks only objects within the find radius, once each, and returns just the new ones', () => {
 const player = createPlayer([5, 5])
 const objects = [
  { id: 0, x: 5, y: 5, found: false },
  { id: 1, x: 5 + FIND_RADIUS + 0.3, y: 5, found: false },
  { id: 2, x: 5, y: 5, found: true }
 ]
 const found = collectNearby(player, objects)
 assert.deepEqual(found.map(o => o.id), [0])
 assert.equal(objects[0].found, true)
 assert.equal(objects[1].found, false)
 assert.deepEqual(collectNearby(player, objects), [], 'nothing new the second time')
})
