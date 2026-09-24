import { Stack } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { GameModifierState } from '../../../shared/api/contracts/index.ts'
import { useAuth } from '../../../shared/auth/use-auth.ts'
import { Metric } from '../../../shared/ui/index.ts'
import {
  groupActiveGameModifiers,
  groupAvailableGameModifiers,
} from '../../game-modifiers/model/game-modifier-groups.ts'
import { ActiveModifiersSection } from '../../game-modifiers/ui/ActiveModifiersSection.tsx'
import { AvailableModifiersSection } from '../../game-modifiers/ui/AvailableModifiersSection.tsx'
import { GameModifierActions } from '../../game-modifiers/ui/GameModifierActions.tsx'

export function RoundModifierPanel({
  state,
  roundId,
  disabled,
}: {
  state: GameModifierState
  roundId: string
  disabled: boolean
}) {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const definitionsById = new Map(
    state.availableModifiers.map((item) => [item.modifier.id, item.modifier]),
  )
  const namesById = new Map(
    state.availableModifiers.map((item) => [item.modifier.id, item.modifier.name]),
  )
  for (const item of state.activeModifiers) namesById.set(item.modifierId, item.modifierName)
  const activeModifiers = state.activeModifiers.filter((item) => item.roundId === roundId)
  const activeIds = new Set(activeModifiers.map((item) => item.modifierId))

  return (
    <GameModifierActions state={state} roundId={roundId} disabled={disabled}>
      {(actions) => (
        <Stack spacing={1.5}>
          <Metric
            label={t('gameModifiers.summaryAvailablePoints')}
            value={t('gameModifiers.myPointsValue', { points: state.availableQuizPoints })}
          />
          <AvailableModifiersSection
            groups={groupAvailableGameModifiers(state.availableModifiers, i18n.resolvedLanguage)}
            modifierNamesById={namesById}
            activeModifierIds={activeIds}
            hasSearch={false}
            isBusy={actions.isBusy}
            pendingModifierId={actions.pendingModifierId}
            onActivate={actions.requestActivation}
          />
          <ActiveModifiersSection
            groups={groupActiveGameModifiers(activeModifiers, i18n.resolvedLanguage)}
            activationsCount={activeModifiers.length}
            definitionsById={definitionsById}
            currentUserId={user?.id ?? null}
            canSelfCancel={state.isOrderingOpen}
            isCancelling={actions.isBusy}
            hasSearch={false}
            onSelfCancel={actions.requestSelfCancel}
          />
        </Stack>
      )}
    </GameModifierActions>
  )
}
