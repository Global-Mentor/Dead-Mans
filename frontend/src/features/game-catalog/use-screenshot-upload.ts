import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { gameQuestionQueryKeys } from '../game-questions/index.ts'
import { uploadQuizScreenshot, type ScreenshotUploadSettings } from './api/quiz-screenshots-api.ts'

export interface ScreenshotUploadRow {
  id: string
  file: File
  preview: string
  status: 'ready' | 'uploading' | 'done' | 'error'
  error: unknown
}

export function useScreenshotUpload() {
  const queryClient = useQueryClient()
  const [rows, setRows] = useState<ScreenshotUploadRow[]>([])
  const [busy, setBusy] = useState(false)
  const [locked, setLocked] = useState(false)
  const running = useRef(false)
  const settings = useRef<ScreenshotUploadSettings | null>(null)
  const urls = useRef(new Set<string>())
  useEffect(() => {
    const owned = urls.current
    return () => owned.forEach((url) => URL.revokeObjectURL(url))
  }, [])
  const add = (files: File[]) => {
    if (running.current || settings.current) return
    setRows((current) => [
      ...current,
      ...files.map((file): ScreenshotUploadRow => {
        const preview = URL.createObjectURL(file)
        urls.current.add(preview)
        return { id: crypto.randomUUID(), file, preview, status: 'ready', error: null }
      }),
    ])
  }
  const remove = (id: string) => {
    if (running.current) return
    setRows((current) =>
      current.filter((row) => {
        if (row.id !== id || row.status === 'done') return true
        URL.revokeObjectURL(row.preview)
        urls.current.delete(row.preview)
        return false
      }),
    )
  }
  const upload = async (input: ScreenshotUploadSettings) => {
    if (running.current) return
    running.current = true
    setBusy(true)
    setLocked(true)
    settings.current ??= input
    try {
      for (const row of rows.filter((item) => item.status !== 'done')) {
        setRows((current) =>
          current.map((item) =>
            item.id === row.id ? { ...item, status: 'uploading', error: null } : item,
          ),
        )
        try {
          await uploadQuizScreenshot(row.id, row.file, settings.current)
          setRows((current) =>
            current.map((item) => (item.id === row.id ? { ...item, status: 'done' } : item)),
          )
        } catch (error) {
          setRows((current) =>
            current.map((item) =>
              item.id === row.id ? { ...item, status: 'error', error } : item,
            ),
          )
        }
      }
      await queryClient.invalidateQueries({ queryKey: gameQuestionQueryKeys.all })
    } finally {
      running.current = false
      setBusy(false)
    }
  }
  return { rows, busy, locked, add, remove, upload }
}
