import fs from 'node:fs/promises'
import path from 'node:path'
import ts from 'typescript'

const sourceDir = path.resolve(process.cwd(), 'src')
const supportedLanguages = ['en', 'ru', 'uk', 'pl']

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
  return loaded.default
}

function describeDiff(base, current) {
  const missing = [...base].filter((key) => !current.has(key))
  const extra = [...current].filter((key) => !base.has(key))
  return { missing, extra }
}

async function findTranslationModules(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const modules = []

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      modules.push(...(await findTranslationModules(entryPath)))
      continue
    }

    if (entry.isFile() && entry.name.endsWith('-translations.ts')) {
      modules.push(entryPath)
    }
  }

  return modules.sort()
}

async function main() {
  const translationModules = await findTranslationModules(sourceDir)
  if (translationModules.length === 0) {
    throw new Error('No feature translation modules found')
  }

  let hasDifferences = false
  for (const modulePath of translationModules) {
    const translations = await loadLocaleObject(modulePath)
    const relativePath = path.relative(process.cwd(), modulePath)
    if (!translations || typeof translations !== 'object') {
      throw new Error(`${relativePath}: expected a default translation object`)
    }

    const keySets = new Map()
    for (const language of supportedLanguages) {
      const locale = translations[language]
      if (!locale || typeof locale !== 'object') {
        throw new Error(`${relativePath}: missing ${language} translation object`)
      }

      keySets.set(language, new Set(flattenKeys(locale)))
    }

    const baseline = keySets.get('en')
    for (const language of supportedLanguages.slice(1)) {
      const current = keySets.get(language)
      const { missing, extra } = describeDiff(baseline, current)
      if (missing.length === 0 && extra.length === 0) {
        continue
      }

      hasDifferences = true
      console.error(`Locale key mismatch in ${relativePath} (${language})`)
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
  }

  if (hasDifferences) {
    process.exitCode = 1
    return
  }

  console.log(
    `Locale keys are consistent across en/ru/uk/pl in ${translationModules.length} feature modules.`,
  )
}

await main()
