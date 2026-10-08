import { AdminTeamNumber } from './AdminTeamNumber.tsx'
import { Box } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ItemCard, SelectionRow, StatusBadge } from '../../../shared/ui/index.ts'
import type { OrderedAdminTeamEntry } from './admin-registration-components.tsx'
import { AdminTeamOrderHandle } from './AdminTeamOrderHandle.tsx'
import type { AdminRegistrationPanelProps } from './AdminRegistrationPanel.tsx'
import { TeamIdentity } from '../../../shared/game-ui/index.ts'
import { AdminTeamStatusBlock } from './AdminTeamStatusBlock.tsx'

interface AdminRegistrationTeamsListProps {
  controls: AdminRegistrationPanelProps
  orderedTeamEntries: OrderedAdminTeamEntry[]
  visibleTeamIds: ReadonlySet<string>
  selectedTeamId: string | undefined
  onSelect: (teamId: string) => void
}

export function AdminRegistrationTeamsList({
  controls,
  orderedTeamEntries,
  visibleTeamIds,
  selectedTeamId,
  onSelect,
}: AdminRegistrationTeamsListProps) {
  const { t } = useTranslation()
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [targetSlot, setTargetSlot] = useState<string | null>(null)
  const clearDrag = () => {
    setDraggedId(null)
    setTargetSlot(null)
  }
  const { snapshot, isAssigningPlayer, isMovingTeam, onMoveTeam } = controls
  const rosterRows = Math.max(1, ...orderedTeamEntries.map(({ team }) => team.members.length))
  const canReorderTeams =
    !isMovingTeam &&
    !isAssigningPlayer &&
    (snapshot.gameStatus === 'ready' || snapshot.gameStatus === 'active')

  return (
    <>
      {orderedTeamEntries.map(({ slot, team }, index) => {
        if (!visibleTeamIds.has(team.teamId)) return null
        const membersCount = team.members.length

        return (
          <ItemCard
            key={team.teamId}
            tone={index % 2 ? 'alternate' : 'default'}
            frame={targetSlot === slot.teamSlotId ? 'corner' : 'standard'}
            onDragOver={(event) => {
              if (!canReorderTeams || !draggedId || draggedId === team.teamId) return
              event.preventDefault()
              event.dataTransfer.dropEffect = 'move'
              setTargetSlot(slot.teamSlotId)
              const region = event.currentTarget.closest('[role="region"]')
              if (region) {
                const bounds = region.getBoundingClientRect()
                if (event.clientY < bounds.top + 48) region.scrollTop -= 16
                else if (event.clientY > bounds.bottom - 48) region.scrollTop += 16
              }
            }}
            onDragLeave={(event) => {
              if (!(
                event.relatedTarget instanceof Node &&
                event.currentTarget.contains(event.relatedTarget)
              ))
                setTargetSlot(null)
            }}
            onDrop={(event) => {
              event.preventDefault()
              if (
                canReorderTeams &&
                draggedId &&
                draggedId !== team.teamId &&
                orderedTeamEntries.some((entry) => entry.team.teamId === draggedId)
              )
                onMoveTeam(draggedId, slot.teamSlotId)
              clearDrag()
            }}
            data-testid={`admin-slot-${slot.teamSlotIndex}`}
            density="flush"
            sx={{
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 0,
              opacity: draggedId === team.teamId ? 0.6 : 1,
            }}
          >
            <AdminTeamOrderHandle
              name={team.name || t('common.teamWithSlot', { slot: team.teamSlotIndex })}
              disabled={!canReorderTeams || orderedTeamEntries.length < 2}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'move'
                event.dataTransfer.setData('text/plain', team.teamId)
                const row = event.currentTarget.closest('[data-testid^="admin-slot-"]')
                if (row) event.dataTransfer.setDragImage(row, 20, 20)
                setDraggedId(team.teamId)
              }}
              onDragEnd={clearDrag}
            />
            <SelectionRow
              selected={selectedTeamId === team.teamId}
              selectionAppearance="outline"
              tone={index % 2 ? 'alternate' : 'default'}
              density="compact"
              onClick={() => onSelect(team.teamId)}
              aria-label={t('teamRegistrations.selectTeam', {
                name: team.name || t('common.teamWithSlot', { slot: team.teamSlotIndex }),
              })}
              sx={{ flex: 1, minWidth: 0 }}
            >
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'minmax(0, 1fr) 168px' },
                  gap: 1,
                  width: '100%',
                  alignItems: 'start',
                }}
              >
                <TeamIdentity
                  compact
                  alignment="center"
                  divider
                  textFlow="singleLine"
                  minimumParticipantRows={rosterRows}
                  name={team.name || t('common.teamWithSlot', { slot: team.teamSlotIndex })}
                  participants={team.members.map(({ player }) => player.displayName)}
                  emptyLabel={t('gameApplication.adminPanel.emptyTeam')}
                  leading={<AdminTeamNumber team={team} />}
                  status={
                    <StatusBadge
                      density="compact"
                      variant="outlined"
                      textFlow="singleLine"
                      label={membersCount + '/' + snapshot.maxPlayersPerTeam}
                      aria-label={t('teamRegistrations.rosterCount', {
                        count: membersCount,
                        max: snapshot.maxPlayersPerTeam,
                      })}
                    />
                  }
                />
                <AdminTeamStatusBlock team={team} />
              </Box>
            </SelectionRow>
          </ItemCard>
        )
      })}
    </>
  )
}
