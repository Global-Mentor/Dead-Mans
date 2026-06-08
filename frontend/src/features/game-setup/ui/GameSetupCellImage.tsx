import { Box, CircularProgress, Stack, Typography } from '@mui/material'
import { useId, useRef, useState, type DragEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { AppButton } from '../../../shared/ui/AppButton.tsx'
import {
  dataTransferHasImageFiles,
  extractGameSetupCellMediaFileFromDataTransfer,
  GAME_SETUP_CELL_MEDIA_ALLOWED_MIME_TYPES,
} from '../model/game-setup-cell-media-limits.ts'
import type { GameSetupCellMediaPhase } from '../model/game-setup-cell-media-display.ts'

interface GameSetupCellImageProps {
  imageUrl?: string
  imageKey?: string
  alt: string
  cellId?: string
  phase: GameSetupCellMediaPhase
  canManageMedia: boolean
  isBusy: boolean
  onUpload: (cellId: string | undefined, file: File) => void
  onDelete: (cellId: string | undefined) => void
}

interface GameSetupCellImagePreviewProps {
  imageUrl: string
  imageKey?: string
  alt: string
  isBusy: boolean
  isDragOver: boolean
}

function GameSetupCellImagePreview({
  imageUrl,
  imageKey,
  alt,
  isBusy,
  isDragOver,
}: GameSetupCellImagePreviewProps) {
  const [imageLoaded, setImageLoaded] = useState(false)

  return (
    <Box
      component="img"
      key={imageKey ?? imageUrl}
      src={imageUrl}
      alt={alt}
      onLoad={() => setImageLoaded(true)}
      onError={() => setImageLoaded(false)}
      sx={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        opacity: imageLoaded && !isBusy && !isDragOver ? 1 : 0,
        transition: 'opacity 160ms ease',
      }}
    />
  )
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
}: GameSetupCellImageProps) {
  const { t } = useTranslation()
  const inputId = useId()
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
      sx={{
        flex: 1,
        borderRadius: 1,
        border: '1px dashed',
        borderColor: showDragOver ? 'primary.main' : 'divider',
        bgcolor: showDragOver ? 'action.hover' : 'transparent',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        justifyContent: 'center',
        textAlign: 'center',
        color: 'text.secondary',
        overflow: 'hidden',
        position: 'relative',
        minHeight: 96,
        transition: 'border-color 160ms ease, background-color 160ms ease',
      }}
    >
      <Box
        component="label"
        htmlFor={canManageMedia && !isBusy ? inputId : undefined}
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: canManageMedia && !isBusy ? 'pointer' : 'default',
        }}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest('[data-cell-media-action]')) {
            event.preventDefault()
          }
        }}
      >
        {showImage && imageUrl ? (
          <GameSetupCellImagePreview
            imageUrl={imageUrl}
            imageKey={imageKey}
            alt={alt}
            isBusy={isBusy}
            isDragOver={showDragOver}
          />
        ) : (
          <Typography variant="caption" sx={{ px: 1 }}>
            {canManageMedia && !isBusy
              ? t('gameSetup.cellMedia.uploadPrompt')
              : t('gameSetup.imagePlaceholder')}
          </Typography>
        )}

        {showDragOver ? (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(25, 118, 210, 0.18)',
              border: '2px dashed',
              borderColor: 'primary.main',
              zIndex: 2,
            }}
          >
            <Typography variant="caption" sx={{ px: 1, color: 'primary.main', fontWeight: 600 }}>
              {t('gameSetup.cellMedia.dropPrompt')}
            </Typography>
          </Box>
        ) : null}

        {isBusy ? (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.75,
              bgcolor: 'rgba(0,0,0,0.5)',
              zIndex: 3,
            }}
          >
            <CircularProgress size={28} color="inherit" />
            {statusLabel ? (
              <Typography variant="caption" sx={{ color: 'common.white', px: 1 }}>
                {statusLabel}
              </Typography>
            ) : null}
          </Box>
        ) : null}
      </Box>

      {canManageMedia ? (
        <Stack
          direction="row"
          spacing={0.5}
          justifyContent="center"
          sx={{
            position: 'absolute',
            left: 4,
            right: 4,
            bottom: 4,
            zIndex: 4,
          }}
          data-cell-media-action
        >
          <AppButton
            size="small"
            disabled={isBusy}
            onClick={openFilePicker}
            data-cell-media-action
          >
            {showImage && phase !== 'deleting'
              ? t('gameSetup.cellMedia.replace')
              : t('gameSetup.cellMedia.upload')}
          </AppButton>
          {showImage && phase !== 'deleting' ? (
            <AppButton
              size="small"
              tone="secondary"
              color="inherit"
              disabled={isBusy}
              onClick={() => onDelete(cellId)}
              data-cell-media-action
            >
              {t('gameSetup.cellMedia.remove')}
            </AppButton>
          ) : null}
        </Stack>
      ) : null}

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        hidden
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
