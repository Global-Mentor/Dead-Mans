import { Box, Stack, Typography } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  GameModifierAvailability,
  GameModifierState,
} from '../../../shared/api/contracts/index.ts'
import { useAuth } from '../../../shared/auth/use-auth.ts'
import { ModifierIconTile } from '../../../shared/game-ui/index.ts'
import {
  AppButton,
  AppDialog,
  ContentList,
  ItemCard,
  InlineNotice,
  StatusBadge,
} from '../../../shared/ui/index.ts'
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
  const ownActivations =
    selectedActive?.activations.filter((item) => item.activatedByUserId === user?.id) ?? []

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
                  <Box
                    key={group.category}
                    component="section"
                    aria-label={getCategoryLabel(t, group.category)}
                    sx={{ border: '1px solid', borderColor: 'divider', minWidth: 0 }}
                  >
                    <RoundModifierCategoryHeading
                      title={getCategoryLabel(t, group.category)}
                      count={group.items.length}
                    />
                    <ContentList
                      disablePadding
                      component="ul"
                      sx={{ display: 'grid', gap: 0.5, px: 0.25 }}
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
                    </ContentList>
                  </Box>
                ))}
                {unavailableActive.length > 0 ? (
                  <Box
                    component="section"
                    aria-label={t('gameBoard.currentRoundScreen.drawerActiveOnly')}
                    sx={{ border: '1px solid', borderColor: 'divider', minWidth: 0 }}
                  >
                    <RoundModifierCategoryHeading
                      title={t('gameBoard.currentRoundScreen.drawerActiveOnly')}
                      count={unavailableActive.length}
                    />
                    <ContentList
                      disablePadding
                      component="ul"
                      sx={{ display: 'grid', gap: 0.5, px: 0.25 }}
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
                    </ContentList>
                  </Box>
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
              <Typography variant="body2">
                {selected?.modifier.description ?? t('gameModifiers.notEnabled')}
              </Typography>
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
              {selected?.modifier.conflictingModifierIds.length ? (
                <InlineNotice severity="warning">
                  <Typography variant="body2" fontWeight={700}>
                    {t('gameModifiers.conflictsListLabel', {
                      names: selected.modifier.conflictingModifierIds
                        .map((id) => namesById.get(id) ?? id)
                        .join(', '),
                    })}
                  </Typography>
                </InlineNotice>
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
              {detailsState?.isOrderingOpen && ownActivations.length > 0 ? (
                <Stack spacing={0.5}>
                  {ownActivations.map((item) => (
                    <AppButton
                      key={item.activationId}
                      tone="dangerSecondary"
                      size="small"
                      disabled={!detailsOpen || actions.isBusy || !state.isOrderingOpen}
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

function RoundModifierCategoryHeading({ title, count }: { title: string; count: number }) {
  const { t } = useTranslation()
  return (
    <Stack
      component="header"
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      gap={1}
      sx={{
        px: 1,
        py: 0.25,
        bgcolor: 'action.selected',
        borderBottom: '1px solid',
        borderColor: 'divider',
        borderLeft: '3px solid',
        borderLeftColor: 'primary.main',
      }}
    >
      <Typography
        component="h3"
        variant="body1"
        color="primary.light"
        fontWeight={700}
        sx={{ minWidth: 0, overflowWrap: 'anywhere' }}
      >
        {title}
      </Typography>
      <StatusBadge
        density="compact"
        variant="outlined"
        label={count}
        aria-label={t('gameModifiers.categoryCountLabel', { count })}
      />
    </Stack>
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
        px: 1,
        py: 0.5,
        containerType: 'inline-size',
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gap: 0.5,
          minWidth: 0,
          gridTemplateColumns: 'minmax(0, 1fr) auto',
          alignItems: 'center',
        }}
      >
        <Stack direction="row" alignItems="center" gap={1} sx={{ minWidth: 0 }}>
          <ModifierIconTile emoji={modifier?.iconEmoji} size="large" />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              component="h4"
              variant="body1"
              fontWeight={700}
              sx={{ overflowWrap: 'anywhere', lineHeight: 1.25 }}
            >
              {name}
            </Typography>
            <Box sx={{ mt: 0.25, display: 'flex', gap: 0.5, flexWrap: 'wrap', minWidth: 0 }}>
              <StatusBadge
                density="tight"
                variant="outlined"
                color="warning"
                label={t('gameModifiers.costLabel', { cost })}
              />
              {isActive ? (
                <StatusBadge
                  density="tight"
                  variant="outlined"
                  label={t('gameModifiers.activeTag')}
                  color="success"
                />
              ) : null}
            </Box>
          </Box>
        </Stack>
        {availability && !availability.canActivate ? (
          <Typography variant="caption" color="text.secondary" sx={{ gridColumn: '1 / -1' }}>
            {blockedReasonLabel}
          </Typography>
        ) : null}
        <Stack
          alignItems="flex-end"
          gap={0.5}
          sx={{
            gridColumn: 2,
            gridRow: 1,
            '@container (min-width:460px)': { flexDirection: 'row', alignItems: 'center' },
          }}
        >
          <AppButton tone="ghost" size="small" onClick={onDetails}>
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
          ) : null}
        </Stack>
      </Box>
    </ItemCard>
  )
}
