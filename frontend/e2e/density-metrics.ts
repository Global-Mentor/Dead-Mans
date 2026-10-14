import { writeFile } from 'node:fs/promises'
import type { Page, TestInfo } from '@playwright/test'

export async function recordDensity(page: Page, info: TestInfo, name: string) {
  const metrics = await page.evaluate(() => {
    const main = document.querySelector('main')!
    const describe = (element: Element) => {
      const rect = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      return {
        text: element.textContent?.trim().slice(0, 100),
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        fontSize: style.fontSize,
        lineHeight: style.lineHeight,
      }
    }
    return {
      viewport: { width: innerWidth, height: innerHeight },
      documentHeight: document.documentElement.scrollHeight,
      headings: [...main.querySelectorAll('h1,h2,h3,h4')].map(describe),
      fields: [...main.querySelectorAll('.MuiInputBase-root')].map(describe),
      panels: [...main.querySelectorAll('[data-testid$="-section"]')].map(describe),
    }
  })
  await writeFile(info.outputPath(`${name}-density.json`), JSON.stringify(metrics, null, 2))
}
