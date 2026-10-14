import { ItemCard, SectionDivider } from '../ui/index.ts'
import { Box, Stack, Typography } from '@mui/material'
import { Fragment } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import type { components } from '../api/contracts/generated'

import { RoundScoreTotal } from './RoundScoreTotal.tsx'
import { broadcastUpdateSx } from './broadcast-motion.ts'

type ScoreDetails = components['schemas']['GameRoundScoreDetailsDto']
type CalculationLine = components['schemas']['GameRoundScoreCalculationLineDto']

export function RoundScoreBreakdown({
  score,
  showHeading = true,
  showTotal = true,
  provisional = false,
  presentation = 'detailed',
  animateChanges = false,
}: {
  score: ScoreDetails
  showHeading?: boolean
  showTotal?: boolean
  provisional?: boolean
  presentation?: 'detailed' | 'compact'
  animateChanges?: boolean
}) {
  const { t } = useTranslation()

  return (
    <ItemCard data-testid="round-score-breakdown">
      <Stack spacing={1}>
        {showHeading ? (
          <Typography variant="subtitle2" fontWeight={850}>
            {t('common.scoreBreakdown.title')}
          </Typography>
        ) : null}
        {presentation === 'detailed' ? (
          <>
            <Typography variant="caption" color="text.secondary">
              {t(
                provisional
                  ? 'common.scoreBreakdown.provisional'
                  : 'common.scoreBreakdown.authoritative',
              )}
            </Typography>
            <SectionDivider />
          </>
        ) : null}
        {(score.calculationLines ?? []).map((line, index) => (
          <Fragment key={`${line.kind}-${line.modifierId ?? 'base'}-${index}`}>
            {index > 0 ? <SectionDivider /> : null}
            <CalculationRow
              line={line}
              compact={presentation === 'compact'}
              animateChanges={animateChanges}
            />
          </Fragment>
        ))}
        {showTotal ? (
          <RoundScoreTotal
            label={t(
              provisional ? 'common.scoreBreakdown.previewTotal' : 'common.scoreBreakdown.final',
            )}
            value={formatSigned(score.finalScore, false)}
            score={score.finalScore}
            animateChanges={animateChanges}
          />
        ) : null}
      </Stack>
    </ItemCard>
  )
}

function CalculationRow({
  line,
  compact,
  animateChanges,
}: {
  line: CalculationLine
  compact: boolean
  animateChanges: boolean
}) {
  const { t } = useTranslation()
  const title = line.modifierName
    ? t('common.scoreBreakdown.modifierTitle', {
        name: line.modifierName,
        count: line.activationCount,
      })
    : t(`common.scoreBreakdown.kind.${line.kind}`)
  const explanation = compact
    ? null
    : describeLine(
        line,
        Object.fromEntries(line.operands.map((item) => [item.code, item.value])),
        t,
      )

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) auto',
        gap: 1.5,
        py: 0.5,
        alignItems: 'start',
      }}
    >
      <Stack spacing={0.5} sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
        <Typography variant="body1" fontWeight={750}>
          {title}
        </Typography>
        {!compact ? (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
              {explanation}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('common.scoreBreakdown.runningTotal', { value: String(line.runningTotal) })}
            </Typography>
          </>
        ) : null}
      </Stack>
      <Typography
        component="span"
        variant="h6"
        fontWeight={850}
        color={
          line.pointsDelta > 0
            ? 'success.main'
            : line.pointsDelta < 0
              ? 'error.main'
              : 'text.primary'
        }
        sx={{
          borderLeft: '1px solid',
          borderColor: 'divider',
          pl: 1.25,
          minWidth: compact ? '4ch' : '3ch',
          ...(compact ? { boxSizing: 'content-box' } : {}),
          textAlign: 'right',
        }}
      >
        {animateChanges ? (
          <Box
            component="span"
            key={line.pointsDelta}
            sx={{ display: 'inline-block', ...broadcastUpdateSx }}
          >
            {formatSigned(line.pointsDelta)}
          </Box>
        ) : (
          formatSigned(line.pointsDelta)
        )}
      </Typography>
    </Box>
  )
}

