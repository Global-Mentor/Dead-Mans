import { Alert, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { PageShell, SectionCard } from '../../../shared/ui/index.ts'
import { gameSetupSidebarPaperSx } from '../theme/layout-sx.ts'

interface GameSetupEmptyStateProps {
  draftRemovedNotice: boolean
  onDismissDraftRemovedNotice: () => void
}

export function GameSetupEmptyState({
  draftRemovedNotice,
  onDismissDraftRemovedNotice,
}: GameSetupEmptyStateProps) {
  const { t } = useTranslation()

  return (
    <PageShell variant="split">
      <SectionCard inset sx={gameSetupSidebarPaperSx}>
        <Typography variant="overline" color="text.secondary">
          {t('gameSetup.settingsSidebar.overline')}
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5 }}>
          {t('gameSetup.settingsSidebar.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {t('gameSetup.emptyPanel.description')}
        </Typography>
      </SectionCard>

      <SectionCard
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <Typography variant="h5" gutterBottom>
          {t('gameSetup.boardTitle')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('gameSetup.empty')}
        </Typography>
        {draftRemovedNotice ? (
          <Alert severity="warning" sx={{ mt: 2 }} onClose={onDismissDraftRemovedNotice}>
            {t('gameSetup.draftRemovedNotice')}
          </Alert>
        ) : null}
      </SectionCard>
    </PageShell>
  )
}
