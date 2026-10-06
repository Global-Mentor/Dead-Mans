import { Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameModifierAvailability } from '../../../shared/api/contracts/index.ts'
import {
  ModifierCatalogGroup,
  ModifierCatalogRow,
  ModifierConflictNotice,
  ModifierDescriptionBlock,
  type ModifierConflict,
} from '../../../shared/game-ui/index.ts'
import { ListPanel } from '../../../shared/ui/index.ts'
import { groupAvailableGameModifiers } from '../model/game-modifier-groups.ts'
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

  return (
    <ListPanel
      data-testid="available-modifiers-section"
      title={t('gameModifiers.availableTitle')}
      showHeader={false}
      headerMinHeight="var(--modifier-panel-header-height)"
      tools={tools}
      sx={{
        maxHeight: 'var(--modifier-panel-height)',
      }}
    >
      {groups.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {hasSearch ? t('common.modifiers.emptySearch') : t('gameModifiers.availableEmpty')}
        </Typography>
      ) : (
        <Stack spacing={1}>
          {groups.map((group) => (
            <ModifierCatalogGroup
              key={group.category}
              title={getCategoryLabel(t, group.category)}
              count={group.items.length}
            >
              {group.items.map((availability) => (
                <AvailableModifierRow
                  key={availability.modifier.id}
                  availability={availability}
                  isBusy={isBusy}
                  isPending={pendingModifierId === availability.modifier.id}
                  onActivate={onActivate}
                  conflicts={availability.modifier.conflictingModifierIds.map((id) => ({
                    id,
                    name: modifierNamesById.get(id) ?? id,
                    isActive: activeModifierIds.has(id),
                  }))}
                />
              ))}
            </ModifierCatalogGroup>
          ))}
        </Stack>
      )}
    </ListPanel>
  )
}

interface AvailableModifierRowProps {
  availability: GameModifierAvailability
  isBusy: boolean
  isPending: boolean
  conflicts: readonly ModifierConflict[]
  onActivate: (modifierId: string) => void
}

function AvailableModifierRow({
  availability,
  isBusy,
  isPending,
  conflicts,
  onActivate,
}: AvailableModifierRowProps) {
  const { t } = useTranslation()
  const definition = availability.modifier
  const activeConflictingModifierNames = conflicts
    .filter((item) => item.isActive)
    .map((item) => item.name)
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
    <ModifierCatalogRow
      name={definition.name}
      emoji={definition.iconEmoji}
      cost={definition.activationCost}
      limit={availability.limit}
      activationsCount={availability.activationsCount}
      isActive={availability.isActive}
      actions={
        <ModifierActivationControl
          compact
          activationAriaLabel={t('gameModifiers.activationLabel', { modifier: definition.name })}
          availability={availability}
          isBusy={isBusy}
          isPending={isPending}
          blockedReasonLabel={blockedReasonLabel}
          blockedReasonTooltip={blockedReasonTooltip}
          onActivate={onActivate}
        />
      }
    >
      <ModifierDescriptionBlock description={definition.description} />
      <ModifierConflictNotice conflicts={conflicts} />
      {!availability.canActivate &&
      availability.blockedReason !== 'conflict_active' &&
      availability.blockedReason !== 'limit_reached' ? (
        <Typography variant="body2" color="text.secondary">
          {blockedReasonTooltip}
        </Typography>
      ) : null}
    </ModifierCatalogRow>
  )
}
