import type { ComponentType, LazyExoticComponent } from 'react'
import { Suspense, lazy, createElement } from 'react'
import { Navigate } from 'react-router-dom'
import type { RouteObject } from 'react-router-dom'
import { lazyPanelPage } from './lazy-panel-page.ts'
import { featureTranslationBundles } from '../locales/feature-locale-loader.ts'
import { panelRouteConfig } from './panel-route-config.tsx'
import { panelRootPath } from './panel-route-metadata.ts'
import { PanelIndexRedirect } from '../routes/PanelIndexRedirect.tsx'
import { RequirePanelRouteAccess } from '../routes/RequirePanelRouteAccess.tsx'
import { RequireAuth } from '../shared/auth/RequireAuth.tsx'
import { CenteredProgress } from '../shared/ui/index.ts'

const GameOverlayPage = lazyPanelPage(
  () => import('../features/game-overlay/GameOverlayPage.tsx'),
  'GameOverlayPage',
  [featureTranslationBundles.gameOverlay],
)

const MainLayout = lazy(() =>
  import('../layouts/MainLayout.tsx').then((module) => ({ default: module.MainLayout })),
)

const GameGuideLayout = lazy(() =>
  import('../layouts/GameGuideLayout.tsx').then((module) => ({ default: module.GameGuideLayout })),
)

const AuthLandingPage = lazy(() =>
  import('../features/auth/AuthLandingPage.tsx').then((module) => ({
    default: module.AuthLandingPage,
  })),
)
const TwitchAuthCallbackPage = lazy(() =>
  import('../features/auth/TwitchAuthCallbackPage.tsx').then((module) => ({
    default: module.TwitchAuthCallbackPage,
  })),
)

const UiStateGallery = import.meta.env.DEV
  ? lazy(() =>
      import('../features/ui-state-gallery/UiStateGallery.tsx').then((module) => ({
        default: module.UiStateGallery,
      })),
    )
  : null

function lazyAuthRoute(
  path: string,
  Page: LazyExoticComponent<ComponentType<unknown>>,
): RouteObject {
  return {
    path,
    element: (
      <Suspense fallback={<CenteredProgress minHeight="100vh" />}>
        <Page />
      </Suspense>
    ),
  }
}

function createPanelChildRoute(route: (typeof panelRouteConfig)[number]): RouteObject {
  const { path, Page, Sync } = route

  return {
    path,
    element: (
      <RequirePanelRouteAccess route={route}>
        <Suspense
          fallback={route.id === 'game-board' ? null : <CenteredProgress minHeight={240} />}
        >
          {Sync ? createElement(Sync) : null}
          <Page />
        </Suspense>
      </RequirePanelRouteAccess>
    ),
  }
}

const panelChildRoutes: RouteObject[] = [
  { index: true, element: <PanelIndexRedirect /> },
  ...panelRouteConfig.filter((route) => route.id !== 'game-guide').map(createPanelChildRoute),
  ...(UiStateGallery
    ? [
        {
          path: '__ui-states',
          element: (
            <Suspense fallback={<CenteredProgress minHeight={240} />}>
              <UiStateGallery />
            </Suspense>
          ),
        },
      ]
    : []),
]

export const appRoutes: RouteObject[] = [
  {
    path: '/overlay',
    element: (
      <Suspense fallback={null}>
        <GameOverlayPage />
      </Suspense>
    ),
  },
  lazyAuthRoute('/', AuthLandingPage),
  lazyAuthRoute('/auth/callback', TwitchAuthCallbackPage),
  ...panelRouteConfig
    .filter((route) => route.id === 'game-guide')
    .map(({ fullPath, Page }) => ({
      path: fullPath,
      element: (
        <Suspense fallback={<CenteredProgress minHeight="100vh" />}>
          <GameGuideLayout />
        </Suspense>
      ),
      children: [{ index: true, element: <Page /> }],
    })),
  {
    path: panelRootPath,
    element: (
      <RequireAuth>
        <Suspense fallback={<CenteredProgress minHeight="100vh" />}>
          <MainLayout />
        </Suspense>
      </RequireAuth>
    ),
    children: panelChildRoutes,
  },
  { path: '*', element: <Navigate to="/" replace /> },
]
