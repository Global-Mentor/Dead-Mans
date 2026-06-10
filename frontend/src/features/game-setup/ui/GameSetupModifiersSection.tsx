import { Box, Checkbox, FormControlLabel, FormGroup, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { gameModifierCatalogQueryOptions } from '../../game-modifiers/index.ts'
import type { GameSetupDraftState } from '../model/game-setup-draft.ts'
import { AsyncSection, SectionCard, SectionHeader } from '../../../shared/ui/index.ts'

interface GameSetupModifiersSectionProps {
  draft: GameSetupDraftState
  onToggle: (modifierCode: string, enabled: boolean) => void
}

export function GameSetupModifiersSection({ draft, onToggle }: GameSetupModifiersSectionProps) {
  const { t } = useTranslation()
  const catalogQuery = useQuery(gameModifierCatalogQueryOptions)

  return (
    <SectionCard sx={{ mt: 2 }}>
      <SectionHeader
        title={t('gameSetup.modifiers.title')}
        description={t('gameSetup.modifiers.description')}
      />
      <AsyncSection
        isLoading={catalogQuery.isLoading}
        isError={catalogQuery.isError}
        isEmpty={(catalogQuery.data?.length ?? 0) === 0}
        loadingMessage={t('gameSetup.modifiers.loading')}
        errorMessage={t('gameSetup.modifiers.error')}
        emptyMessage={t('gameSetup.modifiers.empty')}
      >
        <FormGroup sx={{ mt: 1 }}>
          {(catalogQuery.data ?? []).map((modifier) => {
            const checked = draft.enabledModifierCodes.includes(modifier.code)
            return (
              <Box key={modifier.code} sx={{ py: 0.5 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={checked}
                      onChange={(event) => onToggle(modifier.code, event.target.checked)}
                    />
                  }
                  label={`${modifier.name} (${modifier.kind}, ${modifier.category}, ${modifier.activationCost})`}
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ ml: 4.5, display: 'block' }}
                >
                  {modifier.description}
                </Typography>
              </Box>
            )
          })}
        </FormGroup>
      </AsyncSection>
    </SectionCard>
  )
}
