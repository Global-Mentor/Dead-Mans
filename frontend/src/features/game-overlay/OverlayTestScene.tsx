import { Box } from '@mui/material'
import { keyframes } from '@emotion/react'
import { useTranslation } from 'react-i18next'
import { ImageFrame } from '../../shared/ui/index.ts'

const revealScene = keyframes({ from: { opacity: 0 }, to: { opacity: 1 } })

export function OverlayTestScene() {
  const { t } = useTranslation()
  return (
    <Box
      data-testid="overlay-test-scene"
      sx={{
        position: 'absolute',
        inset: 0,
        bgcolor: 'common.black',
        animation: `${revealScene} 360ms ease-out both`,
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}
    >
      <ImageFrame
        src="/brand/share-card.svg"
        alt={t('gameOverlay.testImage')}
        loadingLabel={t('gameOverlay.imageLoading')}
        errorLabel={t('gameOverlay.imageError')}
        loading="eager"
        reveal="fade"
        fit="contain"
        sizing="fill"
        sx={{ height: '100%' }}
      />
    </Box>
  )
}
