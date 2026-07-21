# Annex E — Draft Contract, SLA, Data Processing Agreement & Escrow

**RFP Reference No.:** _____ /SW-LMS/2082-83

> **Note:** This is a draft for bidder review. Bidders must confirm acceptance in Form A1 and list any deviation in Form A11. Final terms are subject to the procuring entity's legal review and applicable law. **[ADAPT]** items require localization.

---

# Part 1 — Draft Contract / Agreement

**This Agreement** is made on [date] between **[Procuring Entity]** ("the Client") and **[Vendor]** ("the Vendor").

### 1. Definitions & Documents
1.1 The Contract comprises, in order of precedence: this Agreement; the SLA (Part 2); the DPA (Part 3); the Escrow Agreement (Part 4); the RFP and addenda; the Vendor's accepted Technical Proposal (incl. Annex C); and the Financial Proposal (Annex D).
1.2 In conflict, higher-precedence documents prevail.

### 2. Scope & Term
2.1 The Vendor shall supply, customize, integrate, deploy, migrate data, train, and maintain the Multi-Tenant School LMS/ERP platform per the Contract.
2.2 Term: **[5] years** from the Effective Date (implementation + warranty + support), renewable by mutual written agreement.

### 3. Price & Payment
3.1 Contract price: **NPR ______** (Annex D), inclusive of taxes unless stated.
3.2 Payment is milestone-linked (RFP §9.2); each payment follows written acceptance of the corresponding deliverable.
3.3 The Client may withhold disputed amounts pending resolution.

### 4. Obligations of the Vendor
4.1 Deliver in conformity with the Contract, on schedule, with qualified personnel (no substitution of key personnel without Client consent).
4.2 Comply with the SLA, DPA, security requirements (RFP §5), and applicable law.
4.3 Provide documentation, training, knowledge transfer, and source-code escrow.
4.4 Maintain confidentiality and data protection at all times.

### 5. Obligations of the Client
5.1 Provide timely access, information, approvals, and a single point of contact.
5.2 Make payments per §3 against accepted deliverables.

### 6. Acceptance & Warranty
6.1 Deliverables are accepted on written UAT/security/load sign-off (RFP §6.3).
6.2 The Vendor warrants the platform is free from material defects and conforms to the Contract for the full term; defects and security issues are remedied at no cost.

### 7. Performance Security & Liquidated Damages
7.1 Performance bond: **[5–10]%** of contract value, valid through warranty.
7.2 Delay LD: **[0.05]%/day**, capped at **[10]%**; SLA service credits per Part 2. LDs are a genuine pre-estimate, not a penalty.

### 8. Intellectual Property & Data Ownership
8.1 The **Client owns all data** processed in the platform.
8.2 Bespoke customizations developed under this Contract are **owned by / perpetually and irrevocably licensed to the Client** **[ADAPT]**. Pre-existing Vendor/third-party IP is licensed for the term and any agreed continuation.

### 9. Confidentiality
Each party protects the other's confidential information; obligations survive termination. Children's and personal data is governed by the DPA (Part 3).

### 10. Liability & Indemnity
10.1 The Vendor indemnifies the Client against third-party claims arising from IP infringement, data breach attributable to the Vendor, or the Vendor's negligence/wilful misconduct.
10.2 Liability cap: the greater of contract value or **[insurance limit]** **[ADAPT]**; **no cap** for data breach, breach of confidentiality, IP infringement, or wilful misconduct.

### 11. Termination
11.1 For cause: on material breach uncured within **[30] days** of notice; immediately for insolvency, abandonment, or a serious data breach.
11.2 For convenience: by the Client on **[60] days** notice, paying for accepted work.
11.3 On termination: orderly exit, data export, and secure deletion per §13 and the DPA.

### 12. Dispute Resolution & Governing Law
12.1 Good-faith negotiation, then **arbitration under [applicable Act] in [seat], in [language]** **[ADAPT]**.
12.2 Governing law: laws of **[Nepal]** **[ADAPT]**.

### 13. Exit & Transition
13.1 On expiry/termination, the Vendor provides full data export in open formats (CSV/JSON/SQL), transition assistance for **[90] days**, and a secure-deletion certificate.
13.2 No vendor lock-in via undocumented/proprietary formats.

### 14. General
Force majeure; no assignment without consent; notices in writing; amendments only in writing; severability; entire agreement.

Signed for the Client: __________ Signed for the Vendor: __________ Date: __________

---

# Part 2 — Service Level Agreement (SLA)

