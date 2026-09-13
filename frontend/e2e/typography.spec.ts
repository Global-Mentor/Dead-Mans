import { expect, test } from '@playwright/test'
import { panelRoutes } from '../src/app/panel-route-metadata.ts'
import { expectUnifiedTypography } from './typography-assertions.ts'

for (const language of ['en', 'ru', 'uk', 'pl']) {
  test(`all panel pages inherit typography in ${language}`, async ({ page }) => {
    test.setTimeout(90_000)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.addInitScript((locale) => localStorage.setItem('i18nextLng', locale), language)
    await page.route(
      (url) => url.pathname === '/auth/me' || url.pathname.startsWith('/api/'),
      async (route) => {
        if (new URL(route.request().url()).pathname === '/auth/me') {
          return route.fulfill({
            json: {
              userId: 'abf3680b-ac92-43ce-8c4f-c542f806e520',
              displayName: 'Hunter 123',
              roles: ['superadmin', 'admin', 'viewer'],
            },
          })
        }
        return route.fulfill({ status: 204 })
      },
    )
    for (const route of panelRoutes) {
      await test.step(route.fullPath, async () => {
        await page.goto(route.fullPath)
        await expect(page.getByRole('main')).toContainText(/\p{L}/u)
        await expect(page.getByRole('progressbar')).toHaveCount(0)
        expect(new URL(page.url()).pathname).toBe(route.fullPath)
        await expectUnifiedTypography(page)
      })
    }

    // A new, unstyled native control must inherit the same defaults as MUI.
    await page.evaluate(() => {
      const probe = document.createElement('section')
      probe.id = 'typography-probe'
      for (const tag of ['p', 'button', 'input', 'textarea', 'select']) {
        const element = document.createElement(tag)
        element.textContent = 'ABC АБВ Ґґ Єє Іі Її Ąą Ćć Ęę Łł Ńń Óó Śś Źź Żż 0123456789'
        probe.append(element)
      }
      document.body.append(probe)
    })
    await expectUnifiedTypography(page)

    // Check the actual rendered glyphs, not just the requested CSS family.
    const client = await page.context().newCDPSession(page)
    await client.send('DOM.enable')
    await client.send('CSS.enable')
    const { root } = await client.send('DOM.getDocument')
    const { nodeId } = await client.send('DOM.querySelector', {
      nodeId: root.nodeId,
      selector: '#typography-probe p',
    })
    const { fonts } = await client.send('CSS.getPlatformFontsForNode', { nodeId })
    expect(fonts.length).toBeGreaterThan(0)
    expect(fonts.every((font) => font.isCustomFont && font.familyName.startsWith('Alegreya'))).toBe(
      true,
    )
    await client.detach()
    expect(errors).toEqual([])
  })
}
