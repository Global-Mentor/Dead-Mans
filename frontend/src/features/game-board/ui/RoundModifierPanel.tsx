import { Box, Stack, Typography } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  GameModifierAvailability,
  GameModifierState,
} from '../../../shared/api/contracts/index.ts'
import { useAuth } from '../../../shared/auth/use-auth.ts'
import {
  ActionIcon,
  AppButton,
  AppDialog,
  ContentList,
  ItemCard,
  StatusBadge,
} from '../../../shared/ui/index.ts'
import {
  groupActiveGameModifiers,
  groupAvailableGameModifiers,
} from '../../game-modifiers/model/game-modifier-groups.ts'
import { getCategoryLabel } from '../../game-modifiers/ui/modifier-category.ts'
import { ModifierActivationControl } from '../../game-modifiers/ui/ModifierActivationControl.tsx'
import { ModifierIcon } from '../../game-modifiers/ui/modifier-list-primitives.tsx'
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
  const [detailsId, setDetailsId] = useState<string | null>(null)
  const available = groupAvailableGameModifiers(
    state.availableModifiers,
    i18n.resolvedLanguage,
  ).flatMap((group) => group.items)
  const availableById = new Map(available.map((item) => [item.modifier.id, item]))
  const active = groupActiveGameModifiers(
    state.activeModifiers.filter((item) => item.roundId === roundId),
    i18n.resolvedLanguage,
  )
  const activeById = new Map(active.map((group) => [group.modifierId, group]))
  const namesById = new Map(available.map((item) => [item.modifier.id, item.modifier.name]))
  for (const group of active) namesById.set(group.modifierId, group.modifierName)
  const selected = detailsId ? availableById.get(detailsId) : undefined
  const selectedActive = detailsId ? activeById.get(detailsId) : undefined
  if (detailsId && !selected && !selectedActive) setDetailsId(null)
  const ownActivations =
    selectedActive?.activations.filter((item) => item.activatedByUserId === user?.id) ?? []

  return (
    <GameModifierActions state={state} roundId={roundId} disabled={disabled}>
      {(actions) => (
        <>
          <Stack spacing={0.75} data-testid="round-modifier-list">
            <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
              <Typography variant="body2" color="text.secondary">
                {t('gameModifiers.summaryAvailablePoints')}
              </Typography>
              <StatusBadge
                density="compact"
                color="warning"
                label={t('gameModifiers.myPointsValue', { points: state.availableQuizPoints })}
              />
            </Stack>
            {available.length === 0 && active.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {t('gameModifiers.availableEmpty')}
              </Typography>
            ) : (
              <ContentList disablePadding component="ul" sx={{ display: 'grid', gap: 0.15 }}>
                {available.map((item) => (
                  <RoundModifierRow
                    key={item.modifier.id}
                    availability={item}
                    isActive={activeById.has(item.modifier.id)}
                    isBusy={actions.isBusy}
                    isPending={actions.pendingModifierId === item.modifier.id}
                    onActivate={actions.requestActivation}
                    onDetails={() => setDetailsId(item.modifier.id)}
                  />
                ))}
                {active
                  .filter((group) => !availableById.has(group.modifierId))
                  .map((group) => (
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
                      onDetails={() => setDetailsId(group.modifierId)}
                    />
                  ))}
              </ContentList>
            )}
          </Stack>
          <AppDialog
            open={Boolean(selected || selectedActive)}
            onClose={() => setDetailsId(null)}
            title={selected?.modifier.name ?? selectedActive?.modifierName ?? ''}
            contentDensity="compact"
            actions={
              <AppButton tone="secondary" onClick={() => setDetailsId(null)}>
                {t('common.actions.close')}
              </AppButton>
            }
          >
            <Stack spacing={1.5} sx={{ pt: 1 }}>
              <Typography variant="body2">
                {selected?.modifier.description ?? t('gameModifiers.notEnabled')}
              </Typography>
              <Stack direction="row" gap={0.75} flexWrap="wrap">
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
              {selected?.modifier.conflictingModifierIds.length ? (
                <Typography variant="body2" color="text.secondary">
                  {t('gameModifiers.conflictsListLabel', {
                    names: selected.modifier.conflictingModifierIds
                      .map((id) => namesById.get(id) ?? id)
                      .join(', '),
                  })}
                </Typography>
              ) : null}
              {selectedActive ? (
                <Stack spacing={0.5}>
                  <Typography variant="subtitle2">{t('gameModifiers.activatorsLabel')}</Typography>
                  <Stack direction="row" gap={0.5} flexWrap="wrap">
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
              {!disabled && state.isOrderingOpen && ownActivations.length > 0 ? (
                <Stack spacing={0.5}>
                  {ownActivations.map((item) => (
                    <AppButton
                      key={item.activationId}
                      tone="dangerSecondary"
                      size="small"
                      disabled={actions.isBusy}
                      onClick={() => actions.requestSelfCancel(item)}
                    >
                      {t('gameModifiers.selfCancelActionWithCost', { cost: item.activationCost })}
                    </AppButton>
                  ))}
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
    <ItemCard
      component="li"
      aria-label={name}
      emphasis={isActive ? 'selected' : 'none'}
      sx={{
        listStyle: 'none',
        minWidth: 0,
        minHeight: { xs: 44, sm: 40 },
        px: { xs: 0.35, sm: 0.4 },
        py: 0,
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) auto auto auto',
        alignItems: 'center',
        gap: { xs: 0.35, sm: 0.5 },
      }}
    >
      <Stack direction="row" alignItems="center" gap={0.5} sx={{ minWidth: 0 }}>
        <ModifierIcon emoji={modifier?.iconEmoji} />
        <Typography
          variant="body2"
          fontWeight={700}
          sx={{ minWidth: 0, lineHeight: 1.15, overflowWrap: 'anywhere' }}
        >
          {name}
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
        {t('gameModifiers.costShortLabel', { cost })}
      </Typography>
      <ActionIcon
        appearance="framed"
        size="small"
        aria-label={t('gameModifiers.detailsAction')}
        onClick={onDetails}
        sx={{ display: { xs: 'inline-flex', sm: 'none' } }}
      >
        <Box
          component="svg"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          sx={{ width: 18, height: 18 }}
        >
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
          <path d="M12 11v6M12 7h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </Box>
      </ActionIcon>
      <AppButton
        tone="ghost"
        size="small"
        onClick={onDetails}
        sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
      >
        {t('gameModifiers.detailsAction')}
      </AppButton>
      {availability ? (
        <ModifierActivationControl
          compact
          availability={availability}
          isBusy={isBusy}
          isPending={isPending}
          blockedReasonLabel={blockedReasonLabel}
          blockedReasonTooltip={blockedReasonTooltip}
          onActivate={onActivate}
        />
      ) : (
        <Box sx={{ minWidth: 0 }}>
          <StatusBadge density="compact" label={t('gameModifiers.activeTag')} color="success" />
        </Box>
      )}
    </ItemCard>
  )
}
