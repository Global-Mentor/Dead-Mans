import { Stack, Typography } from '@mui/material'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { RegistrationTeam } from '../../../shared/api/contracts/index.ts'
import {
  AppButton,
  ChoiceLabel,
  DisclosureSection,
  FormCheckbox,
  FormSection,
  FormTextField,
  ItemCard,
  SectionCard,
} from '../../../shared/ui/index.ts'
import { isTeamJoinable } from '../model/team-availability.ts'
import { TeamSummary } from './TeamSummary.tsx'

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
    <FormSection
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
              <ChoiceLabel
                sx={{ mr: 0, ml: 0 }}
                control={
                  <FormCheckbox
                    density="compact"
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
            return (
              <DisclosureSection
                key={status}
                title={visibleGroupTitle}
                toggleLabel={groupLabel}
                expanded={expanded}
                panelId={contentId}
                onExpandedChange={isForming ? setFormingExpanded : setReadyExpanded}
              >
                {group.map((team) => {
                  const isMine = team.teamId === myTeamId
                  const canJoin = canJoinTeams && isTeamJoinable(team, capacity)
                  return (
                    <ItemCard
                      component="article"
                      aria-label={team.name?.trim() || t('gameApplication.unnamedTeam')}
                      key={team.teamId}
                      emphasis={isMine ? 'selected' : canJoin ? 'available' : 'none'}
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
                    </ItemCard>
                  )
                })}
              </DisclosureSection>
            )
          })
        )}
      </Stack>
    </FormSection>
  )
}
