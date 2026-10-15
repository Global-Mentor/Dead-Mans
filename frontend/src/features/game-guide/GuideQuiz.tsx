import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { DetailBlock, InlineNotice, ItemCard, Metric } from '../../shared/ui/index.ts'
import { GuideSection } from './GuideSection.tsx'

export function GuideQuiz() {
  const { t } = useTranslation()
  return (
    <GuideSection
      id="quiz"
      number="03"
      title={t('gameGuide.quiz.title')}
      description={t('gameGuide.quiz.description')}
    >
      <Typography variant="body1">{t('gameGuide.quiz.essence')}</Typography>
      <DetailBlock>
        <Stack spacing={1}>
          <Typography component="h3" variant="h6" color="primary.light">
            {t('gameGuide.quiz.earnTitle')}
          </Typography>
          <Typography variant="body1">{t('gameGuide.quiz.earn')}</Typography>
        </Stack>
      </DetailBlock>
      <InlineNotice severity="info" role="note">
        {t('gameGuide.quiz.answerRule')}
      </InlineNotice>
      <Typography variant="body1">{t('gameGuide.quiz.result')}</Typography>
      <ItemCard emphasis="available">
        <Stack spacing={1.5}>
          <Typography variant="overline" color="primary.light">
            {t('gameGuide.quiz.exampleTitle')}
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 1.5,
            }}
          >
            {(['earned', 'spent', 'left'] as const).map((key, index) => (
              <Metric
                key={key}
                appearance="summary"
                density="compact"
                emphasis="result"
                label={t(`gameGuide.quiz.${key}`)}
                value={[100, 60, 40][index]}
              />
            ))}
          </Box>
        </Stack>
      </ItemCard>
    </GuideSection>
  )
}
