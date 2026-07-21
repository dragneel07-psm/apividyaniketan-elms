# Annex C — Requirements Compliance Matrix

**RFP Reference No.:** _____ /SW-LMS/2082-83
**Bidder/Firm Name:** ____________________________
**Proposed Platform & Version:** ____________________________

## Instructions to Bidders
1. Respond to **every** requirement. Leaving a row blank will be treated as **Not Available**.
2. In the **Compliance** column enter exactly one code:
   - **C** = Complies out-of-the-box (standard product feature).
   - **G** = Configurable (achieved via setup/configuration, no source change).
   - **X** = Customization required (bespoke development needed; describe effort).
   - **N** = Not available.
3. In **Module/Version**, name the product module and version delivering the requirement.
4. In **Notes / Evidence**, reference the demo screen, document page, or API endpoint that substantiates the claim. Unsubstantiated "C"/"G" claims may be down-scored during the live demonstration (§13).
5. Any deviation, assumption, or dependency MUST be stated; silence implies full, unconditional compliance.

**Legend:** C = Comply (out-of-box) · G = Configurable · X = Customization · N = Not available

---

## C.1 Identity, Access & Multi-Tenancy (RFP §3.1, §2)

| Req ID | Requirement | Compliance (C/G/X/N) | Module/Version | Notes / Evidence |
|---|---|---|---|---|
| AC-01 | Role-based access for Central Admin, School Admin, Staff, Teacher, Student, Parent | | | |
| AC-02 | Per-school tenant data isolation; no cross-tenant read/write (demonstrable) | | | |
| AC-03 | Administrative hierarchy Central→Province→District→School with upward aggregation | | | |
| AC-04 | Multi-factor authentication (MFA) for administrative roles | | | |
| AC-05 | Single sign-on (SSO) readiness / standards (SAML/OIDC) | | | |
| AC-06 | Account lifecycle: create, bulk import, deactivate, reset, recovery | | | |
| AC-07 | Brute-force lockout and session/token controls | | | |
| AC-08 | Central provisioning of new schools (tenants) and school administrators | | | |

## C.2 Academic Management (RFP §3.2)

| Req ID | Requirement | Compliance (C/G/X/N) | Module/Version | Notes / Evidence |
|---|---|---|---|---|
| AM-01 | Academic year + Bikram Sambat (BS) calendar with AD↔BS conversion | | | |
| AM-02 | Classes, sections, subjects, subject-teacher assignment | | | |
| AM-03 | Lessons, chapters, materials with curriculum tagging (NEB/local) | | | |
| AM-04 | Timetable/scheduling and exam seating | | | |
| AM-05 | Attendance (class/subject/day) with analytics + parent notification | | | |
| AM-06 | Assessments/quizzes/exams: creation, scheduling, question banks, grading | | | |
| AM-07 | Results & report cards: marks entry, grade computation, publication, transcripts | | | |
| AM-08 | Admissions, student profiles, health/document records, leave | | | |
| AM-09 | Promotion / academic-year rollover | | | |

## C.3 Teaching-Learning & AI (RFP §3.3) — Optional Lot 3

| Req ID | Requirement | Compliance (C/G/X/N) | Module/Version | Notes / Evidence |
|---|---|---|---|---|
| AI-01 | Digital content delivery and assignment workflows | | | |
| AI-02 | Grounded AI tutor (retrieval over approved school content only) | | | |
| AI-03 | Learning-path generation; at-risk-student analytics | | | |
| AI-04 | Auto quiz/exam generation; lesson summarization; study planner | | | |
| AI-05 | Progress-report generation; assisted grading | | | |
| AI-06 | PII redaction before any data leaves platform infrastructure | | | |
| AI-07 | Configurable AI usage/cost controls; disableable per school | | | |

## C.4 Communication & Engagement (RFP §3.4)

| Req ID | Requirement | Compliance (C/G/X/N) | Module/Version | Notes / Evidence |
|---|---|---|---|---|
| CM-01 | Secure, school-scoped, audited in-app messaging (teacher/student/parent) | | | |
| CM-02 | Notices/announcements with role/section targeting | | | |
| CM-03 | Notifications via in-app, email, SMS, mobile push with delivery tracking | | | |
| CM-04 | Real-time updates (live notifications / tutor streaming) | | | |
| CM-05 | Gamification (points, badges, leaderboards) — configurable | | | |

## C.5 Examination, Library, Finance, HR, Transport, Hostel, Projects (RFP §3.5–§3.10)

| Req ID | Requirement | Compliance (C/G/X/N) | Module/Version | Notes / Evidence |
|---|---|---|---|---|
| EX-01 | Internal/terminal exam management aligned to national grading | | | |
| EX-02 | Result-publication controls with audit and rollback | | | |
| EX-03 | Performance analytics (subject/section/school, trends, at-risk) | | | |
| LB-01 | Library: catalogue, search, issue/return, members, overdue | | | |
| FN-01 | Fee heads/structures, student ledgers, partial/scheduled payments, discounts, late fees | | | |
| FN-02 | Online payments: eSewa, Khalti, ConnectIPS with server-side verification | | | |
| FN-03 | Idempotent payment reconciliation (no double-credit on callback retries) | | | |
| FN-04 | Tax-compliant receipts/invoices (IRD/PAN/VAT, BS-dated) | | | |
| FN-05 | Double-entry ledger, chart of accounts, journals, fund accounting, TDS, depreciation | | | |
| FN-06 | Financial reports and central subscription/plan management | | | |
| HR-01 | Staff records, attendance, leave, payroll with statutory deductions | | | |
| TR-01 | Transport: routes/vehicles, student-route assignment | | | |
| HS-01 | Hostel allocation and records | | | |
| PR-01 | Projects: group/individual tracking, tasks, submissions, rubric evaluation (feature-gated) | | | |

