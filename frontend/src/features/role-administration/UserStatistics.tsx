import { Box } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { RoleAdministrationPage } from '../../shared/api/contracts/index.ts'
import { RoundBriefingPanel } from '../../shared/game-ui/index.ts'
import { Metric, SectionDivider } from '../../shared/ui/index.ts'

export function UserStatistics({ summary }: { summary: RoleAdministrationPage['summary'] }) {
  const { t, i18n } = useTranslation()
  const metrics = [
    ['totalUsers', summary.totalUsers],
    ['loggedInUsers', summary.loggedInUsers],
    ['noLoginUsers', summary.totalUsers - summary.loggedInUsers],
    ['newUsers', summary.newUsers],
  ] as const
  return (
    <RoundBriefingPanel
      component="section"
      aria-label={t('roleAdministration.summary')}
      sx={{ px: 1.5, py: 0.75 }}
    >
      <Box
        sx={{
          display: 'grid',
          columnGap: 1,
          rowGap: 0.75,
          gridTemplateColumns:
            'minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 1fr)',
        }}
      >
        {metrics.map(([label, value], index) => (
          <Box key={label} sx={{ display: 'contents' }}>
            {index > 0 ? <SectionDivider orientation="vertical" flexItem /> : null}
            <Metric
              appearance="summary"
              density="compact"
              emphasis="label"
              label={t(`roleAdministration.${label}`)}
              value={value.toLocaleString(i18n.resolvedLanguage)}
            />
          </Box>
        ))}
      </Box>
    </RoundBriefingPanel>
  )
}
