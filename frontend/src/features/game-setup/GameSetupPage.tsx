import { Alert, Box, Button, Chip, Paper, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { PageStatePanel } from '../../shared/ui/PageStatePanel.tsx'
import { CreateGameSetupDialog } from './ui/CreateGameSetupDialog.tsx'
import { GameSetupGrid } from './ui/GameSetupGrid.tsx'
import { GameSetupSettingsSidebar } from './ui/GameSetupSettingsSidebar.tsx'
import { useGameSetupPage } from './use-game-setup-page.ts'

export function GameSetupPage() {
  const { t } = useTranslation()
  const {
    snapshot,
    draft,
    isLoading,
    isError,
    isEmpty,
    isDirty,
    restoredFromLocal,
    saveErrorMessage,
    resetErrorMessage,
    updateDraft,
    saveDraft,
    createDraft,
    deleteDraft,
    isCreating,
    isResetting,
    isSaving,
  } = useGameSetupPage()

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
            alignItems: 'center',
            justifyContent: 'center',
            px: { xs: 1, sm: 2 },
          }}
        >
          <PageStatePanel title={t('gameSetup.title')} message={t('gameSetup.empty')} />
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
            <Button
              variant="contained"
              disabled={!isDirty || isSaving}
              onClick={() => void saveDraft()}
            >
              {isSaving ? t('gameSetup.saving') : t('gameSetup.save')}
            </Button>
          </Stack>
        </Stack>

        {restoredFromLocal ? (
          <Alert severity="warning" sx={{ mt: 2 }}>
            {t('gameSetup.localDraftRestored')}
          </Alert>
        ) : null}

        {saveErrorMessage ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {saveErrorMessage === 'invalidTitle'
              ? t('gameSetup.invalidTitle')
              : t('gameSetup.saveFailed')}
          </Alert>
        ) : null}

        {resetErrorMessage ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {t('gameSetup.resetFailed')}
          </Alert>
        ) : null}

        {isDirty ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            {t('gameSetup.unsavedChanges')}
          </Alert>
        ) : null}

        <Box sx={{ mt: 3, flex: 1, minHeight: 0 }}>
          <GameSetupGrid snapshot={snapshot} draft={draft} onDraftChange={updateDraft} />
        </Box>
      </Paper>
    </Box>
  )
}
