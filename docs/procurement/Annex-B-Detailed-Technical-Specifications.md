# Annex B — Detailed Functional & Technical Specifications
### (Companion to the Central/Ministry RFP — expands RFP §3–§5)

**RFP Reference No.:** _____ /SW-LMS/2082-83

> Specifications are stated as **required capabilities, standards, and architectural qualities** (outcome-based), not as a mandated product or technology stack, to preserve competition. Where a specific protocol/standard is named it is a minimum interoperability requirement. `[ADAPT]` items are localized by the procuring entity. Bidders map each spec ID in **Annex C**.

---

# Part 1 — Platform & Architecture Specifications

| ID | Specification |
|---|---|
| ARCH-01 | **Multi-tenant architecture** with strong logical isolation per school (e.g., schema-per-tenant or equivalently strong row/namespace isolation). One school's data MUST be inaccessible to another at API, database, background-job, and real-time layers. |
| ARCH-02 | **Tenant resolution** by hostname/subdomain in production; administrative provisioning of new tenants by the central administrator. |
| ARCH-03 | **API-first** design; documented REST APIs with a machine-readable **OpenAPI/Swagger** schema; stable versioning. |
| ARCH-04 | **Asynchronous processing** for long-running tasks (bulk imports, report/exam generation, notifications) with a job-status mechanism and a synchronous fallback. |
| ARCH-05 | **Real-time channel** (e.g., WebSocket) for live notifications and streaming features, authenticated and tenant-scoped. |
| ARCH-06 | **Relational datastore** with referential integrity; for AI features, **vector/semantic search** capability (e.g., pgvector-class) over the school's own approved content. |
| ARCH-07 | **Web client** (responsive SPA) + **native/cross-platform mobile apps** (Android, iOS) for students, teachers, parents. |
| ARCH-08 | **Environment separation**: production, staging, test, with no production personal data in non-production. |
| ARCH-09 | **Horizontal scalability**; stateless app tier where possible; no architectural rework to grow from [N] to [N×] schools. |
| ARCH-10 | **Observability**: health/readiness endpoints, metrics, centralized logging, and alerting. |

---

# Part 2 — Detailed Functional Specifications (by domain)

## B.2.1 Identity, Roles & Tenancy
- Roles: **Central Admin, School Admin, Staff, Teacher, Student, Parent** (extensible). Per-role, per-object authorization.
- User lifecycle: create, **bulk import (CSV/template)**, edit, deactivate, password reset/recovery, forced-reset, lockout on repeated failures.
- **MFA/TOTP** for administrative roles; session/token expiry, refresh, and revocation on logout.
- Parent↔student linkage (a parent may have multiple children; a child multiple guardians).
- Audit of identity events (login, lockout, role change, password reset).

## B.2.2 Academic Structure
- **Academic year** with **Bikram Sambat** calendar and AD↔BS conversion **[ADAPT]**.
- **Classes/grades**, **sections**, **subjects**; subject→teacher and teacher→section assignment.
- **Chapters → lessons → materials** (documents, video links, images) with curriculum tags (NEB/local) **[ADAPT]**.
- Class/section promotion and **academic-year rollover** with carry-forward rules.

## B.2.3 Attendance
- Daily and/or per-period/subject attendance; statuses (present/absent/late/leave).
- Bulk marking; correction with audit; configurable parent notification on absence.
- Analytics: per-student/section/subject attendance %, trends, low-attendance flags.

## B.2.4 Assessment, Examination & Results
- Assessment types: quiz, exam, assignment; **question bank**; scheduling; total/passing marks; Bloom's-level tagging (optional).
- Submissions (text/file) and grading; **assisted grading** (optional AI) with human override.
- Marks entry (manual + import); grade computation per configurable scheme **[ADAPT national grading]**.
- **Result publication workflow** (draft → review → publish) with audit and rollback; **report cards/transcripts** (printable, BS-dated).
- Exam scheduling and **exam-seating** allocation.

## B.2.5 Admissions & Student Records
- Admission/enrollment workflow; **student profile** (demographics, guardians, contacts).
- **Health records**, **document records** (upload with validation), **student leave**.
- Promotion/transfer; alumni/inactive status.

## B.2.6 Teaching-Learning & AI (Optional Lot 3)
- Content delivery and assignment workflows.
- **Grounded AI tutor**: retrieval over the school's **own approved content only** (semantic search), with source citation; refuses when no relevant content is found.
- **Learning-path generation** from weak areas/next lessons; **at-risk-student analytics** (attendance + performance).
- **Auto-generation**: quizzes, exams, lesson summaries; **study planner**; **progress reports**.
- **AI safety controls (mandatory if Lot 3):** PII redaction before any external model call; per-request and per-period **usage/cost caps**; provider fallback; full **interaction logging**; **per-school enable/disable**.

## B.2.7 Communication & Engagement
- **Notices/announcements** with role/class/section targeting and scheduling.
- **Secure messaging** (teacher↔student↔parent), school-scoped, audited; group/section threads.
- **Notifications**: in-app, **email, SMS, mobile push**; delivery/read tracking; per-event templates **[ADAPT]**.
- **Gamification** (points, badges, leaderboards) — configurable/optional.

## B.2.8 Finance & Fees
- **Fee heads/structures**, per-class/section assignment; **student fee ledgers**; partial/scheduled payments; **discounts**; **late-fee** policy.
- **Online payments**: **eSewa, Khalti, ConnectIPS** **[ADAPT]** with **server-side verification**, **idempotent** reconciliation, and **amount validation against the authoritative fee record** (no trust of client-supplied amounts).
- **Receipts/invoices**: tax-compliant, **IRD/PAN/VAT-aligned, BS-dated** **[ADAPT]**.
- **Accounting**: double-entry ledger, chart of accounts, journal entries, fund accounting, TDS, inventory, depreciation; financial reports.
- **Central subscription/plan** management and per-tenant entitlements/feature gating.

