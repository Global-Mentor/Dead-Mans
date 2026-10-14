import { Box, Stack, Typography } from '@mui/material'
import { useRef, useState, type DragEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AppButton,
  BusyIndicator,
  FilePickerInput,
  ImageFrame,
  SurfaceButton,
} from '../../../shared/ui/index.ts'
import type { GameSetupCellMediaPhase } from '../model/game-setup-cell-media-display.ts'
import {
  dataTransferHasImageFiles,
  extractGameSetupCellMediaFileFromDataTransfer,
  GAME_SETUP_CELL_MEDIA_ALLOWED_MIME_TYPES,
} from '../model/game-setup-cell-media-limits.ts'
import {
  createSetupCellDropzoneSx,
  setupCellBusyOverlaySx,
  setupCellDragOverlaySx,
  setupCellImageAreaSx,
  setupCellMediaActionsSx,
} from '../theme/cell-image-sx.ts'

interface GameSetupCellImageProps {
  imageUrl: string | undefined
  imageKey: string | undefined
  alt: string
  cellId: string | undefined
  phase: GameSetupCellMediaPhase
  canManageMedia: boolean
  isBusy: boolean
  onUpload: (cellId: string | undefined, file: File) => void
  onPreview: () => void
  onDelete: (cellId: string | undefined) => void
}

export function GameSetupCellImage({
  imageUrl,
  imageKey,
  alt,
  cellId,
  phase,
  canManageMedia,
  isBusy,
  onUpload,
  onDelete,
  onPreview,
}: GameSetupCellImageProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const dragDepthRef = useRef(0)
  const [isDragOver, setIsDragOver] = useState(false)

  const canAcceptDrop = canManageMedia && !isBusy
  const showDragOver = canAcceptDrop && isDragOver

  const openFilePicker = () => {
    if (!canManageMedia || isBusy) {
      return
    }

    inputRef.current?.click()
  }

  const submitFile = (file: File) => {
    onUpload(cellId, file)
  }

  const resetDragState = () => {
    dragDepthRef.current = 0
    setIsDragOver(false)
  }

  const handleDragEnter = (event: DragEvent<HTMLElement>) => {
    if (!canAcceptDrop || !dataTransferHasImageFiles(event.dataTransfer)) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    dragDepthRef.current += 1
    setIsDragOver(true)
  }

  const handleDragLeave = (event: DragEvent<HTMLElement>) => {
    if (!canAcceptDrop) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
    if (dragDepthRef.current === 0) {
      setIsDragOver(false)
    }
  }

  const handleDragOver = (event: DragEvent<HTMLElement>) => {
    if (!canAcceptDrop || !dataTransferHasImageFiles(event.dataTransfer)) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'copy'
  }

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    if (!canAcceptDrop) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    resetDragState()

    const file = extractGameSetupCellMediaFileFromDataTransfer(event.dataTransfer)
    if (!file) {
      return
    }

    submitFile(file)
  }

  const showImage = Boolean(imageUrl)
  const statusLabel =
    phase === 'uploading'
      ? t('gameSetup.cellMedia.uploading')
      : phase === 'deleting'
        ? t('gameSetup.cellMedia.removing')
        : null

  return (
    <Box
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      sx={createSetupCellDropzoneSx({ showDragOver })}
    >
      <Box sx={setupCellImageAreaSx}>
        {showImage && imageUrl ? (
          <SurfaceButton
            aria-label={t('gameSetup.cellMedia.previewAction')}
            disabled={isBusy}
            onClick={onPreview}
            sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          >
            <ImageFrame
              key={imageKey ?? imageUrl}
              src={imageUrl}
              alt={alt}
              fit="cover"
              loadingLabel={t('common.media.loading')}
              errorLabel={t('common.media.error')}
              sx={{
                position: 'absolute',
                inset: 0,
                height: '100%',
                opacity: isBusy || showDragOver ? 0 : 1,
              }}
            />
          </SurfaceButton>
        ) : (
          <>
            <Typography variant="caption" sx={{ px: 1 }}>
              {canManageMedia && !isBusy
                ? t('gameSetup.cellMedia.uploadPrompt')
                : t('gameSetup.imagePlaceholder')}
            </Typography>

            {canManageMedia ? (
              <Stack
                direction="row"
                spacing={0.5}
                justifyContent="center"
                sx={{ position: 'relative', zIndex: 4 }}
              >
                <AppButton
                  size="small"
                  labelAlignment="capHeight"
                  disabled={isBusy}
                  onClick={openFilePicker}
                >
                  {t('gameSetup.cellMedia.upload')}
                </AppButton>
              </Stack>
            ) : null}
          </>
        )}

        {showDragOver ? (
          <Box sx={setupCellDragOverlaySx}>
            <Typography variant="caption" sx={{ px: 1, color: 'primary.main', fontWeight: 600 }}>
              {t('gameSetup.cellMedia.dropPrompt')}
            </Typography>
          </Box>
        ) : null}

        {isBusy ? (
          <Box sx={setupCellBusyOverlaySx}>
            <BusyIndicator size={28} color="inherit" />
            {statusLabel ? (
              <Typography variant="caption" sx={{ color: 'common.white', px: 1 }}>
                {statusLabel}
              </Typography>
            ) : null}
          </Box>
        ) : null}
      </Box>

      {canManageMedia && showImage ? (
        <Stack direction="row" spacing={0.5} justifyContent="center" sx={setupCellMediaActionsSx}>
          <AppButton
            size="small"
            labelAlignment="capHeight"
            disabled={isBusy}
            onClick={openFilePicker}
          >
            {showImage && phase !== 'deleting'
              ? t('gameSetup.cellMedia.replace')
              : t('gameSetup.cellMedia.upload')}
          </AppButton>
          {showImage && phase !== 'deleting' ? (
            <AppButton
              size="small"
              tone="danger"
              labelAlignment="capHeight"
              disabled={isBusy}
              onClick={() => onDelete(cellId)}
            >
              {t('common.actions.remove')}
            </AppButton>
          ) : null}
        </Stack>
      ) : null}

      <FilePickerInput
        ref={inputRef}
        disabled={!canManageMedia || isBusy}
        accept={GAME_SETUP_CELL_MEDIA_ALLOWED_MIME_TYPES.join(',')}
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (!file) {
            return
          }

          submitFile(file)
        }}
      />
    </Box>
  )
}
