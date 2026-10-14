import { Box } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { GameModifierAdminPlayersResult } from '../../../shared/api/contracts/index.ts'
import { RoundBriefingPanel, RoundBriefingDivider } from '../../../shared/game-ui/index.ts'
import { Metric, SectionDivider } from '../../../shared/ui/index.ts'

export function AdminModifierSummary({
  summary,
  usedCount,
}: {
  summary: GameModifierAdminPlayersResult['summary']
  usedCount: number
}) {
  const { t } = useTranslation()
  const metrics = [
    {
      key: 'summaryAvailablePoints',
      value: t('gameModifiers.myPointsValue', { points: summary.totalAvailableQuizPoints }),
    },
    {
      key: 'summarySpentPoints',
      value: t('gameModifiers.myPointsValue', { points: summary.totalSpentQuizPoints }),
    },
    {
      key: 'summaryEarnedPoints',
      value: t('gameModifiers.myPointsValue', { points: summary.totalEarnedQuizPoints }),
    },
    { key: 'summaryUsedLabel', value: String(usedCount) },
  ] as const
  return (
    <RoundBriefingPanel sx={{ p: 1.25 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
          columnGap: 1,
          rowGap: 0.75,
        }}
      >
        {metrics.map((metric, index) => (
          <Box key={metric.key} sx={{ display: 'contents' }}>
            {index === 2 ? <RoundBriefingDivider sx={{ gridColumn: '1 / -1' }} /> : null}
            {index % 2 === 1 ? <SectionDivider orientation="vertical" flexItem /> : null}
            <Metric
              appearance="summary"
              density="compact"
              label={t(`gameModifiers.adminPanel.${metric.key}`)}
              helpTarget="label"
              help={t(`gameModifiers.adminPanel.${metric.key}Help`)}
              value={metric.value}
            />
          </Box>
        ))}
      </Box>
    </RoundBriefingPanel>
  )
}
