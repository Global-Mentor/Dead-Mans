import { describe, expect, it } from 'vitest'
import { alpha } from '@mui/material/styles'
import { huntPalette } from '../../shared/theme/hunt-palette.ts'
import { appComponentOverrides } from './component-overrides.ts'

describe('appComponentOverrides', () => {
  it('leaves decorative surface selection to semantic components', () => {
    expect(appComponentOverrides.MuiPaper?.styleOverrides?.root).not.toMatchObject({
      backgroundImage: expect.anything(),
      backgroundSize: expect.anything(),
    })
    expect(appComponentOverrides.MuiSnackbar).toBeUndefined()
  })

  it('keeps disabled buttons subdued without making their labels illegible', () => {
    const rootStyles = appComponentOverrides.MuiButton?.styleOverrides?.root

    expect(rootStyles).toMatchObject({
      '&.Mui-disabled': {
        color: alpha(huntPalette.parchmentMuted, 0.82),
        borderColor: alpha(huntPalette.parchmentMuted, 0.16),
        backgroundColor: alpha(huntPalette.soot, 0.18),
        backgroundImage: 'none',
        boxShadow: 'none',
        opacity: 1,
      },
    })

    for (const surface of [
      huntPalette.soot,
      huntPalette.charcoal,
      huntPalette.bark,
      huntPalette.leather,
      huntPalette.moss,
      huntPalette.mossDeep,
      huntPalette.murk,
    ]) {
      const disabledBackground = blendHex(huntPalette.soot, surface, 0.18)
      const disabledLabel = blendRgb(hexToRgb(huntPalette.parchmentMuted), disabledBackground, 0.82)
      expect(contrastRatio(disabledLabel, disabledBackground)).toBeGreaterThanOrEqual(3)
    }
  })
})

type Rgb = readonly [number, number, number]

function hexToRgb(value: string): Rgb {
  return [
    Number.parseInt(value.slice(1, 3), 16) / 255,
    Number.parseInt(value.slice(3, 5), 16) / 255,
    Number.parseInt(value.slice(5, 7), 16) / 255,
  ]
}

function blendHex(foreground: string, background: string, alpha: number): Rgb {
  return blendRgb(hexToRgb(foreground), hexToRgb(background), alpha)
}

function blendRgb(foreground: Rgb, background: Rgb, alpha: number): Rgb {
  return [
    foreground[0] * alpha + background[0] * (1 - alpha),
    foreground[1] * alpha + background[1] * (1 - alpha),
    foreground[2] * alpha + background[2] * (1 - alpha),
  ]
}

function contrastRatio(left: Rgb, right: Rgb) {
  const leftLuminance = relativeLuminance(left)
  const rightLuminance = relativeLuminance(right)

  return (
    (Math.max(leftLuminance, rightLuminance) + 0.05) /
    (Math.min(leftLuminance, rightLuminance) + 0.05)
  )
}

function relativeLuminance(rgb: Rgb) {
  const toLinear = (channel: number) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  const [red, green, blue] = rgb

  return 0.2126 * toLinear(red) + 0.7152 * toLinear(green) + 0.0722 * toLinear(blue)
}
