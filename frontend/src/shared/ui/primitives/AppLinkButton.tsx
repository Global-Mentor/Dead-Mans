import { Link as RouterLink } from 'react-router-dom'
import type { LinkProps as RouterLinkProps } from 'react-router-dom'
import { AppButton } from './AppButton.tsx'
import type { AppButtonProps } from './AppButton.tsx'

interface AppLinkButtonProps extends Omit<AppButtonProps, 'component' | 'href'> {
  to: RouterLinkProps['to']
}

export function AppLinkButton({ to, ...props }: AppLinkButtonProps) {
  return (
    <AppButton
      {...props}
      component={RouterLink as unknown as NonNullable<AppButtonProps['component']>}
      {...({ to } as Record<string, unknown>)}
    />
  )
}
