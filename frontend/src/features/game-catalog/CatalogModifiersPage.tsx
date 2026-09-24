import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { modifierHistoryRoute } from '../../routes/app-routes.ts'
import {
  AppButton,
  AppLinkButton,
  AsyncSection,
  CatalogWorkspace,
  ConfirmDialog,
  FormTextField,
  InlineNotice,
  PageShell,
  RecordRow,
  SectionCard,
  SectionHeader,
  SelectionTile,
  StatusBadge,
} from '../../shared/ui/index.ts'
import { modifierCategoryCodes, modifierRoundSummaryTypes } from '../game-modifiers/index.ts'
import { deriveModifierRoundSummaryMeta } from '../game-modifiers/model/modifier-round-summary.ts'
import { ModifierFormDialog } from './ui/ModifierFormDialog.tsx'
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

  const hasCatalogItems = (catalogQuery.data?.length ?? 0) > 0
  const isSearchActive = search.trim().length > 0
  const isCategoryActive = selectedCategory !== null
  const isRoundSummaryActive = selectedRoundSummaryType !== null
  const isListEmpty = filteredModifiers.length === 0
  const emptyMessage =
    (isSearchActive || isCategoryActive || isRoundSummaryActive) && hasCatalogItems
      ? isCategoryActive && !isSearchActive
        ? t('gameCatalog.modifiers.emptyCategory')
        : t('common.modifiers.emptySearch')
      : t('gameCatalog.modifiers.empty')

  const handleConfirmDelete = async () => {
    resetFeedback()
    try {
      await confirmDelete()
    } catch (error) {
      cancelDelete()
      showResolvedError(error)
    }
  }

  return (
    <PageShell
      sx={{
        maxWidth: 'none',
        width: '100%',
      }}
    >
      {listError ? (
        <InlineNotice severity="error" sx={{ mb: 2 }} onClose={clearListError}>
          {listError}
        </InlineNotice>
      ) : null}

      <CatalogWorkspace
        toolsLabel={t('gameCatalog.modifiers.menuTitle')}
        tools={
          <Box sx={{ minWidth: 0 }}>
            <SectionCard sx={{ height: '100%' }}>
              <SectionHeader
                title={t('gameCatalog.modifiers.menuTitle')}
                description={t('gameCatalog.modifiers.menuDescription')}
              />

              <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                <AppButton fullWidth onClick={openCreate}>
                  {t('gameCatalog.modifiers.add')}
                </AppButton>
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                  {t('gameCatalog.modifiers.menuHint')}
                </Typography>

                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    {t('common.entities.categories')}
                  </Typography>
                  <Stack spacing={1}>
                    <SelectionTile
                      selected={selectedCategory === null}
                      onClick={() => setSelectedCategory(null)}
                      title={<> {t('common.filters.allCategories')} </>}
                    />

                    {modifierCategoryCodes.map((category) => (
                      <SelectionTile
                        key={category}
                        selected={selectedCategory === category}
                        onClick={() => setSelectedCategory(category)}
                        title={<> {categoryLabels[category]} </>}
                        description={
                          <>
                            {' '}
                            {t('gameCatalog.modifiers.categoryCount', {
                              count: categoryCounts[category],
                            })}{' '}
                          </>
                        }
                      />
                    ))}
                  </Stack>
                </Box>

                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    {t('gameCatalog.modifiers.roundSummaryTitle')}
                  </Typography>
                  <Stack spacing={1}>
                    <SelectionTile
                      selected={selectedRoundSummaryType === null}
                      onClick={() => setSelectedRoundSummaryType(null)}
                      title={<> {t('gameCatalog.modifiers.allRoundSummaries')} </>}
                    />

                    {modifierRoundSummaryTypes.map((roundSummaryType) => (
                      <SelectionTile
                        key={roundSummaryType}
                        selected={selectedRoundSummaryType === roundSummaryType}
                        onClick={() => setSelectedRoundSummaryType(roundSummaryType)}
                        title={<> {roundSummaryLabels[roundSummaryType]} </>}
                        description={
                          <>
                            {' '}
                            {t('gameCatalog.modifiers.roundSummaryCount', {
                              count: roundSummaryCounts[roundSummaryType],
                            })}{' '}
                          </>
                        }
                      />
                    ))}
                  </Stack>
                </Box>
              </Stack>
            </SectionCard>
          </Box>
        }
      >
        <Box sx={{ minWidth: 0 }}>
          <SectionCard sx={{ height: '100%' }}>
            <SectionHeader
              headingLevel="h1"
              title={t('gameCatalog.modifiers.title')}
              description={
                selectedCategory
                  ? `${t('gameCatalog.modifiers.description')} ${categoryLabels[selectedCategory]}.`
                  : t('gameCatalog.modifiers.description')
              }
            />

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mt: 1.5 }}>
              <FormTextField
                value={search}
                label={t('common.modifiers.searchLabel')}
                onChange={(event) => setSearch(event.target.value)}
              />
            </Stack>

            <AsyncSection
              isLoading={catalogQuery.isLoading}
              isError={catalogQuery.isError}
              hasData={catalogQuery.data != null}
              isEmpty={isListEmpty}
              loadingMessage={t('gameCatalog.modifiers.loading')}
              errorMessage={t('gameCatalog.modifiers.error')}
              emptyMessage={emptyMessage}
            >
              <Stack spacing={1} sx={{ mt: 1.5 }}>
                {filteredModifiers.map((modifier) => {
                  const roundSummaryMeta = deriveModifierRoundSummaryMeta(modifier)

                  return (
                    <RecordRow
                      key={modifier.id}
                      actions={
                        <>
                          <AppLinkButton
                            to={`${modifierHistoryRoute.fullPath}?modifierId=${modifier.id}`}
                            size="small"
                            tone="ghost"
                          >
                            {t('gameCatalog.actions.history')}
                          </AppLinkButton>
                          <AppButton
                            size="small"
                            tone="secondary"
                            onClick={() => openEdit(modifier)}
                          >
                            {modifier.isLockedByActiveGame
                              ? t('gameCatalog.actions.view')
                              : t('gameCatalog.actions.edit')}
                          </AppButton>
                          <AppButton
                            size="small"
                            tone="danger"
                            disabled={modifier.isLockedByActiveGame}
                            onClick={() => requestDelete(modifier)}
                          >
                            {t('gameCatalog.actions.delete')}
                          </AppButton>
                        </>
                      }
                    >
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {modifier.iconEmoji ? `${modifier.iconEmoji} ` : ''}
                        {modifier.name}
                      </Typography>
                      <Stack
                        direction="row"
                        spacing={0.75}
                        sx={{ mt: 1, flexWrap: 'wrap', rowGap: 0.75 }}
                      >
                        <StatusBadge
                          color="warning"
                          label={`${t('gameCatalog.modifiers.fields.activationCost')}: ${modifier.activationCost}`}
                        />
                        <StatusBadge
                          color="info"
                          label={`${t('gameCatalog.modifiers.fields.category')}: ${categoryLabels[modifier.category]}`}
                        />
                        <StatusBadge
                          color="success"
                          label={`${t('gameCatalog.modifiers.fields.activationLimitCount')}: ${
                            modifier.activationLimit.count
                          }`}
                        />
                        <StatusBadge
                          label={t(
                            `gameCatalog.modifiers.wizard.kinds.${modifier.behaviorV2.kind}`,
                          )}
                        />
                        <StatusBadge
                          color={roundSummaryMeta.includeInRoundSummary ? 'secondary' : 'default'}
                          label={t(
                            `gameCatalog.modifiers.roundSummaryType.${roundSummaryMeta.type}`,
                          )}
                        />
                        {modifier.behaviorV2.requiresHostMonitoring ? (
                          <StatusBadge
                            color="error"
                            label={t('gameCatalog.modifiers.hostControlBadge')}
                          />
                        ) : null}
                        {modifier.isLockedByActiveGame ? (
                          <StatusBadge
                            color="warning"
                            label={t('gameCatalog.modifiers.contentLockedBadge')}
                          />
                        ) : null}
                      </Stack>
                      <Typography
                        variant="body2"
                        color="text.primary"
                        sx={{ mt: 1, display: 'block', whiteSpace: 'pre-line' }}
                      >
                        {modifier.description}
                      </Typography>
                    </RecordRow>
                  )
                })}
              </Stack>
            </AsyncSection>
          </SectionCard>
        </Box>
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
        open={deleteTarget !== null}
        title={t('gameCatalog.modifiers.deleteTitle')}
        description={t('gameCatalog.modifiers.deleteConfirm', { name: deleteTarget?.name ?? '' })}
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
