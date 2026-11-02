import { useEffect, useRef, useState } from 'react'

export function useQuizCountdown(
  askedAtUtc: string | null,
  closesAtUtc: string | null,
  onDeadline: () => void,
) {
  const [now, setNow] = useState(() => Date.now())
  const notifiedDeadline = useRef<string | null>(null)
  const askedAt = askedAtUtc ? new Date(askedAtUtc).getTime() : null
  const closesAt = closesAtUtc ? new Date(closesAtUtc).getTime() : null
  const secondsLeft = closesAt == null ? 0 : Math.max(0, Math.ceil((closesAt - now) / 1000))
  const duration = askedAt == null || closesAt == null ? 0 : Math.max(1, closesAt - askedAt)
  const progress =
    closesAt == null ? 0 : Math.min(100, Math.max(0, ((closesAt - now) / duration) * 100))

  useEffect(() => {
    if (!closesAtUtc) return
    const timer = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [closesAtUtc])

  useEffect(() => {
    if (closesAtUtc && secondsLeft === 0 && notifiedDeadline.current !== closesAtUtc) {
      notifiedDeadline.current = closesAtUtc
      onDeadline()
    }
  }, [closesAtUtc, onDeadline, secondsLeft])

  return { progress, secondsLeft }
}
