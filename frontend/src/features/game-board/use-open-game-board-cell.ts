import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../shared/auth/use-auth.ts'
import { hasPanelCapability } from '../../shared/auth/panel-capabilities.ts'
import { ApiError } from '../../shared/api/errors/ApiError.ts'
import type { GameBoardCell } from '../../shared/api/contracts/index.ts'
import { openGameBoardCell } from './api/game-board-data-access.ts'
import { currentGameBoardQueryOptions } from './api/game-board-queries.ts'

function getOpenCellErrorMessage(error: unknown, t: (key: string) => string) {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return t('gameBoard.openForbidden')
    }

    if (error.status === 404) {
      return t('gameBoard.openNotFound')
    }
  }

  return t('gameBoard.openFailed')
}

export function useOpenGameBoardCell() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [pendingCell, setPendingCell] = useState<GameBoardCell | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const canOpenCells = useMemo(
    () => hasPanelCapability('openGameBoardCell', user?.roles),
    [user?.roles],
  )

  const openCellMutation = useMutation({
    mutationFn: (cellId: string) => openGameBoardCell(cellId),
    onSuccess: async () => {
      setToastMessage(t('gameBoard.openSuccess'))
      await queryClient.invalidateQueries({
        queryKey: currentGameBoardQueryOptions.queryKey,
      })
    },
    onError: (error) => {
      setToastMessage(getOpenCellErrorMessage(error, t))
    },
    onSettled: () => {
      setPendingCell(null)
    },
  })

  const requestOpenCell = (cell: GameBoardCell) => {
    if (!canOpenCells || openCellMutation.isPending) {
      return
    }

    setPendingCell(cell)
  }

  const confirmOpenCell = () => {
    if (!pendingCell) {
      return
    }

    openCellMutation.mutate(pendingCell.id)
  }

  return {
    pendingCell,
    toastMessage,
    canOpenCells: canOpenCells && !openCellMutation.isPending,
    isSubmitting: openCellMutation.isPending,
    requestOpenCell,
    confirmOpenCell,
    dismissPendingCell: () => setPendingCell(null),
    dismissToast: () => setToastMessage(null),
  }
}
