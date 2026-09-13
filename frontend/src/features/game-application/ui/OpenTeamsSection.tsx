import {
  Box,
  ButtonBase,
  Checkbox,
  Collapse,
  FormControlLabel,
  Stack,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { RegistrationTeam } from '../../../shared/api/contracts/index.ts'
import { AppButton, FormTextField, SectionCard } from '../../../shared/ui/index.ts'
import { huntWornFrame } from '../../../shared/theme/hunt-materials.ts'
import { huntPalette } from '../../../shared/theme/hunt-palette.ts'
import { isTeamJoinable } from '../model/team-availability.ts'
import { TeamSummary } from './TeamSummary.tsx'
import { ApplicationSection } from './ApplicationSection.tsx'

interface OpenTeamsSectionProps {
  teams: RegistrationTeam[]
  capacity: number
  myTeamId?: string | undefined
  canJoinTeams: boolean
  disabled: boolean
  onJoin: (teamId: string) => void
  joiningTeamId: string | undefined
}

const teamGroupHeaderSx = {
  width: '100%',
  minHeight: 52,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 1.25,
  m: 0,
  px: { xs: 1.25, sm: 1.5 },
  py: 1.1,
  border: 0,
  borderRadius: 0,
  color: 'text.primary',
  position: 'relative',
  overflow: 'hidden',
  textAlign: 'left',
  transition: 'background-color 150ms ease',
} as const

function TeamGroupTitle({ title, accent }: { title: string; accent: string }) {
  return (
    <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
      <Box
        aria-hidden
        component="span"
        sx={{
          width: 8,
          height: 8,
          flexShrink: 0,
          transform: 'rotate(45deg)',
          bgcolor: alpha(accent, 0.58),
          boxShadow: `0 0 10px ${alpha(accent, 0.14)}`,
        }}
      />
      <Typography
        component="span"
        variant="subtitle1"
        sx={{
          minWidth: 0,
          fontSize: 20,
          fontWeight: 700,
          lineHeight: 1.2,
          letterSpacing: '0.025em',
        }}
      >
        {title}
      </Typography>
    </Box>
  )
}

export function OpenTeamsSection({
  teams,
  capacity,
  myTeamId,
  canJoinTeams,
  disabled,
  onJoin,
  joiningTeamId,
}: OpenTeamsSectionProps) {
  const { t, i18n } = useTranslation()
  const searchId = useId()
  const formingId = useId()
  const readyId = useId()
  const [formingExpanded, setFormingExpanded] = useState(true)
  const [readyExpanded, setReadyExpanded] = useState(false)
  const [query, setQuery] = useState('')
  const [onlyOpen, setOnlyOpen] = useState(false)
  const normalizedQuery = query.trim().toLocaleLowerCase(i18n.resolvedLanguage)
  const visibleTeams = teams
    .filter((team) => {
      const name = team.name?.trim() || t('gameApplication.unnamedTeam')
      const searchText = [
        name,
        ...team.members.flatMap(({ player }) => [player.displayName, player.login]),
      ]
        .join(' ')
        .toLocaleLowerCase(i18n.resolvedLanguage)
      return (!onlyOpen || isTeamJoinable(team, capacity)) && searchText.includes(normalizedQuery)
    })
    .sort(
      (left, right) =>
        Number(isTeamJoinable(right, capacity)) - Number(isTeamJoinable(left, capacity)) ||
        Number(right.status === 'forming' && right.recruitmentOpen) -
          Number(left.status === 'forming' && left.recruitmentOpen) ||
        left.teamSlotIndex - right.teamSlotIndex,
    )

  return (
    <ApplicationSection
      title={t('gameApplication.createdTeamsTitle')}
      controls={
        teams.length > 0 ? (
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1} alignItems={{ lg: 'center' }}>
            <FormTextField
              id={searchId}
              sx={{ flex: 1, minWidth: 0 }}
              type="search"
              label={t('gameApplication.searchTeams')}
              value={query}
              onChange={(event) => {
                const nextQuery = event.target.value
                setQuery(nextQuery)
                setFormingExpanded(true)
                setReadyExpanded(nextQuery.trim().length > 0)
              }}
            />
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              flexWrap="wrap"
              sx={{ flexShrink: 0 }}
            >
              <FormControlLabel
                sx={{ mr: 0, ml: 0 }}
                control={
                  <Checkbox
                    size="small"
                    checked={onlyOpen}
                    onChange={(_, checked) => setOnlyOpen(checked)}
                  />
                }
                label={
                  <Typography variant="body2">{t('gameApplication.onlyOpenTeams')}</Typography>
                }
              />
            </Stack>
          </Stack>
        ) : null
      }
    >
      <Stack spacing={0.75}>
        {visibleTeams.length === 0 ? (
          <SectionCard surface="inset" sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {t(
                teams.length === 0
                  ? 'gameApplication.noCreatedTeams'
                  : 'gameApplication.noMatchingTeams',
              )}
            </Typography>
            {teams.length > 0 ? (
              <AppButton
                tone="secondary"
                sx={{ mt: 1 }}
                onClick={() => {
                  setQuery('')
                  setOnlyOpen(false)
                  setFormingExpanded(true)
                  setReadyExpanded(false)
                }}
              >
                {t('gameApplication.resetFilters')}
              </AppButton>
            ) : null}
          </SectionCard>
        ) : (
          (['forming', 'confirmed'] as const).map((status) => {
            const group = visibleTeams.filter((team) => team.status === status)
            if (group.length === 0) return null
            const isForming = status === 'forming'
            const expanded = isForming ? formingExpanded : readyExpanded
            const contentId = isForming ? formingId : readyId
            const visibleGroupTitle = t(
              isForming
                ? 'gameApplication.formingTeamsTitle'
                : 'gameApplication.confirmedTeamsTitle',
            )
            const groupLabel = isForming
              ? t('gameApplication.formingTeamsTitle')
              : t('gameApplication.confirmedTeamsGroup', { count: group.length })
            const groupAccent = huntPalette.parchmentMuted
            return (
              <Stack
                component="section"
                aria-label={t(
                  isForming
                    ? 'gameApplication.formingTeamsTitle'
                    : 'gameApplication.confirmedTeamsTitle',
                )}
                key={status}
                spacing={0.75}
                sx={{
                  '& + &': { pt: 1.25 },
                }}
              >
                <Box component="h3" sx={{ m: 0 }}>
                  <ButtonBase
                    type="button"
                    aria-label={groupLabel}
                    aria-expanded={expanded}
                    aria-controls={contentId}
                    onClick={() =>
                      isForming
                        ? setFormingExpanded((current) => !current)
                        : setReadyExpanded((current) => !current)
                    }
                    sx={(theme) => ({
                      ...teamGroupHeaderSx,
                      backgroundColor: alpha(theme.palette.common.black, 0.16),
                      backgroundImage: 'none',
                      boxShadow: `inset 2px 0 0 ${alpha(groupAccent, expanded ? 0.42 : 0.24)}`,
                      '&:hover': {
                        backgroundColor: alpha(groupAccent, 0.035),
                      },
                      '&:focus-visible': {
                        outline: `2px solid ${groupAccent}`,
                        outlineOffset: 2,
                      },
                    })}
                  >
                    <TeamGroupTitle title={visibleGroupTitle} accent={groupAccent} />
                    <Box
                      aria-hidden
                      component="span"
                      sx={{
                        width: 30,
                        height: 30,
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Box
                        component="span"
                        sx={{
                          width: 10,
                          height: 10,
                          color: alpha(groupAccent, 0.58),
                          borderRight: '2px solid',
                          borderBottom: '2px solid',
                          transition: 'transform 150ms ease',
                          transform: expanded
                            ? 'translateY(3px) rotate(225deg)'
                            : 'translateY(-3px) rotate(45deg)',
                        }}
                      />
                    </Box>
                  </ButtonBase>
                </Box>
                <Collapse id={contentId} in={expanded} unmountOnExit>
                  <Stack spacing={0.75}>
                    {group.map((team) => {
                      const isMine = team.teamId === myTeamId
                      const canJoin = canJoinTeams && isTeamJoinable(team, capacity)
                      return (
                        <SectionCard
                          component="article"
                          aria-label={team.name?.trim() || t('gameApplication.unnamedTeam')}
                          key={team.teamId}
                          sx={(theme) => ({
                            p: 1.5,
                            borderColor: isMine ? alpha(huntPalette.amber, 0.65) : 'divider',
                            backgroundColor: 'background.paper',
                            backgroundImage: `linear-gradient(110deg, ${alpha(isMine ? huntPalette.ember : theme.palette.primary.dark, isMine ? 0.26 : canJoin ? 0.1 : 0)}, transparent 70%), ${theme.custom.gradients.panelSurface}`,
                            backgroundSize: 'auto, auto, 640px auto',
                            ...(isMine ? huntWornFrame : {}),
                          })}
                        >
                          <TeamSummary
                            team={team}
                            capacity={capacity}
                            action={
                              canJoin ? (
                                <AppButton
                                  tone="secondary"
                                  disabled={disabled}
                                  loading={joiningTeamId === team.teamId}
                                  onClick={() => onJoin(team.teamId)}
                                  sx={{ minWidth: 100, px: 1.5 }}
                                >
                                  {t('gameApplication.joinTeam')}
                                </AppButton>
                              ) : null
                            }
                          />
                        </SectionCard>
                      )
                    })}
                  </Stack>
                </Collapse>
              </Stack>
            )
          })
        )}
      </Stack>
    </ApplicationSection>
  )
}
