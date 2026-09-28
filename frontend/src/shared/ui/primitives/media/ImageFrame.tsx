import { Box, Stack, Typography, type SxProps, type Theme } from '@mui/material'
import { useState } from 'react'
import { mergeSx } from '../../../theme/merge-sx.ts'
import { BusyIndicator } from '../../feedback/progress/BusyIndicator.tsx'

interface ImageFrameProps {
  src: string
  alt: string
  loadingLabel: string
  errorLabel: string
  fit?: 'contain' | 'cover'
  decorative?: boolean
  loading?: 'lazy' | 'eager'
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
  decorative = false,
  loading,
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
          ...(fit === 'cover'
            ? { position: 'absolute', inset: 0, width: '100%', height: '100%' }
            : { maxWidth: '100%', maxHeight: 'inherit', width: 'auto', height: 'auto' }),
          objectFit: fit,
        }}
      />
    </Box>
  )
}
