import { Box, Typography } from '@mui/material'
import { scrollRegionSx } from '../../../shared/theme/layout-sx.ts'
import { useTranslation } from 'react-i18next'
import type { components } from '../../../shared/api/contracts/generated'
import { RoundBriefingPanel } from '../../../shared/game-ui/index.ts'
import { AppButton, InlineNotice } from '../../../shared/ui/index.ts'
import { ReadOnlyGameBoard } from '../../game-board/index.ts'

export function HistoryBoardView({
  game,
  onBack,
}: {
  game: components['schemas']['GameHistoryGameDetailsDto']
  onBack: () => void
}) {
  const { t } = useTranslation()
  const context = (
    <RoundBriefingPanel
      component="section"
      aria-label={game.gameTitle}
      header={
        <Typography
          component="h1"
          variant="h6"
          textAlign="center"
          fontWeight={700}
          sx={{ overflowWrap: 'anywhere' }}
        >
          {game.gameTitle}
        </Typography>
      }
    >
      <AppButton tone="secondary" onClick={onBack} fullWidth>
        {t('gameHistory.backToGame')}
      </AppButton>
    </RoundBriefingPanel>
  )
  return (
    <Box
      role="region"
      aria-label={t('gameHistory.boardTitle', { game: game.gameTitle })}
      tabIndex={0}
      data-testid="history-board-view"
      sx={{ flex: 1, minHeight: 0, ...scrollRegionSx }}
    >
      {game.board ? (
        <ReadOnlyGameBoard
          key={game.gameId}
          snapshot={game.board}
          rounds={game.mainGame.rounds}
          context={context}
        />
      ) : (
        <>
          {context}
          <InlineNotice severity="info">{t('gameHistory.boardUnavailable')}</InlineNotice>
        </>
      )}
    </Box>
  )
}
