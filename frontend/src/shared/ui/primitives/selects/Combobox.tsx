import { Autocomplete, type AutocompleteProps } from '@mui/material'
import { mergeSx } from '../../../theme/merge-sx.ts'

/** Searchable selection; data, filtering and translated labels belong to the caller. */
export function Combobox<
  T,
  Multiple extends boolean | undefined = false,
  DisableClearable extends boolean | undefined = false,
  FreeSolo extends boolean | undefined = false,
>({ sx, ...props }: AutocompleteProps<T, Multiple, DisableClearable, FreeSolo>) {
  return (
    <Autocomplete
      {...props}
      sx={mergeSx({ minWidth: 0, '& .MuiAutocomplete-tag': { maxWidth: '100%' } }, sx)}
    />
  )
}
