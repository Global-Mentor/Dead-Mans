import { Box, Stack, Typography } from '@mui/material'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AppButton,
  ConfirmDialog,
  InlineNotice,
  PageShell,
  SectionCard,
  SectionHeader,
} from '../../shared/ui/index.ts'
import { ModifierCatalogFilters, type ModifierCatalogSort } from './ui/ModifierCatalogFilters.tsx'
import { ModifierFormDialog } from './ui/ModifierFormDialog.tsx'
import { ModifierCatalogList } from './ui/ModifierCatalogList.tsx'
import { useCatalogFeedback } from './use-catalog-feedback.ts'
import { useCatalogModifiers } from './use-catalog-modifiers.ts'
export function CatalogModifiersPage() {
  const { t, i18n } = useTranslation()
  const [sort, setSort] = useState<ModifierCatalogSort>('name')
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
  const { listError, clearListError, resetFeedback, showResolvedError } = useCatalogFeedback(t)

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
  const resetFilters = () => {
    setSearch('')
    setSelectedCategory(null)
    setSelectedRoundSummaryType(null)
  }
  const handleConfirmDelete = async () => {
    resetFeedback()
    try {
      await confirmDelete()
    } catch (error) {
      showResolvedError(error)
    }
  }
  return (
    <PageShell
      sx={{
        maxWidth: 1200,
        px: { xs: 0.5, sm: 2, md: 3 },
        width: '100%',
        flex: '1 1 0%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
      }}
    >
      {listError && !deleteTarget ? (
        <InlineNotice severity="error" onClose={clearListError}>
          {listError}
        </InlineNotice>
      ) : null}
      <SectionCard
        sx={{
          flex: '1 1 0%',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          p: { xs: 1, sm: 2 },
        }}
      >
        <Box
          role="group"
          aria-label={t('gameCatalog.modifiers.menuTitle')}
          sx={{
            flexShrink: 0,
            maxHeight: '65%',
            overflowY: 'auto',
            scrollbarWidth: 'thin',
            scrollbarGutter: 'stable both-edges',
            p: 0.5,
          }}
        >
          <SectionHeader
            headingLevel="h1"
            title={t('gameCatalog.modifiers.title')}
            actions={
              <Stack direction="row" gap={1.5} flexWrap="wrap" alignItems="center">
                <Typography variant="body2" color="text.secondary" role="status">
                  {t('gameCatalog.workspace.results', {
                    count: filteredModifiers.length,
                    total: catalogQuery.data?.length ?? 0,
                  })}
                </Typography>
                <AppButton framePlacement="inset" onClick={openCreate}>
                  {t('gameCatalog.modifiers.add')}
                </AppButton>
              </Stack>
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
            hasFilters={
              search.trim().length > 0 ||
              selectedCategory !== null ||
              selectedRoundSummaryType !== null
            }
            onReset={resetFilters}
          />
        </Box>
        <ModifierCatalogList
          modifiers={modifiers}
          catalog={catalogQuery.data ?? []}
          isLoading={catalogQuery.isLoading}
          isError={catalogQuery.isError}
          onRetry={() => void catalogQuery.refetch()}
          isActionDialogOpen={dialog !== null || deleteTarget !== null}
          onEdit={openEdit}
          onDelete={(modifier) => {
            clearListError()
            requestDelete(modifier)
          }}
        />
      </SectionCard>
      <ModifierFormDialog
        open={dialog !== null}
        mode={dialog?.mode ?? 'create'}
        initial={dialog?.mode === 'edit' ? dialog.modifier : undefined}
        modifiers={catalogQuery.data ?? []}
        isBusy={isSaving}
        isReadOnly={dialog?.mode === 'edit' && dialog.modifier.isLockedByActiveGame}
        hasStaleConflict={hasStaleConflict}
        staleLatest={staleLatest}
        onLoadLatest={loadLatestForComparison}
        onClose={closeDialog}
        onSubmit={submitModifier}
      />

      <ConfirmDialog
        errorMessage={listError}
        open={deleteTarget !== null}
        title={t('gameCatalog.modifiers.deleteTitle')}
        description={t('gameCatalog.modifiers.deleteConfirm', {
          name: deleteTarget?.name ?? '__all__',
        })}
        confirmLabel={t('gameCatalog.actions.delete')}
        cancelLabel={t('common.actions.cancel')}
        confirmTone="danger"
        isBusy={isDeleting}
        onClose={cancelDelete}
        onConfirm={() => void handleConfirmDelete()}
      />
    </PageShell>
  )
}
