import { Box, useMediaQuery, useTheme } from '@mui/material'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameModifierDefinition } from '../../shared/api/contracts/index.ts'
import {
  AppButton,
  AppDialog,
  AsyncSection,
  ConfirmDialog,
  CatalogWorkspace,
  PageShell,
  SectionCard,
  SectionHeader,
} from '../../shared/ui/index.ts'
import { ModifierCatalogDetails } from './ui/ModifierCatalogDetails.tsx'
import { ModifierCatalogFilters, type ModifierCatalogSort } from './ui/ModifierCatalogFilters.tsx'
import { ModifierCatalogList } from './ui/ModifierCatalogList.tsx'
import { ModifierFormDialog } from './ui/ModifierFormDialog.tsx'
import { useCatalogFeedback } from './use-catalog-feedback.ts'
import { useCatalogModifiers } from './use-catalog-modifiers.ts'

export function CatalogModifiersPage() {
  const { t, i18n } = useTranslation()
  const theme = useTheme()
  const wide = useMediaQuery(theme.breakpoints.up('lg'))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [sort, setSort] = useState<ModifierCatalogSort>('cost')
  const {
    search,
    setSearch,
    selectedCategory,
    setSelectedCategory,
    categoryCounts,
    selectedRoundSummaryType,
    setSelectedRoundSummaryType,
    roundSummaryCounts,
    catalogQuery,
    isArchive,
    modifierLookup,
    activeModifiers,
    filteredModifiers,
    dialog,
    openCreate,
    openEdit,
    closeDialog,
    submitModifier,
    isSaving,
    hasStaleConflict,
    staleLatest,
    loadLatestForComparison,
    deleteTarget,
    requestDelete,
    cancelDelete,
    confirmDelete,
    isDeleting,
  } = useCatalogModifiers()
  const { listError, resetFeedback, showResolvedError } = useCatalogFeedback(t)
  const modifiers = useMemo(() => {
    const collator = new Intl.Collator(i18n.resolvedLanguage, {
      numeric: true,
      sensitivity: 'base',
    })
    return [...filteredModifiers].sort(
      (a, b) =>
        (sort === 'cost' ? a.activationCost - b.activationCost : 0) ||
        collator.compare(a.name, b.name) ||
        a.id.localeCompare(b.id),
    )
  }, [filteredModifiers, i18n.resolvedLanguage, sort])
  const selected = modifiers.find((item) => item.id === selectedId) ?? modifiers[0] ?? null
  const hasFilters =
    search.trim().length > 0 || selectedCategory !== null || selectedRoundSummaryType !== null
  const resetFilters = () => {
    setSearch('')
    setSelectedCategory(null)
    setSelectedRoundSummaryType(null)
  }
  const selectModifier = (modifier: GameModifierDefinition) => {
    setSelectedId(modifier.id)
    setPreviewOpen(true)
  }
  const editModifier = (modifier: GameModifierDefinition) => {
    setSelectedId(modifier.id)
    openEdit(modifier)
  }
  const deleteModifier = (modifier: GameModifierDefinition) => {
    setSelectedId(modifier.id)
    resetFeedback()
    requestDelete(modifier)
  }
  const handleConfirmDelete = async () => {
    resetFeedback()
    try {
      await confirmDelete()
      setPreviewOpen(false)
    } catch (error) {
      showResolvedError(error)
    }
  }
  const details = selected ? (
    <ModifierCatalogDetails
      modifier={selected}
      modifiers={modifierLookup}
      isArchived={isArchive}
      onEdit={editModifier}
      onDelete={deleteModifier}
    />
  ) : null

  return (
    <PageShell
      sx={{
        maxWidth: 1600,
        width: '100%',
        px: { xs: 0, sm: 0, md: 0 },
        pb: { xs: 0, sm: 0, md: 0 },
        flex: '1 1 0%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <CatalogWorkspace
        toolsLabel={t('gameCatalog.modifiers.catalog.filters', {
          count: Number(selectedCategory !== null) + Number(selectedRoundSummaryType !== null),
        })}
        tools={
          <SectionCard>
            <SectionHeader
              headingLevel="h1"
              title={t('gameCatalog.modifiers.title')}
              actions={
                <AppButton tone="primary" onClick={openCreate}>
                  {t('gameCatalog.modifiers.add')}
                </AppButton>
              }
            />
            <ModifierCatalogFilters
              search={search}
              onSearchChange={setSearch}
              category={selectedCategory}
              onCategoryChange={setSelectedCategory}
              categoryCounts={categoryCounts}
              summaryType={selectedRoundSummaryType}
              onSummaryTypeChange={setSelectedRoundSummaryType}
              summaryCounts={roundSummaryCounts}
              sort={sort}
              onSortChange={setSort}
              hasFilters={hasFilters}
              onReset={resetFilters}
            />
          </SectionCard>
        }
      >
        <AsyncSection
          isLoading={catalogQuery.isLoading}
          isError={catalogQuery.isError}
          hasData={catalogQuery.data != null}
          isEmpty={modifiers.length === 0}
          loadingMessage={t('gameCatalog.modifiers.loading')}
          errorMessage={t('gameCatalog.modifiers.error')}
          emptyMessage={t(
            hasFilters && (catalogQuery.data?.length ?? 0) > 0
              ? 'common.modifiers.emptySearch'
              : isArchive
                ? 'gameCatalog.modifiers.catalog.archiveEmpty'
                : 'gameCatalog.modifiers.empty',
          )}
          retryAction={
            <AppButton tone="secondary" onClick={() => void catalogQuery.refetch()}>
              {t('common.actions.retry')}
            </AppButton>
          }
        >
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              flex: '1 1 0%',
              minHeight: 0,
              gridTemplateRows: 'minmax(0, 1fr)',
              gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1fr) minmax(0, 1fr)' },
            }}
          >
            <ModifierCatalogList
              modifiers={modifiers}
              totalCount={catalogQuery.data?.length ?? 0}
              selectedId={wide ? (selected?.id ?? null) : null}
              onSelect={selectModifier}
            />
            {wide ? (
              <SectionCard
                component="section"
                role="region"
                aria-label={t('gameCatalog.modifiers.catalog.details')}
                tabIndex={0}
                sx={{
                  minWidth: 0,
                  minHeight: 0,
                  height: '100%',
                  overflowY: 'auto',
                  overscrollBehaviorY: 'contain',
                }}
              >
                {details}
              </SectionCard>
            ) : null}
          </Box>
        </AsyncSection>
      </CatalogWorkspace>
      <AppDialog
        open={!wide && previewOpen && selected !== null && dialog === null && deleteTarget === null}
        onClose={() => setPreviewOpen(false)}
        title={t('gameCatalog.modifiers.catalog.details')}
        contentDensity="compact"
        actions={
          <AppButton tone="secondary" onClick={() => setPreviewOpen(false)}>
            {t('common.actions.close')}
          </AppButton>
        }
      >
        {!wide ? details : null}
      </AppDialog>
      <ModifierFormDialog
        open={dialog !== null}
        mode={dialog?.mode ?? 'create'}
        initial={dialog?.mode === 'edit' ? dialog.modifier : undefined}
        modifiers={activeModifiers}
        isBusy={isSaving}
        isReadOnly={dialog?.mode === 'edit' && dialog.modifier.isLockedByActiveGame}
        hasStaleConflict={hasStaleConflict}
        staleLatest={staleLatest}
        onLoadLatest={loadLatestForComparison}
        onClose={closeDialog}
        onSubmit={submitModifier}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('gameCatalog.modifiers.deleteTitle')}
        description={t('gameCatalog.modifiers.deleteConfirm', { name: deleteTarget?.name ?? '' })}
        errorMessage={listError}
        confirmLabel={t('gameCatalog.actions.delete')}
        cancelLabel={t('common.actions.cancel')}
        confirmTone="danger"
        isBusy={isDeleting}
        onClose={cancelDelete}
        onConfirm={handleConfirmDelete}
      />
    </PageShell>
  )
}
