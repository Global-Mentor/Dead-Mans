import { Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { GameModifierActivation } from '../../../shared/api/contracts/index.ts'
import { PlayerPicker, type PickerPlayer } from '../../../shared/game-ui/index.ts'
import type { ModifierSelectOption } from '../model/admin-modifier-support.ts'
import { AppButton, FormTextField } from '../../../shared/ui/index.ts'
import { AdminModifierBlock } from './admin-modifier-panel-primitives.tsx'
import { AdminModifierSelect } from './AdminModifierSelect.tsx'
interface Props {
  activeActivations: GameModifierActivation[]
  modifiers: ModifierSelectOption[]
  players: PickerPlayer[]
  selectedPlayer: PickerPlayer | null
  onPlayerChange: (id: string) => void
  selectedModifierId: string
  selectedActivation: GameModifierActivation | null
  cancelReason: string
  isLoading: boolean
  isError: boolean
  isBusy: boolean
  isCancelling: boolean
  onModifierChange: (id: string) => void
  onCancelReasonChange: (reason: string) => void
  onRequestCancel: () => void
}
export function AdminModifierCancellationBlock({
  activeActivations,
  modifiers,
  players,
  selectedPlayer,
  onPlayerChange,
  selectedModifierId,
  selectedActivation,
  cancelReason,
  isLoading,
  isError,
  isBusy,
  isCancelling,
  onModifierChange,
  onCancelReasonChange,
  onRequestCancel,
}: Props) {
  const { t } = useTranslation()
  return (
    <AdminModifierBlock
      sectionId="cancel"
      icon="refund"
      title={t('gameModifiers.adminPanel.cancelModifierTitle')}
    >
      {isLoading ? (
        <Typography variant="body2" color="text.secondary">
          {t('gameModifiers.adminPanel.stateLoading')}
        </Typography>
      ) : isError ? (
        <Typography variant="body2" color="error.main">
          {t('gameModifiers.adminPanel.stateError')}
        </Typography>
      ) : activeActivations.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t('gameModifiers.adminPanel.noActiveModifiers')}
        </Typography>
      ) : (
        <Stack spacing={1}>
          <AdminModifierSelect
            modifiers={modifiers}
            value={selectedModifierId}
            onChange={onModifierChange}
            label={t('gameModifiers.adminPanel.activateModifierLabel')}
            disabled={isBusy}
          />
          <PlayerPicker
            players={players}
            value={selectedPlayer}
            onChange={(player) => onPlayerChange(player?.userId ?? '')}
            label={t('common.entities.player')}
            disabled={isBusy || !selectedModifierId}
          />
          <FormTextField
            label={t('gameModifiers.adminPanel.cancelReasonLabel')}
            value={cancelReason}
            onChange={(event) => onCancelReasonChange(event.target.value)}
            disabled={isBusy || selectedActivation == null}
            required
            inputProps={{ maxLength: 1000 }}
          />
          <AppButton
            tone="dangerSecondary"
            size="small"
            fullWidth
            disabled={isBusy || selectedActivation == null || cancelReason.trim().length === 0}
            loading={isCancelling}
            onClick={onRequestCancel}
          >
            {t('gameModifiers.adminPanel.cancelAction')}
          </AppButton>
        </Stack>
      )}
    </AdminModifierBlock>
  )
}
