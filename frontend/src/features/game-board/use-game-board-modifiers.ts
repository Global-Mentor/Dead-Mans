import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../../shared/api/errors/ApiError.ts'
import { API_ERROR_CODES } from '../../shared/api/errors/api-error-codes.ts'
import type { ErrorResponse, GameBoardSnapshot } from '../../shared/api/contracts/index.ts'
import { queryKeys } from '../../shared/api/query-keys.ts'
import { activateGameModifier, fetchGameModifierCatalog } from '../game-modifiers/index.ts'

function resolveModifierError(error: unknown, t: (key: string) => string) {
  if (!(error instanceof ApiError)) {
    return t('gameBoard.modifiers.errors.generic')
  }

  if (error.status === 403) {
    return t('gameBoard.modifiers.errors.forbidden')
  }

  const code =
    error.details && typeof error.details === 'object'
      ? (error.details as ErrorResponse).code
      : undefined
  switch (code) {
    case API_ERROR_CODES.gameModifierUnknownCode:
      return t('gameBoard.modifiers.errors.unknownCode')
    case API_ERROR_CODES.gameModifierGameNotActive:
      return t('gameBoard.modifiers.errors.gameNotActive')
    case API_ERROR_CODES.gameModifierNotEnabled:
      return t('gameBoard.modifiers.errors.notEnabled')
    case API_ERROR_CODES.gameModifierConflictActive:
      return t('gameBoard.modifiers.errors.conflictActive')
    case API_ERROR_CODES.gameModifierLimitReached:
      return t('gameBoard.modifiers.errors.limitReached')
    default:
      return t('gameBoard.modifiers.errors.generic')
  }
}

export function useGameBoardModifiers(snapshot: GameBoardSnapshot) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const catalogQuery = useQuery({
    queryKey: queryKeys.gameModifiers.catalog(),
    queryFn: fetchGameModifierCatalog,
  })

  const activateMutation = useMutation({
    mutationFn: (modifierCode: string) => activateGameModifier(modifierCode),
    onSuccess: async () => {
      setErrorMessage(null)
      await queryClient.invalidateQueries({ queryKey: queryKeys.gameBoard.currentSnapshot() })
    },
    onError: (error) => {
      setErrorMessage(resolveModifierError(error, t))
    },
  })

  const activationCountByCode = snapshot.activeModifiers.reduce<Record<string, number>>((acc, item) => {
    acc[item.modifierCode] = (acc[item.modifierCode] ?? 0) + 1
    return acc
  }, {})

  const enabledCodeSet = new Set(snapshot.enabledModifierCodes)
  const visibleCatalog = (catalogQuery.data ?? []).filter((modifier) => enabledCodeSet.has(modifier.code))

  return {
    catalogQuery,
    activateMutation,
    activationCountByCode,
    visibleCatalog,
    errorMessage,
  }
}
