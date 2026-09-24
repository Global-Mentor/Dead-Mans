import { Checkbox, styled } from '@mui/material'
import { uiTokens } from '../../../theme/tokens.ts'

/** Compact density preserves the approved inline filter geometry. */
export const FormCheckbox = styled(Checkbox, {
  shouldForwardProp: (prop) => prop !== 'density',
})<{ density?: 'comfortable' | 'compact' }>(({ density = 'comfortable' }) => ({
  ...(density === 'comfortable'
    ? {
        minWidth: uiTokens.control.height.standard,
        minHeight: uiTokens.control.height.standard,
      }
    : {}),
}))
