import { Box, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { AppLinkButton, HelpTooltip } from '../../../shared/ui/index.ts'
import { ActiveTeamRosterTooltip } from './ActiveTeamRosterTooltip.tsx'

interface GameBoardStatusBarProps {
  title: string
  caption: string
  participantNames?: readonly string[] | undefined
  phase: string
  phaseCaption?: string | undefined
  action?: { to: string; label: string; accessibleLabel?: string } | undefined
}

const groupSx = {
  display: 'grid',
  gridTemplateRows: '13px 32px',
  rowGap: 0,
  alignContent: 'center',
  justifyItems: 'center',
  textAlign: 'center',
  minWidth: 0,
  height: '100%',
  px: { xs: 1.125, sm: 1.575 },
  pt: '7px',
  pb: '3px',
} as const

const valueSx = {
  alignSelf: 'center',
  justifySelf: 'center',
  textAlign: 'center',
  fontSize: { xs: 12.6, sm: 14.4 },
  lineHeight: { xs: '16px', sm: '18px' },
  fontWeight: 750,
  overflowWrap: 'anywhere',
  display: '-webkit-box',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 2,
  overflow: 'hidden',
} as const

function StatusCaption({
  children,
  highlighted = false,
}: {
  children: string
  highlighted?: boolean
}) {
  return (
    <Typography
      component="span"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.675,
        minWidth: 0,
        color: highlighted ? 'text.primary' : 'text.secondary',
        fontSize: 10,
        lineHeight: '13px',
      }}
    >
      <Box
        component="span"
        aria-hidden
        sx={{
          width: 4.5,
          height: 4.5,
          flexShrink: 0,
          bgcolor: highlighted ? 'text.primary' : 'primary.main',
          transform: 'rotate(45deg)',
        }}
      />
      <Box
        component="span"
        sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
      >
        {children}
      </Box>
    </Typography>
  )
}

export function GameBoardStatusBar({
  title,
  caption,
  participantNames,
  phase,
  phaseCaption,
  action,
}: GameBoardStatusBarProps) {
  const teamContent = (
    <>
      <StatusCaption>{caption}</StatusCaption>
      <Typography component="span" data-testid="game-board-status-title" sx={valueSx}>
        {title}
      </Typography>
    </>
  )
  const phaseContent = (
    <>
      {phaseCaption ? (
        <StatusCaption highlighted={Boolean(action)}>{phaseCaption}</StatusCaption>
      ) : null}
      <Typography
        component="span"
        sx={{
          ...valueSx,
          color: action ? 'text.primary' : 'text.secondary',
        }}
      >
        {action?.label ?? phase}
      </Typography>
    </>
  )
  return (
    <Box
      sx={(theme) => ({
        display: 'grid',
        gridTemplateColumns: {
          xs: 'minmax(0, 1fr) minmax(0, 1.25fr)',
          sm: 'repeat(2, minmax(0, 1fr))',
        },
        minWidth: 0,
        // Reserve the same two-line value slot in every phase, including actionable ones.
        height: 58,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
        borderRadius: 0,
        background: `linear-gradient(110deg, ${alpha(theme.palette.primary.main, 0.09)}, ${alpha(theme.palette.background.paper, 0.88)} 60%)`,
        boxShadow: `inset 0 1px 0 ${alpha(theme.palette.primary.light, 0.06)}`,
      })}
    >
      {participantNames?.length ? (
        <ActiveTeamRosterTooltip key={title} title={title} names={participantNames} sx={groupSx}>
          {teamContent}
        </ActiveTeamRosterTooltip>
      ) : (
        <HelpTooltip title={`${caption}: ${title}`} describeChild>
          <Box tabIndex={0} sx={groupSx}>
            {teamContent}
          </Box>
        </HelpTooltip>
      )}
      <Box sx={{ minWidth: 0, height: '100%', borderLeft: '1px solid', borderColor: 'divider' }}>
        {action ? (
          <HelpTooltip title={action.label} describeChild>
            <AppLinkButton
              to={action.to}
              aria-label={action.accessibleLabel ?? action.label}
              tone="primary"
              size="small"
              sx={(theme) => ({
                ...groupSx,
                gridTemplateRows: phaseCaption ? groupSx.gridTemplateRows : '1fr',
                pt: '6px',
                pb: '2px',
                width: '100%',
                minHeight: 44,
                justifyContent: 'stretch',
                textAlign: 'center',
                textTransform: 'none',
                whiteSpace: 'normal',
                borderRadius: 0,
                borderImageOutset: 0,
                '&:focus-visible': {
                  outline: `2px solid ${theme.palette.text.primary}`,
                  outlineOffset: -3,
                },
              })}
            >
              {phaseContent}
            </AppLinkButton>
          </HelpTooltip>
        ) : (
          <HelpTooltip title={phase} describeChild>
            <Box
              tabIndex={0}
              aria-live="polite"
              aria-atomic="true"
              sx={{ ...groupSx, gridTemplateRows: phaseCaption ? groupSx.gridTemplateRows : '1fr' }}
            >
              {phaseContent}
            </Box>
          </HelpTooltip>
        )}
      </Box>
    </Box>
  )
}
