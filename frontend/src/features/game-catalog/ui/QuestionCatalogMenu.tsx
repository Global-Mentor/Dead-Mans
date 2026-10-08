import { Box, Stack } from '@mui/material'
import { useState, useId } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameQuestionCategoryItem } from '../../../shared/api/contracts/index.ts'
import {
  AppButton,
  ActionMenu,
  ActionMenuItem,
  InlineNotice,
  SectionCard,
  SectionHeader,
  FormSelect,
  FormTextField,
} from '../../../shared/ui/index.ts'
interface QuestionCatalogMenuProps {
  search: string
  onSearchChange: (search: string) => void
  categories: readonly GameQuestionCategoryItem[]
  selectedCategoryId: string | null
  canAddQuestion: boolean
  canRenameCategory: boolean
  canDeleteCategory: boolean
  isCategoriesLoading: boolean
  isCategoriesError: boolean
  isImportingQuestions: boolean
  isDownloadingTemplate: boolean
  onSelectCategory: (categoryId: string | null) => void
  onCreateQuestion: () => void
  onDownloadTemplate: () => void
  onUploadQuestions: () => void
  onCreateCategory: () => void
  onRenameCategory: () => void
  onDeleteCategory: () => void
}

export function QuestionCatalogMenu({
  search,
  onSearchChange,
  categories,
  selectedCategoryId,
  canAddQuestion,
  canRenameCategory,
  canDeleteCategory,
  isCategoriesLoading,
  isCategoriesError,
  isImportingQuestions,
  isDownloadingTemplate,
  onSelectCategory,
  onCreateQuestion,
  onDownloadTemplate,
  onUploadQuestions,
  onCreateCategory,
  onRenameCategory,
  onDeleteCategory,
}: QuestionCatalogMenuProps) {
  const { t } = useTranslation()
  const [menu, setMenu] = useState<{ anchor: HTMLElement; kind: 'import' | 'categories' } | null>(
    null,
  )
  const menuId = useId()
  const run = (action: () => void) => {
    setMenu(null)
    action()
  }

  return (
    <SectionCard sx={{ height: '100%' }}>
      <SectionHeader headingLevel="h1" title={t('gameCatalog.questions.title')} />

      <Stack spacing={1.5} sx={{ mt: 1.5 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'minmax(0,1fr)',
              md: 'minmax(0,1fr) minmax(180px,260px) auto',
            },
            gap: 1,
            alignItems: 'center',
          }}
        >
          <FormTextField
            label={t('gameCatalog.questions.searchLabel')}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
          <FormSelect
            label={t('common.entities.categories')}
            value={selectedCategoryId ?? '__all__'}
            onChange={(value) => onSelectCategory(value === '__all__' ? null : value)}
            options={[
              { value: '__all__', label: t('common.filters.allCategories') },
              ...categories.map((category) => ({
                value: category.id,
                label: category.name + ' (' + category.questionCount + ')',
              })),
            ]}
            disabled={isCategoriesLoading && !categories.length}
          />
          <AppButton onClick={onCreateQuestion} disabled={!canAddQuestion}>
            {t('gameCatalog.questions.add')}
          </AppButton>
        </Box>
        {isCategoriesError ? (
          <InlineNotice severity="error">{t('gameCatalog.questions.errorCategories')}</InlineNotice>
        ) : null}
        <Stack direction="row" gap={1} flexWrap="wrap">
          <AppButton
            size="small"
            tone="secondary"
            aria-label={t('gameCatalog.questions.importGroupExpand')}
            aria-haspopup="menu"
            aria-expanded={menu?.kind === 'import'}
            aria-controls={menu?.kind === 'import' ? menuId : undefined}
            onClick={(event) => setMenu({ anchor: event.currentTarget, kind: 'import' })}
          >
            {t('gameCatalog.questions.importGroupTitle')}
          </AppButton>
          <AppButton
            size="small"
            tone="secondary"
            aria-label={t('gameCatalog.questions.categoryGroupExpand')}
            aria-haspopup="menu"
            aria-expanded={menu?.kind === 'categories'}
            aria-controls={menu?.kind === 'categories' ? menuId : undefined}
            onClick={(event) => setMenu({ anchor: event.currentTarget, kind: 'categories' })}
          >
            {t('common.entities.categories')}
          </AppButton>
        </Stack>
        {!canAddQuestion && !isCategoriesLoading ? (
          <InlineNotice severity="warning">{t('gameCatalog.questions.noCategories')}</InlineNotice>
        ) : null}
        <ActionMenu
          id={menuId}
          open={menu !== null}
          anchorEl={menu?.anchor ?? null}
          onClose={() => setMenu(null)}
        >
          {menu?.kind === 'import'
            ? [
                <ActionMenuItem
                  key="download"
                  disabled={isDownloadingTemplate}
                  onClick={() => run(onDownloadTemplate)}
                >
                  {t('gameCatalog.questions.downloadTemplate')}
                </ActionMenuItem>,
                <ActionMenuItem
                  key="upload"
                  disabled={isImportingQuestions}
                  onClick={() => run(onUploadQuestions)}
                >
                  {t('gameCatalog.questions.importJson')}
                </ActionMenuItem>,
              ]
            : [
                <ActionMenuItem key="create" onClick={() => run(onCreateCategory)}>
                  {t('gameCatalog.questions.addCategory')}
                </ActionMenuItem>,
                <ActionMenuItem
                  key="rename"
                  disabled={!canRenameCategory}
                  onClick={() => run(onRenameCategory)}
                >
                  {t('gameCatalog.questions.renameCategory')}
                </ActionMenuItem>,
                <ActionMenuItem
                  key="delete"
                  disabled={!canDeleteCategory}
                  onClick={() => run(onDeleteCategory)}
                >
                  {t('gameCatalog.questions.deleteCategory')}
                </ActionMenuItem>,
              ]}
        </ActionMenu>
      </Stack>
    </SectionCard>
  )
}
