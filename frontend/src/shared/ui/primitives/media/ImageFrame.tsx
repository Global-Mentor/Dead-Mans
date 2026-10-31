import { Box, Stack, Typography, type SxProps, type Theme } from '@mui/material'
import { keyframes } from '@emotion/react'
import { useState } from 'react'
import { mergeSx } from '../../../theme/merge-sx.ts'
import { BusyIndicator } from '../../feedback/progress/BusyIndicator.tsx'

const revealImage = keyframes({ from: { opacity: 0 }, to: { opacity: 1 } })

interface ImageFrameProps {
  src: string
  alt: string
  loadingLabel: string
  errorLabel: string
  fit?: 'contain' | 'cover'
  sizing?: 'intrinsic' | 'fill' | 'full-width'
  decorative?: boolean
  loading?: 'lazy' | 'eager'
  reveal?: 'instant' | 'fade'
  sx?: SxProps<Theme>
}

export function ImageFrame(props: ImageFrameProps) {
  return <ImageFrameContent key={props.src} {...props} />
}

function ImageFrameContent({
  src,
  alt,
  loadingLabel,
  errorLabel,
  fit = 'contain',
  sizing = 'intrinsic',
  decorative = false,
  loading,
  reveal = 'instant',
  sx,
}: ImageFrameProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading')

  return (
    <Box
      aria-hidden={decorative || undefined}
      sx={mergeSx(
        {
          display: 'grid',
          placeItems: 'center',
          position: 'relative',
          minWidth: 0,
          width: '100%',
          overflow: 'hidden',
        },
        sx,
      )}
    >
      {!decorative && status === 'loading' ? (
        <Stack
          role="status"
          spacing={1}
          alignItems="center"
          sx={{ gridArea: '1 / 1', p: 1, color: 'text.secondary' }}
        >
          <BusyIndicator size={24} />
          <Typography variant="body2">{loadingLabel}</Typography>
        </Stack>
      ) : null}
      {!decorative && status === 'error' ? (
        <Typography
          role="alert"
          variant="body2"
          color="error.main"
          sx={{ gridArea: '1 / 1', p: 1, textAlign: 'center', overflowWrap: 'anywhere' }}
        >
          {errorLabel}
        </Typography>
      ) : null}
      <Box
        component="img"
        src={src}
        alt={decorative ? '' : alt}
        loading={loading}
        decoding="async"
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
        sx={{
          gridArea: '1 / 1',
          display: 'block',
          visibility: status === 'loaded' ? 'visible' : 'hidden',
          ...(reveal === 'fade' && status === 'loaded'
            ? {
                animation: `${revealImage} 700ms ease-out both`,
                '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
              }
            : {}),
          ...(fit === 'cover' || sizing === 'fill'
            ? { position: 'absolute', inset: 0, width: '100%', height: '100%' }
            : {
                maxWidth: '100%',
                maxHeight: sizing === 'full-width' ? 'none' : 'inherit',
                width: sizing === 'full-width' ? '100%' : 'auto',
                height: 'auto',
              }),
          objectFit: fit,
        }}
      />
    </Box>
  )
}
