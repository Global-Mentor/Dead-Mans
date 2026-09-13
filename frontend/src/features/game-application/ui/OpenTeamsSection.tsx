import { Box, Checkbox, Collapse, FormControlLabel, Stack, Typography } from '@mui/material'
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
  const readyId = useId()
  const readyHintId = useId()
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
          <SectionCard inset sx={{ py: 4, textAlign: 'center' }}>
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
            return (
              <Stack
                component="section"
                aria-label={t(
                  status === 'confirmed'
                    ? 'gameApplication.confirmedTeamsTitle'
                    : 'gameApplication.formingTeamsTitle',
                )}
                key={status}
                spacing={0.75}
                sx={{
                  '& + &': { pt: 2, mt: 1.25, borderTop: '1px solid', borderColor: 'divider' },
                }}
              >
                {status === 'confirmed' ? (
                  <Box component="h3" sx={{ m: 0 }}>
                    <AppButton
                      tone="secondary"
                      fullWidth
                      aria-label={t('gameApplication.confirmedTeamsGroup', { count: group.length })}
                      aria-describedby={readyHintId}
                      aria-expanded={readyExpanded}
                      aria-controls={readyId}
                      onClick={() => setReadyExpanded((expanded) => !expanded)}
                      sx={{
                        justifyContent: 'space-between',
                        textAlign: 'left',
                        gap: 1.5,
                        p: 1.5,
                        borderColor: alpha(huntPalette.amber, 0.65),
                        backgroundColor: alpha(huntPalette.ember, readyExpanded ? 0.16 : 0.08),
                        '&:hover': {
                          borderColor: 'primary.light',
                          backgroundColor: alpha(huntPalette.ember, 0.22),
                        },
                      }}
                    >
                      <Box component="span" sx={{ display: 'grid', gap: 0.5 }}>
                        <Box component="span">
                          {t('gameApplication.confirmedTeamsGroup', { count: group.length })}
                        </Box>
                        <Typography
                          component="span"
                          id={readyHintId}
                          variant="caption"
                          color="text.secondary"
                          sx={{ textTransform: 'none', fontWeight: 400, letterSpacing: 0 }}
                        >
                          {t(
                            readyExpanded
                              ? 'gameApplication.collapseReadyTeams'
                              : 'gameApplication.expandReadyTeams',
                          )}
                        </Typography>
                      </Box>
                      <Box
                        aria-hidden
                        component="span"
                        sx={{
                          width: 36,
                          height: 36,
                          display: 'grid',
                          placeItems: 'center',
                          border: '1px solid',
                          borderColor: 'primary.main',
                          backgroundColor: alpha(huntPalette.amber, 0.12),
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
                            transform: readyExpanded
                              ? 'translateY(3px) rotate(225deg)'
                              : 'translateY(-3px) rotate(45deg)',
                          }}
                        />
                      </Box>
                    </AppButton>
                  </Box>
                ) : (
                  <Typography
                    component="h3"
                    variant="overline"
                    color="text.secondary"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      pb: 1,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Box
                      aria-hidden
                      sx={{
                        width: 6,
                        height: 6,
                        transform: 'rotate(45deg)',
                        bgcolor: 'currentColor',
                      }}
                    />
                    {t('gameApplication.formingTeamsTitle')}
                  </Typography>
                )}
                <Collapse
                  id={status === 'confirmed' ? readyId : undefined}
                  in={status === 'forming' || readyExpanded}
                  unmountOnExit
                >
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
