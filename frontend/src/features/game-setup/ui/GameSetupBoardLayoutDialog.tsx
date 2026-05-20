import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material'
import type { SelectChangeEvent } from '@mui/material'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  applyGameSetupBoardLayoutChange,
  canApplyBoardLayoutChange,
  getBoardLayoutPositionIndexes,
  getBoardLayoutTargetLabel,
  type BoardLayoutAction,
  type BoardLayoutAxis,
} from '../model/game-setup-board-ops.ts'
import type { GameSetupDraftState } from '../model/game-setup-draft.ts'

interface GameSetupBoardLayoutDialogProps {
  open: boolean
  draft: GameSetupDraftState
  onClose: () => void
  onApply: (updater: (current: GameSetupDraftState) => GameSetupDraftState) => void
}

export function GameSetupBoardLayoutDialog({
  open,
  draft,
  onClose,
  onApply,
}: GameSetupBoardLayoutDialogProps) {
  const { t } = useTranslation()
  const [action, setAction] = useState<BoardLayoutAction>('add')
  const [axis, setAxis] = useState<BoardLayoutAxis>('row')
  const [positionIndex, setPositionIndex] = useState(0)
  const [confirmStep, setConfirmStep] = useState(false)

  const positionIndexes = useMemo(
    () => getBoardLayoutPositionIndexes(draft, action, axis),
    [draft, action, axis],
  )

  const canApply = canApplyBoardLayoutChange(draft, action, axis)
  const count = axis === 'row' ? draft.rowLabels.length : draft.colLabels.length
  const selectedPositionIndex = positionIndexes.includes(positionIndex)
    ? positionIndex
    : positionIndexes[0] ?? 0

  const handleClose = () => {
    setAction('add')
    setAxis('row')
    setPositionIndex(0)
    setConfirmStep(false)
    onClose()
  }

  const handlePrimaryClick = () => {
    if (!confirmStep) {
      setConfirmStep(true)
      return
    }

    onApply((current) => applyGameSetupBoardLayoutChange(current, action, axis, selectedPositionIndex))
    handleClose()
  }

  const getPositionLabel = (index: number) => {
    if (action === 'add') {
      if (index === 0) {
        return axis === 'row'
          ? t('gameSetup.layoutDialog.addRowAtStart')
          : t('gameSetup.layoutDialog.addColumnAtStart')
      }

      if (index === count) {
        return axis === 'row'
          ? t('gameSetup.layoutDialog.addRowAtEnd')
          : t('gameSetup.layoutDialog.addColumnAtEnd')
      }

      return axis === 'row'
        ? t('gameSetup.layoutDialog.addRowBefore', { position: index + 1 })
        : t('gameSetup.layoutDialog.addColumnBefore', { position: index + 1 })
    }

    const targetLabel = getBoardLayoutTargetLabel(draft, axis, index)
    return axis === 'row'
      ? t('gameSetup.layoutDialog.removeRowTarget', {
          position: index + 1,
          label: targetLabel,
        })
      : t('gameSetup.layoutDialog.removeColumnTarget', {
          position: index + 1,
          label: targetLabel,
        })
  }

  const confirmationKey =
    action === 'add'
      ? axis === 'row'
        ? 'gameSetup.layoutDialog.confirmAddRow'
        : 'gameSetup.layoutDialog.confirmAddColumn'
      : axis === 'row'
        ? 'gameSetup.layoutDialog.confirmRemoveRow'
        : 'gameSetup.layoutDialog.confirmRemoveColumn'

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('gameSetup.layoutDialog.title')}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('gameSetup.layoutDialog.description')}
        </Typography>

        {!confirmStep ? (
          <Stack spacing={2}>
            <FormControl fullWidth size="small">
              <InputLabel id="board-layout-action-label">
                {t('gameSetup.layoutDialog.actionLabel')}
              </InputLabel>
              <Select
                labelId="board-layout-action-label"
                label={t('gameSetup.layoutDialog.actionLabel')}
                value={action}
                onChange={(event: SelectChangeEvent<BoardLayoutAction>) => {
                  setAction(event.target.value as BoardLayoutAction)
                  setConfirmStep(false)
                }}
              >
                <MenuItem value="add">{t('gameSetup.layoutDialog.actionAdd')}</MenuItem>
                <MenuItem value="remove">{t('gameSetup.layoutDialog.actionRemove')}</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel id="board-layout-axis-label">
                {t('gameSetup.layoutDialog.axisLabel')}
              </InputLabel>
              <Select
                labelId="board-layout-axis-label"
                label={t('gameSetup.layoutDialog.axisLabel')}
                value={axis}
                onChange={(event: SelectChangeEvent<BoardLayoutAxis>) => {
                  setAxis(event.target.value as BoardLayoutAxis)
                  setConfirmStep(false)
                }}
              >
                <MenuItem value="row">{t('gameSetup.layoutDialog.axisRow')}</MenuItem>
                <MenuItem value="column">{t('gameSetup.layoutDialog.axisColumn')}</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth size="small" disabled={positionIndexes.length === 0 || !canApply}>
              <InputLabel id="board-layout-position-label">
                {t('gameSetup.layoutDialog.positionLabel')}
              </InputLabel>
              <Select
                labelId="board-layout-position-label"
                label={t('gameSetup.layoutDialog.positionLabel')}
                value={selectedPositionIndex}
                onChange={(event: SelectChangeEvent<number>) => {
                  setPositionIndex(Number(event.target.value))
                  setConfirmStep(false)
                }}
              >
                {positionIndexes.map((index) => (
                  <MenuItem key={`${action}-${axis}-${index}`} value={index}>
                    {getPositionLabel(index)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {!canApply ? (
              <Alert severity="warning">{t('gameSetup.layoutDialog.limitReached')}</Alert>
            ) : null}
          </Stack>
        ) : (
          <Alert severity="warning">
            {t(confirmationKey, {
              target: getPositionLabel(selectedPositionIndex),
            })}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={confirmStep ? () => setConfirmStep(false) : handleClose}>
          {confirmStep ? t('gameSetup.layoutDialog.back') : t('gameSetup.layoutDialog.cancel')}
        </Button>
        <Button
          variant="contained"
          color={action === 'remove' ? 'error' : 'primary'}
          disabled={!canApply || positionIndexes.length === 0}
          onClick={handlePrimaryClick}
        >
          {confirmStep ? t('gameSetup.layoutDialog.confirm') : t('gameSetup.layoutDialog.review')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
