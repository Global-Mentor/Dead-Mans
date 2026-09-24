import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type {
  GameModifierActivation,
  GameModifierDefinition,
} from '../../../shared/api/contracts/index.ts'
import {
  AppButton,
  ContentList,
  FormSection,
  ItemCard,
  StatusBadge,
} from '../../../shared/ui/index.ts'
import { groupActiveGameModifiers } from '../model/game-modifier-groups.ts'
import { deriveModifierRoundSummaryMeta } from '../model/modifier-round-summary.ts'
import { getCategoryLabel } from './modifier-category.ts'
import { ModifierCountBadge, ModifierIcon } from './modifier-list-primitives.tsx'

type ActiveModifierGroup = ReturnType<typeof groupActiveGameModifiers>[number]

interface ActiveModifiersSectionProps {
  groups: ActiveModifierGroup[]
  activationsCount: number
  definitionsById: ReadonlyMap<string, GameModifierDefinition>
  currentUserId: string | null
  canSelfCancel: boolean
  isCancelling: boolean
  hasSearch: boolean
  onSelfCancel: (activation: GameModifierActivation) => void
}

export function ActiveModifiersSection({
  groups,
  activationsCount,
  definitionsById,
  currentUserId,
  canSelfCancel,
  isCancelling,
  hasSearch,
  onSelfCancel,
}: ActiveModifiersSectionProps) {
  const { t } = useTranslation()
  return (
    <FormSection
      data-testid="active-modifiers-section"
      title={t('gameModifiers.activeTitle')}
      action={<ModifierCountBadge count={activationsCount} />}
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
          {hasSearch ? t('common.modifiers.emptySearch') : t('gameModifiers.activeEmpty')}
        </Typography>
      ) : (
        <ContentList disablePadding component="ul" sx={{ p: 0.75 }}>
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
        </ContentList>
      )}
    </FormSection>
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
    <ItemCard component="li" sx={{ listStyle: 'none', overflowWrap: 'anywhere' }}>
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <ModifierIcon emoji={definition?.iconEmoji} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: 0.35, sm: 0.8 }}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            flexWrap="wrap"
            useFlexGap
          >
            <Typography variant="subtitle2">{group.modifierName}</Typography>
            <StatusBadge label={t('gameModifiers.activeTag')} color="success" />
          </Stack>

          {definition?.description ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
              {definition.description}
            </Typography>
          ) : null}

          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.65 }}>
            <StatusBadge
              label={t('gameModifiers.activeGroupCount', { count: group.activationsCount })}
            />
            <StatusBadge
              label={t('gameModifiers.costShortLabel', { cost: group.activationCost })}
              color="warning"
            />
            {definition ? <StatusBadge label={getCategoryLabel(t, definition.category)} /> : null}
            {definition ? (
              <StatusBadge
                label={t(
                  `gameCatalog.modifiers.roundSummaryType.${
                    deriveModifierRoundSummaryMeta(definition).type
                  }`,
                )}
              />
            ) : null}
          </Stack>

          <ItemCard sx={{ mt: 0.7 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 750 }}>
              {t('gameModifiers.activatorsLabel')}
            </Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.4 }}>
              {group.activators.map((activator) => (
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
          </ItemCard>

          {canSelfCancel && ownActivations.length > 0 ? (
            <Stack spacing={0.5} sx={{ mt: 0.75 }}>
              {ownActivations.map((item) => (
                <AppButton
                  key={item.activationId}
                  tone="dangerSecondary"
                  size="small"
                  disabled={isCancelling}
                  onClick={() => onSelfCancel(item)}
                >
                  {t('gameModifiers.selfCancelActionWithCost', { cost: item.activationCost })}
                </AppButton>
              ))}
            </Stack>
          ) : null}
        </Box>
      </Stack>
    </ItemCard>
  )
}
