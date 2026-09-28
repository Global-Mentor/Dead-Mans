import { Stack, Typography } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AppAccordion,
  AppAccordionDetails,
  AppAccordionSummary,
  AppButton,
  AppDialog,
  ChoiceCard,
  ChoiceGroup,
  FormSelect,
  FormTextField,
  PageShell,
  SectionCard,
  SectionHeader,
} from '../../shared/ui/index.ts'
export function UiStateGallery() {
  const { t } = useTranslation()
  const [choice, setChoice] = useState('primary')
  const [dialogOpen, setDialogOpen] = useState(false)
  const description = t('navigation.uiStateGallery.description')

  return (
    <PageShell>
      <Stack spacing={2}>
        <SectionHeader
          headingLevel="h1"
          title={t('navigation.uiStateGallery.title')}
          description={description}
        />

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems="stretch">
          {(['panel', 'inset', 'accented', 'plain'] as const).map((surface) => (
            <SectionCard key={surface} surface={surface} sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle2">{surface}</Typography>
            </SectionCard>
          ))}
        </Stack>

        <SectionCard>
          <Stack direction="row" gap={1} useFlexGap flexWrap="wrap">
            <AppButton>{t('common.actions.save')}</AppButton>
            <AppButton tone="secondary">{t('common.actions.cancel')}</AppButton>
            <AppButton tone="danger">{t('common.actions.close')}</AppButton>
            <AppButton tone="ghost">{t('common.actions.close')}</AppButton>
            <AppButton disabled>{t('common.actions.save')}</AppButton>
            <AppButton loading>{t('common.actions.save')}</AppButton>
            <AppButton size="small">{t('common.actions.save')}</AppButton>
          </Stack>
        </SectionCard>

        <SectionCard>
          <Stack spacing={1.5}>
            <FormTextField label={t('common.entities.player')} />
            <FormTextField label={t('common.entities.player')} error helperText={description} />
            <FormTextField label={t('common.entities.player')} multiline minRows={2} disabled />
            <FormSelect
              ariaLabel={t('common.entities.player')}
              value="primary"
              onChange={() => undefined}
              options={[
                { value: 'primary', label: t('common.actions.save') },
                { value: 'secondary', label: t('common.actions.cancel') },
              ]}
            />
          </Stack>
        </SectionCard>

        <ChoiceGroup value={choice} onChange={(event) => setChoice(event.target.value)}>
          <ChoiceCard
            value="primary"
            selected={choice === 'primary'}
            title={t('common.actions.save')}
            description={description}
          />
          <ChoiceCard
            value="secondary"
            selected={choice === 'secondary'}
            title={t('common.actions.cancel')}
            description={description}
          />
        </ChoiceGroup>

        <AppAccordion surface="inset">
          <AppAccordionSummary>
            <Typography variant="subtitle2">{t('navigation.uiStateGallery.title')}</Typography>
          </AppAccordionSummary>
          <AppAccordionDetails>
            <Typography color="text.secondary">{description}</Typography>
          </AppAccordionDetails>
        </AppAccordion>

        <AppButton tone="secondary" onClick={() => setDialogOpen(true)}>
          {t('common.actions.open')}
        </AppButton>
      </Stack>

      <AppDialog
        open={dialogOpen}
        title={t('navigation.uiStateGallery.title')}
        description={description}
        onClose={() => setDialogOpen(false)}
        actions={
          <>
            <AppButton tone="secondary" size="large" onClick={() => setDialogOpen(false)}>
              {t('common.actions.cancel')}
            </AppButton>
            <AppButton size="large" onClick={() => setDialogOpen(false)}>
              {t('common.actions.save')}
            </AppButton>
          </>
        }
      />
    </PageShell>
  )
}
