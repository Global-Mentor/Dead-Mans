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
import { Link as RouterLink } from 'react-router-dom'
import { gameApplicationRoute, gameSetupRoute, hasAccessToPanelRoute } from '../../routes/app-routes.ts'
import { PageStatePanel } from '../../shared/ui/PageStatePanel.tsx'
import { GameBoardGrid } from './ui/GameBoardGrid.tsx'
import { useGameBoardPage } from './use-game-board-page.ts'
import { useOpenGameBoardCell } from './use-open-game-board-cell.ts'
import { useAuth } from '../../shared/auth/use-auth.ts'
import { GameBoardAdminPlannedSection } from './ui/GameBoardAdminPlannedSection.tsx'
import { GameBoardModifiersSection } from './ui/GameBoardModifiersSection.tsx'

export function GameBoardPage() {
  const { t } = useTranslation()
  const { data, isError, isLoading } = useGameBoardPage()
  const { user } = useAuth()
  const isAdmin = hasAccessToPanelRoute(gameSetupRoute, user?.roles)
  const canActivateModifiers =
    user?.roles?.includes('admin') === true || user?.roles?.includes('moderator') === true
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
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 1 }}>
          <Chip
            size="small"
            color={
              snapshot.status === 'active'
                ? 'success'
                : snapshot.status === 'ready'
                  ? 'info'
                  : 'default'
            }
            label={t(
              snapshot.status === 'active'
                ? 'gameBoard.statusActive'
                : snapshot.status === 'ready'
                  ? 'gameBoard.statusReady'
                  : 'gameBoard.statusFinished',
            )}
          />
          <Button
            component={RouterLink}
            to={gameApplicationRoute.fullPath}
            size="small"
            variant="outlined"
          >
            {t('gameBoard.applicationButton')}
          </Button>
        </Stack>
        <GameBoardGrid
          snapshot={snapshot}
          canOpenCells={canOpenCells}
          onCellRequestOpen={requestOpenCell}
        />
        <GameBoardModifiersSection
          snapshot={snapshot}
          canActivateModifiers={canActivateModifiers}
        />
        {isAdmin ? <GameBoardAdminPlannedSection /> : null}
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
