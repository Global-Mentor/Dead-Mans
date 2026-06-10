import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { describe, expect, it, vi } from 'vitest'
import { ControlledFormTextField } from './ControlledFormTextField.tsx'

interface TestFormValues {
  title: string
}

function TestForm({ onSubmit }: { onSubmit: (values: TestFormValues) => void }) {
  const { control, handleSubmit } = useForm<TestFormValues>({
    defaultValues: { title: '' },
  })

  return (
    <form onSubmit={(event) => void handleSubmit(onSubmit)(event)}>
      <ControlledFormTextField control={control} name="title" label="Title" />
      <button type="submit">Submit</button>
    </form>
  )
}

describe('ControlledFormTextField', () => {
  it('connects MUI input values to React Hook Form submissions', async () => {
    const onSubmit = vi.fn()
    render(<TestForm onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Dead Mans' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        { title: 'Dead Mans' },
        expect.anything(),
      )
    })
  })
})
