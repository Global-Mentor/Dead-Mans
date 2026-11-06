import { Stack, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../shared/auth/use-auth.ts'
import {
  AppButton,
  AsyncSection,
  ContentTabs,
  PagePagination,
  PageShell,
  SectionCard,
  SectionHeader,
} from '../../shared/ui/index.ts'
import {
  userProfileQueryOptions,
  type ProfileGamesPage,
  type ProfileAnswersPage,
} from './api/user-profile-queries.ts'
import { useProfileHistory } from './use-profile-history.ts'
import { ProfileGames } from './ui/ProfileGames.tsx'
import { ProfileAnswers } from './ui/ProfileAnswers.tsx'
import { ProfileSummary } from './ui/ProfileSummary.tsx'
import { ProfileStatistics } from './ui/ProfileStatistics.tsx'
import { ProfileCharts } from './ui/ProfileCharts.tsx'

export function UserProfilePage() {
  const { user } = useAuth()
  return user ? <ProfileContent key={user.id} userId={user.id} /> : null
}

function ProfileContent({ userId }: { userId: string }) {
  const { t, i18n } = useTranslation()
  const profile = useQuery(userProfileQueryOptions(userId))
  const history = useProfileHistory(userId)
  const number = new Intl.NumberFormat(i18n.language)
  const pagination = (
    kind: 'games' | 'answers',
    data: ProfileGamesPage | ProfileAnswersPage | null | undefined,
    fetching: boolean,
    onChange: (page: number) => void,
  ) =>
    data && data.totalCount > data.pageSize ? (
      <PagePagination
        page={data.page}
        pageSize={data.pageSize}
        total={data.totalCount}
        density="compact"
        disabled={fetching}
        onChange={onChange}
        previousLabel={t('userProfile.previousPage')}
        nextLabel={t('userProfile.nextPage')}
        pageLabel={(value) => t('userProfile.pageLabel', { page: value })}
        navigationLabel={t(
          kind === 'games' ? 'userProfile.gamesPagination' : 'userProfile.answersPagination',
        )}
        summary={t('userProfile.pageSummary', {
          page: data.page,
          pages: Math.max(1, Math.ceil(data.totalCount / data.pageSize)),
          total: number.format(data.totalCount),
        })}
      />
    ) : null
  const answers = (
    <Stack key={history.answerViewKey} spacing={1.5}>
      <SectionHeader
        headingSize="small"
        title={history.selectedGame?.title}
        actions={
          <AppButton tone="ghost" size="small" autoFocus onClick={history.closeAnswers}>
            {t('userProfile.backToQuizzes')}
          </AppButton>
        }
      />
      <AsyncSection
        isLoading={history.answers.isLoading}
        isError={history.answers.isError}
        hasData={history.answersData != null}
        isEmpty={history.answersData?.items.length === 0}
        loadingMessage={t('userProfile.loadingAnswers')}
        errorMessage={t('userProfile.answersError')}
        emptyMessage={t('userProfile.emptyAnswers')}
        retryAction={
          <AppButton tone="ghost" onClick={() => void history.answers.refetch()}>
            {t('common.actions.retry')}
          </AppButton>
        }
      >
        <ProfileAnswers key={history.gameId} answers={history.answersData?.items ?? []} />
      </AsyncSection>
      {pagination(
        'answers',
        history.answersData,
        history.answers.isFetching,
        history.changeAnswersPage,
      )}
    </Stack>
  )
  return (
    <PageShell sx={{ maxWidth: 1120, width: '100%', mx: 'auto' }}>
      <Stack spacing={1.5}>
        <Typography component="h1" variant="h4">
          {t('userProfile.title')}
        </Typography>
        <SectionCard surface="accented">
          <AsyncSection
            isLoading={profile.isLoading}
            isError={profile.isError}
            hasData={profile.data != null}
            isEmpty={false}
            loadingMessage={t('userProfile.loadingProfile')}
            errorMessage={t('userProfile.profileError')}
            emptyMessage=""
            retryAction={
              <AppButton tone="ghost" onClick={() => void profile.refetch()}>
                {t('common.actions.retry')}
              </AppButton>
            }
          >
            {profile.data ? <ProfileSummary profile={profile.data} /> : null}
          </AsyncSection>
        </SectionCard>
        <ContentTabs
          variant="scrollable"
          label={t('userProfile.history')}
          value={history.tab}
          onValueChange={history.setTab}
          items={[
            {
              id: 'statistics',
              label: t('userProfile.statistics'),
              content: profile.data ? (
                <ProfileStatistics
                  statistics={profile.data.statistics}
                  quizGameCount={profile.data.quizGameCount}
                />
              ) : null,
            },
            {
              id: 'charts',
              label: t('userProfile.charts.tab'),
              content: profile.data ? <ProfileCharts statistics={profile.data.statistics} /> : null,
            },
            ...(['player', 'quiz'] as const).map((participation) => {
              const list = history[participation]
              return {
                id: participation,
                label: t(
                  participation === 'player'
                    ? 'userProfile.playerParticipation'
                    : 'userProfile.quiz',
                ),
                content:
                  participation === 'quiz' && history.selectedGame ? (
                    answers
                  ) : (
                    <Stack spacing={1}>
                      <AsyncSection
                        isLoading={list.query.isLoading}
                        isError={list.query.isError}
                        hasData={list.data != null}
                        isEmpty={list.data?.items.length === 0}
                        loadingMessage={t('userProfile.loadingGames')}
                        errorMessage={t('userProfile.gamesError')}
                        emptyMessage={t(
                          participation === 'player'
                            ? 'userProfile.emptyPlayerGames'
                            : 'userProfile.emptyQuizGames',
                        )}
                        retryAction={
                          <AppButton tone="ghost" onClick={() => void list.query.refetch()}>
                            {t('common.actions.retry')}
                          </AppButton>
                        }
                      >
                        {participation === 'player' ? (
                          <ProfileGames games={list.data?.items ?? []} participation="player" />
                        ) : (
                          <ProfileGames
                            games={list.data?.items ?? []}
                            participation="quiz"
                            onOpen={history.openAnswers}
                            focusGameId={history.returnFocusGameId}
                          />
                        )}
                      </AsyncSection>
                      {pagination('games', list.data, list.query.isFetching, list.changePage)}
                    </Stack>
                  ),
              }
            }),
          ]}
        />
      </Stack>
    </PageShell>
  )
}
