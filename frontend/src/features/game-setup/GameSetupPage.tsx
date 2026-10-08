import { Box } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageShell, PageStatePanel, SectionCard } from '../../shared/ui/index.ts'
import { GameSetupBoardNotices } from './ui/GameSetupBoardNotices.tsx'
import { GameSetupEmptyState } from './ui/GameSetupEmptyState.tsx'
import { GameSetupGrid } from './ui/GameSetupGrid.tsx'
import { GameSetupRegistrationPanel } from './ui/GameSetupRegistrationPanel.tsx'
import { GameSetupSettingsSidebar } from './ui/GameSetupSettingsSidebar.tsx'
import { GameSetupSyncActions } from './ui/GameSetupSyncActions.tsx'
import { useGameSetupPage } from './use-game-setup-page.ts'

export function GameSetupPage() {
  const { t } = useTranslation()
  const [isPublishing, setIsPublishing] = useState(false)
  const {
    snapshot,
    draft,
    isLoading,
    isError,
    isDirty,
    syncStatus,
    remoteChangeNotice,
    draftRemovedNotice,
    saveErrorMessage,
    resetErrorMessage,
    updateDraft,
    commitDraft,
    applyLayoutChange,
    reloadFromServer,
    createDraft,
    deleteDraft,
    isCreating,
    isResetting,
    isSaving,
    cellMediaDisplayByCellId,
    isCellMediaBusy,
    hasPendingMedia,
    cellMediaErrorKey,
    uploadCellMedia,
    deleteCellMedia,
    dismissCellMediaError,
    dismissRemoteChangeNotice,
    dismissDraftRemovedNotice,
  } = useGameSetupPage()

  if (isLoading) {
    return (
      <PageStatePanel title={t('gameSetup.title')} message={t('gameSetup.loading')} showSpinner />
    )
  }

  if (isError) {
    return (
      <PageStatePanel
        title={t('gameSetup.title')}
        message={t('gameSetup.errorLoading')}
        tone="error"
      />
    )
  }

  if (!snapshot || !draft) {
    return (
      <GameSetupEmptyState
        draftRemovedNotice={draftRemovedNotice}
        onDismissDraftRemovedNotice={dismissDraftRemovedNotice}
        isCreating={isCreating}
        onCreate={async (title) => {
          await createDraft({ title })
        }}
      />
    )
  }

  return (
    <Box
      component="fieldset"
      aria-label={t('gameSetup.title')}
      disabled={isPublishing}
      sx={{ border: 0, m: 0, p: 0, minWidth: 0, minHeight: 0, flex: '1 1 0%', display: 'flex' }}
    >
      <PageShell variant="split" sx={{ width: '100%', overflow: 'hidden' }}>
        <GameSetupSettingsSidebar
          draft={draft}
          onDraftChange={updateDraft}
          onDraftCommit={commitDraft}
          onLayoutChange={applyLayoutChange}
          isResetting={isResetting}
          isBusy={isSaving || hasPendingMedia || isPublishing}
          onReset={deleteDraft}
          status={<GameSetupSyncActions syncStatus={syncStatus} isDirty={isDirty} />}
        >
          <GameSetupBoardNotices
            remoteChangeNotice={remoteChangeNotice}
            onDismissRemoteChange={dismissRemoteChangeNotice}
            onReloadFromServer={() => void reloadFromServer()}
            saveErrorMessage={saveErrorMessage}
            resetErrorMessage={resetErrorMessage}
            cellMediaErrorKey={cellMediaErrorKey}
            onDismissCellMediaError={dismissCellMediaError}
          />
          <GameSetupRegistrationPanel
            key={`${snapshot.gameId}:${snapshot.version}`}
            snapshot={snapshot}
            isDirty={isDirty}
            isSaving={isSaving}
            isResetting={isResetting}
            remoteChangeNotice={remoteChangeNotice}
            hasPendingMedia={hasPendingMedia}
            onReloadFromServer={reloadFromServer}
            onBusyChange={setIsPublishing}
          />
        </GameSetupSettingsSidebar>

        <SectionCard
          role="region"
          aria-label={t('gameSetup.boardTitle')}
          tabIndex={0}
          sx={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box>
            <GameSetupGrid
              snapshot={snapshot}
              draft={draft}
              onDraftChange={updateDraft}
              onDraftCommit={commitDraft}
              cellMediaDisplayByCellId={cellMediaDisplayByCellId}
              isCellMediaBusy={isCellMediaBusy}
              onUploadCellMedia={(cellId, file) => void uploadCellMedia(cellId, file)}
              onDeleteCellMedia={deleteCellMedia}
            />
          </Box>
        </SectionCard>
      </PageShell>
    </Box>
  )
}
