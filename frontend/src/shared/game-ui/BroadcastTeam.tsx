import { Box, Stack, Typography } from '@mui/material'
import { ItemCard } from '../ui/index.ts'
import { ParticipantNamesList } from './ParticipantNamesList.tsx'

export function BroadcastTeam({
  name,
  participants,
  label,
  emptyLabel,
}: {
  name: string
  participants: readonly string[]
  label: string
  emptyLabel: string
}) {
  return (
    <ItemCard frame="corner" data-testid="overlay-team">
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)',
          gap: 3,
          alignItems: 'center',
        }}
      >
        <Stack spacing={0.25} sx={{ minWidth: 0, textAlign: 'center', overflowWrap: 'anywhere' }}>
          <Typography component="h2" variant="overline" color="text.secondary">
            {label}
          </Typography>
          <Typography component="h3" variant="h5" fontWeight={700}>
            {name}
          </Typography>
        </Stack>
        <Box sx={{ minWidth: 0, borderLeft: '1px solid', borderColor: 'divider' }}>
          <ParticipantNamesList
            names={participants}
            emptyLabel={emptyLabel}
            variant="body1"
            direction="row"
            layout="columns"
            alignment="center"
            decorated
            markerPlacement="none"
            dense
          />
        </Box>
      </Box>
    </ItemCard>
  )
}
