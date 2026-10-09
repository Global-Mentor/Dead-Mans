import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type {
  GameModifierActivation,
  GameModifierDefinition,
} from '../../../shared/api/contracts/index.ts'
import {
  ModifierCatalogRow,
  ModifierCatalogGroup,
  ModifierDescriptionBlock,
  ModifierConflictNotice,
  ModifierActivatorsBlock,
} from '../../../shared/game-ui/index.ts'
import { AppButton, HelpTooltip, ListPanel, StatusBadge } from '../../../shared/ui/index.ts'
import { groupActiveGameModifiers } from '../model/game-modifier-groups.ts'
import { getCategoryLabel } from './modifier-category.ts'
import { modifierCategoryCodes } from '../model/modifier-categories.ts'

type ActiveModifierGroup = ReturnType<typeof groupActiveGameModifiers>[number]

interface ActiveModifiersSectionProps {
  groups: ActiveModifierGroup[]
  activationsCount: number
  definitionsById: ReadonlyMap<string, GameModifierDefinition>
  currentUserId: string | null
  canSelfCancel: boolean
  isCancelling: boolean
  onSelfCancel: (activation: GameModifierActivation) => void
}

export function ActiveModifiersSection({
  groups,
  activationsCount,
  definitionsById,
  currentUserId,
  canSelfCancel,
  isCancelling,
  onSelfCancel,
}: ActiveModifiersSectionProps) {
  const { t } = useTranslation()
  const modifierNamesById = new Map(
    [...definitionsById].map(([id, definition]) => [id, definition.name]),
  )
  for (const group of groups) modifierNamesById.set(group.modifierId, group.modifierName)
  const activeModifierIds = new Set(groups.map((group) => group.modifierId))
  return (
    <ListPanel
      data-testid="active-modifiers-section"
      title={t('gameModifiers.activeTitle')}
      textAlign="center"
      headerMinHeight="var(--modifier-panel-header-height)"
      summary={
        <StatusBadge
          density="compact"
          label={t('gameModifiers.categoryCountLabel', { count: activationsCount })}
        />
      }
      sx={{
        maxHeight: 'var(--modifier-panel-height)',
      }}
    >
      {groups.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t('gameModifiers.activeEmpty')}
        </Typography>
      ) : (
        <Stack spacing={1}>
          {[...modifierCategoryCodes, null].map((category) => {
            const categoryGroups = groups.filter(
              (group) => (definitionsById.get(group.modifierId)?.category ?? null) === category,
            )
            return categoryGroups.length > 0 ? (
              <ModifierCatalogGroup
                key={category ?? 'unavailable'}
                title={category ? getCategoryLabel(t, category) : t('gameModifiers.notEnabled')}
                count={categoryGroups.length}
              >
                {categoryGroups.map((group) => {
                  const definition = definitionsById.get(group.modifierId)
                  return (
                    <ActiveModifierRow
                      key={group.modifierId}
                      group={group}
                      {...(definition ? { definition } : {})}
                      currentUserId={currentUserId}
                      canSelfCancel={canSelfCancel}
                      isCancelling={isCancelling}
                      onSelfCancel={onSelfCancel}
                      modifierNamesById={modifierNamesById}
                      activeModifierIds={activeModifierIds}
                    />
                  )
                })}
              </ModifierCatalogGroup>
            ) : null
          })}
        </Stack>
      )}
    </ListPanel>
  )
}

function ActiveModifierRow({
  group,
  definition,
  currentUserId,
  canSelfCancel,
  isCancelling,
  onSelfCancel,
  modifierNamesById,
  activeModifierIds,
}: {
  group: ActiveModifierGroup
  definition?: GameModifierDefinition
  currentUserId: string | null
  canSelfCancel: boolean
  isCancelling: boolean
  onSelfCancel: (activation: GameModifierActivation) => void
  modifierNamesById: ReadonlyMap<string, string>
  activeModifierIds: ReadonlySet<string>
}) {
  const { t } = useTranslation()
  const ownActivation = currentUserId
    ? group.activations.find((item) => item.activatedByUserId === currentUserId)
    : undefined
  const cancelUnavailableReason = !canSelfCancel
    ? t('gameModifiers.blockedReasons.ordering_closed')
    : !ownActivation
      ? t('gameModifiers.selfCancelOwnOnly')
      : ''
  return (
    <ModifierCatalogRow
      name={group.modifierName}
      cost={group.activationCost}
      limit={definition?.activationLimit?.count}
      activationsCount={group.activationsCount}
      showActivationsCount
      isActive
      emoji={definition?.iconEmoji}
      actions={
        <HelpTooltip title={cancelUnavailableReason} arrow describeChild enterTouchDelay={0}>
          <Box
            component="span"
            tabIndex={cancelUnavailableReason ? 0 : undefined}
            sx={{ display: 'block', width: 144, flexShrink: 0 }}
          >
            <AppButton
              tone="dangerSecondary"
              size="small"
              fullWidth
              disabled={isCancelling || !canSelfCancel || !ownActivation}
              aria-label={`${t('gameModifiers.selfCancelCompactAction')}: ${group.modifierName}`}
              onClick={() => {
                if (canSelfCancel && ownActivation) onSelfCancel(ownActivation)
              }}
            >
              {t('gameModifiers.selfCancelShortAction')}
            </AppButton>
          </Box>
        </HelpTooltip>
      }
    >
      {definition?.description ? (
        <ModifierDescriptionBlock description={definition.description} />
      ) : null}
      <ModifierConflictNotice
        conflicts={(definition?.conflictingModifierIds ?? []).map((id) => ({
          id,
          name: modifierNamesById.get(id) ?? id,
          isActive: activeModifierIds.has(id),
        }))}
      />
      <ModifierActivatorsBlock
        names={group.activators.map((activator) =>
          activator.activationsCount > 1
            ? t('gameModifiers.activeGroupActivatorWithCount', {
                player: activator.displayName,
                count: activator.activationsCount,
              })
            : activator.displayName,
        )}
      />
    </ModifierCatalogRow>
  )
}
