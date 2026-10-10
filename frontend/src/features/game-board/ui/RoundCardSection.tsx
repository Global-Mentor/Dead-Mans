import { Box, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'
import type { GameBoardCell } from '../../../shared/api/contracts/index.ts'
import type { components } from '../../../shared/api/contracts/generated'
import { resolveBackendMediaUrl } from '../../../shared/api/media-url.ts'
import { ImageFrame, ItemCard } from '../../../shared/ui/index.ts'
import { RoundBriefingDivider, RoundBriefingPanel } from '../../../shared/game-ui/index.ts'

export function RoundCardSection({
  round,
  cell,
  categoryName,
  waitingMessage,
}: {
  round: components['schemas']['GameRoundDetailsDto'] | null
  cell: GameBoardCell | null
  categoryName: string
  waitingMessage: string
}) {
  const { t } = useTranslation()
  const mediaUrl = resolveBackendMediaUrl(cell?.media[0]?.url)
  const title =
    cell?.title?.trim() ||
    round?.cellTitle?.trim() ||
    categoryName ||
    t('gameBoard.roundSummaryCardFallback')
  return (
    <Box
      data-testid="round-media-panel"
      sx={{
        gridArea: 'cardMedia',
        minWidth: 0,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: { xs: 'center', md: 'flex-end' },
        gap: 1.5,
        '@media (min-width:768px)': { height: '100%', alignItems: 'flex-end' },
      }}
    >
      <RoundBriefingPanel
        component="section"
        aria-label={t('gameBoard.currentRoundScreen.card')}
        data-testid="round-card-summary"
        sx={{
          width: '100%',
          height: 'var(--round-header-height)',
          flexShrink: 0,
          py: 0,
        }}
      >
        <Box
          component="dl"
          sx={{
            m: 0,
            height: '100%',
            display: 'grid',
            gridTemplateRows: '1fr auto 1fr',
            overflowWrap: 'anywhere',
          }}
        >
          <Box
            data-testid="round-category-row"
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              flexWrap: 'wrap',
              py: 1,
              textAlign: 'center',
            }}
          >
            <Typography component="dt" variant="h6" color="primary.light" fontWeight={700}>
              {t('gameBoard.currentRoundScreen.cardLabel')}
            </Typography>
            <Typography
              component="dd"
              variant="body2"
              color="text.secondary"
              fontWeight={400}
              textAlign="center"
              sx={{
                m: 0,
              }}
            >
              {round ? categoryName || '-' : t('gameBoard.currentRoundScreen.waiting')}
            </Typography>
          </Box>
          <RoundBriefingDivider />
          <Box
            data-testid="round-cost-row"
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              flexWrap: 'wrap',
              py: 1,
              textAlign: 'center',
            }}
          >
            <Typography component="dt" variant="h6" color="primary.light" fontWeight={700}>
              {t('gameBoard.currentRoundScreen.costLabel')}
            </Typography>
            <Typography
              component="dd"
              variant="body2"
              fontWeight={400}
              color="text.secondary"
              textAlign="center"
              sx={{ m: 0, fontVariantNumeric: 'tabular-nums' }}
            >
              {round ? t('gameBoard.costLabel', { cost: round.baseScore }) : '-'}
            </Typography>
          </Box>
        </Box>
      </RoundBriefingPanel>
      <Box
        sx={{
          width: '100%',
          flex: 1,
          minHeight: 0,
          display: 'grid',
          placeItems: 'start center',
          '@media (min-width:768px)': { placeItems: 'start end' },
        }}
      >
        <ItemCard
          data-testid="round-card-frame"
          borderStyle={round ? 'solid' : 'dashed'}
          sx={(theme) => ({
            position: 'relative',
            width: '100%',
            aspectRatio: '3 / 4',
            '@media (min-width:768px)': { height: '100%', aspectRatio: 'auto' },
            display: 'grid',
            placeItems: 'center',
            boxShadow: `inset 0 0 0 5px ${alpha(theme.palette.common.black, 0.35)}`,
            '&::before, &::after': {
              content: '""',
              position: 'absolute',
              width: 20,
              height: 20,
              borderColor: alpha(theme.palette.primary.light, 0.48),
              pointerEvents: 'none',
            },
            '&::before': {
              top: 7,
              left: 7,
              borderTopWidth: '1px',
              borderTopStyle: 'solid',
              borderLeftWidth: '1px',
              borderLeftStyle: 'solid',
            },
            '&::after': {
              bottom: 7,
              right: 7,
              borderBottomWidth: '1px',
              borderBottomStyle: 'solid',
              borderRightWidth: '1px',
              borderRightStyle: 'solid',
            },
          })}
        >
          {round && mediaUrl ? (
            <ImageFrame
              src={mediaUrl}
              alt={title}
              loading="eager"
              loadingLabel={t('common.media.loading')}
              errorLabel={t('common.media.error')}
              sizing="fill"
              sx={{
                position: 'absolute',
                inset: 16,
                width: 'calc(100% - 32px)',
                height: 'calc(100% - 32px)',
              }}
            />
          ) : (
            <Stack spacing={1.5} sx={{ px: 2, textAlign: 'center', overflowWrap: 'anywhere' }}>
              <Typography variant="overline" color="text.secondary">
                {t(
                  round
                    ? 'gameBoard.currentRoundScreen.card'
                    : 'gameBoard.currentRoundScreen.waiting',
                )}
              </Typography>
              <Typography
                variant={round ? 'h5' : 'body1'}
                color={round ? 'text.primary' : 'text.secondary'}
              >
                {round ? title : waitingMessage}
              </Typography>
            </Stack>
          )}
        </ItemCard>
      </Box>
    </Box>
  )
}
