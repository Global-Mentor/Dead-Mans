import { Box } from '@mui/material'

export type GameControlIconName =
  'round' | 'team' | 'points' | 'recovery' | 'finish' | 'add' | 'stop' | 'refund'

const paths: Record<GameControlIconName, string> = {
  round: 'M5 5h14v14H5z M9 8l6 4-6 4z',
  team: 'M12 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0 M3 20v-2a6 6 0 0 1 12 0v2 M16 5a3 3 0 0 1 0 6 M17 14a5 5 0 0 1 4 4v2',
  points: 'M12 3 21 8v8l-9 5-9-5V8z M8 12h8 M12 8v8',
  recovery: 'M12 3 22 20H2z M12 9v5 M12 16v2',
  finish: 'M5 21V3 M5 4h14l-3 4 3 4H5',
  add: 'M4 4h16v16H4z M8 12h8 M12 8v8',
  stop: 'M8 3h8l5 5v8l-5 5H8l-5-5V8z M8 8l8 8 M16 8l-8 8',
  refund: 'M4 10h10a6 6 0 0 1 0 12 M8 6l-4 4 4 4 M12 3h8v8',
}

export function GameControlIcon({ name }: { name: GameControlIconName }) {
  return (
    <Box
      component="svg"
      aria-hidden
      viewBox="0 0 24 24"
      sx={{
        width: 22,
        height: 22,
        flexShrink: 0,
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.4,
      }}
    >
      <path d={paths[name]} />
    </Box>
  )
}
