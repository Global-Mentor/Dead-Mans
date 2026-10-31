import { Stack, Typography } from '@mui/material'
import { ItemCard } from '../ui/index.ts'
import { TeamPresentation } from './TeamPresentation.tsx'

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
      <Stack spacing={0.75}>
        <Typography component="h2" variant="overline" color="text.secondary" textAlign="center">
          {label}
        </Typography>
        <TeamPresentation
          density="compact"
          name={name}
          members={participants.map((name, index) => ({ id: String(index), name }))}
          emptyLabel={emptyLabel}
        />
      </Stack>
    </ItemCard>
  )
}
