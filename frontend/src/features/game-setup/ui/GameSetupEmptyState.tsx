import { useTranslation } from 'react-i18next'
import { gameSetupRoute } from '../../../routes/app-routes.ts'
import { AppLinkButton, InlineNotice, PageStatePanel } from '../../../shared/ui/index.ts'
import { CreateGameSetupPanel } from './CreateGameSetupPanel.tsx'

interface GameSetupEmptyStateProps {
  title: string
  draftRemovedNotice: boolean
  onDismissDraftRemovedNotice: () => void
  isCreating?: boolean
  onCreate?: (title: string) => Promise<void>
}

export function GameSetupEmptyState({
  title,
  draftRemovedNotice,
  onDismissDraftRemovedNotice,
  isCreating = false,
  onCreate,
}: GameSetupEmptyStateProps) {
  const { t } = useTranslation()

  return (
    <PageStatePanel variant="page" title={title} message={t('gameSetup.empty')}>
      {draftRemovedNotice ? (
        <InlineNotice severity="warning" onClose={onDismissDraftRemovedNotice}>
          {t('gameSetup.draftRemovedNotice')}
        </InlineNotice>
      ) : null}

      {onCreate != null ? (
        <CreateGameSetupPanel isSubmitting={isCreating} onCreate={onCreate} />
      ) : (
        <AppLinkButton to={gameSetupRoute.fullPath} sx={{ alignSelf: 'flex-start' }}>
          {t('navigation.items.gameSetup.label')}
        </AppLinkButton>
      )}
    </PageStatePanel>
  )
}
