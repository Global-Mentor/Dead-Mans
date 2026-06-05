# Development Workflow

Единая operational-инструкция для локальной разработки, проверки и синхронизации generated-артефактов.

## Prerequisites

- Docker (Compose support)
- .NET 8 SDK
- Node.js LTS

## First-Time Setup

### Windows (bat wrappers in repo root)

```bat
setup-local.bat
```

### macOS/Linux (or cross-platform PowerShell)

```bash
pwsh backend/scripts/setup-local.ps1
```

`setup-local` поднимает docker-инфраструктуру, применяет миграции и подготавливает тестовые media.

## Daily Development

### Full stack from repo root

```bash
npm install
npm run dev
```

### Windows alternative

```bat
dev-full.bat
```

## Reset Local Data (Destructive)

### Windows

```bat
reset-local.bat
```

### macOS/Linux (or cross-platform PowerShell)

```bash
pwsh backend/scripts/reset-local.ps1
```

## Transport Contract Workflow

Source of truth: `backend/openapi/deadmans.v1.yaml` (HTTP + SignalR in `x-signalr`).

After transport contract changes:

```bash
npm --prefix frontend run generate:transport
```

This regenerates:

- `frontend/src/shared/api/contracts/generated.ts`
- `frontend/src/shared/realtime/generated.ts`

Do not hand-edit generated files.

## Verification Before PR

- Backend tests:
  - `dotnet test backend/backend.slnx`
- Frontend lint/build:
  - `npm --prefix frontend run lint`
  - `npm --prefix frontend run build`
- Generated artifacts are up to date:
  - run `npm --prefix frontend run generate:transport`
  - ensure no unexpected git diff in generated paths
