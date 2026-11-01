import { Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { ItemCard, OrnamentDivider, PageShell } from '../../shared/ui/index.ts'
import { GuideNavigation } from './GuideNavigation.tsx'
import { GuideRegistration } from './GuideRegistration.tsx'
import { GuideRound } from './GuideRound.tsx'
import { GuideModifiers } from './GuideModifiers.tsx'
import { GuideQuiz } from './GuideQuiz.tsx'
import { GuideScoring } from './GuideScoring.tsx'
import { GuideFaq } from './GuideFaq.tsx'

export function GameGuidePage() {
  const { t } = useTranslation()
  return (
    <PageShell sx={{ maxWidth: 1040, display: 'grid', gap: 3 }}>
      <ItemCard frame="corner" emphasis="available" component="header" id="guide-top">
        <Stack spacing={1.5}>
          <Typography variant="overline" color="primary.light" textAlign="center">
            {t('gameGuide.overview.eyebrow')}
          </Typography>
          <Typography component="h1" variant="h3" textAlign="center">
            {t('gameGuide.title')}
          </Typography>
          <Typography variant="body1">{t('gameGuide.intro')}</Typography>
          <Typography component="h2" variant="h5" color="primary.light">
            {t('gameGuide.overview.essenceTitle')}
          </Typography>
          <Typography variant="body1">
            <strong>{t('gameGuide.overview.turnOrder')}</strong>
          </Typography>
          <Typography variant="body1">{t('gameGuide.overview.how')}</Typography>
          <Typography variant="body1">{t('gameGuide.overview.influence')}</Typography>
          <Typography component="p" variant="subtitle1" color="primary.light">
            {t('gameGuide.overview.goal')}
          </Typography>
          <OrnamentDivider />
          <Typography variant="body1">{t('gameGuide.overview.roles')}</Typography>
        </Stack>
      </ItemCard>
      <GuideNavigation />
      <Stack spacing={3} sx={{ minWidth: 0 }}>
        <GuideRegistration />
        <GuideRound />
        <GuideQuiz />
        <GuideModifiers />
        <GuideScoring />
        <GuideFaq />
      </Stack>
    </PageShell>
  )
}
