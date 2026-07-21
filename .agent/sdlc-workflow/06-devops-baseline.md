# Phase 06: Development Setup (DevOps Baseline)

## Objective
Establish predictable build, test, and deployment pipelines before feature velocity increases.

## E-LearningWebApp Current Implementation
- Status: `Implemented`
- Evidence:
  - CI workflows: `.github/workflows/backend-ci.yml`, `.github/workflows/frontend-ci.yml`, `.github/workflows/playwright.yml`
  - Deployment configs: `railway.toml`, `nixpacks.toml`, `Procfile`
  - Local stack: `docker-compose.yml`

## Core Activities
- Validate repo strategy (monorepo boundaries).
- Enforce CI quality gates:
  - Lint
  - Unit/integration test
  - Build verification
- Define environments:
  - Development
  - Staging
  - Production
- Define secrets management and env conventions.
- Validate Docker and local parity strategy.

## Inputs
- API and architecture artifacts.
- Existing workflows under `.github/workflows/`.

## Deliverables
- CI/CD baseline with mandatory checks.
- Environment matrix and ownership.
- Secrets and rotation policy.
- Staging deployment ready for beta workloads.

## Exit Criteria
- Build and test pass automatically on PR.
- Staging deployment automated and repeatable.
- Env variables documented and validated.

## File Outputs
- `templates/devops-readiness-checklist.md`
