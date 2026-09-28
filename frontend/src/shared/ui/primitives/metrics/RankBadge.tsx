import { StatusBadge } from '../status/StatusBadge.tsx'

export function RankBadge({
  rank,
  compact = false,
  ariaLabel,
}: {
  rank: number
  compact?: boolean
  ariaLabel?: string
}) {
  return (
    <StatusBadge
      label={rank}
      aria-label={ariaLabel}
      size={compact ? 'small' : 'medium'}
      color={rank === 1 ? 'warning' : rank === 2 ? 'default' : rank === 3 ? 'secondary' : 'primary'}
    />
  )
}
