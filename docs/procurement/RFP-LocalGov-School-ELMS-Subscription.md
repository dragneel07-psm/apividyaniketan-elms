# Request for Proposal (RFP)
## Subscription to a Cloud-Based Multi-Tenant E-Learning Management System (ELMS) for Community Schools

**Procuring Entity:** [Name] Municipality / Rural Municipality (Local Government), [District], [Province] **[ADAPT]**
**Issued by:** Education, Youth and Sports Section / Education Unit
**RFP Reference No.:** _____ /ELMS-SUB/2082-83
**Procurement Method:** Open Competitive Bidding — subscription (SaaS) service procurement
**Issue Date:** [Date] · **Submission Deadline:** [Date, Time] · **Proposal Validity:** 90 days

> **Officer's note & assumptions:** Drafted for a Nepal **local-government** context exercising its constitutional mandate over basic and secondary (community) education — Bikram Sambat calendar, Nepali language, eSewa/Khalti/ConnectIPS, IEMIS alignment, rural low-connectivity. This is a **subscription** to a **ready, proven** ELMS platform — **not** bespoke software development. Bracketed `[ ]` quantities and `[ADAPT]` clauses must be completed by the Local Government before publication, consistent with the **Public Procurement Act 2063 / Regulations 2064** and the **Local Government Operation Act 2074** **[ADAPT]**. Requirements are stated vendor-neutrally; any compliant provider may bid.

---

## 1. Background and Objective

### 1.1 Background
[Local Government] has constitutional and statutory responsibility for community schools within its jurisdiction. To improve teaching-learning quality, administrative efficiency, and transparency, the Local Government intends to **subscribe its [N] community schools to a secure, cloud-based, multi-tenant ELMS** delivered as a managed service (SaaS), with onboarding, training, and ongoing support.

### 1.2 Objectives
1. Provide every community school under the Local Government a standardized digital teaching-learning and school-administration platform on a subscription basis.
2. Strengthen attendance, assessment, results, and parent engagement.
3. Improve administrative functions (admissions, student records, examinations, basic finance/fees, reporting).
4. Enable the Local Government's Education Unit to monitor school-level indicators while protecting children's personal data.
5. Align school data with national **IEMIS** reporting **[ADAPT]**.
6. Ensure usability in **rural and low-connectivity** settings, in **Nepali**, on **BS calendar**.

### 1.3 Indicative Volumetrics (to be finalized in Annex F-1)
- Community schools to onboard: **[N]**
- Estimated students: **[X]** · Teachers/staff: **[Y]** · Parents: **[Z]**
- Subscription term: **[2–3] years** (renewable) **[ADAPT]**

---

## 2. Nature of Procurement — Subscription (SaaS)

This is procurement of a **subscription service to an existing, operational platform**, including:
- Hosted access (web + mobile) for all in-scope schools and roles.
- Per-school tenant provisioning and configuration.
- Onboarding and data setup, training, support, and maintenance for the term.
- Software updates, security patches, and platform availability under an SLA.

This is **NOT** custom software development. Bidders must demonstrate a **live, production-grade platform** already in use (reference deployments required). Proposals based on yet-to-be-built software will be rejected.

---

## 3. Scope of Subscription Services

### 3.1 Provisioning & Onboarding
- Create an isolated tenant (school workspace) for each in-scope school.
- Configure academic year (BS), classes/sections/subjects, roles, and school branding.
- Bulk-onboard students, teachers, staff, and parents from Local-Government/school records (templates provided by bidder).
- Initial data validation and go-live support per school.

### 3.2 Platform Access by Role
- **Local-Government Education Unit (oversight):** aggregate, privacy-respecting dashboards across schools; school provisioning oversight.
- **School Administrator / Head Teacher:** full school administration.
- **Teacher:** teaching, attendance, assessment, communication.
- **Student / Parent:** learning, results, attendance, notices, messaging.

