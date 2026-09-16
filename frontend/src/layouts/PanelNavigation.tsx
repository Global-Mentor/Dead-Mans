import type { TFunction } from 'i18next'
import { useCallback, useState, type MouseEvent } from 'react'
import { Badge, Box, ButtonBase, Menu, MenuItem, Stack, SvgIcon, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import { currentGameBoardQueryOptions } from '../features/game-board/index.ts'
import {
  gameNotificationQueryKeys,
  gameNotificationsQueryOptions,
} from '../features/game-notifications/api/game-notification-queries.ts'
import { markGameNotificationsRead } from '../features/game-notifications/api/game-notifications-api.ts'
import {
  gameRegistrationAdminSnapshotQueryOptions,
  gameRegistrationSnapshotQueryOptions,
} from '../features/game-registration/index.ts'
import {
  gameApplicationRoute,
  gameBoardRoute,
  gameModifiersRoute,
  getPanelRouteByPath,
  teamRegistrationsRoute,
} from '../routes/app-routes.ts'
import type { GameUserNotification } from '../shared/api/contracts/index.ts'
import { useAuth } from '../shared/auth/use-auth.ts'
import { realtimeHubs, useSignalrHubSubscription } from '../shared/realtime/index.ts'
import { huntBrassTitleSx } from '../shared/theme/surface-sx.ts'
import { PanelAdminNavigation } from './PanelAdminNavigation.tsx'
import { PanelPrimaryNavigation } from './PanelPrimaryNavigation.tsx'
import { PanelProfileMenu } from './PanelProfileMenu.tsx'
import { navigationButtonSx } from './navigation-styles.ts'

const USER_NOTIFICATION_CREATED_EVENT = realtimeHubs.gameBoard.events.userNotificationCreated

export function PanelNavigation() {
  const { t } = useTranslation()
  const location = useLocation()
  const { user, logout } = useAuth()
  const queryClient = useQueryClient()
  const activeRoute = getPanelRouteByPath(location.pathname)
  const canSeeStaffNotifications =
    user?.roles.includes('admin') === true || user?.roles.includes('moderator') === true
  const gameBoardQuery = useQuery({
    ...currentGameBoardQueryOptions,
    enabled: user != null,
  })
  const isRegistrationOpen = gameBoardQuery.data?.status === 'ready'
  const shouldShowGameApplicationNavigation = gameBoardQuery.data?.status !== 'active'
  const isTeamManagementAvailable =
    gameBoardQuery.data?.status === 'ready' || gameBoardQuery.data?.status === 'active'
  const snapshotQuery = useQuery({
    ...gameRegistrationSnapshotQueryOptions,
    enabled: user != null && isRegistrationOpen,
  })
  const adminSnapshotQuery = useQuery({
    ...gameRegistrationAdminSnapshotQueryOptions,
    enabled: canSeeStaffNotifications && isTeamManagementAvailable,
  })
  const gameNotificationsQuery = useQuery({
    ...gameNotificationsQueryOptions,
    enabled: user != null,
  })
  const markNotificationsReadMutation = useMutation({
    mutationFn: markGameNotificationsRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: gameNotificationQueryKeys.all })
    },
  })
  const [notificationAnchor, setNotificationAnchor] = useState<HTMLElement | null>(null)

  if (!user) {
    return null
  }

  const pendingInvitationsCount = snapshotQuery.data?.myPendingInvitations.length ?? 0
  const pendingInvitations = snapshotQuery.data?.myPendingInvitations ?? []
  const disbandRequestTeams =
    adminSnapshotQuery.data?.teams.filter(
      (team) => team.status === 'confirmed' && team.disbandRequestedAtUtc != null,
    ) ?? []
  const gameNotifications = gameNotificationsQuery.data ?? []
  const importantNotificationsCount = disbandRequestTeams.length
  const modifierNotificationsCount = gameNotifications.length
  const totalNotificationsCount =
    pendingInvitationsCount + importantNotificationsCount + modifierNotificationsCount

  const openNotificationMenu = (event: MouseEvent<HTMLElement>) => {
    setNotificationAnchor(event.currentTarget)
  }

  const closeNotificationMenu = () => {
    if (gameNotifications.length > 0 && !markNotificationsReadMutation.isPending) {
      markNotificationsReadMutation.mutate()
    }

    setNotificationAnchor(null)
  }

  return (
    <>
      <GameNotificationRealtimeSync />

      <Box
        component="header"
        sx={(theme) => ({
          position: 'sticky',
          top: 0,
          zIndex: theme.zIndex.appBar,
          backgroundColor: alpha(theme.palette.background.default, 0.96),
          backgroundImage: `linear-gradient(110deg, ${alpha(theme.palette.primary.main, 0.12)}, transparent 34%, transparent 66%, ${alpha(theme.palette.primary.main, 0.08)})`,
          boxShadow: `0 4px 16px ${alpha(theme.palette.common.black, 0.16)}`,
          backdropFilter: 'blur(12px)',
          '&::before': {
            content: '""',
            position: 'absolute',
            pointerEvents: 'none',
            left: { xs: 16, sm: 24 },
            right: { xs: 16, sm: 24 },
            bottom: 3,
            height: '1px',
            backgroundImage: `linear-gradient(90deg, transparent, ${alpha(theme.palette.primary.light, 0.55)} 15%, ${alpha(theme.palette.primary.light, 0.55)} calc(50% - 16px), transparent calc(50% - 16px), transparent calc(50% + 16px), ${alpha(theme.palette.primary.light, 0.55)} calc(50% + 16px), ${alpha(theme.palette.primary.light, 0.55)} 85%, transparent)`,
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            pointerEvents: 'none',
            left: '50%',
            bottom: -1,
            width: 9,
            height: 9,
            transform: 'translateX(-50%) rotate(45deg)',
            border: `1px solid ${alpha(theme.palette.primary.light, 0.8)}`,
            backgroundColor: theme.palette.background.default,
          },
        })}
      >
        <Box sx={{ px: { xs: 1, sm: 3 } }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'auto minmax(0, 1fr) auto',
                lg: 'minmax(0, 1fr) auto minmax(0, 1fr)',
              },
              minHeight: { xs: 56, lg: 64 },
              columnGap: { xs: 0.5, sm: 2, xl: 4 },
              alignItems: 'center',
            }}
          >
            <Typography
              component={RouterLink}
              to={gameBoardRoute.fullPath}
              variant="h6"
              aria-label={t('appTitle')}
              sx={{
                ...huntBrassTitleSx,
                color: 'primary.light',
                fontSize: 22,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 44,
                minWidth: 44,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                '&:focus-visible': {
                  outline: '2px solid',
                  outlineColor: 'primary.main',
                  outlineOffset: 2,
                },
                gridColumn: 1,
                gridRow: 1,
                justifySelf: 'start',
              }}
            >
              <Box
                component="span"
                aria-hidden
                sx={{
                  display: { xs: 'inline', sm: 'none' },
                  color: 'primary.main',
                  fontSize: 19,
                  letterSpacing: '-0.08em',
                }}
              >
                {t('navigation.brandMark')}
              </Box>
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                {t('appTitle')}
              </Box>
            </Typography>

            <Box sx={{ gridColumn: 2, gridRow: 1, minWidth: 0 }}>
              <PanelPrimaryNavigation
                activeRouteId={activeRoute?.id}
                showGameApplication={shouldShowGameApplicationNavigation}
              />
            </Box>

            <Stack
              direction="row"
              spacing={{ xs: 0, sm: 0.5 }}
              alignItems="center"
              sx={{ gridColumn: 3, gridRow: 1, flexShrink: 0, justifySelf: 'end' }}
            >
              <PanelAdminNavigation activeRouteId={activeRoute?.id} roles={user.roles} />
              <ButtonBase
                aria-controls={notificationAnchor ? 'notification-menu' : undefined}
                aria-expanded={notificationAnchor ? 'true' : undefined}
                aria-haspopup="menu"
                aria-label={t('navigation.openNotifications')}
                onClick={openNotificationMenu}
                sx={(theme) => ({
                  ...navigationButtonSx(Boolean(notificationAnchor))(theme),
                  width: 44,
                  height: 44,
                })}
              >
                <Badge color="warning" badgeContent={totalNotificationsCount} max={9}>
                  <SvgIcon sx={{ fontSize: 20 }}>
                    <path
                      d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </SvgIcon>
                </Badge>
              </ButtonBase>

              <Menu
                id="notification-menu"
                anchorEl={notificationAnchor}
                open={Boolean(notificationAnchor)}
                onClose={closeNotificationMenu}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{ paper: { sx: { mt: 1, width: 360, maxWidth: 'calc(100vw - 32px)' } } }}
              >
                <Box sx={{ px: 2, py: 1.25 }}>
                  <Typography variant="subtitle2">{t('navigation.notifications')}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {totalNotificationsCount > 0
                      ? t('navigation.notificationCount', { count: totalNotificationsCount })
                      : t('navigation.notificationsEmpty')}
                  </Typography>
                </Box>

                {totalNotificationsCount === 0 ? (
                  <MenuItem
                    component={RouterLink}
                    to={gameApplicationRoute.fullPath}
                    onClick={closeNotificationMenu}
                  >
                    {t('navigation.openApplicationPage')}
                  </MenuItem>
                ) : (
                  [
                    ...gameNotifications.map((notification) => (
                      <MenuItem
                        key={`game-notification-${notification.notificationId}`}
                        component={RouterLink}
                        to={gameModifiersRoute.fullPath}
                        onClick={closeNotificationMenu}
                        sx={{ whiteSpace: 'normal', alignItems: 'flex-start', py: 1.25 }}
                      >
                        <Stack spacing={0.5}>
                          <Typography variant="body2" fontWeight={700}>
                            {getGameNotificationTitle(t, notification)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {getGameNotificationDescription(t, notification)}
                          </Typography>
                        </Stack>
                      </MenuItem>
                    )),
                    ...disbandRequestTeams.map((team) => (
                      <MenuItem
                        key={`disband-${team.teamId}`}
                        component={RouterLink}
                        to={teamRegistrationsRoute.fullPath}
                        onClick={closeNotificationMenu}
                        sx={{ whiteSpace: 'normal', alignItems: 'flex-start', py: 1.25 }}
                      >
                        <Stack spacing={0.5}>
                          <Typography variant="body2" fontWeight={700}>
                            {t('navigation.disbandRequestItemTitle', {
                              player: team.disbandRequestedByDisplayName ?? t('navigation.someone'),
                            })}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {t('navigation.disbandRequestItemDescription', {
                              slot: team.teamSlotIndex,
                            })}
                          </Typography>
                        </Stack>
                      </MenuItem>
                    )),
                    ...pendingInvitations.map((invitation) => (
                      <MenuItem
                        key={`invitation-${invitation.invitationId}`}
                        component={RouterLink}
                        to={gameApplicationRoute.fullPath}
                        onClick={closeNotificationMenu}
                        sx={{ whiteSpace: 'normal', alignItems: 'flex-start', py: 1.25 }}
                      >
                        <Stack spacing={0.5}>
                          <Typography variant="body2" fontWeight={700}>
                            {t('navigation.invitationItemTitle', {
                              player: invitation.invitedByDisplayName ?? t('navigation.someone'),
                            })}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {t('navigation.invitationItemDescription', {
                              slot: invitation.teamSlotIndex,
                            })}
                          </Typography>
                        </Stack>
                      </MenuItem>
                    )),
                  ]
                )}
              </Menu>

              <PanelProfileMenu user={user} onLogout={logout} />
            </Stack>
          </Box>
        </Box>
      </Box>
    </>
  )
}

