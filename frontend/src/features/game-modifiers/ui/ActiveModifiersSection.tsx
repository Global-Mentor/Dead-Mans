import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type {
  GameModifierActivation,
  GameModifierDefinition,
} from '../../../shared/api/contracts/index.ts'
import { ModifierDetailsItem, ModifierDetailsList } from '../../../shared/game-ui/index.ts'
import { AppButton, ListPanel, StatusBadge } from '../../../shared/ui/index.ts'
import { groupActiveGameModifiers } from '../model/game-modifier-groups.ts'
import { deriveModifierRoundSummaryMeta } from '../model/modifier-round-summary.ts'
import { getCategoryLabel } from './modifier-category.ts'

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
  return (
    <ListPanel
      data-testid="active-modifiers-section"
      title={t('gameModifiers.activeTitle')}
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
        <ModifierDetailsList count={groups.length} layout="fit">
          {groups.map((group) => {
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
              />
            )
          })}
        </ModifierDetailsList>
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
}: {
  group: ActiveModifierGroup
  definition?: GameModifierDefinition
  currentUserId: string | null
  canSelfCancel: boolean
  isCancelling: boolean
  onSelfCancel: (activation: GameModifierActivation) => void
}) {
  const { t } = useTranslation()
  const ownActivations = currentUserId
    ? group.activations.filter((item) => item.activatedByUserId === currentUserId)
    : []
  return (
    <ModifierDetailsItem
      title={group.modifierName}
      emoji={definition?.iconEmoji}
      reserveIcon
      effect={
        group.activationsCount > 1 ? (
          <StatusBadge
            component="span"
            emphasis="strong"
            label={t('gameModifiers.activeStackMultiplier', { count: group.activationsCount })}
            aria-label={t('gameModifiers.activeGroupCount', { count: group.activationsCount })}
          />
        ) : null
      }
      metadata={
        <Stack component="span" gap={0.25}>
          <Typography component="span" variant="caption" color="text.secondary">
            {t('gameModifiers.activeGroupSpent', {
              cost: group.activations.reduce((total, item) => total + item.activationCost, 0),
            })}
          </Typography>
          <Typography component="span" variant="caption" color="text.secondary">
            {t('gameModifiers.activatorsLabel')}:{' '}
            {group.activators
              .map((activator) =>
                activator.activationsCount > 1
                  ? t('gameModifiers.activeGroupActivatorWithCount', {
                      player: activator.displayName,
                      count: activator.activationsCount,
                    })
                  : activator.displayName,
              )
              .join(', ')}
          </Typography>
        </Stack>
      }
      actions={
        canSelfCancel && ownActivations.length > 0 ? (
          <Stack spacing={0.5}>
            {ownActivations.map((item) => (
              <AppButton
                key={item.activationId}
                tone="dangerSecondary"
                size="small"
                disabled={isCancelling}
                aria-label={`${t('gameModifiers.selfCancelCompactAction', { cost: item.activationCost })}: ${group.modifierName}`}
                onClick={() => onSelfCancel(item)}
              >
                {t('gameModifiers.selfCancelCompactAction', { cost: item.activationCost })}
              </AppButton>
            ))}
          </Stack>
        ) : null
      }
    >
      {definition?.description ? (
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>
          {definition.description}
        </Typography>
      ) : null}
      {definition ? (
        <Stack direction="row" gap={0.5} flexWrap="wrap" useFlexGap>
          <StatusBadge density="tight" label={getCategoryLabel(t, definition.category)} />
          <StatusBadge
            density="tight"
            label={t(
              `gameCatalog.modifiers.roundSummaryType.${deriveModifierRoundSummaryMeta(definition).type}`,
            )}
          />
        </Stack>
      ) : null}
      <Box>
        <Typography variant="caption" color="text.secondary">
          {t('gameModifiers.activatorsLabel')}
        </Typography>
        <Stack component="ul" spacing={0.5} sx={{ mt: 0.5, mb: 0, pl: 2 }}>
          {group.activators.map((activator) => (
            <Typography key={activator.userId} component="li" variant="body2">
              {activator.activationsCount > 1
                ? t('gameModifiers.activeGroupActivatorWithCount', {
                    player: activator.displayName,
                    count: activator.activationsCount,
                  })
                : activator.displayName}
            </Typography>
          ))}
        </Stack>
      </Box>
    </ModifierDetailsItem>
  )
}
