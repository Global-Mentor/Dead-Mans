import assert from 'node:assert/strict'
import { test } from 'node:test'
import ts from 'typescript'
import { inspectUiBoundaries } from './ui-architecture-rules.mjs'
function inspect(file, code) {
  return inspectUiBoundaries(
    ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX),
  )
}
test('rejects consumer slot styling but allows named geometry and ordinary layout', () => {
  assert.equal(
    inspect(
      '/src/features/history/Page.tsx',
      `<AppDialog sx={{ '& .MuiDialogContent-root': { p: 0 } }} />`,
    ).length,
    2,
  )
  assert.equal(
    inspect(
      '/src/features/history/Page.tsx',
      `<AppDialog appearance="preview" contentDensity="compact" sx={{ mt: 1 }} />`,
    ).length,
    0,
  )
})
test('keeps domain dependencies out of generic controls', () => {
  assert.equal(
    inspect(
      '/src/shared/ui/primitives/Metric.tsx',
      `import { score } from '../../../features/game/model'`,
    ).length,
    1,
  )
  assert.equal(
    inspect(
      '/src/shared/ui/primitives/Metric.tsx',
      `import { palette } from '../../../theme/tokens'`,
    ).length,
    0,
  )
  assert.equal(
    inspect('/src/shared/game-ui/Score.tsx', `import type { Score } from '../api/contracts'`)
      .length,
    0,
  )
})

test('prevents unmigrated controls while allowing layout and MUI prop types', () => {
  assert.equal(
    inspect('/src/features/Page.tsx', `import { Box, Button as Action } from '@mui/material'`)
      .length,
    1,
  )
  assert.equal(
    inspect('/src/features/Page.tsx', `import Autocomplete from '@mui/material/Autocomplete'`)
      .length,
    1,
  )
  assert.equal(inspect('/src/features/Page.tsx', `<Box component="button" />`).length, 1)
  assert.equal(
    inspect('/src/features/Page.tsx', `import { Box, type ButtonProps } from '@mui/material'`)
      .length,
    0,
  )
  assert.equal(
    inspect('/src/shared/ui/primitives/AppButton.tsx', `import { Button } from '@mui/material'`)
      .length,
    0,
  )
})

test('closes namespace, re-export, subpath and polymorphic control escapes', () => {
  for (const code of [
    "import * as Mui from '@mui/material'",
    "export { Input as Field } from '@mui/material'",
    "export * from '@mui/material'",
    "import Pagination from '@mui/material/Pagination'",
    "const controls = await import('@mui/material')",
    "<Box component={'input'} />",
    '<Box as="select" />',
    '<details><summary /></details>',
  ])
    assert.ok(inspect('/src/features/Page.tsx', code).length > 0, code)
  assert.equal(
    inspect('/src/shared/ui/Field.tsx', "export { token } from '../../../features/game/model'")
      .length,
    1,
  )
  assert.equal(
    inspect('/src/features/Page.tsx', "import { alpha } from '@mui/material/styles'").length,
    0,
  )
})

test('does not let a container repaint controls, including aliased dialogs', () => {
  assert.ok(
    inspect('/src/features/Page.tsx', `<Box sx={{ '& > button': { backgroundColor: 'red' } }} />`)
      .length,
  )
  assert.equal(
    inspect('/src/features/Page.tsx', `<Box sx={{ '& > button': { flex: 1 } }} />`).length,
    0,
  )
  assert.ok(
    inspect(
      '/src/features/Page.tsx',
      `import { AppDialog as Modal } from '../../shared/ui'; <Modal sx={{ '& .MuiDialogContent-root': { p: 0 } }} />`,
    ).length,
  )
})

test('prevents legacy rounded surfaces returning in features or domain compositions', () => {
  for (const file of ['/src/features/modifiers/Status.tsx', '/src/shared/game-ui/Result.tsx']) {
    assert.ok(inspect(file, `<Box sx={{ borderRadius: '12px' }} />`).length)
    assert.ok(inspect(file, `<Box sx={{ borderRadius: 2 }} />`).length)
    assert.equal(inspect(file, `<ItemCard sx={{ minWidth: 0 }} />`).length, 0)
    assert.equal(inspect(file, `<Box sx={{ borderRadius: '50%' }} />`).length, 0)
  }
})
