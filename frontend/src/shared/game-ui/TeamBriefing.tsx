import type { ReactNode } from 'react'
import { Box, Stack, Typography } from '@mui/material'
import { TeamHeading } from './TeamHeading.tsx'
import { ParticipantNamesList } from './ParticipantNamesList.tsx'
import { RoundBriefingDivider } from './RoundBriefingPanel.tsx'

/** Team presentation shared by current-round and recorded-result panels. */
export function TeamBriefing({
  name,
  participants,
  emptyLabel,
  roster,
  leading,
  status,
}: {
  name: string
  participants: readonly string[]
  emptyLabel: string
  roster?: ReactNode
  leading?: ReactNode
  status?: ReactNode
}) {
  return (
    <Stack
      spacing={1.25}
      alignItems="center"
      sx={{ minWidth: 0, width: '100%', textAlign: 'center', overflowWrap: 'anywhere' }}
    >
      {leading || status ? (
        <TeamHeading name={name} leading={leading} status={status} alignment="center" prominent />
      ) : (
        <Typography
          component="h3"
          variant="h5"
          fontWeight={700}
          color="text.primary"
          sx={{ m: 0, maxWidth: '100%', flexShrink: 0 }}
        >
          {name}
        </Typography>
      )}
      <RoundBriefingDivider sx={{ maxWidth: 420 }} />
      <Box sx={{ width: '100%', minWidth: 0, flexShrink: 0 }}>
        {roster ?? (
          <ParticipantNamesList
            names={participants}
            emptyLabel={emptyLabel}
            variant="body1"
            layout={participants.length === 2 ? 'flow' : 'columns'}
            decorated
            dense
          />
        )}
      </Box>
    </Stack>
  )
}
