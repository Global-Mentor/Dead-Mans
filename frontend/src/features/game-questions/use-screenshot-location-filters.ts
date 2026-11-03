import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameQuestionCatalogItem } from '../../shared/api/contracts/index.ts'
import { huntMapName, quizOptionText } from '../../shared/game-ui/index.ts'

export function useScreenshotLocationFilters(
  questions: readonly GameQuestionCatalogItem[] | undefined,
) {
  const { i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? 'en'
  const [selection, setSelection] = useState<{ mapId: string | null; locationId: string | null }>({
    mapId: null,
    locationId: null,
  })
  const maps = useMemo(() => {
    const names = new Map<string, string>()
    for (const question of questions ?? []) {
      if (question.image && question.screenshotMapId)
        names.set(question.screenshotMapId, huntMapName(question.image.mapNames, locale))
    }
    return [...names]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, locale))
  }, [questions, locale])
  const mapId = maps.some((map) => map.value === selection.mapId) ? selection.mapId : null
  const locations = useMemo(() => {
    const names = new Map<string, string>()
    for (const question of questions ?? []) {
      if (
        !question.image ||
        !mapId ||
        question.screenshotMapId !== mapId ||
        !question.screenshotLocationId
      )
        continue
      const correct = question.options.find((option) => option.isCorrect)
      if (correct)
        names.set(
          question.screenshotLocationId,
          quizOptionText(question.image, correct.optionId, correct.text, locale),
        )
    }
    return [...names]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, locale))
  }, [questions, mapId, locale])
  const locationId = locations.some((location) => location.value === selection.locationId)
    ? selection.locationId
    : null
  const filteredQuestions = useMemo(
    () =>
      (questions ?? []).filter(
        (question) =>
          (!mapId || question.screenshotMapId === mapId) &&
          (!locationId || question.screenshotLocationId === locationId),
      ),
    [questions, mapId, locationId],
  )
  const reset = () => setSelection({ mapId: null, locationId: null })
  return {
    filteredQuestions,
    activeCount: Number(mapId !== null) + Number(locationId !== null),
    reset,
    controls: {
      maps,
      locations,
      mapId,
      locationId,
      onMapChange: (value: string | null) => setSelection({ mapId: value, locationId: null }),
      onLocationChange: (value: string | null) => setSelection({ mapId, locationId: value }),
    },
  }
}
