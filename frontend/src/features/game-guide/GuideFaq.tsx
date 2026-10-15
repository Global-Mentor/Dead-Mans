import { Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { AppAccordion, AppAccordionDetails, AppAccordionSummary } from '../../shared/ui/index.ts'
import { GuideSection } from './GuideSection.tsx'

const questions = ['noGame', 'leave', 'blocked', 'refund', 'rules'] as const

export function GuideFaq() {
  const { t } = useTranslation()
  return (
    <GuideSection
      id="faq"
      number="06"
      title={t('gameGuide.faq.title')}
      description={t('gameGuide.faq.description')}
    >
      <Stack spacing={1}>
        {questions.map((question) => (
          <AppAccordion key={question} surface="inset" slotProps={{ heading: { component: 'h3' } }}>
            <AppAccordionSummary
              id={`faq-${question}-trigger`}
              aria-controls={`faq-${question}-answer`}
            >
              <Typography component="span" variant="subtitle1">
                {t(`gameGuide.faq.${question}`)}
              </Typography>
            </AppAccordionSummary>
            <AppAccordionDetails>
              <Typography variant="body1">{t(`gameGuide.faq.${question}Answer`)}</Typography>
            </AppAccordionDetails>
          </AppAccordion>
        ))}
      </Stack>
    </GuideSection>
  )
}
