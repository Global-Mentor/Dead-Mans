import { Box, Chip, Divider, Stack, Typography } from '@mui/material'
import type { ChipProps } from '@mui/material'
import { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { AppButton, AppDialog } from '../../../shared/ui/index.ts'
import { loadDevNotes, resolveDevNoteText, type DevNoteStatus } from '../model/dev-notes.ts'

const DEV_NOTE_STATUS_COLORS = {
  fix: 'error',
  feature: 'success',
  change: 'info',
  notice: 'warning',
} as const satisfies Record<DevNoteStatus, ChipProps['color']>

interface DevNotesDialogProps {
  open: boolean
  onClose: () => void
}

export function DevNotesDialog({ open, onClose }: DevNotesDialogProps) {
  const { t, i18n } = useTranslation()
  const notes = useMemo(() => loadDevNotes(), [])
  const listRef = useRef<HTMLDivElement>(null)
  const language = i18n.resolvedLanguage ?? i18n.language
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(language, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [language],
  )

  useEffect(() => {
    if (open) {
      listRef.current?.scrollTo({ top: 0 })
    }
  }, [open])

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      scroll="paper"
      PaperProps={{
        sx: { maxHeight: 'min(72vh, 560px)' },
      }}
      title={t('navigation.devNotes.dialogTitle')}
      actions={
        <AppButton tone="ghost" onClick={onClose}>
          {t('common.actions.close')}
        </AppButton>
      }
    >
      {notes.length === 0 ? (
        <Typography color="text.secondary">{t('navigation.devNotes.empty')}</Typography>
      ) : (
        <Box
          ref={listRef}
          data-testid="dev-notes-list"
          sx={{ maxHeight: 'min(52vh, 420px)', overflowY: 'auto', pr: 0.5 }}
        >
          <Stack spacing={2.5} divider={<Divider />}>
            {notes.map((note) => (
              <Stack key={note.id} spacing={0.75}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  <Chip
                    size="small"
                    color={DEV_NOTE_STATUS_COLORS[note.status]}
                    label={t(`navigation.devNotes.statuses.${note.status}`)}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {dateFormatter.format(new Date(note.publishedAt))}
                  </Typography>
                </Stack>
                <Typography variant="subtitle1" fontWeight={700}>
                  {resolveDevNoteText(note.title, language)}
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                  {resolveDevNoteText(note.body, language)}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
      )}
    </AppDialog>
  )
}
