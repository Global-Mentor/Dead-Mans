import { Box, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material'
import type { DialogProps } from '@mui/material'
import { alpha } from '@mui/material/styles'
import type { Theme } from '@mui/material/styles'
import { useId, type ReactNode } from 'react'
import { huntPalette } from '../../theme/hunt-palette.ts'
import { mergeSx } from '../../theme/merge-sx.ts'

export type AppDialogAppearance = 'standard' | 'accented' | 'preview'

interface AppDialogProps extends Omit<DialogProps, 'PaperProps' | 'title'> {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  appearance?: AppDialogAppearance
}

function resolveDialogSx(appearance: AppDialogAppearance) {
  if (appearance === 'accented') {
    return (theme: Theme) => ({
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
    })
  }

  if (appearance === 'preview') {
    return (theme: Theme) => ({
      '& .MuiDialog-paper': {
        borderColor: alpha(theme.palette.divider, 0.82),
        backgroundImage: 'none',
        boxShadow: `0 22px 70px ${alpha(theme.palette.common.black, 0.38)}`,
        overflow: 'hidden',
      },
    })
  }

  return undefined
}

export function AppDialog({
  title,
  description,
  actions,
  appearance = 'standard',
  children,
  sx,
  ...dialogProps
}: AppDialogProps) {
  const descriptionId = useId()
  const isAccented = appearance === 'accented'
  const isStandaloneAccentedMessage = isAccented && description != null && children == null

  const content = (
    <>
      {typeof description === 'string' ? (
        <Typography
          id={descriptionId}
          variant={isAccented ? 'body1' : 'body2'}
          color={isAccented ? 'text.primary' : 'text.secondary'}
          sx={{
            maxWidth: isAccented ? 500 : undefined,
            mx: isAccented ? 'auto' : undefined,
            mb: children ? 2 : 0,
            lineHeight: isAccented ? 1.65 : undefined,
            textAlign: isAccented ? 'center' : undefined,
            textWrap: isAccented ? 'wrap' : undefined,
          }}
        >
          {description}
        </Typography>
      ) : description ? (
        <div id={descriptionId}>{description}</div>
      ) : null}
      {children}
    </>
  )

  return (
    <Dialog
      fullWidth
      maxWidth="sm"
      {...dialogProps}
      {...(description ? { 'aria-describedby': descriptionId } : {})}
      sx={mergeSx(resolveDialogSx(appearance), sx)}
    >
      <DialogTitle
        sx={
          isAccented
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
                  pointerEvents: 'none',
                },
              }
            : undefined
        }
      >
        {title}
      </DialogTitle>
      <DialogContent
        sx={
          isAccented
            ? {
                p: 0,
                borderBottom: '1px solid',
                borderColor: alpha(huntPalette.amber, 0.3),
                backgroundColor: alpha(huntPalette.soot, 0.14),
              }
            : undefined
        }
      >
        {isAccented ? (
          <Box
            sx={{
              px: { xs: 1.5, sm: 2.5 },
              py: isStandaloneAccentedMessage ? 3.5 : { xs: 2.75, sm: 3.25 },
            }}
          >
            {content}
          </Box>
        ) : (
          content
        )}
      </DialogContent>
      {actions ? (
        <DialogActions
          disableSpacing={isAccented}
          sx={
            isAccented
              ? {
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                  alignItems: 'stretch',
                  gap: 1.25,
                  px: { xs: 2.5, sm: 4 },
                  py: { xs: 2.25, sm: 2.75 },
                  backgroundColor: alpha(huntPalette.soot, 0.2),
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
