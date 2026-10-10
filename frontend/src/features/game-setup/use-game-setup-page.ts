import { useCallback, useEffect, useRef } from 'react'
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

  const { updateDraft: applyDraft } = draft
  const { handleDraftEdited, saveDraft } = save

  const updateDraft = (updater: (current: GameSetupDraftState) => GameSetupDraftState) => {
    const currentDraft = currentDraftRef.current
    if (!currentDraft) {
      return
    }

    const nextDraft = updater(currentDraft)
    currentDraftRef.current = nextDraft
    applyDraft(nextDraft)
    handleDraftEdited(nextDraft)
  }

  const updateDraftAndSave = useCallback(
    (updater: (current: GameSetupDraftState) => GameSetupDraftState) => {
      const currentDraft = currentDraftRef.current
      if (!currentDraft) {
        return
      }

      const nextDraft = updater(currentDraft)
      currentDraftRef.current = nextDraft
      applyDraft(nextDraft)
      handleDraftEdited(nextDraft)
      void saveDraft(nextDraft).catch(() => undefined)
    },
    [applyDraft, handleDraftEdited, saveDraft],
  )

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

  const setModifiersEnabled = useCallback(
    (modifierIds: readonly string[], enabled: boolean) => {
      updateDraftAndSave((current) => {
        const currentIds = current.enabledModifierIds
        const targets = new Set(modifierIds)
        const nextIds = enabled
          ? [...new Set([...currentIds, ...modifierIds])]
          : currentIds.filter((id) => !targets.has(id))

        return {
          ...current,
          enabledModifierIds: nextIds,
        }
      })
    },
    [updateDraftAndSave],
  )

  const toggleModifier = useCallback(
    (modifierId: string, enabled: boolean) => setModifiersEnabled([modifierId], enabled),
    [setModifiersEnabled],
  )

  const toggleQuestion = useCallback(
    (questionId: string, enabled: boolean) => {
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
    },
    [updateDraftAndSave],
  )

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
    setModifiersEnabled,
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
