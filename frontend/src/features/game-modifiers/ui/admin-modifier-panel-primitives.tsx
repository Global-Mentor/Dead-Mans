import type { ReactNode } from 'react'
import { DisclosureSection } from '../../../shared/ui/index.ts'
export function AdminModifierBlock({
  sectionId,
  step,
  title,
  tooltip,
  children,
}: {
  sectionId: string
  step: string
  title: string
  tooltip: string
  children: ReactNode
}) {
  return (
    <DisclosureSection
      title={title}
      countLabel={step}
      description={tooltip}
      panelId={`modifier-management-${sectionId}-content`}
      defaultExpanded
    >
      {children}
    </DisclosureSection>
  )
}
