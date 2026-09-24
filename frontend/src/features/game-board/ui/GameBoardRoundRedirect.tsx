import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { gameRoundRoute } from '../../../routes/app-routes.ts'
import { useAuth } from '../../../shared/auth/use-auth.ts'
import { hasPanelCapability } from '../../../shared/auth/panel-capabilities.ts'

/** Only a new round observed while this board is mounted moves players away from it. */
export function GameBoardRoundRedirect({
  gameId,
  roundId,
}: {
  gameId: string
  roundId: string | null
}) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const observedRound = useRef<{ gameId: string; roundId: string | null } | null>(null)

  useEffect(() => {
    const previous = observedRound.current
    observedRound.current = { gameId, roundId }
    if (
      previous?.gameId === gameId &&
      previous.roundId !== roundId &&
      roundId &&
      user?.roles.includes('viewer') &&
      !hasPanelCapability('manageGame', user.roles)
    ) {
      navigate(gameRoundRoute.fullPath, { replace: true })
    }
  }, [gameId, navigate, roundId, user?.roles])

  return null
}
