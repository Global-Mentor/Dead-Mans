import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { artworks, d, m, monogram } from './brand-artwork.mjs'

test('M uses one closed contour with exact reflection symmetry', () => {
  assert.equal((m.match(/<path/g) ?? []).length, 1)
  const points = [...m.matchAll(/[ML](\d+) (\d+)/g)].map((match) => [
    Number(match[1]),
    Number(match[2]),
  ])
  const reflected = points.map(([x, y]) => [80 - x, y]).reverse()
  const aligned = reflected.findIndex(([x, y]) => x === points[0][0] && y === points[0][1])
  assert.notEqual(aligned, -1)
  assert.deepEqual([...reflected.slice(aligned), ...reflected.slice(0, aligned)], points)
  assert.ok(m.endsWith('Z"/>'))
})

test('public SVG assets match their vector source', async () => {
  for (const [name, source] of Object.entries(artworks)) {
    const actual = await readFile(new URL(`../public/${name}`, import.meta.url), 'utf8')
    assert.equal(actual, source, name)
  }
})

test('branding uses D for the favicon and a plain DM without detached ornaments', () => {
  assert.ok(artworks['favicon.svg'].includes(d))
  assert.ok(!artworks['favicon.svg'].includes(m))
  assert.ok(artworks['brand/deadmans-monogram.svg'].includes(monogram))
  assert.equal(
    (
      artworks['brand/deadmans-monogram.svg'].match(
        /<(?:path|line|polyline|polygon|rect|circle|ellipse)\b/g,
      ) ?? []
    ).length,
    2,
  )
  assert.ok(!Object.keys(artworks).some((name) => name.includes('chest')))
})

test('raster share image and icons have the declared PNG dimensions', async () => {
  for (const [name, width, height] of [
    ['brand/share-card.png', 1200, 630],
    ['favicon-16.png', 16, 16],
    ['favicon-32.png', 32, 32],
    ['apple-touch-icon.png', 180, 180],
  ]) {
    const png = await readFile(new URL(`../public/${name}`, import.meta.url))
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', name)
    assert.equal(png.readUInt32BE(16), width, name)
    assert.equal(png.readUInt32BE(20), height, name)
  }
  const ico = await readFile(new URL('../public/favicon.ico', import.meta.url))
  assert.equal(ico.readUInt16LE(2), 1)
  assert.equal(ico.readUInt16LE(4), 1)
  assert.equal(ico.readUInt32LE(14), ico.length - 22)
  assert.deepEqual(
    ico.subarray(22),
    await readFile(new URL('../public/favicon-16.png', import.meta.url)),
  )
})

test('share card contains only the nine-glyph name on a black background', () => {
  const share = artworks['brand/share-card.svg']
  assert.ok(share.includes('<rect width="1200" height="630" fill="#000"/>'))
  assert.equal((share.match(/<path\b/g) ?? []).length, 9)
  assert.ok(!share.includes('stroke='))
})
