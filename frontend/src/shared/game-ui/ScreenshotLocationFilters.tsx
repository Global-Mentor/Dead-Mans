import { useTranslation } from 'react-i18next'
import { FormSelect } from '../ui/index.ts'

export interface ScreenshotLocationFiltersProps {
  maps: readonly { value: string; label: string }[]
  locations: readonly { value: string; label: string }[]
  mapId: string | null
  locationId: string | null
  onMapChange: (value: string | null) => void
  onLocationChange: (value: string | null) => void
}

export function ScreenshotLocationFilters({
  maps,
  locations,
  mapId,
  locationId,
  onMapChange,
  onLocationChange,
}: ScreenshotLocationFiltersProps) {
  const { t } = useTranslation()
  return (
    <>
      <FormSelect
        density="compact"
        label={t('common.quizImage.map')}
        value={mapId ?? '__all__'}
        options={[{ value: '__all__', label: t('common.quizImage.allMaps') }, ...maps]}
        onChange={(value) => onMapChange(value === '__all__' ? null : value)}
      />
      <FormSelect
        density="compact"
        label={t('common.quizImage.location')}
        value={locationId ?? '__all__'}
        disabled={mapId === null}
        options={[
          {
            value: '__all__',
            label: t(mapId ? 'common.quizImage.allLocations' : 'common.quizImage.chooseMapFirst'),
          },
          ...locations,
        ]}
        onChange={(value) => onLocationChange(value === '__all__' ? null : value)}
      />
    </>
  )
}
