import { Box, Stack, Typography } from '@mui/material'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameQuestionCatalogItem } from '../../../shared/api/contracts/index.ts'
import {
  ActionIcon,
  ChoiceLabel,
  FormCheckbox,
  HelpTooltip,
  ItemCard,
} from '../../../shared/ui/index.ts'

export const GameSetupQuestionRow = memo(function GameSetupQuestionRow({
  question,
  selected,
  onToggle,
  onPreview,
}: {
  question: GameQuestionCatalogItem
  selected: boolean
  onToggle: (questionId: string, enabled: boolean) => void
  onPreview: (questionId: string) => void
}) {
  const { t } = useTranslation()
  return (
    <ItemCard component="li" density="flush" sx={{ minWidth: 0, listStyle: 'none' }}>
      <Stack direction="row" alignItems="center" gap={0.5} sx={{ px: 0.5, py: 0.5 }}>
        <ChoiceLabel
          sx={{ m: 0, minWidth: 0, flex: 1, alignItems: 'center' }}
          control={
            <FormCheckbox
              inputProps={{ 'aria-label': question.text }}
              checked={selected}
              onChange={(event) => onToggle(question.questionId, event.target.checked)}
            />
          }
          label={
            <Stack sx={{ textAlign: 'left' }}>
              <Typography variant="body2" sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
                {question.text}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ overflowWrap: 'anywhere' }}
              >
                {t('gameSetup.questions.rowMeta', {
                  category: question.categoryName,
                  count: question.reward,
                })}
              </Typography>
            </Stack>
          }
        />
        <HelpTooltip title={t('gameSetup.questions.preview')}>
          <ActionIcon
            aria-label={t('gameSetup.questions.preview')}
            onClick={() => onPreview(question.questionId)}
          >
            <Box
              component="svg"
              aria-hidden
              viewBox="0 0 24 24"
              sx={{ width: 20, height: 20, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5 }}
            >
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
              <circle cx="12" cy="12" r="3" />
            </Box>
          </ActionIcon>
        </HelpTooltip>
      </Stack>
    </ItemCard>
  )
})
