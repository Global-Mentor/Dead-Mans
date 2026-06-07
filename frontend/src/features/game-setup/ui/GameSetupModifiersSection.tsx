import { Alert, Box, Checkbox, FormControlLabel, FormGroup, Paper, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { queryKeys } from '../../../shared/api/query-keys.ts'
import { fetchGameModifierCatalog } from '../../game-modifiers/api/game-modifiers-data-access.ts'
import type { GameSetupDraftState } from '../model/game-setup-draft.ts'

interface GameSetupModifiersSectionProps {
  draft: GameSetupDraftState
  onToggle: (modifierCode: string, enabled: boolean) => void
}

export function GameSetupModifiersSection({ draft, onToggle }: GameSetupModifiersSectionProps) {
  const { t } = useTranslation()
  const catalogQuery = useQuery({
    queryKey: queryKeys.gameModifiers.catalog(),
    queryFn: fetchGameModifierCatalog,
  })

  return (
    <Paper variant="outlined" sx={{ mt: 2, p: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        {t('gameSetup.modifiers.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {t('gameSetup.modifiers.description')}
      </Typography>

      {catalogQuery.isLoading ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          {t('gameSetup.modifiers.loading')}
        </Typography>
      ) : null}

      {catalogQuery.isError ? (
        <Alert severity="error" sx={{ mt: 1.5 }}>
          {t('gameSetup.modifiers.error')}
        </Alert>
      ) : null}

      {catalogQuery.data && catalogQuery.data.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          {t('gameSetup.modifiers.empty')}
        </Typography>
      ) : null}

      {catalogQuery.data && catalogQuery.data.length > 0 ? (
        <FormGroup sx={{ mt: 1 }}>
          {catalogQuery.data.map((modifier) => {
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
                <Typography variant="caption" color="text.secondary" sx={{ ml: 4.5, display: 'block' }}>
                  {modifier.description}
                </Typography>
              </Box>
            )
          })}
        </FormGroup>
      ) : null}
    </Paper>
  )
}
