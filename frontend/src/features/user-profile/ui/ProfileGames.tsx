import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import {
  AppButton,
  AppLinkButton,
  ItemCard,
  Metric,
  StatusBadge,
} from '../../../shared/ui/index.ts'
import type { ProfileGame } from '../api/user-profile-queries.ts'
import { profileDate } from '../profile-date.ts'

type Participation =
  | { participation: 'player' }
  | {
      participation: 'quiz'
      onOpen: (game: ProfileGame) => void
      focusGameId: string | null
    }

export function ProfileGames({
  games,
  ...view
}: { games: readonly ProfileGame[] } & Participation) {
  const { t, i18n } = useTranslation()
  const number = new Intl.NumberFormat(i18n.language)
  const focusGameId =
    view.participation === 'quiz' && view.focusGameId
      ? (games.find((game) => game.gameId === view.focusGameId)?.gameId ?? games[0]?.gameId)
      : null
  return (
    <Stack component="ul" spacing={0.75} sx={{ m: 0, p: 0, listStyle: 'none' }}>
      {games.map((game, index) => (
        <ItemCard
          component="li"
          key={game.gameId}
          density="compact"
          tone={index % 2 ? 'alternate' : 'default'}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) auto' },
              gap: 1,
              alignItems: 'center',
            }}
          >
            <Stack spacing={0.5} sx={{ minWidth: 0 }}>
              <Typography
                component="h2"
                variant="subtitle2"
                sx={{ overflowWrap: 'anywhere', minWidth: 0 }}
              >
                {game.title}
              </Typography>
              <Stack direction="row" gap={1} alignItems="baseline" flexWrap="wrap">
                <StatusBadge
                  appearance="plain"
                  density="compact"
                  label={t(
                    game.status === 'finished'
                      ? 'userProfile.finished'
                      : game.status === 'active'
                        ? 'userProfile.active'
                        : 'userProfile.ready',
                  )}
                />
                <Typography variant="caption" color="text.secondary">
                  {profileDate(
                    game.finishedAtUtc ?? game.startedAtUtc,
                    i18n.language,
                    t('userProfile.notStarted'),
                  )}
                </Typography>
              </Stack>
            </Stack>
            <Stack direction="row" gap={2} alignItems="center" flexWrap="wrap">
              {view.participation === 'player' ? (
                <>
                  <Metric
                    appearance="summary"
                    density="compact"
                    label={t('userProfile.rounds')}
                    value={number.format(game.completedRoundCount)}
                  />
                  {game.status === 'finished' ? (
                    <AppLinkButton
                      size="small"
                      tone="ghost"
                      to={`/panel/game-history?gameId=${encodeURIComponent(game.gameId)}&focus=me`}
                    >
                      {t('userProfile.gameResults')}
                    </AppLinkButton>
                  ) : null}
                </>
              ) : (
                <>
                  <Metric
                    appearance="summary"
                    density="compact"
                    label={t('userProfile.answers')}
                    value={number.format(game.answerCount)}
                  />
                  <Metric
                    appearance="summary"
                    density="compact"
                    label={t('userProfile.correctAnswers')}
                    value={number.format(game.correctAnswerCount)}
                  />
                  <AppButton
                    size="small"
                    tone="secondary"
                    autoFocus={focusGameId === game.gameId}
                    onClick={() => view.onOpen(game)}
                  >
                    {t('userProfile.myAnswers')}
                  </AppButton>
                </>
              )}
            </Stack>
          </Box>
        </ItemCard>
      ))}
    </Stack>
  )
}
