import fs from 'node:fs/promises'
import path from 'node:path'
import ts from 'typescript'

const root = process.cwd()
const sourceRoot = path.join(root, 'src')
const findings = []

function propertyName(node) {
  if (!node?.name) return null
  if (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) return node.name.text
  return null
}

function objectProperty(object, name) {
  if (!object || !ts.isObjectLiteralExpression(object)) return null
  return object.properties.find(
    (property) => ts.isPropertyAssignment(property) && propertyName(property) === name,
  )
}

function report(sourceFile, node, message) {
  const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
  findings.push(
    `${path.relative(root, sourceFile.fileName)}:${position.line + 1}:${position.character + 1} ${message}`,
  )
}

function inspectJsx(sourceFile, node) {
  if (!ts.isJsxOpeningElement(node) && !ts.isJsxSelfClosingElement(node)) return
  const tag = node.tagName.getText(sourceFile)
  const attributes = node.attributes.properties.filter(ts.isJsxAttribute)

  if (tag === 'SectionCard') {
    for (const attribute of attributes) {
      if (['inset', 'variantStyle'].includes(attribute.name.text)) {
        report(
          sourceFile,
          attribute,
          `legacy SectionCard prop "${attribute.name.text}" is not allowed`,
        )
      }
    }
  }

  if (tag === 'AppDialog') {
    const paperOverride = attributes.find((attribute) => attribute.name.text === 'PaperProps')
    if (paperOverride) {
      report(
        sourceFile,
        paperOverride,
        'AppDialog consumers must choose an appearance instead of restyling its Paper slot',
      )
    }
  }
}

function inspectThemeBoundaries(sourceFile) {
  if (!sourceFile.fileName.endsWith(path.join('app', 'theme', 'component-overrides.ts'))) return

  function visit(node) {
    if (ts.isPropertyAssignment(node) && propertyName(node) === 'MuiPaper') {
      const styleOverrides = objectProperty(node.initializer, 'styleOverrides')
      const rootProperty = objectProperty(styleOverrides?.initializer, 'root')
      for (const property of rootProperty?.initializer.properties ?? []) {
        if (
          ts.isPropertyAssignment(property) &&
          ['backgroundImage', 'backgroundSize'].includes(propertyName(property) ?? '')
        ) {
          report(
            sourceFile,
            property,
            'global MuiPaper must not own decorative textures; choose a semantic surface',
          )
        }
      }
    }

    if (ts.isPropertyAssignment(node) && propertyName(node) === 'MuiSnackbar') {
      function inspectSnackbar(descendant) {
        if (ts.isStringLiteral(descendant) && descendant.text.includes('.MuiPaper-root')) {
          report(
            sourceFile,
            descendant,
            'MuiSnackbar must style its own content instead of every descendant Paper',
          )
        }
        ts.forEachChild(descendant, inspectSnackbar)
      }
      inspectSnackbar(node.initializer)
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
}

function inspectDialogBoundary(sourceFile) {
  if (!sourceFile.fileName.endsWith(path.join('shared', 'ui', 'feedback', 'AppDialog.tsx'))) return

  function visit(node) {
    if (ts.isStringLiteral(node) && node.text.includes('.MuiButton')) {
      report(sourceFile, node, 'AppDialog must not change the visual design of descendant buttons')
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
}

async function sourceFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const result = []

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) result.push(...(await sourceFiles(entryPath)))
    else if (entry.isFile() && /\.tsx?$/.test(entry.name) && !entry.name.includes('.test.')) {
      result.push(entryPath)
    }
  }

  return result
}

for (const file of await sourceFiles(sourceRoot)) {
  const text = await fs.readFile(file, 'utf8')
  const sourceFile = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )

  function visit(node) {
    inspectJsx(sourceFile, node)
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  inspectThemeBoundaries(sourceFile)
  inspectDialogBoundary(sourceFile)
}

if (findings.length > 0) {
  console.error(`UI architecture check found ${findings.length} violation(s):`)
  for (const finding of findings) console.error(`- ${finding}`)
  process.exitCode = 1
} else {
  console.log('UI architecture boundaries are intact.')
}
