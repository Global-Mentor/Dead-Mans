import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import i18n from '../../../i18n.ts'
import { renderWithAppProviders } from '../../../test/render-with-app-providers.tsx'
import { GameSetupCellImage } from './GameSetupCellImage.tsx'

beforeAll(async () => {
  await i18n.changeLanguage('ru')
})
afterEach(cleanup)

describe('GameSetupCellImage drop interactions', () => {
  it.each([
    { imageUrl: undefined, isBusy: false, canManageMedia: true, accepts: true },
    { imageUrl: '/card.png', isBusy: false, canManageMedia: true, accepts: true },
    { imageUrl: '/card.png', isBusy: true, canManageMedia: true, accepts: false },
    { imageUrl: '/card.png', isBusy: false, canManageMedia: false, accepts: false },
  ])(
    'preserves drop permissions and busy state: %j',
    ({ imageUrl, isBusy, canManageMedia, accepts }) => {
      const onUpload = vi.fn()
      const onPreview = vi.fn()
      const { container } = renderWithAppProviders(
        <GameSetupCellImage
          imageUrl={imageUrl}
          imageKey={undefined}
          alt="Card"
          cellId="cell-1"
          phase={isBusy ? 'uploading' : 'idle'}
          isBusy={isBusy}
          canManageMedia={canManageMedia}
          onUpload={onUpload}
          onDelete={vi.fn()}
          onPreview={onPreview}
        />,
      )
      const file = new File(['image'], 'card.png', { type: 'image/png' })
      const dataTransfer = { types: ['Files'], files: [file] }
      const dropTarget =
        imageUrl && !isBusy
          ? screen.getByRole('button', { name: 'Открыть изображение' })
          : container.firstElementChild!
      fireEvent.dragEnter(dropTarget, { dataTransfer })
      fireEvent.dragOver(dropTarget, { dataTransfer })
      fireEvent.drop(dropTarget, { dataTransfer })
      if (accepts) expect(onUpload).toHaveBeenCalledExactlyOnceWith('cell-1', file)
      else expect(onUpload).not.toHaveBeenCalled()
      expect(onPreview).not.toHaveBeenCalled()
    },
  )
})
