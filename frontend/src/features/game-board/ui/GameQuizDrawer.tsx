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
  side = 'right',
  showForManagers = false,
}: {
  gameId: string
  suspended?: boolean
  showBoardLink?: boolean
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
  if (!quiz || quiz.status !== 'open')
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
      showBoardLink={showBoardLink}
      side={side}
      isError={quizQuery.isError}
      onRefresh={retry}
      readOnly={!isPlayer}
    />
  )
}

function QuizSessionDrawer({
  quiz,
  suspended,
  showBoardLink,
  side,
  isError,
  onRefresh,
  readOnly,
}: {
  quiz: CurrentGameQuizState
  suspended: boolean
  showBoardLink: boolean
  side: 'left' | 'right'
  isError: boolean
  onRefresh: () => void
  readOnly: boolean
}) {
  const { t } = useTranslation()
  const id = useId()
  const [requestedOpen, setRequestedOpen] = useState(true)
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
        title={t('gameQuiz.currentTitle')}
        description={t(
          readOnly ? 'gameQuiz.roundQuestionDescription' : 'gameQuiz.currentDescription',
        )}
        closeLabel={t('gameBoard.currentRoundScreen.closeQuiz')}
        side={side}
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
        <PlayerQuizCard
          state={quiz}
          disabled={isError || suspended || readOnly}
          onDeadline={onRefresh}
        />
      </SidePanel>
    </>
  )
}
