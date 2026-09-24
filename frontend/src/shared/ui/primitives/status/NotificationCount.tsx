import { Badge, type BadgeProps } from '@mui/material'

/** A notification count does not replace the accessible name of its trigger. */
export function NotificationCount(props: BadgeProps) {
  return <Badge color="warning" max={9} {...props} />
}
