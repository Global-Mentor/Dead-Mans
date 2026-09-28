import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { components } from '../api/contracts/generated'
import {
  formatPlayedCardModifierOutcomeStatus,
  getPlayedCardModifierOutcomeColor,
} from '../lib/played-card-formatters.ts'
import {
  DisclosureSection,
  InlineNotice,
  ItemCard,
  NativeDisclosure,
  SectionCard,
} from '../ui/index.ts'
import { groupPlayedCardModifiers, type PlayedCardModifierGroup } from './played-card-modifiers.ts'

type PlayedCardModifier = components['schemas']['GameHistoryRoundItemDto']['modifiers'][number]

export function PlayedCardModifiers({ modifiers }: { modifiers: readonly PlayedCardModifier[] }) {
  const { t } = useTranslation()
  const groups = groupPlayedCardModifiers(modifiers).sort(
    (left, right) => Number(hasResultImpact(right)) - Number(hasResultImpact(left)),
  )

  return (
    <DisclosureSection
      title={t('common.entities.modifiers')}
      countLabel={t('gameHistory.countValue', { count: modifiers.length })}
      countPlacement="leading"
    >
      {groups.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t('gameHistory.cardPlayResultNoModifiers')}
        </Typography>
      ) : (
        <PlayedCardModifierList modifiers={groups} />
      )}
    </DisclosureSection>
  )
}

function PlayedCardModifierList({ modifiers }: { modifiers: readonly PlayedCardModifierGroup[] }) {
  return (
    <Box
      component="ul"
      sx={{
        m: 0,
        p: 0,
        display: 'grid',
        gap: 0.75,
        alignItems: 'start',
        gridTemplateColumns: {
          xs: 'minmax(0, 1fr)',
          md: modifiers.length > 1 ? 'repeat(2, minmax(0, 1fr))' : 'minmax(0, 1fr)',
        },
      }}
    >
      {modifiers.map((modifier) => (
        <PlayedCardModifierItem
          key={modifier.groupKey}
          modifier={modifier}
          showRevision={modifiers.some(
            (other) =>
              other.modifierId === modifier.modifierId && other.groupKey !== modifier.groupKey,
          )}
        />
      ))}
    </Box>
  )
}

function PlayedCardModifierItem({
  modifier,
  showRevision,
}: {
  modifier: PlayedCardModifierGroup
  showRevision: boolean
}) {
  const { t } = useTranslation()
  const title =
    modifier.count > 1
      ? t('gameHistory.cardModifierStackLabel', {
          name: modifier.modifierName,
          count: modifier.count,
        })
      : modifier.modifierName
  const hasImpact =
    modifier.scoreDelta !== 0 ||
    modifier.killDelta !== 0 ||
    modifier.multiplierAppliedValues.length > 0
  const hasDetails = Boolean(modifier.modifierDescription || modifier.violationComments.length > 0)
  const summary = (
    <Box
      component="span"
      sx={{
        display: 'flex',
        width: '100%',
        minWidth: 0,
        alignItems: 'center',
        columnGap: 1,
      }}
    >
      {modifier.iconEmoji ? (
        <Box
          aria-hidden
          component="span"
          sx={{
            width: 30,
            height: 30,
            flexShrink: 0,
            display: 'grid',
            placeItems: 'center',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'action.hover',
            fontSize: 17,
            lineHeight: 1,
          }}
        >
          {modifier.iconEmoji}
        </Box>
      ) : null}
      <Box component="span" sx={{ flex: 1, minWidth: 0, display: 'grid', gap: 0.25 }}>
        <Typography
          component="span"
          role="heading"
          aria-level={4}
          variant="body1"
          fontWeight={700}
          color="text.primary"
          sx={{ lineHeight: 1.2 }}
        >
          {title}
        </Typography>
        <Box
          component="span"
          sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'baseline' }}
        >
          {showRevision && modifier.definitionRevision != null ? (
            <Typography component="span" variant="caption" color="text.secondary">
              {t('gameHistory.modifierRevision', { revision: modifier.definitionRevision })}
            </Typography>
          ) : null}
          {modifier.outcomeStatuses.map((status) => {
            const color = getPlayedCardModifierOutcomeColor(status.status)
            return (
              <Typography
                component="span"
                key={status.status}
                variant="caption"
                sx={{ lineHeight: 1.2 }}
                color={color === 'default' ? 'text.secondary' : `${color}.main`}
              >
                {status.count > 1
                  ? t('gameHistory.cardModifierOutcomeStackLabel', {
                      outcome: formatPlayedCardModifierOutcomeStatus(t, status.status),
                      count: status.count,
                    })
                  : formatPlayedCardModifierOutcomeStatus(t, status.status)}
              </Typography>
            )
          })}
        </Box>
      </Box>
      {hasImpact ? (
        <Box
          component="span"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 0.25,
            maxWidth: '40%',
          }}
        >
          {modifier.scoreDelta !== 0 ? (
            <Typography
              component="span"
              variant="body1"
              fontWeight={800}
              sx={{ lineHeight: 1.2, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
              color={modifier.scoreDelta > 0 ? 'success.main' : 'error.main'}
            >
              {t('gameHistory.pointsValue', { points: formatSignedNumber(modifier.scoreDelta) })}
            </Typography>
          ) : null}
          {modifier.killDelta !== 0 ? (
            <Typography
              component="span"
              variant="body2"
              fontWeight={700}
              color={modifier.killDelta > 0 ? 'success.main' : 'error.main'}
            >
              {t('gameHistory.summary.killDeltaShort', {
                value: formatSignedNumber(modifier.killDelta),
              })}
            </Typography>
          ) : null}
          {modifier.multiplierAppliedValues.map((value) => (
            <Typography component="span" key={value} variant="caption" color="text.secondary">
              {t('gameHistory.summary.multiplierShort', { value })}
            </Typography>
          ))}
        </Box>
      ) : null}
    </Box>
  )

  return (
    <ItemCard
      component="li"
      sx={{ py: 0.25, px: 0.75, minWidth: 0, listStyle: 'none', overflowWrap: 'anywhere' }}
    >
      {hasDetails ? (
        <NativeDisclosure summary={summary} density="compact" indicator="chevron">
          <Stack spacing={1} sx={{ pt: 0.5, pb: 0.75 }}>
            {modifier.modifierDescription ? (
              <SectionCard surface="inset" sx={{ p: 1.25 }}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-line', lineHeight: 1.55 }}>
                  {modifier.modifierDescription}
                </Typography>
              </SectionCard>
            ) : null}
            {modifier.violationComments.map((comment, index) => (
              <InlineNotice key={`${modifier.groupKey}-violation-${index}`} severity="warning">
                {t('gameHistory.modifierViolationComment', { comment })}
              </InlineNotice>
            ))}
          </Stack>
        </NativeDisclosure>
      ) : (
        <Box sx={{ minHeight: 44, display: 'flex', alignItems: 'center' }}>{summary}</Box>
      )}
    </ItemCard>
  )
}

function formatSignedNumber(value: number) {
  return value > 0 ? `+${value}` : `${value}`
}

function hasResultImpact(modifier: PlayedCardModifierGroup) {
  return modifier.scoreDelta !== 0 || modifier.killDelta !== 0
}
