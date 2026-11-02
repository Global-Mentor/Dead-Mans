import { Typography } from '@mui/material'
import type { components } from '../api/contracts/generated'
import { TeamStandingsTable } from './TeamStandingsTable.tsx'
import { BroadcastLeaderboardLayout } from './BroadcastLeaderboardLayout.tsx'

const pageSize = 6

export function BroadcastLeaderboard({
  entries,
  page,
  labels,
}: {
  entries: readonly components['schemas']['GameOverlayLeaderboardEntryDto'][]
  page: number
  labels: {
    teamFallback: (slot: number) => string
    page: (current: number, total: number) => string
  }
}) {
  const pages = Math.max(1, Math.ceil(entries.length / pageSize))
  const currentPage = Math.max(0, Math.min(page, pages - 1))
  return (
    <BroadcastLeaderboardLayout>
      <TeamStandingsTable
        broadcast
        entries={entries
          .slice(currentPage * pageSize, (currentPage + 1) * pageSize)
          .map((entry) => ({
            id: String(entry.slotIndex),
            name: entry.name || labels.teamFallback(entry.slotIndex),
            players: entry.players,
            rank: entry.rank,
            roundsPlayed: entry.roundsPlayed,
            totalKills: entry.totalKills,
            totalBounties: entry.totalBounties,
            finalScore: entry.finalScore,
          }))}
        footer={
          pages > 1 ? (
            <Typography variant="body2" textAlign="center" sx={{ mt: 1 }}>
              {labels.page(currentPage + 1, pages)}
            </Typography>
          ) : null
        }
      />
    </BroadcastLeaderboardLayout>
  )
}
