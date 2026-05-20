import { Box, Chip, Paper, Stack, TextField, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { PageStatePanel } from '../../shared/ui/PageStatePanel.tsx'
import { CreateGameSetupDialog } from './ui/CreateGameSetupDialog.tsx'
import { GameSetupGrid } from './ui/GameSetupGrid.tsx'
import { useGameSetupPage } from './use-game-setup-page.ts'

export function GameSetupPage() {
  const { t } = useTranslation()
  const {
    snapshot,
    isLoading,
    isError,
    isEmpty,
    createDraft,
    isCreating,
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

  if (!snapshot) {
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
        alignItems: 'center',
        justifyContent: 'center',
        px: { xs: 1, sm: 2 },
      }}
    >
      <Paper
        sx={{
          p: { xs: 2, md: 3 },
          width: '100%',
          maxWidth: 1080,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', md: 'flex-start' }}
        >
          <Box>
            <Typography variant="h5" gutterBottom>
              {t('gameSetup.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('gameSetup.description')}
            </Typography>
          </Box>
          <Chip size="small" color="warning" label={t('gameSetup.draftBadge')} />
        </Stack>

        <TextField
          label={t('gameSetup.gameNameLabel')}
          defaultValue={snapshot.title}
          size="small"
          sx={{ mt: 3, maxWidth: 420 }}
        />

        <GameSetupGrid snapshot={snapshot} />
      </Paper>
    </Box>
  )
}
