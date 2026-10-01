export const ink = '#d1cfc7'
export const paper = '#101010'

export const d =
  '<path fill-rule="evenodd" d="M0 0H34L64 22V74L34 96H0V86H6V10H0ZM22 16V80H30L46 68V28L30 16Z"/>'
// Reflect the same points into one contour, avoiding a separately painted center seam.
const outer = [
  [0, 0],
  [22, 0],
  [40, 38],
]
const inner = [
  [40, 66],
  [22, 30],
  [22, 86],
  [28, 86],
  [28, 96],
  [0, 96],
  [0, 86],
  [6, 86],
  [6, 10],
  [0, 10],
]
const reflect = ([x, y]) => [80 - x, y]
const contour = [
  ...outer,
  ...outer.slice(0, -1).reverse().map(reflect),
  ...inner.slice(1).reverse().map(reflect),
  ...inner,
]
export const m = `<path d="${contour.map(([x, y], index) => `${index ? 'L' : 'M'}${x} ${y}`).join('')}Z"/>`
export const monogram = `${d}<g transform="translate(74 0)">${m}</g>`

const letters = {
  D: d,
  E: '<path d="M0 0H60V22H48V16H22V39H48V55H22V80H48V74H60V96H0V86H6V10H0Z"/>',
  A: '<path fill-rule="evenodd" d="M0 96V86H6L29 0H47L70 86H76V96H46V86H51L47 70H29L25 86H30V96ZM33 54H43L38 31Z"/>',
  M: m,
  N: '<path d="M0 0H22L50 57V10H44V0H78V10H72V96H56L22 30V86H28V96H0V86H6V10H0Z"/>',
  S: '<path d="M60 0H16L0 16V42L16 56H40V80H18V72H0V96H44L60 80V54L44 40H20V16H42V24H60Z"/>',
  "'": '<path d="M0 0H12V16L4 26H0L6 14H0Z"/>',
}
const widths = { D: 64, E: 60, A: 76, M: 80, N: 78, S: 60, "'": 12 }
function lettering(text) {
  let x = 0
  const content = [...text]
    .map((letter) => {
      const glyph = `<g transform="translate(${x} 0)">${letters[letter]}</g>`
      x += widths[letter] + 12
      return glyph
    })
    .join('')
  return { content, width: x - 12 }
}
const name = lettering('DEADMAN')
export const wordmarkWidth = name.width
export const wordmark = name.content
const shareName = lettering("DEADMAN'S")

export function svg(width, height, content) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" color="${ink}">${content}</svg>\n`
}

export const artworks = {
  'brand/deadmans-monogram.svg': svg(
    192,
    192,
    `<g transform="translate(19 48)" fill="currentColor">${monogram}</g>`,
  ),
  'brand/deadman-wordmark.svg': svg(wordmarkWidth, 96, `<g fill="currentColor">${wordmark}</g>`),
  'favicon.svg': svg(
    32,
    32,
    `<rect width="32" height="32" rx="3" fill="${paper}"/><g transform="translate(8 4) scale(.25)" fill="currentColor">${d}</g>`,
  ),
  'brand/share-card.svg': svg(
    1200,
    630,
    `<rect width="1200" height="630" fill="#000"/><g transform="translate(${(1200 - shareName.width * 1.4) / 2} 247.8) scale(1.4)" fill="currentColor">${shareName.content}</g>`,
  ),
}
