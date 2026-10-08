# Repository Setup & Workflow

This document describes how the repository is configured and how to work in it.
It is the reference for current and future contributors. Keep it up to date when
the setup changes.

## Branching model

All normal implementation, verification and local startup use the primary checkout
at `D:/Dev/Dead-Mans` on `develop`. This applies even if a tool initially opens
a task in a linked worktree: inspect both copies and preserve existing work before
continuing in the primary checkout.

Do not create or use an additional linked worktree automatically for isolation,
review, fixes or commit preparation. An exceptional worktree requires both an
actual need and an explicit owner instruction. Task-specific branches likewise
require an explicit instruction; never create a `codex/` or other tool-branded
branch automatically.

- `develop` is the owner-designated local working branch. Keep related changes
  in atomic Conventional Commits after review and validation.
- `main` remains the protected release branch on the remote. Local development
  does not change its protection, the remote default branch or deployment settings.
- Publishing `develop`, opening a PR and merging into `main` are separate actions
  that require explicit authorization. A push to `main` runs publication and can
  deploy production.
- Keep local configuration and ignored working materials out of commits. Before
  removing an old working directory, preserve its unique commits, uncommitted
  changes and necessary ignored files, then verify the destination.

## Daily workflow

Use the primary repository folder (on the owner's machine, `D:/Dev/Dead-Mans`):

```bash
git switch develop
git status

# Work and validate, then stage one logical change at a time.
git add path/to/changed-file path/to/related-test
git diff --cached
git commit -m "feat(game): add team invitation flow"

# Only when publication is requested:
git push -u origin develop
# Open a PR with base main; verify CI and review before an authorized merge.
```

If the local `develop` branch does not exist, create it from the reviewed current
base in the primary checkout. Do not reset an existing branch or discard local
work to synchronize it. The remote `main` branch continues to receive changes
through PRs; renaming the local working branch does not rename the remote branch.

## `main` branch protection (ruleset)

Enforced via **Settings → Rules → Rulesets** (target: default branch). Active rules:

- **Require a pull request before merging** - no direct pushes to `main`.
  - 1 approval required.
  - Dismiss stale approvals when new commits are pushed.
  - Require review from Code Owners (`.github/CODEOWNERS`).
- **Require status checks to pass** (and branches up to date):
  - `CI / build`
  - `CI / dependency-audit`
  - `CI / backend-architecture`
  - `CodeQL / Analyze (csharp)`
  - `CodeQL / Analyze (javascript-typescript)`
- **Require conversation resolution** before merging.
- **Require linear history** (pairs with squash merges).
- **Block force pushes** and **restrict deletions** on `main`.

### Solo / admin bypass (temporary)

While there is only one maintainer, a self-opened PR cannot be approved by anyone
else. The ruleset's **Bypass list** includes `Repository admin` with mode
**"For pull requests"**, so the maintainer can merge their own PR without an
approval, while direct/force pushes to `main` stay blocked.

Once a second contributor joins, remove the admin bypass (or keep it only for
emergencies) and rely on real reviews.

## Merge policy

Configured in **Settings → General → Pull Requests**.

- **Squash merging only** - merge commits and rebase merging are disabled, so
  `main` stays a clean linear history (one commit per PR).
- **Automatically delete head branches** after merge.
- **Always suggest updating pull request branches**.

## Commit conventions

[Conventional Commits](https://www.conventionalcommits.org/):
`type(scope): summary`.

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`, `build`, `perf`.

With squash merge, the PR title becomes the squashed commit message - write PR
titles in this format.

### Author identity / email privacy

Commits use the GitHub no-reply email so personal email is never exposed:

```bash
git config --global user.email "<id>+<username>@users.noreply.github.com"
git config --global user.name  "<username>"
```

The account also has **Settings → Emails → Keep my email addresses private**
enabled, plus **Block command line pushes that expose my email**.

## Continuous Integration

Workflows live in `.github/workflows/`. The checks listed under branch
protection above must pass before a PR can be merged. Keep them green; a red
check blocks the merge by design.

## Dependency updates (Dependabot)

Configured in `.github/dependabot.yml`. Key choices:

- Ecosystems: npm (`/frontend`, `/`), NuGet (`/backend`), GitHub Actions (`/`).
- Updates are **grouped** to reduce noise: one PR for grouped minor/patch, a
  separate PR for grouped majors, per ecosystem.
- PRs target the **default branch (`main`)**.
- GitHub Actions checked monthly; everything else weekly.

Manage Dependabot PRs by commenting on them:

- `@dependabot squash and merge` - merge once CI is green.
- `@dependabot rebase` - rebase onto latest `main`.
- `@dependabot close` - close and delete the branch.
- `@dependabot ignore this major version` - skip a specific major.

## Security

In **Settings → Code security**:

- Dependabot **alerts** and **security updates** enabled.
- **Secret scanning** + **push protection** enabled (blocks committing secrets).
- **CodeQL** code scanning enabled (see workflows).

Account: **two-factor authentication** enabled.

## Onboarding a new contributor

1. Grant repository access (Settings → Collaborators, or via a team).
2. Add them to `.github/CODEOWNERS` for the areas they own.
3. Confirm branch-protection approvals are set to `1` and remove the temporary
   admin bypass once real reviews are possible.
4. Point them to this document.
