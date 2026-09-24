import { cleanup, fireEvent, screen } from '@testing-library/react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { afterEach, expect, it, vi } from 'vitest'
import i18n from '../../../../i18n.ts'
import { renderWithAppProviders } from '../../../../test/render-with-app-providers.tsx'
import { ControlledFormNumberField } from './ControlledFormNumberField.tsx'
import { FormNumberField } from './FormNumberField.tsx'

afterEach(cleanup)
const increase = () =>
  screen.getByRole('button', { name: i18n.t('common.actions.increaseValue', { field: 'Count' }) })
const decrease = () =>
  screen.getByRole('button', { name: i18n.t('common.actions.decreaseValue', { field: 'Count' }) })

it('bounds button edits, preserves manual input and never submits through a step button', () => {
  const submit = vi.fn((event: React.FormEvent) => event.preventDefault())
  function Example() {
    const [value, setValue] = useState('1')
    return (
      <form onSubmit={submit}>
        <FormNumberField label="Count" value={value} onValueChange={setValue} min={1} max={2} />
      </form>
    )
  }
  renderWithAppProviders(<Example />)
  const input = screen.getByRole('spinbutton', { name: 'Count' })
  expect(decrease()).toBeDisabled()
  fireEvent.click(increase())
  expect(input).toHaveValue(2)
  expect(increase()).toBeDisabled()
  fireEvent.change(input, { target: { value: '7' } })
  expect(input).toHaveValue(7)
  expect(input).toBeInvalid()
  fireEvent.click(decrease())
  expect(input).toHaveValue(2)
  fireEvent.change(input, { target: { value: '' } })
  expect(input).toHaveValue(null)
  fireEvent.click(increase())
  expect(input).toHaveValue(1)
  expect(submit).not.toHaveBeenCalled()
})

it('disables both interactions with the field and respects updated limits', () => {
  const change = vi.fn()
  const { rerender } = renderWithAppProviders(
    <FormNumberField label="Count" value={3} onValueChange={change} disabled max={4} />,
  )
  expect(screen.getByRole('spinbutton')).toBeDisabled()
  expect(increase()).toBeDisabled()
  expect(decrease()).toBeDisabled()
  fireEvent.click(increase())
  expect(change).not.toHaveBeenCalled()
  rerender(<FormNumberField label="Count" value={3} onValueChange={change} max={2} />)
  expect(increase()).toBeDisabled()
  fireEvent.click(decrease())
  expect(change).toHaveBeenCalledWith('2')
})

it('registers counter edits with form dirty tracking and reset', () => {
  function Example() {
    const { control, formState, reset } = useForm({ defaultValues: { count: '0' } })
    return (
      <>
        <ControlledFormNumberField control={control} name="count" label="Count" />
        <output>{String(formState.isDirty)}</output>
        <button onClick={() => reset()}>Reset</button>
      </>
    )
  }
  renderWithAppProviders(<Example />)
  fireEvent.click(increase())
  expect(screen.getByRole('spinbutton')).toHaveValue(1)
  expect(screen.getByRole('status')).toHaveTextContent('true')
  fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
  expect(screen.getByRole('spinbutton')).toHaveValue(0)
  expect(screen.getByRole('status')).toHaveTextContent('false')
})
