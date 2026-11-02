import { Box, Typography } from '@mui/material'
import { scrollRegionSx } from '../../../shared/theme/layout-sx.ts'
import { useTranslation } from 'react-i18next'
import type { components } from '../../../shared/api/contracts/generated'
import { useAuth } from '../../../shared/auth/use-auth.ts'
import {
  RoundBriefingPanel,
  QuizStandingsList,
  sortQuizStandings,
} from '../../../shared/game-ui/index.ts'
import { DisclosureSection, SectionCard } from '../../../shared/ui/index.ts'
type QuizPlayer = components['schemas']['GameHistoryQuizPlayerSummaryDto']

export function QuizLeaderboard({
  entries,
  defaultExpanded = false,
  presentation = 'disclosure',
}: {
  entries: readonly QuizPlayer[]
  defaultExpanded?: boolean
  presentation?: 'disclosure' | 'panel'
}) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const leaderboard = sortQuizStandings(entries)

  const content = (
    <QuizStandingsList
      entries={leaderboard}
      compact={presentation === 'panel'}
      {...(user?.id ? { currentUserId: user.id } : {})}
    />
  )

  if (presentation === 'panel') {
    return (
      <RoundBriefingPanel
        data-testid="quiz-leaderboard"
        sx={{ flex: 1, minHeight: 0 }}
        header={
          <Typography component="h2" variant="h6" textAlign="center">
            {t('common.quizStandings.title')}
          </Typography>
        }
      >
        <Box sx={{ minHeight: 0, ...scrollRegionSx }}>{content}</Box>
      </RoundBriefingPanel>
    )
  }
  return (
    <SectionCard surface="inset" sx={{ p: 0 }} data-testid="quiz-leaderboard">
      <DisclosureSection
        title={t('common.quizStandings.title')}
        description={t('common.quizStandings.description')}
        countLabel={t('gameHistory.summary.playerCountShort', { count: leaderboard.length })}
        defaultExpanded={defaultExpanded}
      >
        {content}
      </DisclosureSection>
    </SectionCard>
  )
}
