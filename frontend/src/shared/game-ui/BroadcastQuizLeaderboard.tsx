import { Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { components } from '../api/contracts/generated'
import { BroadcastLeaderboardLayout } from './BroadcastLeaderboardLayout.tsx'
import { RoundBriefingPanel } from './RoundBriefingPanel.tsx'
import { QuizStandingsList } from './QuizStandingsList.tsx'
import { sortQuizStandings } from './quiz-standings.ts'

const pageSize = 6

export function BroadcastQuizLeaderboard({
  entries,
  page,
  pageLabel,
}: {
  entries: readonly components['schemas']['GameOverlayQuizLeaderboardEntryDto'][]
  page: number
  pageLabel: (current: number, total: number) => string
}) {
  const { t } = useTranslation()
  const pages = Math.max(1, Math.ceil(entries.length / pageSize))
  const currentPage = Math.max(0, Math.min(page, pages - 1))
  const standings = sortQuizStandings(entries)
  return (
    <BroadcastLeaderboardLayout>
      <RoundBriefingPanel
        data-testid="overlay-quiz-leaderboard"
        header={
          <Stack spacing={0.5}>
            <Typography component="h1" variant="h6" textAlign="center">
              {t('common.quizStandings.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              {t('common.quizStandings.description')}
            </Typography>
          </Stack>
        }
      >
        <QuizStandingsList
          entries={standings.slice(currentPage * pageSize, (currentPage + 1) * pageSize)}
          rankOffset={currentPage * pageSize}
        />
        {pages > 1 ? (
          <Typography variant="body2" textAlign="center" sx={{ mt: 1 }}>
            {pageLabel(currentPage + 1, pages)}
          </Typography>
        ) : null}
      </RoundBriefingPanel>
    </BroadcastLeaderboardLayout>
  )
}
