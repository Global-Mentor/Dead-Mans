import { Stack, Typography } from '@mui/material'
import type { ParseKeys } from 'i18next'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../../../shared/api/errors/ApiError.ts'
import { AppButton, InlineNotice } from '../../../shared/ui/index.ts'

const reasonKeys: Readonly<Record<string, ParseKeys>> = {
  'game_finish.round_in_progress': 'gameBoard.finishErrors.roundInProgress',
  'game_finish.modifier_state_invalid': 'gameBoard.finishErrors.modifierStateInvalid',
  'game_finish.unconfirmed_teams': 'gameBoard.finishErrors.unconfirmedTeams',
  'game_finish.pending_invitations': 'gameBoard.finishErrors.pendingInvitations',
  'game_finish.pending_disband_requests': 'gameBoard.finishErrors.pendingDisbandRequests',
  'game_finish.invalid_confirmed_team_roster': 'gameBoard.finishErrors.invalidRoster',
  'game_finish.stale_version': 'gameBoard.finishStaleError',
  'game_finish.warnings_not_acknowledged': 'gameBoard.finishErrors.warningsNotAcknowledged',
  'game_finish.invalid_request': 'gameBoard.finishErrors.invalidRequest',
  'game_lifecycle.game_not_active': 'gameBoard.finishErrors.notActive',
  'game_lifecycle.game_not_found': 'gameBoard.finishErrors.notFound',
}

export function GameFinishErrorNotice({
  error,
  onRefresh,
}: {
  error: unknown
  onRefresh: () => void
}) {
  const { t } = useTranslation()
  const details = error instanceof ApiError ? error.details : null
  const code = details && typeof details === 'object' ? Reflect.get(details, 'code') : null
  const requestId =
    details && typeof details === 'object' ? Reflect.get(details, 'requestId') : null
  const status = error instanceof ApiError ? error.status : undefined
  const reason =
    (typeof code === 'string' && Object.hasOwn(reasonKeys, code) ? reasonKeys[code] : undefined) ??
    (status === 401
      ? 'gameBoard.finishErrors.signIn'
      : status === 403
        ? 'gameBoard.finishErrors.forbidden'
        : status === 404
          ? 'gameBoard.finishErrors.notFound'
          : status === 400
            ? 'gameBoard.finishErrors.invalidRequest'
            : status === 429
              ? 'gameBoard.finishErrors.rateLimited'
              : status !== undefined && status >= 500
                ? 'gameBoard.finishErrors.internal'
                : error instanceof TypeError || (error instanceof ApiError && status === undefined)
                  ? 'gameBoard.finishErrors.network'
                  : 'gameBoard.finishErrors.unknown')

  return (
    <InlineNotice
      severity="error"
      action={
        <AppButton tone="ghost" size="small" onClick={onRefresh}>
          {t('gameBoard.finishRefreshPreview')}
        </AppButton>
      }
    >
      <Stack spacing={0.5}>
        <Typography variant="body2">{t(reason)}</Typography>
        {typeof requestId === 'string' && requestId.length > 0 && requestId.length <= 128 ? (
          <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
            {t('gameBoard.finishErrors.requestId', { requestId })}
          </Typography>
        ) : null}
      </Stack>
    </InlineNotice>
  )
}
