# Annex F-3 — Security & Data-Protection Undertaking and Questionnaire

**RFP Reference No.:** _____ /ELMS-SUB/2082-83
**Bidder/Firm Name:** ____________________________

## Part A — Undertaking (must be signed)
The platform serves **minors (school children)**. By signing, the bidder undertakes that, if awarded the subscription, it will:
1. Act as **Data Processor**; the Local Government and schools remain **Data Owners/Controllers** of all data.
2. Process personal data **only** to operate the platform for the in-scope schools — never sell, share, or use it for marketing or profiling of children.
3. Apply the security controls in Part B and the RFP (§5) throughout the term.
4. Store and process personal data within **[Nepal / approved Government Cloud]** **[ADAPT]**; not transfer abroad without written authorization.
5. Notify the Local Government of any personal-data breach **without undue delay and within [24–72] hours**.
6. On expiry/termination, provide full data export in open formats and a **certified secure deletion** of all data.
7. Comply with applicable data-protection and children's-protection law **[ADAPT — Privacy Act 2075, Children's Act 2075]**.

**Signature:** ____________________ **Name/Designation:** ____________________ **Date:** __________ **Seal:**

## Part B — Questionnaire
Answer **Yes / Partial / No / N/A**; provide specifics in **Details**. Attach certificates/audit reports where available.

### B.1 Access & Authentication
| # | Question | Response | Details |
|---|---|---|---|
| S1 | Passwords stored only as salted hashes? | | |
| S2 | MFA enforced for administrative accounts? | | |
| S3 | Role/object-level authorization; no unauthenticated access to personal data? | | |
| S4 | Brute-force lockout/throttling on login? | | |

### B.2 Multi-Tenant Isolation
| # | Question | Response | Details |
|---|---|---|---|
| S5 | Isolation model (schema/DB/row-level)? Describe. | | |
| S6 | Can you demonstrate at evaluation that School A cannot access School B data? | | |

### B.3 Encryption & Hosting
| # | Question | Response | Details |
|---|---|---|---|
| S7 | TLS 1.2+ in transit; encryption at rest? | | |
| S8 | Data residency in Nepal / Government Cloud? | | |
| S9 | Separate production/test environments? | | |

### B.4 Children's Data & Privacy
| # | Question | Response | Details |
|---|---|---|---|
| S10 | Data minimization for minors' data? | | |
| S11 | PII redacted before any third-party/AI processing? | | |
| S12 | Any profiling/marketing use of children's data? (must be No) | | |
| S13 | Support for data access/correction/deletion within tenant boundary? | | |

### B.5 Audit, Backup & Incident Response
| # | Question | Response | Details |
|---|---|---|---|
| S14 | Audit logging of sensitive actions (immutable, exportable)? | | |
| S15 | Daily backups; tested restore; RPO ≤ 24h / RTO ≤ 4h? | | |
| S16 | Documented incident-response & breach-notification process? | | |

### B.6 Payments & Sub-processors (if applicable)
| # | Question | Response | Details |
|---|---|---|---|
| S17 | Payment callbacks verified server-side; idempotent recording; amount validated against fee record? | | |
| S18 | List sub-processors (cloud/SMS/email/payment/AI) and locations; prior approval before changes? | | |

---
**Authorized Signature:** ____________________ **Date:** __________ **Seal:**
