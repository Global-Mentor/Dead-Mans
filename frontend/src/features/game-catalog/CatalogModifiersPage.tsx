import { Box, Stack } from '@mui/material'
import { useTranslation } from 'react-i18next'
import {
  AppButton,
  CatalogWorkspace,
  ConfirmDialog,
  FormTextField,
  FormSelect,
  InlineNotice,
  PageShell,
  SectionCard,
  SectionHeader,
} from '../../shared/ui/index.ts'
import { modifierCategoryCodes, modifierRoundSummaryTypes } from '../game-modifiers/index.ts'
import { ModifierFormDialog } from './ui/ModifierFormDialog.tsx'
import { ModifierCatalogList } from './ui/ModifierCatalogList.tsx'
import { useCatalogFeedback } from './use-catalog-feedback.ts'
import { useCatalogModifiers } from './use-catalog-modifiers.ts'
export function CatalogModifiersPage() {
  const { t } = useTranslation()
  const categoryLabels = {
    preparation: t('common.modifiers.categories.preparation'),
    round: t('common.modifiers.categories.round'),
    result: t('common.modifiers.categories.result'),
  } as const
  const roundSummaryLabels = {
    passive: t('gameCatalog.modifiers.roundSummaryType.passive'),
    automatic: t('gameCatalog.modifiers.roundSummaryType.automatic'),
    condition: t('gameCatalog.modifiers.roundSummaryType.condition'),
    manual_count: t('gameCatalog.modifiers.roundSummaryType.manual_count'),
  } as const
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
        maxWidth: 1440,
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
      <CatalogWorkspace
        toolsLabel={t('gameCatalog.modifiers.menuTitle')}
        tools={
          <SectionCard>
            <Stack
              direction="row"
              gap={1}
              justifyContent="space-between"
              alignItems="center"
              flexWrap="wrap"
            >
              <SectionHeader headingLevel="h1" title={t('gameCatalog.modifiers.title')} />
              <AppButton onClick={openCreate}>{t('gameCatalog.modifiers.add')}</AppButton>
            </Stack>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'minmax(0,1fr)',
                  md: 'minmax(0,1fr) minmax(180px,260px) minmax(200px,280px)',
                },
                gap: 1,
                mt: 1.5,
              }}
            >
              <FormTextField
                value={search}
                label={t('common.modifiers.searchLabel')}
                onChange={(event) => setSearch(event.target.value)}
              />
              <FormSelect
                label={t('common.entities.categories')}
                value={selectedCategory ?? '__all__'}
                onChange={(value) =>
                  setSelectedCategory(
                    modifierCategoryCodes.find((category) => category === value) ?? null,
                  )
                }
                options={[
                  { value: '__all__', label: t('common.filters.allCategories') },
                  ...modifierCategoryCodes.map((category) => ({
                    value: category,
                    label: categoryLabels[category] + ' (' + categoryCounts[category] + ')',
                  })),
                ]}
              />
              <FormSelect
                label={t('gameCatalog.modifiers.roundSummaryTitle')}
                value={selectedRoundSummaryType ?? '__all__'}
                onChange={(value) =>
                  setSelectedRoundSummaryType(
                    modifierRoundSummaryTypes.find((type) => type === value) ?? null,
                  )
                }
                options={[
                  { value: '__all__', label: t('gameCatalog.modifiers.allRoundSummaries') },
                  ...modifierRoundSummaryTypes.map((type) => ({
                    value: type,
                    label: roundSummaryLabels[type] + ' (' + roundSummaryCounts[type] + ')',
                  })),
                ]}
              />
            </Box>
          </SectionCard>
        }
      >
        <ModifierCatalogList
          modifiers={filteredModifiers}
          catalog={catalogQuery.data ?? []}
          isLoading={catalogQuery.isLoading}
          isError={catalogQuery.isError}
          onRetry={() => void catalogQuery.refetch()}
          onEdit={openEdit}
          onDelete={(modifier) => {
            clearListError()
            requestDelete(modifier)
          }}
          onReset={resetFilters}
        />
      </CatalogWorkspace>
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
