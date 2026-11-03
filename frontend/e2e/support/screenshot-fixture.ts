import type { CurrentGameQuizState } from '../../src/shared/api/contracts/index.ts'

const names = [
  'Винный завод',
  'Порт',
  'Лесопилка',
  'Старая шахта',
  'Каменоломня',
  'Железнодорожная станция',
]
export const screenshotQuestion: CurrentGameQuizState = {
  gameId: 'quiz',
  questionSessionId: 'screenshot-session',
  questionId: 'screenshot-question',
  askOrder: 31,
  categoryName: 'Локации',
  text: 'Какая локация изображена?',
  reward: 7,
  status: 'open',
  askedAtUtc: '2026-11-02T12:00:00Z',
  closesAtUtc: '2026-11-02T12:01:00Z',
  presentationVisible: true,
  image: {
    imageUrl: 'http://localhost:5180/images/game-guide/board-ru.png',
    mapNames: {
      en: 'Stillwater Bayou',
      ru: 'Болото Стиллуотер',
      uk: 'Болото Стілвотер',
      pl: 'Stillwater Bayou',
    },
    optionNames: Object.fromEntries(
      names.map((name, index) => [
        `location-${index}`,
        { en: `Location ${index + 1}`, ru: name, uk: name, pl: `Lokacja ${index + 1}` },
      ]),
    ),
  },
  options: names.map((text, index) => ({
    optionId: `location-${index}`,
    text,
    displayOrder: index,
  })),
}

export function screenshotLocationFixture(
  mapId: string,
  locationId: string,
  mapName: string,
  locationName: string,
) {
  const names = (name: string) => ({ en: name, ru: name, uk: name, pl: name })
  return {
    screenshotMapId: mapId,
    screenshotLocationId: locationId,
    image: {
      ...screenshotQuestion.image!,
      mapNames: names(mapName),
      optionNames: { wrong: names('Darrow Livestock'), correct: names(locationName) },
    },
    options: [
      { optionId: 'wrong', text: 'Darrow Livestock', isCorrect: false, sortOrder: 0 },
      { optionId: 'correct', text: locationName, isCorrect: true, sortOrder: 1 },
    ],
  }
}
