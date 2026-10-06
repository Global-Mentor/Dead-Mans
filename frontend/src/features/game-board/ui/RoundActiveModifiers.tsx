import { Box, Stack, Typography } from '@mui/material'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  GameModifierActivation,
  GameModifierState,
} from '../../../shared/api/contracts/index.ts'
import type { components } from '../../../shared/api/contracts/generated'
import {
  ModifierDetailsGroup,
  ModifierDetailsItem,
  ModifierDetailsList,
  ModifierDescriptionBlock,
  ModifierConflictNotice,
  ModifierActivatorsBlock,
} from '../../../shared/game-ui/index.ts'
import { AppButton, InlineNotice, SectionCard, StatusBadge } from '../../../shared/ui/index.ts'
import {
  buildModifierRuntimeUnits,
  calculateModifierRuntimeClock,
  createServerClockOffset,
  formatRuntimeDuration,
  groupActiveGameModifiers,
  groupActiveModifierCategories,
  getCategoryLabel,
} from '../../game-modifiers/index.ts'

export function RoundActiveModifiers({
  activations,
  round,
  modifiers,
  waitingMessage,
  isError,
  isOffline,
  onRetry,
}: {
  activations: readonly GameModifierActivation[]
  round: components['schemas']['GameRoundDetailsDto'] | null
  modifiers: GameModifierState | null
  waitingMessage: string
  isError: boolean
  isOffline: boolean
  onRetry: () => void
}) {
  const { t, i18n } = useTranslation()
  const groups = groupActiveGameModifiers(activations, i18n.resolvedLanguage)
  const categories = groupActiveModifierCategories(
    groups,
    modifiers?.availableModifiers ?? [],
    round?.modifierResults ?? [],
  )
  const runtimeUnits = useMemo(() => (round ? buildModifierRuntimeUnits(round) : []), [round])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const allActivations = modifiers?.activeModifiers ?? activations
  const activeModifierIds = new Set(allActivations.map((item) => item.modifierId))
  const namesById = new Map(
    modifiers?.availableModifiers.map((item) => [item.modifier.id, item.modifier.name]),
  )
  for (const activation of allActivations)
    namesById.set(activation.modifierId, activation.modifierName)

  return (
    <SectionCard
      component="section"
      aria-label={t('gameBoard.currentRoundScreen.modifiers')}
      sx={{
        gridArea: 'modifiers',
        p: 0,
        minWidth: 0,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        gap={1}
        sx={{
          px: 2,
          py: 1.5,
          flexShrink: 0,
          bgcolor: 'action.hover',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <StatusBadge
          density="compact"
          variant="outlined"
          textFlow="singleLine"
          label={activations.length}
          aria-label={t('gameBoard.currentRoundScreen.drawerActiveCount', {
            count: activations.length,
          })}
        />
        <Typography
          component="h2"
          variant="h6"
          fontWeight={700}
          sx={{ flex: 1, fontSize: 20, lineHeight: 1.2, minWidth: 0, overflowWrap: 'anywhere' }}
        >
          {t('gameBoard.currentRoundScreen.modifiers')}
        </Typography>
      </Stack>
      <Box
        ref={scrollContainerRef}
        role="region"
        aria-label={t('gameBoard.currentRoundScreen.modifierList')}
        tabIndex={groups.length ? 0 : undefined}
        sx={{
          height: 'min(64dvh, 480px)',
          minHeight: 180,
          overflowY: 'auto',
          overscrollBehaviorY: 'contain',
          scrollbarGutter: 'stable both-edges',
          scrollbarWidth: 'thin',
          scrollPaddingBlock: 8,
          overflowWrap: 'anywhere',
          '@media (min-width:768px)': { minHeight: 0, height: 'auto', flex: 1 },
        }}
      >
        {isError && round ? (
          <InlineNotice
            severity="warning"
            sx={{ m: 2 }}
            action={
              <AppButton tone="secondary" size="small" onClick={onRetry}>
                {t('common.actions.retry')}
              </AppButton>
            }
          >
            {t('gameModifiers.errorLoading')}
          </InlineNotice>
        ) : null}
        {groups.length ? (
          <Box sx={{ p: 0.5 }}>
            <ModifierDetailsList
              count={groups.length}
              layout="fit"
              scrollContainerRef={scrollContainerRef}
            >
              {categories.map(({ category, items }) => (
                <ModifierDetailsGroup
                  key={category ?? 'unknown'}
                  count={items.length}
                  {...(category ? { title: getCategoryLabel(t, category) } : {})}
                >
                  {items.map((group) => {
                    const availability = modifiers?.availableModifiers.find(
                      (item) => item.modifier.id === group.modifierId,
                    )
                    const definition = availability?.modifier
                    const savedDescriptions = [
                      ...new Set(
                        round?.modifierResults
                          .filter((item) => item.modifierId === group.modifierId)
                          .map((item) => item.modifierDescription)
                          .filter(Boolean),
                      ),
                    ]
                    const descriptions = savedDescriptions.length
                      ? savedDescriptions
                      : definition?.description
                        ? [definition.description]
                        : []
                    const groupRuntimeUnits = runtimeUnits.filter(
                      (unit) => unit.modifierId === group.modifierId,
                    )
                    const primaryRuntime = groupRuntimeUnits[0]
                    return (
                      <ModifierDetailsItem
                        key={group.modifierId}
                        title={group.modifierName}
                        emoji={definition?.iconEmoji}
                        reserveIcon
                        catalog
                        open={expandedId === group.modifierId}
                        onExpandedChange={(open) => setExpandedId(open ? group.modifierId : null)}
                        effect={
                          group.activationsCount > 1 ||
                          (round && primaryRuntime?.durationSeconds != null) ? (
                            <Stack
                              component="span"
                              direction="row"
                              alignItems="center"
                              gap={0.75}
                              sx={{ flexShrink: 0 }}
                            >
                              {group.activationsCount > 1 ? (
                                <StatusBadge
                                  component="span"
                                  density="tight"
                                  variant="outlined"
                                  label={t('gameModifiers.activeStackMultiplier', {
                                    count: group.activationsCount,
                                  })}
                                  aria-label={t('gameModifiers.activeGroupCount', {
                                    count: group.activationsCount,
                                  })}
                                />
                              ) : null}
                              {round && primaryRuntime?.durationSeconds != null ? (
                                <RoundRuntimeClock
                                  key={`${primaryRuntime.key}:${round.serverNowUtc}`}
                                  round={round}
                                  unit={primaryRuntime}
                                  isOffline={isOffline}
                                  compact
                                />
                              ) : null}
                            </Stack>
                          ) : null
                        }
                      >
                        {descriptions.map((description) => (
                          <ModifierDescriptionBlock key={description} description={description} />
                        ))}
                        <ModifierConflictNotice
                          conflicts={(definition?.conflictingModifierIds ?? []).map((id) => ({
                            id,
                            name: namesById.get(id) ?? id,
                            isActive: activeModifierIds.has(id),
                          }))}
                        />
                        <ModifierActivatorsBlock
                          names={group.activators.map((activator) =>
                            activator.activationsCount > 1
                              ? t('gameModifiers.activeGroupActivatorWithCount', {
                                  player: activator.displayName,
                                  count: activator.activationsCount,
                                })
                              : activator.displayName,
                          )}
                        >
                          <Stack
                            direction="row"
                            gap={0.5}
                            flexWrap="wrap"
                            sx={{ mb: groupRuntimeUnits.length ? 1 : 0 }}
                          >
                            <StatusBadge
                              density="tight"
                              variant="outlined"
                              color="warning"
                              label={t('gameModifiers.costLabel', { cost: group.activationCost })}
                            />
                            {availability?.limit != null ? (
                              <StatusBadge
                                density="tight"
                                variant="outlined"
                                label={t('gameModifiers.limitProgressShortLabel', {
                                  count: availability.activationsCount,
                                  limit: availability.limit,
                                })}
                                aria-label={t('gameModifiers.limitProgressLabel', {
                                  count: availability.activationsCount,
                                  limit: availability.limit,
                                })}
                              />
                            ) : null}
                          </Stack>
                          {groupRuntimeUnits.map((unit) => {
                            if (!round) return null
                            return (
                              <Box key={unit.key}>
                                {!descriptions.includes(unit.rule) ? (
                                  <Typography variant="body2" sx={{ lineHeight: 1.55 }}>
                                    {unit.rule}
                                  </Typography>
                                ) : null}
                                <Typography variant="caption" color="text.secondary">
                                  {t(`gameModifiers.runtime.performer.${unit.performer}`)} ·{' '}
                                  <RoundRuntimeClock
                                    key={`${unit.key}:${round.serverNowUtc}`}
                                    round={round}
                                    unit={unit}
                                    isOffline={isOffline}
                                  />
                                  {unit.requiresHostMonitoring
                                    ? ` · ${t('gameModifiers.runtime.hostMonitoring')}`
                                    : ''}
                                  {isOffline ? ` · ${t('gameModifiers.runtime.clockStale')}` : ''}
                                </Typography>
                              </Box>
                            )
                          })}
                        </ModifierActivatorsBlock>
                      </ModifierDetailsItem>
                    )
                  })}
                </ModifierDetailsGroup>
              ))}
            </ModifierDetailsList>
          </Box>
        ) : (
          <Box
            sx={{
              minHeight: 180,
              height: '100%',
              display: 'grid',
              placeItems: 'center',
              p: 3,
              textAlign: 'center',
            }}
          >
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ maxWidth: 300, lineHeight: 1.55 }}
            >
              {waitingMessage}
            </Typography>
          </Box>
        )}
      </Box>
    </SectionCard>
  )
}

function RoundRuntimeClock({
  round,
  unit,
  isOffline,
  compact = false,
}: {
  round: components['schemas']['GameRoundDetailsDto']
  unit: ReturnType<typeof buildModifierRuntimeUnits>[number]
  isOffline: boolean
  compact?: boolean
}) {
  const { t } = useTranslation()
  const [clientNowMs, setClientNowMs] = useState(() => Date.now())
  const [clockSync] = useState(() => ({
    serverNowUtc: round.serverNowUtc,
    receivedAtMs: Date.now(),
  }))
  const offset = createServerClockOffset(clockSync.serverNowUtc, clockSync.receivedAtMs)
  const running = round.status === 'in_progress' && unit.durationSeconds !== null

  useEffect(() => {
    if (!running) return
    const interval = window.setInterval(() => setClientNowMs(Date.now()), 1_000)
    return () => window.clearInterval(interval)
  }, [running])

  const clock = calculateModifierRuntimeClock(round, unit.durationSeconds, clientNowMs + offset)
  const label =
    clock.remainingSeconds === null
      ? t(`gameModifiers.runtime.state.${clock.state}`)
      : t('gameModifiers.runtime.timerValue', {
          time: formatRuntimeDuration(clock.remainingSeconds),
        })
  if (compact && unit.durationSeconds !== null) {
    return (
      <StatusBadge
        component="span"
        role="timer"
        color={isOffline ? 'default' : 'warning'}
        variant="outlined"
        textFlow="singleLine"
        label={
          clock.remainingSeconds === null ? label : formatRuntimeDuration(clock.remainingSeconds)
        }
        aria-label={isOffline ? `${label} · ${t('gameModifiers.runtime.clockStale')}` : label}
        sx={{ fontVariantNumeric: 'tabular-nums' }}
      />
    )
  }
  return (
    <Typography
      component="span"
      variant="caption"
      color={isOffline ? 'warning.main' : 'primary.light'}
      aria-label={
        compact
          ? isOffline
            ? `${label} · ${t('gameModifiers.runtime.clockStale')}`
            : label
          : undefined
      }
      sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: compact ? 'nowrap' : 'normal' }}
    >
      {label}
    </Typography>
  )
}
