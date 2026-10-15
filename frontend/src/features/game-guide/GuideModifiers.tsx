import { Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import {
  AppAccordion,
  AppAccordionSummary,
  AppAccordionDetails,
  BulletList,
  DetailBlock,
  InlineNotice,
} from '../../shared/ui/index.ts'
import { GuideSection } from './GuideSection.tsx'

export function GuideModifiers() {
  const { t } = useTranslation()
  return (
    <GuideSection
      id="modifiers"
      number="04"
      title={t('gameGuide.modifiers.title')}
      description={t('gameGuide.modifiers.description')}
    >
      <Typography variant="body1">{t('gameGuide.modifiers.essence')}</Typography>
      <DetailBlock>
        <Stack spacing={1}>
          <Typography component="h3" variant="h6" color="primary.light">
            {t('gameGuide.modifiers.spendTitle')}
          </Typography>
          <Typography variant="body1">{t('gameGuide.modifiers.spend')}</Typography>
        </Stack>
      </DetailBlock>
      <InlineNotice severity="warning" role="note">
        <Typography variant="subtitle2" component="p">
          {t('gameGuide.modifiers.ownTeamTitle')}
        </Typography>
        {t('gameGuide.modifiers.ownTeam')}
      </InlineNotice>
      <AppAccordion surface="inset" slotProps={{ heading: { component: 'h3' } }}>
        <AppAccordionSummary id="modifier-details-trigger" aria-controls="modifier-details">
          <Typography component="span" variant="subtitle1">
            {t('gameGuide.modifiers.checkTitle')}
          </Typography>
        </AppAccordionSummary>
        <AppAccordionDetails>
          <BulletList>
            {(['effect', 'limits', 'timers'] as const).map((key) => (
              <Typography component="li" variant="body1" key={key}>
                {t(`gameGuide.modifiers.${key}`)}
              </Typography>
            ))}
          </BulletList>
        </AppAccordionDetails>
      </AppAccordion>
      <Typography variant="body1">{t('gameGuide.modifiers.refund')}</Typography>
    </GuideSection>
  )
}