### 3.3 Functional Capabilities the Platform MUST Already Provide
*(Bidders confirm each in the Annex F-2 compliance checklist; features must exist in the live product, not be promised.)*
- **Academic:** classes, sections, subjects, lessons/materials, timetable.
- **Attendance:** daily/subject attendance with parent notification and analytics.
- **Assessment & Results:** quizzes/exams, marks entry, grade computation, report cards, controlled result publication.
- **Admissions & Student Records:** profiles, documents, promotion/year-rollover.
- **Communication:** notices, secure messaging, notifications (in-app, **SMS, email, push**).
- **Basic Finance/Fees (where applicable):** fee structures, ledgers, online payment (**eSewa/Khalti/ConnectIPS**), receipts. *(Optional for fully fee-free community schools.)*
- **Library, gamification, projects:** desirable/optional.
- **Reporting & Dashboards:** role-based dashboards, exports (PDF/Excel/CSV), and **IEMIS-format export** **[ADAPT]**.
- **(Optional) AI/analytics:** AI tutor, at-risk analytics — must redact PII and be disableable per school.
- **Mobile app:** Android (and iOS) for students/teachers/parents.

### 3.4 Training & Change Management
- Role-based training (administrators, teachers) in **Nepali**, on-site and/or online.
- **Train-the-Trainer** for at least **[N]** focal teachers per cluster for sustainability.
- User guides, short videos, and in-app help.

### 3.5 Support & Maintenance (included in subscription)
- Helpdesk, defect fixes, security patches, and platform upgrades at no extra cost for the term, under the SLA (§7).

---

## 4. Technical & Non-Functional Requirements

| # | Requirement |
|---|---|
| T1 | Cloud-hosted SaaS; accessible on modern browsers and via Android/iOS mobile apps. |
| T2 | **Multi-tenant** with strict per-school data isolation (one school cannot see another's data). |
| T3 | **Nepali (Devanagari/Unicode) + English** UI; **Bikram Sambat** calendar with AD conversion. |
| T4 | **WCAG 2.1 AA** accessibility; mobile-responsive; usable on low-cost Android devices. |
| T5 | **Low-connectivity resilience** — lightweight pages, graceful degradation; offline/queued capture for high-value flows (e.g., attendance) desirable. |
| T6 | **≥ 99.5% monthly uptime**; daily backups; documented RPO ≤ 24h / RTO ≤ 4h. |
| T7 | **Data residency in Nepal / approved Government Cloud** for all personal data **[ADAPT]**. |
| T8 | Integrations: SMS gateway, email, mobile push, payment gateways (if fees used), **IEMIS export**. |
| T9 | Documented, exportable data formats (no lock-in); data export on exit at no cost. |

---

## 5. Security & Data Protection (Children's Data — Mandatory)

The platform serves **minors**; the following are non-negotiable and scored heavily:
1. Encryption in transit (TLS 1.2+) and at rest.
2. Verifiable tenant isolation; role/function/object-level authorization; **no unauthenticated access to personal data**.
3. MFA for administrative accounts; brute-force protection.
4. **PII minimization**; no profiling/marketing use of children's data; PII redaction before any third-party/AI processing.
5. Audit logging of sensitive actions; immutable and exportable.
6. Server-side verification of any online payments; idempotent recording.
7. Compliance with applicable data-protection and children's-protection law **[ADAPT — Privacy Act 2075, Children's Act 2075]**.
8. Signed **Data Processing & Confidentiality Undertaking** (Annex F-3); Local Government and schools retain ownership of all data.
9. Data export and **secure deletion certificate** on termination/expiry.

---

## 6. Subscription Term, Renewal & Exit
- Term: **[2–3] years**, renewable by mutual agreement subject to performance and budget.
- The Local Government may onboard additional schools during the term at the quoted per-school/per-student rate.
- On expiry/termination: full data export in open formats, transition assistance, and certified secure deletion; no proprietary lock-in.

---

## 7. Service Levels (SLA)

| Severity | Definition | Response | Resolution |
|---|---|---|---|
| S1 — Critical | Platform/login down, data breach, data loss | ≤ 1 hour | ≤ 4 hours |
| S2 — Major | Core function broken, no workaround | ≤ 4 hours | ≤ 1 business day |
| S3 — Minor | Function impaired, workaround exists | ≤ 1 business day | ≤ 5 business days |
| S4 — Low | Cosmetic / query | ≤ 2 business days | Next release |

- Helpdesk in **Nepali/English** during **[hours]**; monthly uptime/support report to the Education Unit.
- Service credits for uptime/response breaches; persistent S1 breaches constitute material default.

