import { Box, Stack, Typography } from '@mui/material'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AppButton, FormTextField, SectionCard, SectionDivider } from '../../../shared/ui/index.ts'
import type { GameSetupDraftState } from '../model/game-setup-draft.ts'
import { GAME_SETUP_MAX_TITLE_LENGTH } from '../model/game-setup-limits.ts'
import { gameSetupSidebarPaperSx } from '../theme/layout-sx.ts'
import { GameSetupBoardLayoutDialog } from './GameSetupBoardLayoutDialog.tsx'
import { ResetGameSetupDialog } from './ResetGameSetupDialog.tsx'

interface GameSetupSettingsSidebarProps {
  draft: GameSetupDraftState
  onDraftChange: (updater: (current: GameSetupDraftState) => GameSetupDraftState) => void
  onDraftCommit: () => void
  onLayoutChange: (updater: (current: GameSetupDraftState) => GameSetupDraftState) => void
  onReset: () => void | Promise<void>
  isResetting: boolean
  children?: ReactNode
}

export function GameSetupSettingsSidebar({
  draft,
  onDraftChange,
  onDraftCommit,
  onLayoutChange,
  onReset,
  isResetting,
  children,
}: GameSetupSettingsSidebarProps) {
  const { t } = useTranslation()
  const [isLayoutDialogOpen, setIsLayoutDialogOpen] = useState(false)
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)

  return (
    <>
      <SectionCard surface="accented" sx={gameSetupSidebarPaperSx}>
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
          <FormTextField
            label={t('gameSetup.gameNameLabel')}
            value={draft.title}
            onChange={(event) => {
              const nextTitle = event.target.value
              onDraftChange((current) => ({
                ...current,
                title: nextTitle,
              }))
            }}
            onBlur={onDraftCommit}
            inputProps={{ maxLength: GAME_SETUP_MAX_TITLE_LENGTH }}
          />

          <SectionDivider />

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

          <AppButton tone="secondary" fullWidth onClick={() => setIsLayoutDialogOpen(true)}>
            {t('gameSetup.settingsSidebar.manageLayout')}
          </AppButton>

          {children ? (
            <>
              <SectionDivider />
              {children}
            </>
          ) : null}
          <SectionDivider />

          <AppButton
            tone="dangerSecondary"
            fullWidth
            disabled={isResetting}
            onClick={() => setIsResetDialogOpen(true)}
          >
            {t('gameSetup.settingsSidebar.resetDraft')}
          </AppButton>
        </Stack>
      </SectionCard>

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
        onApply={onLayoutChange}
      />
    </>
  )
}
