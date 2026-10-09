import { zodResolver } from '@hookform/resolvers/zod'
import { Stack } from '@mui/material'
import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { GameQuestionCategoryItem } from '../../../shared/api/contracts/index.ts'
import { z } from '../../../shared/validation/zod.ts'
import {
  AppButton,
  AppDialog,
  ConfirmDialog,
  ControlledFormTextField,
  DiscardChangesDialog,
  FormSelect,
  InlineNotice,
  useDirtyClose,
} from '../../../shared/ui/index.ts'
import { resolveCatalogErrorMessage } from '../model/catalog-error.ts'

interface QuestionCategoryDialogProps {
  open: boolean
  categories: readonly GameQuestionCategoryItem[]
  isBusy: boolean
  onClose: () => void
  onSubmit: (
    action: 'create' | 'edit' | 'delete',
    categoryId: string,
    name: string,
  ) => Promise<void>
}
function QuestionCategoryDialogBody({
  categories,
  isBusy,
  onClose,
  onSubmit,
}: Omit<QuestionCategoryDialogProps, 'open'>) {
  const { t } = useTranslation()
  const editable = categories.filter((category) => !category.isProtected)
  const schema = z
    .object({
      action: z.enum(['create', 'edit', 'delete']),
      categoryId: z.string(),
      name: z.string().trim().max(64, t('gameCatalog.validation.tooLong')),
    })
    .superRefine((values, ctx) => {
      if (values.action !== 'delete' && !values.name)
        ctx.addIssue({
          code: 'custom',
          path: ['name'],
          message: t('gameCatalog.validation.required'),
        })
      if (
        values.action !== 'create' &&
        !editable.some((category) => category.id === values.categoryId)
      )
        ctx.addIssue({
          code: 'custom',
          path: ['categoryId'],
          message: t('gameCatalog.validation.required'),
        })
    })
  const { control, handleSubmit, setValue, setError, clearErrors, formState } = useForm({
    defaultValues: {
      action: 'create' as 'create' | 'edit' | 'delete',
      categoryId: editable[0]?.id ?? '',
      name: '',
    },
    resolver: zodResolver(schema),
  })
  const action = useWatch({ control, name: 'action' })
  const categoryId = useWatch({ control, name: 'categoryId' })
  const selected = editable.find((category) => category.id === categoryId)
  const [pendingValues, setPendingValues] = useState<z.infer<typeof schema> | null>(null)
  const [saving, setSaving] = useState(false)
  const busy = isBusy || saving || formState.isSubmitting
  const close = useDirtyClose({ dirty: formState.isDirty, busy, onClose })
  const blocked =
    action !== 'create' && (!selected || (action === 'delete' && selected.questionCount > 0))
  const save = async (values: z.infer<typeof schema>) => {
    setSaving(true)
    try {
      await onSubmit(values.action, values.categoryId, values.name)
      setPendingValues(null)
      onClose()
    } catch (error) {
      setPendingValues(null)
      setError('root', { type: 'server', message: resolveCatalogErrorMessage(error, t) })
    } finally {
      setSaving(false)
    }
  }
  const submit = handleSubmit(async (values) => {
    if (busy || blocked) return
    setPendingValues(values)
  })
  return (
    <>
      <AppDialog
        open
        onClose={close.requestClose}
        title={t('gameCatalog.questions.categoryManagement')}
        actions={
          <>
            <AppButton tone="danger" disabled={busy} onClick={close.requestClose}>
              {t('common.actions.cancel')}
            </AppButton>
            <AppButton
              type="submit"
              form="catalog-question-category-form"
              tone={action === 'delete' ? 'danger' : 'primary'}
              loading={busy}
              disabled={busy || blocked}
            >
              {t(action === 'delete' ? 'gameCatalog.actions.delete' : 'common.actions.save')}
            </AppButton>
          </>
        }
      >
        <form
          noValidate
          id="catalog-question-category-form"
          onSubmit={(event) => void submit(event)}
        >
          <Stack gap={2}>
            <Controller
              control={control}
              name="action"
              render={({ field }) => (
                <FormSelect
                  label={t('gameCatalog.questions.categoryAction')}
                  value={field.value}
                  disabled={busy}
                  onChange={(value) => {
                    field.onChange(value)
                    clearErrors()
                    setValue('name', value === 'edit' ? (selected?.name ?? '') : '', {
                      shouldDirty: true,
                    })
                  }}
                  options={[
                    { value: 'create', label: t('gameCatalog.questions.addCategory') },
                    { value: 'edit', label: t('gameCatalog.questions.renameCategory') },
                    { value: 'delete', label: t('gameCatalog.questions.deleteCategory') },
                  ]}
                />
              )}
            />
            {action !== 'create' ? (
              <Controller
                control={control}
                name="categoryId"
                render={({ field, fieldState }) => (
                  <FormSelect
                    label={t('gameCatalog.questions.fields.category')}
                    value={field.value}
                    disabled={busy}
                    error={fieldState.invalid}
                    helperText={fieldState.error?.message}
                    options={editable.map((category) => ({
                      value: category.id,
                      label: category.name,
                    }))}
                    onChange={(value) => {
                      field.onChange(value)
                      clearErrors()
                      if (action === 'edit')
                        setValue(
                          'name',
                          editable.find((category) => category.id === value)?.name ?? '',
                          { shouldDirty: true },
                        )
                    }}
                  />
                )}
              />
            ) : null}
            {action !== 'delete' ? (
              <ControlledFormTextField
                control={control}
                name="name"
                required
                autoFocus
                disabled={busy}
                label={t('gameCatalog.questions.categoryDialog.nameLabel')}
                inputProps={{ maxLength: 64 }}
              />
            ) : null}
            {action === 'delete' && selected ? (
              <InlineNotice severity="warning">
                {selected.questionCount > 0
                  ? t('gameCatalog.errors.categoryNotEmpty')
                  : t('gameCatalog.questions.deleteCategoryConfirm')}
              </InlineNotice>
            ) : null}
            {formState.errors.root ? (
              <InlineNotice severity="error">{formState.errors.root.message}</InlineNotice>
            ) : null}
          </Stack>
        </form>
      </AppDialog>
      <ConfirmDialog
        open={pendingValues !== null}
        title={t(
          pendingValues?.action === 'delete'
            ? 'gameCatalog.questions.deleteCategoryTitle'
            : pendingValues?.action === 'edit'
              ? 'gameCatalog.questions.renameCategory'
              : 'gameCatalog.questions.addCategory',
        )}
        description={t(
          pendingValues?.action === 'delete'
            ? 'gameCatalog.questions.deleteCategoryConfirm'
            : pendingValues?.action === 'edit'
              ? 'gameCatalog.questions.renameCategoryConfirm'
              : 'gameCatalog.questions.createCategoryConfirm',
        )}
        subject={
          pendingValues?.action === 'delete' ? (
            selected?.name
          ) : pendingValues?.action === 'edit' ? (
            <>
              {selected?.name} → {pendingValues.name}
            </>
          ) : (
            pendingValues?.name
          )
        }
        confirmLabel={t(
          pendingValues?.action === 'delete' ? 'gameCatalog.actions.delete' : 'common.actions.save',
        )}
        cancelLabel={t('common.actions.cancel')}
        confirmTone={pendingValues?.action === 'delete' ? 'danger' : 'primary'}
        isBusy={busy}
        onClose={() => setPendingValues(null)}
        confirmDisabled={blocked}
        onConfirm={async () => {
          if (pendingValues && !blocked) await save(pendingValues)
        }}
      />
      <DiscardChangesDialog
        open={close.confirmOpen}
        busy={busy}
        onClose={close.keepEditing}
        onDiscard={close.discard}
      />
    </>
  )
}
export function QuestionCategoryDialog({ open, ...props }: QuestionCategoryDialogProps) {
  return open ? <QuestionCategoryDialogBody {...props} /> : null
}
