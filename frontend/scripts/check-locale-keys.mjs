import fs from 'node:fs/promises'
import path from 'node:path'
import ts from 'typescript'

const localesDir = path.resolve(process.cwd(), 'src/locales')
const localeFiles = ['en.ts', 'ru.ts', 'uk.ts', 'pl.ts']

function flattenKeys(value, prefix = '') {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return [prefix]
  }

  const entries = Object.entries(value)
  if (entries.length === 0) {
    return [prefix]
  }

  const result = []
  for (const [key, nested] of entries) {
    const nextPrefix = prefix ? `${prefix}.${key}` : key
    result.push(...flattenKeys(nested, nextPrefix))
  }

  return result
}

async function loadLocaleObject(filePath) {
  const source = await fs.readFile(filePath, 'utf8')
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText

  const dataUrl = `data:text/javascript;base64,${Buffer.from(transpiled).toString('base64')}`
  const loaded = await import(dataUrl)
  return loaded.default?.translation
}

function describeDiff(base, current) {
  const missing = [...base].filter((key) => !current.has(key))
  const extra = [...current].filter((key) => !base.has(key))
  return { missing, extra }
}

async function main() {
  const keySetsByFile = new Map()

  for (const file of localeFiles) {
    const locale = await loadLocaleObject(path.join(localesDir, file))
    if (!locale || typeof locale !== 'object') {
      throw new Error(`${file}: expected default.translation object`)
    }

    keySetsByFile.set(file, new Set(flattenKeys(locale)))
  }

  const baseline = keySetsByFile.get('en.ts')
  if (!baseline) {
    throw new Error('Missing baseline locale en.ts')
  }

  let hasDifferences = false
  for (const [file, current] of keySetsByFile.entries()) {
    if (file === 'en.ts') {
      continue
    }

    const { missing, extra } = describeDiff(baseline, current)
    if (missing.length === 0 && extra.length === 0) {
      continue
    }

    hasDifferences = true
    console.error(`Locale key mismatch in ${file}`)
    if (missing.length > 0) {
      console.error(`  Missing keys (${missing.length}):`)
      for (const key of missing) {
        console.error(`    - ${key}`)
      }
    }
    if (extra.length > 0) {
      console.error(`  Extra keys (${extra.length}):`)
      for (const key of extra) {
        console.error(`    + ${key}`)
      }
    }
  }

  if (hasDifferences) {
    process.exitCode = 1
    return
  }

  console.log('Locale keys are consistent across en/ru/uk/pl.')
}

await main()
