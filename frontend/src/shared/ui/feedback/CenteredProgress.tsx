import { Box, CircularProgress, Stack, Typography } from '@mui/material'

interface CenteredProgressProps {
  minHeight?: string | number
  message?: string
}

export function CenteredProgress({ minHeight = 240, message }: CenteredProgressProps) {
  return (
    <Box
      sx={{
        minHeight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Stack spacing={2} alignItems="center">
        <CircularProgress size={28} />
        {message ? (
          <Typography variant="body2" color="text.secondary">
            {message}
          </Typography>
        ) : null}
      </Stack>
    </Box>
  )
}
