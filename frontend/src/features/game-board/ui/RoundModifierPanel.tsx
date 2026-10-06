import { Stack, Typography } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  GameModifierAvailability,
  GameModifierState,
} from '../../../shared/api/contracts/index.ts'
import { useAuth } from '../../../shared/auth/use-auth.ts'
import {
  ModifierCatalogGroup,
  ModifierCatalogRow,
  ModifierConflictNotice,
  ModifierDescriptionBlock,
} from '../../../shared/game-ui/index.ts'
import { AppButton, AppDialog, StatusBadge } from '../../../shared/ui/index.ts'
import {
  groupActiveGameModifiers,
  groupAvailableGameModifiers,
  getCategoryLabel,
  ModifierActivationControl,
  GameModifierActions,
} from '../../game-modifiers/index.ts'

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
  const [detailsId, setDetailsId] = useState<string | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsState, setDetailsState] = useState<GameModifierState | null>(null)
  const showDetails = (modifierId: string) => {
    setDetailsId(modifierId)
    setDetailsState(state)
    setDetailsOpen(true)
  }
  const availableGroups = groupAvailableGameModifiers(
    state.availableModifiers,
    i18n.resolvedLanguage,
  )
  const available = availableGroups.flatMap((group) => group.items)
  const availableById = new Map(available.map((item) => [item.modifier.id, item]))
  const active = groupActiveGameModifiers(
    state.activeModifiers.filter((item) => item.roundId === roundId),
    i18n.resolvedLanguage,
  )
  const activeById = new Map(active.map((group) => [group.modifierId, group]))
  const unavailableActive = active.filter((group) => !availableById.has(group.modifierId))
  if (detailsOpen && detailsState !== state) {
    if (detailsId && (availableById.has(detailsId) || activeById.has(detailsId))) {
      setDetailsState(state)
    } else setDetailsOpen(false)
  }
  // Keep the last available presentation through removal and the exit transition.
  const selected = detailsState?.availableModifiers.find((item) => item.modifier.id === detailsId)
  const selectedActive = groupActiveGameModifiers(
    detailsState?.activeModifiers.filter(
      (item) => item.roundId === roundId && item.modifierId === detailsId,
    ) ?? [],
    i18n.resolvedLanguage,
  )[0]
  const namesById = new Map(
    detailsState?.availableModifiers.map((item) => [item.modifier.id, item.modifier.name]),
  )
  for (const item of detailsState?.activeModifiers ?? [])
    namesById.set(item.modifierId, item.modifierName)
  const ownActivation = selectedActive?.activations.find(
    (item) => item.activatedByUserId === user?.id,
  )

  return (
    <GameModifierActions state={state} roundId={roundId} disabled={disabled}>
      {(actions) => (
        <>
          <Stack spacing={1.5} data-testid="round-modifier-list">
            {available.length === 0 && active.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {t('gameModifiers.availableEmpty')}
              </Typography>
            ) : (
              <Stack spacing={1}>
                {availableGroups.map((group) => (
                  <ModifierCatalogGroup
                    key={group.category}
                    title={getCategoryLabel(t, group.category)}
                    count={group.items.length}
                  >
                    {group.items.map((item) => (
                      <RoundModifierRow
                        key={item.modifier.id}
                        availability={item}
                        isActive={activeById.has(item.modifier.id)}
                        isBusy={actions.isBusy}
                        isPending={actions.pendingModifierId === item.modifier.id}
                        onActivate={actions.requestActivation}
                        onDetails={() => showDetails(item.modifier.id)}
                      />
                    ))}
                  </ModifierCatalogGroup>
                ))}
                {unavailableActive.length > 0 ? (
                  <ModifierCatalogGroup
                    title={t('gameBoard.currentRoundScreen.drawerActiveOnly')}
                    count={unavailableActive.length}
                  >
                    {unavailableActive.map((group) => (
                      <RoundModifierRow
                        key={group.modifierId}
                        activeOnly={{
                          name: group.modifierName,
                          cost: group.activationCost,
                        }}
                        isActive
                        isBusy={actions.isBusy}
                        isPending={false}
                        onActivate={actions.requestActivation}
                        onDetails={() => showDetails(group.modifierId)}
                      />
                    ))}
                  </ModifierCatalogGroup>
                ) : null}
              </Stack>
            )}
          </Stack>
          <AppDialog
            open={detailsOpen}
            onClose={() => setDetailsOpen(false)}
            slotProps={{
              transition: {
                onExited: () => {
                  if (!detailsOpen) {
                    setDetailsId(null)
                    setDetailsState(null)
                  }
                },
              },
            }}
            title={selected?.modifier.name ?? selectedActive?.modifierName ?? ''}
            contentDensity="compact"
            actions={
              <AppButton tone="secondary" onClick={() => setDetailsOpen(false)}>
                {t('common.actions.close')}
              </AppButton>
            }
          >
            <Stack spacing={1.5} sx={{ pt: 1, textAlign: 'center' }}>
              <Stack direction="row" gap={0.75} justifyContent="center" flexWrap="wrap">
                {selected ? (
                  <StatusBadge label={getCategoryLabel(t, selected.modifier.category)} />
                ) : null}
                <StatusBadge
                  color="warning"
                  label={t('gameModifiers.costShortLabel', {
                    cost: selected?.modifier.activationCost ?? selectedActive?.activationCost ?? 0,
                  })}
                />
                {selected?.limit != null ? (
                  <StatusBadge
                    label={t('gameModifiers.limitProgressLabel', {
                      count: selected.activationsCount,
                      limit: selected.limit,
                    })}
                  />
                ) : null}
                {selectedActive ? (
                  <StatusBadge
                    color="success"
                    label={t('gameModifiers.activeGroupCount', {
                      count: selectedActive.activationsCount,
                    })}
                  />
                ) : null}
              </Stack>
              <ModifierDescriptionBlock
                description={selected?.modifier.description ?? t('gameModifiers.notEnabled')}
              />
              {selected?.modifier.conflictingModifierIds.length ? (
                <ModifierConflictNotice
                  conflicts={selected.modifier.conflictingModifierIds.map((id) => ({
                    id,
                    name: namesById.get(id) ?? id,
                    isActive:
                      detailsState?.activeModifiers.some((item) => item.modifierId === id) ?? false,
                  }))}
                />
              ) : null}
              {detailsState?.isOrderingOpen && ownActivation ? (
                <AppButton
                  tone="dangerSecondary"
                  size="small"
                  fullWidth
                  disabled={!detailsOpen || actions.isBusy || !state.isOrderingOpen}
                  onClick={() => actions.requestSelfCancel(ownActivation)}
                >
                  {t('gameModifiers.selfCancelCompactAction')}
                </AppButton>
              ) : null}
              {selectedActive ? (
                <Stack spacing={0.5}>
                  <Typography variant="subtitle2">{t('gameModifiers.activatorsLabel')}</Typography>
                  <Stack direction="row" gap={0.5} justifyContent="center" flexWrap="wrap">
                    {selectedActive.activators.map((activator) => (
                      <StatusBadge
                        key={activator.userId}
                        label={
                          activator.activationsCount > 1
                            ? t('gameModifiers.activeGroupActivatorWithCount', {
                                player: activator.displayName,
                                count: activator.activationsCount,
                              })
                            : activator.displayName
                        }
                      />
                    ))}
                  </Stack>
                </Stack>
              ) : null}
            </Stack>
          </AppDialog>
        </>
      )}
    </GameModifierActions>
  )
}

