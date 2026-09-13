import { spawnSync } from 'node:child_process'

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'

const build = spawnSync(npm, ['run', 'build'], { stdio: 'inherit' })
if (build.status !== 0) process.exit(build.status ?? 1)

const test = spawnSync(npx, ['playwright', 'test', 'e2e/ui-performance.spec.ts', '--workers=1'], {
  stdio: 'inherit',
  env: { ...process.env, MEASURE_UI_PERF: '1' },
})
process.exit(test.status ?? 1)
