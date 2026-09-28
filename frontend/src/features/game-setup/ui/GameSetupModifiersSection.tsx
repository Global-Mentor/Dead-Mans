import { Box, Stack, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AsyncSection,
  CheckboxGroup,
  ChoiceLabel,
  FormCheckbox,
  FormTextField,
  ItemCard,
  SectionCard,
  SectionHeader,
  StatusBadge,
} from '../../../shared/ui/index.ts'
import {
  gameModifierCatalogQueryOptions,
  modifierCategoryCodes,
} from '../../game-modifiers/index.ts'
import { deriveModifierRoundSummaryMeta } from '../../game-modifiers/model/modifier-round-summary.ts'
import { matchesModifierSearch } from '../../game-modifiers/model/modifier-search.ts'
import type { GameSetupDraftState } from '../model/game-setup-draft.ts'
interface GameSetupModifiersSectionProps {
  draft: GameSetupDraftState
  onToggle: (modifierId: string, enabled: boolean) => void
  actions?: ReactNode
}

export function GameSetupModifiersSection({
  draft,
  onToggle,
  actions,
}: GameSetupModifiersSectionProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage
  const catalogQuery = useQuery(gameModifierCatalogQueryOptions)
  const [search, setSearch] = useState('')
  const categoryLabels = {
    preparation: t('common.modifiers.categories.preparation'),
    round: t('common.modifiers.categories.round'),
    result: t('common.modifiers.categories.result'),
  } as const
  const filteredModifiers = useMemo(
    () =>
      (catalogQuery.data ?? []).filter((modifier) =>
        matchesModifierSearch(
          modifier,
          search,
          [
            t(`gameCatalog.modifiers.wizard.kinds.${modifier.behaviorV2.kind}`),
            t(
              `gameCatalog.modifiers.roundSummaryType.${deriveModifierRoundSummaryMeta(modifier).type}`,
            ),
            t(`common.modifiers.categories.${modifier.category}`),
            modifier.behaviorV2.requiresHostMonitoring
              ? t('gameCatalog.modifiers.hostControlBadge')
              : '',
          ],
          locale,
        ),
      ),
    [catalogQuery.data, locale, search, t],
  )
  const groupedModifiers = useMemo(
    () =>
      modifierCategoryCodes
        .map((category) => ({
          category,
          items: filteredModifiers.filter((modifier) => modifier.category === category),
        }))
        .filter((group) => group.items.length > 0),
    [filteredModifiers],
  )

  return (
    <SectionCard>
      <SectionHeader
        headingLevel="h1"
        title={t('gameSetup.modifiers.title')}
        description={t('gameSetup.modifiers.description')}
        actions={actions}
      />
      <AsyncSection
        isLoading={catalogQuery.isLoading}
        isError={catalogQuery.isError}
        hasData={catalogQuery.data != null}
        isEmpty={!catalogQuery.isLoading && !catalogQuery.isError && groupedModifiers.length === 0}
        loadingMessage={t('gameSetup.modifiers.loading')}
        errorMessage={t('gameSetup.modifiers.error')}
        emptyMessage={
          search.trim().length > 0
            ? t('common.modifiers.emptySearch')
            : t('gameSetup.modifiers.empty')
        }
      >
        <Stack spacing={1.5} sx={{ mt: 1 }}>
          <FormTextField
            value={search}
            label={t('common.modifiers.searchLabel')}
            onChange={(event) => setSearch(event.target.value)}
          />

          {groupedModifiers.map((group) => (
            <Box key={group.category}>
              <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                {categoryLabels[group.category]}
              </Typography>

              <CheckboxGroup>
                {group.items.map((modifier) => {
                  const checked = draft.enabledModifierIds.includes(modifier.id)
                  const roundSummaryMeta = deriveModifierRoundSummaryMeta(modifier)

                  return (
                    <ItemCard key={modifier.id} emphasis={checked ? 'selected' : 'none'}>
                      <ChoiceLabel
                        control={
                          <FormCheckbox
                            checked={checked}
                            onChange={(event) => onToggle(modifier.id, event.target.checked)}
                          />
                        }
                        label={`${modifier.name} (${modifier.activationCost})`}
                      />

                      <Stack
                        direction="row"
                        spacing={0.75}
                        flexWrap="wrap"
                        useFlexGap
                        sx={{ ml: 4.5, mt: 0.35 }}
                      >
                        <StatusBadge
                          size="small"
                          variant="outlined"
                          label={t(
                            `gameCatalog.modifiers.wizard.kinds.${modifier.behaviorV2.kind}`,
                          )}
                        />
                        <StatusBadge
                          size="small"
                          color={roundSummaryMeta.includeInRoundSummary ? 'secondary' : 'default'}
                          variant="outlined"
                          label={t(
                            `gameCatalog.modifiers.roundSummaryType.${roundSummaryMeta.type}`,
                          )}
                        />
                        {modifier.behaviorV2.requiresHostMonitoring ? (
                          <StatusBadge
                            size="small"
                            color="error"
                            variant="outlined"
                            label={t('gameCatalog.modifiers.hostControlBadge')}
                          />
                        ) : null}
                      </Stack>

                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ ml: 4.5, mt: 0.6, display: 'block', whiteSpace: 'pre-line' }}
                      >
                        {modifier.description}
                      </Typography>
                    </ItemCard>
                  )
                })}
              </CheckboxGroup>
            </Box>
          ))}
        </Stack>
      </AsyncSection>
    </SectionCard>
  )
}
