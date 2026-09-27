export const boardGridMetrics = {
  statusRailWidth: 270,
  columnHeaderHeight: '3.5rem',
  columnDividerHeight: 12,
  leadColumnWidth: 44,
  gap: 0.85,
  minimumCardWidth: { desktop: 80, mobile: 112 },
  cardAspectRatio: 2 / 3,
} as const

export function getBoardRowLabelColumnWidth(rowLabels: readonly string[]): number {
  return Math.min(
    128,
    Math.max(
      boardGridMetrics.leadColumnWidth,
      ...rowLabels.map((label) => label.trim().length * 8 + 8),
    ),
  )
}
