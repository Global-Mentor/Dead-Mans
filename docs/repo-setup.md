# Repository Setup & Workflow

This document describes how the repository is configured and how to work in it.
It is the reference for current and future contributors. Keep it up to date when
the setup changes.

## Branching model

Trunk-based development with a single long-lived branch.

- `main` is the only permanent branch. It is always releasable and is protected.
- All work happens on **short-lived branches created off `main`**.
- Merge back into `main` exclusively through a Pull Request.
- Delete the branch after the PR is merged (GitHub does this automatically).

### Branch naming

Use `type/short-description`, matching the commit type:

| Prefix      | Use for                                  |
| ----------- | ---------------------------------------- |
| `feat/`     | New feature                              |
| `fix/`      | Bug fix                                  |
| `chore/`    | Tooling, deps, config, housekeeping      |
| `refactor/` | Code change with no behaviour change     |
| `docs/`     | Documentation only                       |
| `test/`     | Tests only                               |
| `ci/`       | CI / workflow changes                    |

Example: `feat/team-invitations`, `fix/board-cell-race`.

## Daily workflow

```bash
# 1. Start from an up-to-date main
git switch main
git pull

# 2. Create a short-lived branch
git switch -c feat/my-change

# 3. Work, committing in small logical steps
git add -A
git commit -m "feat(game): add team invitation flow"

# 4. Push and open a PR into main
git push -u origin feat/my-change
# Open the PR on GitHub (base: main)

# 5. Wait for green CI + required review, then "Squash and merge".
#    The branch is deleted automatically after merge.
```

Never commit directly to `main` — the branch protection will reject the push.

## `main` branch protection (ruleset)

Enforced via **Settings → Rules → Rulesets** (target: default branch). Active rules:

- **Require a pull request before merging** — no direct pushes to `main`.
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

- **Squash merging only** — merge commits and rebase merging are disabled, so
  `main` stays a clean linear history (one commit per PR).
- **Automatically delete head branches** after merge.
- **Always suggest updating pull request branches**.

## Commit conventions

[Conventional Commits](https://www.conventionalcommits.org/):
`type(scope): summary`.

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`, `build`, `perf`.

With squash merge, the PR title becomes the squashed commit message — write PR
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

- `@dependabot squash and merge` — merge once CI is green.
- `@dependabot rebase` — rebase onto latest `main`.
- `@dependabot close` — close and delete the branch.
- `@dependabot ignore this major version` — skip a specific major.

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
