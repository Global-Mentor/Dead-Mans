import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { artworks } from './brand-artwork.mjs'

const publicRoot = new URL('../public/', import.meta.url)
await mkdir(new URL('brand/', publicRoot), { recursive: true })
for (const [name, content] of Object.entries(artworks)) {
  await writeFile(new URL(name, publicRoot), content)
}

const browser = await chromium.launch({
  ...(process.env.CI ? {} : { channel: 'chrome' }),
  headless: true,
})
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 })
  async function render(source, size, target) {
    await page.setViewportSize(size)
    await page.setContent(
      `<style>html,body{margin:0}svg{display:block;width:100%;height:100%}</style>${source}`,
    )
    return page.screenshot({
      path: fileURLToPath(new URL(target, publicRoot)),
      omitBackground: true,
    })
  }
  await render(
    artworks['brand/share-card.svg'],
    { width: 1200, height: 630 },
    'brand/share-card.png',
  )
  await render(artworks['favicon.svg'], { width: 180, height: 180 }, 'apple-touch-icon.png')
  await render(artworks['favicon.svg'], { width: 32, height: 32 }, 'favicon-32.png')
  const icon = await render(artworks['favicon.svg'], { width: 16, height: 16 }, 'favicon-16.png')
  const header = Buffer.alloc(22)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(1, 4)
  header[6] = 16
  header[7] = 16
  header.writeUInt16LE(1, 10)
  header.writeUInt16LE(32, 12)
  header.writeUInt32LE(icon.length, 14)
  header.writeUInt32LE(22, 18)
  await writeFile(new URL('favicon.ico', publicRoot), Buffer.concat([header, icon]))
} finally {
  await browser.close()
}
