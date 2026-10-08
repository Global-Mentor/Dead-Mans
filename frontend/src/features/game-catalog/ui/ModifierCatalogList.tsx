import { Box, Stack, Typography } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameModifierDefinition } from '../../../shared/api/contracts/index.ts'
import { modifierHistoryRoute } from '../../../routes/app-routes.ts'
import { ModifierDescriptionBlock, ModifierConflictNotice } from '../../../shared/game-ui/index.ts'
import {
  AppButton,
  AppLinkButton,
  AppDialog,
  AsyncSection,
  HelpTooltip,
  Metric,
  RecordRow,
  SectionCard,
  StatusBadge,
  SurfaceButton,
} from '../../../shared/ui/index.ts'
import { deriveModifierRoundSummaryMeta } from '../../game-modifiers/index.ts'

export function ModifierCatalogList({
  modifiers,
  catalog,
  isLoading,
  isError,
  onRetry,
  onEdit,
  onDelete,
  onReset,
}: {
  modifiers: GameModifierDefinition[]
  catalog: GameModifierDefinition[]
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  onEdit: (modifier: GameModifierDefinition) => void
  onDelete: (modifier: GameModifierDefinition) => void
  onReset: () => void
}) {
  const { t } = useTranslation()
  const [preview, setPreview] = useState<GameModifierDefinition | null>(null)
  return (
    <SectionCard
      sx={{ flex: '1 1 0%', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}
    >
      <Typography variant="body2" color="text.secondary" role="status">
        {t('gameCatalog.workspace.results', { count: modifiers.length, total: catalog.length })}
      </Typography>
      <Box
        role="region"
        aria-label={t('gameCatalog.modifiers.title')}
        tabIndex={0}
        sx={{
          flex: '1 1 0%',
          minHeight: 0,
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          scrollbarWidth: 'thin',
          scrollbarGutter: 'stable both-edges',
        }}
      >
        <AsyncSection
          isLoading={isLoading}
          isError={isError}
          hasData={catalog.length > 0}
          isEmpty={modifiers.length === 0}
          loadingMessage={t('gameCatalog.modifiers.loading')}
          errorMessage={t('gameCatalog.modifiers.error')}
          emptyMessage={t('gameCatalog.modifiers.empty')}
        >
          <Stack gap={0.75}>
            {modifiers.map((modifier) => (
              <RecordRow
                key={modifier.id}
                actions={
                  <>
                    <AppLinkButton
                      to={modifierHistoryRoute.fullPath + '?modifierId=' + modifier.id}
                      size="small"
                      tone="ghost"
                    >
                      {t('gameCatalog.actions.history')}
                    </AppLinkButton>
                    <AppButton size="small" tone="secondary" onClick={() => onEdit(modifier)}>
                      {t(
                        modifier.isLockedByActiveGame
                          ? 'gameCatalog.actions.view'
                          : 'gameCatalog.actions.edit',
                      )}
                    </AppButton>
                    <HelpTooltip
                      title={
                        modifier.isLockedByActiveGame
                          ? t('gameCatalog.modifiers.contentLockedBadge')
                          : ''
                      }
                      disableInteractive
                      describeChild
                    >
                      <span tabIndex={modifier.isLockedByActiveGame ? 0 : undefined}>
                        <AppButton
                          size="small"
                          tone="danger"
                          disabled={modifier.isLockedByActiveGame}
                          onClick={() => onDelete(modifier)}
                        >
                          {t('gameCatalog.actions.delete')}
                        </AppButton>
                      </span>
                    </HelpTooltip>
                  </>
                }
              >
                <SurfaceButton
                  sx={{ display: 'block', width: '100%', textAlign: 'left' }}
                  onClick={() => setPreview(modifier)}
                  aria-label={t('gameCatalog.workspace.previewItem', { name: modifier.name })}
                >
                  <Typography variant="body2" fontWeight={700}>
                    {modifier.iconEmoji ? modifier.iconEmoji + ' ' : ''}
                    {modifier.name}
                  </Typography>
                </SurfaceButton>
                <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center" sx={{ mt: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    {t(`common.modifiers.categories.${modifier.category}`)} ·{' '}
                    {t('gameCatalog.modifiers.fields.activationCost')}: {modifier.activationCost} ·{' '}
                    {t(
                      `gameCatalog.modifiers.roundSummaryType.${deriveModifierRoundSummaryMeta(modifier).type}`,
                    )}
                  </Typography>
                  {modifier.isLockedByActiveGame ? (
                    <StatusBadge
                      size="small"
                      color="warning"
                      label={t('gameCatalog.modifiers.contentLockedBadge')}
                    />
                  ) : null}
                </Stack>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mt: 0.5,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {modifier.description}
                </Typography>
              </RecordRow>
            ))}
          </Stack>
        </AsyncSection>
        {isError ? (
          <AppButton tone="secondary" onClick={onRetry}>
            {t('gameCatalog.workspace.retry')}
          </AppButton>
        ) : null}
        {!modifiers.length && catalog.length > 0 ? (
          <AppButton tone="ghost" onClick={onReset}>
            {t('gameCatalog.workspace.reset')}
          </AppButton>
        ) : null}
      </Box>
      <AppDialog
        open={preview !== null}
        title={preview?.name ?? ''}
        onClose={() => setPreview(null)}
        actions={
          <AppButton tone="secondary" onClick={() => setPreview(null)}>
            {t('common.actions.close')}
          </AppButton>
        }
      >
        {preview ? (
          <Stack gap={1.5}>
            <ModifierDescriptionBlock description={preview.description} />
            <Metric
              appearance="row"
              density="compact"
              label={t('gameCatalog.modifiers.fields.category')}
              value={t(`common.modifiers.categories.${preview.category}`)}
            />
            <Metric
              appearance="row"
              density="compact"
              label={t('gameCatalog.modifiers.fields.activationCost')}
              value={preview.activationCost}
            />
            <Metric
              appearance="row"
              density="compact"
              label={t('gameCatalog.modifiers.fields.activationLimitCount')}
              value={preview.activationLimit.count}
            />
            <StatusBadge
              label={t(`gameCatalog.modifiers.wizard.kinds.${preview.behaviorV2.kind}`)}
            />
            {preview.behaviorV2.requiresHostMonitoring ? (
              <StatusBadge color="warning" label={t('gameCatalog.modifiers.hostControlBadge')} />
            ) : null}
            <ModifierConflictNotice
              conflicts={preview.conflictingModifierIds.map((id) => ({
                id,
                name: catalog.find((item) => item.id === id)?.name ?? id,
                isActive: false,
              }))}
            />
          </Stack>
        ) : null}
      </AppDialog>
    </SectionCard>
  )
}
