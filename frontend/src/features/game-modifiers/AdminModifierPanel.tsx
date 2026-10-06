import { Stack } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  GameModifierAdminPlayer,
  GameModifierAdminPlayersResult,
  GameModifierActivation,
} from '../../shared/api/contracts/index.ts'
import { useAuth } from '../../shared/auth/use-auth.ts'
import { AppToast, ConfirmDialog } from '../../shared/ui/index.ts'
import { currentGameBoardQueryOptions } from '../game-board/index.ts'
import {
  adminGameModifierActivationsQueryOptions,
  adminGameModifierPlayersQueryOptions,
  adminGameModifierStateQueryOptions,
  gameModifierQueryKeys,
  gameModifierCatalogQueryOptions,
} from './api/game-modifier-queries.ts'
import {
  adminActivateGameModifier,
  cancelGameModifierActivation,
  emergencyDisableGameModifier,
} from './api/game-modifiers-api.ts'
import {
  buildCancelModifierOptions,
  resolveAdminActivateErrorKey,
  resolveAdminCancelErrorKey,
  modifierSelectOption,
} from './model/admin-modifier-support.ts'
import { AdminModifierActivationBlock } from './ui/AdminModifierActivationBlock.tsx'
import { AdminModifierCancellationBlock } from './ui/AdminModifierCancellationBlock.tsx'
import { AdminModifierStopBlock } from './ui/AdminModifierStopBlock.tsx'
import { AdminModifierSummary } from './ui/AdminModifierSummary.tsx'

const emptyAdminPlayers: readonly GameModifierAdminPlayer[] = []
const emptyAdminPlayersSummary: GameModifierAdminPlayersResult['summary'] = {
  playersCount: 0,
  totalAvailableQuizPoints: 0,
  totalEarnedQuizPoints: 0,
  totalSpentQuizPoints: 0,
}

