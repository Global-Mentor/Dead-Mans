import type { components } from '../api/contracts/generated'

type Image = components['schemas']['GameQuizImageDto']

export function huntName(names: components['schemas']['LocalizedHuntNames'], language: string) {
  const locale = language.split('-')[0]
  return locale === 'ru' || locale === 'uk' || locale === 'pl' ? names[locale] : names.en
}

export function quizOptionText(
  image: Image | null | undefined,
  optionId: string,
  fallback: string,
  language: string,
) {
  const names = image?.optionNames[optionId]
  return names ? huntName(names, language) : fallback
}

export function quizImageSearchTerms(image: Image | null | undefined, language: string) {
  return image
    ? [image.mapNames, ...Object.values(image.optionNames)].map((names) =>
        huntName(names, language),
      )
    : []
}
