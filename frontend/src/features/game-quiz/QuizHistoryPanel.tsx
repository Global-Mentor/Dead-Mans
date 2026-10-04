import { Box, Stack, Typography } from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { components } from '../../shared/api/contracts/generated'
import type { CurrentGameQuizState } from '../../shared/api/contracts/index.ts'
import { RoundBriefingDivider } from '../../shared/game-ui/index.ts'
import {
  InlineNotice,
  ItemCard,
  NativeDisclosure,
  SectionCard,
  StatusBadge,
} from '../../shared/ui/index.ts'
import { QuizQuestionContent } from './QuizQuestionContent.tsx'
import { QuizQuestionMetadata } from './QuizQuestionMetadata.tsx'
import { QuizQuestionSessionHistoryItem } from './QuizQuestionSessionHistoryItem.tsx'
import { ManualAwardHistoryItem } from './quiz-history-items.tsx'
import { getQuizHistoryItems } from './quiz-history-model.ts'

type QuestionSession = components['schemas']['GameHistoryQuizQuestionSessionItemDto']
type AnswerActions = {
  isSubmitting: boolean
  answerDisabled: boolean
  error: Error | null
  onSubmit: (questionSessionId: string, optionId: string) => void
  onDeadline: () => void
}

export function QuizHistoryPanel({
  quiz,
  current,
  currentUserId,
  ...actions
}: AnswerActions & {
  quiz: components['schemas']['GameHistoryQuizSectionDto'] | null
  current: CurrentGameQuizState | null
  currentUserId: string | null
}) {
  const { t } = useTranslation()
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastSessionRef = useRef<string | null>(null)
  useEffect(() => {
    if (current && current.questionSessionId !== lastSessionRef.current) {
      lastSessionRef.current = current.questionSessionId
      if (scrollRef.current) scrollRef.current.scrollTop = 0
    }
  }, [current])
  const history = getQuizHistoryItems(
    quiz?.questionSessions ?? [],
    quiz?.manualAwards ?? [],
  ).filter(
    (item) =>
      item.kind !== 'questionSession' ||
      item.questionSession.questionSessionId !== current?.questionSessionId,
  )
  const latestHistory = current
    ? undefined
    : history.find((item) => item.kind === 'questionSession')
  const latestHistoryId = latestHistory?.id
  const currentHistory = quiz?.questionSessions.find(
    (question) => question.questionSessionId === current?.questionSessionId,
  )
  const orderedHistory = latestHistory
    ? [latestHistory, ...history.filter((item) => item.id !== latestHistory.id)]
    : history
  return (
    <SectionCard
      component="section"
      aria-label={t('gameQuiz.historyTitle')}
      sx={{
        minWidth: 0,
        p: 0,
        display: 'flex',
        flexDirection: 'column',
        '@media (min-width: 1000px) and (min-height: 600px)': {
          height: 'var(--quiz-panel-height)',
        },
      }}
    >
      <Typography
        component="h2"
        variant="h6"
        textAlign="center"
        sx={{ px: 1.5, py: 1.5, flexShrink: 0 }}
      >
        {t('gameQuiz.historyTitle')}
      </Typography>
      <RoundBriefingDivider sx={{ mb: 0.75 }} />
      <Box
        ref={scrollRef}
        data-testid="quiz-history-scroll"
        tabIndex={0}
        role="region"
        aria-label={t('gameQuiz.historyTitle')}
        sx={{
          minHeight: 0,
          px: 0.75,
          pb: 0.75,
          '@media (min-width: 1000px) and (min-height: 600px)': {
            flex: '1 1 auto',
            overflowY: 'auto',
            overscrollBehaviorY: 'contain',
          },
        }}
      >
        <Stack spacing={0.5}>
          {current ? (
            <QuizTimelineQuestion
              key={current.questionSessionId}
              current={current}
              {...(currentHistory ? { questionSession: currentHistory } : {})}
              currentUserId={currentUserId}
              {...actions}
            />
          ) : null}
          {orderedHistory.map((item, index) =>
            item.kind === 'questionSession' ? (
              <QuizTimelineQuestion
                key={item.questionSession.questionSessionId}
                questionSession={item.questionSession}
                latest={item.id === latestHistoryId}
                tone={(index + (current ? 1 : 0)) % 2 ? 'alternate' : 'default'}
                currentUserId={currentUserId}
                {...actions}
              />
            ) : (
              <ManualAwardHistoryItem
                key={item.id}
                award={item.award}
                tone={(index + (current ? 1 : 0)) % 2 ? 'alternate' : 'default'}
                currentUserId={currentUserId}
              />
            ),
          )}
          {!current && history.length === 0 ? (
            <Typography color="text.secondary" sx={{ p: 1 }}>
              {t('gameQuiz.noHistory')}
            </Typography>
          ) : null}
        </Stack>
      </Box>
    </SectionCard>
  )
}

