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
  minHeight: 48,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 1,
  m: 0,
  px: 0.5,
  py: 1,
  border: 0,
  borderBottom: '2px solid',
  borderBottomColor: alpha(huntPalette.amber, 0.5),
  borderRadius: 0,
  color: 'primary.light',
  backgroundColor: 'transparent',
  backgroundImage: 'none',
  boxShadow: 'none',
  textAlign: 'left',
} as const

function TeamGroupTitle({ title }: { title: string }) {
  return (
    <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
      <Box
        aria-hidden
        component="span"
        sx={{
          width: 7,
          height: 7,
          flexShrink: 0,
          transform: 'rotate(45deg)',
          bgcolor: 'primary.main',
          boxShadow: `0 0 10px ${alpha(huntPalette.amber, 0.38)}`,
        }}
      />
      <Typography
        component="span"
        variant="h6"
        sx={{
          fontSize: { xs: 22, sm: 24 },
          fontWeight: 800,
          lineHeight: 1.15,
          letterSpacing: '0.01em',
          textTransform: 'none',
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
            const groupTitle = isForming
              ? t('gameApplication.formingTeamsTitle')
              : t('gameApplication.confirmedTeamsGroup', { count: group.length })
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
                  '& + &': { pt: 2, mt: 1.25, borderTop: '1px solid', borderColor: 'divider' },
                }}
              >
                <Box component="h3" sx={{ m: 0 }}>
                  <ButtonBase
                    type="button"
                    aria-label={groupTitle}
                    aria-expanded={expanded}
                    aria-controls={contentId}
                    onClick={() =>
                      isForming
                        ? setFormingExpanded((current) => !current)
                        : setReadyExpanded((current) => !current)
                    }
                    sx={(theme) => ({
                      ...teamGroupHeaderSx,
                      '&:hover': {
                        borderBottomColor: 'primary.light',
                        backgroundColor: alpha(theme.palette.primary.main, 0.07),
                      },
                      '&:focus-visible': {
                        outline: `2px solid ${theme.palette.primary.light}`,
                        outlineOffset: 2,
                      },
                    })}
                  >
                    <TeamGroupTitle title={groupTitle} />
                    <Box
                      component="span"
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.75,
                        flexShrink: 0,
                      }}
                    >
                      <Typography
                        component="span"
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: { xs: 'none', sm: 'inline' }, whiteSpace: 'nowrap' }}
                      >
                        {t(
                          expanded
                            ? 'gameApplication.collapseReadyTeams'
                            : 'gameApplication.expandReadyTeams',
                        )}
                      </Typography>
                      <Box
                        aria-hidden
                        component="span"
                        sx={{
                          width: 30,
                          height: 30,
                          display: 'grid',
                          placeItems: 'center',
                          border: '1px solid',
                          borderColor: 'divider',
                          backgroundColor: alpha(huntPalette.amber, 0.08),
                          flexShrink: 0,
                        }}
                      >
                        <Box
                          component="span"
                          sx={{
                            width: 10,
                            height: 10,
                            borderRight: '2px solid',
                            borderBottom: '2px solid',
                            transition: 'transform 150ms ease',
                            transform: expanded
                              ? 'translateY(3px) rotate(225deg)'
                              : 'translateY(-3px) rotate(45deg)',
                          }}
                        />
                      </Box>
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
