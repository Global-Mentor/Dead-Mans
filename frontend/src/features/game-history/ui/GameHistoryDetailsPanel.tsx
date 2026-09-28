import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { components } from '../../../shared/api/contracts/generated'
import {
  ContentTabs,
  DisclosureSection,
  ItemCard,
  Metric,
  SectionCard,
  StatusBadge,
} from '../../../shared/ui/index.ts'
import { sortTeamLeaderboardEntries } from '../model/game-history-team-leaderboard.ts'
import {
  formatDateTime,
  formatOptionalDateTime,
  getGameStatusColor,
  isCountedRound,
  normalizeStatus,
} from '../model/game-history-view.ts'
import { CancelledRoundsSection } from './CancelledRoundsSection.tsx'
import { FinalResultSnapshot } from './GameHistoryFinalResult.tsx'
import { TeamLeaderboardRow } from './GameHistoryLeaderboard.tsx'
import { RoundHistoryRow } from './GameHistoryRoundRow.tsx'
import { GameModifierHistorySummary } from './GameModifierHistorySummary.tsx'
import { QuizLeaderboard } from './QuizLeaderboard.tsx'

type GameHistoryGameDetails = components['schemas']['GameHistoryGameDetailsDto']
type GameHistoryRound = components['schemas']['GameHistoryRoundItemDto']

export function GameDetailsPanel({
  game,
  onPreviewCard,
}: {
  game: GameHistoryGameDetails | null
  onPreviewCard: (round: GameHistoryRound) => void
}) {
  const { t, i18n } = useTranslation()

  if (!game) {
    return null
  }
  const teamStats = sortTeamLeaderboardEntries(game.mainGame.teamStats)
  const finalResult = game.finalResult ?? null
  const completedRounds = game.mainGame.rounds.filter(isCountedRound)
  const cancelledRounds = game.mainGame.rounds.filter((round) => round.status === 'cancelled')

  return (
    <Stack spacing={1} sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
      <ItemCard>
        <Stack spacing={1.25}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} alignItems="flex-start">
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <StatusBadge
                  label={t(`gameHistory.status.${normalizeStatus(game.gameStatus)}`, {
                    defaultValue: t('gameHistory.notAvailable'),
                  })}
                  color={getGameStatusColor(game.gameStatus)}
                />
                <StatusBadge
                  label={t('gameHistory.statusChipArchived')}
                  color="default"
                  variant="outlined"
                />
              </Stack>

              <Typography component="h2" variant="h5" sx={{ mt: 0.75, fontWeight: 800 }}>
                {game.gameTitle}
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Metric
              label={t('gameHistory.summary.createdAt')}
              value={formatDateTime(game.createdAtUtc, i18n.resolvedLanguage)}
            />
            <Metric
              label={t('gameHistory.summary.startedAt')}
              value={formatOptionalDateTime(game.startedAtUtc, t, i18n.resolvedLanguage)}
            />
            <Metric
              label={t('gameHistory.summary.finishedAt')}
              value={formatOptionalDateTime(game.finishedAtUtc, t, i18n.resolvedLanguage)}
            />
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Metric
              label={t('gameHistory.summary.roundCount')}
              value={t('gameHistory.countValue', { count: completedRounds.length })}
            />
            <Metric
              label={t('common.entities.modifiers')}
              value={t('gameHistory.countValue', {
                count: game.mainGame.modifierActivations.length,
              })}
            />
            <Metric
              label={t('gameHistory.summary.quizCount')}
              value={t('gameHistory.countValue', { count: game.quiz.questionSessions.length })}
            />
            <Metric
              label={t('gameHistory.summary.quizPoints')}
              value={t('gameHistory.pointsValue', { points: game.quiz.totalPoints })}
            />
          </Stack>
        </Stack>
      </ItemCard>

      <ContentTabs
        label={t('gameHistory.title')}
        items={[
          {
            id: 'teams',
            label: t('common.entities.teams'),
            content: (
              <>
                {finalResult ? <FinalResultSnapshot summary={finalResult} /> : null}

                {!finalResult ? (
                  <SectionCard surface="inset" sx={{ p: 0 }}>
                    <DisclosureSection
                      title={t('gameHistory.summary.bestTeams')}
                      description={t('gameHistory.summary.bestTeamsDescription')}
                      countLabel={t('gameHistory.summary.teamCountShort', {
                        count: teamStats.length,
                      })}
                      defaultExpanded
                    >
                      {teamStats.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                          {t('gameHistory.summary.noRounds')}
                        </Typography>
                      ) : (
                        <Stack spacing={1}>
                          {teamStats.map((entry, index) => (
                            <TeamLeaderboardRow
                              key={entry.teamId}
                              entry={entry}
                              rank={index + 1}
                              onPreviewCard={onPreviewCard}
                            />
                          ))}
                        </Stack>
                      )}
                    </DisclosureSection>
                  </SectionCard>
                ) : null}
              </>
            ),
          },
          {
            id: 'quiz',
            label: t('gameHistory.quizLeaderboardTitle'),
            content: <QuizLeaderboard entries={game.quiz.playerStats} defaultExpanded />,
          },
        ]}
      />

      <GameModifierHistorySummary
        rounds={completedRounds}
        snapshots={game.modifierSnapshots}
        snapshotStatus={game.modifierSnapshotStatus}
        collapsible
      />

      <SectionCard surface="inset" sx={{ p: 0 }}>
        <DisclosureSection
          title={t('gameHistory.summary.modifierTimeline')}
          description={t('gameHistory.summary.modifierTimelineDescription')}
          countLabel={t('gameHistory.summary.modifierCountShort', {
            count: game.mainGame.modifierActivations.length,
          })}
        >
          {game.mainGame.modifierActivations.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t('gameHistory.summary.noModifiers')}
            </Typography>
          ) : (
            <Stack spacing={1}>
              {game.mainGame.modifierActivations.map((activation) => (
                <ItemCard key={activation.activationId}>
                  <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={1}
                    alignItems="flex-start"
                  >
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {activation.modifierName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t('gameHistory.modifierActivatedBy', {
                          user: activation.activatedByDisplayName,
                        })}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {formatDateTime(activation.activatedAtUtc, i18n.resolvedLanguage)}
                    </Typography>
                  </Stack>
                </ItemCard>
              ))}
            </Stack>
          )}
        </DisclosureSection>
      </SectionCard>

      <SectionCard surface="inset" sx={{ p: 0 }}>
        <DisclosureSection
          title={t('gameHistory.summary.roundHistory')}
          description={t('gameHistory.summary.roundHistoryDescription')}
          countLabel={t('gameHistory.summary.roundCountShort', {
            count: completedRounds.length,
          })}
        >
          {completedRounds.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t('gameHistory.summary.noRounds')}
            </Typography>
          ) : (
            <Stack spacing={1}>
              {completedRounds.map((round) => (
                <RoundHistoryRow key={round.roundId} round={round} onPreviewCard={onPreviewCard} />
              ))}
            </Stack>
          )}
        </DisclosureSection>
      </SectionCard>

      <CancelledRoundsSection rounds={cancelledRounds} onPreviewCard={onPreviewCard} />
    </Stack>
  )
}
