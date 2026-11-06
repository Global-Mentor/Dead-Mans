import { afterEach, expect, it, vi } from 'vitest'
import { profileDate } from './profile-date.ts'

afterEach(() => vi.restoreAllMocks())

it.each([
  ['America/New_York', '2026-11-01T00:15:00Z', '1 Nov 2026, 00:15'],
  ['Asia/Tokyo', '2026-10-31T23:15:00Z', '31 Oct 2026, 23:15'],
])(
  'keeps history in the UTC activity month when the browser uses %s',
  (timeZone, value, expected) => {
    const DateTimeFormat = Intl.DateTimeFormat
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(function (locales, options) {
      return new DateTimeFormat(locales, { timeZone, ...options })
    })

    expect(profileDate(value, 'en-GB', 'No date')).toBe(expected)
  },
)

it.each([null, undefined, '', 'invalid-date'])(
  'uses the fallback for an unavailable date %s',
  (value) => {
    expect(profileDate(value, 'en-GB', 'No date')).toBe('No date')
  },
)
