import { hasPanelCapability } from './panel-capabilities.ts'
import { useAuth } from './use-auth.ts'

export function usePanelCapabilities() {
  const { user } = useAuth()
  const roles = user?.roles

  return {
    canGameSetup: hasPanelCapability('gameSetup', roles),
    canModifierActivation: hasPanelCapability('modifierActivation', roles),
  }
}
