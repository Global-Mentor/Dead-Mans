import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { StatusBadge } from '../../shared/ui/index.ts'
import { GuideSection } from './GuideSection.tsx'
import { GuideIllustration } from './GuideIllustration.tsx'

const steps = ['choose', 'order', 'prepare', 'play', 'review', 'result'] as const

export function GuideRound() {
  const { t } = useTranslation()
  return (
    <GuideSection
      id="round"
      number="02"
      title={t('gameGuide.round.title')}
      description={t('gameGuide.round.description')}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1.3fr) minmax(0, 1fr)' },
          gap: 2,
          alignItems: 'start',
        }}
      >
        <Stack component="ol" spacing={2.5} sx={{ m: 0, p: 0, listStyle: 'none' }}>
          {steps.map((step, index) => (
            <Stack component="li" key={step} direction="row" spacing={1.5} alignItems="flex-start">
              <StatusBadge aria-hidden variant="outlined" label={index + 1} />
              <Stack spacing={0.5}>
                <Typography component="h3" variant="h6" color="primary.light">
                  {t(`gameGuide.round.${step}Title`)}
                </Typography>
                <Typography variant="body1">{t(`gameGuide.round.${step}`)}</Typography>
              </Stack>
            </Stack>
          ))}
        </Stack>
        <GuideIllustration kind="board" />
      </Box>
    </GuideSection>
  )
}
