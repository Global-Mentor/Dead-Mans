import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import {
  AppAccordion,
  AppAccordionSummary,
  AppAccordionDetails,
  DetailBlock,
  InlineNotice,
  StatusBadge,
} from '../../shared/ui/index.ts'
import { GuideSection } from './GuideSection.tsx'
import { GuideIllustration } from './GuideIllustration.tsx'

export function GuideRegistration() {
  const { t } = useTranslation()
  return (
    <GuideSection
      id="start"
      number="01"
      title={t('gameGuide.start.title')}
      description={t('gameGuide.start.description')}
    >
      <InlineNotice severity="info" role="note">
        <Typography variant="subtitle2" component="p">
          {t('gameGuide.start.windowTitle')}
        </Typography>
        {t('gameGuide.start.window')}
      </InlineNotice>
      <Stack component="ol" spacing={2.5} sx={{ m: 0, p: 0, listStyle: 'none' }}>
        {(['join', 'ready', 'confirm'] as const).map((step, index) => (
          <Stack component="li" key={step} direction="row" spacing={1.5} alignItems="flex-start">
            <StatusBadge aria-hidden variant="outlined" label={index + 1} />
            <Stack spacing={0.5}>
              <Typography component="h3" variant="h6" color="primary.light">
                {t(`gameGuide.start.steps.${step}Title`)}
              </Typography>
              <Typography variant="body1">{t(`gameGuide.start.steps.${step}`)}</Typography>
            </Stack>
          </Stack>
        ))}
      </Stack>
      <InlineNotice severity="warning" role="note">
        {t('gameGuide.start.confirmation')}
      </InlineNotice>
      <AppAccordion surface="inset" slotProps={{ heading: { component: 'h3' } }}>
        <AppAccordionSummary id="registration-details-trigger" aria-controls="registration-details">
          <Typography component="span" variant="subtitle1">
            {t('gameGuide.start.details')}
          </Typography>
        </AppAccordionSummary>
        <AppAccordionDetails>
          <Stack spacing={2}>
            <GuideIllustration kind="application" />
            <Box
              sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}
            >
              {(['open', 'closed'] as const).map((kind) => (
                <DetailBlock key={kind}>
                  <Stack spacing={1}>
                    <Box>
                      <StatusBadge label={t(`gameGuide.start.${kind}Title`)} variant="outlined" />
                    </Box>
                    <Typography variant="body1">{t(`gameGuide.start.${kind}`)}</Typography>
                  </Stack>
                </DetailBlock>
              ))}
            </Box>
            <Typography variant="body1">{t('gameGuide.start.body')}</Typography>
            <Typography variant="body1">{t('gameGuide.start.ready')}</Typography>
          </Stack>
        </AppAccordionDetails>
      </AppAccordion>
    </GuideSection>
  )
}
