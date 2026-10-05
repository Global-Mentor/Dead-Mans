import { Box, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { components } from '../../../shared/api/contracts/generated'
import { RoundBriefingDivider, RoundBriefingPanel } from '../../../shared/game-ui/index.ts'
import { DetailBlock, Metric } from '../../../shared/ui/index.ts'
import type translations from '../i18n/game-history-translations.ts'
import { buildGameStatistics } from '../model/game-statistics.ts'
import {
  formatCurrentCardLabel,
  formatHistoryTeamName,
  type GameHistoryBoardLabels,
} from '../model/game-history-formatters.ts'

type StatisticsKey = keyof typeof translations.en.statistics

type MetricValue = readonly [
  StatisticsKey,
  number | string | null,
  ('points' | 'percent' | null)?,
  StatisticsKey?,
]

export function CurrentGameStatistics({
  game,
  boardLabels,
  activeQuestionId = null,
  children,
}: {
  game: components['schemas']['GameHistoryGameDetailsDto']
  boardLabels: GameHistoryBoardLabels | undefined
  activeQuestionId?: string | null
  children: ReactNode
}) {
  const { t, i18n } = useTranslation()
  const stats = buildGameStatistics(game, activeQuestionId)
  const format = ([, value, unit]: MetricValue) => {
    if (value === null) return t('gameHistory.notAvailable')
    if (typeof value === 'string') return value
    const number = value.toLocaleString(i18n.resolvedLanguage, { maximumFractionDigits: 1 })
    if (unit === 'points') return t('gameHistory.pointsValue', { points: number })
    if (unit === 'percent') return t('gameHistory.statistics.percent', { value: number })
    return number
  }
  const metrics = (items: readonly MetricValue[], columns: 'single' | 'pair' = 'pair') => (
    <Box
      sx={{
        display: 'grid',
        alignContent: 'start',
        gridTemplateColumns:
          columns === 'single'
            ? 'minmax(0, 1fr)'
            : { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' },
        columnGap: 3,
        rowGap: 0,
      }}
    >
      {items.map((item) => (
        <Metric
          key={item[0]}
          appearance="row"
          density="compact"
          emphasis="label"
          label={t(`gameHistory.statistics.${item[0]}`)}
          value={format(item)}
          {...(item[3] ? { help: t(`gameHistory.statistics.${item[3]}`) } : {})}
        />
      ))}
    </Box>
  )
  const overviewColumns: readonly (readonly MetricValue[])[] = [
    [
      ['teams', stats.overview.teams],
      ['rounds', stats.overview.rounds],
    ],
    [
      ['kills', stats.overview.kills, null, 'killsHelp'],
      ['bounties', stats.overview.bounties],
    ],
    [
      ['participants', stats.overview.participants, null, 'participantsHelp'],
      ['cancelled', stats.overview.cancelled],
    ],
  ]
  const pairedColumns = (columns: readonly (readonly MetricValue[])[]) => (
    <Box
      sx={{
        display: 'grid',
        gap: 3,
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(3, minmax(0, 1fr))' },
      }}
    >
      {columns.map((items) => (
        <Box key={items[0]?.[0]}>{metrics(items, 'single')}</Box>
      ))}
    </Box>
  )
  const quizColumns: readonly (readonly MetricValue[])[] = [
    [
      ['quizPlayers', stats.quiz.players],
      ['questions', stats.quiz.questions, null, 'questionsHelp'],
    ],
    [
      ['correct', stats.quiz.correct],
      ['incorrect', stats.quiz.incorrect],
    ],
    [
      ['accuracy', stats.quiz.accuracy, 'percent'],
      ['quizEarned', stats.quiz.earned, 'points', 'quizEarnedHelp'],
    ],
  ]
  return (
    <RoundBriefingPanel
      data-testid="current-game-statistics"
      sx={{ flex: 1, minHeight: 0 }}
      header={
        <Typography component="h2" variant="h6" textAlign="center">
          {t('gameHistory.statistics.title')}
        </Typography>
      }
    >
      <Box
        role="region"
        aria-label={t('gameHistory.statistics.title')}
        tabIndex={0}
        sx={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehaviorY: 'contain' }}
      >
        <Stack spacing={1}>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            {t('gameHistory.statistics.description')}
          </Typography>
          <RoundBriefingPanel
            component="section"
            aria-label={t('gameHistory.statistics.overview')}
            header={
              <Typography component="h3" variant="body1" textAlign="center" fontWeight={700}>
                {t('gameHistory.statistics.overview')}
              </Typography>
            }
          >
            {pairedColumns(overviewColumns)}
          </RoundBriefingPanel>
          <RoundBriefingPanel
            component="section"
            aria-label={t('gameHistory.statistics.results')}
            header={
              <Typography component="h3" variant="body1" textAlign="center" fontWeight={700}>
                {t('gameHistory.statistics.results')}
              </Typography>
            }
          >
            {metrics([
              ['positive', stats.results.positive],
              ['negative', stats.results.negative],
              ['totalPoints', stats.results.points, 'points', 'totalPointsHelp'],
              ['penalties', stats.results.penalties, 'points', 'penaltiesHelp'],
            ])}
          </RoundBriefingPanel>
          <RoundBriefingPanel
            component="section"
            aria-label={t('gameHistory.statistics.quiz')}
            header={
              <Typography component="h3" variant="body1" textAlign="center" fontWeight={700}>
                {t('gameHistory.statistics.quiz')}
              </Typography>
            }
          >
            {pairedColumns(quizColumns)}
          </RoundBriefingPanel>
          <RoundBriefingPanel
            component="section"
            aria-label={t('gameHistory.statistics.records')}
            header={
              <Typography component="h3" variant="body1" textAlign="center" fontWeight={700}>
                {t('gameHistory.statistics.records')}
              </Typography>
            }
          >
            <Box
              sx={{
                display: 'grid',
                columnGap: 2,
                rowGap: 1.25,
                gridTemplateColumns: {
                  xs: 'minmax(0, 1fr)',
                  sm: 'repeat(3, minmax(0, 1fr))',
                },
                alignItems: 'stretch',
              }}
            >
              {(['score', 'kills', 'bounties'] as const).map((kind) => {
                const record = stats.records[kind]
                return (
                  <Box
                    key={kind}
                    component="article"
                    aria-label={t(`gameHistory.statistics.record_${kind}`)}
                    sx={{
                      minWidth: 0,
                      display: 'grid',
                      gridTemplateRows: 'subgrid',
                      gridRow: 'span 4',
                      textAlign: 'center',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    <Typography component="h4" variant="body1" textAlign="center" fontWeight={700}>
                      {t(`gameHistory.statistics.record_${kind}`)}
                    </Typography>
                    <RoundBriefingDivider />
                    <Stack spacing={0.25} justifyContent="flex-start">
                      {record ? (
                        <>
                          <Typography
                            variant="body1"
                            fontWeight={700}
                            data-testid="record-card-name"
                          >
                            {formatCurrentCardLabel(record.round, boardLabels, t)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {formatHistoryTeamName(
                              t,
                              record.round.teamName,
                              record.round.teamSlotIndex,
                            )}
                          </Typography>
                        </>
                      ) : null}
                    </Stack>
                    <DetailBlock
                      component="dl"
                      sx={{
                        m: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 2,
                      }}
                    >
                      <Typography component="dt" variant="body2" fontWeight={700}>
                        {t(`gameHistory.statistics.recordValue_${kind}`)}
                      </Typography>
                      <Typography
                        component="dd"
                        variant="body1"
                        sx={{ m: 0, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
                        data-testid="record-value"
                      >
                        {format(
                          kind === 'score'
                            ? ['record_score', record?.value ?? null, 'points']
                            : ['record_score', record?.value ?? null],
                        )}
                      </Typography>
                    </DetailBlock>
                  </Box>
                )
              })}
            </Box>
          </RoundBriefingPanel>
          {children}
        </Stack>
      </Box>
    </RoundBriefingPanel>
  )
}
