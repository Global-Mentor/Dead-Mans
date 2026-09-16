import { Box, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { AppLinkButton } from '../../../shared/ui/index.ts'

interface GameBoardStatusBarProps {
  title: string
  caption: string
  phase: string
  phaseCaption?: string | undefined
  action?: { to: string; label: string; accessibleLabel?: string } | undefined
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

function StatusCaption({ children }: { children: string }) {
  return (
    <Typography
      component="span"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        minWidth: 0,
        color: 'text.secondary',
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
          bgcolor: 'primary.main',
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
  phase,
  phaseCaption,
  action,
}: GameBoardStatusBarProps) {
  const phaseContent = (
    <>
      {phaseCaption ? <StatusCaption>{phaseCaption}</StatusCaption> : null}
      <Typography
        component="span"
        title={action?.label ?? phase}
        sx={{ ...valueSx, pr: 2.5, color: action ? 'primary.light' : 'text.secondary' }}
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
        borderRadius: '8px',
        background: `linear-gradient(110deg, ${alpha(theme.palette.primary.main, 0.09)}, ${alpha(theme.palette.background.paper, 0.88)} 60%)`,
        boxShadow: `inset 0 1px 0 ${alpha(theme.palette.primary.light, 0.06)}`,
      })}
    >
      <Box sx={groupSx}>
        <StatusCaption>{caption}</StatusCaption>
        <Typography component="span" title={title} sx={{ ...valueSx, fontWeight: 750 }}>
          {title}
        </Typography>
      </Box>
      <Box sx={{ minWidth: 0, height: '100%', borderLeft: '1px solid', borderColor: 'divider' }}>
        {action ? (
          <AppLinkButton
            to={action.to}
            aria-label={action.accessibleLabel ?? action.label}
            tone="ghost"
            size="small"
            sx={(theme) => ({
              ...groupSx,
              gridTemplateRows: phaseCaption ? groupSx.gridTemplateRows : '1fr',
              position: 'relative',
              width: '100%',
              minHeight: 44,
              justifyContent: 'stretch',
              textAlign: 'left',
              textTransform: 'none',
              whiteSpace: 'normal',
              borderRadius: '0 7px 7px 0',
              color: 'primary.light',
              bgcolor: 'transparent',
              backgroundImage: 'none',
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                backgroundImage: 'none',
              },
              '&:focus-visible': {
                outline: `2px solid ${theme.palette.primary.main}`,
                outlineOffset: -2,
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
