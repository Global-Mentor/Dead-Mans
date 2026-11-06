import { useStatisticsFormat } from '../use-statistics-format.ts'
import { Stack, Typography } from '@mui/material'
import { NativeDisclosure } from '../../../shared/ui/index.ts'
import { ProfileQuizStatistics } from './ProfileQuizStatistics.tsx'
import { ProfileModifierStatistics } from './ProfileModifierStatistics.tsx'
import { ProfileActivityStatistics } from './ProfileActivityStatistics.tsx'
import {
  StatisticsMetrics,
  StatisticsSection,
  type Statistics,
} from './ProfileStatisticsShared.tsx'

export function ProfileStatistics({
  statistics: s,
  quizGameCount,
}: {
  statistics: Statistics
  quizGameCount: number
}) {
  const { t, percent, average, number } = useStatisticsFormat()
  const g = s.games
  const p = s.points
  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" color="text.secondary">
        {t('userProfile.stats.scope')}
      </Typography>
      <StatisticsSection title={t('userProfile.stats.keyStatistics')}>
        <StatisticsMetrics
          prominent
          items={[
            [t('userProfile.stats.wins'), g.winCount],
            [t('userProfile.completedRounds'), s.completedRoundCount],
            [t('userProfile.quizPoints'), s.awardedQuizPoints],
            [t('userProfile.stats.appliedModifiers'), s.modifiers.appliedCount],
          ]}
        />
      </StatisticsSection>
      <StatisticsSection
        title={t('userProfile.stats.gameResults')}
        description={t('userProfile.stats.winsHelp')}
      >
        <StatisticsMetrics
          items={[
            [t('userProfile.finishedGames'), s.finishedPlayerGameCount],
            [t('userProfile.stats.playedGames'), g.playedGameCount],
            [t('userProfile.stats.rankedGames'), g.rankedGameCount],
            [t('userProfile.stats.winRate'), percent(g.winCount, g.rankedGameCount)],
            [t('userProfile.stats.podiums'), g.podiumCount],
            [t('userProfile.stats.podiumRate'), percent(g.podiumCount, g.rankedGameCount)],
            [t('userProfile.stats.bestPlacement'), g.bestPlacement],
            [
              t('userProfile.stats.averageRounds'),
              average(s.completedRoundCount, g.playedGameCount),
            ],
            [t('userProfile.stats.teams'), g.teamCount],
            [t('userProfile.stats.teammates'), g.teammateCount],
          ]}
        />
        <NativeDisclosure
          indicator="chevron"
          density="compact"
          summary={t('userProfile.stats.teamRoundResults')}
        >
          <Stack spacing={1.5}>
            <Typography variant="body2" color="text.secondary">
              {t('userProfile.stats.teamResultsHelp')}
            </Typography>
            <StatisticsMetrics
              items={[
                [t('userProfile.stats.roundScore'), g.totalRoundScore],
                [t('userProfile.stats.bestRound'), g.bestRoundScore],
                [t('userProfile.stats.averageRoundScore'), number(g.averageRoundScore)],
                [t('userProfile.stats.teamKills'), g.teamKills],
                [t('userProfile.stats.teamBounties'), g.teamBounties],
                [t('userProfile.completedRounds'), s.completedRoundCount],
              ]}
            />
          </Stack>
        </NativeDisclosure>
      </StatisticsSection>
      <ProfileQuizStatistics quiz={s.quiz} quizGameCount={quizGameCount} />
      <StatisticsSection
        title={t('userProfile.stats.points')}
        description={t('userProfile.stats.pointsHelp')}
      >
        <StatisticsMetrics
          items={[
            [t('userProfile.quizPoints'), s.awardedQuizPoints],
            [t('userProfile.stats.manualAwarded'), p.manualAwarded],
            [t('userProfile.stats.manualDeducted'), p.manualDeducted],
            [t('userProfile.stats.spent'), p.spent],
            [t('userProfile.stats.refunded'), p.refunded],
            [t('userProfile.stats.netSpent'), p.netSpent],
            [t('userProfile.stats.averageAnswerPoints'), number(s.quiz.averageAnswerPoints)],
            [t('userProfile.stats.averageModifierCost'), number(p.averagePaidOrderCost)],
          ]}
        />
      </StatisticsSection>
      <ProfileModifierStatistics modifiers={s.modifiers} />
      <ProfileActivityStatistics activity={s.activity} />
    </Stack>
  )
}
