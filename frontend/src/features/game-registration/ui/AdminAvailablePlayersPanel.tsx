import { Box, Stack, Typography } from '@mui/material'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { RegistrationPlayer } from '../../../shared/api/contracts/index.ts'
import {
  AppButton,
  FormTextField,
  HelpTooltip,
  SectionCard,
  StatusBadge,
} from '../../../shared/ui/index.ts'
import { searchRegistrationPlayers } from '../model/player-search.ts'
import { AdminRegistrationPlayerCard } from './admin-registration-components.tsx'

interface AdminAvailablePlayersPanelProps {
  playerQuery: string
  onPlayerQuery: (value: string) => void
  players: RegistrationPlayer[]
  onAssign: (player: RegistrationPlayer) => void
  isAssigning: boolean
}

export function AdminAvailablePlayersPanel({
  players,
  playerQuery,
  onPlayerQuery,
  onAssign,
  isAssigning,
}: AdminAvailablePlayersPanelProps) {
  const { t, i18n } = useTranslation()
  const playerSearch = useMemo(
    () =>
      searchRegistrationPlayers(players, {
        query: playerQuery,
        minQueryLength: 1,
        limit: players.length,
        includeAllWhenQueryEmpty: true,
        locale: i18n.resolvedLanguage,
      }),
    [i18n.resolvedLanguage, playerQuery, players],
  )
  const normalizedPlayerQuery = playerSearch.normalizedQuery
  const visiblePlayers = playerSearch.visible

  return (
    <SectionCard
      surface="inset"
      sx={{
        width: '100%',
        flex: '1 1 0%',
        minHeight: 0,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        p: 1.25,
      }}
    >
      <Stack spacing={1} sx={{ minHeight: 0, flex: 1 }}>
        <Stack
          gap={1}
          sx={{ maxHeight: '55%', flexShrink: 0, overflowY: 'auto', scrollbarWidth: 'thin' }}
        >
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle2">
              {t('gameApplication.adminPanel.availablePlayers')}
            </Typography>
            <HelpTooltip
              title={t('gameApplication.adminPanel.availablePlayersDescription')}
              describeChild
              arrow
            >
              <StatusBadge
                textFlow="singleLine"
                size="small"
                variant="outlined"
                label={players.length}
                aria-label={`${t('gameApplication.adminPanel.availablePlayers')}: ${players.length}`}
                tabIndex={0}
              />
            </HelpTooltip>
          </Stack>

          <FormTextField
            fullWidth
            size="small"
            label={t('gameApplication.adminPanel.playerSearchLabel')}
            placeholder={t('gameApplication.adminPanel.playerSearchPlaceholder')}
            value={playerQuery}
            onChange={(event) => onPlayerQuery(event.target.value)}
          />

          {normalizedPlayerQuery.length > 0 ? (
            <Typography variant="caption" color="text.secondary">
              {t('gameApplication.adminPanel.playerSearchResults', {
                count: playerSearch.matches.length,
              })}
            </Typography>
          ) : null}
        </Stack>
        <Box
          role="region"
          aria-label={t('gameApplication.adminPanel.availablePlayers')}
          tabIndex={0}
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            scrollbarWidth: 'thin',
          }}
        >
          <Stack component="ul" spacing={0} sx={{ m: 0, p: 0 }}>
            {visiblePlayers.length === 0 ? (
              <Typography
                component="li"
                variant="body2"
                color="text.secondary"
                sx={{ listStyle: 'none', py: 1 }}
              >
                {players.length === 0
                  ? t('gameApplication.adminPanel.noAvailablePlayers')
                  : t('gameApplication.adminPanel.noPlayersMatched')}
              </Typography>
            ) : (
              visiblePlayers.map((player) => (
                <AdminRegistrationPlayerCard
                  key={player.userId}
                  player={player}
                  testId={`admin-player-${player.userId}`}
                  actions={
                    <AppButton
                      size="small"
                      tone="secondary"
                      framePlacement="inset"
                      disabled={isAssigning}
                      onClick={() => onAssign(player)}
                      aria-label={t('teamRegistrations.assignPlayer', {
                        player: player.displayName,
                      })}
                    >
                      {t('teamRegistrations.assign')}
                    </AppButton>
                  }
                />
              ))
            )}
          </Stack>
        </Box>
      </Stack>
    </SectionCard>
  )
}
