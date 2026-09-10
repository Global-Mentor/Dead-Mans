import { ThemeProvider } from '@mui/material'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { I18nextProvider } from 'react-i18next'
import { appTheme } from '../app/theme/appTheme.ts'
import i18n from '../i18n.ts'

export function renderWithAppProviders(ui: ReactElement) {
  return render(
    <I18nextProvider i18n={i18n}>
      <ThemeProvider theme={appTheme}>{ui}</ThemeProvider>
    </I18nextProvider>,
  )
}
