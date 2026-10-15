import { describe, expect, it } from 'vitest'
import {
  adminModifiersRoute,
  adminQuestionsRoute,
  catalogModifiersRoute,
  catalogQuestionsRoute,
  gameApplicationRoute,
  gameBoardRoute,
  gameGuideRoute,
  gameRoundRoute,
  gameTeamQueueRoute,
  gameHistoryRoute,
  gameLeaderboardRoute,
  gameModifiersRoute,
  gameQuizRoute,
  gameSetupRoute,
  getAccessiblePanelRoutes,
  getPanelRouteByPath,
  hasAccessToPanelRoute,
  modifierHistoryRoute,
  roleAdministrationRoute,
  teamRegistrationsRoute,
  settingsRoute,
} from './app-routes.ts'

describe('panel route helpers', () => {
  it('keeps player navigation focused on player routes', () => {
    expect(getAccessiblePanelRoutes(['viewer'])).toEqual([
      gameBoardRoute,
      gameRoundRoute,
      gameApplicationRoute,
      gameModifiersRoute,
      gameQuizRoute,
      gameTeamQueueRoute,
      gameLeaderboardRoute,
      gameHistoryRoute,
      modifierHistoryRoute,
      gameGuideRoute,
      settingsRoute,
    ])
  })

  it('includes administration routes for admins', () => {
    expect(getAccessiblePanelRoutes(['admin'])).toEqual([
      gameBoardRoute,
      gameRoundRoute,
      gameApplicationRoute,
      gameModifiersRoute,
      gameQuizRoute,
      gameTeamQueueRoute,
      gameLeaderboardRoute,
      gameHistoryRoute,
      modifierHistoryRoute,
      gameSetupRoute,
      adminModifiersRoute,
      adminQuestionsRoute,
      catalogModifiersRoute,
      catalogQuestionsRoute,
      teamRegistrationsRoute,
      getPanelRouteByPath('/panel/game-overlay'),
      gameGuideRoute,
      settingsRoute,
    ])
  })

  it('allows moderators to manage team registrations without exposing admin setup pages', () => {
    expect(getAccessiblePanelRoutes(['moderator'])).toEqual([
      gameBoardRoute,
      gameRoundRoute,
      gameApplicationRoute,
      gameModifiersRoute,
      gameQuizRoute,
      gameTeamQueueRoute,
      gameLeaderboardRoute,
      gameHistoryRoute,
      modifierHistoryRoute,
      teamRegistrationsRoute,
      getPanelRouteByPath('/panel/game-overlay'),
      gameGuideRoute,
      settingsRoute,
    ])
  })

  it('gives super administrators every admin route plus role administration', () => {
    expect(getAccessiblePanelRoutes(['superadmin'])).toEqual([
      gameBoardRoute,
      gameRoundRoute,
      gameApplicationRoute,
      gameModifiersRoute,
      gameQuizRoute,
      gameTeamQueueRoute,
      gameLeaderboardRoute,
      gameHistoryRoute,
      modifierHistoryRoute,
      gameSetupRoute,
      adminModifiersRoute,
      adminQuestionsRoute,
      catalogModifiersRoute,
      catalogQuestionsRoute,
      teamRegistrationsRoute,
      roleAdministrationRoute,
      getPanelRouteByPath('/panel/game-overlay'),
      gameGuideRoute,
      settingsRoute,
    ])
    expect(hasAccessToPanelRoute(roleAdministrationRoute, ['admin'])).toBe(false)
  })

  it('resolves nested panel paths to their route metadata', () => {
    expect(getPanelRouteByPath('/panel/game-board/cell/1')).toBe(gameBoardRoute)
    expect(getPanelRouteByPath('/outside')).toBeNull()
    expect(getPanelRouteByPath('/panel/game-overlay')?.allowedRoles).toEqual([
      'moderator',
      'admin',
      'superadmin',
    ])
  })

  it('denies restricted routes without a matching authenticated role', () => {
    expect(hasAccessToPanelRoute(gameSetupRoute, undefined)).toBe(false)
    expect(hasAccessToPanelRoute(gameSetupRoute, [])).toBe(false)
    expect(hasAccessToPanelRoute(gameSetupRoute, ['viewer'])).toBe(false)
    expect(hasAccessToPanelRoute(gameSetupRoute, ['admin'])).toBe(true)
  })

  it('allows routes that do not declare role restrictions', () => {
    const unrestrictedRoute = { ...gameBoardRoute }
    delete unrestrictedRoute.allowedRoles

    expect(hasAccessToPanelRoute(unrestrictedRoute, undefined)).toBe(true)
  })
})
