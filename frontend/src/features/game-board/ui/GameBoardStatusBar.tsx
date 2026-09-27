import { Box, Typography } from '@mui/material'
import { AppLinkButton } from '../../../shared/ui/index.ts'
import { boardContextSurfaceSx } from '../theme/board-context-sx.ts'
import { ActiveTeamRosterTooltip } from './ActiveTeamRosterTooltip.tsx'

interface GameBoardStatusBarProps {
  compact?: boolean
  title: string
  caption: string
  participantNames?: readonly string[] | undefined
  phase: string
  phaseCaption?: string | undefined
  action?: { to: string; label: string; accessibleLabel?: string } | undefined
}

const groupSx = {
  display: 'grid',
  gridTemplateRows: { xs: '13px 32px', xl: '16px 32px' },
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
        fontSize: { xs: 10, xl: 12.5 },
        lineHeight: { xs: '13px', xl: '16px' },
        fontWeight: { xl: 700 },
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
  compact = false,
  title,
  caption,
  participantNames,
  phase,
  phaseCaption,
  action,
}: GameBoardStatusBarProps) {
  const groupStyle = compact
    ? { ...groupSx, gridTemplateRows: { xs: '13px 26px', xl: '16px 26px' }, pt: '4px', pb: '2px' }
    : groupSx
  const valueStyle = compact
    ? { ...valueSx, fontSize: { xs: 12, sm: 13 }, lineHeight: '16px' }
    : valueSx
  const teamContent = (
    <>
      <StatusCaption>{caption}</StatusCaption>
      <Typography component="span" data-testid="game-board-status-title" sx={valueStyle}>
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
          ...valueStyle,
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
        ...boardContextSurfaceSx(theme),
        display: 'grid',
        gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
        minWidth: 0,
        width: '100%',
        // Reserve the same two-line value slot in every phase, including actionable ones.
        height: compact ? 96 : 116,
      })}
    >
      <Box sx={{ minWidth: 0, height: '100%', borderBottom: '1px solid', borderColor: 'divider' }}>
        {action ? (
          <AppLinkButton
            to={action.to}
            aria-label={action.accessibleLabel ?? action.label}
            tone="primary"
            size="small"
            sx={(theme) => ({
              ...groupStyle,
              gridTemplateRows: phaseCaption ? groupStyle.gridTemplateRows : '1fr',
              pt: compact ? '4px' : '6px',
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
        ) : (
          <Box
            aria-live="polite"
            aria-atomic="true"
            sx={{
              ...groupStyle,
              gridTemplateRows: phaseCaption ? groupStyle.gridTemplateRows : '1fr',
            }}
          >
            {phaseContent}
          </Box>
        )}
      </Box>
      {participantNames?.length ? (
        <ActiveTeamRosterTooltip key={title} title={title} names={participantNames} sx={groupStyle}>
          {teamContent}
        </ActiveTeamRosterTooltip>
      ) : (
        <Box sx={groupStyle}>{teamContent}</Box>
      )}
    </Box>
  )
}
