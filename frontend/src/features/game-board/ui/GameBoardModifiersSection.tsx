import { Alert, Box, Chip, Stack, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../../../shared/api/errors/ApiError.ts'
import { API_ERROR_CODES } from '../../../shared/api/errors/api-error-codes.ts'
import { queryKeys } from '../../../shared/api/query-keys.ts'
import type { ErrorResponse, GameBoardSnapshot } from '../../../shared/api/contracts/index.ts'
import {
  activateGameModifier,
  fetchGameModifierCatalog,
} from '../../game-modifiers/api/game-modifiers-data-access.ts'
import { AppButton, SectionCard } from '../../../shared/ui/index.ts'

interface GameBoardModifiersSectionProps {
  snapshot: GameBoardSnapshot
  canActivateModifiers: boolean
}

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

export function GameBoardModifiersSection({
  snapshot,
  canActivateModifiers,
}: GameBoardModifiersSectionProps) {
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

  return (
    <SectionCard sx={{ mt: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        {t('gameBoard.modifiers.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {t('gameBoard.modifiers.description')}
      </Typography>

      {catalogQuery.isLoading ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          {t('gameBoard.modifiers.loading')}
        </Typography>
      ) : null}

      {catalogQuery.isError ? (
        <Alert severity="error" sx={{ mt: 1.5 }}>
          {t('gameBoard.modifiers.error')}
        </Alert>
      ) : null}

      {errorMessage ? (
        <Alert severity="error" sx={{ mt: 1.5 }}>
          {errorMessage}
        </Alert>
      ) : null}

      {visibleCatalog.length === 0 && !catalogQuery.isLoading ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          {t('gameBoard.modifiers.empty')}
        </Typography>
      ) : null}

      <Stack spacing={1.5} sx={{ mt: 1.5 }}>
        {visibleCatalog.map((modifier) => {
          const activationCount = activationCountByCode[modifier.code] ?? 0
          const hasLimit = modifier.defaultLimitPerGame != null
          const hasRemaining =
            modifier.defaultLimitPerGame == null || activationCount < modifier.defaultLimitPerGame
          const isActive = activationCount > 0
          const canActivate =
            canActivateModifiers
            && snapshot.status === 'active'
            && hasRemaining
            && !activateMutation.isPending

          return (
            <Box key={modifier.code} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.25 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between">
                <Box>
                  <Typography variant="subtitle2">{modifier.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {modifier.description}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip
                    size="small"
                    label={`${modifier.kind} · ${modifier.category} · ${modifier.activationCost}`}
                  />
                  {isActive ? (
                    <>
                      <Chip
                        size="small"
                        color="success"
                        label={
                          hasLimit
                            ? `${t('gameBoard.modifiers.activeBadge')} ${activationCount}/${modifier.defaultLimitPerGame}`
                            : `${t('gameBoard.modifiers.activeBadge')} ${activationCount}`
                        }
                      />
                      <AppButton
                        size="small"
                        tone="secondary"
                        disabled={!canActivate}
                        onClick={() => activateMutation.mutate(modifier.code)}
                      >
                        {t('gameBoard.modifiers.activate')}
                      </AppButton>
                    </>
                  ) : (
                    <AppButton
                      size="small"
                      tone="secondary"
                      disabled={!canActivate}
                      onClick={() => activateMutation.mutate(modifier.code)}
                    >
                      {t('gameBoard.modifiers.activate')}
                    </AppButton>
                  )}
                </Stack>
              </Stack>
            </Box>
          )
        })}
      </Stack>
    </SectionCard>
  )
}
