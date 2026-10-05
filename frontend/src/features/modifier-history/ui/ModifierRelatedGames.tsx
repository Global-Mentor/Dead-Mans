import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { gameHistoryRoute, gameLeaderboardRoute } from '../../../routes/app-routes.ts'
import type { components } from '../../../shared/api/contracts/generated'
import { AppLinkButton, ItemCard, StatusBadge } from '../../../shared/ui/index.ts'

type RelatedGame = components['schemas']['ModifierVersionGamesPageDto']['items'][number]

export function ModifierRelatedGames({ items }: { items: readonly RelatedGame[] }) {
  const { t, i18n } = useTranslation()
  return (
    <Stack gap={1}>
      {items.map((game) => (
        <ItemCard key={game.gameId}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'minmax(0, 1fr) auto auto' },
              gap: 1.5,
              alignItems: 'center',
            }}
          >
            <Stack gap={0.5} alignItems="flex-start" sx={{ minWidth: 0 }}>
              <Typography
                component="h4"
                variant="body1"
                fontWeight={700}
                sx={{ overflowWrap: 'anywhere' }}
              >
                {game.gameTitle}
              </Typography>
              {game.isEmergencyDisabled ? (
                <StatusBadge
                  density="compact"
                  color="error"
                  label={t('modifierHistory.emergency')}
                />
              ) : null}
            </Stack>
            <StatusBadge
              density="compact"
              label={
                <Stack direction="row" gap={1} alignItems="baseline">
                  <Typography component="span" variant="body2" fontWeight={700}>
                    {t('modifierHistory.activationCount')}
                  </Typography>
                  <Typography component="span" variant="body2">
                    {new Intl.NumberFormat(i18n.resolvedLanguage).format(
                      game.successfulActivationsCount,
                    )}
                  </Typography>
                </Stack>
              }
              sx={{ justifySelf: 'start' }}
            />
            <AppLinkButton
              tone="secondary"
              size="small"
              sx={{ justifySelf: { xs: 'start', sm: 'auto' } }}
              aria-label={t('modifierHistory.viewGame') + ': ' + game.gameTitle}
              to={
                game.gameStatus.toLowerCase() === 'finished'
                  ? gameHistoryRoute.fullPath + '?gameId=' + game.gameId
                  : gameLeaderboardRoute.fullPath
              }
            >
              {t('modifierHistory.viewGame')}
            </AppLinkButton>
          </Box>
        </ItemCard>
      ))}
    </Stack>
  )
}
