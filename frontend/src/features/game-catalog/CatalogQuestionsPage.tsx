import { Box, useMediaQuery, useTheme } from '@mui/material'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameQuestionCatalogItem } from '../../shared/api/contracts/index.ts'
import { QuestionCatalogDetails } from './ui/QuestionCatalogDetails.tsx'
import { QuestionCatalogFilters } from './ui/QuestionCatalogFilters.tsx'
import { QuestionImportFeedback, type ImportReportState } from './ui/QuestionImportFeedback.tsx'
import { downloadTextFile } from '../../shared/lib/download-file.ts'
import {
  AppButton,
  AppDialog,
  CatalogWorkspace,
  ConfirmDialog,
  FilePickerInput,
  AsyncSection,
  SectionCard,
  PageShell,
} from '../../shared/ui/index.ts'
import { resolveCatalogErrorMessage } from './model/catalog-error.ts'
import { QuestionCatalogList } from './ui/QuestionCatalogList.tsx'
import { QuestionCatalogMenu } from './ui/QuestionCatalogMenu.tsx'
import { QuestionCategoryDialog } from './ui/QuestionCategoryDialog.tsx'
import { QuestionFormDialog } from './ui/QuestionFormDialog.tsx'
import { useCatalogFeedback } from './use-catalog-feedback.ts'
import { ScreenshotUploadDialog } from './ui/ScreenshotUploadDialog.tsx'
import { useCatalogQuestions } from './use-catalog-questions.ts'
import { ScreenshotEditDialog } from './ui/ScreenshotEditDialog.tsx'
import { useCatalogQuestionSelection } from './use-catalog-question-selection.ts'

export function CatalogQuestionsPage() {
  return <QuizCatalogPage format="text" />
}

export function CatalogScreenshotsPage() {
  return <QuizCatalogPage format="screenshot" />
}

