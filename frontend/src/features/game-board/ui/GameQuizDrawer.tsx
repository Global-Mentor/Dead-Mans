import { useQuery } from '@tanstack/react-query'
import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CurrentGameQuizState } from '../../../shared/api/contracts/index.ts'
import { useAuth } from '../../../shared/auth/use-auth.ts'
import { hasPanelCapability } from '../../../shared/auth/panel-capabilities.ts'
import { AppButton, InlineNotice, PanelTrigger, SidePanel } from '../../../shared/ui/index.ts'
import { currentGameQuizQueryOptions, PlayerQuizCard } from '../../game-quiz/index.ts'

const RESULT_DISPLAY_MS = 15_000

export function GameQuizDrawer({
  gameId,
  suspended = false,
  side = 'right',
  showForManagers = false,
}: {
  gameId: string
  suspended?: boolean
  side?: 'left' | 'right'
  showForManagers?: boolean
}) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const canManage = hasPanelCapability('manageGame', user?.roles ?? [])
  const isPlayer = user?.roles.includes('viewer') && !canManage
  const canView = isPlayer || (showForManagers && canManage)
  const quizQuery = useQuery({
    ...currentGameQuizQueryOptions(gameId),
    enabled: Boolean(canView && gameId),
  })
  const quiz = quizQuery.data?.gameId === gameId ? quizQuery.data : null
  const retry = () => void quizQuery.refetch()
  if (!canView) return null
  if (!quiz || (quiz.status !== 'open' && quiz.status !== 'closed'))
    return quizQuery.isError && !suspended ? (
      <InlineNotice
        severity="warning"
        action={
          <AppButton size="small" onClick={retry}>
            {t('common.actions.retry')}
          </AppButton>
        }
      >
        {t('gameQuiz.errorLoading')}
      </InlineNotice>
    ) : null
  return (
    <QuizSessionDrawer
      key={`${gameId}:${quiz.questionSessionId}`}
      quiz={quiz}
      suspended={suspended}
      side={side}
      isError={quizQuery.isError}
      onRefresh={retry}
    />
  )
}

function QuizSessionDrawer({
  quiz,
  suspended,
  side,
  isError,
  onRefresh,
}: {
  quiz: CurrentGameQuizState
  suspended: boolean
  side: 'left' | 'right'
  isError: boolean
  onRefresh: () => void
}) {
  const { t } = useTranslation()
  const id = useId()
  const [requestedOpen, setRequestedOpen] = useState(true)
  const [resultVisible, setResultVisible] = useState(quiz.status === 'open')
  useEffect(() => {
    if (quiz.status !== 'closed' || !resultVisible) return
    const timeout = window.setTimeout(() => setResultVisible(false), RESULT_DISPLAY_MS)
    return () => window.clearTimeout(timeout)
  }, [quiz.status, resultVisible])
  if (quiz.status !== 'open' && !resultVisible) return null
  const open = !suspended && requestedOpen
  return (
    <>
      {!suspended ? (
        <PanelTrigger
          placement="responsiveEdge"
          side={side}
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setRequestedOpen(true)}
        >
          {t('gameBoard.currentRoundScreen.openQuiz')}
        </PanelTrigger>
      ) : null}
      <SidePanel
        id={id}
        open={open}
        onClose={() => setRequestedOpen(false)}
        title={t(quiz.status === 'closed' ? 'gameQuiz.resultTitle' : 'gameQuiz.currentTitle')}
        closeLabel={t('gameBoard.currentRoundScreen.closeQuiz')}
        side={side}
        width={560}
        contentDensity="compact"
        bodyTestId="quiz-question-scroll-body"
      >
        {isError ? (
          <InlineNotice
            severity="warning"
            action={
              <AppButton size="small" onClick={onRefresh}>
                {t('common.actions.retry')}
              </AppButton>
            }
          >
            {t('gameQuiz.errorLoading')}
          </InlineNotice>
        ) : null}
        <PlayerQuizCard state={quiz} disabled={isError || suspended} onDeadline={onRefresh} />
      </SidePanel>
    </>
  )
}
