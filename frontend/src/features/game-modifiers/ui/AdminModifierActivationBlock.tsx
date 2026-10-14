import { Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type {
  GameModifierAdminPlayer,
  GameModifierAvailability,
  GameModifierState,
} from '../../../shared/api/contracts/index.ts'
import { PlayerPicker } from '../../../shared/game-ui/index.ts'
import { AppButton, InlineNotice, StatusBadge } from '../../../shared/ui/index.ts'
import { AdminModifierBlock } from './admin-modifier-panel-primitives.tsx'
import { AdminModifierSelect } from './AdminModifierSelect.tsx'
import { modifierSelectOption } from '../model/admin-modifier-support.ts'

interface Props {
  players: readonly GameModifierAdminPlayer[]
  selectedPlayer: GameModifierAdminPlayer | null
  state: GameModifierState | null
  selectedModifier: GameModifierAvailability | null
  isPlayersLoading: boolean
  isPlayersError: boolean
  isStateLoading: boolean
  isStateError: boolean
  isBusy: boolean
  isActivating: boolean
  onPlayerChange: (id: string) => void
  onModifierChange: (id: string) => void
  onActivate: () => void
}
export function AdminModifierActivationBlock({
  players,
  selectedPlayer,
  state,
  selectedModifier,
  isPlayersLoading,
  isPlayersError,
  isStateLoading,
  isStateError,
  isBusy,
  isActivating,
  onPlayerChange,
  onModifierChange,
  onActivate,
}: Props) {
  const { t } = useTranslation()
  return (
    <AdminModifierBlock
      sectionId="activate"
      icon="add"
      title={t('gameModifiers.adminPanel.activateLabel')}
    >
      {isPlayersLoading ? (
        <Typography variant="body2" color="text.secondary">
          {t('gameModifiers.adminPanel.stateLoading')}
        </Typography>
      ) : isPlayersError ? (
        <Typography variant="body2" color="error.main">
          {t('gameModifiers.errorLoading')}
        </Typography>
      ) : players.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t('gameModifiers.adminPanel.noPlayers')}
        </Typography>
      ) : (
        <Stack spacing={1}>
          <PlayerPicker
            players={players}
            value={selectedPlayer}
            label={t('common.entities.player')}
            disabled={isBusy}
            onChange={(player) => onPlayerChange(player?.userId ?? '')}
          />
          {isStateLoading ? (
            <Typography variant="body2" color="text.secondary">
              {t('gameModifiers.adminPanel.stateLoading')}
            </Typography>
          ) : isStateError ? (
            <Typography variant="body2" color="error.main">
              {t('gameModifiers.adminPanel.stateError')}
            </Typography>
          ) : state == null ? null : (
            <>
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                <StatusBadge
                  variant="outlined"
                  color="primary"
                  label={t('gameModifiers.adminPanel.pointsAvailable', {
                    points: state.availableQuizPoints,
                  })}
                />
                <StatusBadge
                  variant="outlined"
                  color="warning"
                  label={t('gameModifiers.adminPanel.pointsSpent', {
                    points: state.spentQuizPoints,
                  })}
                />
              </Stack>
              {state.availableModifiers.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {t('gameModifiers.adminPanel.noAvailableModifiers')}
                </Typography>
              ) : (
                <>
                  <AdminModifierSelect
                    modifiers={state.availableModifiers.map((item) =>
                      modifierSelectOption(item.modifier),
                    )}
                    value={selectedModifier?.modifier.id ?? ''}
                    onChange={onModifierChange}
                    label={t('gameModifiers.adminPanel.activateModifierLabel')}
                    disabled={isBusy}
                    showCost
                  />
                  {selectedModifier?.blockedReason ? (
                    <InlineNotice severity="warning">
                      {t(`gameModifiers.blockedReasons.${selectedModifier.blockedReason}`)}
                    </InlineNotice>
                  ) : null}
                  <AppButton
                    tone="primary"
                    size="small"
                    fullWidth
                    disabled={isBusy || selectedModifier?.canActivate !== true}
                    loading={isActivating}
                    onClick={onActivate}
                  >
                    {t('gameModifiers.adminPanel.activateAction')}
                  </AppButton>
                </>
              )}
            </>
          )}
        </Stack>
      )}
    </AdminModifierBlock>
  )
}
