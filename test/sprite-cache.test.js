import test from 'node:test'
import assert from 'node:assert/strict'
import { baseColorsFor } from '../src/sprite-cache.js'

const parseHsl = s => s.match(/hsl\((-?[\d.]+) ([\d.]+)% ([\d.]+)%\)/).slice(1, 4).map(Number)

test('the same type and seed always gives the identical colours', () => {
 const a = baseColorsFor('animal', 'seed-1'), b = baseColorsFor('animal', 'seed-1')
 assert.deepEqual(a, b)
})

test('colours are valid CSS hsl() and within a sane 0-100% range for saturation and lightness', () => {
 for (const type of ['people', 'animal', 'machine', 'treasure']) for (let i = 0; i < 20; i++) {
  const { base, shade } = baseColorsFor(type, `check-${i}`)
  for (const [, s, l] of [parseHsl(base), parseHsl(shade)]) {
   assert.ok(s >= 0 && s <= 100, `${type} saturation ${s} out of range`)
   assert.ok(l >= 0 && l <= 100, `${type} lightness ${l} out of range`)
  }
 }
})

test('people stay in a skin-tone-ish hue band and machines stay steely, however the seed varies', () => {
 for (let i = 0; i < 25; i++) {
  const [ph] = parseHsl(baseColorsFor('people', 'p' + i).base)
  assert.ok(ph >= 10 && ph <= 45, `people hue ${ph} left its band`)
  const [mh] = parseHsl(baseColorsFor('machine', 'm' + i).base)
  assert.ok(mh >= 185 && mh <= 235, `machine hue ${mh} left its band`)
 }
})

test('different seeds of the same type usually land on genuinely different hues, not palette repeats', () => {
 const hues = new Set()
 for (let i = 0; i < 30; i++) hues.add(Math.round(parseHsl(baseColorsFor('animal', 'hue-' + i).base)[0]))
 assert.ok(hues.size >= 15, `only ${hues.size}/30 distinct hues`)
})

test('the shade colour is always a darker, more saturated version of the same hue as base', () => {
 const { base, shade } = baseColorsFor('treasure', 'shade-check')
 const [bh, bs, bl] = parseHsl(base), [sh, ss, sl] = parseHsl(shade)
 assert.equal(bh, sh)
 assert.ok(sl < bl, 'shade is darker')
 assert.ok(ss >= bs, 'shade is at least as saturated')
})

test('an unknown type falls back to a sane colour instead of throwing', () => {
 assert.doesNotThrow(() => baseColorsFor('nonsense', 'x'))
})
