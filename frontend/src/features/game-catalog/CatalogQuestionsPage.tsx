import { Box, useMediaQuery, useTheme } from '@mui/material'
import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameQuestionCatalogItem } from '../../shared/api/contracts/index.ts'
import {
  filterCatalogQuestions,
  type QuestionCatalogSort,
  type QuestionCatalogStatus,
} from './model/question-catalog.ts'
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
import { useCatalogQuestions } from './use-catalog-questions.ts'

export function CatalogQuestionsPage() {
  const { t, i18n } = useTranslation()
  const theme = useTheme()
  const wide = useMediaQuery(theme.breakpoints.up('lg'))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [status, setStatus] = useState<QuestionCatalogStatus>('all')
  const [sort, setSort] = useState<QuestionCatalogSort>('category')
  const {
    search,
    setSearch,
    selectedCategoryId,
    setSelectedCategoryId,
    catalogQuery,
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
  } = useCatalogQuestions()
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

  const resetPageFeedback = () => {
    resetFeedback()
    setImportReport(null)
  }

  const handleConfirmDelete = async () => {
    resetPageFeedback()
    try {
      await confirmDelete()
      setPreviewOpen(false)
    } catch (error) {
      showResolvedError(error)
    }
  }

  const questions = catalogQuery.data
  const locale = i18n.resolvedLanguage ?? 'en'
  const visible = useMemo(
    () =>
      filterCatalogQuestions(
        questions ?? [],
        {
          search,
          categoryId: selectedCategoryId,
          status,
          sort,
        },
        locale,
      ),
    [questions, search, selectedCategoryId, status, sort, locale],
  )
  const selected =
    questions?.find((question) => question.questionId === selectedId) ?? visible[0] ?? null
  const hasFilters =
    search.trim().length > 0 ||
    selectedCategoryId !== null ||
    status !== 'all' ||
    sort !== 'category'
  const resetFilters = () => {
    setSearch('')
    setSelectedCategoryId(null)
    setStatus('all')
    setSort('category')
  }
  const selectQuestion = (question: GameQuestionCatalogItem) => {
    setSelectedId(question.questionId)
    setPreviewOpen(true)
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
      sx={{
        maxWidth: 1600,
        px: { xs: 0, sm: 0, md: 0 },
        pb: { xs: 0, sm: 0, md: 0 },
        width: '100%',
        flex: '1 1 0%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
      }}
    >
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
        toolsLabel={t('gameCatalog.questions.menuTitle')}
        tools={
          <Box sx={{ minWidth: 0 }}>
            <QuestionCatalogMenu
              canAddQuestion={canAddQuestion}
              isCategoriesLoading={categoriesQuery.isLoading}
              isCategoriesError={categoriesQuery.isError}
              isImportingQuestions={isImportingQuestions}
              isDownloadingTemplate={isDownloadingTemplate}
              onCreateQuestion={openCreate}
              onDownloadTemplate={() => void handleDownloadTemplate()}
              onUploadQuestions={() => importInputRef.current?.click()}
              onManageCategories={openCategoryManagement}
              onRetryCategories={() => void categoriesQuery.refetch()}
            >
              <QuestionCatalogFilters
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
            </QuestionCatalogMenu>
          </Box>
        }
      >
        <AsyncSection
          isLoading={catalogQuery.isLoading}
          isError={catalogQuery.isError}
          hasData={catalogQuery.data != null}
          isEmpty={(questions?.length ?? 0) === 0}
          loadingMessage={t('gameCatalog.questions.loading')}
          errorMessage={t('gameCatalog.questions.error')}
          emptyMessage={t('gameCatalog.questions.empty')}
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
              questions={visible}
              totalCount={questions?.length ?? 0}
              selectedId={wide ? (selected?.questionId ?? null) : null}
              onSelect={selectQuestion}
            />
            {wide && selected ? (
              <SectionCard
                component="section"
                role="region"
                aria-label={t('gameCatalog.questions.catalog.details')}
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
        open={
          !wide &&
          previewOpen &&
          selected !== null &&
          dialog === null &&
          !categoryDialog &&
          deleteTarget === null
        }
        title={t('gameCatalog.questions.catalog.details')}
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
      <QuestionFormDialog
        open={dialog !== null}
        mode={dialog?.mode ?? 'create'}
        initial={dialog?.mode === 'edit' ? dialog.question : undefined}
        categories={categories}
        defaultCategoryId={selectedCategoryId ?? undefined}
        isBusy={isSaving}
        onClose={closeDialog}
        onSubmit={async (request) => {
          const saved = await submitQuestion(request)
          setSelectedId(saved.questionId)
          setPreviewOpen(true)
        }}
      />
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
        title={t('gameCatalog.questions.deleteTitle')}
        description={t('gameCatalog.questions.deleteConfirm')}
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
