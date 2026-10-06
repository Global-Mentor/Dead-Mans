import {
  GameManagementTool,
  useActiveGameTeam,
  useGameBoardLaunchPanel,
  useGameBoardPage,
  useGameFinish,
  useGameTeamPlayedState,
  useManualQuizAwardPlayers,
  useManualQuizAward,
  useStartGameRound,
} from '../game-board/index.ts'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { gameModifiersRoute, gameQuizRoute } from '../../routes/app-routes.ts'
import type { PanelTriggerPlacement } from '../../shared/ui/index.ts'
import { AppToast, PageStatePanel } from '../../shared/ui/index.ts'
import { AdminModifierTool } from '../game-modifiers/index.ts'
import { QuizManagementTool } from '../game-quiz/index.ts'
import { AdminToolDrawer, type AdminToolDescriptor } from './ui/AdminToolDrawer.tsx'

type AdminToolId = 'game' | 'modifiers' | 'quiz'

export function GameAdminToolsHost() {
  const { pathname } = useLocation()
  const initialToolId = resolveInitialToolId(pathname)

  return <GameAdminToolsPanel initialToolId={initialToolId} />
}

export function GameAdminToolsPanel({
  initialToolId,
  triggerPlacement = 'edge',
}: {
  initialToolId: AdminToolId
  triggerPlacement?: PanelTriggerPlacement
}) {
  const { t } = useTranslation()
  const {
    data,
    activeRound,
    hasActiveRoundData,
    teamQueue,
    isTeamQueueError,
    isTeamQueueLoading,
    isError,
    isRefreshError,
    isLoading,
  } = useGameBoardPage()
  const activeTeam = useActiveGameTeam()
  const teamPlayedState = useGameTeamPlayedState()
  const manualQuizAward = useManualQuizAward()
  const startRound = useStartGameRound()
  const gameFinish = useGameFinish()
  const launchPanel = useGameBoardLaunchPanel(data?.status ?? '')
  const manualQuizAwardPlayers = useManualQuizAwardPlayers(launchPanel.canManageGame)
  const isAdmin = launchPanel.canStartGame

  if (!launchPanel.canManageGame) {
    return null
  }

  const tools: [AdminToolDescriptor, ...AdminToolDescriptor[]] = [
    {
      id: 'game',
      label: t('adminTools.gameTool'),
      tabLabel: t('adminTools.gameTab'),
      content:
        data && hasActiveRoundData && !isLoading && !isError ? (
          <GameManagementTool
            snapshot={data}
            activeRound={activeRound}
            teams={teamQueue}
            isTeamQueueLoading={isTeamQueueLoading}
            isTeamQueueError={isTeamQueueError}
            isSelectingActiveTeam={activeTeam.isSelectingActiveTeam}
            onSelectActiveTeam={activeTeam.selectActiveTeam}
            manualQuizAwardPlayers={manualQuizAwardPlayers.players}
            isManualQuizAwardPlayersLoading={manualQuizAwardPlayers.isLoading}
            isManualQuizAwardPlayersError={manualQuizAwardPlayers.isError}
            isAwardingManualQuizPoints={manualQuizAward.isAwardingManualQuizPoints}
            onAwardManualQuizPoints={manualQuizAward.awardManualQuizPoints}
            isChangingRoundStage={startRound.isChangingRoundStage}
            roundStageError={startRound.errorMessage}
            onStartRound={startRound.startRound}
            onStartModifierOrdering={startRound.startModifierOrdering}
            onBeginGameplay={startRound.beginGameplay}
            onReviewRound={startRound.reviewRound}
            onRebuildRound={startRound.rebuildRound}
            onTechnicalCancelRound={startRound.technicalCancelRound}
            onCompleteRound={startRound.completeRound}
            isUpdatingPlayedState={teamPlayedState.isUpdatingPlayedState}
            onSetTeamPlayedState={teamPlayedState.setTeamPlayedState}
            launchPanel={launchPanel}
            finishState={gameFinish}
          />
        ) : (
          <PageStatePanel
            title={t('adminTools.gameTool')}
            message={t(
              isError || isRefreshError
                ? 'gameBoard.errorLoading'
                : isLoading || !hasActiveRoundData
                  ? 'gameBoard.loading'
                  : 'gameBoard.empty',
            )}
          />
        ),
    },
  ]

  if (isAdmin && data?.status === 'active') {
    tools.push({
      id: 'modifiers',
      label: t('adminTools.modifierTool'),
      tabLabel: t('adminTools.modifierTab'),
      content: <AdminModifierTool />,
    })
  }

  tools.push({
    id: 'quiz',
    label: t('adminTools.quizTool'),
    tabLabel: t('adminTools.quizTab'),
    content: <QuizManagementTool />,
  })

  const resolvedInitialToolId = tools.some((tool) => tool.id === initialToolId)
    ? initialToolId
    : tools[0].id

  return (
    <>
      <AdminToolDrawer
        tools={tools}
        initialToolId={resolvedInitialToolId}
        triggerPlacement={triggerPlacement}
      />

      <AppToast
        message={gameFinish.toastMessage}
        onClose={gameFinish.dismissToast}
        severity="success"
        autoHideDuration={5000}
      />
      <AppToast
        message={launchPanel.toastMessage}
        onClose={launchPanel.dismissToast}
        severity="error"
        autoHideDuration={5000}
      />
      <AppToast
        message={activeTeam.toastMessage}
        onClose={activeTeam.dismissToast}
        severity="info"
        autoHideDuration={3000}
      />
      <AppToast
        message={manualQuizAward.toastMessage}
        onClose={manualQuizAward.dismissToast}
        severity={manualQuizAward.toastSeverity}
        autoHideDuration={4000}
      />
      <AppToast
        message={teamPlayedState.toastMessage}
        onClose={teamPlayedState.dismissToast}
        severity="info"
        autoHideDuration={3000}
      />
    </>
  )
}

function resolveInitialToolId(pathname: string): AdminToolId {
  if (
    pathname === gameModifiersRoute.fullPath ||
    pathname.startsWith(`${gameModifiersRoute.fullPath}/`)
  ) {
    return 'modifiers'
  }

  return pathname === gameQuizRoute.fullPath ? 'quiz' : 'game'
}
