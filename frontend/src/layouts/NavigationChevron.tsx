import { SvgIcon } from '@mui/material'

export function NavigationChevron({ open = false }: { open?: boolean }) {
  return (
    <SvgIcon
      aria-hidden
      sx={{ fontSize: 14, flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none' }}
    >
      <path
        d="m6 9 6 6 6-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </SvgIcon>
  )
}
