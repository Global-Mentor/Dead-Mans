import { useId, useMemo, useState } from 'react'
import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type {
  RegistrationInvitation,
  RegistrationPlayer,
} from '../../../shared/api/contracts/index.ts'
import { AppButton, FormTextField } from '../../../shared/ui/index.ts'
import { searchRegistrationPlayers } from '../../game-registration/index.ts'

const minimumInviteSearchLength = 3
const maximumInviteSearchResults = 6
interface InviteTeammateSectionProps {
  canInvitePlayers: boolean
  invitablePlayers: RegistrationPlayer[]
  pendingOutgoingInvitation: RegistrationInvitation | null
  disabled: boolean
  isInvitingPlayer: boolean
  isCancellingInvitation: boolean
  onInvitePlayer: (userId: string) => void
  onCancelInvitation: (invitationId: string) => void
}
export function InviteTeammateSection({
  canInvitePlayers,
  invitablePlayers,
  pendingOutgoingInvitation,
  disabled,
  isInvitingPlayer,
  isCancellingInvitation,
  onInvitePlayer,
  onCancelInvitation,
}: InviteTeammateSectionProps) {
  const { t, i18n } = useTranslation()
  const searchId = useId()
  const [inviteQuery, setInviteQuery] = useState('')
  const locale = i18n.resolvedLanguage
  const inviteSearch = useMemo(
    () =>
      searchRegistrationPlayers(invitablePlayers, {
        query: inviteQuery,
        minQueryLength: minimumInviteSearchLength,
        limit: maximumInviteSearchResults,
        rankStartsWith: true,
        locale,
      }),
    [inviteQuery, invitablePlayers, locale],
  )
  const filteredPlayers = inviteSearch.visible
  const hiddenMatchesCount = inviteSearch.hiddenCount
  const inviteSearchState =
    inviteSearch.normalizedQuery.length < minimumInviteSearchLength || inviteSearch.isTooShort
      ? 'idle'
      : filteredPlayers.length === 0
        ? 'empty'
        : 'results'
  return (
    <Box sx={{ pt: 2.5, borderTop: '1px solid', borderColor: 'divider' }}>
      <Stack spacing={1.5}>
        <Typography component="h3" variant="subtitle2">
          {t('gameApplication.inviteTeammateTitle')}
        </Typography>
        <Typography variant="body2" color="text.secondary" role="status">
          {canInvitePlayers
            ? t('gameApplication.inviteTeammateDescription')
            : pendingOutgoingInvitation
              ? t('gameApplication.invitePendingDescription', {
                  player:
                    pendingOutgoingInvitation.invitedUserDisplayName ??
                    t('gameApplication.unknownPlayer'),
                })
              : t('gameApplication.inviteUnavailableDescription')}
        </Typography>

        {canInvitePlayers ? (
          <Stack spacing={1.25}>
            <FormTextField
              id={searchId}
              fullWidth
              size="small"
              label={t('common.entities.player')}
              placeholder={t('gameApplication.inviteTeammatePlaceholder')}
              value={inviteQuery}
              disabled={disabled}
              onChange={(event) => setInviteQuery(event.target.value)}
            />

            <Typography variant="caption" color="text.secondary">
              {t('gameApplication.inviteSearchHint', {
                count: invitablePlayers.length,
                min: minimumInviteSearchLength,
              })}
            </Typography>

            <Box sx={{ py: 1 }}>
              <Stack spacing={1}>
                {inviteSearchState === 'idle' ? (
                  <Typography variant="body2" color="text.secondary">
                    {t('gameApplication.inviteSearchStartTyping', {
                      min: minimumInviteSearchLength,
                    })}
                  </Typography>
                ) : null}

                {inviteSearchState === 'results'
                  ? filteredPlayers.map((player) => (
                      <Stack
                        key={player.userId}
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1}
                        alignItems={{ sm: 'center' }}
                        justifyContent="space-between"
                      >
                        <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={700} noWrap>
                            {player.displayName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            @{player.login}
                          </Typography>
                        </Stack>
                        <AppButton
                          size="small"
                          disabled={disabled}
                          loading={isInvitingPlayer}
                          onClick={() => onInvitePlayer(player.userId)}
                          sx={{ minWidth: { sm: 140 } }}
                        >
                          {t('gameApplication.inviteTeammateAction')}
                        </AppButton>
                      </Stack>
                    ))
                  : null}

                {inviteSearchState === 'empty' ? (
                  <Typography variant="body2" color="text.secondary">
                    {t('gameApplication.inviteNoPlayersFound')}
                  </Typography>
                ) : null}

                {inviteSearchState === 'results' && hiddenMatchesCount > 0 ? (
                  <Typography variant="caption" color="text.secondary">
                    {t('gameApplication.inviteSearchTooManyResults', {
                      count: hiddenMatchesCount,
                    })}
                  </Typography>
                ) : null}
              </Stack>
            </Box>
          </Stack>
        ) : null}

        {pendingOutgoingInvitation ? (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
            <Typography
              variant="body2"
              color="primary.light"
              sx={{ overflowWrap: 'anywhere', minWidth: 0 }}
            >
              {t('gameApplication.invitePendingChip', {
                player:
                  pendingOutgoingInvitation.invitedUserDisplayName ??
                  t('gameApplication.unknownPlayer'),
              })}
            </Typography>
            <AppButton
              size="small"
              tone="danger"
              disabled={disabled}
              loading={isCancellingInvitation}
              onClick={() => onCancelInvitation(pendingOutgoingInvitation.invitationId)}
            >
              {t('gameApplication.cancelInvitation')}
            </AppButton>
          </Stack>
        ) : null}
      </Stack>
    </Box>
  )
}
