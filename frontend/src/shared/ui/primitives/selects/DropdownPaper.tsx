import { Paper, styled } from '@mui/material'
import { dropdownPaperSx } from '../../../theme/dropdown-sx.ts'

/** The common surface for searchable choices; the Popper owns positioning. */
export const DropdownPaper = styled(Paper)(({ theme }) => theme.unstable_sx(dropdownPaperSx(theme)))
