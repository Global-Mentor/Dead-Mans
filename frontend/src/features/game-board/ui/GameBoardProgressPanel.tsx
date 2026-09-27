import { Box, Collapse, Stack, Typography, useMediaQuery } from '@mui/material'
import { useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  gameApplicationRoute,
  gameHistoryRoute,
  gameRoundRoute,
} from '../../../routes/app-routes.ts'
import type { GameBoardSnapshot } from '../../../shared/api/contracts/index.ts'
import type { components } from '../../../shared/api/contracts/generated'
import { useAuth } from '../../../shared/auth/use-auth.ts'
import {
  AppButton,
  AppDialog,
  AppLinkButton,
  SectionCard,
  StatusBadge,
  SurfaceButton,
} from '../../../shared/ui/index.ts'
import { formatTeamNameWithFallback } from '../../game-registration/model/team-name.ts'
import { buildGameManagementFlow } from '../model/game-management-flow.ts'
import { GameBoardOrnamentDivider } from './GameBoardOrnamentDivider.tsx'
import { GameBoardTeamQueue, type BoardQueueState } from './GameBoardTeamQueue.tsx'

interface GameBoardProgressPanelProps {
  snapshot: GameBoardSnapshot
  activeRound: components['schemas']['GameRoundDetailsDto'] | null
  compact: boolean
  queue: BoardQueueState
}

const participantOrnamentSx = {
  width: 12,
  height: 1,
  flexShrink: 0,
  bgcolor: 'primary.light',
  opacity: 0.55,
  position: 'relative',
  '&::after': {
    content: '""',
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 5,
    height: 5,
    border: '1px solid',
    borderColor: 'primary.light',
    transform: 'translate(-50%, -50%) rotate(45deg)',
  },
} as const

