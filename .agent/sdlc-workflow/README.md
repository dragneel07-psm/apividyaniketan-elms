# SDLC Workflow Playbook
## SaaS Delivery System for E-Learning WebApp

**Purpose:** Provide a professional, repeatable, stepwise workflow from idea to production scale for this LMS/ERP SaaS.

This folder is the execution guide for product, design, engineering, QA, and operations.

## Start Here (Project-Real Version)
- SDLC as implemented in this repository:
  - `project-sdlc-as-implemented.md`
- Real architecture and technology in use:
  - `project-design-used.md`
- Real database model and ERD in use:
  - `database-design-used.md`
- Detailed ER diagrams (module-wise):
  - `database-er-diagrams.md`

## Lifecycle Overview
| Phase | Name | Primary Owners | Key Output |
|---|---|---|---|
| 01 | Discovery and Problem Definition | Product, Founders | PRD, personas, KPIs |
| 02 | MVP Scope and Roadmap | Product, Engineering | MVP scope, milestones, risk register |
| 03 | System Architecture and Tech Decisions | Engineering Leadership | Architecture diagram, ADRs |
| 04 | UX/UI Design | Product Design | Wireframes, prototype, design rules |
| 05 | Data Model and API Contract | Backend, Platform | ERD, API contract, storage strategy |
| 06 | DevOps Baseline | Platform Engineering | CI/CD baseline, environments, secrets model |
| 07 | Agile Implementation | Engineering | Sprint increments |
| 08 | Testing and Quality | QA + Engineering | Automated suites and coverage targets |
| 09 | Security and Compliance Hardening | Security + Platform | Security checklist, incident response plan |
| 10 | Beta Launch (Pilot Schools) | Product + Customer Success | Pilot validation report |
| 11 | Production Launch | Product + Engineering + Support | Launch runbook, support workflow, DR readiness |
| 12 | Scale and Optimize | Engineering + Data + CS | Scale roadmap and performance plan |

## Latest Implemented Improvements (March 2026)
- Promotion Exception Center shipped for admin review and bulk decisions.
- Mandatory `decision_reason` + full decision history audit trail added.
- Results publish now locks promotion edits until explicit admin reopen.
- Reopen results endpoint added with actor/reason/time audit logging.
- Exception review UI improved with search and pagination.

## Folder Structure
```text
.agent/sdlc-workflow/
├── README.md
├── project-sdlc-as-implemented.md
├── project-design-used.md
├── database-design-used.md
├── database-er-diagrams.md
├── 01-discovery-problem-definition.md
├── 02-mvp-scope-and-roadmap.md
├── 03-system-architecture-and-tech-decisions.md
├── 04-ux-ui-design.md
├── 05-data-model-and-api-contract.md
├── 06-devops-baseline.md
├── 07-implementation-agile-sprints.md
├── 08-testing-and-quality.md
├── 09-security-and-compliance-hardening.md
├── 10-beta-launch-pilot-schools.md
├── 11-production-launch.md
├── 12-scale-and-optimize.md
├── templates/
└── checklists/
```

## How to Use This Workflow
1. Start each new product initiative by cloning the templates from `templates/`.
2. Complete each phase document in order and attach evidence links.
3. Do not move to next phase unless exit criteria are met.
4. Track gaps in sprint backlog and risk register.
5. Review this playbook every quarter and update process improvements.

## Stage Gate Policy
- `Gate A` (after Phase 02): MVP scope signed off.
- `Gate B` (after Phase 05): Design + data + API contracts frozen for sprint execution.
- `Gate C` (after Phase 09): Security hardening complete for beta.
- `Gate D` (after Phase 11): Launch readiness approved.

## Existing Project Assets to Reuse
- Discovery artifacts: `.agent/product-discovery/`
- Planning artifacts: `.agent/planning/`
- Architecture artifacts: `.agent/architecture/`
- Delivery board setup: `.agent/project-management/project-board-setup.md`
