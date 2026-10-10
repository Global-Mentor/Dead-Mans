import type { TypographyVariantsOptions } from '@mui/material/styles'
import { huntTypography, uiTokens } from '../../shared/theme/tokens.ts'

const heading = {
  fontFamily: huntTypography.display,
  fontWeight: huntTypography.displayWeight,
  lineHeight: 1.25,
  letterSpacing: 0,
}

export const appTypography: TypographyVariantsOptions = {
  fontFamily: huntTypography.body,
  allVariants: { fontVariantNumeric: 'var(--app-font-numeric)' },
  body1: { fontSize: uiTokens.type.body, lineHeight: 1.5 },
  body2: { fontSize: uiTokens.type.secondary, lineHeight: 1.5 },
  caption: { fontSize: uiTokens.type.secondary, lineHeight: 1.4 },
  h1: { ...heading, fontSize: uiTokens.type.display },
  h2: { ...heading, fontSize: uiTokens.type.display },
  h3: { ...heading, fontSize: uiTokens.type.heading },
  h4: { ...heading, fontSize: uiTokens.type.heading },
  h5: { ...heading, fontSize: uiTokens.type.section },
  h6: { ...heading, fontSize: uiTokens.type.subheading },
  subtitle1: {
    fontFamily: huntTypography.display,
    fontSize: uiTokens.type.subheading,
    lineHeight: 1.4,
    fontWeight: huntTypography.displayWeight,
    letterSpacing: 0,
  },
  subtitle2: {
    fontFamily: huntTypography.body,
    fontSize: uiTokens.type.body,
    lineHeight: 1.4,
    fontWeight: 600,
    letterSpacing: 0,
  },
  overline: {
    fontFamily: huntTypography.body,
    fontSize: uiTokens.type.metadata,
    lineHeight: 1.5,
    fontWeight: 500,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },
  button: {
    fontFamily: huntTypography.body,
    fontSize: uiTokens.type.secondary,
    lineHeight: 1.4,
    fontWeight: 500,
    letterSpacing: '0.045em',
    textTransform: 'uppercase',
  },
}
