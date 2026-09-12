import type { TypographyVariantsOptions } from '@mui/material/styles'
import { huntTypography } from '../../shared/theme/tokens.ts'

export const appTypography: TypographyVariantsOptions = {
  fontFamily: huntTypography.body,
  body1: { fontSize: '1.0625rem', lineHeight: 1.5 },
  body2: { fontSize: '1rem', lineHeight: 1.5 },
  caption: { fontSize: '0.875rem', lineHeight: 1.45 },
  h1: { fontFamily: huntTypography.display, fontWeight: huntTypography.displayWeight },
  h2: { fontFamily: huntTypography.display, fontWeight: huntTypography.displayWeight },
  h3: {
    fontFamily: huntTypography.display,
    fontWeight: huntTypography.displayWeight,
    letterSpacing: '-0.015em',
  },
  h4: { fontFamily: huntTypography.display, fontWeight: huntTypography.displayWeight },
  h5: {
    fontFamily: huntTypography.display,
    fontWeight: huntTypography.displayWeight,
    letterSpacing: '-0.015em',
  },
  h6: {
    fontFamily: huntTypography.display,
    fontWeight: huntTypography.displayWeight,
    letterSpacing: 0,
  },
  subtitle1: {
    fontFamily: huntTypography.display,
    fontSize: '1.5rem',
    fontWeight: huntTypography.displayWeight,
    letterSpacing: 0,
  },
  subtitle2: {
    fontFamily: huntTypography.body,
    fontSize: '1rem',
    fontWeight: 600,
    letterSpacing: 0,
  },
  overline: {
    fontFamily: huntTypography.body,
    fontSize: '0.75rem',
    fontWeight: 500,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },
  button: {
    fontFamily: huntTypography.body,
    fontSize: '1rem',
    fontWeight: 500,
    letterSpacing: '0.045em',
    textTransform: 'uppercase',
  },
}
