import { List, styled } from '@mui/material'

/** Semantic list of domain rows, without an additional decorative surface. */
export const ContentList = styled(List)({ minWidth: 0, listStyle: 'none' }) as typeof List
