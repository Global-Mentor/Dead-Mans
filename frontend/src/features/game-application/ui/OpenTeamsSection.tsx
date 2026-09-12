import { Checkbox, FormControlLabel, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { RegistrationTeam } from '../../../shared/api/contracts/index.ts'
import { AppButton, FormTextField, SectionCard } from '../../../shared/ui/index.ts'
import { huntWornFrame } from '../../../shared/theme/hunt-materials.ts'
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
  const [query, setQuery] = useState('')
  const [onlyOpen, setOnlyOpen] = useState(false)
  const normalizedQuery = query.trim().toLocaleLowerCase(i18n.resolvedLanguage)
  const visibleTeams = teams
    .filter((team) => {
      const name = team.name?.trim() || t('common.teamWithSlot', { slot: team.teamSlotIndex })
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
        left.teamSlotIndex - right.teamSlotIndex,
    )

  return (
    <ApplicationSection
      title={t('gameApplication.createdTeamsTitle')}
      summary={
        <Typography variant="caption" color="text.secondary" role="status">
          {t('gameApplication.filteredTeams', {
            visible: visibleTeams.length,
            total: teams.length,
          })}
        </Typography>
      }
      controls={
        teams.length > 0 ? (
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1} alignItems={{ lg: 'center' }}>
            <FormTextField
              id={searchId}
              sx={{ flex: 1, minWidth: 0 }}
              type="search"
              label={t('gameApplication.searchTeams')}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
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
                }}
              >
                {t('gameApplication.resetFilters')}
              </AppButton>
            ) : null}
          </SectionCard>
        ) : (
          visibleTeams.map((team) => {
            const isMine = team.teamId === myTeamId
            const canJoin = canJoinTeams && isTeamJoinable(team, capacity)
            return (
              <SectionCard
                component="article"
                aria-label={
                  team.name?.trim() || t('common.teamWithSlot', { slot: team.teamSlotIndex })
                }
                key={team.teamId}
                sx={(theme) => ({
                  p: 1.5,
                  borderColor: isMine ? 'primary.main' : 'divider',
                  backgroundColor: 'background.paper',
                  backgroundImage: `linear-gradient(110deg, ${alpha(theme.palette.primary.dark, isMine ? 0.26 : canJoin ? 0.1 : 0)}, transparent 70%), ${theme.custom.gradients.panelSurface}`,
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
                    ) : isMine ? (
                      <Typography variant="caption" color="primary.light">
                        {t('gameApplication.myTeamTitle')}
                      </Typography>
                    ) : null
                  }
                />
              </SectionCard>
            )
          })
        )}
      </Stack>
    </ApplicationSection>
  )
}
