import { Box, Stack, Typography } from '@mui/material'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  GameRegistrationAdminSnapshot,
  RegistrationPlayer,
  RegistrationTeam,
} from '../../../shared/api/contracts/index.ts'
import {
  AppButton,
  AppDialog,
  InlineNotice,
  FormTextField,
  SelectionRow,
} from '../../../shared/ui/index.ts'
import { searchRegistrationPlayers } from '../model/player-search.ts'

export type AdminTeamTarget = {
  slot: GameRegistrationAdminSnapshot['teamSlots'][number]
  team: RegistrationTeam
}

export function AdminTeamPlayerDialog({
  errorMessage,
  target,
  availablePlayers,
  isBusy,
  onClose,
  onInvite,
  onAdd,
}: {
  errorMessage: string | null
  target: AdminTeamTarget | null
  availablePlayers: readonly RegistrationPlayer[]
  isBusy: boolean
  onClose: () => void
  onInvite: (teamSlotId: string, invitedUserId: string, teamId: string) => void
  onAdd: (teamId: string, userId: string) => void
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const results = useMemo(
    () =>
      searchRegistrationPlayers(availablePlayers, {
        query,
        minQueryLength: 1,
        limit: 50,
        includeAllWhenQueryEmpty: true,
        locale,
      }),
    [availablePlayers, locale, query],
  )
  const selected = results.visible.find((player) => player.userId === selectedId)
  if (!target) return null
  const invite = !target.team.recruitmentOpen
  return (
    <AppDialog
      open
      height="viewport"
      contentDensity="compact"
      onClose={isBusy ? undefined : onClose}
      title={t(
        invite
          ? 'gameApplication.adminPanel.inviteDialogTitle'
          : 'teamRegistrations.addPlayerTitle',
        { slot: target.team.teamSlotIndex },
      )}
      actions={
        <>
          <AppButton size="small" tone="secondary" disabled={isBusy} onClick={onClose}>
            {t('common.actions.cancel')}
          </AppButton>
          <AppButton
            size="small"
            disabled={isBusy || !selected}
            loading={isBusy}
            onClick={() => {
              if (!selected) return
              if (invite) onInvite(target.slot.teamSlotId, selected.userId, target.team.teamId)
              else onAdd(target.team.teamId, selected.userId)
            }}
          >
            {t(
              invite
                ? 'gameApplication.adminPanel.inviteDialogSend'
                : 'teamRegistrations.addPlayer',
            )}
          </AppButton>
        </>
      }
    >
      <Stack gap={1} sx={{ flex: 1, minHeight: 0, minWidth: 0 }}>
        <Typography textAlign="center" fontWeight={700} noWrap>
          {target.team.name ||
            t('teamRegistrations.teamNumber', { slot: target.team.teamSlotIndex })}
        </Typography>
        {errorMessage ? (
          <InlineNotice severity="error" sx={{ textAlign: 'center' }}>
            {errorMessage}
          </InlineNotice>
        ) : null}
        <FormTextField
          fullWidth
          size="small"
          label={t('gameApplication.adminPanel.playerSearchLabel')}
          placeholder={t('gameApplication.adminPanel.playerSearchPlaceholder')}
          value={query}
          disabled={isBusy}
          onChange={(event) => {
            setQuery(event.target.value)
            setSelectedId(null)
          }}
        />
        <Typography textAlign="center" variant="caption" color="text.secondary" aria-live="polite">
          {t('teamRegistrations.playerPickerSummary', { count: results.matches.length })}
        </Typography>
        <Box
          role="region"
          aria-label={t('teamRegistrations.playerPickerResults')}
          tabIndex={0}
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            scrollbarGutter: 'stable',
          }}
        >
          <Stack component="ul" gap={0.5} sx={{ m: 0, p: 0, listStyle: 'none' }}>
            {results.visible.length ? (
              results.visible.map((player) => (
                <Box component="li" key={player.userId}>
                  <SelectionRow
                    density="compact"
                    selectionAppearance="outline"
                    selected={selectedId === player.userId}
                    disabled={isBusy}
                    onClick={() => setSelectedId(player.userId)}
                  >
                    <Typography
                      textAlign="center"
                      variant="body2"
                      sx={{ width: '100%', overflowWrap: 'anywhere' }}
                    >
                      {player.displayName}
                    </Typography>
                  </SelectionRow>
                </Box>
              ))
            ) : (
              <Typography textAlign="center" component="li" color="text.secondary" sx={{ p: 1 }}>
                {t(
                  availablePlayers.length
                    ? 'gameApplication.adminPanel.noPlayersMatched'
                    : 'gameApplication.adminPanel.inviteDialogNoAvailablePlayers',
                )}
              </Typography>
            )}
            {results.hiddenCount ? (
              <Typography textAlign="center" component="li" variant="caption" sx={{ p: 1 }}>
                {t('teamRegistrations.playerPickerMore', { count: results.hiddenCount })}
              </Typography>
            ) : null}
          </Stack>
        </Box>
        <Typography textAlign="center" variant="body2" noWrap sx={{ flexShrink: 0 }}>
          {selected
            ? t('teamRegistrations.playerPickerSelected', { name: selected.displayName })
            : t('teamRegistrations.playerPickerChoose')}
        </Typography>
      </Stack>
    </AppDialog>
  )
}
