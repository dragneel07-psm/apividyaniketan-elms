# Annex F-7 — Detailed Technical Specifications
### (Companion to the Local-Government ELMS Subscription RFP)

**RFP Reference No.:** _____ /ELMS-SUB/2082-83
**Local Government:** [Name] Municipality / Rural Municipality

> This is a **subscription** to an existing, operational SaaS platform. Every specification below must already be **available in the live product** (confirmed in Annex F-2), not promised as future development. Specs are outcome-based and vendor-neutral; `[ADAPT]` items are localized by the Local Government.

---

# 1. Platform & Delivery
| ID | Specification |
|---|---|
| P-01 | Cloud-hosted **SaaS**; no on-premise installation required by schools. |
| P-02 | **Multi-tenant** with strict per-school isolation — School A cannot access School B's data (demonstrable at evaluation). |
| P-03 | Accessible via modern web browsers and **native/cross-platform mobile apps** (Android, iOS) for students, teachers, parents. |
| P-04 | Per-school **tenant provisioning** and configuration by the provider/Local-Government Education Unit. |
| P-05 | Software updates and security patches delivered continuously at no extra cost during the subscription. |
| P-06 | Separate production and test environments; no real children's data in test. |

# 2. Localization & Access
| ID | Specification |
|---|---|
| L-01 | **Nepali (Devanagari/Unicode) + English** UI with language toggle **[ADAPT]**. |
| L-02 | **Bikram Sambat** calendar throughout, with AD conversion **[ADAPT]**. |
| L-03 | **WCAG 2.1 AA** accessibility; mobile-responsive; usable on low-cost Android devices. |
| L-04 | **Low-connectivity resilience**: lightweight pages, graceful degradation; **offline/queued attendance capture desirable**. |

# 3. Functional Capabilities (must exist in the live product)
| ID | Capability |
|---|---|
| FC-01 | Academic structure: classes, sections, subjects, lessons/materials, timetable. |
| FC-02 | Attendance (daily/subject) with analytics and parent notification. |
| FC-03 | Assessment/exams, marks entry, grade computation, report cards, controlled result publication. |
| FC-04 | Admissions, student profiles & documents, promotion/year-rollover. |
| FC-05 | Notices, secure school-scoped messaging, notifications (in-app/SMS/email/push). |
| FC-06 | Finance/fees (optional): structures, ledgers, online payment (eSewa/Khalti/ConnectIPS), receipts. |
| FC-07 | Role dashboards + **Local-Government oversight dashboard** (aggregate, privacy-respecting). |
| FC-08 | Exports (PDF/Excel/CSV) and **IEMIS-format export** **[ADAPT]**. |
| FC-09 | (Optional) AI tutor / at-risk analytics — PII-redacted, per-school disableable. |

# 4. Integrations
| ID | Specification |
|---|---|
| I-01 | SMS gateway **[ADAPT]**, email, mobile push. |
| I-02 | Payment gateways (if fees used): eSewa/Khalti/ConnectIPS with **server-side verification** and **idempotent** recording. |
| I-03 | **IEMIS export** in prescribed format **[ADAPT]**. |
| I-04 | Documented data export APIs / formats for portability. |

# 5. Reliability & Data
| ID | Specification | Target |
|---|---|---|
| R-01 | Production uptime (monthly) | ≥ 99.5% |
| R-02 | Backups & recovery | Daily backups; RPO ≤ 24h; RTO ≤ 4h; geo-separate copy |
| R-03 | Data residency | Personal data within [Nepal / Government Cloud] **[ADAPT]** |
| R-04 | Performance | Responsive on typical school bandwidth; no functional degradation at school-cluster peak |
| R-05 | Data portability / exit | Full export in open formats (CSV/JSON) + certified secure deletion on exit |

# 6. Security & Child-Data Protection (mandatory)
| ID | Control |
|---|---|
| S-01 | TLS 1.2+ in transit; encryption at rest. |
| S-02 | Tenant isolation at API, query, job, and real-time layers (demonstrable). |
| S-03 | Hashed credentials; **MFA for admin accounts**; brute-force lockout. |
| S-04 | Role/object-level authorization; **no unauthenticated access to personal data**. |
| S-05 | **PII minimization**; redaction before any third-party/AI processing; **no profiling/marketing of children's data**. |
| S-06 | Server-side payment verification; idempotent; amount validated against fee record. |
| S-07 | Immutable, exportable audit logs of sensitive actions. |
| S-08 | Breach notification within **[24–72]h**; signed DPA (Annex F-3/F-5); data residency honored. |

# 7. Onboarding & Support (technical)
| ID | Specification |
|---|---|
| O-01 | Bulk import of students/teachers/parents via provided templates (CSV) with validation reports. |
| O-02 | Per-school go-live checklist and rollback for failed imports. |
| O-03 | Helpdesk (phone/email/portal) in Nepali/English; emergency security patches within 72h. |
| O-04 | Knowledge base, user guides, and short training videos in Nepali **[ADAPT]**. |

---

*Bidders confirm each ID against the live product in **Annex F-2** (with evidence) and demonstrate the security/isolation specs at the live evaluation (RFP §9, §11).*
