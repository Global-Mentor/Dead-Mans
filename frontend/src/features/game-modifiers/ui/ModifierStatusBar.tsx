import { Box, InputAdornment, Stack, Tooltip, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'
import type { GameModifierState } from '../../../shared/api/contracts/index.ts'
import { AppButton, FormTextField, ParticipantNamesList } from '../../../shared/ui/index.ts'

interface ModifierStatusBarProps {
  state: GameModifierState
  search: string
  onSearchChange: (value: string) => void
  currentTeamLabel: string
  currentTeamParticipantNames: readonly string[]
  currentTeamParticipantsEmptyLabel: string
  activeCardLabel: string
  canOpenActiveCard: boolean
  onOpenActiveCard: () => void
}

export function ModifierStatusBar({
  state,
  search,
  onSearchChange,
  currentTeamLabel,
  currentTeamParticipantNames,
  currentTeamParticipantsEmptyLabel,
  activeCardLabel,
  canOpenActiveCard,
  onOpenActiveCard,
}: ModifierStatusBarProps) {
  const { t } = useTranslation()
  const activeRoundSpentPoints = state.activeModifiers.reduce(
    (total, activation) => total + activation.activationCost,
    0,
  )

  return (
    <Box
      component="section"
      aria-label={t('gameModifiers.summaryTitle')}
      sx={(theme) => ({
        border: `1px solid ${alpha(theme.palette.primary.main, 0.26)}`,
        borderRadius: '12px',
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.055)}, ${alpha(
          theme.palette.background.paper,
          0.38,
        )})`,
        p: { xs: 0.75, sm: 1 },
      })}
    >
      <Box
        data-testid="modifier-summary-row"
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, minmax(0, 1fr))',
            sm: 'repeat(4, minmax(0, 1fr))',
          },
          gap: 0.75,
          '@media (min-width: 1100px)': {
            gridTemplateColumns: '1.15fr repeat(3, minmax(105px, 0.8fr)) 1.65fr 1.45fr',
          },
        }}
      >
        <StatusMetric
          label={t('gameModifiers.summaryTitle')}
          value={
            state.isOrderingOpen
              ? t('gameModifiers.orderingOpen')
              : t('gameModifiers.orderingClosed')
          }
          tone={state.isOrderingOpen ? 'success' : 'error'}
          description={state.isOrderingOpen ? undefined : t('gameModifiers.orderingClosedSummary')}
          tooltip={t('gameModifiers.summaryOrderingStatusTooltip')}
          sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' } }}
        />
        <StatusMetric
          label={t('gameModifiers.summaryAvailablePoints')}
          tone="primary"
          value={t('gameModifiers.myPointsValue', { points: state.availableQuizPoints })}
          tooltip={t('gameModifiers.summaryAvailablePointsTooltip')}
        />
        <StatusMetric
          label={t('gameModifiers.summarySpentPoints')}
          value={t('gameModifiers.myPointsValue', { points: state.spentQuizPoints })}
          tooltip={t('gameModifiers.summarySpentPointsTooltip')}
        />
        <StatusMetric
          label={t('gameModifiers.summaryRoundSpentPoints')}
          value={t('gameModifiers.myPointsValue', { points: activeRoundSpentPoints })}
          tooltip={t('gameModifiers.summaryRoundSpentPointsTooltip')}
          sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' } }}
        />
        <TeamContextSummary
          label={t('gameModifiers.summaryCurrentTeam')}
          teamName={currentTeamLabel}
          participantNames={currentTeamParticipantNames}
          participantsEmptyLabel={currentTeamParticipantsEmptyLabel}
          tooltip={t('gameModifiers.summaryCurrentTeamTooltip')}
        />
        <CardContextSummary
          label={t('gameModifiers.summaryActiveCard')}
          cardName={activeCardLabel}
          canOpen={canOpenActiveCard}
          onOpen={onOpenActiveCard}
          openLabel={t('common.actions.viewCard')}
          tooltip={t('gameModifiers.summaryActiveCardTooltip')}
        />
      </Box>

      <FormTextField
        value={search}
        label={t('common.modifiers.searchLabel')}
        onChange={(event) => onSearchChange(event.target.value)}
        slotProps={{
          input: {
            endAdornment: search ? (
              <InputAdornment position="end">
                <AppButton tone="ghost" size="small" onClick={() => onSearchChange('')}>
                  {t('gameModifiers.clearSearch')}
                </AppButton>
              </InputAdornment>
            ) : null,
          },
        }}
        sx={{ mt: 0.75 }}
      />
    </Box>
  )
}

const summaryTileSx = {
  minWidth: 0,
  minHeight: 60,
  borderRadius: '9px',
  px: 1,
  py: 0.7,
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
} as const

function TeamContextSummary({
  label,
  teamName,
  participantNames,
  participantsEmptyLabel,
  tooltip,
}: {
  label: string
  teamName: string
  participantNames: readonly string[]
  participantsEmptyLabel: string
  tooltip: string
}) {
  return (
    <Tooltip title={tooltip} arrow describeChild enterDelay={150} enterTouchDelay={0}>
      <Stack
        tabIndex={0}
        spacing={0.12}
        sx={(theme) => ({
          ...summaryTileSx,
          gridColumn: { sm: 'span 2' },
          '@media (min-width: 1100px)': { gridColumn: 'auto' },
          backgroundColor: alpha(theme.palette.background.paper, 0.34),
          cursor: 'help',
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: 2,
          },
        })}
      >
        <SummaryLabel>{label}</SummaryLabel>
        <Typography
          variant="body2"
          sx={{ maxWidth: '100%', fontWeight: 850, lineHeight: 1.2, overflowWrap: 'anywhere' }}
        >
          {teamName}
        </Typography>
        <Box
          sx={(theme) => ({
            minWidth: 0,
            maxWidth: '100%',
            color: 'primary.light',
            '& ul': { justifyContent: 'center', flexWrap: 'wrap' },
            '& li': { px: 0.25, fontWeight: 700 },
            '& li + li': {
              pl: 0.75,
              borderLeft: `1px solid ${alpha(theme.palette.primary.main, 0.42)}`,
            },
          })}
        >
          <ParticipantNamesList
            names={participantNames}
            emptyLabel={participantsEmptyLabel}
            variant="caption"
            dense
            direction="row"
          />
        </Box>
      </Stack>
    </Tooltip>
  )
}

function CardContextSummary({
  label,
  cardName,
  canOpen,
  onOpen,
  openLabel,
  tooltip,
}: {
  label: string
  cardName: string
  canOpen: boolean
  onOpen: () => void
  openLabel: string
  tooltip: string
}) {
  return (
    <Tooltip title={tooltip} arrow describeChild enterDelay={150} enterTouchDelay={0}>
      <Stack
        tabIndex={canOpen ? undefined : 0}
        spacing={0.18}
        sx={(theme) => ({
          ...summaryTileSx,
          gridColumn: { sm: 'span 2' },
          '@media (min-width: 1100px)': { gridColumn: 'auto' },
          backgroundColor: alpha(theme.palette.background.paper, 0.34),
          cursor: 'help',
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: 2,
          },
        })}
      >
        <SummaryLabel>{label}</SummaryLabel>
        <Typography
          variant="body2"
          sx={{ maxWidth: '100%', fontWeight: 850, lineHeight: 1.2, overflowWrap: 'anywhere' }}
        >
          {cardName}
        </Typography>
        {canOpen ? (
          <AppButton
            tone="ghost"
            size="small"
            onClick={onOpen}
            sx={{ minHeight: 28, px: 1, py: 0.25 }}
          >
            {openLabel}
          </AppButton>
        ) : null}
      </Stack>
    </Tooltip>
  )
}

function SummaryLabel({ children }: { children: string }) {
  return (
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ maxWidth: '100%', fontWeight: 750, letterSpacing: '0.015em', lineHeight: 1.15 }}
    >
      {children}
    </Typography>
  )
}

function StatusMetric({
  label,
  value,
  tooltip,
  tone = 'default',
  description,
  sx,
}: {
  label: string
  value: string
  tooltip: string
  tone?: 'default' | 'primary' | 'success' | 'error'
  description?: string | undefined
  sx?: object
}) {
  return (
    <Tooltip title={tooltip} arrow describeChild enterDelay={150} enterTouchDelay={0}>
      <Stack
        role={tone === 'error' || tone === 'success' ? 'status' : undefined}
        tabIndex={0}
        spacing={0.12}
        sx={(theme) => ({
          ...summaryTileSx,
          backgroundColor:
            tone === 'default'
              ? alpha(theme.palette.background.paper, 0.34)
              : alpha(theme.palette[tone].main, 0.1),
          border: `1px solid ${
            tone === 'default' ? 'transparent' : alpha(theme.palette[tone].main, 0.42)
          }`,
          cursor: 'help',
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: 2,
          },
          ...sx,
        })}
      >
        <SummaryLabel>{label}</SummaryLabel>
        <Typography
          variant="body2"
          sx={(theme) => ({
            color: tone === 'default' ? theme.palette.text.primary : theme.palette[tone].light,
            fontWeight: 850,
            fontSize: tone === 'primary' ? '1.4rem' : undefined,
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1.15,
          })}
          noWrap
        >
          {value}
        </Typography>
        {description ? (
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', fontWeight: 650, lineHeight: 1.15 }}
          >
            {description}
          </Typography>
        ) : null}
      </Stack>
    </Tooltip>
  )
}