## C.6 Reporting & Dashboards (RFP §3.11)

| Req ID | Requirement | Compliance (C/G/X/N) | Module/Version | Notes / Evidence |
|---|---|---|---|---|
| RP-01 | Role-specific dashboards (student/teacher/parent/school/central) | | | |
| RP-02 | Central/district aggregation without exposing children's PII to unauthorized roles | | | |
| RP-03 | Exportable reports (PDF/Excel/CSV) and scheduled generation | | | |
| RP-04 | National EMIS/IEMIS data export in prescribed format | | | |

## C.7 Technical (RFP §4)

| Req ID | Requirement | Compliance (C/G/X/N) | Module/Version | Notes / Evidence |
|---|---|---|---|---|
| TE-01 | Web app on current+prior major Chrome/Edge/Firefox/Safari | | | |
| TE-02 | Native/cross-platform mobile app (Android + iOS) for students/teachers/parents | | | |
| TE-03 | API-first design with documented REST APIs (OpenAPI/Swagger) | | | |
| TE-04 | Asynchronous processing + real-time channel (WebSocket) | | | |
| TE-05 | Nepali (Devanagari/Unicode) + English UI with toggle | | | |
| TE-06 | Bikram Sambat calendar throughout with AD conversion | | | |
| TE-07 | WCAG 2.1 Level AA accessibility | | | |
| TE-08 | Mobile-responsive; usable on low-cost Android devices | | | |
| TE-09 | Graceful degradation on slow/intermittent connectivity | | | |
| TE-10 | Offline/queued capability for high-value flows (e.g., attendance) | | | |
| TE-11 | Support [X] concurrent users; API p95 ≤ 800 ms (state baseline) | | | |
| TE-12 | Horizontal scalability to [N]→[N×] schools; noisy-neighbor isolation | | | |
| TE-13 | ≥ 99.5% monthly uptime | | | |
| TE-14 | Daily backups, point-in-time recovery, RPO ≤ 24h / RTO ≤ 4h | | | |
| TE-15 | Disaster recovery plan + geographically separate backup | | | |
| TE-16 | Data residency in Nepal / Government Cloud (state model) | | | |
| TE-17 | Separate production/staging/test environments | | | |
| TE-18 | Integrations: payments, email, SMS, push, EMIS export | | | |

## C.8 Security, Privacy & Compliance (RFP §5)

| Req ID | Requirement | Compliance (C/G/X/N) | Module/Version | Notes / Evidence |
|---|---|---|---|---|
| SE-01 | Encryption in transit (TLS 1.2+) and at rest | | | |
| SE-02 | Verifiable tenant data isolation (cross-tenant tests at UAT) | | | |
| SE-03 | Hashed credentials, MFA for admins, brute-force lockout | | | |
| SE-04 | Role/function/object-level authorization; no unauthenticated access to PII | | | |
| SE-05 | Server-side verification of all payment callbacks; tamper-resistant recording | | | |
| SE-06 | Immutable, exportable audit logging of sensitive actions | | | |
| SE-07 | Rate limiting/throttling on public and authentication endpoints | | | |
| SE-08 | PII minimization in logs and third-party/AI processing | | | |
| SE-09 | Secure file-upload validation (type/size/scan) | | | |
| SE-10 | Secret management; no credentials in source | | | |
| SE-11 | Compliance with applicable data-protection & children's-data law | | | |
| SE-12 | Data-subject rights: access/correction/deletion respecting tenant boundary | | | |
| SE-13 | Documented data-retention & secure-disposal policy | | | |
| SE-14 | DPA + confidentiality undertaking | | | |
| SE-15 | Third-party security audit / pen-test report (last 24 months) | | | |
| SE-16 | Source-code escrow for custom components | | | |

## C.9 Implementation, Support & Commercial (RFP §6–§10)

| Req ID | Requirement | Compliance (C/G/X/N) | Module/Version | Notes / Evidence |
|---|---|---|---|---|
| IM-01 | Phased implementation plan with milestones and dependencies | | | |
| IM-02 | Data migration tools, templates, validation ≥ 99.9% accuracy, rollback | | | |
| IM-03 | UAT, security test, and load test sign-off per phase | | | |
| TN-01 | Role-based training in Nepali; Train-the-Trainer; manuals/videos/help | | | |
| SP-01 | 3–5 year warranty + support including patches & minor enhancements | | | |
| SP-02 | SLA response/resolution targets (S1–S4) with service credits | | | |
| SP-03 | Quarterly patching; emergency security patches within 72h | | | |
| LG-01 | Government owns all data; customization IP terms stated | | | |
| LG-02 | Exit/data portability in open formats + secure deletion certificate | | | |

---

**Authorized Signature:** ____________________  **Name/Designation:** ____________________  **Date:** __________
**Company Seal:**