export function GameBoardProgressPanel({
  snapshot,
  activeRound,
  compact,
  queue,
}: GameBoardProgressPanelProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const id = useId()
  const detailsId = useId()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [detailsExpanded, setDetailsExpanded] = useState(false)
  const [queueOpen, setQueueOpen] = useState(false)
  const [playedExpanded, setPlayedExpanded] = useState(false)
  const activeId =
    snapshot.status === 'active' ? (activeRound?.teamId ?? snapshot.activeTeamId) : null
  const activeTeam =
    queue.teams.find((team) => team.teamId === activeId) ?? (activeId ? activeRound : null)
  const otherTeams = queue.teams.filter((team) => team.teamId !== activeId)
  const waiting = otherTeams.filter((team) => !team.isPlayed).length
  const played = otherTeams.length - waiting
  const ownTeam =
    activeTeam?.participants.some((participant) => participant.userId === user?.id) ?? false
  const flow = buildGameManagementFlow(snapshot, activeRound)
  const step =
    flow.steps.find((item) => item.state === 'current') ??
    flow.steps.find((item) => item.state === 'ready')
  const phase = step ? t(step.titleKey) : t(flow.summaryKey)
  const title = activeTeam
    ? formatTeamNameWithFallback(
        activeTeam.teamName,
        t('common.teamWithSlot', { slot: activeTeam.teamSlotIndex }),
      )
    : snapshot.title || t('gameBoard.title')
  const caption =
    snapshot.status === 'ready'
      ? t('gameBoard.registrationNoticeTitle')
      : snapshot.status === 'finished'
        ? t('gameBoard.finishedTitle')
        : t('gameBoard.progress.title')
  const action =
    snapshot.status === 'ready'
      ? { to: gameApplicationRoute.fullPath, label: t('gameBoard.registrationNoticeAction') }
      : snapshot.status === 'finished'
        ? {
            to: `${gameHistoryRoute.fullPath}?gameId=${encodeURIComponent(snapshot.gameId)}`,
            label: t('gameBoard.openResultsAction'),
          }
        : activeRound
          ? { to: gameRoundRoute.fullPath, label: t('gameBoard.currentRoundScreen.open') }
          : null
  const teamTitle = (
    <Typography
      component="span"
      variant="subtitle1"
      data-testid="game-board-status-title"
      sx={{
        display: 'block',
        fontWeight: 700,
        overflowWrap: 'anywhere',
        lineHeight: 1.2,
        textAlign: 'center',
      }}
    >
      {title}
    </Typography>
  )
  const queueContent = (
    <GameBoardTeamQueue
      {...queue}
      teams={otherTeams}
      currentUserId={user?.id ?? null}
      playedExpanded={playedExpanded}
      onPlayedExpandedChange={setPlayedExpanded}
    />
  )

  return (
    <SectionCard
      component="section"
      surface="panel"
      aria-labelledby={id}
      sx={{ minWidth: 0, p: 0, overflow: 'hidden' }}
    >
      <Box
        component="header"
        sx={{
          minHeight: compact ? 40 : 56,
          px: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography
          ref={headingRef}
          id={id}
          component="h2"
          tabIndex={-1}
          variant="h6"
          color="text.primary"
          sx={{
            fontSize: compact ? '1.125rem' : '1.25rem',
            fontWeight: 700,
            textAlign: 'center',
            overflowWrap: 'anywhere',
            lineHeight: 1.2,
          }}
        >
          {caption}
        </Typography>
      </Box>
      <GameBoardOrnamentDivider />
      <Stack spacing={0}>
        <Box sx={{ px: 2, pt: 1, pb: action ? 1 : 2, minWidth: 0 }}>
          <SectionCard
            surface="inset"
            sx={{
              p: 0,
              borderLeft: '3px solid',
              borderColor: 'primary.main',
              overflow: 'hidden',
            }}
          >
            <SurfaceButton
              type="button"
              data-testid="game-board-phase-toggle"
              aria-expanded={detailsExpanded}
              aria-controls={detailsId}
              onClick={() => setDetailsExpanded((expanded) => !expanded)}
              sx={{
                width: '100%',
                display: 'block',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <Stack
                component="span"
                alignItems="center"
                justifyContent="center"
                spacing={0.5}
                sx={{ minWidth: 0, minHeight: compact ? 86 : 102, px: 1.5, py: 1.5 }}
              >
                <Typography
                  component="span"
                  variant="overline"
                  color="text.secondary"
                  sx={{ textAlign: 'center' }}
                >
                  {t(
                    snapshot.status === 'active'
                      ? 'gameBoard.progress.roundPhase'
                      : 'gameBoard.progress.gameStatus',
                  )}
                </Typography>
                <Typography
                  component="span"
                  data-testid="game-board-phase"
                  variant="h6"
                  color="primary.light"
                  sx={{
                    fontWeight: 700,
                    lineHeight: 1.2,
                    minHeight: '2.4em',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    overflowWrap: 'anywhere',
                    textAlign: 'center',
                  }}
                >
                  {phase}
                </Typography>
                {activeTeam ? (
                  <Stack
                    component="span"
                    alignItems="center"
                    spacing={0.25}
                    sx={{
                      width: '100%',
                      mt: 2,
                      pt: 1,
                      borderTop: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Typography component="span" variant="overline" color="text.secondary">
                      {t('gameBoard.progress.currentTeam')}
                    </Typography>
                    {teamTitle}
                  </Stack>
                ) : null}
              </Stack>
              <Box
                component="span"
                sx={{
                  minHeight: 36,
                  px: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                  borderTop: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography component="span" variant="caption" color="text.secondary">
                  {t('gameBoard.progress.detailsLabel')}
                </Typography>
                <Box
                  component="span"
                  aria-hidden
                  sx={{
                    width: 8,
                    height: 8,
                    borderRight: '2px solid',
                    borderBottom: '2px solid',
                    borderColor: 'primary.light',
                    transform: detailsExpanded ? 'rotate(225deg)' : 'rotate(45deg)',
                    transition: reducedMotion ? 'none' : 'transform 150ms ease',
                  }}
                />
              </Box>
            </SurfaceButton>
          </SectionCard>
        </Box>
        {action ? (
          <Box sx={{ px: 2, pb: 2 }}>
            <AppLinkButton to={action.to} tone="primary" fullWidth>
              {action.label}
            </AppLinkButton>
          </Box>
        ) : null}
        <Collapse id={detailsId} in={detailsExpanded} timeout={reducedMotion ? 0 : 'auto'}>
          <GameBoardOrnamentDivider />
          <Box sx={{ px: 2, py: 1, minWidth: 0 }}>
            {activeTeam ? (
              <SectionCard
                component="section"
                aria-label={t('gameBoard.progress.currentTeam')}
                surface="inset"
                sx={{ p: 1.5, textAlign: 'center' }}
              >
                <Stack
                  spacing={0.25}
                  alignItems="center"
                  sx={{ minWidth: 0, overflowWrap: 'anywhere' }}
                >
                  <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.1 }}>
                    {t('gameBoard.progress.currentTeam')}
                  </Typography>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                    {title}
                  </Typography>
                  {activeTeam.participants.length > 0 ? (
                    <Stack
                      component="ul"
                      spacing={0.5}
                      sx={{ width: '100%', m: 0, p: 0, listStyle: 'none' }}
                    >
                      {activeTeam.participants.map((participant) => (
                        <Stack
                          component="li"
                          key={participant.userId}
                          direction="row"
                          spacing={0.5}
                          alignItems="center"
                          justifyContent="center"
                          sx={{ minWidth: 0 }}
                        >
                          <Box component="span" aria-hidden sx={participantOrnamentSx} />
                          <Typography
                            variant="body2"
                            sx={{ minWidth: 0, overflowWrap: 'anywhere' }}
                          >
                            {participant.displayName}
                          </Typography>
                          <Box component="span" aria-hidden sx={participantOrnamentSx} />
                        </Stack>
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      {t('gameBoard.roundSummaryNoParticipants')}
                    </Typography>
                  )}
                  {ownTeam ? (
                    <StatusBadge
                      size="small"
                      density="compact"
                      color="primary"
                      variant="outlined"
                      label={t('gameBoard.progress.yourTeam')}
                    />
                  ) : null}
                </Stack>
              </SectionCard>
            ) : (
              teamTitle
            )}
          </Box>
          <GameBoardOrnamentDivider />
          <Box component="section" aria-label={t('gameBoard.teamQueueTitle')} sx={{ minWidth: 0 }}>
            <Typography
              component="h3"
              variant="subtitle2"
              color="primary.light"
              sx={{
                px: 2,
                pt: compact ? 1 : 1.5,
                fontWeight: 750,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                textAlign: 'center',
              }}
            >
              {t('gameBoard.teamQueueTitle')}
            </Typography>
            {compact ? (
              <Box sx={{ px: 0.75, pb: 0.75 }}>
                <AppButton
                  tone="secondary"
                  size="small"
                  fullWidth
                  sx={{ minHeight: 44 }}
                  aria-haspopup="dialog"
                  aria-label={t('gameBoard.progress.openQueue')}
                  onClick={() => setQueueOpen(true)}
                >
                  {queue.hasData
                    ? t('gameBoard.progress.queueSummary', { waiting, played })
                    : t('gameBoard.teamQueueTitle')}
                </AppButton>
              </Box>
            ) : (
              <Box
                sx={{
                  px: 2,
                  pb: 1.5,
                  maxHeight: 'min(56vh, 520px)',
                  overflowY: 'auto',
                }}
              >
                {queueContent}
              </Box>
            )}
          </Box>
        </Collapse>
      </Stack>
      <AppDialog
        open={queueOpen}
        onClose={() => setQueueOpen(false)}
        title={t('gameBoard.teamQueueTitle')}
        contentDensity="compact"
        slotProps={{
          transition: {
            onExited: () => {
              if (!compact) headingRef.current?.focus()
            },
          },
        }}
        actions={
          <AppButton tone="secondary" onClick={() => setQueueOpen(false)}>
            {t('common.actions.close')}
          </AppButton>
        }
      >
        {activeTeam ? (
          <SectionCard surface="inset" sx={{ mb: 2, p: 1, textAlign: 'center' }}>
            <Typography variant="overline" color="text.secondary">
              {t('gameBoard.progress.currentTeam')}
            </Typography>
            <Typography variant="subtitle1" sx={{ overflowWrap: 'anywhere' }}>
              {title}
            </Typography>
            {ownTeam ? (
              <StatusBadge
                size="small"
                density="compact"
                label={t('gameBoard.progress.yourTeam')}
              />
            ) : null}
          </SectionCard>
        ) : null}
        {queueContent}
      </AppDialog>
    </SectionCard>
  )
}
