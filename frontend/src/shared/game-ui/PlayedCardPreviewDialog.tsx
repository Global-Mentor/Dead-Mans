import { AppButton, AppDialog, ImageFrame, ItemCard, SectionCard } from '../ui/index.ts'
import { Box, Stack, Typography, useMediaQuery } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { components } from '../api/contracts/generated'
import { resolveBackendMediaUrl } from '../api/media-url.ts'
import { PlayedCardResultPanel } from './PlayedCardResultPanel.tsx'
import { PlayedCardModifiers } from './PlayedCardModifiers.tsx'

type PlayedCardPreviewRound = components['schemas']['GameHistoryRoundItemDto']

interface PlayedCardPreviewCard {
  title?: string | null | undefined
  description?: string | null | undefined
  cost: number
  media: readonly { url: string }[]
}

interface PlayedCardPreviewDialogProps {
  card: PlayedCardPreviewCard | null
  round: PlayedCardPreviewRound | null
  isLoading?: boolean
  isError?: boolean
  onClose: () => void
}

export function PlayedCardPreviewDialog({
  card,
  round,
  isLoading = false,
  isError = false,
  onClose,
}: PlayedCardPreviewDialogProps) {
  const { t } = useTranslation()
  const previewCard = round ? getCardFromRound(round) : card
  const media = previewCard?.media ?? []
  const isPhone = useMediaQuery('(max-width: 599px)')

  return (
    <AppDialog
      open={previewCard !== null}
      onClose={onClose}
      maxWidth={media.length > 0 || (round?.modifiers.length ?? 0) > 0 ? 'md' : 'sm'}
      fullScreen={isPhone}
      contentDensity="compact"
      actions={
        <AppButton tone="danger" onClick={onClose}>
          {t('common.actions.close')}
        </AppButton>
      }
      title={previewCard?.title || t('gameHistory.cardDialogFallbackTitle')}
    >
      {previewCard ? (
        <Stack spacing={2}>
          {media.length === 0 ? (
            <Stack spacing={1.25}>
              <PlayedCardCost cost={previewCard.cost} />
              {previewCard.description ? (
                <ItemCard>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}
                  >
                    {previewCard.description}
                  </Typography>
                </ItemCard>
              ) : null}
            </Stack>
          ) : null}

          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns:
                media.length > 0
                  ? { xs: 'minmax(0, 1fr)', md: 'minmax(0, 320px) minmax(0, 1fr)' }
                  : 'minmax(0, 1fr)',
              gridTemplateAreas:
                media.length > 0 ? { xs: '"media" "result"', md: '"media result"' } : '"result"',
              alignItems: 'stretch',
            }}
          >
            {media.length > 0 ? (
              <Stack
                spacing={1.25}
                sx={{
                  gridArea: 'media',
                  justifySelf: 'center',
                  width: '100%',
                  maxWidth: 360,
                  minWidth: 0,
                }}
              >
                <PlayedCardCost cost={previewCard.cost} />
                <ItemCard
                  sx={{
                    display: 'grid',
                    gap: 1,
                    gridTemplateColumns: '1fr',
                    justifyItems: 'center',
                    alignItems: 'center',
                    width: '100%',
                    minWidth: 0,
                  }}
                >
                  {media.map((item, index) => (
                    <ImageFrame
                      key={`${item.url}-${index}`}
                      src={resolveBackendMediaUrl(item.url)}
                      alt={previewCard.title || t('gameHistory.cardDialogFallbackTitle')}
                      loadingLabel={t('common.media.loading')}
                      errorLabel={t('common.media.error')}
                      sx={{
                        width: 'fit-content',
                        maxWidth: '100%',
                        maxHeight: { xs: 'min(48dvh, 520px)', md: 'min(52dvh, 480px)' },
                      }}
                    />
                  ))}
                </ItemCard>
                {previewCard.description ? (
                  <ItemCard>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}
                    >
                      {previewCard.description}
                    </Typography>
                  </ItemCard>
                ) : null}
              </Stack>
            ) : null}

            <Box sx={{ gridArea: 'result', minWidth: 0, display: 'flex' }}>
              <PlayedCardResultPanel
                key={round?.roundId ?? 'pending'}
                round={round}
                isLoading={isLoading}
                isError={isError}
              />
            </Box>
          </Box>
          {round && !isLoading && !isError ? (
            <PlayedCardModifiers modifiers={round.modifiers} />
          ) : null}
          {media.length === 0 ? (
            <Typography variant="caption" color="text.secondary">
              {t('gameHistory.cardMediaEmpty')}
            </Typography>
          ) : null}
        </Stack>
      ) : null}
    </AppDialog>
  )
}

function PlayedCardCost({ cost }: { cost: number }) {
  const { t } = useTranslation()

  return (
    <SectionCard surface="inset" sx={{ p: 1.25 }}>
      <Box
        component="dl"
        sx={{
          m: 0,
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <Typography component="dt" variant="body2" color="text.secondary">
          {t('gameHistory.cardCostMetricLabel')}
        </Typography>
        <Typography component="dd" variant="h6" sx={{ m: 0, fontWeight: 700, flexShrink: 0 }}>
          {t('gameHistory.pointsValue', { points: cost })}
        </Typography>
      </Box>
    </SectionCard>
  )
}

function getCardFromRound(round: PlayedCardPreviewRound): PlayedCardPreviewCard {
  return {
    title: round.cellTitle,
    description: round.cellDescription,
    cost: round.cellCost,
    media: round.cellMedia,
  }
}
