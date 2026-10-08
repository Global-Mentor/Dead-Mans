import { useTranslation } from 'react-i18next'
import { PageShell, PageStatePanel } from '../../shared/ui/index.ts'
import { GameSetupBoardNotices } from './ui/GameSetupBoardNotices.tsx'
import { GameSetupEmptyState } from './ui/GameSetupEmptyState.tsx'
import { GameSetupModifiersSection } from './ui/GameSetupModifiersSection.tsx'
import { GameSetupSyncActions } from './ui/GameSetupSyncActions.tsx'
import { useGameSetupPage } from './use-game-setup-page.ts'

export function AdminGameModifiersPage() {
  const { t } = useTranslation()
  const {
    draft,
    isLoading,
    isError,
    syncStatus,
    isDirty,
    saveErrorMessage,
    resetErrorMessage,
    cellMediaErrorKey,
    remoteChangeNotice,
    draftRemovedNotice,
    reloadFromServer,
    toggleModifier,
    setModifiersEnabled,
    isSaving,
    dismissRemoteChangeNotice,
    dismissDraftRemovedNotice,
    dismissCellMediaError,
  } = useGameSetupPage()

  if (isLoading) {
    return (
      <PageStatePanel
        title={t('navigation.items.adminModifiers.label')}
        message={t('gameSetup.loading')}
        showSpinner
      />
    )
  }

  if (isError) {
    return (
      <PageStatePanel
        title={t('navigation.items.adminModifiers.label')}
        message={t('gameSetup.errorLoading')}
        tone="error"
      />
    )
  }

  if (!draft) {
    return (
      <GameSetupEmptyState
        draftRemovedNotice={draftRemovedNotice}
        onDismissDraftRemovedNotice={dismissDraftRemovedNotice}
      />
    )
  }

  return (
    <PageShell
      sx={{
        width: '100%',
        maxWidth: 1200,
        flex: '1 1 0%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      <GameSetupModifiersSection
        draft={draft}
        onToggle={toggleModifier}
        onBulkSetEnabled={setModifiersEnabled}
        isSaving={isSaving}
        actions={<GameSetupSyncActions syncStatus={syncStatus} isDirty={isDirty} />}
      />

      <GameSetupBoardNotices
        remoteChangeNotice={remoteChangeNotice}
        onDismissRemoteChange={dismissRemoteChangeNotice}
        onReloadFromServer={() => void reloadFromServer()}
        saveErrorMessage={saveErrorMessage}
        resetErrorMessage={resetErrorMessage}
        cellMediaErrorKey={cellMediaErrorKey}
        onDismissCellMediaError={dismissCellMediaError}
      />
    </PageShell>
  )
}
