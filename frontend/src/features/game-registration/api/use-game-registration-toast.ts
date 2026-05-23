import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getGameRegistrationMutationErrorMessage } from './game-registration-mutation-errors.ts'

export function useGameRegistrationToast() {
  const { t } = useTranslation()
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const onMutationError = useCallback(
    (error: unknown) => {
      setToastMessage(getGameRegistrationMutationErrorMessage(error, t))
    },
    [t],
  )

  const dismissToast = useCallback(() => setToastMessage(null), [])

  return { toastMessage, onMutationError, dismissToast }
}
