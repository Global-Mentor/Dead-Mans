import { Box, Stack, Typography } from '@mui/material'
import { scrollRegionSx } from '../../../shared/theme/layout-sx.ts'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { modifierHistoryRoute } from '../../../routes/app-routes.ts'
import type { components } from '../../../shared/api/contracts/generated'
import {
  ModifierDetailsItem,
  ModifierDetailsList,
  RoundBriefingDivider,
  RoundBriefingPanel,
} from '../../../shared/game-ui/index.ts'
import { formatPlayedCardModifierOutcomeStatus } from '../../../shared/lib/played-card-formatters.ts'
import {
  AppLinkButton,
  DetailBlock,
  InlineNotice,
  ItemCard,
  Metric,
  StatusBadge,
} from '../../../shared/ui/index.ts'
import type translations from '../i18n/game-history-translations.ts'
import { buildCurrentGameModifierResults } from '../model/game-modifier-results.ts'
import { buildGameStatistics } from '../model/game-statistics.ts'

type ResultKey = keyof typeof translations.en.modifierResults

export function CurrentGameModifierResults({
  game,
  includeUnused = false,
  children,
}: {
  game: components['schemas']['GameHistoryGameDetailsDto']
  includeUnused?: boolean
  children?: ReactNode
}) {
  const { t, i18n } = useTranslation()
  const stats = buildGameStatistics(game).modifiers
  const items = buildCurrentGameModifierResults(
    game.mainGame.rounds,
    game.modifierSnapshots,
    includeUnused,
  ).sort(
    (left, right) =>
      (right.snapshot?.successfulActivationsCount ?? 0) -
        (left.snapshot?.successfulActivationsCount ?? 0) ||
      left.name.localeCompare(right.name, i18n.resolvedLanguage) ||
      (right.revision ?? 0) - (left.revision ?? 0),
  )
  const number = (value: number | null) =>
    value === null ? t('gameHistory.notAvailable') : value.toLocaleString(i18n.resolvedLanguage)
  const signed = (value: number) => (value > 0 ? `+${number(value)}` : number(value))
  type Counter = readonly [ResultKey, number | null, ResultKey?]
  const counterGroup = (title: ResultKey, counters: readonly Counter[], overview = false) => (
    <DetailBlock
      key={title}
      component="section"
      aria-label={t(`gameHistory.modifierResults.${title}`)}
      sx={{ display: 'flex', flexDirection: 'column' }}
    >
      <Typography
        component="h4"
        variant="body2"
        fontWeight={700}
        textAlign="center"
        color="text.primary"
        sx={{ mb: 0.5 }}
      >
        {t(`gameHistory.modifierResults.${title}`)}
      </Typography>
      <Box
        sx={{
          display: 'grid',
          columnGap: 1.5,
          flex: 1,
          alignContent: 'center',
          gridTemplateColumns: overview ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))',
          ...(!overview
            ? { '@container (min-width: 620px)': { gridTemplateColumns: 'minmax(0, 1fr)' } }
            : {}),
        }}
      >
        {counters.map(([label, value, help]) => (
          <Metric
            key={label}
            label={t(`gameHistory.modifierResults.${label}`)}
            value={
              value !== null && ['bonus', 'penalty'].includes(label)
                ? t('gameHistory.pointsValue', { points: signed(value) })
                : number(value)
            }
            appearance="row"
            density="compact"
            emphasis="label"
            {...(help ? { help: t(`gameHistory.modifierResults.${help}`) } : {})}
          />
        ))}
      </Box>
    </DetailBlock>
  )
  return (
    <RoundBriefingPanel
      data-testid="current-game-modifier-results"
      sx={{ flex: 1, minHeight: 0 }}
      header={
        <Typography component="h2" variant="h6" textAlign="center">
          {t('gameHistory.modifierSummary.title')}
        </Typography>
      }
    >
      <Box
        role="region"
        aria-label={t('gameHistory.modifierSummary.title')}
        tabIndex={0}
        sx={{ flex: 1, minHeight: 0, ...scrollRegionSx }}
      >
        <Stack spacing={1}>
          <Box
            data-testid="modifier-results-overview"
            sx={{
              display: 'grid',
              gap: 1,
              gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(3, minmax(0, 1fr))' },
            }}
          >
            {counterGroup(
              'usageTitle',
              [
                ['activations', stats.activations, 'usageHelp'],
                ['cancelled', stats.cancelled],
              ],
              true,
            )}
            {counterGroup(
              'roundsTitle',
              [
                ['coverageRounds', stats.rounds, 'coverageHelp'],
                ['unmodifiedRounds', stats.unmodifiedRounds, 'unmodifiedRoundsHelp'],
              ],
              true,
            )}
            {counterGroup(
              'effectTitle',
              [
                ['bonus', stats.bonus, 'bonusHelp'],
                ['penalty', stats.penalty, 'penaltyHelp'],
              ],
              true,
            )}
          </Box>
          <RoundBriefingDivider />
          <Typography variant="caption" color="text.secondary" textAlign="center">
            {t('gameHistory.modifierResults.compactDescription')}
          </Typography>
          {game.modifierSnapshotStatus === 'legacy_unavailable' ? (
            <InlineNotice severity="warning" appearance="inline">
              {t('gameHistory.modifierSummary.legacyUnavailable')}
            </InlineNotice>
          ) : null}
          {items.length === 0 ? (
            <ItemCard>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                {t('gameHistory.modifierResults.empty')}
              </Typography>
            </ItemCard>
          ) : (
            <Box data-testid="modifier-results-list">
              <ModifierDetailsList count={items.length}>
                {items.map((item) => {
                  const points = item.result?.pointsDelta ?? 0
                  const kills = item.result?.bonusKillsDelta ?? 0
                  return (
                    <ModifierDetailsItem
                      key={item.key}
                      title={item.name}
                      emoji={item.snapshot?.iconEmoji}
                      metadata={
                        <Box
                          component="span"
                          sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}
                        >
                          <Typography component="span" variant="caption" color="text.secondary">
                            {item.revision !== null
                              ? `${t('gameHistory.modifierRevision', { revision: item.revision })} · `
                              : ''}
                            {t('gameHistory.modifierResults.compactUsage', {
                              activations: number(
                                item.snapshot?.successfulActivationsCount ?? null,
                              ),
                              cancelled: number(item.snapshot?.cancelledActivationsCount ?? null),
                            })}
                            {kills !== 0
                              ? ` · ${t('gameHistory.modifierResults.compactKills', { value: signed(kills) })}`
                              : ''}
                          </Typography>
                          {item.snapshot?.isEmergencyDisabled ? (
                            <StatusBadge
                              component="span"
                              density="tight"
                              color="error"
                              label={t('gameHistory.modifierSummary.snapshotEmergency')}
                            />
                          ) : null}
                        </Box>
                      }
                      effect={
                        <Box
                          component="span"
                          sx={{ display: 'grid', textAlign: 'right', flexShrink: 0 }}
                        >
                          <Typography component="span" variant="caption" fontWeight={700}>
                            {t('gameHistory.modifierResults.compactPoints', {
                              value: signed(points),
                            })}
                          </Typography>
                        </Box>
                      }
                    >
                      <RoundBriefingDivider />

                      <Box
                        data-testid="modifier-result-counters"
                        sx={{
                          display: 'grid',
                          gap: 0.75,
                          gridTemplateColumns: 'minmax(0, 1fr)',
                          '@container (min-width: 620px)': {
                            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                          },
                        }}
                      >
                        {counterGroup('usageTitle', [
                          [
                            'activations',
                            item.snapshot?.successfulActivationsCount ?? null,
                            'activationHelp',
                          ],
                          ['cancelled', item.snapshot?.cancelledActivationsCount ?? null],
                        ])}
                        {counterGroup('roundsTitle', [
                          ['results', item.result?.activationCount ?? 0, 'resultsHelp'],
                          ['rounds', item.result?.roundCount ?? 0],
                        ])}
                        {counterGroup('effectTitle', [
                          ['bonus', item.result?.bonusPoints ?? 0, 'bonusHelp'],
                          ['penalty', item.result?.penaltyPoints ?? 0, 'penaltyHelp'],
                        ])}
                      </Box>
                      {item.result?.outcomes.length ? (
                        <Stack spacing={0.5}>
                          <Typography variant="caption" color="text.secondary" textAlign="center">
                            {t('gameHistory.modifierResults.outcomes')}
                          </Typography>
                          <Stack direction="row" justifyContent="center" gap={0.5} flexWrap="wrap">
                            {item.result.outcomes.map((outcome) => (
                              <StatusBadge
                                key={outcome.status}
                                size="small"
                                variant="outlined"
                                label={t('gameHistory.modifierSummary.outcome', {
                                  outcome: formatPlayedCardModifierOutcomeStatus(t, outcome.status),
                                  count: outcome.count,
                                })}
                              />
                            ))}
                          </Stack>
                        </Stack>
                      ) : (
                        <Typography variant="caption" color="text.secondary" textAlign="center">
                          {t('gameHistory.modifierResults.noCompletedResults')}
                        </Typography>
                      )}
                      {item.snapshot &&
                      item.snapshot.resultsCount !== (item.result?.activationCount ?? 0) ? (
                        <Typography variant="caption" color="text.secondary" textAlign="center">
                          {t('gameHistory.modifierResults.recordedResults', {
                            count: item.snapshot.resultsCount,
                          })}
                        </Typography>
                      ) : null}
                      <DetailBlock>
                        <Typography
                          variant="body2"
                          sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
                        >
                          {item.description}
                        </Typography>
                      </DetailBlock>
                      {item.revision !== null ? (
                        <AppLinkButton
                          size="small"
                          tone="ghost"
                          to={`${modifierHistoryRoute.fullPath}?modifierId=${item.modifierId}&revision=${item.revision}`}
                        >
                          {t('gameHistory.modifierResults.revisionHistory')}
                        </AppLinkButton>
                      ) : null}
                    </ModifierDetailsItem>
                  )
                })}
              </ModifierDetailsList>
            </Box>
          )}
          {children}
        </Stack>
      </Box>
    </RoundBriefingPanel>
  )
}