function describeLine(line: CalculationLine, value: Record<string, number>, t: TFunction) {
  if (line.kind === 'kills') {
    return t('common.scoreBreakdown.formula.units', {
      count: value.killsCount ?? 0,
      unit: operandText(value.cardValue),
      result: operandText(line.pointsDelta),
    })
  }
  if (line.kind === 'bounties') {
    return t('common.scoreBreakdown.formula.units', {
      count: value.bountyCount ?? 0,
      unit: operandText(value.cardValue),
      result: operandText(line.pointsDelta),
    })
  }
  if (line.kind === 'emptyCardPenalty') {
    return t('common.scoreBreakdown.formula.emptyPenalty', {
      cardValue: operandText(value.cardValue),
    })
  }
  if (
    line.formulaCode === 'growing_kill_value' ||
    (line.formulaCode === 'kill_value_increase_per_unit' && value.adjustedKillValue !== undefined)
  ) {
    if (value.killsCount === 0) {
      return t('common.scoreBreakdown.formula.growingZero', {
        penalty: operandText(value.zeroKillPenaltyPoints ?? value.zeroCountPenaltyPoints),
        activations: operandText(value.activationCount),
        result: operandText(line.pointsDelta),
      })
    }
    return t('common.scoreBreakdown.formula.growing', {
      increment: operandText(value.incrementPointsPerKill ?? value.incrementPointsPerUnit),
      kills: operandText(value.killsCount),
      activations: operandText(value.activationCount),
      bonusPerKill: operandText(value.bonusPerKill),
      cardValue: operandText(value.cardValue),
      adjustedKillValue: operandText(value.adjustedKillValue),
      adjustedKillsScore: operandText(value.adjustedKillsScore),
      baseKillsScore: operandText(value.baseKillsScore),
      result: operandText(line.pointsDelta),
    })
  }
  if (line.formulaCode === 'fixed_points_per_unit') {
    return t('common.scoreBreakdown.formula.fixedPoints', {
      units: operandText(value.sourceUnits),
      points: operandText(value.pointsPerUnit),
      result: operandText(line.pointsDelta),
    })
  }
  if (line.formulaCode === 'card_percent_per_unit') {
    return t('common.scoreBreakdown.formula.cardPercent', {
      units: operandText(value.sourceUnits),
      cardValue: operandText(value.cardValue),
      rate: operandText((value.rate ?? 0) * 100),
      result: operandText(line.pointsDelta),
    })
  }
  if (line.formulaCode === 'bonus_kills_per_unit') {
    return t('common.scoreBreakdown.formula.bonusKillsPerUnit', {
      units: operandText(value.sourceUnits),
      bonusPerUnit: operandText(value.bonusKillsPerUnit),
      bonusKills: operandText(value.bonusKills),
      cardValue: operandText(value.cardValue),
      result: operandText(line.pointsDelta),
    })
  }
  if (line.formulaCode === 'kill_value_increase_per_unit') {
    return t('common.scoreBreakdown.formula.killValueIncrease', {
      units: operandText(value.sourceUnits),
      increment: operandText(value.incrementPointsPerUnit),
      kills: operandText(value.killsCount),
      increase: operandText(value.killValueIncreasePoints),
      zeroActivations: operandText(value.zeroSourceActivations),
      zeroPenalty: operandText(value.zeroCountPenaltyPoints),
      penalty: operandText(value.zeroSourcePenaltyPoints),
      result: operandText(line.pointsDelta),
    })
  }
  if (line.kind === 'modifierBonusKills') {
    return t('common.scoreBreakdown.formula.bonusKills', {
      bonusKills: operandText(value.bonusKills),
      cardValue: operandText(value.cardValue),
      result: operandText(line.pointsDelta),
    })
  }
  if (line.formulaCode === 'window_kill_bonus_points') {
    return t('common.scoreBreakdown.formula.windowBonus', {
      count: value.inputCount ?? 0,
      cardValue: operandText(value.cardValue),
      rate: operandText((value.bonusRate ?? 0) * 100),
      result: operandText(line.pointsDelta),
    })
  }
  return t('common.scoreBreakdown.formula.delta', { result: String(line.pointsDelta) })
}

function operandText(value: number | undefined) {
  return value === undefined ? '-' : String(value)
}

function formatSigned(value: number, showPlus = true) {
  return `${showPlus && value > 0 ? '+' : ''}${value}`
}
