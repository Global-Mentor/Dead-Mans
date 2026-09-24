import { Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { InlineNotice, PageShell, SectionCard, SectionHeader } from '../../../shared/ui/index.ts'
import { gameSetupSidebarPaperSx } from '../theme/layout-sx.ts'
import { CreateGameSetupPanel } from './CreateGameSetupPanel.tsx'

interface GameSetupEmptyStateProps {
  draftRemovedNotice: boolean
  onDismissDraftRemovedNotice: () => void
  isCreating?: boolean
  onCreate?: (title: string) => Promise<void>
}

export function GameSetupEmptyState({
  draftRemovedNotice,
  onDismissDraftRemovedNotice,
  isCreating = false,
  onCreate,
}: GameSetupEmptyStateProps) {
  const { t } = useTranslation()

  return (
    <PageShell variant="split">
      <SectionCard surface="accented" sx={gameSetupSidebarPaperSx}>
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
        }}
      >
        <SectionHeader
          headingLevel="h1"
          title={t('gameSetup.boardTitle')}
          description={t('gameSetup.empty')}
        />

        {draftRemovedNotice ? (
          <InlineNotice severity="warning" sx={{ mt: 2 }} onClose={onDismissDraftRemovedNotice}>
            {t('gameSetup.draftRemovedNotice')}
          </InlineNotice>
        ) : null}

        {onCreate != null ? (
          <CreateGameSetupPanel isSubmitting={isCreating} onCreate={onCreate} />
        ) : null}
      </SectionCard>
    </PageShell>
  )
}
