import { Alert, Box, Button, Chip, Paper, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { PageStatePanel } from '../../shared/ui/PageStatePanel.tsx'
import { CreateGameSetupDialog } from './ui/CreateGameSetupDialog.tsx'
import { gameSetupSidebarPaperSx } from './ui/game-setup-ui-styles.ts'
import { GameSetupGrid } from './ui/GameSetupGrid.tsx'
import { GameSetupSettingsSidebar } from './ui/GameSetupSettingsSidebar.tsx'
import type { GameSetupSyncStatus } from './use-game-setup-page.ts'
import { useGameSetupPage } from './use-game-setup-page.ts'
import { GameSetupRegistrationPlannedSection } from './ui/GameSetupRegistrationPlannedSection.tsx'
import { GameSetupModifiersSection } from './ui/GameSetupModifiersSection.tsx'
import { GameSetupQuestionsSection } from './ui/GameSetupQuestionsSection.tsx'

function getSyncChipProps(syncStatus: GameSetupSyncStatus, isDirty: boolean) {
  switch (syncStatus) {
    case 'saving':
      return { color: 'info' as const, labelKey: 'gameSetup.sync.saving' }
    case 'saved':
      return { color: 'success' as const, labelKey: 'gameSetup.sync.saved' }
    case 'error':
      return { color: 'error' as const, labelKey: 'gameSetup.sync.error' }
    case 'conflict':
      return { color: 'warning' as const, labelKey: 'gameSetup.sync.conflict' }
    default:
      return {
        color: isDirty ? ('warning' as const) : ('default' as const),
        labelKey: isDirty ? 'gameSetup.sync.pending' : 'gameSetup.sync.saved',
      }
  }
}

export function GameSetupPage() {
  const { t } = useTranslation()
  const {
    snapshot,
    draft,
    isLoading,
    isError,
    isEmpty,
    isDirty,
    syncStatus,
    remoteChangeNotice,
    draftRemovedNotice,
    saveErrorMessage,
    resetErrorMessage,
    updateDraft,
    applyLayoutChange,
    saveDraft,
    reloadFromServer,
    createDraft,
    deleteDraft,
    isCreating,
    isResetting,
    isSaving,
    cellMediaDisplayByCellId,
    isCellMediaBusy,
    cellMediaErrorMessage,
    uploadCellMedia,
    deleteCellMedia,
    dismissCellMediaError,
    dismissRemoteChangeNotice,
    dismissDraftRemovedNotice,
    toggleModifier,
  } = useGameSetupPage()

  const syncChip = getSyncChipProps(syncStatus, isDirty)

  if (isLoading) {
    return (
      <PageStatePanel
        title={t('gameSetup.title')}
        message={t('gameSetup.loading')}
        showSpinner
      />
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
      <>
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 2,
            alignItems: 'stretch',
            minHeight: 0,
          }}
        >
          <Paper variant="outlined" sx={gameSetupSidebarPaperSx}>
            <Typography variant="overline" color="text.secondary">
              {t('gameSetup.settingsSidebar.overline')}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5 }}>
              {t('gameSetup.settingsSidebar.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {t('gameSetup.emptyPanel.description')}
            </Typography>
          </Paper>

          <Paper
            sx={{
              flex: 1,
              minWidth: 0,
              p: { xs: 2, md: 3 },
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
              <Alert severity="warning" sx={{ mt: 2 }} onClose={dismissDraftRemovedNotice}>
                {t('gameSetup.draftRemovedNotice')}
              </Alert>
            ) : null}
            <GameSetupRegistrationPlannedSection />
          </Paper>
        </Box>
        <CreateGameSetupDialog
          open={isEmpty}
          isSubmitting={isCreating}
          onCreate={async (title) => {
            await createDraft({ title })
          }}
        />
      </>
    )
  }

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        gap: 2,
        alignItems: 'stretch',
        minHeight: 0,
      }}
    >
      <GameSetupSettingsSidebar
        draft={draft}
        onDraftChange={updateDraft}
        onLayoutChange={applyLayoutChange}
        isResetting={isResetting}
        onReset={deleteDraft}
      />

      <Paper
        sx={{
          flex: 1,
          minWidth: 0,
          p: { xs: 2, md: 3 },
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', sm: 'flex-start' }}
        >
          <Box>
            <Typography variant="h5" gutterBottom>
              {t('gameSetup.boardTitle')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('gameSetup.boardDescription')}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
            <Chip size="small" color="warning" label={t('gameSetup.draftBadge')} />
            <Chip size="small" color={syncChip.color} label={t(syncChip.labelKey)} />
            <Button
              variant="contained"
              disabled={!isDirty || isSaving}
              onClick={() => void saveDraft()}
            >
              {isSaving ? t('gameSetup.saving') : t('gameSetup.save')}
            </Button>
          </Stack>
        </Stack>

        <Alert severity="info" sx={{ mt: 2 }}>
          {t('gameSetup.persistenceHint')}
        </Alert>

        <GameSetupModifiersSection draft={draft} onToggle={toggleModifier} />
        <GameSetupQuestionsSection />

        {remoteChangeNotice ? (
          <Alert
            severity="warning"
            sx={{ mt: 2 }}
            onClose={dismissRemoteChangeNotice}
            action={
              <Button color="inherit" size="small" onClick={() => void reloadFromServer()}>
                {t('gameSetup.reloadFromServer')}
              </Button>
            }
          >
            {t('gameSetup.remoteChangeNotice')}
          </Alert>
        ) : null}

        {saveErrorMessage ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {saveErrorMessage === 'saveFailed'
              ? t('gameSetup.saveFailed')
              : t(`gameSetup.${saveErrorMessage}`)}
          </Alert>
        ) : null}

        {resetErrorMessage ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {t('gameSetup.resetFailed')}
          </Alert>
        ) : null}

        {cellMediaErrorMessage ? (
          <Alert severity="error" sx={{ mt: 2 }} onClose={dismissCellMediaError}>
            {cellMediaErrorMessage}
          </Alert>
        ) : null}

        <Box sx={{ mt: 3, flex: 1, minHeight: 0 }}>
          <GameSetupGrid
            snapshot={snapshot}
            draft={draft}
            onDraftChange={updateDraft}
            cellMediaDisplayByCellId={cellMediaDisplayByCellId}
            isCellMediaBusy={isCellMediaBusy}
            onUploadCellMedia={(cellId, file) => void uploadCellMedia(cellId, file)}
            onDeleteCellMedia={deleteCellMedia}
          />
        </Box>

        <GameSetupRegistrationPlannedSection />
      </Paper>
    </Box>
  )
}
