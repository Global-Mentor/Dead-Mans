import { Alert, Box, Chip, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { GameBoardSnapshot } from '../../../shared/api/contracts/index.ts'
import { AppButton, AsyncSection, SectionCard, SectionHeader } from '../../../shared/ui/index.ts'
import { huntModifierItemSx } from '../theme/modifier-item-sx.ts'
import { useGameBoardModifiers } from '../use-game-board-modifiers.ts'

interface GameBoardModifiersSectionProps {
  snapshot: GameBoardSnapshot
  canActivateModifiers: boolean
}

export function GameBoardModifiersSection({
  snapshot,
  canActivateModifiers,
}: GameBoardModifiersSectionProps) {
  const { t } = useTranslation()
  const { catalogQuery, activateMutation, activationCountByCode, visibleCatalog, errorMessage } =
    useGameBoardModifiers(snapshot)

  return (
    <SectionCard sx={{ mt: 2 }}>
      <SectionHeader
        title={t('gameBoard.modifiers.title')}
        description={t('gameBoard.modifiers.description')}
      />

      {errorMessage ? (
        <Alert severity="error" sx={{ mt: 1.5 }}>
          {errorMessage}
        </Alert>
      ) : null}

      <AsyncSection
        isLoading={catalogQuery.isLoading}
        isError={catalogQuery.isError}
        isEmpty={visibleCatalog.length === 0}
        loadingMessage={t('gameBoard.modifiers.loading')}
        errorMessage={t('gameBoard.modifiers.error')}
        emptyMessage={t('gameBoard.modifiers.empty')}
      >
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
              <Box key={modifier.code} sx={huntModifierItemSx}>
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
      </AsyncSection>
    </SectionCard>
  )
}
