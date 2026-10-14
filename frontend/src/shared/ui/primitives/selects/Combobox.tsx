import { Autocomplete, type AutocompleteProps } from '@mui/material'
import { DropdownPaper } from './DropdownPaper.tsx'
import { mergeSx } from '../../../theme/merge-sx.ts'

/** Searchable selection; data, filtering and translated labels belong to the caller. */
export function Combobox<
  T,
  Multiple extends boolean | undefined = false,
  DisableClearable extends boolean | undefined = false,
  FreeSolo extends boolean | undefined = false,
>({ sx, slots, ...props }: AutocompleteProps<T, Multiple, DisableClearable, FreeSolo>) {
  return (
    <Autocomplete
      {...props}
      slots={{ paper: DropdownPaper, ...slots }}
      sx={mergeSx({ minWidth: 0, '& .MuiAutocomplete-tag': { maxWidth: '100%' } }, sx)}
    />
  )
}
