# Request for Proposal (RFP)
## Supply, Customization, Deployment, Training, and Maintenance of a Multi-Tenant School Learning Management & ERP Platform for Government Schools

**RFP Reference No.:** _____ /SW-LMS/2082-83
**Issuing Authority:** [Ministry of Education / Centre for Education and Human Resource Development (CEHRD) / District Education Office / Local Government — *insert procuring entity*]
**Procurement Method:** Open Competitive Bidding — Quality and Cost Based Selection (QCBS)
**Issue Date:** [Date]
**Proposal Submission Deadline:** [Date, Time]
**Validity of Proposal:** 90 days from submission deadline

> **Assumptions & adaptability note (from the Technical Officer):** This RFP is drafted for a Nepal government-school context (Bikram Sambat calendar, Nepali language, eSewa/Khalti/ConnectIPS payments, IRD/PAN-aligned receipts, IEMIS alignment, low-connectivity rural sites). Where a clause is jurisdiction-specific it is marked **[ADAPT]**. Procuring entities outside this context should substitute their public-procurement act, data-protection law, and national EMIS accordingly. Quantities in `[ ]` (number of schools, users, budget ceiling) must be set by the procuring entity before publication.

---

## 1. Introduction and Background

### 1.1 Purpose
The [Procuring Entity] intends to procure a secure, scalable, cloud-hosted, **multi-tenant Learning Management System (LMS) and School ERP platform** to digitize academic and administrative operations across **[N]** government schools, serving an estimated **[X] students, [Y] teachers/staff, and [Z] parents/guardians**. This RFP invites sealed Technical and Financial Proposals from eligible firms.

### 1.2 Objectives
1. Provide every government school a standardized digital platform for teaching-learning, assessment, attendance, and reporting.
2. Improve learning outcomes through structured digital content and (optionally) AI-assisted tutoring and analytics.
3. Strengthen administration: admissions, student records, examinations, results, fee/finance, HR/payroll, library, transport, hostel.
4. Enable data-driven decision-making at school, local-government, district, and central levels.
5. Ensure interoperability with national systems (e.g., **IEMIS** **[ADAPT]**) and standard data exchange.
6. Guarantee the **protection of children's personal data** and equitable access in low-connectivity environments.

### 1.3 Scope Summary
Supply (license/SaaS), configuration and customization, data migration, integration, hosting (or deployment to government cloud), capacity building/training, rollout across schools, and **[3–5] years** of warranty, support, and maintenance.

---

## 2. Definitions and Tenancy Model

- **Tenant:** An individual school with logically isolated data. The platform is **multi-tenant (schema/namespace isolation per school)**; one school's data MUST never be accessible to another.
- **Roles:** Central/Super Administrator (Ministry/District), School Administrator, Staff, Teacher, Student, Parent/Guardian.
- **Tenant hierarchy [ADAPT]:** Central → Province → District/Local Government → School. Administrative dashboards must aggregate upward without exposing cross-school personal data to unauthorized roles.

---

## 3. Scope of Work — Functional Requirements

Bidders must complete the **Compliance Matrix (Annex C)** marking each requirement **Comply (out-of-box) / Configurable / Customization required / Not available**, with version/notes.

### 3.1 Identity, Access & Multi-Tenancy
- Role-based access control for all roles above; least-privilege enforcement.
- Per-school tenant isolation with verifiable controls (no cross-tenant read/write).
- Single sign-on readiness; **multi-factor authentication (MFA)** for administrative roles.
- Account lifecycle: creation, bulk import, deactivation, password reset/recovery, lockout on brute force.
- Central-admin provisioning of new schools (tenants) and school administrators.

### 3.2 Academic Management
- Academic year and **Bikram Sambat (BS) calendar** support **[ADAPT]**, with AD↔BS conversion.
- Classes, sections, subjects, and subject-teacher assignment.
- Lessons, chapters, learning materials (documents, video links, images) with curriculum tagging (NEB/local curriculum **[ADAPT]**).
- Timetable/scheduling and exam seating.
- Attendance (per class/subject/day) with analytics and parent notification.
- Assessments/quizzes/exams: creation, scheduling, question banks, submissions, grading.
- Results & report cards: marks entry, grade computation, publication workflow, printable transcripts.
- Admissions, student profiles, health & document records, student leave, promotion/year-rollover.

