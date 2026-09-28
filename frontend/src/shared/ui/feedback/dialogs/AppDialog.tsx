import type { DialogProps } from '@mui/material'
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  useMediaQuery,
} from '@mui/material'
import type { Theme } from '@mui/material/styles'
import { alpha } from '@mui/material/styles'
import { useId, type ReactNode } from 'react'
import { huntPalette } from '../../../theme/hunt-palette.ts'
import { mergeSx } from '../../../theme/merge-sx.ts'

interface AppDialogProps extends Omit<
  DialogProps,
  'PaperProps' | 'PaperComponent' | 'slots' | 'slotProps' | 'title'
> {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  contentDensity?: 'comfortable' | 'compact'
  slotProps?: Pick<NonNullable<DialogProps['slotProps']>, 'transition'>
}

function dialogSx(maxWidth: DialogProps['maxWidth'], fullScreen: boolean) {
  return (theme: Theme) => ({
    '& .MuiBackdrop-root': {
      backgroundColor: alpha(theme.palette.common.black, 0.8),
    },
    '& .MuiDialog-paper': {
      width: fullScreen ? '100%' : { xs: 'calc(100% - 32px)', sm: 'calc(100% - 64px)' },
      maxWidth: fullScreen ? 'none' : maxWidth === 'sm' ? 540 : undefined,
      m: fullScreen ? 0 : { xs: 2, sm: 4 },
      ...(fullScreen ? { height: '100dvh' } : {}),
      overflow: 'hidden',
      borderColor: alpha(huntPalette.amber, 0.62),
      backgroundColor: huntPalette.bark,
      backgroundImage: `radial-gradient(circle at 50% 0%, ${alpha(huntPalette.ember, 0.18)}, transparent 48%), ${theme.custom.gradients.panelAccent}`,
      boxShadow: `0 26px 80px ${alpha(theme.palette.common.black, 0.76)}, inset 0 1px 0 ${alpha(huntPalette.parchment, 0.08)}`,
    },
  })
}

export function AppDialog({
  title,
  description,
  actions,
  contentDensity = 'comfortable',
  children,
  sx,
  maxWidth = 'sm',
  fullScreen = false,
  ...dialogProps
}: AppDialogProps) {
  const descriptionId = useId()
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const isStandaloneMessage = description != null && children == null

  const content = (
    <>
      {typeof description === 'string' ? (
        <Typography
          id={descriptionId}
          variant="body1"
          color="text.primary"
          sx={{
            maxWidth: 500,
            mx: 'auto',
            mb: children ? 2 : 0,
            lineHeight: 1.65,
            textAlign: 'center',
            textWrap: 'wrap',
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
      maxWidth={maxWidth}
      fullScreen={fullScreen}
      {...dialogProps}
      transitionDuration={reducedMotion ? 0 : dialogProps.transitionDuration}
      {...(description ? { 'aria-describedby': descriptionId } : {})}
      sx={mergeSx(dialogSx(maxWidth, fullScreen), sx)}
    >
      <DialogTitle
        sx={{
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
          overflowWrap: 'anywhere',
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
        }}
      >
        {title}
      </DialogTitle>
      <DialogContent
        sx={{
          p: 0,
          borderBottom: '1px solid',
          borderColor: alpha(huntPalette.amber, 0.3),
          backgroundColor: alpha(huntPalette.soot, 0.14),
        }}
      >
        <Box
          sx={{
            px: { xs: 1.5, sm: 2.5 },
            py: isStandaloneMessage
              ? 3.5
              : contentDensity === 'compact'
                ? { xs: 1.25, sm: 1.75 }
                : { xs: 2.75, sm: 3.25 },
          }}
        >
          {content}
        </Box>
      </DialogContent>
      {actions ? (
        <DialogActions
          disableSpacing
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
            },
            alignItems: 'stretch',
            gap: 1.25,
            px: { xs: 2.5, sm: 4 },
            py: { xs: 2.25, sm: 2.75 },
            backgroundColor: alpha(huntPalette.soot, 0.2),
          }}
        >
          {actions}
        </DialogActions>
      ) : null}
    </Dialog>
  )
}
