import { Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { AppButton, InlineNotice, SectionCard } from '../../shared/ui/index.ts'
import { QuizLaunchControls, QuizLaunchStatus } from './QuizLaunchControls.tsx'
import { useQuizManagement } from './use-quiz-management.ts'
import { TwitchBotManagementPanel } from './TwitchBotManagementPanel.tsx'

export function QuizManagementTool() {
  const { t } = useTranslation()
  const management = useQuizManagement()
  return (
    <Stack spacing={1.5}>
      <TwitchBotManagementPanel />
      {management.hasLoadError ? (
        <InlineNotice
          severity="warning"
          action={
            <AppButton tone="secondary" onClick={management.retry}>
              {t('common.actions.retry')}
            </AppButton>
          }
        >
          {t('gameQuiz.refreshError')}
        </InlineNotice>
      ) : null}
      {management.noGame && !management.hasLoadError ? (
        <InlineNotice severity="info">{t('gameQuiz.noGame')}</InlineNotice>
      ) : null}
      <QuizLaunchStatus
        open={management.state?.status === 'open'}
        modifierOrderingActive={management.modifierOrderingActive}
        error={management.error}
      />
      {(['text', 'screenshot'] as const).map((format) => (
        <SectionCard key={format}>
          <Stack spacing={1}>
            <Typography component="h3" variant="h6">
              {t(format === 'text' ? 'gameQuiz.textQuestions' : 'gameQuiz.screenshots')}
            </Typography>
            <QuizLaunchControls
              key={`${management.gameId}-${format}`}
              screenshot={format === 'screenshot'}
              state={management.state}
              questions={management.questions.filter(
                (question) => Boolean(question.image) === (format === 'screenshot'),
              )}
              questionsLoading={management.questionsLoading}
              questionsError={management.questionsError}
              onRetryQuestions={management.retryQuestions}
              isStarting={management.isStarting}
              isLaunching={management.isLaunching}
              modifierOrderingActive={management.modifierOrderingActive}
              onAskNext={() => management.onAskNext(format)}
              onAskSpecific={management.onAskSpecific}
            />
            {format === 'screenshot' && management.state?.presentationVisible ? (
              <>
                {management.state.status !== 'open' ? (
                  <InlineNotice severity="info">{t('gameQuiz.screenshotRetained')}</InlineNotice>
                ) : null}
                <AppButton
                  tone="secondary"
                  loading={management.hiding}
                  disabled={management.hideDisabled}
                  onClick={management.onHide}
                >
                  {t('gameQuiz.hideScreenshot')}
                </AppButton>
              </>
            ) : null}
          </Stack>
        </SectionCard>
      ))}
    </Stack>
  )
}
