import { ThemeProvider } from '@mui/material'
import { render } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { I18nextProvider } from 'react-i18next'
import { appTheme } from '../app/theme/appTheme.ts'
import i18n from '../i18n.ts'

function testProviders({ children }: { children: ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider theme={appTheme}>{children}</ThemeProvider>
    </I18nextProvider>
  )
}
export function renderWithAppProviders(ui: ReactElement) {
  return render(ui, { wrapper: testProviders })
}
