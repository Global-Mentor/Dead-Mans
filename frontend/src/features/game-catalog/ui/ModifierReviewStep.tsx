import { Box, Stack, Typography } from '@mui/material'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { RoundBriefingPanel, RoundBriefingDivider } from '../../../shared/game-ui/index.ts'
import type {
  GameModifierDraftPreview,
  GameModifierDefinition,
} from '../../../shared/api/contracts/index.ts'
import {
  AppButton,
  InlineNotice,
  ItemCard,
  Metric,
  SectionDivider,
  TaskProgress,
} from '../../../shared/ui/index.ts'
export function ModifierReviewStep({
  preview,
  activationCost,
  activationLimitCount,
  conflictingModifierIds,
  modifiers,
  isLoading,
  error,
  onRetry,
}: {
  activationCost: string
  activationLimitCount: string
  conflictingModifierIds: readonly string[]
  modifiers: readonly GameModifierDefinition[]
  preview: GameModifierDraftPreview | null
  isLoading: boolean
  error: string | null
  onRetry: () => void
}) {
  const { t, i18n } = useTranslation()
  const number = (value: string) =>
    new Intl.NumberFormat(i18n.resolvedLanguage).format(Number(value))
  if (isLoading) {
    return <TaskProgress aria-label={t('gameCatalog.modifiers.wizard.previewLoading')} />
  }
  if (error || !preview) {
    return (
      <InlineNotice
        severity="error"
        action={
          <AppButton size="small" tone="secondary" onClick={onRetry}>
            {t('common.actions.retry')}
          </AppButton>
        }
      >
        {error ?? t('gameCatalog.modifiers.wizard.previewError')}
      </InlineNotice>
    )
  }
  const conflicts = conflictingModifierIds.map((id) => {
    const modifier = modifiers.find((item) => item.id === id)
    return modifier
      ? modifier.iconEmoji
        ? `${modifier.iconEmoji} ${modifier.name}`
        : modifier.name
      : id
  })
  const localizedExample = {
    ...preview.example,
    resolutionExample: formatResolutionExample(preview.example.resolutionExample, t),
  }

  return (
    <Stack spacing={1.5}>
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
            value={number(activationCost)}
          />
          <SectionDivider orientation="vertical" flexItem />
          <Metric
            appearance="summary"
            density="compact"
            emphasis="label"
            label={t('gameCatalog.modifiers.fields.activationLimitCount')}
            value={
              activationLimitCount.trim()
                ? number(activationLimitCount)
                : t('gameCatalog.modifiers.unlimited')
            }
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
      <Box
        sx={{
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
          alignItems: 'start',
          overflowWrap: 'anywhere',
        }}
      >
        <ItemCard>
          <Stack sx={{ textAlign: 'center' }}>
            <Typography component="h3" variant="overline">
              {t('gameCatalog.modifiers.wizard.playerView')}
            </Typography>
            <Typography component="div" variant="h6">
              {preview.iconEmoji ? `${preview.iconEmoji} ` : ''}
              {preview.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
              {preview.description}
            </Typography>
          </Stack>
        </ItemCard>
        <ItemCard>
          <Typography component="h3" variant="overline" textAlign="center">
            {t('gameCatalog.modifiers.wizard.hostView')}
          </Typography>
          <Stack gap={1} sx={{ mb: 1.5 }}>
            <Metric
              appearance="row"
              density="compact"
              label={t('gameCatalog.modifiers.fields.category')}
              value={t(`common.modifiers.categories.${preview.behaviorV2.phase}`)}
            />
            <Metric
              appearance="row"
              density="compact"
              label={t('gameCatalog.modifiers.wizard.performer')}
              value={t(`gameCatalog.modifiers.wizard.performers.${preview.behaviorV2.performer}`)}
            />
          </Stack>
        </ItemCard>
      </Box>
      <InlineNotice severity="success">
        <Typography variant="subtitle2">
          {t('gameCatalog.modifiers.wizard.exampleTitle')}
        </Typography>
        <Typography variant="body2">
          {t('gameCatalog.modifiers.wizard.exampleFacts', localizedExample)}
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          {t('gameCatalog.modifiers.wizard.exampleResult', preview.example)}
        </Typography>
      </InlineNotice>
    </Stack>
  )
}

function formatResolutionExample(value: string, t: TFunction) {
  return value === 'completed' ||
    value === 'automatic' ||
    value === 'succeeded' ||
    value === 'perActivation'
    ? t(`gameCatalog.modifiers.wizard.exampleResolution.${value}`)
    : value
}
