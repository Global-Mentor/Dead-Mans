import { Box, Stack, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AppButton,
  AsyncSection,
  FormTextField,
  SectionCard,
  SectionHeader,
  FormSelect,
} from '../../../shared/ui/index.ts'
import {
  deriveModifierRoundSummaryMeta,
  gameModifierCatalogQueryOptions,
  matchesModifierSearch,
  modifierCategoryCodes,
  type ModifierCategoryCode,
} from '../../game-modifiers/index.ts'
import type { GameSetupDraftState } from '../model/game-setup-draft.ts'
import { GameSetupModifierPreview } from './GameSetupModifierPreview.tsx'
import { GameSetupModifierRow } from './GameSetupModifierRow.tsx'

interface GameSetupModifiersSectionProps {
  draft: GameSetupDraftState
  onToggle: (modifierId: string, enabled: boolean) => void
  onBulkSetEnabled: (modifierIds: readonly string[], enabled: boolean) => void
  isSaving: boolean
  actions?: ReactNode
}

export function GameSetupModifiersSection({
  draft,
  onToggle,
  onBulkSetEnabled,
  isSaving,
  actions,
}: GameSetupModifiersSectionProps) {
  const { t, i18n } = useTranslation()
  const catalogQuery = useQuery(gameModifierCatalogQueryOptions)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<ModifierCategoryCode | 'all'>('all')
  const [previewId, setPreviewId] = useState<string | null>(null)
  const filteredModifiers = useMemo(
    () =>
      (catalogQuery.data ?? []).filter(
        (modifier) =>
          (category === 'all' || modifier.category === category) &&
          matchesModifierSearch(
            modifier,
            search,
            [
              t(`gameCatalog.modifiers.wizard.kinds.${modifier.behaviorV2.kind}`),
              t(
                `gameCatalog.modifiers.roundSummaryType.${deriveModifierRoundSummaryMeta(modifier).type}`,
              ),
              t(`common.modifiers.categories.${modifier.category}`),
              modifier.behaviorV2.requiresHostMonitoring
                ? t('gameCatalog.modifiers.hostControlBadge')
                : '',
            ],
            i18n.resolvedLanguage,
          ),
      ),
    [catalogQuery.data, category, search, t, i18n.resolvedLanguage],
  )
  const enabledIds = new Set(draft.enabledModifierIds)
  const visibleIds = filteredModifiers.map((modifier) => modifier.id)
  const preview = catalogQuery.data?.find((modifier) => modifier.id === previewId) ?? null
  const hasFilters = search.trim().length > 0 || category !== 'all'

  return (
    <SectionCard
      sx={{
        flex: '1 1 0%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          flexShrink: 0,
          maxHeight: '65%',
          overflowY: 'auto',
          scrollbarGutter: 'stable both-edges',
          scrollbarWidth: 'thin',
          mx: -1,
        }}
      >
        <SectionHeader
          headingLevel="h1"
          title={t('gameSetup.modifiers.title')}
          actions={
            <Stack direction="row" gap={1.5} flexWrap="wrap" alignItems="center">
              <Typography variant="body2" color="text.secondary">
                {t('gameSetup.modifiers.enabledCount', { count: draft.enabledModifierIds.length })}
              </Typography>
              {actions}
            </Stack>
          }
        />
        <Stack spacing={1.5} sx={{ mt: 1.5, p: 0.5 }}>
          <FormTextField
            density="compact"
            value={search}
            label={t('common.modifiers.searchLabel')}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            gap={1.5}
            alignItems={{ xs: 'stretch', md: 'center' }}
          >
            <FormSelect
              density="compact"
              label={t('common.entities.categories')}
              value={category}
              onChange={setCategory}
              options={[
                { value: 'all', label: t('common.filters.allCategories') },
                ...modifierCategoryCodes.map((value) => ({
                  value,
                  label: t(`common.modifiers.categories.${value}`),
                })),
              ]}
              sx={{ flex: '1 1 auto', minWidth: 0 }}
            />
            <Stack
              direction="row"
              gap={1}
              useFlexGap
              flexWrap="wrap"
              alignItems="center"
              sx={{ flexShrink: 0 }}
            >
              <AppButton
                size="small"
                tone="secondary"
                framePlacement="inset"
                disabled={isSaving || !visibleIds.some((id) => !enabledIds.has(id))}
                onClick={() => onBulkSetEnabled(visibleIds, true)}
              >
                {t('gameSetup.modifiers.enableVisible')}
              </AppButton>
              <AppButton
                size="small"
                tone="danger"
                framePlacement="inset"
                disabled={isSaving || !visibleIds.some((id) => enabledIds.has(id))}
                onClick={() => onBulkSetEnabled(visibleIds, false)}
              >
                {t('gameSetup.modifiers.disableVisible')}
              </AppButton>
            </Stack>
          </Stack>
        </Stack>
      </Box>
      <Box
        role="region"
        aria-label={t('gameSetup.modifiers.title')}
        tabIndex={0}
        sx={{
          flex: '1 1 0%',
          minHeight: 0,
          mt: 1.5,
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          scrollbarGutter: 'stable both-edges',
          scrollbarWidth: 'thin',
          mx: -1,
          px: 0.5,
        }}
      >
        <AsyncSection
          isLoading={catalogQuery.isLoading}
          isError={catalogQuery.isError}
          hasData={catalogQuery.data != null}
          isEmpty={filteredModifiers.length === 0}
          loadingMessage={t('gameSetup.modifiers.loading')}
          errorMessage={t('gameSetup.modifiers.error')}
          emptyMessage={
            hasFilters ? t('common.modifiers.emptySearch') : t('gameSetup.modifiers.empty')
          }
          retryAction={
            <AppButton tone="secondary" onClick={() => void catalogQuery.refetch()}>
              {t('gameSetup.registration.retry')}
            </AppButton>
          }
        >
          <Box component="fieldset" disabled={isSaving} sx={{ border: 0, m: 0, p: 0, minWidth: 0 }}>
            <Box
              component="ul"
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' },
                gap: 1,
                m: 0,
                p: 0,
              }}
            >
              {filteredModifiers.map((modifier) => (
                <GameSetupModifierRow
                  key={modifier.id}
                  modifier={modifier}
                  selected={enabledIds.has(modifier.id)}
                  onPreview={setPreviewId}
                  onToggle={onToggle}
                />
              ))}
            </Box>
          </Box>
        </AsyncSection>
      </Box>
      <GameSetupModifierPreview
        modifier={preview}
        catalog={catalogQuery.data ?? []}
        onClose={() => setPreviewId(null)}
      />
    </SectionCard>
  )
}
