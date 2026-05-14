import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { PageStatePanel } from '../../shared/ui/PageStatePanel.tsx'
import { GameBoardGrid } from './ui/GameBoardGrid.tsx'
import { useGameBoardPage } from './use-game-board-page.ts'
import { useOpenGameBoardCell } from './use-open-game-board-cell.ts'

export function GameBoardPage() {
  const { t } = useTranslation()
  const { data, isError, isLoading } = useGameBoardPage()
  const {
    pendingCell,
    toastMessage,
    canOpenCells,
    isSubmitting,
    requestOpenCell,
    confirmOpenCell,
    dismissPendingCell,
    dismissToast,
  } = useOpenGameBoardCell()

  if (isLoading) {
    return (
      <PageStatePanel
        title={t('gameBoard.title')}
        message={t('gameBoard.loading')}
        showSpinner
      />
    )
  }

  if (isError) {
    return (
      <PageStatePanel
        title={t('gameBoard.title')}
        message={t('gameBoard.errorLoading')}
        tone="error"
      />
    )
  }

  if (data === null) {
    return <PageStatePanel title={t('gameBoard.title')} message={t('gameBoard.empty')} />
  }

  if (!data) {
    return (
      <PageStatePanel
        title={t('gameBoard.title')}
        message={t('gameBoard.errorLoading')}
        tone="error"
      />
    )
  }

  const snapshot = data

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
          maxWidth: 960,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Typography variant="h5" gutterBottom>
          {snapshot.title || t('gameBoard.title')}
        </Typography>
        {snapshot.description ? (
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {snapshot.description}
          </Typography>
        ) : null}
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Chip
            size="small"
            color={snapshot.status === 'active' ? 'success' : 'default'}
            label={t(
              snapshot.status === 'active' ? 'gameBoard.statusActive' : 'gameBoard.statusFinished',
            )}
          />
        </Stack>
        <GameBoardGrid
          snapshot={snapshot}
          canOpenCells={canOpenCells}
          onCellRequestOpen={requestOpenCell}
        />
      </Paper>

      <Dialog
        open={pendingCell !== null}
        onClose={dismissPendingCell}
        aria-labelledby="open-cell-dialog-title"
      >
        <DialogTitle id="open-cell-dialog-title">{t('gameBoard.openConfirmTitle')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {t('gameBoard.openConfirmDescription', {
              cost: pendingCell?.cost ?? 0,
              row: pendingCell?.row ?? '-',
              col: pendingCell?.col ?? '-',
            })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={dismissPendingCell} disabled={isSubmitting}>
            {t('gameBoard.openCancel')}
          </Button>
          <Button variant="contained" onClick={confirmOpenCell} disabled={isSubmitting}>
            {t('gameBoard.openConfirm')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toastMessage !== null}
        autoHideDuration={3000}
        onClose={dismissToast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={dismissToast} severity="info" variant="filled">
          {toastMessage}
        </Alert>
      </Snackbar>
    </Box>
  )
}
