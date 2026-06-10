# Security Policy

## Supported Versions

Dead-Mans is in early-stage active development. Security fixes are applied to
the `main` branch only. There are no released/maintained older versions yet.

## Reporting a Vulnerability

Please report security issues privately. Do **not** open a public GitHub issue
for a suspected vulnerability.

- Preferred: open a [private security advisory](https://github.com/Ed-lazarenko/Dead-Mans/security/advisories/new).
- Alternatively: email **edi.lazarenko@gmail.com** with a description, reproduction
  steps, and impact.

Please include enough detail to reproduce the issue. If possible, provide a
minimal proof of concept.

## Response Expectations

As a single-maintainer early-stage project, response is best-effort:

- Acknowledgement of your report within a few days.
- An initial assessment and planned remediation once the report is triaged.
- Coordinated disclosure: please give a reasonable window to ship a fix before
  any public disclosure.

## Scope

In scope: the active `frontend/` and `backend/` code, the transport contract
(`backend/openapi/deadmans.v1.yaml`), authentication/authorization flows, and
data retention behavior.

Out of scope: `legacy-v1/` (reference-only, not deployed), and findings that
require physical access or a compromised developer machine.
