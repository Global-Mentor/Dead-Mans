import { Box } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { TabStrip, TabOption } from '../../../shared/ui/index.ts'
import { AdminCreateTeamButton } from './AdminCreateTeamButton.tsx'

export function AdminTeamWorkspaceHeader({
  workspaceId,
  activePanel,
  onPanelChange,
  playerCount,
  canCreate,
  isCreating,
  onCreate,
}: {
  workspaceId: string
  activePanel: string
  onPanelChange: (panel: string) => void
  playerCount: number
  canCreate: boolean
  isCreating: boolean
  onCreate: (open: boolean) => void
}) {
  const { t } = useTranslation()
  return (
    <Box
      sx={{
        flexShrink: 0,
        display: 'grid',
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'repeat(3, minmax(0, 1fr))' },
        alignItems: 'stretch',
        gap: 1,
        mb: 1,
        overflow: 'hidden',
        scrollbarWidth: 'thin',
        scrollbarGutter: 'stable both-edges',
      }}
      data-testid="admin-team-workspace-header"
    >
      <Box sx={{ display: { xs: 'none', lg: 'block' }, minWidth: 0, gridColumn: 'span 2' }}>
        <TabStrip
          appearance="framed"
          density="comfortable"
          variant="fullWidth"
          stretch
          value={activePanel === 'players' ? 'players' : 'detail'}
          onChange={(_, value: string) => onPanelChange(value)}
          aria-label={t('teamRegistrations.workspace')}
        >
          <TabOption
            appearance="framed"
            density="comfortable"
            value="detail"
            id={workspaceId + '-desktop-detail-tab'}
            aria-controls={workspaceId + '-detail-panel'}
            label={t('teamRegistrations.teamsPane')}
          />
          <TabOption
            appearance="framed"
            density="comfortable"
            value="players"
            id={workspaceId + '-desktop-players-tab'}
            aria-controls={workspaceId + '-players-panel'}
            label={t('teamRegistrations.playersTab', { count: playerCount })}
          />
        </TabStrip>
      </Box>
      <AdminCreateTeamButton canCreate={canCreate} isCreating={isCreating} onCreate={onCreate} />
    </Box>
  )
}
