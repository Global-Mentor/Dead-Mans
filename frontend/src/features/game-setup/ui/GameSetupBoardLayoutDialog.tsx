import { Stack } from '@mui/material'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AppButton,
  AppDialog,
  ConfirmDialog,
  FormSelect,
  InlineNotice,
} from '../../../shared/ui/index.ts'
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
  const [action, setAction] = useState<BoardLayoutAction>('remove')
  const [axis, setAxis] = useState<BoardLayoutAxis>('row')
  const [positionIndex, setPositionIndex] = useState(-1)
  const [confirmStep, setConfirmStep] = useState(false)

  const positionIndexes = useMemo(
    () => getBoardLayoutPositionIndexes(draft, action, axis),
    [draft, action, axis],
  )

  const canApply = canApplyBoardLayoutChange(draft, action, axis)
  const count = axis === 'row' ? draft.rowLabels.length : draft.colLabels.length
  const selectedPositionIndex = positionIndexes.includes(positionIndex)
    ? positionIndex
    : action === 'add'
      ? count
      : Math.max(0, count - 1)

  const handleClose = () => {
    setAction('remove')
    setAxis('row')
    setPositionIndex(-1)
    setConfirmStep(false)
    onClose()
  }

  const handlePrimaryClick = () => {
    if (action === 'remove' && !confirmStep) {
      setConfirmStep(true)
      return
    }

    onApply((current) =>
      applyGameSetupBoardLayoutChange(current, action, axis, selectedPositionIndex),
    )
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
    axis === 'row'
      ? 'gameSetup.layoutDialog.confirmRemoveRow'
      : 'gameSetup.layoutDialog.confirmRemoveColumn'

  return (
    <>
      <AppDialog
        open={open && !confirmStep}
        onClose={handleClose}
        title={t('gameSetup.layoutDialog.title')}
        actions={
          <>
            <AppButton tone="ghost" onClick={handleClose}>
              {t('common.actions.cancel')}
            </AppButton>
            <AppButton
              tone={action === 'remove' ? 'danger' : 'primary'}
              disabled={!canApply || positionIndexes.length === 0}
              onClick={handlePrimaryClick}
            >
              {action === 'add'
                ? t('gameSetup.layoutDialog.actionAdd')
                : t('common.actions.remove')}
            </AppButton>
          </>
        }
      >
        <Stack spacing={2}>
          <FormSelect
            label={t('gameSetup.layoutDialog.actionLabel')}
            value={action}
            onChange={(nextAction) => {
              setAction(nextAction)
              setPositionIndex(-1)
              setConfirmStep(false)
            }}
            options={[
              { value: 'add', label: t('gameSetup.layoutDialog.actionAdd') },
              { value: 'remove', label: t('common.actions.remove') },
            ]}
          />

          <FormSelect
            label={t('gameSetup.layoutDialog.axisLabel')}
            value={axis}
            onChange={(nextAxis) => {
              setAxis(nextAxis)
              setPositionIndex(-1)
              setConfirmStep(false)
            }}
            options={[
              { value: 'row', label: t('gameSetup.layoutDialog.axisRow') },
              { value: 'column', label: t('gameSetup.layoutDialog.axisColumn') },
            ]}
          />

          <FormSelect
            disabled={positionIndexes.length === 0 || !canApply}
            label={t('gameSetup.layoutDialog.positionLabel')}
            value={selectedPositionIndex}
            onChange={(nextPositionIndex) => {
              setPositionIndex(Number(nextPositionIndex))
              setConfirmStep(false)
            }}
            options={positionIndexes.map((index) => ({
              value: index,
              label: getPositionLabel(index),
            }))}
          />

          {!canApply ? (
            <InlineNotice severity="warning">
              {t('gameSetup.layoutDialog.limitReached')}
            </InlineNotice>
          ) : null}
        </Stack>
      </AppDialog>
      <ConfirmDialog
        open={open && confirmStep}
        title={t('gameSetup.layoutDialog.title')}
        description={t(confirmationKey)}
        subject={getPositionLabel(selectedPositionIndex)}
        confirmLabel={t('common.actions.remove')}
        cancelLabel={t('common.actions.back')}
        confirmTone="danger"
        confirmDisabled={!canApply}
        onClose={() => setConfirmStep(false)}
        onConfirm={handlePrimaryClick}
      />
    </>
  )
}
