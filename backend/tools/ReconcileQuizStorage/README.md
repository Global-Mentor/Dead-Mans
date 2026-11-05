# Screenshot storage reconciliation

Read-only diagnostic for screenshot originals and thumbnails. It never uploads,
changes or deletes objects, runs migrations, or changes database rows. PostgreSQL
enforces a read-only, repeatable-read transaction for the scan.

Provide configuration through the process environment, using credentials obtained
through your normal secret-management workflow. Do not put secrets in command-line
arguments or commit them:

| Variable | Value |
| --- | --- |
| `QUIZ_STORAGE_AUDIT_DATABASE` | Npgsql connection string for the intended database |
| `QUIZ_STORAGE_AUDIT_ENDPOINT` | S3-compatible service endpoint |
| `QUIZ_STORAGE_AUDIT_BUCKET` | Bucket to inventory |
| `QUIZ_STORAGE_AUDIT_ACCESS_KEY` | Read-only storage access key |
| `QUIZ_STORAGE_AUDIT_SECRET_KEY` | Storage secret key |

Use a database account with `SELECT` access and a storage account with only
`ListBucket` access for `quiz/screenshots/` and `quiz/thumbnails/`. Object download
and write access are unnecessary. The command has no default target, does not read
application secrets, and refuses command-line arguments.

From the repository root:

```powershell
dotnet build backend/tools/ReconcileQuizStorage --configuration Release
dotnet run --project backend/tools/ReconcileQuizStorage --configuration Release --no-build --no-restore > quiz-storage-report.json
```

The JSON report contains the bucket, object counts and findings. Exit codes are
`0` for a complete scan without findings, `2` for a complete scan with findings,
and `1` for configuration, access, cancellation or enumeration failure. A failed
scan produces no partial JSON report. Reports contain internal paths and row IDs;
keep them outside version control.

References include `media_assets` in the quiz prefixes and image snapshots from
all catalog questions (including archived/disabled questions), game selections,
quiz sessions (including closed history), and Twitch publications (including
failed delivery). Optional thumbnail paths are references too. The scanner streams
database rows, follows every S3 continuation page, and rejects incomplete or looping
pagination. It retains the reference index and findings in memory.

| Finding | Interpretation |
| --- | --- |
| `missing` | A referenced object was absent from the inventory |
| `empty` | A referenced object exists with zero bytes |
| `unreferenced` | No reference was found in this database snapshot |
| `invalid_snapshot` | A snapshot could not be read reliably; references may be incomplete |
| `outside_scan_scope` | A reference targets another bucket or prefix and was not checked |

**Unreferenced does not mean safe to delete.** The storage listing and database
snapshot cannot be atomic together: an upload may have stored its objects before
committing its transaction. Other deployments may share the bucket, and damaged
snapshots may hide a reference. Pause uploads and repeat the scan before investigating
an apparent orphan; review every database and historical reference before any
separately authorized remediation. Missing objects should be restored from a known
backup of the same object, without rewriting immutable snapshots. An empty findings
list checks existence and nonzero size, not image decoding or content hashes.
