import { RegistrationTeamMarker } from './RegistrationTeamMarker.tsx'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ItemCard, SelectionRow, StatusBadge } from '../../../shared/ui/index.ts'
import type { OrderedAdminTeamEntry } from './admin-registration-components.tsx'
import { AdminTeamOrderHandle } from './AdminTeamOrderHandle.tsx'
import type { AdminRegistrationPanelProps } from './AdminRegistrationPanel.tsx'
import { TeamPresentation } from '../../../shared/game-ui/index.ts'
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
  const canReorderTeams =
    !isMovingTeam &&
    !isAssigningPlayer &&
    (snapshot.gameStatus === 'ready' || snapshot.gameStatus === 'active')

  return (
    <>
      {orderedTeamEntries.map(({ slot, team }, index) => {
        if (!visibleTeamIds.has(team.teamId)) return null

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
              <TeamPresentation
                density="compact"
                name={team.name || t('common.teamWithSlot', { slot: team.teamSlotIndex })}
                members={team.members.map(({ player, readyAtUtc }) => ({
                  id: player.userId,
                  name: player.displayName,
                  detail: (
                    <StatusBadge
                      density="tight"
                      size="small"
                      color={readyAtUtc ? 'success' : 'default'}
                      variant={readyAtUtc ? 'filled' : 'outlined'}
                      label={t(
                        readyAtUtc
                          ? 'gameApplication.playerReady'
                          : 'gameApplication.playerNotReady',
                      )}
                    />
                  ),
                }))}
                emptyLabel={t('gameApplication.adminPanel.emptyTeam')}
                leading={
                  <RegistrationTeamMarker team={team} capacity={snapshot.maxPlayersPerTeam} />
                }
                status={<AdminTeamStatusBlock team={team} />}
              />
            </SelectionRow>
          </ItemCard>
        )
      })}
    </>
  )
}
