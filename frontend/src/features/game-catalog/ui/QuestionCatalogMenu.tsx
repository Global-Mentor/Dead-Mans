import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { GameQuestionCategoryItem } from '../../../shared/api/contracts/index.ts'
import {
  AppButton,
  AsyncSection,
  DisclosureSection,
  InlineNotice,
  SectionCard,
  SectionHeader,
  SelectionTile,
} from '../../../shared/ui/index.ts'
interface QuestionCatalogMenuProps {
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

  return (
    <SectionCard sx={{ height: '100%' }}>
      <SectionHeader
        title={t('gameCatalog.questions.menuTitle')}
        description={t('gameCatalog.questions.menuDescription')}
      />

      <Stack spacing={1.5} sx={{ mt: 1.5 }}>
        <Stack spacing={1}>
          <AppButton fullWidth onClick={onCreateQuestion} disabled={!canAddQuestion}>
            {t('gameCatalog.questions.add')}
          </AppButton>

          <DisclosureSection
            panelId="catalog-question-import-panel"
            title={t('gameCatalog.questions.importGroupTitle')}
            description={t('gameCatalog.questions.importGroupDescription')}
            toggleLabels={{
              expand: t('gameCatalog.questions.importGroupExpand'),
              collapse: t('gameCatalog.questions.importGroupCollapse'),
            }}
          >
            <AppButton
              fullWidth
              tone="secondary"
              onClick={onDownloadTemplate}
              disabled={isDownloadingTemplate}
            >
              {t('gameCatalog.questions.downloadTemplate')}
            </AppButton>
            <AppButton
              fullWidth
              tone="secondary"
              onClick={onUploadQuestions}
              disabled={isImportingQuestions}
            >
              {t('gameCatalog.questions.importJson')}
            </AppButton>
          </DisclosureSection>

          <DisclosureSection
            panelId="catalog-question-category-panel"
            title={t('common.entities.categories')}
            description={t('gameCatalog.questions.categoryGroupDescription')}
            toggleLabels={{
              expand: t('gameCatalog.questions.categoryGroupExpand'),
              collapse: t('gameCatalog.questions.categoryGroupCollapse'),
            }}
          >
            <AppButton fullWidth tone="secondary" onClick={onCreateCategory}>
              {t('gameCatalog.questions.addCategory')}
            </AppButton>
            <AppButton
              fullWidth
              tone="secondary"
              onClick={onRenameCategory}
              disabled={!canRenameCategory}
            >
              {t('gameCatalog.questions.renameCategory')}
            </AppButton>
            <AppButton
              fullWidth
              tone="dangerSecondary"
              onClick={onDeleteCategory}
              disabled={!canDeleteCategory}
            >
              {t('gameCatalog.questions.deleteCategory')}
            </AppButton>
            {!canAddQuestion ? (
              <InlineNotice severity="warning">
                {t('gameCatalog.questions.noCategories')}
              </InlineNotice>
            ) : null}
          </DisclosureSection>
        </Stack>

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            {t('common.entities.categories')}
          </Typography>
          <Stack spacing={1}>
            <SelectionTile
              selected={selectedCategoryId === null}
              onClick={() => onSelectCategory(null)}
              title={t('common.filters.allCategories')}
            />

            <AsyncSection
              isLoading={isCategoriesLoading}
              isError={isCategoriesError}
              isEmpty={categories.length === 0}
              loadingMessage={t('gameCatalog.questions.loadingCategories')}
              errorMessage={t('gameCatalog.questions.errorCategories')}
              emptyMessage={t('gameCatalog.questions.emptyCategories')}
            >
              <Stack spacing={1}>
                {categories.map((category) => (
                  <SelectionTile
                    key={category.id}
                    selected={selectedCategoryId === category.id}
                    onClick={() => onSelectCategory(category.id)}
                    title={category.name}
                    description={t('gameCatalog.questions.categoryCount', {
                      count: category.questionCount,
                    })}
                  />
                ))}
              </Stack>
            </AsyncSection>
          </Stack>
        </Box>
      </Stack>
    </SectionCard>
  )
}
