import { Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material'
import type { DialogProps } from '@mui/material'
import { alpha } from '@mui/material/styles'
import type { Theme } from '@mui/material/styles'
import { useId, type ReactNode } from 'react'
import { huntPaperTexture, huntWornFrame } from '../../theme/hunt-materials.ts'
import { huntPalette } from '../../theme/hunt-palette.ts'

interface AppDialogProps extends Omit<DialogProps, 'title'> {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  dividers?: boolean
  accented?: boolean
}

export function AppDialog({
  title,
  description,
  actions,
  dividers = false,
  accented = false,
  children,
  ...dialogProps
}: AppDialogProps) {
  const descriptionId = useId()
  const isStandaloneAccentedMessage = accented && description != null && children == null

  return (
    <Dialog
      fullWidth
      maxWidth="sm"
      {...dialogProps}
      {...(description ? { 'aria-describedby': descriptionId } : {})}
      sx={[
        ...(accented
          ? [
              (theme: Theme) => ({
                '& .MuiBackdrop-root': {
                  backgroundColor: alpha(theme.palette.common.black, 0.8),
                },
                '& .MuiDialog-paper': {
                  width: { xs: 'calc(100% - 32px)', sm: '100%' },
                  maxWidth: 540,
                  m: { xs: 2, sm: 4 },
                  overflow: 'hidden',
                  borderColor: alpha(huntPalette.amber, 0.62),
                  backgroundColor: huntPalette.bark,
                  backgroundImage: `radial-gradient(circle at 50% 0%, ${alpha(huntPalette.ember, 0.18)}, transparent 48%), ${theme.custom.gradients.panelAccent}`,
                  boxShadow: `0 26px 80px ${alpha(theme.palette.common.black, 0.76)}, inset 0 1px 0 ${alpha(huntPalette.parchment, 0.08)}`,
                },
              }),
            ]
          : []),
        ...(Array.isArray(dialogProps.sx) ? dialogProps.sx : [dialogProps.sx ?? false]),
      ]}
    >
      <DialogTitle
        sx={
          accented
            ? {
                position: 'relative',
                px: { xs: 2.5, sm: 4 },
                pt: { xs: 2.75, sm: 3.25 },
                pb: { xs: 2.25, sm: 2.5 },
                borderBottom: '1px solid',
                borderColor: alpha(huntPalette.amber, 0.38),
                color: 'primary.light',
                fontSize: { xs: '1.55rem', sm: '1.8rem' },
                lineHeight: 1.15,
                letterSpacing: '0.01em',
                textAlign: 'center',
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  left: '50%',
                  bottom: -5,
                  width: 9,
                  height: 9,
                  transform: 'translateX(-50%) rotate(45deg)',
                  border: '1px solid',
                  borderColor: huntPalette.amber,
                  backgroundColor: huntPalette.bark,
                  boxShadow: `0 0 0 3px ${alpha(huntPalette.bark, 0.86)}`,
                },
              }
            : dividers
              ? { borderBottom: '1px solid', borderColor: 'divider' }
              : undefined
        }
      >
        {title}
      </DialogTitle>
      <DialogContent
        sx={
          accented
            ? {
                px: { xs: 1.5, sm: 2.5 },
                pb: isStandaloneAccentedMessage ? 3.5 : { xs: 2.75, sm: 3.25 },
                borderBottom: '1px solid',
                borderColor: alpha(huntPalette.amber, 0.3),
                backgroundColor: alpha(huntPalette.soot, 0.14),
                '&&': {
                  pt: isStandaloneAccentedMessage ? 3.5 : { xs: 2.75, sm: 3.25 },
                },
              }
            : dividers
              ? {
                  py: 2,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }
              : undefined
        }
      >
        {typeof description === 'string' ? (
          <Typography
            id={descriptionId}
            variant={accented ? 'body1' : 'body2'}
            color={accented ? 'text.primary' : 'text.secondary'}
            sx={{
              maxWidth: accented ? 500 : undefined,
              mx: accented ? 'auto' : undefined,
              mb: children ? 2 : 0,
              lineHeight: accented ? 1.65 : undefined,
              textAlign: accented ? 'center' : undefined,
              textWrap: accented ? 'wrap' : undefined,
            }}
          >
            {description}
          </Typography>
        ) : description ? (
          <div id={descriptionId}>{description}</div>
        ) : null}
        {children}
      </DialogContent>
      {actions ? (
        <DialogActions
          sx={
            accented
              ? {
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                  alignItems: 'stretch',
                  gap: 1.25,
                  px: { xs: 2.5, sm: 4 },
                  py: { xs: 2.25, sm: 2.75 },
                  backgroundColor: alpha(huntPalette.soot, 0.2),
                  '& > :not(style) ~ :not(style)': { ml: 0 },
                  '& .MuiButton-root': {
                    width: '100%',
                    minHeight: 48,
                    height: '100%',
                    boxSizing: 'border-box',
                    px: { xs: 1.5, sm: 2 },
                  },
                  '& .MuiButton-outlined:not(.Mui-disabled)': {
                    position: 'relative',
                    isolation: 'isolate',
                    border: '1px solid transparent',
                    ...huntWornFrame,
                    backgroundColor: alpha(huntPalette.soot, 0.28),
                    boxShadow: `inset 0 1px 0 ${alpha(huntPalette.parchment, 0.08)}`,
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      inset: 0,
                      zIndex: -1,
                      backgroundImage: huntPaperTexture,
                      backgroundSize: '360px auto',
                      backgroundPosition: 'center',
                      filter: 'brightness(3) contrast(1.6)',
                      mixBlendMode: 'luminosity',
                      opacity: 0.42,
                      pointerEvents: 'none',
                    },
                    '&:hover': {
                      backgroundColor: alpha(huntPalette.mossDeep, 0.42),
                    },
                  },
                }
              : undefined
          }
        >
          {actions}
        </DialogActions>
      ) : null}
    </Dialog>
  )
}
