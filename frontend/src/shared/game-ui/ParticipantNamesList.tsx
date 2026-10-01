import { Box, Stack, Typography } from '@mui/material'

interface ParticipantNamesListProps {
  names: readonly string[]
  emptyLabel: string
  variant?: 'body1' | 'body2' | 'caption'
  dense?: boolean
  direction?: 'column' | 'row'
  decorated?: boolean
  layout?: 'flow' | 'columns'
}

export function ParticipantNamesList({
  names,
  emptyLabel,
  variant = 'body2',
  dense = false,
  direction = 'column',
  decorated = false,
  layout = 'flow',
}: ParticipantNamesListProps) {
  const columns = layout === 'columns'
  const columnCount = Math.min(names.length, 3)
  if (names.length === 0) {
    return (
      <Typography variant={variant} color="text.secondary">
        {emptyLabel}
      </Typography>
    )
  }

  return (
    <Stack
      component="ul"
      direction={direction}
      spacing={
        columns ? 0 : direction === 'row' ? (dense ? 0.75 : 1) : decorated ? 0.5 : dense ? 0 : 0.2
      }
      useFlexGap={direction === 'row'}
      sx={{
        m: 0,
        p: 0,
        listStyle: 'none',
        ...(columns
          ? {
              display: 'grid',
              gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
              alignItems: 'stretch',
              width: '100%',
            }
          : direction === 'row'
            ? { flexWrap: 'wrap', justifyContent: 'center' }
            : {}),
      }}
    >
      {names.map((name, index) =>
        decorated ? (
          <Stack
            component="li"
            key={`${name}-${index}`}
            direction="row"
            spacing={dense ? 0.5 : 1}
            alignItems="center"
            justifyContent="center"
            sx={{
              minWidth: 0,
              ...(columns
                ? {
                    px: 0.5,
                    minHeight: 32,
                    borderLeft: index % columnCount ? '1px solid' : 0,
                    borderColor: 'divider',
                  }
                : {}),
            }}
          >
            <ParticipantDiamond />
            <Typography
              variant={variant}
              fontWeight={700}
              sx={{ minWidth: 0, overflowWrap: 'anywhere', ...(dense ? { lineHeight: 1.25 } : {}) }}
            >
              {name}
            </Typography>
            <ParticipantDiamond />
          </Stack>
        ) : (
          <Typography
            component="li"
            key={`${name}-${index}`}
            variant={variant}
            sx={{
              ...(dense ? { lineHeight: 1.25 } : {}),
              ...(columns
                ? {
                    minWidth: 0,
                    minHeight: 32,
                    px: 0.5,
                    textAlign: 'center',
                    alignContent: 'center',
                    fontWeight: 600,
                    overflowWrap: 'anywhere',
                    borderLeft: index % columnCount ? '1px solid' : 0,
                    borderColor: 'divider',
                  }
                : {}),
            }}
          >
            {name}
          </Typography>
        ),
      )}
    </Stack>
  )
}

function ParticipantDiamond() {
  return (
    <Box
      aria-hidden
      sx={{
        width: 5,
        height: 5,
        flex: '0 0 5px',
        transform: 'rotate(45deg)',
        bgcolor: 'text.secondary',
      }}
    />
  )
}