### 2.1 Availability
- Production uptime **≥ 99.5%** per calendar month, excluding agreed maintenance windows.
- Maintenance windows scheduled with **[48h]** notice, off-peak; emergency security maintenance may be immediate with prompt notice.

### 2.2 Severity, Response & Resolution
| Severity | Definition | Response | Resolution Target |
|---|---|---|---|
| S1 — Critical | System/login down, data breach, payment failure, data loss | ≤ 1 hour | ≤ 4 hours |
| S2 — Major | Core function broken, no workaround | ≤ 4 hours | ≤ 1 business day |
| S3 — Minor | Function impaired, workaround exists | ≤ 1 business day | ≤ 5 business days |
| S4 — Low | Cosmetic / query / enhancement | ≤ 2 business days | Next release |

### 2.3 Patching
- Quarterly maintenance releases; **emergency security patches within 72 hours** of disclosure.

### 2.4 Measurement & Reporting
- Uptime and ticket metrics measured by an agreed monitoring tool; **monthly SLA report** to the Client.
- Helpdesk via phone/email/portal during **[hours]** with a defined escalation matrix.

### 2.5 Service Credits (illustrative)
| Monthly Uptime | Service Credit (% of monthly fee) |
|---|---|
| ≥ 99.5% | 0% |
| 99.0–99.49% | 5% |
| 98.0–98.99% | 10% |
| < 98.0% | 20% |

- Repeated S1 SLA breaches (≥ [3] in a quarter) constitute material breach (Part 1 §11.1).
- **Exclusions:** Client-caused outages, force majeure, agreed maintenance, third-party network/DNS issues outside Vendor control (Vendor must still notify and assist).

---

# Part 3 — Data Processing Agreement (DPA)

### 3.1 Roles & Scope
- The **Client is the Data Controller**; the **Vendor is the Data Processor**, processing personal data only on documented Client instructions for the sole purpose of operating the platform.
- Data categories: student (minor), parent, teacher, and staff personal data, academic records, attendance, financial/fee data, and communications.

### 3.2 Vendor Obligations
- Process only per instructions; never for the Vendor's own purposes; never sell or share data.
- Apply the security measures in RFP §5 (encryption in transit/at rest, tenant isolation, access control, audit logging, PII minimization).
- Ensure personnel are bound by confidentiality and trained in data protection.
- Assist the Client with data-subject requests, DPIAs, and regulator queries.

### 3.3 Children's Data (special protection)
- Apply heightened safeguards for minors' data; **strict data minimization**; no behavioral profiling or third-party/AI processing of minors' identifiers without redaction and Client authorization; no marketing use.

### 3.4 Sub-processors
- No sub-processor (incl. cloud, SMS, email, payment, AI/LLM providers) without prior **written Client approval**; maintain a current sub-processor list; flow down equivalent obligations; remain liable for sub-processors.

### 3.5 Data Residency & Transfers
- Store and process personal data within **[Nepal / Government Cloud]** **[ADAPT]**; no cross-border transfer without written Client authorization and lawful safeguards.

### 3.6 Breach Notification
- Notify the Client **without undue delay and within [24–72] hours** of becoming aware of a personal-data breach, with impact, affected data subjects, and remediation; cooperate fully on notification to authorities/affected individuals.

### 3.7 Retention, Return & Deletion
- Retain only as long as necessary per the agreed retention schedule; on termination, return or securely delete all personal data and provide a deletion certificate (per Part 1 §13).

### 3.8 Audit
- The Client (or its appointee) may audit the Vendor's compliance on reasonable notice, including security assessments and penetration tests (RFP §5.3).

---

# Part 4 — Source-Code Escrow Agreement

### 4.1 Parties & Deposit
- Parties: Client (beneficiary), Vendor (depositor), and **[Escrow Agent]**.
- Deposit materials: source code of all bespoke/custom components, build/deployment scripts, configuration, and documentation sufficient to build and run the platform independently.

### 4.2 Updates & Verification
- Deposits updated on each major release and at least **[every 6 months]**.
- The Client may request **verification** that deposited materials build and run as represented.

### 4.3 Release Conditions (Triggers)
Materials are released to the Client upon: Vendor insolvency/liquidation; cessation of business/abandonment; sustained material SLA failure uncured per Part 1 §11.1; or failure to provide contracted support.

### 4.4 Beneficiary Rights on Release
- A non-exclusive, perpetual, royalty-free license to use, maintain, and modify the released materials solely to operate and support the platform for the Client's schools.

Signed: Client __________ Vendor __________ Escrow Agent __________ Date: __________
