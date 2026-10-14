import { ListSubheader, styled } from '@mui/material'
import { huntOverlineSx } from '../../../theme/surface-sx.ts'

export const MenuGroupLabel = Object.assign(
  styled(ListSubheader, {
    shouldForwardProp: (prop) =>
      !['appearance', 'ownerState', 'theme', 'sx', 'as'].includes(String(prop)),
  })<{ appearance?: 'standard' | 'section' | 'tree' }>(({ theme, appearance = 'standard' }) => ({
    whiteSpace: 'normal',
    overflowWrap: 'anywhere',
    ...(appearance !== 'standard'
      ? {
          ...theme.unstable_sx(huntOverlineSx),
          color: theme.palette.primary.light,
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing(0.75),
          padding: theme.spacing(0.5, 1.5),
          backgroundColor: 'transparent',
          fontSize: 12,
          fontWeight: 600,
          lineHeight: 1.5,
          '&:not(:first-of-type)': { marginTop: theme.spacing(0.5) },
          ...(appearance === 'tree'
            ? {
                position: 'relative',
                paddingRight: theme.spacing(2.5),
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  top: 'calc(50% + 8px)',
                  bottom: 0,
                  left: theme.spacing(2.5),
                  width: 1,
                  backgroundColor: theme.palette.divider,
                  pointerEvents: 'none',
                },
              }
            : {}),
        }
      : {}),
  })),
  { muiSkipListHighlight: true },
)
