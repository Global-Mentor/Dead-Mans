import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import {
  DetailBlock,
  AppAccordion,
  AppAccordionSummary,
  AppAccordionDetails,
  ItemCard,
  InlineNotice,
  Metric,
  OrnamentDivider,
} from '../../shared/ui/index.ts'
import { GuideSection } from './GuideSection.tsx'

const results = [
  ['first', 600],
  ['second', 400],
  ['third', -100],
] as const

export function GuideScoring() {
  const { t, i18n } = useTranslation()
  const numbers = new Intl.NumberFormat(i18n.resolvedLanguage)
  return (
    <GuideSection
      id="score"
      number="05"
      title={t('gameGuide.score.title')}
      description={t('gameGuide.score.description')}
    >
      <Typography variant="body1">{t('gameGuide.score.round')}</Typography>
      <DetailBlock>
        <Stack spacing={1}>
          <Typography variant="overline" color="primary.light">
            {t('gameGuide.score.roundExample')}
          </Typography>
          <Typography variant="body1">{t('gameGuide.score.example')}</Typography>
          <Typography variant="h5" component="p" color="primary.light">
            {t('gameGuide.score.roundFormula')}
          </Typography>
        </Stack>
      </DetailBlock>
      <Typography variant="body1">{t('gameGuide.score.team')}</Typography>
      <InlineNotice severity="warning" role="note">
        <Typography component="p" variant="subtitle2">
          {t('gameGuide.score.persistentTitle')}
        </Typography>
        {t('gameGuide.score.persistent')}
      </InlineNotice>
      <ItemCard emphasis="available" frame="corner">
        <Stack spacing={1.5}>
          <Typography variant="h6" component="h3" color="primary.light">
            {t('gameGuide.score.formula')}
          </Typography>
          <Typography variant="body2">{t('gameGuide.score.caption')}</Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 1.5,
            }}
          >
            {results.map(([round, value]) => (
              <Metric
                key={round}
                label={t(`gameGuide.score.${round}`)}
                value={numbers.format(value)}
                appearance="summary"
                emphasis="result"
                description={
                  <Typography variant="caption">
                    {t(value < 0 ? 'gameGuide.score.penalty' : 'gameGuide.score.positive')}
                  </Typography>
                }
              />
            ))}
          </Box>
          <OrnamentDivider />
          <Typography variant="h3" component="p" textAlign="center" color="primary.light">
            {t('gameGuide.score.total')}
          </Typography>
          <Typography variant="body1">{t('gameGuide.score.explanation')}</Typography>
          <Typography variant="body1">{t('gameGuide.score.nextRound')}</Typography>
        </Stack>
      </ItemCard>
      <AppAccordion surface="inset" slotProps={{ heading: { component: 'h3' } }}>
        <AppAccordionSummary id="scoring-details-trigger" aria-controls="scoring-details">
          <Typography component="span" variant="subtitle1">
            {t('gameGuide.score.details')}
          </Typography>
        </AppAccordionSummary>
        <AppAccordionDetails>
          <Stack spacing={1.5}>
            <Typography variant="body1">{t('gameGuide.score.empty')}</Typography>
            <Typography variant="body1">{t('gameGuide.score.penaltyRule')}</Typography>
            <Typography variant="body1">{t('gameGuide.score.noPositive')}</Typography>
            <Typography variant="body1">{t('gameGuide.score.ties')}</Typography>
          </Stack>
        </AppAccordionDetails>
      </AppAccordion>
    </GuideSection>
  )
}