---

## 8. Commercial / Pricing

### 8.1 Subscription Pricing Model (itemize in Annex F-4)
- **Per-school per-year** and/or **per-active-student per-year** subscription (state model clearly).
- One-time onboarding/training (if any) listed separately and kept minimal.
- All prices in **NPR**, **inclusive of applicable taxes** unless directed otherwise.
- Provide a **multi-year Total Cost** for the full term and the per-additional-school rate.

### 8.2 Payment
- Subscription payable **[annually in advance / quarterly]** against valid tax invoice and a satisfactory SLA report **[ADAPT]**.
- Bid security and (for the awarded vendor) a performance security as per applicable procurement rules **[ADAPT]**.

---

## 9. Eligibility & Qualification of Bidders

Bidders MUST provide documentary evidence:
1. Legal registration, **PAN/VAT**, tax clearance (latest FY) **[ADAPT]**.
2. A **live, production ELMS platform** with at least **[2]** reference deployments (preferably community/government schools), with contactable references and at least one of comparable scale.
3. Demonstrated **multi-tenant isolation** and **child-data protection** practices.
4. **Localization** (Nepali/BS) and (if fees used) local payment-gateway support.
5. In-country support capability / local presence or partner **[ADAPT]**.
6. Not blacklisted/debarred; integrity declaration.
7. **Mandatory live demonstration** and sandbox access for hands-on evaluation, including a cross-tenant isolation demonstration.

---

## 10. Proposal Submission

Two-envelope system (or e-GP) **[ADAPT]**:
- **Technical Proposal:** cover letter, eligibility documents, platform overview, **Annex F-2 compliance checklist**, security & data-protection responses (Annex F-3), onboarding/training/support plan, references, and team.
- **Financial Proposal:** **Annex F-4** subscription pricing + multi-year total, sealed separately.

---

## 11. Evaluation

Quality and Cost Based Selection (QCBS) — **Technical 70% : Financial 30%**; minimum technical qualifying score **70/100** **[ADAPT — local governments may use lowest-evaluated-cost-meeting-spec for low-value subscriptions]**.

**Technical scoring (100):**
| Criterion | Points |
|---|---|
| Functional capability & compliance checklist coverage | 22 |
| Security & child-data protection; tenant isolation | 20 |
| Localization (Nepali/BS), accessibility, low-connectivity fit | 14 |
| Reliability, availability, data residency, support/SLA | 12 |
| Onboarding, data setup & training plan | 10 |
| Reference deployments & past performance | 10 |
| Live demonstration / sandbox evaluation | 12 |

---

## 12. Procurement Timeline (indicative)
| Activity | Date |
|---|---|
| RFP publication | [ ] |
| Pre-bid clarification | [ ] |
| Submission deadline | [ ] |
| Technical opening & demonstrations | [ ] |
| Financial opening (qualified bidders) | [ ] |
| Award & agreement | [ ] |

---

## 13. General Terms
- The Local Government may accept/reject any or all proposals and cancel the process per applicable law, without liability.
- Conditional/incomplete/non-compliant proposals may be rejected.
- Proposal-preparation costs are borne by bidders.
- Integrity and conflict-of-interest declarations required.
- Clarifications only in writing through the official channel.

---

## Annexes
- **Annex F-1:** List of in-scope schools and volumetrics (students/teachers/parents per school).
- **Annex F-2:** Functional compliance checklist (Feature | Available Y/N | Module/Version | Notes).
- **Annex F-3:** Security & Data-Protection undertaking and questionnaire (children's data).
- **Annex F-4:** Subscription pricing template (per-school / per-student / year + multi-year total + per-additional-school rate).
- **Annex F-5:** Draft subscription agreement, SLA, and Data Processing terms.
- **Annex F-6:** Bid forms (covering letter, eligibility checklist, integrity declaration, references, team).

---

*Prepared by the Technical Officer (Software Procurement) for [Local Government]. Bracketed `[ ]` / `[ADAPT]` items must be finalized and cleared by the procurement and legal sections, consistent with the Public Procurement Act 2063, its Regulations 2064, and the Local Government Operation Act 2074, before publication.*
