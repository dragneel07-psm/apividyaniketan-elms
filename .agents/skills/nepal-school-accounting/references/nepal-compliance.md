# Nepal Accounting and School Compliance

This reference routes research; it is not legal or tax advice. Rates and requirements change by fiscal year, school legal form, province, municipality, transaction type, and counterparty status.

## Verification rule

Before implementing a compliance-sensitive field, calculation, report, deadline, or validation:

1. Determine the transaction date, Nepal fiscal year, school legal form, PAN/VAT status, municipality/province, employee or vendor status, and applicable accounting framework.
2. Check the latest amending Finance Act and official notice, not only the base Act or an old FAQ.
3. Prefer an enacted Act, regulation, Gazette/official notice, or regulator publication over blogs, vendor pages, or examples.
4. Store `source_title`, `source_url`, `section_or_rule`, `jurisdiction`, `fiscal_year`, `effective_from`, `effective_to`, `verified_on`, `verified_by`, `approved_by`, and a rule-set version.
5. Mark interpretations and local policy separately from legal mandates.
6. Fail closed when an approved current rule is unavailable. Ask an authorized accountant or legal adviser to approve the configuration.

## Official source registry

Use these starting points and check for later amendments:

- Accounting Standards Board Nepal, NAS for NPOs 2018: https://asbnepal.gov.np/nas-for-npos-2018
- ASB Nepal publications and carve-outs: https://asbnepal.gov.np/publication
- Inland Revenue Department: https://ird.gov.np/
- Income Tax Act, 2058 official IRD publication: https://www.ird.gov.np/public/pdf/2043238011.pdf
- Value Added Tax Act, 2052 official IRD publication: https://www.ird.gov.np/public/pdf/1140227555.pdf
- Ministry of Finance, current budget and Finance Act: https://www.mof.gov.np/
- Social Security Fund acts, regulations, procedures, and amendments: https://www.ssf.gov.np/list/act_regulation
- Ministry of Labour, Labour Act 2074: https://moless.gov.np/content/11121/11121-%25E0%25A4%25B6%25E0%25A5%258D%25E0%25A4%25B0%25E0%25A4%25AE-%25E0%25A4%2590%25E0%25A4%25A8-%25E0%25A5%25A8%25E0%25A5%25A6%25E0%25A5%25AD%25E0%25A5%25AA/
- Nepal Law Commission, Labour Rules 2075: https://repository.lawcommission.gov.np/np/category/documents/prevailing-law/rules-and-regulations/%E0%A4%B6%E0%A5%8D%E0%A4%B0%E0%A4%AE-%E0%A4%A8%E0%A4%BF%E0%A4%AF%E0%A4%AE%E0%A4%BE%E0%A4%B5%E0%A4%B2%E0%A5%80-%E0%A5%A8%E0%A5%A6%E0%A5%AD%E0%A5%AB/
- Nepal Law Commission, Education Act 2028: https://lawcommission.gov.np/content/12554/12554-education-act-1971/
- Nepal Law Commission, Education Rules 2059: https://lawcommission.gov.np/content/12987/12987-education-regulation-2059/
- Nepal Law Commission, Compulsory and Free Education Act 2075: https://repository.lawcommission.gov.np/np/category/documents/prevailing-law/statutes-acts/%E0%A4%85%E0%A4%A8%E0%A4%BF%E0%A4%B5%E0%A4%BE%E0%A4%B0%E0%A5%8D%E0%A4%AF-%E0%A4%A4%E0%A4%A5%E0%A4%BE-%E0%A4%A8%E0%A4%BF%E0%A4%83%E0%A4%B6%E0%A5%81%E0%A4%B2%E0%A5%8D%E0%A4%95-%E0%A4%B6%E0%A4%BF-2/
- Nepal Law Commission, Compulsory and Free Education Rules 2077: https://repository.lawcommission.gov.np/np/documents/%E0%A4%85%E0%A4%A8%E0%A4%BF%E0%A4%B5%E0%A4%BE%E0%A4%B0%E0%A5%8D%E0%A4%AF-%E0%A4%A4%E0%A4%A5%E0%A4%BE-%E0%A4%A8%E0%A4%BF%E0%A4%83%E0%A4%B6%E0%A5%81%E0%A4%B2%E0%A5%8D%E0%A4%95-%E0%A4%B6%E0%A4%BF/
- Nepal Law Commission, Local Government Operation Act 2074: https://lawcommission.gov.np/content/12760/12760-local-government-regu-/
- Nepal Law Commission, Individual Privacy Act 2075: https://repository.lawcommission.gov.np/np/category/documents/prevailing-law/statutes-acts/%E0%A4%B5%E0%A5%88%E0%A4%AF%E0%A4%95%E0%A5%8D%E0%A4%A4%E0%A4%BF%E0%A4%95-%E0%A4%97%E0%A5%8B%E0%A4%AA%E0%A4%A8%E0%A5%80%E0%A4%AF%E0%A4%A4%E0%A4%BE-%E0%A4%B8%E0%A4%AE%E0%A5%8D%E0%A4%AC%E0%A4%A8%E0%A5%8D/
- Nepal Law Commission, Electronic Transactions Act 2063: https://lawcommission.gov.np/content/13397/

## Applicability questions

- Which accounting framework applies to this tenant? ASB states NAS for NPOs 2018 includes double-entry accrual reporting and became mandatory from 2080 Shrawan 1 for entities within its applicability. Confirm that the tenant meets the definition and check current ASB carve-outs.
- Is the school community/public, institutional/private, company-operated, or educational trust/NPO? Do not infer this from its name.
- Which fee approval, scholarship/free-seat, grant, and reporting rules are imposed by the local government? Model local rules as jurisdictional configuration with evidence.
- Is a supply or service VAT-exempt, zero-rated, or taxable, and is the school entitled to input credit? Resolve per transaction; do not create a blanket `school_vat_exempt` shortcut.
- Which TDS section and rate apply to the exact payment and recipient registration/residency status? Aggregate thresholds using a stable vendor identity and PAN, not vendor name text.
- Which payroll slab, deduction cap, SSF/PF/CIT treatment, insurance relief, remote allowance, or special status applies for that fiscal year? Snapshot inputs and rule version on finalization.
- Which records, approvals, receipts, vouchers, registers, and audit schedules must be retained, and for how long? Obtain an approved retention schedule before automatic deletion.

## Product consequences

- Maintain legal-form, accounting-framework, tax-registration, local-jurisdiction, and rule-version fields on the tenant accounting profile.
- Maintain a supplier/employee tax identity with validation and controlled access.
- Support BS and AD dates without accepting contradictory user-entered values.
- Keep scholarship/free-seat decisions, eligibility evidence, approval committee or authority, funding source, value, and reporting classification auditable.
- Keep receipts and vouchers sequential, reproducible, voidable without number reuse, and exportable with PAN and approved school identity fields where required.
- Expose statutory returns as reviewable drafts; never imply that generating a report files it with a regulator.
