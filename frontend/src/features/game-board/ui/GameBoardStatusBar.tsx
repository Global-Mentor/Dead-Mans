import { Box, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { AppLinkButton } from '../../../shared/ui/index.ts'
import { ActiveTeamRosterTooltip } from './ActiveTeamRosterTooltip.tsx'

interface GameBoardStatusBarProps {
  title: string
  caption: string
  participantNames?: readonly string[] | undefined
  phase: string
  phaseCaption?: string | undefined
  action?:
    { to: string; label: string; accessibleLabel?: string; compactLabel?: boolean } | undefined
}

const groupSx = {
  display: 'grid',
  gridTemplateRows: '14px 36px',
  rowGap: 0,
  alignContent: 'center',
  minWidth: 0,
  height: '100%',
  px: { xs: 1.25, sm: 1.75 },
  pt: '8px',
  pb: '4px',
} as const

const valueSx = {
  alignSelf: 'center',
  fontSize: { xs: 14, sm: 16 },
  lineHeight: '18px',
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
        gap: 0.75,
        minWidth: 0,
        color: highlighted ? 'text.primary' : 'text.secondary',
        fontSize: 11,
        lineHeight: '14px',
      }}
    >
      <Box
        component="span"
        aria-hidden
        sx={{
          width: 5,
          height: 5,
          flexShrink: 0,
          bgcolor: highlighted ? 'text.primary' : 'primary.main',
          transform: 'rotate(45deg)',
        }}
      />
      <Box
        component="span"
        title={children}
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
      <Typography
        component="span"
        data-testid="game-board-status-title"
        title={participantNames?.length ? undefined : title}
        sx={{ ...valueSx, fontWeight: 750 }}
      >
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
        title={action?.label ?? phase}
        sx={{
          ...valueSx,
          pr: 2.5,
          color: action ? 'text.primary' : 'text.secondary',
          ...(action
            ? {
                fontSize: action.compactLabel ? { xs: 15, sm: 16 } : { xs: 16, sm: 18 },
                lineHeight: action.compactLabel ? '20px' : { xs: '20px', sm: '22px' },
                fontWeight: 700,
                pr: { xs: 0, sm: 2.5 },
              }
            : {}),
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
        height: 64,
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
        <Box sx={groupSx}>{teamContent}</Box>
      )}
      <Box sx={{ minWidth: 0, height: '100%', borderLeft: '1px solid', borderColor: 'divider' }}>
        {action ? (
          <AppLinkButton
            to={action.to}
            aria-label={action.accessibleLabel ?? action.label}
            tone="primary"
            size="small"
            sx={(theme) => ({
              ...groupSx,
              gridTemplateRows: phaseCaption ? groupSx.gridTemplateRows : '1fr',
              // Account for the button border to align captions with the adjacent group.
              pt: '7px',
              pb: '3px',
              position: 'relative',
              width: '100%',
              minHeight: 44,
              justifyContent: 'stretch',
              textAlign: 'left',
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
            <Box
              component="svg"
              aria-hidden
              viewBox="0 0 20 20"
              sx={{
                position: 'absolute',
                display: { xs: 'none', sm: 'block' },
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 16,
                height: 16,
                fill: 'none',
                stroke: 'currentColor',
                strokeWidth: 1.5,
              }}
            >
              <path d="M4 10h11m-4-4 4 4-4 4" />
            </Box>
          </AppLinkButton>
        ) : (
          <Box
            aria-live="polite"
            aria-atomic="true"
            sx={{ ...groupSx, gridTemplateRows: phaseCaption ? groupSx.gridTemplateRows : '1fr' }}
          >
            {phaseContent}
          </Box>
        )}
      </Box>
    </Box>
  )
}
