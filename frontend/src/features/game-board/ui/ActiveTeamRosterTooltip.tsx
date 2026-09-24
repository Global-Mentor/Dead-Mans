import { Box, ClickAwayListener, Tooltip, Typography } from '@mui/material'
import type { SxProps, Theme } from '@mui/material/styles'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ParticipantNamesList } from '../../../shared/game-ui/index.ts'

interface ActiveTeamRosterTooltipProps {
  title: string
  names: readonly string[]
  children: ReactNode
  sx: SxProps<Theme>
}

export function ActiveTeamRosterTooltip({
  title,
  names,
  children,
  sx,
}: ActiveTeamRosterTooltipProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Tooltip
        arrow
        describeChild
        placement="bottom-start"
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        disableTouchListener
        title={
          <Box sx={{ overflowWrap: 'anywhere' }}>
            <Typography variant="caption" color="text.secondary">
              {t('common.entities.players')}
            </Typography>
            <ParticipantNamesList
              names={names}
              emptyLabel={t('gameBoard.roundSummaryNoParticipants')}
            />
          </Box>
        }
        slotProps={{
          tooltip: {
            sx: { p: 1.5, maxWidth: 'min(320px, calc(100vw - 32px))', borderRadius: 0 },
          },
        }}
      >
        <Box
          component="button"
          type="button"
          aria-label={title}
          onClick={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setOpen(false)
          }}
          sx={[
            {
              appearance: 'none',
              border: 0,
              m: 0,
              background: 'transparent',
              color: 'inherit',
              font: 'inherit',
              textAlign: 'left',
              cursor: 'help',
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: 'primary.main',
                outlineOffset: -3,
              },
            },
            ...(Array.isArray(sx) ? sx : [sx]),
          ]}
        >
          {children}
        </Box>
      </Tooltip>
    </ClickAwayListener>
  )
}
