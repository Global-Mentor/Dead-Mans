import { useTranslation } from 'react-i18next'
import { AppButton, InlineNotice, SectionCard } from '../../shared/ui/index.ts'
import { QuizLaunchControls } from './QuizLaunchControls.tsx'
import { useQuizManagement } from './use-quiz-management.ts'

export function QuizManagementTool() {
  const { t } = useTranslation()
  const management = useQuizManagement()
  return (
    <SectionCard sx={{ p: 1.25 }}>
      {management.hasLoadError ? (
        <InlineNotice
          severity="warning"
          action={
            <AppButton size="small" onClick={management.retry}>
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
      <QuizLaunchControls
        key={management.gameId}
        state={management.state}
        questions={management.questions}
        questionsLoading={management.questionsLoading}
        questionsError={management.questionsError}
        onRetryQuestions={management.retryQuestions}
        isStarting={management.isStarting}
        isLaunching={management.isLaunching}
        modifierOrderingActive={management.modifierOrderingActive}
        error={management.error}
        onAskNext={management.onAskNext}
        onAskSpecific={management.onAskSpecific}
      />
    </SectionCard>
  )
}