function GameNotificationRealtimeSync() {
  const queryClient = useQueryClient()
  const syncNotifications = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: gameNotificationQueryKeys.all })
  }, [queryClient])

  const registerEventHandlers = useCallback(
    (connection: {
      on: (eventName: string, handler: () => void) => void
      off: (eventName: string, handler: () => void) => void
    }) => {
      const handleUserNotificationCreated = () => {
        void syncNotifications()
      }

      connection.on(USER_NOTIFICATION_CREATED_EVENT, handleUserNotificationCreated)

      return () => {
        connection.off(USER_NOTIFICATION_CREATED_EVENT, handleUserNotificationCreated)
      }
    },
    [syncNotifications],
  )

  useSignalrHubSubscription({
    hub: 'gameBoard',
    logLabel: 'Game notifications',
    onConnected: syncNotifications,
    registerEventHandlers,
  })

  return null
}

function getGameNotificationTitle(t: TFunction, notification: GameUserNotification) {
  switch (notification.type) {
    case 'modifier_cancelled':
      return t('navigation.modifierCancelledItemTitle', {
        modifier: notification.modifierName ?? t('navigation.modifierFallback'),
      })
    default:
      return t('navigation.genericNotificationTitle')
  }
}

function getGameNotificationDescription(t: TFunction, notification: GameUserNotification) {
  switch (notification.type) {
    case 'modifier_cancelled':
      return t('navigation.modifierCancelledItemDescription', {
        player: notification.actorDisplayName ?? t('navigation.someone'),
        points: notification.quizPointsDelta ?? 0,
      })
    default:
      return t('navigation.genericNotificationDescription')
  }
}
