import { describe, expect, it } from 'vitest'
import { appTheme } from '../../app/theme/appTheme.ts'
import { mergeSx } from './merge-sx.ts'

describe('mergeSx', () => {
  it('flattens objects, callbacks and arrays while preserving precedence', () => {
    const callback = () => ({ color: 'primary.main' })
    const result = mergeSx({ display: 'block' }, [false, callback, { display: 'grid' }], undefined)

    expect(result).toEqual([{ display: 'block' }, callback, { display: 'grid' }])
    expect(result).not.toContainEqual(expect.any(Array))
    expect(callback(appTheme)).toEqual({ color: 'primary.main' })
  })
})