export function AdminModifierTool() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [selectedPlayerId, setSelectedPlayerId] = useState('')
  const [selectedAvailableModifierId, setSelectedAvailableModifierId] = useState('')
  const [selectedCancelModifierId, setSelectedCancelModifierId] = useState('')
  const [selectedCancelPlayerId, setSelectedCancelPlayerId] = useState('')
  const [selectedStopModifierId, setSelectedStopModifierId] = useState('')
  const [stoppedModifierIds, setStoppedModifierIds] = useState<string[]>([])
  const [cancelReason, setCancelReason] = useState('')
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<GameModifierActivation | null>(null)
  const [emergencyDisableReason, setEmergencyDisableReason] = useState('')
  const [stopTarget, setStopTarget] = useState<{
    gameId: string
    modifierId: string
    modifierName: string
    reason: string
  } | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [toastSeverity, setToastSeverity] = useState<'info' | 'error'>('info')

  const isAdmin = user?.roles.includes('admin') ?? false
  const catalogQuery = useQuery({ ...gameModifierCatalogQueryOptions, enabled: isAdmin })
  const gameQuery = useQuery({ ...currentGameBoardQueryOptions, enabled: isAdmin })
  const currentGameId = gameQuery.data?.gameId ?? null
  const adminPlayersQuery = useQuery({
    ...adminGameModifierPlayersQueryOptions,
    enabled: isAdmin,
  })
  const adminActivationsQuery = useQuery({
    ...adminGameModifierActivationsQueryOptions,
    enabled: isAdmin,
  })
  const players = adminPlayersQuery.data?.players ?? emptyAdminPlayers
  const summary = adminPlayersQuery.data?.summary ?? emptyAdminPlayersSummary
  const effectiveSelectedPlayerId =
    selectedPlayerId.length > 0 && players.some((player) => player.userId === selectedPlayerId)
      ? selectedPlayerId
      : (players[0]?.userId ?? '')
  const selectedPlayer =
    players.find((player) => player.userId === effectiveSelectedPlayerId) ?? null

  const adminStateQuery = useQuery({
    ...adminGameModifierStateQueryOptions(effectiveSelectedPlayerId),
    enabled: isAdmin && effectiveSelectedPlayerId.length > 0,
  })

  const invalidateModifierCaches = () => {
    void queryClient.invalidateQueries({ queryKey: gameModifierQueryKeys.all })
    void queryClient.invalidateQueries({ queryKey: currentGameBoardQueryOptions.queryKey })
  }

  const activateMutation = useMutation({
    mutationFn: (input: { modifierId: string; playerId: string }) =>
      adminActivateGameModifier(input.modifierId, input.playerId),
    onSuccess: () => {
      setToastSeverity('info')
      setToastMessage(t('gameModifiers.adminPanel.activateSuccess'))
      setSelectedAvailableModifierId('')
      invalidateModifierCaches()
    },
    onError: (error) => {
      setToastSeverity('error')
      setToastMessage(t(resolveAdminActivateErrorKey(error)))
      invalidateModifierCaches()
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (input: { activationId: string; roundVersion: number; reason: string }) =>
      cancelGameModifierActivation(input.activationId, input.roundVersion, input.reason),
    onSuccess: () => {
      setIsCancelConfirmOpen(false)
      setToastSeverity('info')
      setToastMessage(t('gameModifiers.adminPanel.cancelSuccess'))
      setSelectedCancelModifierId('')
      setSelectedCancelPlayerId('')
      setCancelTarget(null)
      setCancelReason('')
      invalidateModifierCaches()
    },
    onError: (error) => {
      setToastSeverity('error')
      setToastMessage(t(resolveAdminCancelErrorKey(error)))
      invalidateModifierCaches()
    },
  })

  const emergencyDisableMutation = useMutation({
    mutationFn: (input: { modifierId: string; reason: string; gameId: string }) =>
      emergencyDisableGameModifier(input.modifierId, input.reason),
    onSuccess: (_, input) => {
      setStoppedModifierIds((ids) => [...ids, `${input.gameId}:${input.modifierId}`])
      setStopTarget(null)
      setEmergencyDisableReason('')
      setToastSeverity('info')
      setToastMessage(t('gameModifiers.adminPanel.emergencyDisableSuccess'))
      invalidateModifierCaches()
    },
    onError: () => {
      setToastSeverity('error')
      setToastMessage(t('gameModifiers.adminPanel.emergencyDisableError'))
      invalidateModifierCaches()
    },
  })

  if (!isAdmin) {
    return null
  }

  const state = adminStateQuery.data ?? null
  const activeActivations = adminActivationsQuery.data ?? []
  const effectiveSelectedAvailableModifierId =
    selectedAvailableModifierId.length > 0 &&
    (state?.availableModifiers.some((item) => item.modifier.id === selectedAvailableModifierId) ??
      false)
      ? selectedAvailableModifierId
      : ''
  const effectiveSelectedCancelModifierId =
    selectedCancelModifierId.length > 0 &&
    activeActivations.some((item) => item.modifierId === selectedCancelModifierId)
      ? selectedCancelModifierId
      : ''
  const cancelModifierOptions = buildCancelModifierOptions(activeActivations)
  const selectedAvailableModifier =
    state?.availableModifiers.find(
      (item) => item.modifier.id === effectiveSelectedAvailableModifierId,
    ) ?? null
  const catalog = catalogQuery.data ?? []
  const stopModifiers =
    gameQuery.data?.status === 'active'
      ? catalog.filter((modifier) => gameQuery.data?.enabledModifierIds.includes(modifier.id))
      : []
  const selectedStopModifier =
    stopModifiers.find((modifier) => modifier.id === selectedStopModifierId) ?? null
  const cancelPlayers = [
    ...new Map(
      activeActivations
        .filter((activation) => activation.modifierId === effectiveSelectedCancelModifierId)
        .map((activation) => [
          activation.activatedByUserId,
          {
            userId: activation.activatedByUserId,
            displayName:
              players.find((player) => player.userId === activation.activatedByUserId)
                ?.displayName ?? activation.activatedByDisplayName,
            login:
              players.find((player) => player.userId === activation.activatedByUserId)?.login ??
              null,
          },
        ]),
    ).values(),
  ].sort((left, right) => left.displayName.localeCompare(right.displayName, i18n.resolvedLanguage))
  const selectedCancelPlayer =
    cancelPlayers.find((player) => player.userId === selectedCancelPlayerId) ?? null
  const selectedActivation =
    activeActivations
      .filter(
        (item) =>
          item.modifierId === effectiveSelectedCancelModifierId &&
          item.activatedByUserId === selectedCancelPlayer?.userId,
      )
      .sort(
        (left, right) =>
          right.activatedAtUtc.localeCompare(left.activatedAtUtc) ||
          left.activationId.localeCompare(right.activationId),
      )[0] ?? null
  const cancelModifiers = cancelModifierOptions.map((option) => ({
    ...(catalog.find((modifier) => modifier.id === option.modifierId) ??
      state?.availableModifiers.find((item) => item.modifier.id === option.modifierId)
        ?.modifier ?? { id: option.modifierId, name: option.modifierName, iconEmoji: null }),
    activationCount: option.activationCount,
  }))
  const stopDisabled =
    stoppedModifierIds.includes(`${currentGameId}:${selectedStopModifierId}`) ||
    (state?.availableModifiers.some(
      (item) => item.modifier.id === selectedStopModifierId && item.isEmergencyDisabled,
    ) ??
      false)
  const isBusy =
    activateMutation.isPending || cancelMutation.isPending || emergencyDisableMutation.isPending

  return (
    <>
      <Stack data-testid="modifier-management-tool" spacing={1}>
        <AdminModifierSummary summary={summary} usedCount={activeActivations.length} />

        <AdminModifierActivationBlock
          players={players}
          selectedPlayer={selectedPlayer}
          state={state}
          selectedModifier={selectedAvailableModifier}
          isPlayersLoading={adminPlayersQuery.isLoading}
          isPlayersError={adminPlayersQuery.isError}
          isStateLoading={adminStateQuery.isLoading}
          isStateError={adminStateQuery.isError}
          isBusy={isBusy}
          isActivating={activateMutation.isPending}
          onPlayerChange={(playerId) => {
            setSelectedPlayerId(playerId)
            setSelectedAvailableModifierId('')
          }}
          onModifierChange={(modifierId) => {
            setSelectedAvailableModifierId(modifierId)
          }}
          onActivate={() => {
            if (!effectiveSelectedPlayerId || !effectiveSelectedAvailableModifierId) {
              return
            }

            activateMutation.mutate({
              modifierId: effectiveSelectedAvailableModifierId,
              playerId: effectiveSelectedPlayerId,
            })
          }}
        />

        <AdminModifierCancellationBlock
          activeActivations={activeActivations}
          modifiers={cancelModifiers}
          players={cancelPlayers}
          selectedPlayer={selectedCancelPlayer}
          onPlayerChange={(id) => {
            setSelectedCancelPlayerId(id)
            setCancelReason('')
          }}
          selectedModifierId={effectiveSelectedCancelModifierId}
          selectedActivation={selectedActivation}
          cancelReason={cancelReason}
          isLoading={adminActivationsQuery.isLoading}
          isError={adminActivationsQuery.isError}
          isBusy={isBusy}
          isCancelling={cancelMutation.isPending}
          onModifierChange={(modifierId) => {
            setSelectedCancelModifierId(modifierId)
            setSelectedCancelPlayerId('')
            setCancelReason('')
          }}
          onCancelReasonChange={setCancelReason}
          onRequestCancel={() => {
            setCancelTarget(selectedActivation)
            setIsCancelConfirmOpen(true)
          }}
        />
        <AdminModifierStopBlock
          modifiers={stopModifiers.map(modifierSelectOption)}
          selectedId={selectedStopModifier?.id ?? ''}
          reason={emergencyDisableReason}
          stopped={stopDisabled}
          disabled={isBusy}
          loading={catalogQuery.isLoading || gameQuery.isLoading}
          error={catalogQuery.isError || gameQuery.isError}
          pending={emergencyDisableMutation.isPending}
          onChange={(id) => {
            setSelectedStopModifierId(id)
            setEmergencyDisableReason('')
          }}
          onReasonChange={setEmergencyDisableReason}
          onStop={() => {
            if (currentGameId && selectedStopModifier && emergencyDisableReason.trim()) {
              setStopTarget({
                gameId: currentGameId,
                modifierId: selectedStopModifier.id,
                modifierName: selectedStopModifier.name,
                reason: emergencyDisableReason.trim(),
              })
            }
          }}
        />
      </Stack>

      <ConfirmDialog
        open={stopTarget != null}
        title={t('gameModifiers.adminPanel.emergencyDisableConfirmTitle')}
        description={
          stopTarget
            ? t('gameModifiers.adminPanel.emergencyDisableConfirmDescription', {
                modifier: stopTarget.modifierName,
              })
            : ''
        }
        confirmDisabled={
          !stopTarget ||
          stopTarget.gameId !== currentGameId ||
          !stopModifiers.some((modifier) => modifier.id === stopTarget.modifierId) ||
          stopDisabled ||
          gameQuery.isError ||
          catalogQuery.isError
        }
        errorMessage={
          stopTarget && stopTarget.gameId !== currentGameId
            ? t('gameModifiers.adminPanel.gameChanged')
            : null
        }
        confirmLabel={t('gameModifiers.adminPanel.emergencyDisableAction')}
        cancelLabel={t('common.actions.cancel')}
        confirmTone="danger"
        isBusy={emergencyDisableMutation.isPending}
        onClose={() => setStopTarget(null)}
        onConfirm={() => {
          if (
            !stopTarget ||
            stopTarget.gameId !== currentGameId ||
            stopDisabled ||
            gameQuery.isError ||
            catalogQuery.isError ||
            !stopModifiers.some((modifier) => modifier.id === stopTarget.modifierId)
          ) {
            return
          }

          return emergencyDisableMutation.mutateAsync(stopTarget)
        }}
      />

      <ConfirmDialog
        open={isCancelConfirmOpen}
        title={t('gameModifiers.adminPanel.cancelConfirmTitle')}
        description={
          cancelTarget
            ? t('gameModifiers.adminPanel.cancelConfirmDescription', {
                modifier: cancelTarget.modifierName,
                player: cancelTarget.activatedByDisplayName,
                cost: cancelTarget.activationCost,
              })
            : ''
        }
        confirmLabel={t('gameModifiers.adminPanel.cancelAction')}
        cancelLabel={t('gameModifiers.adminPanel.cancelConfirmCancel')}
        confirmTone="danger"
        isBusy={cancelMutation.isPending}
        onClose={() => setIsCancelConfirmOpen(false)}
        onConfirm={() => {
          if (!cancelTarget || cancelReason.trim().length === 0) {
            return
          }

          cancelMutation.mutate({
            activationId: cancelTarget.activationId,
            roundVersion: cancelTarget.roundVersion,
            reason: cancelReason.trim(),
          })
        }}
      />

      <AppToast
        message={toastMessage}
        onClose={() => setToastMessage(null)}
        severity={toastSeverity}
        autoHideDuration={4000}
      />
    </>
  )
}
