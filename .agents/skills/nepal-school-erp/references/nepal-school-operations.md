# Nepal School Operations and Compliance

This is a research and design guide, not legal advice. Nepal school obligations can vary by public/private/trust status and by federal, provincial, and local law.

## Verify before encoding

For each compliance requirement, record the official source, specific section/rule, issuing authority, jurisdiction, school type, effective dates, verification date, interpretation owner, and approval. Check amendments and applicable local bylaws. Never turn an old example, project comment, or third-party article into a hard-coded national rule.

## Official starting points

- Education Act 2028: https://lawcommission.gov.np/content/12554/12554-education-act-1971/
- Education Rules 2059: https://lawcommission.gov.np/content/12987/12987-education-regulation-2059/
- Compulsory and Free Education Act 2075: https://repository.lawcommission.gov.np/np/category/documents/prevailing-law/statutes-acts/%E0%A4%85%E0%A4%A8%E0%A4%BF%E0%A4%B5%E0%A4%BE%E0%A4%B0%E0%A5%8D%E0%A4%AF-%E0%A4%A4%E0%A4%A5%E0%A4%BE-%E0%A4%A8%E0%A4%BF%E0%A4%83%E0%A4%B6%E0%A5%81%E0%A4%B2%E0%A5%8D%E0%A4%95-%E0%A4%B6%E0%A4%BF-2/
- Compulsory and Free Education Rules 2077: https://repository.lawcommission.gov.np/np/documents/%E0%A4%85%E0%A4%A8%E0%A4%BF%E0%A4%B5%E0%A4%BE%E0%A4%B0%E0%A5%8D%E0%A4%AF-%E0%A4%A4%E0%A4%A5%E0%A4%BE-%E0%A4%A8%E0%A4%BF%E0%A4%83%E0%A4%B6%E0%A5%81%E0%A4%B2%E0%A5%8D%E0%A4%95-%E0%A4%B6%E0%A4%BF/
- Local Government Operation Act 2074: https://lawcommission.gov.np/content/12760/12760-local-government-regu-/
- Labour Act 2074: https://moless.gov.np/content/11121/11121-%25E0%25A4%25B6%25E0%25A5%258D%25E0%25A4%25B0%25E0%25A4%25AE-%25E0%25A4%2590%25E0%25A4%25A8-%25E0%25A5%25A8%25E0%25A5%25A6%25E0%25A5%25AD%25E0%25A5%25AA/
- Labour Rules 2075: https://repository.lawcommission.gov.np/np/category/documents/prevailing-law/rules-and-regulations/%E0%A4%B6%E0%A5%8D%E0%A4%B0%E0%A4%AE-%E0%A4%A8%E0%A4%BF%E0%A4%AF%E0%A4%AE%E0%A4%BE%E0%A4%B5%E0%A4%B2%E0%A5%80-%E0%A5%A8%E0%A5%A6%E0%A5%AD%E0%A5%AB/
- Social Security Fund rules/procedures: https://www.ssf.gov.np/list/act_regulation
- Individual Privacy Act 2075: https://repository.lawcommission.gov.np/np/category/documents/prevailing-law/statutes-acts/%E0%A4%B5%E0%A5%88%E0%A4%AF%E0%A4%95%E0%A5%8D%E0%A4%A4%E0%A4%BF%E0%A4%95-%E0%A4%97%E0%A5%8B%E0%A4%AA%E0%A4%A8%E0%A5%80%E0%A4%AF%E0%A4%A4%E0%A4%BE-%E0%A4%B8%E0%A4%AE%E0%A5%8D%E0%A4%AC%E0%A4%A8%E0%A5%8D/
- Electronic Transactions Act 2063: https://lawcommission.gov.np/content/13397/
- Accounting and tax sources: invoke `$nepal-school-accounting` and read its compliance reference.

## ERP requirements to make configurable and auditable

### School identity and jurisdiction

Store school category/legal form, registration/licence, approving authority, PAN/VAT status, province, municipality, ward, academic levels, medium/languages, renewal dates, document evidence, and policy versions. A tenant's hostname is not a legal identity.

### Fees and scholarships

Store the approved fee schedule, authority, approval date/reference, academic year, class/level, fee head, effective dates, publication/parent notice, and change history. Represent scholarship/free-seat rules as versioned bands and eligibility criteria by school type and jurisdiction. Preserve application, evidence, selection authority/committee, decision, funding source, benefit value, and appeal/correction history. Do not hard-code one national percentage without resolving overlapping current law and local rules.

### Enrollment and student records

Use state transitions for application, verification, admission, enrollment, promotion, transfer, withdrawal, graduation, and archive. Preserve guardian relationship and authority, prior-school documents, enrollment basis, scholarship status, and transfer evidence. Never delete a student to represent withdrawal.

### Academic operations

Version curricula, grading schemes, pass rules, attendance thresholds, exam structures, report templates, and calendars by academic year and authority. Finalized results require controlled correction and an audit trail. Keep Nepali/English display labels separate from stable codes.

### Employees and payroll

Store contract type, start/end, probation, working schedule, attendance, leave entitlement, pay components, scheme membership, tax identity, approvals, changes, and termination settlement. Resolve current labour, minimum remuneration, SSF/PF/CIT, and tax rules by effective date; do not infer eligibility from job title.

### Privacy and records

Classify minors' identity, contact, guardian, health, disability, caste/ethnicity, scholarship, behavior, attendance, grades, communications, payment, and biometric data as sensitive. Collect only for an approved purpose, restrict by role and relationship, redact logs and exports, control AI use, record sharing/export, and apply an approved retention/legal-hold schedule.

### Local reporting

Make local authority reports reproducible from versioned source data. Store report type, period, filters, template version, generated hash, preparer, reviewer, submission channel/reference, acknowledgement, and correction. Generating a file is not the same as submitting it.
