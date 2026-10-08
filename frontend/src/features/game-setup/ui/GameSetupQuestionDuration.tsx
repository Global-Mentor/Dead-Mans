import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FormTextField } from '../../../shared/ui/index.ts'

interface Props {
  value: number
  disabled: boolean
  onChange: (seconds: number) => void
  onCommit: () => void
}

export function GameSetupQuestionDuration({ value, disabled, onChange, onCommit }: Props) {
  const { t } = useTranslation()
  const [input, setInput] = useState<string | null>(null)
  const text = input ?? String(value)
  const seconds = Number(text)
  const valid = /^\d+$/.test(text) && seconds >= 5 && seconds <= 3600
  return (
    <FormTextField
      label={t('gameSetup.questions.answerDuration')}
      value={text}
      disabled={disabled}
      slotProps={{ htmlInput: { inputMode: 'numeric' } }}
      error={!valid}
      helperText={!valid ? t('gameSetup.questions.durationError') : undefined}
      sx={{ width: { xs: '100%', sm: 230 }, flexShrink: 0 }}
      onChange={(event) => setInput(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.querySelector('input')?.blur()
        if (event.key === 'Escape') setInput(null)
      }}
      onBlur={() => {
        if (!valid || input === null) return
        if (seconds !== value) {
          onChange(seconds)
          onCommit()
        }
        setInput(null)
      }}
    />
  )
}
