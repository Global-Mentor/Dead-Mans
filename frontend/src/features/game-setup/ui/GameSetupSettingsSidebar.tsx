import { Box, Button, Divider, Paper, Stack, TextField, Typography } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameSetupDraftState } from '../model/game-setup-draft.ts'
import { GameSetupBoardLayoutDialog } from './GameSetupBoardLayoutDialog.tsx'
import { ResetGameSetupDialog } from './ResetGameSetupDialog.tsx'

interface GameSetupSettingsSidebarProps {
  draft: GameSetupDraftState
  onDraftChange: (updater: (current: GameSetupDraftState) => GameSetupDraftState) => void
  onReset: () => void | Promise<void>
  isResetting: boolean
}

export function GameSetupSettingsSidebar({
  draft,
  onDraftChange,
  onReset,
  isResetting,
}: GameSetupSettingsSidebarProps) {
  const { t } = useTranslation()
  const [isLayoutDialogOpen, setIsLayoutDialogOpen] = useState(false)
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)

  return (
    <>
      <Paper
        variant="outlined"
        sx={{
          width: { xs: '100%', md: 280 },
          flexShrink: 0,
          p: 2.5,
          borderRadius: 2,
          alignSelf: 'stretch',
          background:
            'linear-gradient(180deg, rgba(144,202,249,0.08) 0%, rgba(20,24,41,0.98) 100%)',
        }}
      >
        <Typography variant="overline" color="text.secondary">
          {t('gameSetup.settingsSidebar.overline')}
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5 }}>
          {t('gameSetup.settingsSidebar.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
          {t('gameSetup.settingsSidebar.description')}
        </Typography>

        <Stack spacing={2}>
          <TextField
            label={t('gameSetup.gameNameLabel')}
            value={draft.title}
            onChange={(event) => {
              const nextTitle = event.target.value
              onDraftChange((current) => ({
                ...current,
                title: nextTitle,
              }))
            }}
            size="small"
            fullWidth
          />

          <Divider />

          <Box>
            <Typography variant="caption" color="text.secondary">
              {t('gameSetup.settingsSidebar.boardSizeLabel')}
            </Typography>
            <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 600 }}>
              {t('gameSetup.settingsSidebar.boardSizeValue', {
                rows: draft.rowLabels.length,
                columns: draft.colLabels.length,
              })}
            </Typography>
          </Box>

          <Button variant="outlined" fullWidth onClick={() => setIsLayoutDialogOpen(true)}>
            {t('gameSetup.settingsSidebar.manageLayout')}
          </Button>

          <Button
            variant="outlined"
            color="error"
            fullWidth
            disabled={isResetting}
            onClick={() => setIsResetDialogOpen(true)}
          >
            {t('gameSetup.settingsSidebar.resetDraft')}
          </Button>
        </Stack>
      </Paper>

      <ResetGameSetupDialog
        open={isResetDialogOpen}
        isSubmitting={isResetting}
        onClose={() => setIsResetDialogOpen(false)}
        onConfirm={async () => {
          await onReset()
          setIsResetDialogOpen(false)
        }}
      />

      <GameSetupBoardLayoutDialog
        open={isLayoutDialogOpen}
        draft={draft}
        onClose={() => setIsLayoutDialogOpen(false)}
        onApply={onDraftChange}
      />
    </>
  )
}
