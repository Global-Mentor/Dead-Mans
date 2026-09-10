# Dead Mans

Dead Mans is a browser application for running game events with a Twitch community. A host prepares the board, gathers teams, runs rounds and quizzes, applies game modifiers, and keeps the final results. Players sign in with Twitch and see the game update in real time.

The project is under active development and is being prepared for its first public release.

## What it can do

1. Build a game board and manage teams.
2. Run rounds and quizzes.
3. Apply modifiers while preserving the rules used in each game.
4. Keep every connected player up to date through SignalR.
5. Sign users in with Twitch and manage access levels.
6. Store game results and uploaded images.

## Technology

The frontend uses React and TypeScript. The backend runs on ASP.NET Core and .NET 10. PostgreSQL stores application data, while an S3 compatible service stores images. The API contract is described with OpenAPI.

## Local development on Windows

You will need Docker Desktop, the .NET 10 SDK, and Node.js 22.

Prepare PostgreSQL, MinIO, database migrations, and local test data:

```text
setup-local.bat
```

Start the backend and frontend:

```text
dev-full.bat
```

The application will be available at <http://localhost:5180>. The API will be available at <http://localhost:5285>.

Use `dev-backend.bat` or `dev-frontend.bat` when you want to run only one part of the project. Run `dev-stop.bat` to stop the local services.

## Project layout

Application code lives in `frontend` and `backend`. General documentation is in `docs`. Production configuration and deployment tools are in `deploy`.

Read [`docs/development.md`](docs/development.md) for the development workflow, [`docs/architecture/overview.md`](docs/architecture/overview.md) for the application structure, and [`deploy/README.md`](deploy/README.md) for production deployment.

Please follow [`SECURITY.md`](SECURITY.md) if you find a security problem.
