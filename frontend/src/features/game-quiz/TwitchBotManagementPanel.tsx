import { Stack } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../shared/auth/use-auth.ts'
import { AppButton, AsyncSection, InlineNotice } from '../../shared/ui/index.ts'
import { gameHistoryQueryKeys } from '../game-history/index.ts'
import { TwitchBotPanel } from './TwitchBotPanel.tsx'
import {
  cancelTwitchQuizPublication,
  connectTwitchEventSub,
  retryTwitchQuizPublication,
  skipTwitchQuizOutcome,
} from './api/game-quiz-api.ts'
import { gameQuizQueryKeys, twitchBotStatusQueryOptions } from './api/game-quiz-queries.ts'

export function TwitchBotManagementPanel() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const canAdmin = user?.roles.some((role) => role === 'admin' || role === 'superadmin') ?? false
  const twitch = useQuery({
    ...twitchBotStatusQueryOptions,
    refetchInterval: (query) => {
      const status = query.state.data
      if (!status?.enabled) return 15000
      if (!status.botConnected || !status.broadcasterConnected || !status.eventSubConnected)
        return 5000
      return status.publication?.status === 'publishing' ||
        status.publication?.status === 'cancel_pending'
        ? 1000
        : 15000
    },
  })
  const connect = useMutation({
    mutationFn: connectTwitchEventSub,
    onSuccess: (status) => queryClient.setQueryData(gameQuizQueryKeys.twitchIntegration(), status),
  })
  const publication = useMutation({
    mutationFn: async (action: 'retry' | 'cancel' | 'skip') => {
      const id = twitch.data?.publication?.publicationId
      if (!id) throw new Error('No Twitch publication is selected.')
      return action === 'retry'
        ? retryTwitchQuizPublication(id)
        : action === 'cancel'
          ? cancelTwitchQuizPublication(id)
          : skipTwitchQuizOutcome(id)
    },
    onSuccess: async (state) => {
      queryClient.setQueryData(twitchBotStatusQueryOptions.queryKey, (status) =>
        status?.publication?.publicationId === state.publicationId
          ? { ...status, publication: state }
          : status,
      )
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: gameQuizQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: gameHistoryQueryKeys.all }),
      ])
    },
  })

  return (
    <Stack spacing={1} data-testid="quiz-twitch-panel">
      <AsyncSection
        isLoading={twitch.isPending}
        isError={twitch.isError}
        hasData={twitch.data !== undefined}
        isEmpty={false}
        loadingMessage={t('gameQuiz.twitch.loading')}
        errorMessage={t('gameQuiz.twitch.loadError')}
        emptyMessage=""
        retryAction={
          <AppButton
            size="small"
            tone="secondary"
            disabled={twitch.isFetching}
            onClick={() => void twitch.refetch()}
          >
            {t('common.actions.retry')}
          </AppButton>
        }
      >
        {twitch.data ? (
          <TwitchBotPanel
            status={twitch.data}
            canAdmin={canAdmin}
            busy={connect.isPending || publication.isPending || twitch.isError}
            onConnectEventSub={() => connect.mutate()}
            onRetry={() => publication.mutate('retry')}
            onCancel={() => publication.mutate('cancel')}
            onSkipOutcome={() => publication.mutate('skip')}
          />
        ) : null}
      </AsyncSection>
      {connect.isError && !twitch.data?.eventSubConnected ? (
        <InlineNotice severity="error">{t('gameQuiz.twitch.connectError')}</InlineNotice>
      ) : null}
      {connect.isSuccess &&
      twitch.data?.enabled &&
      twitch.data.botConnected &&
      twitch.data.broadcasterConnected &&
      !twitch.data.eventSubConnected ? (
        <InlineNotice severity="info">{t('gameQuiz.twitch.verifying')}</InlineNotice>
      ) : null}
      {publication.isError ? (
        <InlineNotice severity="error">{t('gameQuiz.actionError')}</InlineNotice>
      ) : null}
    </Stack>
  )
}
