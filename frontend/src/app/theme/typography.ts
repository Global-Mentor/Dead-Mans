import type { TypographyVariantsOptions } from '@mui/material/styles'
import { huntTypography } from '../../shared/theme/tokens.ts'

export const appTypography: TypographyVariantsOptions = {
  fontFamily: huntTypography.body,
  h3: {
    fontFamily: huntTypography.display,
    fontWeight: 700,
    letterSpacing: '0.06em',
  },
  h5: {
    fontFamily: huntTypography.display,
    fontWeight: 700,
    letterSpacing: '0.05em',
  },
  h6: {
    fontFamily: huntTypography.display,
    fontWeight: 700,
    letterSpacing: '0.05em',
  },
  subtitle1: {
    fontFamily: huntTypography.display,
    fontWeight: 700,
    letterSpacing: '0.04em',
  },
  subtitle2: {
    fontFamily: huntTypography.display,
    fontWeight: 600,
    letterSpacing: '0.05em',
  },
  overline: {
    fontFamily: huntTypography.display,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
  },
  button: {
    fontFamily: huntTypography.display,
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
}
