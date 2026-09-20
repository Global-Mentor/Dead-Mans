import { useEffect, useRef } from 'react'
import type { GameSetupDraftState } from './model/game-setup-draft.ts'
import { useGameSetupCellMedia } from './use-game-setup-cell-media.ts'
import { useGameSetupDraft } from './use-game-setup-draft.ts'
import { useGameSetupSave } from './use-game-setup-save.ts'

export function useGameSetupPage() {
  const draft = useGameSetupDraft()
  const currentDraftRef = useRef(draft.draft)
  useEffect(() => {
    currentDraftRef.current = draft.draft
  }, [draft.draft])

  const save = useGameSetupSave({
    draft: draft.draft,
    snapshot: draft.snapshot,
    snapshotDraftKey: draft.snapshotDraftKey,
    isDirty: draft.isDirty,
    applyLoadedDraftState: draft.applyLoadedDraftState,
    setDraftOverride: draft.setDraftOverride,
    setRemoteChangeNotice: draft.setRemoteChangeNotice,
  })
  const cellMedia = useGameSetupCellMedia(draft.snapshot, {
    flushDraftSave: save.flushDraftSave,
  })

  const updateDraft = (updater: (current: GameSetupDraftState) => GameSetupDraftState) => {
    const currentDraft = currentDraftRef.current
    if (!currentDraft) {
      return
    }

    const nextDraft = updater(currentDraft)
    currentDraftRef.current = nextDraft
    draft.updateDraft(() => nextDraft)
    save.handleDraftEdited(nextDraft)
  }

  const updateDraftAndSave = (updater: (current: GameSetupDraftState) => GameSetupDraftState) => {
    const currentDraft = currentDraftRef.current
    if (!currentDraft) {
      return
    }

    const nextDraft = updater(currentDraft)
    currentDraftRef.current = nextDraft
    draft.updateDraft(() => nextDraft)
    save.handleDraftEdited(nextDraft)
    void save.saveDraft(nextDraft).catch(() => undefined)
  }

  const commitDraft = () => {
    void save.saveDraft().catch(() => undefined)
  }

  const createDraft: typeof draft.createDraft = async (variables, options) => {
    const result = await draft.createDraft(variables, options)
    save.resetToSaved()
    return result
  }

  const deleteDraft = async () => {
    await draft.deleteDraft()
    save.resetToIdle()
  }

  const reloadFromServer = async () => {
    await draft.reloadFromServer()
    save.resetToSaved()
  }

  const toggleModifier = (modifierId: string, enabled: boolean) => {
    updateDraftAndSave((current) => {
      const currentIds = current.enabledModifierIds
      const nextIds = enabled
        ? currentIds.includes(modifierId)
          ? currentIds
          : [...currentIds, modifierId]
        : currentIds.filter((id) => id !== modifierId)

      return {
        ...current,
        enabledModifierIds: nextIds,
      }
    })
  }

  const toggleQuestion = (questionId: string, enabled: boolean) => {
    updateDraftAndSave((current) => {
      const currentIds = current.enabledQuestionIds
      const nextIds = enabled
        ? currentIds.includes(questionId)
          ? currentIds
          : [...currentIds, questionId]
        : currentIds.filter((id) => id !== questionId)

      return {
        ...current,
        enabledQuestionIds: nextIds,
      }
    })
  }

  const setQuestionsEnabled = (questionIds: readonly string[], enabled: boolean) => {
    updateDraftAndSave((current) => {
      if (enabled) {
        const merged = new Set([...current.enabledQuestionIds, ...questionIds])
        return { ...current, enabledQuestionIds: [...merged] }
      }

      const removed = new Set(questionIds)
      return {
        ...current,
        enabledQuestionIds: current.enabledQuestionIds.filter((id) => !removed.has(id)),
      }
    })
  }

  const setQuizAnswerDuration = (seconds: number) => {
    updateDraft((current) => ({
      ...current,
      quizAnswerDurationSeconds: Number.isFinite(seconds) ? seconds : 60,
    }))
  }

  return {
    snapshot: draft.snapshot,
    draft: draft.draft,
    isLoading: draft.isLoading,
    isError: draft.isError,
    isDirty: draft.isDirty,
    syncStatus: save.syncStatus,
    remoteChangeNotice: draft.remoteChangeNotice,
    draftRemovedNotice: draft.draftRemovedNotice,
    saveErrorMessage: save.saveErrorMessage,
    resetErrorMessage: draft.resetErrorMessage,
    updateDraft,
    commitDraft,
    applyLayoutChange: save.applyLayoutChange,
    reloadFromServer,
    createDraft,
    deleteDraft,
    toggleModifier,
    toggleQuestion,
    setQuestionsEnabled,
    setQuizAnswerDuration,
    isCreating: draft.isCreating,
    isResetting: draft.isResetting,
    isSaving: save.isSaving,
    dismissRemoteChangeNotice: draft.dismissRemoteChangeNotice,
    dismissDraftRemovedNotice: draft.dismissDraftRemovedNotice,
    ...cellMedia,
  }
}
