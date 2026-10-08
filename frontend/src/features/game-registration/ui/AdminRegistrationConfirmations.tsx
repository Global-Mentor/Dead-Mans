import { Box, Stack, Typography } from '@mui/material'
import type { Dispatch, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import type { RegistrationPlayer, RegistrationTeam } from '../../../shared/api/contracts/index.ts'
import { ConfirmDialog, DiscardChangesDialog, SectionCard } from '../../../shared/ui/index.ts'
import { canConfirmAdminTeam } from '../model/admin-team-readiness.ts'
import type { AdminRegistrationPanelProps } from './AdminRegistrationPanel.tsx'

interface PendingRemove {
  teamId: string
  teamSlotIndex: number
  player: RegistrationPlayer
}
export function AdminRegistrationConfirmations({
  controls,
  dialogError,
  onDialogError,
  pendingConfirmTeam,
  setPendingConfirmTeam,
  pendingUnconfirmTeam,
  setPendingUnconfirmTeam,
  pendingDisbandTeam,
  setPendingDisbandTeam,
  pendingRemovePlayer,
  setPendingRemovePlayer,
  pendingSelection,
  setPendingSelection,
  setSelectedTeamId,
  setNameDirty,
  setActivePanel,
}: {
  controls: AdminRegistrationPanelProps
  dialogError: string | null
  onDialogError: (error: Error) => void
  pendingConfirmTeam: RegistrationTeam | null
  setPendingConfirmTeam: Dispatch<SetStateAction<RegistrationTeam | null>>
  pendingUnconfirmTeam: RegistrationTeam | null
  setPendingUnconfirmTeam: Dispatch<SetStateAction<RegistrationTeam | null>>
  pendingDisbandTeam: RegistrationTeam | null
  setPendingDisbandTeam: Dispatch<SetStateAction<RegistrationTeam | null>>
  pendingRemovePlayer: PendingRemove | null
  setPendingRemovePlayer: Dispatch<SetStateAction<PendingRemove | null>>
  pendingSelection: string | null
  setPendingSelection: Dispatch<SetStateAction<string | null>>
  setSelectedTeamId: Dispatch<SetStateAction<string | null>>
  setNameDirty: Dispatch<SetStateAction<boolean>>
  setActivePanel: Dispatch<SetStateAction<string>>
}) {
  const { t } = useTranslation()
  const { onDisbandTeam, onRemovePlayer, isDisbandingTeam, isRemovingPlayer } = controls
  const currentConfirmTeam = controls.snapshot.teams.find(
    (team) => team.teamId === pendingConfirmTeam?.teamId,
  )
  const canConfirm = Boolean(
    currentConfirmTeam &&
    canConfirmAdminTeam(
      currentConfirmTeam,
      controls.snapshot.minPlayersPerTeam,
      controls.snapshot.maxPlayersPerTeam,
    ),
  )
  return (
    <>
      <DiscardChangesDialog
        open={pendingSelection !== null}
        onClose={() => setPendingSelection(null)}
        onDiscard={() => {
          setSelectedTeamId(pendingSelection)
          setNameDirty(false)
          setPendingSelection(null)
          setActivePanel('detail')
        }}
      />
      <ConfirmDialog
        open={pendingConfirmTeam !== null}
        title={t('teamRegistrations.confirmTitle')}
        description={
          <Stack gap={2}>
            <Typography textAlign="center" fontWeight={700} sx={{ overflowWrap: 'anywhere' }}>
              {pendingConfirmTeam?.name}
            </Typography>
            <Typography textAlign="center">{t('teamRegistrations.canConfirm')}</Typography>
          </Stack>
        }
        errorMessage={
          dialogError ||
          (pendingConfirmTeam &&
          !canConfirm &&
          !controls.isConfirmingTeam(pendingConfirmTeam.teamId)
            ? t('teamRegistrations.confirmUnavailableHint')
            : null)
        }
        confirmDisabled={!canConfirm}
        cancelLabel={t('common.actions.cancel')}
        confirmLabel={t('teamRegistrations.confirm')}
        isBusy={pendingConfirmTeam ? controls.isConfirmingTeam(pendingConfirmTeam.teamId) : false}
        onClose={() => setPendingConfirmTeam(null)}
        onConfirm={() => {
          if (pendingConfirmTeam && canConfirm)
            controls.onConfirmTeam(
              pendingConfirmTeam.teamId,
              () => setPendingConfirmTeam(null),
              onDialogError,
            )
        }}
      />
      <ConfirmDialog
        open={pendingUnconfirmTeam !== null}
        title={t('teamRegistrations.unconfirmTitle')}
        description={
          <Stack gap={2} sx={{ mb: dialogError ? 2 : 0 }}>
            <Typography textAlign="center" fontWeight={700} sx={{ overflowWrap: 'anywhere' }}>
              {pendingUnconfirmTeam?.name ||
                t('common.teamWithSlot', { slot: pendingUnconfirmTeam?.teamSlotIndex ?? '-' })}
            </Typography>
            <Typography textAlign="center">{t('teamRegistrations.unconfirmHint')}</Typography>
          </Stack>
        }
        errorMessage={dialogError}
        cancelLabel={t('common.actions.cancel')}
        confirmLabel={t('teamRegistrations.unconfirmDialogAction')}
        isBusy={
          pendingUnconfirmTeam ? controls.isUnconfirmingTeam(pendingUnconfirmTeam.teamId) : false
        }
        onClose={() => setPendingUnconfirmTeam(null)}
        onConfirm={() => {
          if (pendingUnconfirmTeam)
            controls.onUnconfirmTeam(
              pendingUnconfirmTeam.teamId,
              () => setPendingUnconfirmTeam(null),
              onDialogError,
            )
        }}
      />
      <ConfirmDialog
        errorMessage={dialogError}
        confirmTone="danger"
        confirmDisabled={Boolean(
          pendingDisbandTeam &&
          (pendingDisbandTeam.isActiveInGame ||
            pendingDisbandTeam.isPlayed ||
            pendingDisbandTeam.hasOpenedCard),
        )}
        open={pendingDisbandTeam !== null}
        onClose={() => setPendingDisbandTeam(null)}
        onConfirm={() => {
          if (pendingDisbandTeam) {
            onDisbandTeam(
              pendingDisbandTeam.teamId,
              () => setPendingDisbandTeam(null),
              onDialogError,
            )
          }
        }}
        isBusy={pendingDisbandTeam ? isDisbandingTeam(pendingDisbandTeam.teamId) : false}
        title={t('gameApplication.adminPanel.disbandConfirmTitle')}
        description={
          <Stack gap={2} sx={{ mb: dialogError ? 2 : 0 }}>
            <SectionCard surface="inset" sx={{ p: 1.5 }}>
              <Stack gap={0.5}>
                <Typography textAlign="center">
                  {t('teamRegistrations.teamNameLabel')}:{' '}
                  <Box component="span" sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
                    {pendingDisbandTeam?.name ||
                      t('common.teamWithSlot', { slot: pendingDisbandTeam?.teamSlotIndex ?? '-' })}
                  </Box>
                </Typography>
                <Typography textAlign="center">
                  {t('teamRegistrations.playersCountLabel')}:{' '}
                  <Box component="span" sx={{ fontWeight: 700 }}>
                    {pendingDisbandTeam?.members.length ?? 0}
                  </Box>
                </Typography>
              </Stack>
            </SectionCard>
            <Typography textAlign="center">{t('teamRegistrations.disbandEffects')}</Typography>
          </Stack>
        }
        cancelLabel={t('gameApplication.adminPanel.disbandConfirmCancel')}
        confirmLabel={t('gameApplication.adminPanel.disbandConfirmAction')}
      />
      <ConfirmDialog
        errorMessage={dialogError}
        confirmTone="danger"
        open={pendingRemovePlayer !== null}
        onClose={() => setPendingRemovePlayer(null)}
        onConfirm={() => {
          if (pendingRemovePlayer) {
            onRemovePlayer(
              pendingRemovePlayer.teamId,
              pendingRemovePlayer.player.userId,
              () => setPendingRemovePlayer(null),
              onDialogError,
            )
          }
        }}
        isBusy={
          pendingRemovePlayer
            ? isRemovingPlayer(pendingRemovePlayer.teamId, pendingRemovePlayer.player.userId)
            : false
        }
        title={t('gameApplication.adminPanel.removePlayerConfirmTitle')}
        description={t('gameApplication.adminPanel.removePlayerConfirmDescription', {
          player: pendingRemovePlayer?.player.displayName ?? t('gameApplication.unknownPlayer'),
          slot: pendingRemovePlayer?.teamSlotIndex ?? '-',
        })}
        cancelLabel={t('gameApplication.adminPanel.removePlayerConfirmCancel')}
        confirmLabel={t('gameApplication.adminPanel.removePlayerConfirmAction')}
      />
    </>
  )
}
