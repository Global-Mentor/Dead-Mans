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
  height?: 'content' | 'viewport'
  slotProps?: Pick<NonNullable<DialogProps['slotProps']>, 'transition'>
}

function dialogSx(
  maxWidth: DialogProps['maxWidth'],
  fullScreen: boolean,
  height: 'content' | 'viewport',
) {
  return (theme: Theme) => ({
    '& .MuiBackdrop-root': {
      backgroundColor: alpha(theme.palette.common.black, 0.8),
    },
    '& .MuiDialog-paper': {
      width: fullScreen ? '100%' : { xs: 'calc(100% - 32px)', sm: 'calc(100% - 64px)' },
      maxWidth: fullScreen ? 'none' : maxWidth === 'sm' ? 540 : undefined,
      m: fullScreen ? 0 : { xs: 2, sm: 4 },
      ...(fullScreen
        ? { height: '100dvh' }
        : height === 'viewport'
          ? { height: { xs: 'calc(100dvh - 32px)', sm: 'min(900px, calc(100dvh - 64px))' } }
          : {}),
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
  height = 'content',
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
            textAlign: 'center',
            textWrap: 'wrap',
          }}
        >
          {description}
        </Typography>
      ) : description ? (
        <Box id={descriptionId} sx={{ textAlign: 'center', overflowWrap: 'anywhere' }}>
          {description}
        </Box>
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
      sx={mergeSx(dialogSx(maxWidth, fullScreen, height), sx)}
    >
      <DialogTitle
        sx={{
          position: 'relative',
          px: 2,
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: alpha(huntPalette.amber, 0.38),
          color: 'primary.light',
          typography: 'h3',
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
          ...(height === 'viewport' ? { display: 'flex', minHeight: 0 } : {}),
          borderBottom: '1px solid',
          borderColor: alpha(huntPalette.amber, 0.3),
          backgroundColor: alpha(huntPalette.soot, 0.14),
        }}
      >
        <Box
          sx={{
            ...(height === 'viewport'
              ? { display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, minHeight: 0 }
              : {}),
            px: 1.5,
            py: isStandaloneMessage ? 2 : contentDensity === 'compact' ? 1.25 : 1.5,
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
            gap: 1,
            px: 1.5,
            py: 1.5,
            backgroundColor: alpha(huntPalette.soot, 0.2),
          }}
        >
          {actions}
        </DialogActions>
      ) : null}
    </Dialog>
  )
}
