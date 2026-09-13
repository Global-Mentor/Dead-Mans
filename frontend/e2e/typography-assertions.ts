import { expect, type Page } from '@playwright/test'

export async function expectUnifiedTypography(page: Page) {
  await page.evaluate(() => document.fonts.ready)
  const mismatches = await page.evaluate(() =>
    Array.from(document.body.querySelectorAll('*')).flatMap((element) => {
      if (!element.checkVisibility()) return []
      const text = Array.from(element.childNodes)
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent)
        .join('')
      if (!/[\p{L}\p{N}]/u.test(text) && !element.matches('input, textarea, select')) return []
      const style = getComputedStyle(element)
      return style.fontFamily.startsWith('"Alegreya Variable"') &&
        style.fontVariantNumeric === 'lining-nums tabular-nums'
        ? []
        : [
            {
              tag: element.tagName,
              text: text.slice(0, 70),
              font: style.fontFamily,
              numbers: style.fontVariantNumeric,
            },
          ]
    }),
  )
  expect(mismatches, `Typography on ${page.url()}`).toEqual([])
}
