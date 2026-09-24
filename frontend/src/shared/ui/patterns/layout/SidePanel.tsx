import { Box, Drawer, Stack, Typography, useMediaQuery } from '@mui/material'
import { useId, type ReactNode } from 'react'
import {
  sidePanelHeaderSx,
  sidePanelPaperSx,
  sidePanelTitleSx,
} from '../../../theme/side-panel-sx.ts'
import { ActionIcon } from '../../primitives/buttons/ActionIcon.tsx'

interface SidePanelProps {
  id?: string
  open: boolean
  onClose: () => void
  title: string
  label?: string
  description?: string
  closeLabel: string
  side?: 'left' | 'right'
  width?: 'standard' | 'wide'
  header?: ReactNode
  children: ReactNode
  bodyTestId?: string
}

/** One focus-trapped panel with a fixed header and a single scrollable content region. */
export function SidePanel({
  id,
  open,
  onClose,
  title,
  label = title,
  description,
  closeLabel,
  side = 'right',
  width = 'standard',
  header,
  children,
  bodyTestId,
}: SidePanelProps) {
  const descriptionId = useId()
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  return (
    <Drawer
      anchor={side}
      open={open}
      onClose={onClose}
      transitionDuration={reducedMotion ? 0 : undefined}
      ModalProps={{ keepMounted: true }}
      slotProps={{
        paper: {
          role: 'dialog',
          'aria-modal': true,
          'aria-label': label,
          'aria-describedby': description ? descriptionId : undefined,
          sx: (theme) => ({
            ...sidePanelPaperSx(theme),
            width: { xs: '100vw', sm: width === 'wide' ? 520 : 400 },
            maxWidth: '100vw',
            height: '100dvh',
            overflow: 'hidden',
          }),
        },
      }}
    >
      <Box
        id={id}
        component="aside"
        aria-label={label}
        sx={{
          minHeight: 0,
          height: '100%',
          display: 'grid',
          gridTemplateRows: 'auto minmax(0, 1fr)',
        }}
      >
        <Box sx={sidePanelHeaderSx}>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
            <Typography component="h2" variant="h6" sx={sidePanelTitleSx}>
              {title}
            </Typography>
            <ActionIcon aria-label={closeLabel} onClick={onClose} appearance="framed">
              <Box component="span" aria-hidden sx={{ fontSize: 24, lineHeight: 1 }}>
                ×
              </Box>
            </ActionIcon>
          </Stack>
          {description ? (
            <Typography id={descriptionId} variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {description}
            </Typography>
          ) : null}
          {header}
        </Box>
        <Box
          data-testid={bodyTestId}
          sx={{
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
            px: { xs: 2, sm: 2.5 },
            pt: 2,
            pb: 'max(20px, env(safe-area-inset-bottom))',
          }}
        >
          {children}
        </Box>
      </Box>
    </Drawer>
  )
}
