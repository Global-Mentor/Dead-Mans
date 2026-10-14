import { Stack, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TwitchQuizPreview } from '../../../shared/api/contracts/index.ts'
import {
  AppButton,
  DetailBlock,
  InlineNotice,
  NativeDisclosure,
  StatusBadge,
} from '../../../shared/ui/index.ts'
import { previewTwitchQuizMessages } from '../../game-questions/index.ts'
import { maxQuestionReward } from '../model/question-form-schema.ts'

export function QuestionTwitchPreview({
  text,
  options,
  reward,
}: {
  text: string
  options: string[]
  reward: string
}) {
  const { t, i18n } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const [retry, setRetry] = useState(0)
  const [result, setResult] = useState<{
    key: string
    failed: boolean
    preview: TwitchQuizPreview | null
  } | null>(null)
  const safeReward =
    /^\d+$/.test(reward) && Number(reward) <= maxQuestionReward ? Number(reward) : 0
  const key = JSON.stringify([text, options, safeReward, retry])
  const pending = result?.key !== key
  const preview = result?.preview
  const number = (value: number) => new Intl.NumberFormat(i18n.resolvedLanguage).format(value)
  useEffect(() => {
    let active = true
    const timer = window.setTimeout(() => {
      void previewTwitchQuizMessages(text, options, safeReward)
        .then((preview) => {
          if (active) setResult({ key, failed: false, preview })
        })
        .catch(() => {
          if (active)
            setResult((previous) => ({ key, failed: true, preview: previous?.preview ?? null }))
        })
    }, 350)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [key, text, options, safeReward])
  return (
    <NativeDisclosure
      indicator="chevron"
      density="tight"
      surface="panel"
      open={expanded}
      onExpandedChange={setExpanded}
      summary={
        <Typography component="span" sx={{ display: 'block', textAlign: 'center' }}>
          {t('gameCatalog.questions.editor.previewTitle')}
        </Typography>
      }
    >
      <Stack gap={1.25} sx={{ pt: 1 }} aria-busy={pending}>
        <Stack
          direction="row"
          gap={1}
          alignItems="center"
          justifyContent="center"
          flexWrap="wrap"
          sx={{ minHeight: 28 }}
        >
          {preview ? (
            <StatusBadge
              color={preview.isCompatible ? 'success' : 'warning'}
              label={t(
                preview.isCompatible
                  ? 'gameCatalog.questions.editor.compatible'
                  : 'gameCatalog.questions.twitchIncompatibleBadge',
              )}
            />
          ) : null}
          <Typography variant="caption" color="text.secondary" role="status">
            {pending ? t('gameCatalog.questions.editor.previewLoading') : ''}
          </Typography>
        </Stack>
        {[
          {
            label: t('gameCatalog.questions.editor.previewQuestion'),
            text: preview?.question,
            length: preview?.questionLength,
          },
          {
            label: t('gameCatalog.questions.editor.previewAnswers'),
            text: preview?.options,
            length: preview?.optionsLength,
          },
          {
            label: t('gameCatalog.questions.editor.previewResult'),
            text: preview?.resultTemplate,
            length: preview?.resultMaximumLength,
          },
        ].map((message) => (
          <DetailBlock key={message.label} sx={{ textAlign: 'center' }}>
            <Typography variant="subtitle2">{message.label}</Typography>
            <Typography
              variant="body2"
              sx={{ mt: 0.5, minHeight: '1.5em', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
            >
              {message.text ?? t('gameCatalog.questions.editor.previewLoading')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {message.length === undefined ? '-' : number(message.length)} /{' '}
              {number(preview?.maximumLength ?? 500)}
            </Typography>
          </DetailBlock>
        ))}
        {!pending && result?.failed ? (
          <InlineNotice
            severity="warning"
            action={
              <AppButton tone="secondary" onClick={() => setRetry((value) => value + 1)}>
                {t('common.actions.retry')}
              </AppButton>
            }
          >
            {t('gameCatalog.questions.editor.previewError')}
          </InlineNotice>
        ) : preview && !preview.isCompatible ? (
          <InlineNotice severity="warning">{t('gameCatalog.questions.twitchTooLong')}</InlineNotice>
        ) : null}
      </Stack>
    </NativeDisclosure>
  )
}
