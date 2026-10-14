import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameModifierDefinition } from '../../../shared/api/contracts/index.ts'
import { ModifierCatalogRow } from '../../../shared/game-ui/index.ts'
import { FormCheckbox } from '../../../shared/ui/index.ts'

export const GameSetupModifierRow = memo(function GameSetupModifierRow({
  modifier,
  selected,
  onToggle,
  onPreview,
}: {
  modifier: Pick<GameModifierDefinition, 'id' | 'name' | 'iconEmoji' | 'activationCost'>
  selected: boolean
  onToggle: (modifierId: string, enabled: boolean) => void
  onPreview: (modifierId: string) => void
}) {
  const { t } = useTranslation()
  return (
    <ModifierCatalogRow
      name={modifier.name}
      emoji={modifier.iconEmoji}
      cost={modifier.activationCost}
      onDetails={() => onPreview(modifier.id)}
      selection={
        <FormCheckbox
          checked={selected}
          inputProps={{
            'aria-label': t('gameSetup.modifiers.toggleLabel', { name: modifier.name }),
          }}
          onChange={(event) => onToggle(modifier.id, event.target.checked)}
        />
      }
    />
  )
})
