import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  GameModifierActivation,
  GameModifierState,
} from '../../../shared/api/contracts/index.ts'
import { useAuth } from '../../../shared/auth/use-auth.ts'
import { AppToast, ConfirmDialog, InlineNotice } from '../../../shared/ui/index.ts'
import { currentGameBoardQueryOptions } from '../../game-board/api/game-board-queries.ts'
import { activeGameRoundQueryOptions } from '../../game-rounds/api/game-rounds-queries.ts'
import { gameModifierQueryKeys } from '../api/game-modifier-queries.ts'
import { selfCancelGameModifierActivation } from '../api/game-modifiers-api.ts'
import { useActivateGameModifier } from '../use-activate-game-modifier.ts'

type ActionTarget = { context: string; kind: 'activate' | 'cancel'; id: string }

interface ModifierActions {
  isBusy: boolean
  pendingModifierId: string | null
  requestActivation: (id: string) => void
  requestSelfCancel: (activation: GameModifierActivation) => void
}

/** Shared purchase/cancellation flow for the modifier page and the round drawer. */
export function GameModifierActions({
  state,
  roundId,
  disabled = false,
  children,
}: {
  state: GameModifierState | null
  roundId: string | null
  disabled?: boolean
  children: (actions: ModifierActions) => ReactNode
}) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const activation = useActivateGameModifier()
  const [target, setTarget] = useState<ActionTarget | null>(null)
  const [cancelMessage, setCancelMessage] = useState<string | null>(null)
  const context = `${state?.gameId ?? ''}:${roundId ?? ''}`
  const selected = target?.context === context ? target : null
  const availability =
    selected?.kind === 'activate'
      ? state?.availableModifiers.find((item) => item.modifier.id === selected.id)
      : undefined
  const cancellation =
    selected?.kind === 'cancel'
      ? state?.activeModifiers.find((item) => item.activationId === selected.id)
      : undefined
  const cancel = useMutation({
    mutationFn: (item: GameModifierActivation) =>
      selfCancelGameModifierActivation(item.activationId, item.roundVersion),
    onSuccess: () => setCancelMessage(t('gameModifiers.selfCancelSuccess')),
    onError: () => setCancelMessage(t('gameModifiers.selfCancelFailed')),
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: gameModifierQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: currentGameBoardQueryOptions.queryKey }),
        queryClient.invalidateQueries({ queryKey: activeGameRoundQueryOptions.queryKey }),
      ])
    },
  })
  const busy = activation.isActivating || cancel.isPending
  const ordering = Boolean(state?.isOrderingOpen && roundId)
  if (target && (!ordering || target.context !== context)) setTarget(null)
  const canConfirm =
    !disabled &&
    ordering &&
    (selected?.kind === 'activate'
      ? availability?.canActivate
      : cancellation?.activatedByUserId === user?.id && cancellation?.roundId === roundId)
  const errorMessage =
    selected?.kind === 'activate' ? activation.errorMessage : cancel.isError ? cancelMessage : null
  const description = availability
    ? t('gameModifiers.activationConfirmDescription', {
        modifier: availability.modifier.name,
        cost: availability.modifier.activationCost,
      })
    : cancellation
      ? t('gameModifiers.selfCancelConfirmDescription', {
          modifier: cancellation.modifierName,
          cost: cancellation.activationCost,
        })
      : ''

  const request = (kind: ActionTarget['kind'], id: string) => {
    if (busy || disabled || !ordering) return
    activation.reset()
    cancel.reset()
    setCancelMessage(null)
    setTarget({ context, kind, id })
  }

  return (
    <>
      {children({
        isBusy: busy || disabled || !ordering,
        pendingModifierId: activation.pendingModifierId,
        requestActivation: (id) => request('activate', id),
        requestSelfCancel: (item) => request('cancel', item.activationId),
      })}
      <ConfirmDialog
        open={selected !== null && ordering}
        title={t(
          selected?.kind === 'cancel'
            ? 'gameModifiers.selfCancelConfirmTitle'
            : 'gameModifiers.activationConfirmTitle',
        )}
        description={
          <>
            {description}
            {errorMessage ? (
              <InlineNotice severity="error" sx={{ mt: 1 }}>
                {errorMessage}
              </InlineNotice>
            ) : null}
            {!canConfirm && !errorMessage ? (
              <InlineNotice severity="warning" sx={{ mt: 1 }}>
                {t('gameModifiers.actionUnavailable')}
              </InlineNotice>
            ) : null}
          </>
        }
        confirmLabel={t(
          selected?.kind === 'cancel'
            ? 'gameModifiers.selfCancelAction'
            : 'gameModifiers.activateAction',
        )}
        cancelLabel={t('gameModifiers.activationConfirmCancel')}
        confirmTone={selected?.kind === 'cancel' ? 'danger' : 'primary'}
        isBusy={busy}
        confirmDisabled={!canConfirm}
        onClose={() => setTarget(null)}
        onConfirm={async () => {
          if (!canConfirm || busy) return
          if (availability) await activation.activateAsync(availability.modifier.id)
          else if (cancellation) await cancel.mutateAsync(cancellation)
          setTarget(null)
        }}
      />
      <AppToast
        message={selected ? null : activation.toastMessage}
        onClose={activation.dismissToast}
        severity={activation.errorMessage ? 'error' : 'info'}
        autoHideDuration={3000}
      />
      <AppToast
        message={selected ? null : cancelMessage}
        onClose={() => setCancelMessage(null)}
        severity={cancel.isError ? 'error' : 'info'}
        autoHideDuration={3000}
      />
    </>
  )
}
