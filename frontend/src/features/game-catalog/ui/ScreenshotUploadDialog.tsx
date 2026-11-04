import { zodResolver } from '@hookform/resolvers/zod'
import { Box, Stack, Typography } from '@mui/material'
import { useRef } from 'react'
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import type { GameQuestionCategoryItem } from '../../../shared/api/contracts/index.ts'
import { huntName, huntMapName } from '../../../shared/game-ui/index.ts'
import {
  AppButton,
  AppDialog,
  ControlledFormTextField,
  DiscardChangesDialog,
  FilePickerInput,
  FormSelect,
  ImageFrame,
  InlineNotice,
  ItemCard,
  StatusBadge,
  useDirtyClose,
} from '../../../shared/ui/index.ts'
import { huntMapsQueryOptions } from '../api/quiz-screenshots-api.ts'
import { useScreenshotUpload } from '../use-screenshot-upload.ts'
import { resolveCatalogErrorMessage } from '../model/catalog-error.ts'
import { createScreenshotFormSchema } from '../model/screenshot-form-schema.ts'
import { QuestionAnswerFields } from './QuestionAnswerFields.tsx'

export function ScreenshotUploadDialog({
  categories,
  onClose,
}: {
  categories: readonly GameQuestionCategoryItem[]
  onClose: () => void
}) {
  const { t, i18n } = useTranslation()
  const upload = useScreenshotUpload()
  const picker = useRef<HTMLInputElement>(null)
  const required = t('gameCatalog.validation.required')
  const locationCategory = categories.find((category) => category.isLocationCategory)
  const schema = createScreenshotFormSchema(
    {
      required,
      number: t('gameCatalog.validation.number'),
      tooLong: t('gameCatalog.validation.tooLong'),
      maxAnswers: t('gameCatalog.validation.answerLimit'),
      duplicateAnswers: t('gameCatalog.validation.duplicateAnswers'),
      correctAnswer: t('gameCatalog.validation.correctAnswer'),
    },
    locationCategory?.id,
  )
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      text: '',
      mapId: '',
      locationId: '',
      categoryId:
        locationCategory?.id ??
        categories.find((category) => category.isProtected)?.id ??
        categories[0]?.id ??
        '',
      reward: '1',
      priority: '0',
      isEnabled: true,
      options: Array.from({ length: 4 }, (_, index) => ({ text: '', isCorrect: index === 0 })),
    },
  })
  const categoryId = useWatch({ control: form.control, name: 'categoryId' })
  const isLocation = Boolean(locationCategory && categoryId === locationCategory.id)
  const maps = useQuery({ ...huntMapsQueryOptions, enabled: isLocation })
  const mapId = useWatch({ control: form.control, name: 'mapId' })
  const map = maps.data?.find((item) => item.id === mapId)
  const pending = upload.rows.filter((row) => row.status !== 'done').length
  const close = useDirtyClose({
    dirty: pending > 0 || (!upload.locked && form.formState.isDirty),
    busy: upload.busy,
    onClose,
  })
  const submit = form.handleSubmit((values) =>
    upload.upload({
      text: values.text,
      ...(isLocation ? { locationId: values.locationId } : { options: values.options }),
      categoryId: values.categoryId,
      reward: Number(values.reward),
      priority: 0,
      isEnabled: true,
    }),
  )
  return (
    <>
      <AppDialog
        open
        title={t('gameCatalog.screenshots.title')}
        onClose={close.requestClose}
        maxWidth="md"
        description={t('gameCatalog.screenshots.help')}
        actions={
          <>
            <AppButton tone="secondary" disabled={upload.busy} onClick={close.requestClose}>
              {t('common.actions.close')}
            </AppButton>
            <AppButton
              tone="primary"
              loading={upload.busy}
              disabled={!pending || (isLocation && (maps.isError || !map))}
              onClick={() => void submit()}
            >
              {t('gameCatalog.screenshots.upload')}
            </AppButton>
          </>
        }
      >
        <Stack spacing={1.5}>
          {isLocation && maps.isError ? (
            <InlineNotice
              severity="error"
              action={
                <AppButton tone="secondary" onClick={() => void maps.refetch()}>
                  {t('common.actions.retry')}
                </AppButton>
              }
            >
              {t('gameCatalog.screenshots.loadError')}
            </InlineNotice>
          ) : null}
          <Controller
            control={form.control}
            name="categoryId"
            render={({ field, fieldState }) => (
              <FormSelect
                label={t('gameCatalog.questions.fields.category')}
                value={field.value}
                disabled={upload.locked}
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
                options={categories.map((item) => ({
                  value: item.id,
                  label: item.isLocationCategory
                    ? t('gameCatalog.screenshots.locationCategory')
                    : item.name,
                }))}
                onChange={field.onChange}
              />
            )}
          />
          {isLocation ? (
            <>
              <Controller
                control={form.control}
                name="mapId"
                render={({ field, fieldState }) => (
                  <FormSelect
                    label={t('gameCatalog.screenshots.map')}
                    value={field.value}
                    disabled={upload.locked || maps.isPending}
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                    options={(maps.data ?? []).map((item) => ({
                      value: item.id,
                      label: huntMapName(item.names, i18n.language),
                    }))}
                    onChange={(value) => {
                      field.onChange(value)
                      form.setValue('locationId', '')
                    }}
                  />
                )}
              />
              <Controller
                control={form.control}
                name="locationId"
                render={({ field, fieldState }) => (
                  <FormSelect
                    label={t('gameCatalog.screenshots.location')}
                    value={field.value}
                    disabled={upload.locked || !map}
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                    options={(map?.locations ?? []).map((item) => ({
                      value: item.id,
                      label: huntName(item.names, i18n.language),
                    }))}
                    onChange={field.onChange}
                  />
                )}
              />
            </>
          ) : null}
          <ControlledFormTextField
            control={form.control}
            name="reward"
            label={t('gameCatalog.questions.fields.reward')}
            disabled={upload.locked}
            slotProps={{ htmlInput: { inputMode: 'numeric' } }}
          />
          <ControlledFormTextField
            control={form.control}
            name="text"
            label={t('gameCatalog.screenshots.question')}
            helperText={t('gameCatalog.screenshots.questionHelp')}
            disabled={upload.locked}
            multiline
            minRows={2}
          />
          {!isLocation ? (
            <FormProvider {...form}>
              <QuestionAnswerFields busy={upload.locked} />
            </FormProvider>
          ) : null}
          <FilePickerInput
            ref={picker}
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(event) => {
              upload.add(Array.from(event.target.files ?? []))
              event.target.value = ''
            }}
          />
          <AppButton
            tone="secondary"
            disabled={upload.locked}
            onClick={() => picker.current?.click()}
          >
            {t('gameCatalog.screenshots.choose')}
          </AppButton>
          <Typography role="status">
            {t('gameCatalog.screenshots.progress', {
              done: upload.rows.length - pending,
              total: upload.rows.length,
            })}
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
              gap: 1,
            }}
          >
            {upload.rows.map((row) => (
              <ItemCard key={row.id}>
                <Stack spacing={1}>
                  <ImageFrame
                    loading="lazy"
                    src={row.preview}
                    alt={row.file.name}
                    loadingLabel={t('common.quizImage.loading')}
                    errorLabel={t('common.quizImage.error')}
                    sizing="fill"
                    sx={{ height: 150 }}
                  />
                  <Typography sx={{ overflowWrap: 'anywhere' }}>{row.file.name}</Typography>
                  <StatusBadge
                    label={t(`gameCatalog.screenshots.status.${row.status}`)}
                    color={row.status === 'done' ? 'success' : 'default'}
                  />
                  {row.status === 'error' ? (
                    <InlineNotice severity="error">
                      {resolveCatalogErrorMessage(row.error, t)}
                    </InlineNotice>
                  ) : null}
                  {row.status !== 'done' ? (
                    <AppButton
                      tone="secondary"
                      disabled={upload.busy}
                      onClick={() => upload.remove(row.id)}
                    >
                      {t('common.actions.remove')}
                    </AppButton>
                  ) : null}
                </Stack>
              </ItemCard>
            ))}
          </Box>
        </Stack>
      </AppDialog>
      <DiscardChangesDialog
        open={close.confirmOpen}
        busy={upload.busy}
        onClose={close.keepEditing}
        onDiscard={close.discard}
      />
    </>
  )
}
