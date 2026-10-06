import { Box, Stack, Typography, useMediaQuery } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ContentTabsSelection } from '../../../shared/ui/index.ts'
import type { components } from '../../../shared/api/contracts/generated'
import { RoundBriefingPanel } from '../../../shared/game-ui/index.ts'
import {
  AppButton,
  AppDialog,
  ContentTabs,
  DetailBlock,
  HelpTooltip,
} from '../../../shared/ui/index.ts'
import { sortTeamLeaderboardEntries } from '../model/game-history-team-leaderboard.ts'
import { formatDateTime } from '../model/game-history-view.ts'
import { CancelledRoundsSection } from './CancelledRoundsSection.tsx'
import { CurrentGameStatistics } from './CurrentGameStatistics.tsx'
import { CurrentGameModifierResults } from './CurrentGameModifierResults.tsx'
import { GameTeamResults } from './GameTeamResults.tsx'
import { buildLeaderboardResults } from '../model/leaderboard-results.ts'
import { HistoryModifierActivations } from './HistoryModifierActivations.tsx'
import { QuizLeaderboard } from './QuizLeaderboard.tsx'

type Game = components['schemas']['GameHistoryGameDetailsDto']
type Round = components['schemas']['GameHistoryRoundItemDto']

export function GameDetailsPanel({
  tabs,
  selectedTeamId,
  onSelectTeam,
  game,
  onPreviewCard,
  onViewBoard,
}: {
  tabs: ContentTabsSelection
  selectedTeamId: string | null
  onSelectTeam: (teamId: string) => void
  onViewBoard: () => void
  game: Game | null
  onPreviewCard: (round: Round) => void
}) {
  const { t, i18n } = useTranslation()
  const [commentOpen, setCommentOpen] = useState(false)
  const compact = useMediaQuery('(max-width: 999px)')
  if (!game) return null
  const publicNote = game.finalResult?.publicNote?.trim() || null
  const teams = sortTeamLeaderboardEntries(game.mainGame.teamStats)
  const cancelled = game.mainGame.rounds.filter((round) => round.status === 'cancelled')
  return (
    <Stack gap={1} sx={{ flex: 1, minHeight: 0, overflowWrap: 'anywhere' }}>
      <RoundBriefingPanel sx={{ flexShrink: 0, p: 1.5 }}>
        <Box
          sx={{
            display: 'grid',
            gap: 1,
            alignItems: 'center',
            gridTemplateColumns: {
              xs: 'auto minmax(0, 1fr)',
              lg: 'minmax(190px, 1fr) minmax(0, 3fr) minmax(190px, 1fr)',
            },
          }}
        >
          <HelpTooltip
            title={
              game.board
                ? t('gameHistory.boardTitle', { game: game.gameTitle })
                : t('gameHistory.boardUnavailable')
            }
            describeChild
          >
            <Box component="span" sx={{ justifySelf: 'start', gridColumn: 1, gridRow: 1 }}>
              <AppButton tone="secondary" size="small" onClick={onViewBoard} disabled={!game.board}>
                {t('gameHistory.viewBoard')}
              </AppButton>
            </Box>
          </HelpTooltip>
          <Stack sx={{ minWidth: 0, gridColumn: 2, gridRow: 1 }}>
            <Typography component="h2" variant="h6" textAlign="center" fontWeight={700}>
              {game.gameTitle}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              textAlign="center"
              display="block"
              sx={{ mt: 0.5 }}
            >
              {game.finalResult
                ? t('gameHistory.finalResultMeta', {
                    admin: game.finalResult.finishedByDisplayName ?? t('gameHistory.unknownValue'),
                    date: game.finalResult.finishedAtUtc
                      ? formatDateTime(game.finalResult.finishedAtUtc, i18n.resolvedLanguage)
                      : t('gameHistory.unknownValue'),
                  })
                : game.finishedAtUtc
                  ? formatDateTime(game.finishedAtUtc, i18n.resolvedLanguage)
                  : t('gameHistory.notAvailable')}
            </Typography>
          </Stack>
          {publicNote ? (
            <AppButton
              tone="secondary"
              size="small"
              aria-haspopup="dialog"
              onClick={() => setCommentOpen(true)}
              sx={{
                justifySelf: 'end',
                gridColumn: { xs: '1 / -1', lg: 3 },
                gridRow: { xs: 2, lg: 1 },
              }}
            >
              {t('gameHistory.gameComment')}
            </AppButton>
          ) : null}
        </Box>
      </RoundBriefingPanel>
      <ContentTabs
        {...tabs}
        layout="fill"
        appearance="framed"
        variant={compact ? 'scrollable' : 'fullWidth'}
        label={t('gameHistory.completedGamesTitle')}
        items={[
          {
            id: 'teams',
            label: t('gameHistory.gameTab'),
            content: (
              <GameTeamResults
                selectedTeamId={selectedTeamId}
                onSelectTeam={onSelectTeam}
                archived
                boardLabels={game.board ?? undefined}
                results={buildLeaderboardResults(teams, game.finalResult)}
                onPreviewCard={onPreviewCard}
              />
            ),
          },
          {
            id: 'quiz',
            label: t('gameHistory.quizTab'),
            content: <QuizLeaderboard entries={game.quiz.playerStats} presentation="panel" />,
          },
          {
            id: 'modifiers',
            label: t('common.entities.modifiers'),
            content: (
              <CurrentGameModifierResults game={game} includeUnused>
                <HistoryModifierActivations game={game} />
              </CurrentGameModifierResults>
            ),
          },
          {
            id: 'statistics',
            label: t('gameHistory.statisticsTab'),
            content: (
              <CurrentGameStatistics game={game} boardLabels={game.board ?? undefined}>
                <CancelledRoundsSection rounds={cancelled} onPreviewCard={onPreviewCard} />
              </CurrentGameStatistics>
            ),
          },
        ]}
      />
      <AppDialog
        open={commentOpen && publicNote !== null}
        onClose={() => setCommentOpen(false)}
        title={t('gameHistory.gameComment')}
        description={game.gameTitle}
        contentDensity="compact"
        actions={
          <AppButton tone="danger" onClick={() => setCommentOpen(false)}>
            {t('common.actions.close')}
          </AppButton>
        }
      >
        <DetailBlock>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
            {publicNote}
          </Typography>
        </DetailBlock>
      </AppDialog>
    </Stack>
  )
}
