import { Box, Stack, Typography } from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { components } from '../../../shared/api/contracts/generated'
import { InlineNotice, ItemCard, SectionCard, StatusBadge } from '../../../shared/ui/index.ts'
import {
  buildModifierRuntimeUnits,
  calculateModifierRuntimeClock,
  createServerClockOffset,
  formatRuntimeDuration,
} from '../model/modifier-runtime.ts'

type GameRoundDetails = components['schemas']['GameRoundDetailsDto']

export function ModifierRuntimePanel({
  round,
  isOffline,
}: {
  round: GameRoundDetails | null
  isOffline: boolean
}) {
  const { t } = useTranslation()
  const [clientNowMs, setClientNowMs] = useState(() => Date.now())
  const [clockSync] = useState(() => ({
    serverNowUtc: round?.serverNowUtc ?? '',
    clientReceivedAtMs: Date.now(),
  }))
  const units = useMemo(() => (round ? buildModifierRuntimeUnits(round) : []), [round])
  const serverClockOffset = createServerClockOffset(
    clockSync.serverNowUtc,
    clockSync.clientReceivedAtMs,
  )
  const hasRunningTimer =
    round?.status === 'in_progress' && units.some((unit) => unit.durationSeconds !== null)

  useEffect(() => {
    if (!hasRunningTimer) return
    const interval = window.setInterval(() => setClientNowMs(Date.now()), 1_000)
    return () => window.clearInterval(interval)
  }, [hasRunningTimer])

  if (!round || units.length === 0) return null

  return (
    <SectionCard sx={{ mt: 1.5, p: { xs: 1.25, sm: 1.5 } }}>
      <Stack spacing={1.1}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={0.75}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
        >
          <Box>
            <Typography variant="subtitle1">{t('gameModifiers.runtime.title')}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t('gameModifiers.runtime.description')}
            </Typography>
          </Box>
          <StatusBadge
            size="small"
            color={isOffline ? 'warning' : 'success'}
            variant="outlined"
            label={t(
              isOffline ? 'gameModifiers.runtime.clockStale' : 'gameModifiers.runtime.clockSynced',
            )}
          />
        </Stack>

        {isOffline ? (
          <InlineNotice severity="warning" variant="outlined">
            {t('gameModifiers.runtime.offlineHint')}
          </InlineNotice>
        ) : null}

        <Box
          sx={{
            display: 'grid',
            gap: 1,
            gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' },
          }}
        >
          {units.map((unit) => {
            const clock = calculateModifierRuntimeClock(
              round,
              unit.durationSeconds,
              clientNowMs + serverClockOffset,
            )
            return (
              <ItemCard key={unit.key}>
                <Stack spacing={0.7}>
                  <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap>
                    <Typography variant="subtitle2" sx={{ flex: 1 }}>
                      {unit.modifierName}
                    </Typography>
                    {unit.activationCount > 1 ? (
                      <StatusBadge
                        size="small"
                        variant="outlined"
                        label={t('gameModifiers.runtime.stackCount', {
                          count: unit.activationCount,
                        })}
                      />
                    ) : null}
                    {unit.requiresHostMonitoring ? (
                      <StatusBadge
                        size="small"
                        color="warning"
                        variant="outlined"
                        label={t('gameModifiers.runtime.hostMonitoring')}
                      />
                    ) : null}
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {unit.rule}
                  </Typography>
                  <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap>
                    <StatusBadge
                      size="small"
                      variant="outlined"
                      label={t(`gameModifiers.runtime.performer.${unit.performer}`)}
                    />
                    <StatusBadge
                      size="small"
                      color={clock.state === 'expired' ? 'warning' : 'default'}
                      label={
                        clock.remainingSeconds === null
                          ? t(`gameModifiers.runtime.state.${clock.state}`)
                          : t('gameModifiers.runtime.timerValue', {
                              time: formatRuntimeDuration(clock.remainingSeconds),
                            })
                      }
                    />
                    <StatusBadge
                      size="small"
                      variant="outlined"
                      label={t(`gameModifiers.runtime.state.${clock.state}`)}
                    />
                  </Stack>
                </Stack>
              </ItemCard>
            )
          })}
        </Box>
      </Stack>
    </SectionCard>
  )
}