function QuizCatalogPage({ format }: { format: 'text' | 'screenshot' }) {
  const { t, i18n } = useTranslation()
  const screenshots = format === 'screenshot'
  const copy = screenshots ? 'gameCatalog.screenshots' : 'gameCatalog.questions'
  const theme = useTheme()
  const wide = useMediaQuery(theme.breakpoints.up('lg'))
  const [previewOpen, setPreviewOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const {
    status,
    setStatus,
    sort,
    setSort,
    setPage,
    resetFilters,
    hasFilters,
    locationFilters,
    search,
    setSearch,
    selectedCategoryId,
    setSelectedCategoryId,
    catalogQuery,
    viewKey,
    returnToLoadedView,
    categoriesQuery,
    dialog,
    openCreate,
    openEdit,
    closeDialog,
    submitQuestion,
    categoryDialog,
    openCategoryManagement,
    closeCategoryManagement,
    submitCategory,
    isSaving,
    isSavingCategory,
    deleteTarget,
    requestDelete,
    cancelDelete,
    confirmDelete,
    isDeleting,
    importQuestions,
    isImportingQuestions,
    downloadTemplate,
    isDownloadingTemplate,
  } = useCatalogQuestions(format)
  const {
    listError,
    successMessage,
    setSuccessMessage,
    clearListError,
    clearSuccessMessage,
    resetFeedback,
    showResolvedError,
  } = useCatalogFeedback(t)
  const [importReport, setImportReport] = useState<ImportReportState | null>(null)
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const questions = catalogQuery.data?.items
  const visible = questions ?? []
  const selection = useCatalogQuestionSelection(visible, viewKey)
  const selected = selection.selected

  const resetPageFeedback = () => {
    resetFeedback()
    setImportReport(null)
  }

  const handleConfirmDelete = async () => {
    resetPageFeedback()
    try {
      await confirmDelete()
      selection.clear()
      setPreviewOpen(false)
    } catch (error) {
      showResolvedError(error)
    }
  }

  const isEmptyCatalog = catalogQuery.data?.totalCount === 0 && !hasFilters && !catalogQuery.isError
  const showCatalogState =
    isEmptyCatalog || (questions == null && (catalogQuery.isLoading || catalogQuery.isError))
  const catalogState = showCatalogState
    ? {
        message: t(
          catalogQuery.isLoading
            ? `${copy}.loading`
            : catalogQuery.isError
              ? `${copy}.error`
              : `${copy}.empty`,
        ),
        isLoading: catalogQuery.isLoading,
        isError: catalogQuery.isError,
        retry: () => void catalogQuery.refetch(),
      }
    : null
  const selectQuestion = (question: GameQuestionCatalogItem) => {
    selection.select(question)
    setPreviewOpen(true)
  }
  const saveQuestion: typeof submitQuestion = async (request) => {
    const saved = await submitQuestion(request)
    selectQuestion(saved)
    return saved
  }
  const details = selected ? (
    <QuestionCatalogDetails
      question={selected}
      onEdit={openEdit}
      onDelete={(question) => {
        clearListError()
        requestDelete(question)
      }}
    />
  ) : null
  const categories = categoriesQuery.data ?? []
  const canAddQuestion = categories.length > 0
  const handleDownloadTemplate = async () => {
    resetPageFeedback()
    try {
      const templateLocale =
        (i18n.language ?? '').split('-')[0]?.toLowerCase() === 'ru' ? 'ru' : 'en'
      const content = await downloadTemplate(templateLocale)
      downloadTextFile(content, 'question-import-template.jsonc', 'application/json')
    } catch (error) {
      showResolvedError(error)
    }
  }

  const handleImportFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) {
      return
    }

    resetPageFeedback()
    try {
      const result = await importQuestions(file)
      const skippedQuestions = result.skippedQuestions ?? []
      setSuccessMessage(
        skippedQuestions.length === 0
          ? t('gameCatalog.questions.importSuccess', { count: result.importedCount })
          : t('gameCatalog.questions.importPartial', {
              count: result.importedCount,
              skipped: skippedQuestions.length,
            }),
      )
      setImportReport(
        skippedQuestions.length > 0
          ? {
              fileName: file.name,
              importedCount: result.importedCount,
              skippedQuestions,
              errorMessage: null,
            }
          : null,
      )
    } catch (error) {
      const errorMessage = resolveCatalogErrorMessage(error, t)
      showResolvedError(error)
      setImportReport({
        fileName: file.name,
        importedCount: 0,
        skippedQuestions: [],
        errorMessage,
      })
    }
  }

  return (
    <PageShell
      variant={showCatalogState ? 'state' : 'standard'}
      sx={{
        ...(showCatalogState ? {} : { maxWidth: 1600 }),
        mx: 'auto',
        width: '100%',
        flex: '1 1 0%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
      }}
    >
      {uploadOpen && categories.length > 0 ? (
        <ScreenshotUploadDialog categories={categories} onClose={() => setUploadOpen(false)} />
      ) : null}
      <QuestionImportFeedback
        listError={deleteTarget ? null : listError}
        successMessage={successMessage}
        importReport={importReport}
        clearListError={clearListError}
        clearSuccessMessage={clearSuccessMessage}
        setImportReport={setImportReport}
      />
      <FilePickerInput
        ref={importInputRef}
        accept=".json,.jsonc,application/json"
        onChange={(event) => void handleImportFileSelected(event)}
      />

      <CatalogWorkspace
        toolsLabel={t(`${copy}.menuTitle`)}
        tools={
          <Box sx={{ minWidth: 0 }}>
            <QuestionCatalogMenu
              screenshots={screenshots}
              {...(catalogState ? { catalogState } : {})}
              canAddQuestion={canAddQuestion}
              isCategoriesLoading={categoriesQuery.isLoading}
              isCategoriesError={categoriesQuery.isError}
              isImportingQuestions={isImportingQuestions}
              isDownloadingTemplate={isDownloadingTemplate}
              onCreateQuestion={openCreate}
              onUploadScreenshots={() => setUploadOpen(true)}
              onDownloadTemplate={() => void handleDownloadTemplate()}
              onUploadQuestions={() => importInputRef.current?.click()}
              onManageCategories={openCategoryManagement}
              onRetryCategories={() => void categoriesQuery.refetch()}
            >
              {!showCatalogState ? (
                <QuestionCatalogFilters
                  screenshots={screenshots}
                  locationFilters={locationFilters}
                  search={search}
                  onSearchChange={setSearch}
                  categories={categories}
                  categoryId={selectedCategoryId}
                  onCategoryChange={setSelectedCategoryId}
                  status={status}
                  onStatusChange={setStatus}
                  sort={sort}
                  onSortChange={setSort}
                  hasFilters={hasFilters}
                  onReset={resetFilters}
                  loadingCategories={categoriesQuery.isLoading}
                />
              ) : null}
            </QuestionCatalogMenu>
          </Box>
        }
      >
        {!showCatalogState ? (
          <AsyncSection
            stateVariant="panel"
            isLoading={catalogQuery.isLoading}
            isError={catalogQuery.isError}
            hasData={catalogQuery.data != null}
            isEmpty={false}
            loadingMessage={t(`${copy}.loading`)}
            errorMessage={t(`${copy}.error`)}
            emptyMessage={t(`${copy}.empty`)}
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
              <QuestionCatalogList
                screenshots={screenshots}
                questions={visible}
                totalCount={catalogQuery.data?.totalCount ?? 0}
                page={catalogQuery.data?.page ?? 1}
                pageSize={catalogQuery.data?.pageSize ?? 40}
                onPageChange={setPage}
                {...(returnToLoadedView ? { onReturnToLoadedView: returnToLoadedView } : {})}
                selectedId={wide ? (selected?.questionId ?? null) : null}
                onSelect={selectQuestion}
              />
              {wide && selected ? (
                <SectionCard
                  component="section"
                  role="region"
                  aria-label={t(
                    screenshots
                      ? 'gameCatalog.screenshots.details'
                      : 'gameCatalog.questions.catalog.details',
                  )}
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
        ) : null}
      </CatalogWorkspace>

      <AppDialog
        open={
          !wide &&
          previewOpen &&
          selected !== null &&
          dialog === null &&
          !categoryDialog &&
          deleteTarget === null
        }
        title={t(
          screenshots ? 'gameCatalog.screenshots.details' : 'gameCatalog.questions.catalog.details',
        )}
        contentDensity="compact"
        onClose={() => setPreviewOpen(false)}
        actions={
          <AppButton tone="danger" onClick={() => setPreviewOpen(false)}>
            {t('common.actions.close')}
          </AppButton>
        }
      >
        {!wide ? details : null}
      </AppDialog>
      {screenshots && dialog?.mode === 'edit' ? (
        <ScreenshotEditDialog
          question={dialog.question}
          categories={categories}
          isBusy={isSaving}
          onClose={closeDialog}
          onSubmit={saveQuestion}
        />
      ) : !screenshots ? (
        <QuestionFormDialog
          open={dialog !== null}
          mode={dialog?.mode ?? 'create'}
          initial={dialog?.mode === 'edit' ? dialog.question : undefined}
          categories={categories}
          defaultCategoryId={selectedCategoryId ?? undefined}
          isBusy={isSaving}
          onClose={closeDialog}
          onSubmit={async (request) => {
            await saveQuestion(request)
          }}
        />
      ) : null}
      <QuestionCategoryDialog
        open={categoryDialog}
        categories={categories}
        isBusy={isSavingCategory}
        onClose={closeCategoryManagement}
        onSubmit={submitCategory}
      />
      <ConfirmDialog
        errorMessage={listError}
        open={deleteTarget !== null}
        title={t(`${copy}.deleteTitle`)}
        description={t(`${copy}.deleteConfirm`)}
        subject={deleteTarget?.text}
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
