import test from 'node:test'
import assert from 'node:assert/strict'
import { fireLaser, stepLasers, liveLasers, checkLaserHits, resetLaserIds, LASER_LIFE } from '../src/weapons.js'

test.beforeEach(() => resetLaserIds())

test('a fired laser aims at the target point and starts alive with a fresh id', () => {
 const a = fireLaser(0, 0, 10, 0, 'p1')
 const b = fireLaser(0, 0, 0, 10, 'p1')
 assert.equal(a.dead, false)
 assert.ok(Math.abs(a.angle - 0) < 1e-9, 'aimed straight right')
 assert.ok(Math.abs(b.angle - Math.PI / 2) < 1e-9, 'aimed straight down')
 assert.notEqual(a.id, b.id)
 assert.equal(a.by, 'p1')
})

test('a beam travels along its angle and dies once its life runs out', () => {
 let laser = fireLaser(0, 0, 100, 0, 'p1')
 const before = laser.x
 laser = stepLasers([laser], 0.1)[0]
 assert.ok(laser.x > before, 'moved toward the target')
 assert.equal(laser.dead, false)
 laser = stepLasers([laser], LASER_LIFE + 1)[0]
 assert.equal(laser.dead, true)
})

test('a beam that leaves the world dies even with life left', () => {
 let laser = fireLaser(0, 0, 100, 0, 'p1')
 laser = stepLasers([laser], 0.02, { w: 5, h: 5 })[0]
 assert.equal(laser.dead, false)
 laser = stepLasers([laser], 0.5, { w: 5, h: 5 })[0]
 assert.equal(laser.dead, true, 'flew past the right edge')
})

test('liveLasers keeps only the ones still alive', () => {
 const lasers = [fireLaser(0, 0, 1, 0, 'p1'), { ...fireLaser(0, 0, 1, 0, 'p1'), dead: true }]
 assert.equal(liveLasers(lasers).length, 1)
})

test('a beam that reaches an object destroys it, kills the beam, and reports the hit once', () => {
 const laser = fireLaser(0, 5, 10, 5, 'p1')
 const objects = [{ id: 'a', x: 5, y: 6, scale: 1, destroyed: false }]
 const advanced = stepLasers([laser], 0.15) // roughly x=5.1
 const hits = checkLaserHits(advanced, objects)
 assert.equal(hits.length, 1)
 assert.equal(hits[0].objectId, 'a')
 assert.equal(objects[0].destroyed, true)
 assert.equal(advanced[0].dead, true)
 assert.equal(checkLaserHits(advanced, objects).length, 0, 'a dead beam cannot hit again')
})

test('a beam passes an already-destroyed object without stopping', () => {
 const laser = fireLaser(0, 5, 20, 5, 'p1')
 const objects = [{ id: 'a', x: 5, y: 6, scale: 1, destroyed: true }]
 let advanced = stepLasers([laser], 0.15)
 checkLaserHits(advanced, objects)
 assert.equal(advanced[0].dead, false)
})

test('a beam that misses every object stays alive and nothing is destroyed', () => {
 const laser = fireLaser(0, 0, 10, 0, 'p1')
 const objects = [{ id: 'a', x: 50, y: 50, scale: 1, destroyed: false }]
 const advanced = stepLasers([laser], 0.1)
 assert.deepEqual(checkLaserHits(advanced, objects), [])
 assert.equal(objects[0].destroyed, false)
})
