import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, isAbsolute } from 'node:path';

const image = process.argv[2];
assert.ok(image, 'Usage: node deploy/verify-runtime-diagnostics.mjs <built-image>');
const prefix = `deadmans-diagnostics-test-${randomUUID()}`;
const volume = `${prefix}-data`;
const containers = [];
const directory = mkdtempSync(join(tmpdir(), 'deadmans-diagnostics-'));
const passwordMarker = `private-${randomUUID()}`;

function docker(args, { allowFailure = false } = {}) {
  const result = spawnSync('docker', args, {
    encoding: 'utf8',
    timeout: 30_000,
    maxBuffer: 2 * 1024 * 1024,
  });
  if (!allowFailure) {
    assert.ifError(result.error);
    assert.equal(result.status, 0, `docker ${args[0]} failed: ${result.stderr}`);
  }
  return result.stdout?.trim() ?? '';
}

try {
  docker(['volume', 'create', '--label', 'deadmans.test=runtime-diagnostics', volume]);
  for (let index = 0; index < 3; index += 1) {
    const name = `${prefix}-${index}`;
    containers.push(name);
    docker([
      'create', '--name', name, '--network', 'none',
      '--mount', `type=volume,source=${volume},target=/var/lib/deadmans/diagnostics`,
      '-e', `ConnectionStrings__DefaultConnection=Host=unreachable.invalid;Database=test;Username=test;Password=${passwordMarker};SSL Mode=Disable`,
      '-e', 'Serilog__WriteTo__1__Args__fileSizeLimitBytes=256',
      '-e', 'Serilog__WriteTo__1__Args__retainedFileCountLimit=3',
      image,
    ]);
    docker(['start', name]);
    const exitCode = Number(docker(['wait', name]));
    assert.ok(exitCode > 0, 'Invalid production TLS configuration must fail startup');
    docker(['cp', `${name}:/var/lib/deadmans/diagnostics/.`, directory]);
    const names = readdirSync(directory);
    const logs = names.filter((file) => file.endsWith('.clef'));
    assert.ok(logs.length > 0, 'Startup failure must leave a persistent log');
    const records = logs.flatMap((file) => readFileSync(join(directory, file), 'utf8')
      .trim().split('\n').filter(Boolean).map((line) => JSON.parse(line)));
    assert.ok(records.some((record) => record['@l'] === 'Fatal'
      && record['@x']?.includes('SSL Mode=VerifyFull')),
    'Configuration failures before host.Build must be logged');
    assert.ok(records.every((record) => record.ReleaseSha && record.InstanceId && record.ProcessId),
      'Logs must identify the release and process instance');
    assert.ok(!JSON.stringify(records).includes(passwordMarker), 'Connection credentials leaked into logs');
    const reportName = 'last-crash.crashreport.json';
    assert.ok(names.includes(reportName), 'The runtime must save its crash report');
    assert.ok(names.every((file) => file.endsWith('.clef') || file === reportName),
      'Unexpected diagnostic files: full memory dumps must remain disabled');
    const report = JSON.parse(readFileSync(join(directory, reportName), 'utf8'));
    assert.ok(report.payload.threads.some((thread) => thread.crashed === 'true'),
      'Crash report must identify the crashing thread');
    if (index === 2) {
      // Inspect the volume afresh: docker cp does not delete locally copied older rolls.
      const freshDirectory = mkdtempSync(join(directory, 'final-'));
      docker(['cp', `${name}:/var/lib/deadmans/diagnostics/.`, freshDirectory]);
      const finalLogs = readdirSync(freshDirectory).filter((file) => file.endsWith('.clef'));
      assert.equal(finalLogs.length, 3, 'Rolling retention must keep exactly the latest three test files');
      assert.ok(finalLogs.some((file) => /_\d+\.clef$/.test(file)), 'Size-based rolling did not occur');
      const finalRecords = finalLogs.flatMap((file) => readFileSync(join(freshDirectory, file), 'utf8')
        .trim().split('\n').filter(Boolean).map((line) => JSON.parse(line)));
      assert.ok(new Set(finalRecords.map((record) => record.InstanceId)).size > 1,
        'Logs must survive container replacement on the same volume');
    }
  }
  console.log('Runtime diagnostics passed: startup failures, crash reports, bounded rolling and container replacement.');
} finally {
  for (const name of containers) docker(['rm', '-f', '-v', name], { allowFailure: true });
  docker(['volume', 'rm', volume], { allowFailure: true });
  const temporaryRelativePath = relative(tmpdir(), directory);
  assert.ok(temporaryRelativePath && !temporaryRelativePath.startsWith('..') && !isAbsolute(temporaryRelativePath));
  rmSync(directory, { recursive: true, force: true });
}