function QuizTimelineQuestion({
  current,
  questionSession,
  currentUserId,
  latest = false,
  tone = 'default',
  ...actions
}: AnswerActions & {
  latest?: boolean
  tone?: 'default' | 'alternate'
  current?: CurrentGameQuizState
  questionSession?: QuestionSession
  currentUserId: string | null
}) {
  const { t } = useTranslation()
  const pinned = current != null || latest
  const [expanded, setExpanded] = useState(false)
  const title = current?.text ?? questionSession?.questionText ?? ''
  const status = current?.status ?? questionSession?.status ?? 'closed'
  const reward = current?.reward ?? questionSession?.reward
  const summary = (
    <Stack component={pinned ? 'div' : 'span'} spacing={1.75}>
      {pinned || expanded ? (
        <QuizQuestionMetadata
          category={current?.categoryName ?? questionSession?.categoryName ?? ''}
          {...(reward != null ? { reward } : {})}
        />
      ) : null}
      <Stack component="span" direction="row" spacing={1} alignItems="center">
        <Typography
          component={pinned ? 'h3' : 'span'}
          variant={current || latest ? 'body1' : 'body2'}
          fontWeight={current || latest ? 700 : 600}
          sx={{ minWidth: 0, flex: 1, overflowWrap: 'anywhere' }}
        >
          {title}
        </Typography>
        {!pinned && status !== 'open' ? (
          <StatusBadge
            appearance="plain"
            density="compact"
            label={t(`gameQuiz.status.${status}`)}
          />
        ) : null}
      </Stack>
    </Stack>
  )
  return (
    <ItemCard
      leadingAccent={!pinned}
      frame={pinned ? 'corner' : 'standard'}
      tone={tone}
      data-testid="quiz-timeline-question"
      sx={{ px: 1.25, py: current || latest ? 1 : 0 }}
    >
      {pinned ? <Box sx={{ py: 0.5 }}>{summary}</Box> : null}
      <NativeDisclosure
        pinned={pinned}
        indicator="chevron"
        density="compact"
        open={pinned || expanded}
        onExpandedChange={setExpanded}
        summary={pinned ? null : summary}
      >
        {current ? (
          <>
            {actions.error ? (
              <InlineNotice severity="error">{t('gameQuiz.actionError')}</InlineNotice>
            ) : null}
            <QuizQuestionContent
              state={current}
              embedded={false}
              showQuestionText={false}
              showMetadata={false}
              isSubmitting={actions.isSubmitting}
              answerDisabled={actions.answerDisabled}
              onSubmit={actions.onSubmit}
              onDeadline={actions.onDeadline}
            />
            {current.status !== 'open' && questionSession ? (
              <QuizQuestionSessionHistoryItem
                questionSession={questionSession}
                currentUserId={currentUserId}
                resultsOnly
              />
            ) : null}
          </>
        ) : questionSession ? (
          <QuizQuestionSessionHistoryItem
            questionSession={questionSession}
            currentUserId={currentUserId}
            showQuestionText={false}
            showMetadata={false}
            framed={false}
            showOptions={latest}
          />
        ) : null}
      </NativeDisclosure>
    </ItemCard>
  )
}
