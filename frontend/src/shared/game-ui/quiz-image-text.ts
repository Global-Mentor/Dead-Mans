import type { components } from '../api/contracts/generated'

type Image = components['schemas']['GameQuizImageDto']

export function huntName(names: Readonly<Record<string, string>>, language: string) {
  const locale = language.split('-')[0]
  return names[locale ?? 'en'] ?? names.en ?? ''
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

/** Map resources contain mixed display casing; preserve spelling without all-caps headings. */
export function huntMapName(names: Readonly<Record<string, string>>, language: string) {
  const name = huntName(names, language)
  return name === name.toLocaleUpperCase(language)
    ? name
        .toLocaleLowerCase(language)
        .replace(/(^|[\s-])\p{L}/gu, (word) => word.toLocaleUpperCase(language))
    : name
}
