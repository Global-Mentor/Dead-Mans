import { Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameModifierAvailability } from '../../../shared/api/contracts/index.ts'
import {
  ModifierDetailsGroup,
  ModifierDetailsItem,
  ModifierDetailsList,
} from '../../../shared/game-ui/index.ts'
import { ListPanel, StatusBadge } from '../../../shared/ui/index.ts'
import { groupAvailableGameModifiers } from '../model/game-modifier-groups.ts'
import { deriveModifierRoundSummaryMeta } from '../model/modifier-round-summary.ts'
import { getCategoryLabel } from './modifier-category.ts'
import { ModifierActivationControl } from './ModifierActivationControl.tsx'

type AvailableModifierGroup = ReturnType<typeof groupAvailableGameModifiers>[number]

interface AvailableModifiersSectionProps {
  groups: AvailableModifierGroup[]
  modifierNamesById: ReadonlyMap<string, string>
  activeModifierIds: ReadonlySet<string>
  hasSearch: boolean
  tools: ReactNode
  isBusy: boolean
  pendingModifierId: string | null
  onActivate: (modifierId: string) => void
}

export function AvailableModifiersSection({
  groups,
  modifierNamesById,
  activeModifierIds,
  hasSearch,
  tools,
  isBusy,
  pendingModifierId,
  onActivate,
}: AvailableModifiersSectionProps) {
  const { t } = useTranslation()
  const count = groups.reduce((total, group) => total + group.items.length, 0)

  return (
    <ListPanel
      data-testid="available-modifiers-section"
      title={t('gameModifiers.availableTitle')}
      tools={tools}
      summary={
        <StatusBadge density="compact" label={t('gameModifiers.categoryCountLabel', { count })} />
      }
      sx={{
        maxHeight: 'var(--modifier-panel-height)',
      }}
    >
      {groups.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {hasSearch ? t('common.modifiers.emptySearch') : t('gameModifiers.availableEmpty')}
        </Typography>
      ) : (
        <ModifierDetailsList count={count} layout="fit">
          {groups.map((group) => (
            <ModifierDetailsGroup
              key={group.category}
              title={`${getCategoryLabel(t, group.category)} · ${t('gameModifiers.categoryCountLabel', { count: group.items.length })}`}
            >
              {group.items.map((availability) => (
                <AvailableModifierRow
                  key={availability.modifier.id}
                  availability={availability}
                  isBusy={isBusy}
                  isPending={pendingModifierId === availability.modifier.id}
                  onActivate={onActivate}
                  conflictingModifierNames={availability.modifier.conflictingModifierIds.map(
                    (modifierId) => modifierNamesById.get(modifierId) ?? modifierId,
                  )}
                  activeConflictingModifierNames={availability.modifier.conflictingModifierIds
                    .filter((modifierId) => activeModifierIds.has(modifierId))
                    .map((modifierId) => modifierNamesById.get(modifierId) ?? modifierId)}
                />
              ))}
            </ModifierDetailsGroup>
          ))}
        </ModifierDetailsList>
      )}
    </ListPanel>
  )
}

interface AvailableModifierRowProps {
  availability: GameModifierAvailability
  isBusy: boolean
  isPending: boolean
  conflictingModifierNames: readonly string[]
  activeConflictingModifierNames: readonly string[]
  onActivate: (modifierId: string) => void
}

function AvailableModifierRow({
  availability,
  isBusy,
  isPending,
  conflictingModifierNames,
  activeConflictingModifierNames,
  onActivate,
}: AvailableModifierRowProps) {
  const { t } = useTranslation()
  const definition = availability.modifier
  const roundSummaryMeta = deriveModifierRoundSummaryMeta(definition)
  const blockedReasonLabel =
    availability.blockedReason != null
      ? t(`gameModifiers.blockedReasonLabels.${availability.blockedReason}`)
      : t('gameModifiers.unavailableAction')
  const blockedReasonTooltip =
    availability.blockedReason === 'conflict_active' && activeConflictingModifierNames.length > 0
      ? t('gameModifiers.blockedByConflicts', { names: activeConflictingModifierNames.join(', ') })
      : availability.blockedReason != null
        ? t(`gameModifiers.blockedReasons.${availability.blockedReason}`)
        : t('gameModifiers.unavailableAction')

  return (
    <ModifierDetailsItem
      title={definition.name}
      emoji={definition.iconEmoji}
      reserveIcon
      metadata={
        <Stack
          component="span"
          direction="row"
          alignItems="center"
          gap={0.75}
          flexWrap="wrap"
          useFlexGap
        >
          <Typography component="span" variant="body2" color="primary.light">
            {t('gameModifiers.costLabel', { cost: definition.activationCost })}
          </Typography>
          {availability.limit != null ? (
            <StatusBadge
              component="span"
              density="compact"
              variant="outlined"
              color={availability.activationsCount >= availability.limit ? 'error' : 'default'}
              label={t('gameModifiers.limitProgressLabel', {
                count: availability.activationsCount,
                limit: availability.limit,
              })}
            />
          ) : null}
          {availability.isActive ? (
            <StatusBadge
              component="span"
              density="compact"
              variant="outlined"
              color="success"
              label={t('gameModifiers.activeTag')}
            />
          ) : null}
        </Stack>
      }
      actions={
        <ModifierActivationControl
          availability={availability}
          isBusy={isBusy}
          isPending={isPending}
          blockedReasonLabel={blockedReasonLabel}
          blockedReasonTooltip={blockedReasonTooltip}
          onActivate={onActivate}
        />
      }
    >
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>
        {definition.description}
      </Typography>
      <Stack direction="row" gap={0.5} flexWrap="wrap" useFlexGap>
        {availability.limit == null ? (
          <StatusBadge density="tight" label={t('gameModifiers.noLimit')} />
        ) : null}
        <StatusBadge
          density="tight"
          label={t(`gameCatalog.modifiers.roundSummaryType.${roundSummaryMeta.type}`)}
        />
        {definition.behaviorV2.requiresHostMonitoring ? (
          <StatusBadge density="tight" label={t('gameModifiers.hostControlTag')} />
        ) : null}
        {conflictingModifierNames.length > 0 ? (
          <StatusBadge
            density="tight"
            color={availability.blockedReason === 'conflict_active' ? 'error' : 'warning'}
            label={t('gameModifiers.conflictsTag', { count: conflictingModifierNames.length })}
          />
        ) : null}
      </Stack>
      {conflictingModifierNames.length > 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t('gameModifiers.conflictsListLabel', { names: conflictingModifierNames.join(', ') })}
        </Typography>
      ) : null}
      {!availability.canActivate ? (
        <Typography variant="body2" color="text.secondary">
          {blockedReasonTooltip}
        </Typography>
      ) : null}
    </ModifierDetailsItem>
  )
}
