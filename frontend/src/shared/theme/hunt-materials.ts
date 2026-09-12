import wornFrameUrl from './assets/worn-frame.svg'
import charcoalPaperUrl from './assets/charcoal-paper.jpg'

export const huntPaperTexture = `url("${charcoalPaperUrl}")`

// A nine-slice frame keeps the worn corners at the same size on buttons and panels.
export const huntWornFrame = {
  borderImageSource: `url("${wornFrameUrl}")`,
  borderImageSlice: 8,
  borderImageWidth: '5px',
  borderImageOutset: '2px',
  borderImageRepeat: 'stretch',
} as const
