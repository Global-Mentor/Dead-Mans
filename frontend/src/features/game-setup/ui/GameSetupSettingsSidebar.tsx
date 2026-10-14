import { Box, Stack } from '@mui/material'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AppButton,
  DetailBlock,
  FormTextField,
  Metric,
  SectionCard,
} from '../../../shared/ui/index.ts'
import type { GameSetupDraftState } from '../model/game-setup-draft.ts'
import { GAME_SETUP_MAX_TITLE_LENGTH } from '../model/game-setup-limits.ts'
import { GameSetupBoardLayoutDialog } from './GameSetupBoardLayoutDialog.tsx'
import { ResetGameSetupDialog } from './ResetGameSetupDialog.tsx'

interface GameSetupSettingsSidebarProps {
  draft: GameSetupDraftState
  onDraftChange: (updater: (current: GameSetupDraftState) => GameSetupDraftState) => void
  onDraftCommit: () => void
  onLayoutChange: (updater: (current: GameSetupDraftState) => GameSetupDraftState) => void
  onReset: () => void | Promise<void>
  isBusy: boolean
  isResetting: boolean
  status: ReactNode
  children?: ReactNode
}

export function GameSetupSettingsSidebar({
  draft,
  onDraftChange,
  onDraftCommit,
  onLayoutChange,
  onReset,
  isResetting,
  isBusy,
  children,
  status,
}: GameSetupSettingsSidebarProps) {
  const { t } = useTranslation()
  const [isLayoutDialogOpen, setIsLayoutDialogOpen] = useState(false)
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)

  return (
    <>
      <SectionCard
        sx={{
          width: { xs: '100%', md: 300 },
          flexShrink: 0,
          alignSelf: 'flex-start',
          minHeight: 0,
          maxHeight: { xs: '55%', md: '100%' },
          overflowY: 'auto',
        }}
      >
        <Stack spacing={1.5}>
          <Box sx={{ display: 'flex' }}>{status}</Box>
          <FormTextField
            required
            multiline
            minRows={1}
            maxRows={3}
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

          <DetailBlock>
            <Stack spacing={1}>
              <Metric
                appearance="row"
                density="compact"
                label={t('gameSetup.settingsSidebar.boardSizeLabel')}
                value={t('gameSetup.settingsSidebar.boardSizeValue', {
                  rows: draft.rowLabels.length,
                  columns: draft.colLabels.length,
                })}
              />

              <AppButton
                tone="secondary"
                fullWidth
                disabled={isBusy || isResetting}
                onClick={() => setIsLayoutDialogOpen(true)}
              >
                {t('gameSetup.settingsSidebar.manageLayout')}
              </AppButton>
            </Stack>
          </DetailBlock>

          {children ? <DetailBlock>{children}</DetailBlock> : null}

          <AppButton
            tone="danger"
            fullWidth
            disabled={isResetting || isBusy}
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
