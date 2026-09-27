import { Box, Stack, Typography } from '@mui/material'
import { useId, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameTeamQueueItem } from '../../../shared/api/contracts/index.ts'
import { AppButton, AsyncSection, NativeDisclosure, StatusBadge } from '../../../shared/ui/index.ts'
import { formatTeamNameWithFallback } from '../../game-registration/model/team-name.ts'
import { groupTeamQueueTeams } from '../model/team-queue-order.ts'
import { boardContextSurfaceSx } from '../theme/board-context-sx.ts'

interface GameBoardTeamQueueProps {
  collapsible: boolean
  teams: readonly GameTeamQueueItem[]
  activeTeamId: string | null
  isLoading: boolean
  isError: boolean
  hasData: boolean
  isRefreshing: boolean
  onRetry: () => void
}

export function GameBoardTeamQueue({
  collapsible,
  teams,
  activeTeamId,
  isLoading,
  isError,
  hasData,
  isRefreshing,
  onRetry,
}: GameBoardTeamQueueProps) {
  const { t } = useTranslation()
  const id = useId()
  const [expanded, setExpanded] = useState(false)
  const { remainingTeams, playedTeams } = groupTeamQueueTeams(teams)
  const title = t('gameBoard.teamQueueTitle')
  const content = (
    <AsyncSection
      isLoading={isLoading}
      isError={isError}
      isEmpty={teams.length === 0}
      hasData={hasData}
      loadingMessage={t('gameBoard.teamQueueLoading')}
      errorMessage={t('gameBoard.teamQueueError')}
      emptyMessage={t('gameBoard.teamQueueEmpty')}
      retryAction={
        <AppButton tone="secondary" size="small" onClick={onRetry} loading={isRefreshing}>
          {t('common.actions.retry')}
        </AppButton>
      }
    >
      <Stack spacing={1.25} sx={{ maxHeight: { lg: 'min(58vh, 520px)' }, overflowY: 'auto' }}>
        <QueueGroup title={t('gameBoard.teamQueueRemainingTitle')} count={remainingTeams.length}>
          {remainingTeams.map(({ team }) => (
            <QueueTeam key={team.teamId} team={team} active={team.teamId === activeTeamId} />
          ))}
        </QueueGroup>
        <QueueGroup title={t('gameBoard.teamQueuePlayedTitle')} count={playedTeams.length}>
          {playedTeams.map(({ team }) => (
            <QueueTeam key={team.teamId} team={team} active={team.teamId === activeTeamId} />
          ))}
        </QueueGroup>
      </Stack>
    </AsyncSection>
  )

  if (collapsible) {
    return (
      <QueueDisclosure id={id} title={title} expanded={expanded} onExpandedChange={setExpanded}>
        {content}
      </QueueDisclosure>
    )
  }

  return (
    <Box
      component="section"
      aria-labelledby={id}
      data-testid="game-board-team-queue"
      sx={(theme) => ({
        ...boardContextSurfaceSx(theme),
        minWidth: 0,
        p: 1.25,
      })}
    >
      <Typography id={id} component="h2" variant="subtitle2" sx={{ mb: 1, textAlign: 'center' }}>
        {title}
      </Typography>
      {content}
    </Box>
  )
}

function QueueDisclosure({
  id,
  title,
  expanded,
  onExpandedChange,
  children,
}: {
  id: string
  title: string
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
  children: ReactNode
}) {
  return (
    <Box
      component="section"
      aria-labelledby={id}
      data-testid="game-board-team-queue"
      sx={(theme) => ({
        ...boardContextSurfaceSx(theme),
        minWidth: 0,
        width: '100%',
        borderTop: 0,
      })}
    >
      <NativeDisclosure
        open={expanded}
        onExpandedChange={onExpandedChange}
        centeredSummary
        summary={
          <Typography
            id={id}
            component="span"
            variant="subtitle2"
            color="text.primary"
            sx={{ fontSize: { xs: 13, sm: 14 }, fontWeight: 750, lineHeight: '18px' }}
          >
            {title}
          </Typography>
        }
        sx={{ px: 1.25, pb: expanded ? 1.25 : 0 }}
      >
        {children}
      </NativeDisclosure>
    </Box>
  )
}

function QueueGroup({
  title,
  count,
  children,
}: {
  title: string
  count: number
  children: ReactNode
}) {
  return (
    <Box component="section" sx={{ minWidth: 0 }}>
      <Typography
        component="h3"
        variant="caption"
        color="text.secondary"
        sx={{
          display: 'block',
          borderBottom: '1px solid',
          borderColor: 'divider',
          pb: 0.375,
          mb: 0.5,
        }}
      >
        {title} · {count}
      </Typography>
      {count ? (
        <Stack component="ol" spacing={0.25} sx={{ listStyle: 'none', p: 0, m: 0 }}>
          {children}
        </Stack>
      ) : null}
    </Box>
  )
}

function QueueTeam({ team, active }: { team: GameTeamQueueItem; active: boolean }) {
  const { t, i18n } = useTranslation()
  const name = formatTeamNameWithFallback(team.teamName, t('gameBoard.teamQueueUnnamedTeam'))
  const score = team.finalScore ?? null
  const scoreText =
    score === null
      ? '-'
      : new Intl.NumberFormat(i18n.language, { signDisplay: 'exceptZero' }).format(score)
  return (
    <Stack
      component="li"
      direction="row"
      alignItems="center"
      spacing={0.75}
      sx={{ minWidth: 0, py: 0.375, px: 0.5, bgcolor: active ? 'action.selected' : 'transparent' }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ minWidth: 20, fontVariantNumeric: 'tabular-nums' }}
      >
        {team.teamSlotIndex}.
      </Typography>
      <Typography variant="body2" sx={{ minWidth: 0, flex: 1, overflowWrap: 'anywhere' }}>
        {name}
      </Typography>
      {active ? (
        <StatusBadge
          size="small"
          color="primary"
          variant="outlined"
          label={t('gameBoard.teamQueueActiveChip')}
        />
      ) : null}
      {team.isPlayed ? (
        <Typography
          component="span"
          aria-label={
            score === null
              ? t('gameBoard.teamQueueNoFinalScore')
              : t('gameBoard.teamQueueFinalScoreLabel', { score: scoreText })
          }
          sx={{
            minWidth: 26,
            flexShrink: 0,
            color:
              score === null || score === 0
                ? 'text.secondary'
                : score > 0
                  ? 'success.main'
                  : 'error.main',
            fontSize: 12.5,
            fontWeight: 800,
            fontVariantNumeric: 'tabular-nums',
            textAlign: 'right',
            whiteSpace: 'nowrap',
          }}
        >
          {scoreText}
        </Typography>
      ) : null}
    </Stack>
  )
}
