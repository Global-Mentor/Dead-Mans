import { Stack } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { GameModifierDefinition } from '../../../shared/api/contracts/index.ts'
import { ModifierConflictNotice, ModifierDescriptionBlock } from '../../../shared/game-ui/index.ts'
import { AppButton, AppDialog, Metric, StatusBadge } from '../../../shared/ui/index.ts'

interface Props {
  modifier: GameModifierDefinition | null
  catalog: readonly GameModifierDefinition[]
  onClose: () => void
}

export function GameSetupModifierPreview({ modifier, catalog, onClose }: Props) {
  const { t } = useTranslation()
  return (
    <AppDialog
      open={modifier !== null}
      title={modifier?.name ?? ''}
      onClose={onClose}
      actions={
        <AppButton tone="secondary" onClick={onClose}>
          {t('common.actions.close')}
        </AppButton>
      }
    >
      {modifier ? (
        <Stack spacing={1.5}>
          <Stack spacing={0}>
            <Metric
              appearance="row"
              density="compact"
              label={t('gameCatalog.modifiers.fields.category')}
              value={t(`common.modifiers.categories.${modifier.category}`)}
            />
            <Metric
              appearance="row"
              density="compact"
              label={t('gameCatalog.modifiers.fields.activationCost')}
              value={modifier.activationCost}
            />
            <Metric
              appearance="row"
              density="compact"
              label={t('gameCatalog.modifiers.fields.activationLimitCount')}
              value={modifier.activationLimit.count}
            />
          </Stack>
          <ModifierDescriptionBlock description={modifier.description} />
          {modifier.behaviorV2.requiresHostMonitoring ? (
            <StatusBadge color="warning" label={t('gameCatalog.modifiers.hostControlBadge')} />
          ) : null}
          <ModifierConflictNotice
            conflicts={modifier.conflictingModifierIds.map((id) => ({
              id,
              name: catalog.find((item) => item.id === id)?.name ?? id,
              isActive: false,
            }))}
          />
        </Stack>
      ) : null}
    </AppDialog>
  )
}
