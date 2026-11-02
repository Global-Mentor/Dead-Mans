import type { components } from '../../../shared/api/contracts/generated'
import { Stack, Typography } from '@mui/material'
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { AppButton, InlineNotice, SectionCard, StatusBadge } from '../../../shared/ui/index.ts'
import {
  fetchOverlayLeaderboardState,
  setOverlayLeaderboardState,
} from '../../game-overlay/index.ts'

export function OverlayLeaderboardControl({ gameId }: { gameId: string }) {
  const { t } = useTranslation()
  const client = useQueryClient()
  const queryKey = ['overlay-leaderboard', gameId] as const
  const state = useQuery(
    queryOptions({
      queryKey,
      queryFn: ({ signal }) => fetchOverlayLeaderboardState(gameId, signal),
      refetchInterval: 2000,
    }),
  )
  const change = useMutation({
    mutationFn: (value: components['schemas']['SetGameOverlayLeaderboardRequest']) =>
      setOverlayLeaderboardState(gameId, value),
    onMutate: () => client.cancelQueries({ queryKey }),
    onSuccess: async (data) => {
      await client.cancelQueries({ queryKey })
      client.setQueryData(queryKey, data)
    },
    onSettled: () => client.invalidateQueries({ queryKey }),
  })
  return (
    <Stack spacing={1}>
      {(['teams', 'quiz'] as const).map((kind) => {
        const active = state.data?.enabled && state.data.kind === kind
        return (
          <SectionCard key={kind} surface="inset">
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                <Typography component="h4" variant="subtitle2">
                  {t(
                    kind === 'quiz' ? 'gameBoard.overlayQuizGroup' : 'gameBoard.overlayTeamsGroup',
                  )}
                </Typography>
                <StatusBadge
                  density="compact"
                  color={active ? 'success' : 'default'}
                  label={t(active ? 'gameBoard.overlayVisible' : 'gameBoard.overlayHidden')}
                />
              </Stack>
              <AppButton
                tone={active ? 'dangerSecondary' : 'secondary'}
                size="small"
                fullWidth
                aria-pressed={Boolean(active)}
                aria-label={t(
                  kind === 'quiz'
                    ? active
                      ? 'gameBoard.hideOverlayQuizLeaderboard'
                      : 'gameBoard.showOverlayQuizLeaderboard'
                    : active
                      ? 'gameBoard.hideOverlayLeaderboard'
                      : 'gameBoard.showOverlayLeaderboard',
                )}
                loading={change.isPending && change.variables.kind === kind}
                disabled={!state.data || state.isError || change.isPending}
                onClick={() => change.mutate({ enabled: !active, kind })}
              >
                {t(active ? 'gameBoard.overlayHide' : 'gameBoard.overlayShow')}
              </AppButton>
              {active && state.data && state.data.pageCount > 1 ? (
                <Stack spacing={1}>
                  <Typography variant="body2" textAlign="center" aria-live="polite">
                    {t('gameBoard.overlayLeaderboardPage', {
                      current: state.data.page + 1,
                      total: state.data.pageCount,
                    })}
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <AppButton
                      tone="secondary"
                      size="small"
                      fullWidth
                      disabled={change.isPending || state.isError || state.data.page === 0}
                      onClick={() =>
                        change.mutate({
                          enabled: true,
                          kind: state.data?.kind ?? 'teams',
                          page: (state.data?.page ?? 0) - 1,
                        })
                      }
                    >
                      {t('gameBoard.overlayLeaderboardPrevious')}
                    </AppButton>
                    <AppButton
                      tone="secondary"
                      size="small"
                      fullWidth
                      disabled={
                        change.isPending ||
                        state.isError ||
                        state.data.page >= state.data.pageCount - 1
                      }
                      onClick={() =>
                        change.mutate({
                          enabled: true,
                          kind: state.data?.kind ?? 'teams',
                          page: (state.data?.page ?? 0) + 1,
                        })
                      }
                    >
                      {t('gameBoard.overlayLeaderboardNext')}
                    </AppButton>
                  </Stack>
                </Stack>
              ) : null}
            </Stack>
          </SectionCard>
        )
      })}
      {state.isError || change.isError ? (
        <InlineNotice severity="error">{t('gameBoard.overlayLeaderboardError')}</InlineNotice>
      ) : null}
    </Stack>
  )
}
