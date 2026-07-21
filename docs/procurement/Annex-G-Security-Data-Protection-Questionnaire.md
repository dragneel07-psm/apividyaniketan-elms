# Annex G — Security & Data-Protection Questionnaire

**RFP Reference No.:** _____ /SW-LMS/2082-83
**Bidder/Firm Name:** ____________________________

## Instructions
1. Answer **every** question. Use **Yes / Partial / No / N/A** in the **Response** column and provide specifics/evidence in **Details**.
2. This platform serves **minors**; child-data protection answers are weighted heavily (RFP §5, §13). Vague or evasive answers are scored as **No**.
3. Attach supporting evidence (policies, certificates, audit/pen-test reports ≤ 24 months old, architecture diagrams). Reference the attachment in **Details**.
4. False statements are grounds for disqualification and may trigger debarment.

---

## G.1 Governance, Certifications & Compliance
| # | Question | Response | Details / Evidence |
|---|---|---|---|
| G1.1 | Do you hold ISO 27001, SOC 2, or equivalent? (attach) | | |
| G1.2 | Do you have a documented Information Security Policy and an accountable security officer? | | |
| G1.3 | Do you comply with applicable data-protection & children's-data law **[ADAPT]**? | | |
| G1.4 | Will you sign the DPA (Annex E, Part 3) without material deviation? | | |
| G1.5 | Frequency of internal security risk assessments? | | |

## G.2 Secure Development (SDLC)
| # | Question | Response | Details / Evidence |
|---|---|---|---|
| G2.1 | Do you follow a secure SDLC (threat modeling, code review, security testing)? | | |
| G2.2 | Are static/dynamic/dependency scans (SAST/DAST/SCA) run in CI? | | |
| G2.3 | Is secret scanning enforced; are credentials kept out of source? | | |
| G2.4 | How are third-party/open-source dependencies tracked and patched? | | |

## G.3 Authentication & Access Control
| # | Question | Response | Details / Evidence |
|---|---|---|---|
| G3.1 | Are passwords stored only as salted hashes? Algorithm? | | |
| G3.2 | Is MFA enforced for administrative roles? | | |
| G3.3 | Are role/function/object-level authorization controls enforced server-side? | | |
| G3.4 | Brute-force protection (lockout, throttling) on auth endpoints? | | |
| G3.5 | Session/token management (expiry, rotation, revocation on logout)? | | |
| G3.6 | Is there any unauthenticated access to personal data? (must be No) | | |

## G.4 Multi-Tenant Isolation (critical)
| # | Question | Response | Details / Evidence |
|---|---|---|---|
| G4.1 | Describe the tenant isolation model (schema/DB/row-level). | | |
| G4.2 | How is cross-tenant read/write prevented and tested? | | |
| G4.3 | Can you demonstrate, at UAT, that School A cannot access School B's data? | | |
| G4.4 | Is tenant context enforced in background jobs and real-time channels? | | |

## G.5 Encryption & Key Management
| # | Question | Response | Details / Evidence |
|---|---|---|---|
| G5.1 | TLS version enforced in transit (1.2+/1.3)? | | |
| G5.2 | Encryption at rest for database, backups, and file storage? Algorithm? | | |
| G5.3 | Key management approach (KMS/HSM), rotation, and access control? | | |

## G.6 Data Protection, Privacy & Children's Data
| # | Question | Response | Details / Evidence |
|---|---|---|---|
| G6.1 | How is data minimization applied to minors' data? | | |
| G6.2 | Is PII redacted before any third-party/AI/LLM processing? | | |
| G6.3 | Are data-subject rights (access/correction/deletion) supported within tenant boundaries? | | |
| G6.4 | Documented data-retention and secure-disposal schedule? | | |
| G6.5 | Any profiling/marketing use of minors' data? (must be No) | | |
| G6.6 | Consent capture/management for data processing? | | |

## G.7 Hosting, Residency & Network
| # | Question | Response | Details / Evidence |
|---|---|---|---|
| G7.1 | Where will personal data be stored/processed (region/data centre)? | | |
| G7.2 | Can you meet data residency in **[Nepal / Government Cloud]** **[ADAPT]**? | | |
| G7.3 | Separate production/staging/test environments? | | |
| G7.4 | Network controls (WAF, DDoS protection, firewalling, segmentation)? | | |

## G.8 Logging, Monitoring & Audit
| # | Question | Response | Details / Evidence |
|---|---|---|---|
| G8.1 | Are sensitive actions (logins, data changes, result publication, financial txns, password resets) audit-logged? | | |
| G8.2 | Are audit logs immutable, time-stamped, and exportable? | | |
| G8.3 | Security monitoring/alerting and log retention period? | | |

## G.9 Vulnerability Management & Testing
| # | Question | Response | Details / Evidence |
|---|---|---|---|
| G9.1 | Frequency of vulnerability scanning and patch SLAs by severity? | | |
| G9.2 | Date and scope of last independent penetration test (attach summary)? | | |
| G9.3 | Process for remediating critical/high findings and timelines? | | |
| G9.4 | Do you operate a responsible-disclosure / bug-reporting channel? | | |

## G.10 Incident Response & Breach Notification
| # | Question | Response | Details / Evidence |
|---|---|---|---|
| G10.1 | Documented incident-response plan? Tested how often? | | |
| G10.2 | Breach notification commitment to the Client within **[24–72]h**? | | |
| G10.3 | Forensics, root-cause, and post-incident review process? | | |

## G.11 Payment Security (Finance module)
| # | Question | Response | Details / Evidence |
|---|---|---|---|
| G11.1 | Are all gateway callbacks (eSewa/Khalti/ConnectIPS) verified server-side before recording? | | |
| G11.2 | Is payment recording idempotent (no double-credit on retries)? | | |
| G11.3 | Is the amount validated against the authoritative fee record (no client-supplied amount trust)? | | |
| G11.4 | Are card/payment secrets handled per gateway/PCI guidance (no raw card storage)? | | |

## G.12 Backup, DR & Business Continuity
| # | Question | Response | Details / Evidence |
|---|---|---|---|
| G12.1 | Backup frequency, encryption, and tested restore process? | | |
| G12.2 | Stated RPO/RTO (target RPO ≤ 24h, RTO ≤ 4h)? | | |
| G12.3 | Geographically separate backup/DR location? | | |

## G.13 Sub-processors & Supply Chain
| # | Question | Response | Details / Evidence |
|---|---|---|---|
| G13.1 | List all sub-processors (cloud, SMS, email, payments, AI/LLM) and their locations. | | |
| G13.2 | Will you obtain prior written approval before adding/changing sub-processors? | | |
| G13.3 | Are equivalent security/DPA obligations flowed down to sub-processors? | | |

## G.14 Personnel & Exit Security
| # | Question | Response | Details / Evidence |
|---|---|---|---|
| G14.1 | Background checks and confidentiality agreements for staff with data access? | | |
| G14.2 | Least-privilege access for support staff; access logged/reviewed? | | |
| G14.3 | On exit, can you provide full data export (open formats) + secure-deletion certificate? | | |
| G14.4 | Source-code escrow for custom components (Annex E, Part 4)? | | |

---

**Declaration:** The responses above are true and complete to the best of our knowledge.
**Authorized Signature:** ____________________ **Name/Designation:** ____________________ **Date:** __________ **Seal:**
