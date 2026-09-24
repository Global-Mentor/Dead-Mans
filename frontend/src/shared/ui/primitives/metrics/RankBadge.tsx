import { StatusBadge } from '../status/StatusBadge.tsx'

export function RankBadge({ rank, compact = false }: { rank: number; compact?: boolean }) {
  return (
    <StatusBadge
      label={rank}
      size={compact ? 'small' : 'medium'}
      color={rank === 1 ? 'warning' : rank === 2 ? 'default' : rank === 3 ? 'secondary' : 'primary'}
    />
  )
}
