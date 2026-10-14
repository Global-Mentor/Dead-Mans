import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { ImportGameQuestionSkippedItem } from '../../../shared/api/contracts/index.ts'
import { AppButton, InlineNotice } from '../../../shared/ui/index.ts'
import {
  downloadQuestionImportFailureReport,
  formatSkippedQuestionWarning,
} from '../model/question-import-report.ts'
export interface ImportReportState {
  fileName: string
  importedCount: number
  skippedQuestions: ImportGameQuestionSkippedItem[]
  errorMessage: string | null
}

export function QuestionImportFeedback({
  listError,
  successMessage,
  importReport,
  clearListError,
  clearSuccessMessage,
  setImportReport,
}: {
  listError: string | null
  successMessage: string | null
  importReport: ImportReportState | null
  clearListError: () => void
  clearSuccessMessage: () => void
  setImportReport: (report: ImportReportState | null) => void
}) {
  const { t } = useTranslation()
  return (
    <>
      {listError || successMessage || importReport?.skippedQuestions.length ? (
        <Box sx={{ flexShrink: 0, maxHeight: '30%', overflowY: 'auto' }}>
          {listError ? (
            <InlineNotice severity="error" sx={{ mb: 2 }} onClose={clearListError}>
              <Stack spacing={1}>
                <Typography variant="body2">{listError}</Typography>
                {importReport?.errorMessage ? (
                  <>
                    <Typography variant="body2" color="text.secondary">
                      {t('gameCatalog.questions.importErrorDescription')}
                    </Typography>
                    <AppButton
                      size="small"
                      tone="secondary"
                      sx={{ alignSelf: 'flex-start' }}
                      onClick={() => downloadQuestionImportFailureReport(importReport)}
                    >
                      {t('gameCatalog.questions.downloadImportReport')}
                    </AppButton>
                  </>
                ) : null}
              </Stack>
            </InlineNotice>
          ) : null}

          {successMessage ? (
            <InlineNotice severity="success" sx={{ mb: 2 }} onClose={clearSuccessMessage}>
              {successMessage}
            </InlineNotice>
          ) : null}

          {importReport && importReport.skippedQuestions.length > 0 ? (
            <InlineNotice severity="warning" sx={{ mb: 2 }} onClose={() => setImportReport(null)}>
              <Stack spacing={1}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  sx={{ alignItems: { xs: 'flex-start', sm: 'center' } }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {t('gameCatalog.questions.importSkippedTitle')}
                  </Typography>
                  <AppButton
                    size="small"
                    tone="secondary"
                    onClick={() => downloadQuestionImportFailureReport(importReport)}
                  >
                    {t('gameCatalog.questions.downloadImportReport')}
                  </AppButton>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {t('gameCatalog.questions.importSkippedDescription')}
                </Typography>
                <Stack spacing={0.5}>
                  {importReport.skippedQuestions.map((warning) => (
                    <Typography
                      key={`${warning.rowNumber}:${warning.questionText ?? ''}:${warning.reason}`}
                      variant="body2"
                    >
                      {formatSkippedQuestionWarning(warning, t)}
                    </Typography>
                  ))}
                </Stack>
              </Stack>
            </InlineNotice>
          ) : null}
        </Box>
      ) : null}
    </>
  )
}