## B.2.9 HR & Payroll
- Staff records, attendance, leave; **payroll** runs with statutory deductions **[ADAPT]**; payslips.

## B.2.10 Library, Transport, Hostel, Projects
- **Library**: catalogue, search, issue/return, members, overdue.
- **Transport**: routes, vehicles, student-route assignment.
- **Hostel**: blocks/rooms, allocation, records.
- **Projects**: group/individual tracking, tasks, submissions, **rubric-based** evaluation (feature-gated per school).

## B.2.11 Reporting, Dashboards & Oversight
- Role dashboards (student/teacher/parent/school-admin) and **central/district aggregation** that does **not** expose individual children's PII to unauthorized roles.
- Exports: **PDF/Excel/CSV**; scheduled report generation.
- **IEMIS export** in the prescribed format/fields **[ADAPT]** (see Part 6).

---

# Part 3 — Integration Specifications

| ID | Specification |
|---|---|
| INT-01 | **Payment gateways** (eSewa/Khalti/ConnectIPS): initiate + verify via server-to-server callback; idempotent; signed/verified. |
| INT-02 | **SMS gateway** **[ADAPT approved provider]**: templated, delivery status. |
| INT-03 | **Email** (transactional): templated, bounce handling. |
| INT-04 | **Mobile push** (Android/iOS). |
| INT-05 | **IEMIS / national EMIS** export/sync in prescribed schema **[ADAPT]**. |
| INT-06 | **Open APIs** for authorized third-party/government integration; rate-limited and authenticated. |
| INT-07 | (Optional) attendance/biometric device or national-ID integration — state capability. |

---

# Part 4 — Non-Functional Specifications

| ID | Specification | Target |
|---|---|---|
| NFR-01 | Browser support | Current + prior major Chrome/Edge/Firefox/Safari |
| NFR-02 | API latency (non-AI standard transactions) | p95 ≤ 800 ms **[ADAPT baseline]** |
| NFR-03 | Concurrent users at peak (e.g., result publication) | ≥ [X] with no functional degradation |
| NFR-04 | Availability (production, monthly) | ≥ 99.5% |
| NFR-05 | Backup & recovery | Daily backups; RPO ≤ 24h; RTO ≤ 4h; geo-separate copy |
| NFR-06 | Localization | Nepali (Devanagari/Unicode) + English; BS calendar |
| NFR-07 | Accessibility | WCAG 2.1 AA |
| NFR-08 | Low-connectivity | Graceful degradation; lightweight payloads; offline/queued attendance (desirable) |
| NFR-09 | Data residency | Personal data within [Nepal / Government Cloud] **[ADAPT]** |
| NFR-10 | Scalability | Onboard [N]→[N×] schools without re-architecture |

---

# Part 5 — Security Control Specifications (detailed; expands RFP §5)

| ID | Control |
|---|---|
| SEC-01 | TLS 1.2+ in transit; encryption at rest for DB, backups, file storage; documented key management/rotation. |
| SEC-02 | **Tenant isolation** enforced at API, query, async-job, and real-time layers; cross-tenant access tests demonstrable at UAT. |
| SEC-03 | Credentials stored as salted hashes; **MFA** for admins; brute-force lockout; secure session/token handling. |
| SEC-04 | Role/function/**object-level** authorization; **no unauthenticated access to personal data**; least privilege. |
| SEC-05 | **Rate limiting/throttling** on public and authentication endpoints. |
| SEC-06 | **Payment-callback verification** server-side; idempotent recording; amount validated against fee record. |
| SEC-07 | **Immutable, exportable audit logs** for sensitive actions (auth, data changes, result publication, financial txns, password resets). |
| SEC-08 | **PII minimization** in logs and any third-party/AI processing; redaction before external model calls. |
| SEC-09 | Secure **file-upload validation** (type/size/scan). |
| SEC-10 | Secret management; no credentials in source; dependency & vulnerability management. |
| SEC-11 | Data-subject rights (access/correction/deletion) honoring tenant boundaries; retention & secure disposal policy. |
| SEC-12 | Incident response & **breach notification within [24–72]h**; DPA, escrow, and independent security testing (RFP §5.3). |

---

# Part 6 — Data Model & Interoperability (indicative)

- **Core entities:** Tenant/School, AcademicYear, Class, Section, Subject, Chapter, Lesson, Material, Assessment, Question, Submission, Result, Attendance, Student, Teacher, Parent, Staff, Notice, Message, Notification, FeeStructure, StudentFee, Payment, LedgerAccount, JournalEntry, LibraryBook, Project, and AI artifacts (ContentChunk/embedding, InteractionLog).
- **Keys:** stable unique identifiers (UUID recommended) for cross-system reference; **IEMIS school code** carried on the tenant **[ADAPT]**.
- **IEMIS export (indicative fields):** school code, class, section, student count by grade/gender, teacher count, attendance summary, results summary — in the prescribed national format **[ADAPT]**.
- **Open formats** for all exports (CSV/JSON/SQL) to guarantee portability and exit (RFP §10.3).

---

*Bidders must respond to every spec ID in the Annex C compliance matrix. `[ ]`/`[ADAPT]` values are finalized by the procuring entity prior to publication.*
