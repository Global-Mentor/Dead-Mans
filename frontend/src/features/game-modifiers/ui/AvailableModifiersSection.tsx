import { Box, Collapse, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameModifierAvailability } from '../../../shared/api/contracts/index.ts'
import {
  AppButton,
  ContentList,
  FormSection,
  ItemCard,
  StatusBadge,
} from '../../../shared/ui/index.ts'
import { groupAvailableGameModifiers } from '../model/game-modifier-groups.ts'
import { deriveModifierRoundSummaryMeta } from '../model/modifier-round-summary.ts'
import { getCategoryLabel } from './modifier-category.ts'
import {
  ModifierCategorySection,
  ModifierCountBadge,
  ModifierIcon,
} from './modifier-list-primitives.tsx'
import { ModifierActivationControl } from './ModifierActivationControl.tsx'

type AvailableModifierGroup = ReturnType<typeof groupAvailableGameModifiers>[number]

interface AvailableModifiersSectionProps {
  groups: AvailableModifierGroup[]
  modifierNamesById: ReadonlyMap<string, string>
  activeModifierIds: ReadonlySet<string>
  hasSearch: boolean
  isBusy: boolean
  pendingModifierId: string | null
  onActivate: (modifierId: string) => void
}

export function AvailableModifiersSection({
  groups,
  modifierNamesById,
  activeModifierIds,
  hasSearch,
  isBusy,
  pendingModifierId,
  onActivate,
}: AvailableModifiersSectionProps) {
  const { t } = useTranslation()

  return (
    <FormSection
      data-testid="available-modifiers-section"
      title={t('gameModifiers.availableTitle')}
      action={
        <ModifierCountBadge
          count={groups.reduce((total, group) => total + group.items.length, 0)}
        />
      }
      sx={{
        overflow: 'hidden',
        '@media (min-width: 1000px) and (min-height: 680px)': {
          maxHeight: 'var(--modifier-panel-height)',
          overflowY: 'auto',
          overscrollBehaviorY: 'contain',
          scrollbarGutter: 'stable',
        },
      }}
    >
      {groups.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ px: 1.35, py: 1.5 }}>
          {hasSearch ? t('common.modifiers.emptySearch') : t('gameModifiers.availableEmpty')}
        </Typography>
      ) : (
        <Stack spacing={0.75} sx={{ p: 0.75 }}>
          {groups.map((group) => (
            <ModifierCategorySection key={group.category} category={group.category}>
              <Stack spacing={0.35}>
                <Stack
                  direction="row"
                  spacing={0.8}
                  justifyContent="space-between"
                  alignItems="center"
                  flexWrap="wrap"
                  useFlexGap
                >
                  <Typography component="h3" variant="subtitle2" sx={{ fontWeight: 850 }}>
                    {getCategoryLabel(t, group.category)}
                  </Typography>
                  <ModifierCountBadge count={group.items.length} />
                </Stack>

                <ContentList disablePadding component="ul">
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
                </ContentList>
              </Stack>
            </ModifierCategorySection>
          ))}
        </Stack>
      )}
    </FormSection>
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
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const definition = availability.modifier
  const roundSummaryMeta = deriveModifierRoundSummaryMeta(definition)
  const hasLimit = availability.limit != null
  const limitReached = hasLimit && availability.activationsCount >= (availability.limit ?? 0)
  const hasConflicts = definition.conflictingModifierIds.length > 0
  const detailsId = `modifier-details-${definition.id}`
  const blockedReasonLabel =
    availability.blockedReason != null
      ? t(`gameModifiers.blockedReasonLabels.${availability.blockedReason}`)
      : t('gameModifiers.unavailableAction')
  const blockedReasonTooltip =
    availability.blockedReason === 'conflict_active' && activeConflictingModifierNames.length > 0
      ? t('gameModifiers.blockedByConflicts', {
          names: activeConflictingModifierNames.join(', '),
        })
      : availability.blockedReason != null
        ? t(`gameModifiers.blockedReasons.${availability.blockedReason}`)
        : t('gameModifiers.unavailableAction')

  return (
    <ItemCard component="li" sx={{ listStyle: 'none', overflowWrap: 'anywhere' }}>
      <Stack spacing={0.65}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={0.8}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', sm: 'flex-start' }}
        >
          <Stack direction="row" spacing={0.9} sx={{ minWidth: 0, flex: 1 }}>
            <ModifierIcon emoji={definition.iconEmoji} />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Stack direction="row" spacing={0.6} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography variant="subtitle2">{definition.name}</Typography>
                <StatusBadge
                  color="warning"
                  label={t('gameModifiers.costLabel', { cost: definition.activationCost })}
                />
              </Stack>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mt: 0.35,
                  ...(isDetailsOpen
                    ? {}
                    : {
                        display: '-webkit-box',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 2,
                        overflow: 'hidden',
                      }),
                }}
              >
                {definition.description}
              </Typography>
            </Box>
          </Stack>

          <ModifierActivationControl
            availability={availability}
            isBusy={isBusy}
            isPending={isPending}
            blockedReasonLabel={blockedReasonLabel}
            blockedReasonTooltip={blockedReasonTooltip}
            onActivate={onActivate}
          />
        </Stack>

        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap alignItems="center">
          <StatusBadge
            color={limitReached ? 'error' : 'default'}
            label={
              hasLimit
                ? t('gameModifiers.limitProgressLabel', {
                    count: availability.activationsCount,
                    limit: availability.limit,
                  })
                : t('gameModifiers.noLimit')
            }
          />
          {availability.isActive ? (
            <StatusBadge label={t('gameModifiers.activeTag')} color="success" />
          ) : null}
          <AppButton
            tone="ghost"
            size="small"
            aria-expanded={isDetailsOpen}
            aria-controls={detailsId}
            onClick={() => setIsDetailsOpen((current) => !current)}
          >
            {isDetailsOpen
              ? t('gameModifiers.hideDetailsAction')
              : t('gameModifiers.detailsAction')}
          </AppButton>
        </Stack>

        <Collapse in={isDetailsOpen} timeout="auto" unmountOnExit>
          <Stack
            id={detailsId}
            spacing={0.55}
            sx={(theme) => ({
              borderLeft: `2px solid ${alpha(theme.palette.primary.main, 0.44)}`,
              pl: 1,
              pt: 0.3,
            })}
          >
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              <StatusBadge
                label={t(`gameCatalog.modifiers.roundSummaryType.${roundSummaryMeta.type}`)}
              />
              {definition.behaviorV2.requiresHostMonitoring ? (
                <StatusBadge label={t('gameModifiers.hostControlTag')} />
              ) : null}
              {hasConflicts ? (
                <StatusBadge
                  color={availability.blockedReason === 'conflict_active' ? 'error' : 'warning'}
                  label={t('gameModifiers.conflictsTag', {
                    count: definition.conflictingModifierIds.length,
                  })}
                />
              ) : null}
            </Stack>
            {conflictingModifierNames.length > 0 ? (
              <Typography variant="body2" color="text.secondary">
                {t('gameModifiers.conflictsListLabel', {
                  names: conflictingModifierNames.join(', '),
                })}
              </Typography>
            ) : null}
          </Stack>
        </Collapse>
      </Stack>
    </ItemCard>
  )
}
