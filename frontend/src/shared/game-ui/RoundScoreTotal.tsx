import { Box, Stack, Typography } from '@mui/material'
import { SectionDivider } from '../ui/index.ts'
import { broadcastUpdateSx } from './broadcast-motion.ts'

export function RoundScoreTotal({
  label,
  value,
  score,
  animateChanges = false,
}: {
  label: string
  value: string
  score: number
  animateChanges?: boolean
}) {
  return (
    <Stack spacing={1}>
      <SectionDivider>
        <Box
          aria-hidden
          component="span"
          sx={{
            display: 'block',
            width: 6,
            height: 6,
            transform: 'rotate(45deg)',
            bgcolor: 'text.secondary',
          }}
        />
      </SectionDivider>
      <Box
        component="dl"
        sx={{
          m: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Typography component="dt" variant="body1" fontWeight={700}>
          {label}
        </Typography>
        <Typography
          component="dd"
          variant="h5"
          fontWeight={800}
          sx={{
            m: 0,
            textAlign: 'right',
            overflowWrap: 'anywhere',
            color: score > 0 ? 'success.main' : score < 0 ? 'error.main' : 'text.primary',
          }}
        >
          {animateChanges ? (
            <Box
              component="span"
              key={value}
              sx={{ display: 'inline-block', ...broadcastUpdateSx }}
            >
              {value}
            </Box>
          ) : (
            value
          )}
        </Typography>
      </Box>
    </Stack>
  )
}
