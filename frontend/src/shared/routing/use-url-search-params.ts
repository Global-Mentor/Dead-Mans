import { useCallback, useLayoutEffect, useRef } from 'react'
import { createSearchParams, useSearchParams, type SetURLSearchParams } from 'react-router-dom'

/** One route owner merges consecutive choices even before a deferred navigation renders. */
export function useUrlSearchParams() {
  const [params, setParams] = useSearchParams()
  const latest = useRef(params)
  useLayoutEffect(() => {
    latest.current = params
  }, [params])
  const update: SetURLSearchParams = useCallback(
    (next, options) => {
      const value = createSearchParams(
        typeof next === 'function' ? next(new URLSearchParams(latest.current)) : next,
      )
      latest.current = value
      setParams(value, options)
    },
    [setParams],
  )
  return [params, update] as const
}
