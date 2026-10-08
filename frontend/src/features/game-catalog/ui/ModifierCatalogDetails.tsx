import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { GameModifierDefinition } from '../../../shared/api/contracts/index.ts'
import { modifierHistoryRoute } from '../../../routes/app-routes.ts'
import { ModifierIconTile } from '../../../shared/game-ui/index.ts'
import {
  AppButton,
  AppLinkButton,
  DetailBlock,
  InlineNotice,
  Metric,
  SectionDivider,
  StatusBadge,
} from '../../../shared/ui/index.ts'
import { deriveModifierRoundSummaryMeta } from '../../game-modifiers/index.ts'

export function ModifierCatalogDetails({
  modifier,
  modifiers,
  onEdit,
  onDelete,
}: {
  modifier: GameModifierDefinition
  modifiers: readonly GameModifierDefinition[]
  onEdit: (modifier: GameModifierDefinition) => void
  onDelete: (modifier: GameModifierDefinition) => void
}) {
  const { t, i18n } = useTranslation()
  const number = (value: number) => new Intl.NumberFormat(i18n.resolvedLanguage).format(value)
  const limit = modifier.activationLimit.count
  const summary = deriveModifierRoundSummaryMeta(modifier)
  const conflicts = modifier.conflictingModifierIds.map(
    (id) => modifiers.find((item) => item.id === id)?.name ?? id,
  )
  return (
    <Stack
      gap={1.5}
      data-testid="modifier-catalog-details"
      sx={{ minWidth: 0, overflowWrap: 'anywhere' }}
    >
      <Stack direction="row" gap={1.25} alignItems="center">
        <ModifierIconTile emoji={modifier.iconEmoji} size="large" />
        <Box sx={{ minWidth: 0 }}>
          <Typography component="h2" variant="h5">
            {modifier.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t(`common.modifiers.categories.${modifier.category}`)}
          </Typography>
        </Box>
      </Stack>
      <Stack direction="row" gap={1} flexWrap="wrap">
        <AppButton tone="primary" onClick={() => onEdit(modifier)}>
          {t(
            modifier.isLockedByActiveGame ? 'gameCatalog.actions.view' : 'gameCatalog.actions.edit',
          )}
        </AppButton>
        <AppLinkButton
          tone="secondary"
          to={`${modifierHistoryRoute.fullPath}?modifierId=${modifier.id}`}
        >
          {t('gameCatalog.actions.history')}
        </AppLinkButton>
      </Stack>
      {modifier.isLockedByActiveGame ? (
        <InlineNotice severity="warning" appearance="inline">
          {t('gameCatalog.modifiers.contentLockedReason')}
        </InlineNotice>
      ) : null}
      <SectionDivider />
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
        {modifier.description}
      </Typography>
      {modifier.normalizedTags.length > 0 ? (
        <Stack direction="row" gap={0.75} flexWrap="wrap">
          {modifier.normalizedTags.map((tag) => (
            <StatusBadge key={tag} size="small" label={tag} />
          ))}
        </Stack>
      ) : null}
      <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        <Metric
          appearance="summary"
          density="compact"
          label={t('gameCatalog.modifiers.fields.activationCost')}
          value={number(modifier.activationCost)}
        />
        <Metric
          appearance="summary"
          density="compact"
          label={t('gameCatalog.modifiers.fields.activationLimitCount')}
          value={limit == null ? t('gameCatalog.modifiers.unlimited') : number(limit)}
        />
      </Box>
      <DetailBlock>
        <Typography component="h3" variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>
          {t('gameCatalog.modifiers.fields.ruleText')}
        </Typography>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
          {modifier.behaviorV2.rule}
        </Typography>
      </DetailBlock>
      <Stack gap={1}>
        <Metric
          appearance="row"
          density="compact"
          label={t('gameCatalog.modifiers.roundSummaryTitle')}
          value={t(`gameCatalog.modifiers.roundSummaryType.${summary.type}`)}
        />
        <Metric
          appearance="row"
          density="compact"
          label={t('gameCatalog.modifiers.wizard.performer')}
          value={t(`gameCatalog.modifiers.wizard.performers.${modifier.behaviorV2.performer}`)}
        />
        <Metric
          appearance="row"
          density="compact"
          label={t('gameCatalog.modifiers.fields.requiresHostControl')}
          value={t(
            modifier.behaviorV2.requiresHostMonitoring
              ? 'gameCatalog.common.yes'
              : 'gameCatalog.common.no',
          )}
        />
        {modifier.activationCommand ? (
          <Metric
            appearance="row"
            density="compact"
            label={t('gameCatalog.modifiers.fields.activationCommand')}
            value={modifier.activationCommand}
          />
        ) : null}
      </Stack>
      {conflicts.length > 0 ? (
        <DetailBlock>
          <Typography component="h3" variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>
            {t('gameCatalog.modifiers.fields.conflicts')}
          </Typography>
          <Typography variant="body2">{conflicts.join(', ')}</Typography>
        </DetailBlock>
      ) : null}
      <SectionDivider />
      <AppButton
        tone="dangerSecondary"
        disabled={modifier.isLockedByActiveGame}
        onClick={() => onDelete(modifier)}
        sx={{ alignSelf: 'start' }}
      >
        {t('gameCatalog.actions.delete')}
      </AppButton>
    </Stack>
  )
}
