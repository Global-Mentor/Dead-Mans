import { Box, Stack, SvgIcon, Typography } from '@mui/material'
import { useFieldArray, useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import {
  ActionIcon,
  AppButton,
  ControlledFormTextField,
  FormSection,
  HelpTooltip,
  InlineNotice,
} from '../../../shared/ui/index.ts'
import {
  maxQuestionAnswers,
  minQuestionAnswers,
  type QuestionFormValues,
} from '../model/question-form-schema.ts'

export function QuestionAnswerFields({ busy }: { busy: boolean }) {
  const { t } = useTranslation()
  const { control, setFocus, formState } = useFormContext<QuestionFormValues>()
  const { fields, append, remove } = useFieldArray({ control, name: 'options' })
  const canAddAnswer = fields.length < maxQuestionAnswers
  const error = formState.errors.options?.root?.message ?? formState.errors.options?.message
  return (
    <>
      {error ? <InlineNotice severity="error">{error}</InlineNotice> : null}
      <FormSection
        textAlign="center"
        headingSize="small"
        title={t('gameCatalog.questions.fields.answers')}
        description={t('gameCatalog.questions.fields.answersHint')}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr)',
            gap: 1.5,
          }}
        >
          <Box sx={{ pr: 6 }}>
            <ControlledFormTextField
              control={control}
              name="options.0.text"
              required
              label={t('gameCatalog.questions.fields.correctAnswer')}
              placeholder={t('gameCatalog.questions.fields.correctAnswerPlaceholder')}
              disabled={busy}
            />
          </Box>
          {fields.slice(1).map((field, alternativeIndex) => {
            const index = alternativeIndex + 1
            const removeLabel = t('gameCatalog.questions.fields.removeAnswer', {
              number: index,
            })
            return (
              <Stack
                key={field.id}
                direction="row"
                spacing={0.5}
                alignItems="flex-start"
                sx={{ minWidth: 0 }}
              >
                <ControlledFormTextField
                  control={control}
                  name={`options.${index}.text`}
                  label={t('gameCatalog.questions.fields.answerAlternative', {
                    number: index,
                  })}
                  disabled={busy}
                />
                <HelpTooltip title={removeLabel}>
                  <span>
                    <ActionIcon
                      aria-label={removeLabel}
                      size="small"
                      disabled={busy || fields.length <= minQuestionAnswers}
                      onClick={() => {
                        remove(index)
                        requestAnimationFrame(() =>
                          setFocus(`options.${Math.min(index, fields.length - 2)}.text`),
                        )
                      }}
                    >
                      <SvgIcon fontSize="small">
                        <path
                          d="m6 6 12 12M6 18 18 6"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                      </SvgIcon>
                    </ActionIcon>
                  </span>
                </HelpTooltip>
              </Stack>
            )
          })}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={1}
            sx={{ gridColumn: '1 / -1' }}
          >
            <AppButton
              tone="secondary"
              size="small"
              type="button"
              startIcon={
                <SvgIcon fontSize="small">
                  <path
                    d="M12 5v14M5 12h14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </SvgIcon>
              }
              disabled={busy || !canAddAnswer}
              onClick={() =>
                append(
                  { text: '', isCorrect: false },
                  { focusName: `options.${fields.length}.text` },
                )
              }
              sx={{ flexShrink: 0 }}
            >
              {t('gameCatalog.questions.fields.addAnswer')}
            </AppButton>
            <Typography variant="caption" color="text.secondary" aria-live="polite">
              {t('gameCatalog.questions.fields.answerCount', {
                count: fields.length,
                max: maxQuestionAnswers,
              })}
            </Typography>
          </Stack>
        </Box>
      </FormSection>
    </>
  )
}