type RoundModifierRowProps = (
  | { availability: GameModifierAvailability; activeOnly?: never }
  | { availability?: never; activeOnly: { name: string; cost: number } }
) & {
  isActive: boolean
  isBusy: boolean
  isPending: boolean
  onActivate: (modifierId: string) => void
  onDetails: () => void
}

function RoundModifierRow({
  availability,
  activeOnly,
  isActive,
  isBusy,
  isPending,
  onActivate,
  onDetails,
}: RoundModifierRowProps) {
  const { t } = useTranslation()
  const modifier = availability?.modifier
  const name = availability ? availability.modifier.name : activeOnly.name
  const cost = availability ? availability.modifier.activationCost : activeOnly.cost
  const blockedReasonLabel = availability?.blockedReason
    ? t(`gameModifiers.blockedReasonLabels.${availability.blockedReason}`)
    : t('gameModifiers.unavailableAction')
  const blockedReasonTooltip = availability?.blockedReason
    ? t(`gameModifiers.blockedReasons.${availability.blockedReason}`)
    : t('gameModifiers.unavailableAction')

  return (
    <ModifierCatalogRow
      name={name}
      emoji={modifier?.iconEmoji}
      cost={cost}
      limit={availability?.limit}
      activationsCount={availability?.activationsCount ?? 0}
      isActive={isActive}
      onDetails={onDetails}
      actions={
        availability ? (
          <ModifierActivationControl
            compact
            availability={availability}
            isBusy={isBusy}
            isPending={isPending}
            blockedReasonLabel={blockedReasonLabel}
            blockedReasonTooltip={blockedReasonTooltip}
            onActivate={onActivate}
          />
        ) : null
      }
    />
  )
}
