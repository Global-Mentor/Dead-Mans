import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { TFunction } from 'i18next'
import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../shared/auth/use-auth.ts'
import { hasPanelCapability } from '../../shared/auth/panel-capabilities.ts'
import { ApiError } from '../../shared/api/errors/ApiError.ts'
import type { GameBoardCell } from '../../shared/api/contracts/index.ts'
import { API_ERROR_CODES } from '../../shared/api/errors/api-error-codes.ts'
import { activeGameRoundQueryOptions } from '../game-rounds/api/game-rounds-queries.ts'
import { openGameBoardCell } from './api/game-board-data-access.ts'
import { currentGameBoardQueryOptions } from './api/game-board-queries.ts'

function getOpenCellErrorMessage(error: unknown, t: TFunction<'translation'>) {
  if (error instanceof ApiError) {
    if (
      error.status === 409 &&
      typeof error.details === 'object' &&
      error.details !== null &&
      'code' in error.details &&
      error.details.code === API_ERROR_CODES.gameBoardActiveTeamRequired
    ) {
      return t('gameBoard.openActiveTeamRequired')
    }

    if (
      error.status === 409 &&
      typeof error.details === 'object' &&
      error.details !== null &&
      'code' in error.details &&
      error.details.code === API_ERROR_CODES.gameRoundAlreadyInProgress
    ) {
      return t('gameBoard.activeTeamRoundInProgress')
    }

    if (error.status === 403) {
      return t('gameBoard.openForbidden')
    }

    if (error.status === 404) {
      return t('gameBoard.openNotFound')
    }
  }

  return t('gameBoard.openFailed')
}

interface UseOpenGameBoardCellOptions {
  gameId?: string | null
  activeTeamId?: string | null
  gameStatus?: string | null
  hasActiveRound?: boolean
  onOpenSuccess?: () => void
}

export function useOpenGameBoardCell({
  gameId,
  activeTeamId,
  gameStatus,
  hasActiveRound = false,
  onOpenSuccess,
}: UseOpenGameBoardCellOptions = {}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [pendingCell, setPendingCell] = useState<GameBoardCell | null>(null)
  const [confirmationOpen, setConfirmationOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [confirmationError, setConfirmationError] = useState<string | null>(null)
  const submissionInFlight = useRef(false)
  const pendingContext = useRef({ gameId, activeTeamId })
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const canOpenCells = useMemo(
    () => hasPanelCapability('openGameBoardCell', user?.roles),
    [user?.roles],
  )
  const hasActiveTeam = gameStatus !== 'active' || activeTeamId != null

  const openCellMutation = useMutation({
    mutationFn: (cellId: string) => openGameBoardCell(cellId),
    onSuccess: async () => {
      setToastMessage(t('gameBoard.openSuccess'))
      await queryClient.invalidateQueries({
        queryKey: currentGameBoardQueryOptions.queryKey,
      })
      await queryClient.invalidateQueries({
        queryKey: activeGameRoundQueryOptions.queryKey,
      })
      setConfirmationOpen(false)
      onOpenSuccess?.()
    },
    onError: (error) => {
      submissionInFlight.current = false
      setSubmitted(false)
      setConfirmationError(getOpenCellErrorMessage(error, t))
    },
  })

  const requestOpenCell = (cell: GameBoardCell) => {
    if (
      cell.state !== 'closed' ||
      !canOpenCells ||
      hasActiveRound ||
      openCellMutation.isPending ||
      pendingCell
    ) {
      return
    }

    if (!hasActiveTeam) {
      setToastMessage(t('gameBoard.openActiveTeamRequired'))
      return
    }

    setPendingCell(cell)
    pendingContext.current = { gameId, activeTeamId }
    setConfirmationError(null)
    setSubmitted(false)
    setConfirmationOpen(true)
  }

  const confirmOpenCell = () => {
    if (!pendingCell || !confirmationOpen || submissionInFlight.current) {
      return
    }

    if (
      !canOpenCells ||
      !hasActiveTeam ||
      hasActiveRound ||
      pendingContext.current.gameId !== gameId ||
      pendingContext.current.activeTeamId !== activeTeamId
    ) {
      setConfirmationError(t('gameBoard.openFailed'))
      return
    }

    submissionInFlight.current = true
    setConfirmationError(null)
    setSubmitted(true)
    openCellMutation.mutate(pendingCell.id)
  }

  return {
    pendingCell,
    confirmationOpen,
    confirmationError,
    toastMessage,
    canOpenCells:
      canOpenCells &&
      hasActiveTeam &&
      !hasActiveRound &&
      !openCellMutation.isPending &&
      !pendingCell,
    isSubmitting: openCellMutation.isPending || (submitted && pendingCell !== null),
    requestOpenCell,
    confirmOpenCell,
    dismissPendingCell: () => {
      if (!submissionInFlight.current) setConfirmationOpen(false)
    },
    clearDismissedCell: () => {
      if (!confirmationOpen) {
        setPendingCell(null)
        setSubmitted(false)
        setConfirmationError(null)
        submissionInFlight.current = false
      }
    },
    dismissToast: () => setToastMessage(null),
  }
}