### 3.3 Teaching-Learning & (Optional) AI Features
- Digital content delivery and assignment workflows.
- **AI-assisted features (optional lot — see §3.12):** grounded AI tutor (retrieval over school's own approved content), learning-path generation, at-risk-student analytics, auto quiz/exam generation, lesson summarization, study planner, progress-report generation, assisted grading.
- All AI features MUST: operate only on approved curricular content; **redact personally identifiable information (PII) before any data leaves the platform's infrastructure**; provide configurable cost/usage controls; and be **disableable per school**.

### 3.4 Communication & Engagement
- Secure in-app messaging (teacher↔student↔parent) with school-scoped, audited threads.
- Notices/announcements with role/section targeting.
- Notifications via in-app, **email, SMS, and mobile push**; delivery/read tracking.
- Real-time updates (live notifications, tutor streaming) where applicable.
- Gamification (points, badges, leaderboards) — configurable/optional.

### 3.5 Examination & Evaluation
- Internal and terminal examination management aligned to national grading **[ADAPT]**.
- Result-publication controls with audit and rollback.
- Analytics: subject/section/school performance, trends, at-risk identification.

### 3.6 Library Management
- Catalogue, categorization, search; issue/return; member records; overdue tracking.

### 3.7 Finance & Fee Management
- Fee heads/structures, student fee ledgers, partial/scheduled payments, discounts, late fees.
- **Online payment gateways: eSewa, Khalti, ConnectIPS** **[ADAPT]** with server-side payment verification and idempotent reconciliation.
- Receipts and tax-compliant invoicing (**IRD/PAN/VAT-aligned, BS-dated**) **[ADAPT]**.
- Double-entry ledger / chart of accounts, journal entries, fund accounting, TDS, inventory, depreciation, financial reports.
- Subscription/plan management for central oversight of school entitlements.

### 3.8 Human Resources & Payroll
- Staff records, attendance, leave, payroll runs, statutory deductions **[ADAPT]**.

### 3.9 Transport & Hostel
- Route/vehicle management, student-route assignment; hostel allocation and records.

### 3.10 Projects / Co-curricular
- Group/individual project tracking, tasks, submissions, rubric-based evaluation (feature-gated per school).

### 3.11 Reporting & Dashboards
- Role-specific dashboards (student/teacher/parent/school-admin/central).
- Central/district analytics aggregating across schools **without** exposing individual children's PII to unauthorized roles.
- Exportable reports (PDF/Excel/CSV) and scheduled report generation.
- **National EMIS/IEMIS data export** in the prescribed format **[ADAPT]**.

### 3.12 Lots / Optional Components
- **Lot 1 (Core):** Identity, Academic, Communication, Examination, Reporting, Mobile app.
- **Lot 2 (ERP):** Finance/Fees, HR/Payroll, Library, Transport, Hostel.
- **Lot 3 (AI/Analytics — optional):** AI tutor, analytics, auto-generation, assisted grading.
Bidders may bid for all lots or as specified; pricing must be **itemized per lot**.

---

## 4. Technical Requirements

### 4.1 Architecture
- Web application accessible on modern browsers (Chrome, Edge, Firefox, Safari — current and prior major version).
- **Native/cross-platform mobile application (Android and iOS)** for students, teachers, and parents.
- Service-oriented/API-first design with documented REST APIs (OpenAPI/Swagger) for integration.
- Asynchronous processing for heavy/long-running jobs; real-time channel (WebSocket) for live features.

### 4.2 Localization & Accessibility
- **Nepali (Devanagari, Unicode) and English** UI, with language toggle **[ADAPT]**.
- **Bikram Sambat calendar** throughout, with AD conversion **[ADAPT]**.
- **WCAG 2.1 Level AA** accessibility compliance.
- Mobile-responsive UI; usable on low-cost Android devices.

### 4.3 Low-Connectivity / Resilience (critical for rural government schools)
- Graceful degradation on slow/intermittent connections; lightweight payloads.
- Offline/queued capability for high-value flows (e.g., attendance capture) where feasible — bidder to describe approach.
- Resilience to backend component outages (queue fallback, retries).

### 4.4 Performance & Scalability
- Support **[X] concurrent users** at peak (e.g., result-publication, exam windows) with API p95 latency ≤ **800 ms** for standard transactions **[ADAPT to baseline]**.
- Horizontal scalability to onboard **[N]→[N×]** schools without re-architecture; multi-tenant noisy-neighbor isolation.
- Stated capacity test results to be submitted; load test to be witnessed during evaluation/UAT.

### 4.5 Availability & Continuity
- **≥ 99.5% monthly uptime** for production (excluding agreed maintenance windows).
- Automated **daily backups**, point-in-time recovery; documented **RPO ≤ 24h, RTO ≤ 4h** **[ADAPT]**.
- Disaster-recovery plan and at least one geographically separate backup location.

### 4.6 Hosting & Data Residency
- **Data residency:** All personal data of children and staff MUST be stored within **[Nepal / Government Cloud — ADAPT]** unless the procuring entity grants written exception. State hosting model clearly (Government Integrated Data Centre / approved cloud).
- If SaaS/public-cloud is proposed, describe region, sub-processors, and compliance posture.
- Clear separation of production, staging, and test environments.

### 4.7 Integrations
- Payment gateways (§3.7), Email service, SMS gateway **[ADAPT to approved provider]**, mobile push.
- National EMIS/IEMIS export/sync **[ADAPT]**.
- Optional: national ID/registration, biometric/attendance devices — bidder to state capability.

---

## 5. Security, Privacy & Compliance

The platform serves **minors**; child-data protection is a primary, non-negotiable evaluation criterion.

### 5.1 Mandatory Security Controls
- Encryption **in transit (TLS 1.2+)** and **at rest**.
- Verifiable **tenant data isolation** (cross-tenant access tests to be demonstrated during UAT).
- Secure authentication: hashed credentials, MFA for admins, session/token controls, brute-force lockout.
- Role/function/object-level authorization; no unauthenticated access to personal data.
- Server-side verification of all payment callbacks; idempotent, tamper-resistant transaction recording.
- Audit logging of sensitive actions (logins, data changes, result publication, password resets, financial transactions) — immutable and exportable.
- Rate limiting/throttling on public and authentication endpoints.
- PII minimization in logs and in any third-party/AI processing.
- Secure file-upload validation (type/size/scan).
- Documented secret management; no credentials in source.

### 5.2 Data Protection & Privacy
- Compliance with applicable data-protection law **[ADAPT — e.g., Privacy Act 2075, Children's Act 2075]**, including consent, purpose limitation, retention, and minors' protections.
- Data subject rights: access, correction, and deletion workflows respecting tenant boundaries.
- Documented data-retention and secure-disposal policy.
- Data Processing Agreement (DPA) and confidentiality undertaking required from the awarded vendor.

### 5.3 Assurance
- Bidder to submit secure-development practices, vulnerability-management process, and any third-party security audit / penetration-test reports (within last 24 months).
- Procuring entity reserves the right to conduct/commission an independent security assessment before go-live and periodically thereafter.
- Source-code **escrow** for custom components (see §10.4).

---

## 6. Implementation, Migration & Rollout

### 6.1 Phased Implementation
| Phase | Deliverables | Indicative Timeline |
|---|---|---|
| 0. Inception | Project plan, governance, requirement sign-off, environment setup | Weeks 1–3 |
| 1. Configuration & Customization | Tenant model, roles, localization (Nepali/BS), branding, workflows | Weeks 4–10 |
| 2. Integrations | Payments, SMS/email/push, EMIS export | Weeks 8–12 |
| 3. Data Migration | Student/staff/academic data import, validation | Weeks 10–14 |
| 4. Pilot | Deploy to **[5–10] pilot schools**, UAT, security test, load test | Weeks 14–20 |
| 5. Phased Rollout | Onboard remaining schools in batches with training | Weeks 20–40 |
| 6. Go-Live & Stabilization | Full production, hypercare | Weeks 40–44 |

(*Timelines indicative; bidder to propose a detailed plan with milestones and dependencies.*)

### 6.2 Data Migration
- Bidder to provide migration tools, templates, validation reports, and rollback procedures. Migration accuracy ≥ **99.9%** with reconciliation sign-off.

### 6.3 Acceptance Criteria
- Written UAT sign-off per phase; security and load tests passed; documentation delivered. Final acceptance upon successful go-live and stabilization across the agreed school cohort.

---

## 7. Training, Documentation & Change Management
- Role-based training (administrators, teachers, finance/HR staff) — in-person and/or online, in **Nepali** **[ADAPT]**.
- **Train-the-Trainer** program for sustainability; minimum **[N]** master trainers.
- User manuals, quick-start guides, video tutorials, and an in-app help/knowledge base.
- Administrator and API/technical documentation; runbooks for operations.

---

## 8. Support, Warranty & Maintenance (SLA)

### 8.1 Warranty & Term
- **[3–5] years** of post-go-live support, warranty, and maintenance, including all defect fixes, security patches, and minor enhancements at no extra cost.

### 8.2 Support Levels & Response/Resolution Targets
| Severity | Definition | Response | Resolution |
|---|---|---|---|
| S1 — Critical | System/login down, data breach, payment failure, data loss | ≤ 1 hour | ≤ 4 hours |
| S2 — Major | Core function broken, no workaround | ≤ 4 hours | ≤ 1 business day |
| S3 — Minor | Function impaired, workaround exists | ≤ 1 business day | ≤ 5 business days |
| S4 — Low | Cosmetic / query | ≤ 2 business days | Next release |

- Helpdesk (phone/email/portal) during **[hours]**; escalation matrix required.
- **Service credits / penalties** for SLA breaches (see §9.4).
- Quarterly patching; emergency security patches within **[72h]** of disclosure.

---

## 9. Commercial Terms

### 9.1 Pricing Structure (itemize in Annex D — Financial Proposal)
- One-time: customization, integration, data migration, training.
- Recurring: licensing/SaaS subscription **per-school or per-active-user**, hosting, support/maintenance (annual).
- Optional: AI/analytics lot priced separately (with transparent usage/cost-control model).
- Pricing inclusive of all taxes **[ADAPT — VAT]**; in **NPR** **[ADAPT]**.

### 9.2 Payment Schedule (milestone-linked, indicative)
- 10% on contract signing (against performance bond), 20% on configuration acceptance, 20% on pilot acceptance, 20% on full rollout, 10% on final acceptance, remaining as periodic support fees over the term.

### 9.3 Bonds & Guarantees
- **Bid security/EMD:** [amount/percent].
- **Performance bond:** **[5–10]%** of contract value, valid through warranty.

### 9.4 Penalties / Liquidated Damages
- LD for delay: **[0.05]% per day** up to a cap of **[10]%**; SLA-based service credits for uptime/response breaches.

---

## 10. Legal, IP & Exit

### 10.1 Intellectual Property & Licensing
- Government retains ownership of **all data**. Bidder to specify license terms for platform and any bespoke customizations (preference for the customizations to be owned/perpetually licensed to the procuring entity).

### 10.2 Confidentiality & DPA
- Mandatory NDA and Data Processing Agreement; sub-processor disclosure and approval.

### 10.3 Exit & Data Portability
- On termination/expiry: full export of all data in open, documented formats (CSV/JSON/SQL) at no extra cost; assisted transition; secure deletion certification.
- No vendor lock-in via proprietary, undocumented formats.

### 10.4 Source-Code Escrow
- Custom/bespoke source code and build instructions deposited with an agreed escrow agent, releasable on defined trigger events (vendor insolvency, sustained SLA failure, abandonment).

### 10.5 Compliance
- Compliance with **Public Procurement Act 2063 & Regulations 2064 / PPMO directives** **[ADAPT]** and all applicable laws.

---

## 11. Eligibility & Qualification Criteria

Bidders MUST submit documentary evidence for each:

### 11.1 Legal & Financial
- Legally registered firm; valid registration, **PAN/VAT**, and tax-clearance **[ADAPT]**.
- Average annual turnover ≥ **[amount]** over the last **3** fiscal years; audited financials.

### 11.2 Technical & Experience
- Minimum **[3–5] years** delivering comparable web+mobile education/enterprise software.
- At least **[2]** reference deployments of multi-tenant/multi-site systems (preferably education sector), with contactable references; one of comparable scale (**[N]+** institutions or **[X]+** users) preferred.
- Demonstrated multi-tenant data-isolation capability and security practices.
- Experience with **localization (Nepali/BS calendar)** and local payment gateways **[ADAPT]** is an advantage.

### 11.3 Team & Capacity
- Key personnel with CVs: Project Manager (PMP/PRINCE2 preferred), Solution/Technical Architect, Security Lead, Senior Developers, QA Lead, Training Lead, Support Lead.
- In-country presence/support capability **[ADAPT]**.

### 11.4 Mandatory Demonstration
- Shortlisted bidders must provide a **live demonstration** and **time-boxed access to a sandbox** for hands-on evaluation, including a multi-tenant isolation demonstration.

---

## 12. Proposal Submission Requirements

### 12.1 Two-Envelope System
Submit **Technical Proposal** and **Financial Proposal** as separate sealed envelopes (or as required by the e-GP system **[ADAPT]**).

### 12.2 Technical Proposal — Contents
1. Cover letter & bid forms.
2. Eligibility evidence (§11).
3. Understanding of requirements & proposed solution.
4. **Completed Compliance Matrix (Annex C).**
5. Solution architecture, security & data-protection approach, hosting/data-residency plan.
6. Localization, accessibility, and low-connectivity approach.
7. Implementation plan, methodology, project schedule, risk plan.
8. Data-migration approach; training & change-management plan.
9. Support/SLA model and team CVs.
10. References & past performance; certifications (ISO 27001 / SOC 2 if any).
11. Mandatory undertakings (DPA, confidentiality, escrow willingness).

### 12.3 Financial Proposal — Contents
- Completed **Bill of Quantities / price schedule (Annex D)**, itemized per §9.1 and per lot, all-inclusive, in NPR **[ADAPT]**, with 5-year **Total Cost of Ownership (TCO)** summary.

### 12.4 Format & Channel
- [PDF via e-GP portal / sealed hard copies] **[ADAPT]**; page limits and forms per Annex A. Late submissions rejected.

---

## 13. Evaluation Methodology — QCBS

### 13.1 Stages
1. **Preliminary/Eligibility check** (pass/fail) — completeness, eligibility, bonds.
2. **Technical evaluation** (scored; **minimum qualifying score 70/100**).
3. **Financial evaluation** (only for technically qualified bidders).
4. **Combined score:** **Technical 70% : Financial 30%** **[ADAPT weighting]**. Lowest evaluated price gets full financial marks; others pro-rated.

### 13.2 Technical Scoring (100 points)
| Criterion | Weight |
|---|---|
| Functional fit & compliance matrix coverage | 20 |
| Security, data protection (minors), tenant isolation | 18 |
| Architecture, scalability, performance, availability | 12 |
| Localization (Nepali/BS), accessibility, low-connectivity | 10 |
| Implementation methodology, plan & risk management | 10 |
| Data migration & integration approach | 8 |
| Support/SLA, warranty & maintenance | 7 |
| Firm experience & reference deployments | 8 |
| Team qualifications | 5 |
| Live demonstration / sandbox evaluation | 12 |
| **Total** | **120 → normalized to 100** |

*(Procuring entity to finalize/normalize weights before publication.)*

---

## 14. Procurement Timeline (indicative)
| Activity | Date |
|---|---|
| RFP publication | [ ] |
| Pre-bid meeting / clarifications | [ ] |
| Deadline for queries | [ ] |
| Proposal submission deadline | [ ] |
| Technical opening | [ ] |
| Demonstrations | [ ] |
| Financial opening (qualified bidders) | [ ] |
| Award notification | [ ] |
| Contract signing | [ ] |

---

## 15. Terms & Conditions for Bidders
- The procuring entity reserves the right to accept/reject any or all proposals without assigning reasons, and to cancel the process at any stage, per applicable law.
- Conditional, incomplete, or non-compliant proposals may be rejected.
- Costs of proposal preparation are borne by bidders.
- Conflict of interest and anti-corruption declarations required.
- Clarifications only in writing through the official channel; no oral commitments are binding.

---

## Annexes
- **Annex A:** Bid forms, formats, and submission checklist.
- **Annex B:** Detailed functional & technical specifications (expanded §3–§5).
- **Annex C:** Requirements Compliance Matrix (Req ID | Requirement | Comply/Configurable/Custom/Not available | Version | Notes).
- **Annex D:** Financial Proposal / Bill of Quantities template (per lot, one-time + recurring, 5-year TCO).
- **Annex E:** Draft Contract, SLA, Data Processing Agreement, and Escrow Agreement.
- **Annex F:** List of schools / rollout cohorts and indicative volumetrics **[ADAPT]**.
- **Annex G:** Security & data-protection questionnaire.

---

*Prepared by the Technical Officer (Software Procurement). Bracketed `[ ]` and `[ADAPT]` items must be completed/localized by the procuring entity and cleared by legal and procurement authorities before publication.*
