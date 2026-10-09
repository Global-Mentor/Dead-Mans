import { Box, Stack, Typography } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameModifierDefinition } from '../../../shared/api/contracts/index.ts'
import { modifierHistoryRoute } from '../../../routes/app-routes.ts'
import {
  ModifierIconTile,
  RoundBriefingPanel,
  RoundBriefingDivider,
} from '../../../shared/game-ui/index.ts'
import {
  AppButton,
  AppLinkButton,
  DetailBlock,
  InlineNotice,
  HelpTooltip,
  Metric,
  SectionDivider,
  SectionHeader,
} from '../../../shared/ui/index.ts'
import { deriveModifierRoundSummaryMeta } from '../../game-modifiers/index.ts'

export function ModifierCatalogDetails({
  modifier,
  modifiers,
  isArchived = false,
  onEdit,
  onDelete,
}: {
  modifier: GameModifierDefinition
  modifiers: readonly GameModifierDefinition[]
  isArchived?: boolean
  onEdit: (modifier: GameModifierDefinition) => void
  onDelete: (modifier: GameModifierDefinition) => void
}) {
  const { t, i18n } = useTranslation()
  const [deleteHelpId, setDeleteHelpId] = useState<string | null>(null)
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
        {!isArchived ? (
          <AppButton tone="primary" onClick={() => onEdit(modifier)}>
            {t(
              modifier.isLockedByActiveGame
                ? 'gameCatalog.actions.view'
                : 'gameCatalog.actions.edit',
            )}
          </AppButton>
        ) : null}
        <AppLinkButton
          tone="secondary"
          to={`${modifierHistoryRoute.fullPath}?modifierId=${modifier.id}`}
        >
          {t('gameCatalog.actions.history')}
        </AppLinkButton>
        {!isArchived ? (
          <HelpTooltip
            open={modifier.isLockedByActiveGame && deleteHelpId === modifier.id}
            onOpen={() => setDeleteHelpId(modifier.id)}
            onClose={() => setDeleteHelpId(null)}
            title={
              modifier.isLockedByActiveGame ? t('gameCatalog.modifiers.contentLockedReason') : ''
            }
            describeChild
            arrow
          >
            <Box
              component="span"
              tabIndex={modifier.isLockedByActiveGame ? 0 : undefined}
              onTouchStart={() => {
                if (modifier.isLockedByActiveGame) setDeleteHelpId(modifier.id)
              }}
              aria-label={
                modifier.isLockedByActiveGame ? t('gameCatalog.actions.delete') : undefined
              }
              sx={{ display: 'inline-flex' }}
            >
              <AppButton
                tone="danger"
                disabled={modifier.isLockedByActiveGame}
                onClick={() => onDelete(modifier)}
              >
                {t('gameCatalog.actions.delete')}
              </AppButton>
            </Box>
          </HelpTooltip>
        ) : null}
      </Stack>
      {isArchived ? (
        <InlineNotice severity="info">
          {t('gameCatalog.modifiers.catalog.archivedReason')}
        </InlineNotice>
      ) : null}
      <RoundBriefingPanel
        component="section"
        aria-label={t('gameCatalog.modifiers.catalog.activationTitle')}
        sx={{ px: 1.5, py: 0.75 }}
      >
        <Box
          sx={{
            display: 'grid',
            columnGap: 1,
            rowGap: 0.75,
            gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
          }}
        >
          <Metric
            appearance="summary"
            density="compact"
            emphasis="label"
            label={t('gameCatalog.modifiers.fields.activationCost')}
            value={number(modifier.activationCost)}
          />
          <SectionDivider orientation="vertical" flexItem />
          <Metric
            appearance="summary"
            density="compact"
            emphasis="label"
            label={t('gameCatalog.modifiers.fields.activationLimitCount')}
            value={limit == null ? t('gameCatalog.modifiers.unlimited') : number(limit)}
          />
          <RoundBriefingDivider sx={{ gridColumn: '1 / -1' }} />
          <Box sx={{ gridColumn: '1 / -1', minWidth: 0 }}>
            <Metric
              appearance="summary"
              density="compact"
              emphasis="label"
              label={t('gameCatalog.modifiers.fields.conflicts')}
              value={
                conflicts.length
                  ? conflicts.join(', ')
                  : t('gameCatalog.modifiers.catalog.noConflicts')
              }
            />
          </Box>
        </Box>
      </RoundBriefingPanel>
      <DetailBlock>
        <Typography component="h3" variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>
          {t('gameCatalog.modifiers.catalog.fullDescription')}
        </Typography>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
          {modifier.description}
        </Typography>
      </DetailBlock>
      <Stack component="section" gap={1} sx={{ mt: 1 }}>
        <SectionHeader
          headingLevel="h3"
          textAlign="center"
          headingSize="small"
          title={t('gameCatalog.modifiers.catalog.behaviorTitle')}
        />
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
      </Stack>
    </Stack>
  )
}
