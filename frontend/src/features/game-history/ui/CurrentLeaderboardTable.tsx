import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../shared/auth/use-auth.ts'
import { TeamStandingsTable } from '../../../shared/game-ui/index.ts'
import { formatHistoryTeamName } from '../model/game-history-formatters.ts'
import type { LeaderboardResult } from '../model/leaderboard-results.ts'

export function CurrentLeaderboardTable({
  entries,
  selectedTeamId,
  onSelectTeam,
  inlineDetails = true,
}: {
  entries: readonly LeaderboardResult[]
  selectedTeamId: string | null
  onSelectTeam: (teamId: string) => void
  inlineDetails?: boolean
}) {
  const { t } = useTranslation()
  const { user } = useAuth()
  return (
    <TeamStandingsTable
      entries={entries.map((entry) => ({
        id: entry.teamId,
        name: formatHistoryTeamName(t, entry.teamName, entry.teamSlotIndex),
        players: entry.participantNames,
        rank: entry.rank,
        roundsPlayed: entry.roundsPlayed,
        totalKills: entry.totalKills,
        totalBounties: entry.totalBounties,
        finalScore: entry.finalScore,
        ownTeam: entry.rounds.some((round) =>
          round.participants.some((participant) => participant.userId === user?.id),
        ),
      }))}
      selection={{ teamId: selectedTeamId, onSelect: onSelectTeam, inlineDetails }}
    />
  )
}
