import { ItemCard } from '../ui/index.ts'
import { ImageFrame } from '../ui/index.ts'
import { Box, Stack, Typography, useMediaQuery } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { components } from '../api/contracts/generated'
import { resolveBackendMediaUrl } from '../api/media-url.ts'
import { AppDialog } from '../ui/feedback/dialogs/AppDialog.tsx'
import { AppButton } from '../ui/primitives/buttons/AppButton.tsx'
import { PlayedCardResultPanel } from './PlayedCardResultPanel.tsx'

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
      maxWidth={media.length > 0 ? 'lg' : 'sm'}
      fullScreen={isPhone}
      actions={
        <AppButton tone="secondary" onClick={onClose}>
          {t('common.actions.close')}
        </AppButton>
      }
      title={previewCard?.title || t('gameHistory.cardDialogFallbackTitle')}
    >
      {previewCard ? (
        <Stack spacing={1.25}>
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

          <Box
            sx={{
              display: 'grid',
              gap: 1.25,
              gridTemplateColumns:
                media.length > 0
                  ? { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1.2fr) minmax(300px, 0.8fr)' }
                  : 'minmax(0, 1fr)',
              alignItems: 'start',
            }}
          >
            {media.length > 0 ? (
              <ItemCard
                sx={{
                  display: 'grid',
                  gap: 1,
                  gridTemplateColumns: '1fr',
                  justifyItems: 'center',
                  alignItems: 'center',
                  minWidth: 0,
                  minHeight: { xs: 220, sm: 280 },
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
                      minHeight: { xs: 200, sm: 260 },
                      maxHeight: { xs: '48vh', sm: '54vh', md: '58vh' },
                    }}
                  />
                ))}
              </ItemCard>
            ) : null}

            <PlayedCardResultPanel
              cardCost={previewCard.cost}
              round={round}
              isLoading={isLoading}
              isError={isError}
            />
          </Box>
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

function getCardFromRound(round: PlayedCardPreviewRound): PlayedCardPreviewCard {
  return {
    title: round.cellTitle,
    description: round.cellDescription,
    cost: round.cellCost,
    media: round.cellMedia,
  }
}
