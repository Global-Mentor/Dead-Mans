import { useQuery } from '@tanstack/react-query'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { gameBoardRoute } from '../../../routes/app-routes.ts'
import type { CurrentGameQuizState } from '../../../shared/api/contracts/index.ts'
import { useAuth } from '../../../shared/auth/use-auth.ts'
import { hasPanelCapability } from '../../../shared/auth/panel-capabilities.ts'
import {
  AppButton,
  AppLinkButton,
  InlineNotice,
  PanelTrigger,
  SidePanel,
} from '../../../shared/ui/index.ts'
import { currentGameQuizQueryOptions } from '../../game-quiz/api/game-quiz-queries.ts'
import { PlayerQuizCard } from '../../game-quiz/PlayerQuizCard.tsx'

export function GameQuizDrawer({
  gameId,
  suspended = false,
  showBoardLink = false,
}: {
  gameId: string
  suspended?: boolean
  showBoardLink?: boolean
}) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const isPlayer = user?.roles.includes('viewer') && !hasPanelCapability('manageGame', user.roles)
  const quizQuery = useQuery({
    ...currentGameQuizQueryOptions(gameId),
    enabled: Boolean(isPlayer && gameId),
  })
  const quiz = quizQuery.data?.gameId === gameId ? quizQuery.data : null
  const retry = () => void quizQuery.refetch()
  if (!isPlayer) return null
  if (!quiz)
    return quizQuery.isError ? (
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
      showBoardLink={showBoardLink}
      isError={quizQuery.isError}
      onRefresh={retry}
    />
  )
}

/** Keep the same question mounted through closure so its answer/result remains visible. */
function QuizSessionDrawer({
  quiz,
  suspended,
  showBoardLink,
  isError,
  onRefresh,
}: {
  quiz: CurrentGameQuizState
  suspended: boolean
  showBoardLink: boolean
  isError: boolean
  onRefresh: () => void
}) {
  const { t } = useTranslation()
  const id = useId()
  const [requestedOpen, setRequestedOpen] = useState(quiz.status === 'open')
  const open = !suspended && requestedOpen
  return (
    <>
      {!suspended ? (
        <PanelTrigger
          placement="responsiveEdge"
          side="right"
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
        title={t('gameQuiz.currentTitle')}
        closeLabel={t('gameBoard.currentRoundScreen.closeQuiz')}
        side="right"
        width="wide"
        header={
          showBoardLink ? (
            <AppLinkButton
              to={gameBoardRoute.fullPath}
              tone="secondary"
              size="small"
              sx={{ mt: 1 }}
            >
              {t('gameBoard.currentRoundScreen.viewBoard')}
            </AppLinkButton>
          ) : null
        }
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
