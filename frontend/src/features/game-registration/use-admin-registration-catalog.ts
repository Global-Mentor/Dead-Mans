import { useMemo, useState } from 'react'
import type {
  GameRegistrationAdminSnapshot,
  RegistrationTeam,
} from '../../shared/api/contracts/index.ts'
import { canConfirmAdminTeam } from './model/admin-team-readiness.ts'

export function useAdminRegistrationCatalog(snapshot: GameRegistrationAdminSnapshot) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const sortedTeamSlots = useMemo(
    () => [...snapshot.teamSlots].sort((left, right) => left.teamSlotIndex - right.teamSlotIndex),
    [snapshot.teamSlots],
  )

  const teamsById = useMemo(
    () => new Map(snapshot.teams.map((team) => [team.teamId, team])),
    [snapshot.teams],
  )

  const orderedTeamEntries = useMemo(
    () =>
      sortedTeamSlots.reduce<
        { slot: GameRegistrationAdminSnapshot['teamSlots'][number]; team: RegistrationTeam }[]
      >((entries, slot) => {
        if (!slot.teamId) {
          return entries
        }

        const team = teamsById.get(slot.teamId)
        if (!team) {
          return entries
        }

        entries.push({ slot, team })
        return entries
      }, []),
    [sortedTeamSlots, teamsById],
  )

  const hasAvailableCreateTeamSlot = sortedTeamSlots.some((slot) => slot.isAvailableForNewTeam)
  const disbandRequestsCount = orderedTeamEntries.filter(
    ({ team }) => team.disbandRequestedAtUtc != null,
  ).length
  const visibleEntries = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return orderedTeamEntries.filter(({ team }) => {
      const matchesStatus =
        status === 'all' ||
        (status === 'ready'
          ? canConfirmAdminTeam(team, snapshot.minPlayersPerTeam, snapshot.maxPlayersPerTeam)
          : status === 'requests'
            ? team.disbandRequestedAtUtc != null
            : status === 'played'
              ? team.isPlayed
              : team.status === status)
      return (
        matchesStatus &&
        (!query ||
          [
            team.name,
            String(team.teamSlotIndex),
            ...team.members.flatMap(({ player }) => [player.displayName, player.login]),
            ...(team.pendingInvitations ?? []).flatMap(({ player }) => [
              player.displayName,
              player.login,
            ]),
          ].some((value) => value?.toLocaleLowerCase().includes(query)))
      )
    })
  }, [orderedTeamEntries, search, status, snapshot.minPlayersPerTeam, snapshot.maxPlayersPerTeam])
  const assignableTeams = snapshot.teams.filter(
    (team) =>
      team.status === 'forming' &&
      team.members.length + (team.pendingInvitations?.length ?? 0) < snapshot.maxPlayersPerTeam,
  )

  return {
    search,
    setSearch,
    status,
    setStatus,
    orderedTeamEntries,
    hasAvailableCreateTeamSlot,
    disbandRequestsCount,
    visibleEntries,
    assignableTeams,
  }
}
