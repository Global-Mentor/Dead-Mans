import { Stack, SvgIcon } from '@mui/material'
import { useState, useId, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AppButton,
  ActionMenu,
  ActionMenuItem,
  HelpTooltip,
  InlineNotice,
  SectionCard,
  SectionHeader,
} from '../../../shared/ui/index.ts'

interface QuestionCatalogMenuProps {
  children: ReactNode
  canAddQuestion: boolean
  isCategoriesLoading: boolean
  isCategoriesError: boolean
  isImportingQuestions: boolean
  isDownloadingTemplate: boolean
  onCreateQuestion: () => void
  onDownloadTemplate: () => void
  onUploadQuestions: () => void
  onManageCategories: () => void
  onRetryCategories: () => void
}

export function QuestionCatalogMenu({
  children,
  canAddQuestion,
  isCategoriesLoading,
  isCategoriesError,
  isImportingQuestions,
  isDownloadingTemplate,
  onCreateQuestion,
  onDownloadTemplate,
  onUploadQuestions,
  onManageCategories,
  onRetryCategories,
}: QuestionCatalogMenuProps) {
  const { t } = useTranslation()
  const [menu, setMenu] = useState<HTMLElement | null>(null)
  const menuId = useId()
  const run = (action: () => void) => {
    setMenu(null)
    action()
  }
  return (
    <SectionCard>
      <SectionHeader
        headingLevel="h1"
        title={t('gameCatalog.questions.title')}
        actions={
          <Stack direction="row" gap={1} flexWrap="wrap">
            <AppButton tone="primary" onClick={onCreateQuestion} disabled={!canAddQuestion}>
              {t('gameCatalog.questions.add')}
            </AppButton>
            <HelpTooltip title={t('gameCatalog.questions.importGroupDescription')}>
              <AppButton
                tone="secondary"
                endIcon={
                  <SvgIcon fontSize="small">
                    <path d="m7 10 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  </SvgIcon>
                }
                loading={isImportingQuestions || isDownloadingTemplate}
                aria-label={t('gameCatalog.questions.importGroupExpand')}
                aria-haspopup="menu"
                aria-expanded={menu !== null}
                aria-controls={menu !== null ? menuId : undefined}
                onClick={(event) => setMenu(event.currentTarget)}
              >
                {t('gameCatalog.questions.importGroupTitle')}
              </AppButton>
            </HelpTooltip>
            <AppButton tone="secondary" onClick={onManageCategories}>
              {t('gameCatalog.questions.categoryManagement')}
            </AppButton>
          </Stack>
        }
      />
      {children}
      {isCategoriesError ? (
        <InlineNotice
          severity="error"
          sx={{ mt: 1.5 }}
          action={
            <AppButton tone="secondary" onClick={onRetryCategories}>
              {t('common.actions.retry')}
            </AppButton>
          }
        >
          {t('gameCatalog.questions.errorCategories')}
        </InlineNotice>
      ) : null}
      {!canAddQuestion && !isCategoriesLoading && !isCategoriesError ? (
        <InlineNotice severity="warning" sx={{ mt: 1.5 }}>
          {t('gameCatalog.questions.noCategories')}
        </InlineNotice>
      ) : null}
      <ActionMenu
        id={menuId}
        open={menu !== null}
        anchorEl={menu}
        appearance="index"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { mt: 1, width: 'max-content' } } }}
        onClose={() => setMenu(null)}
      >
        <ActionMenuItem
          disabled={isDownloadingTemplate || isImportingQuestions}
          onClick={() => run(onDownloadTemplate)}
        >
          {t('gameCatalog.questions.downloadTemplate')}
        </ActionMenuItem>
        <ActionMenuItem
          disabled={isImportingQuestions || isDownloadingTemplate}
          onClick={() => run(onUploadQuestions)}
        >
          {t('gameCatalog.questions.importJson')}
        </ActionMenuItem>
      </ActionMenu>
    </SectionCard>
  )
}
