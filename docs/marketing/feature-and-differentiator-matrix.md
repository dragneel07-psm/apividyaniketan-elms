# Feature And Differentiator Matrix

**Last updated:** March 14, 2026
**Audience:** product marketing, sales enablement, partnerships, proposal writers
**Purpose:** provide a feature-backed comparison story that explains why the platform stands apart from a typical LMS, SIS, or school ERP.

## 1. How To Use This Document

Use this document when you need to:

- prepare a sales deck
- answer “how are you different?”
- write proposal responses
- prepare website feature pages
- build internal battlecards

This is written as an **internal marketing source document**, not as public website copy.

## 2. High-Level Product Coverage

| Product area | What is already represented in the repo |
| --- | --- |
| SaaS administration | tenant management, plans, billing views, school management, health, audit, settings |
| School administration | academic years, classes, sections, subjects, teachers, students, parents, admissions |
| Teaching and learning | lessons, resources, assignments, quizzes, exams, grading, timetable, reports |
| AI | tutor, quiz generation, exam generation, lesson summaries, risk analytics, admin assistant, AI grading |
| Student portal | learning, assessments, timetable, grades, fees, library, notices, notifications, messages |
| Parent portal | child progress, attendance, grades, fees, leaves, meetings, notices, messages |
| Finance | fee structures, collections, reports, student payments, receipts, digital gateways |
| Operations | library, hostel, transport, inventory, HR/payroll, notices, communications |
| Experience layer | web app, PWA/offline routes, mobile app screens, school landing pages |

## 3. Main Differentiators Against Typical Platforms

### Differentiator 1: Not just an LMS

Typical LMS products focus on:

- content delivery
- assignments
- quizzes
- grades

This platform adds:

- admissions
- school ERP views
- fee collection and payment workflows
- parent portal
- library, transport, hostel, inventory, HR/payroll
- tenant-level SaaS controls

Why this matters:

- schools can replace more tools
- leadership gets stronger ROI from one deployment
- operations and academics share one source of truth

### Differentiator 2: Not just a school ERP

Typical ERPs focus on:

- records
- attendance
- fee ledgers
- notices

This platform also includes:

- chapters, lessons, resources
- assignments and assessments
- grading workflows
- AI tutor and personalized study support
- teacher-facing AI assistance

Why this matters:

- the system becomes daily-use software, not just an admin record book

### Differentiator 3: AI is embedded into product workflows

Typical “AI-enabled” platforms often stop at:

- a chatbot
- content recommendations
- generic analytics summaries

This platform includes:

- AI tutor
- lesson summaries
- quiz generation
- exam generation
- rubric-based AI draft grading with human approval
- at-risk student analytics
- ERP admin assistant with structured school facts

Why this matters:

- AI becomes part of teacher/admin work instead of a separate gimmick

### Differentiator 4: Built for SaaS scaling

Typical school products are deployed as single-instance systems.

This platform includes:

- schema-based tenant isolation
- per-tenant routing
- SaaS admin views
- plan management
- tenant-aware branding and landing pages
- custom domain support

Why this matters:

- supports school groups
- supports white-label or multi-school commercialization
- supports future expansion without rebuilding architecture

### Differentiator 5: Branded tenant experience

Typical platforms give every customer the same login surface.

This platform supports:

- tenant-aware school landing pages
- school-specific login flows
- custom domain handling
- school-specific identity resolution

Why this matters:

- each school feels ownership of the product
- easier go-to-market for white-label and school-group deals

### Differentiator 6: Academic year rollover with real controls

Typical school software handles year changes manually or with limited migration tools.

This platform includes:

- rollover preview
- dry run behavior
- migration options by asset type
- auto-promotion logic
- manual promote/hold overrides
- promotion exceptions review
- publication audit

Why this matters:

- reduces annual migration risk
- improves admin trust
- makes year-end operations a sellable feature

### Differentiator 7: Regional fee payment support

The platform includes:

- eSewa payment initiation and callback support
- Khalti payment initiation and callback support

Why this matters:

- improves practical fit for Nepal-market schools
- supports a stronger local commercial story than generic global-only billing tools

### Differentiator 8: Trust and accountability features

The platform already includes strong operational trust signals:

- audit logs
- sensitive action audits
- result publication audit
- role-aware permissions
- tenant scoping

Why this matters:

- leadership can see a system designed for institutional accountability, not only classroom convenience

## 4. Detailed Feature Inventory By Buyer Value

## A. Value For School Owners And Leadership

- multi-school management potential
- school operations plus learning in one platform
- admissions funnel visibility
- ERP overview and analytics
- finance and fee management
- custom-branded school portals
- audit and governance visibility
- digital payments
- parent and student engagement channels

Best message:

**Run the institution, not just the classroom.**

## B. Value For Principals And School Admins

- teacher, student, class, and subject management
- academic year setup and rollover
- promotion exception review
- notices and communication
- reports and analytics
- staff access controls
- audit logs
- school system configuration
- admissions conversion to enrolled students

Best message:

**Get operational control with less manual coordination.**

## C. Value For Teachers

- class and course dashboards
- lesson and assessment workflows
- assignment management
- grading tools
- gradebook
- timetable tools
- student profile visibility
- AI tutor ecosystem around learning content
- AI grading draft support
- risk alerts and student insights

Best message:

**Teach faster, assess smarter, and spot struggling students earlier.**

## D. Value For Students

- student dashboard
- lessons and resources
- quizzes and assignments
- timetable and schedule
- grades and reports
- AI tutor
- smart learning support and study guidance
- achievements and leaderboard
- notices, messages, and notifications
- fee and library access
- mobile and offline surfaces

Best message:

**A daily learning workspace, not just a login screen for homework.**

## E. Value For Parents

- child overview
- attendance visibility
- grade visibility
- fee visibility and payment journeys
- meetings and communication
- notices and updates

Best message:

**Stay informed without chasing the school for updates.**

## F. Value For Finance And Operations Teams

- fee structures and dues
- collection workflows
- receipts and payment records
- reporting
- eSewa and Khalti integration
- inventory
- library
- transport
- hostel
- HR/payroll

Best message:

**Bring operational workflows into the same system as academics.**

## 5. Feature Evidence Map

This section helps marketing stay aligned with product reality.

| Marketing claim | Evidence in repo |
| --- | --- |
| Multi-tenant school SaaS platform | `backend/core`, `frontend/app/(saas)/saas`, tenant routing and tenant-check flows |
| School-branded landing pages | `frontend/app/school`, `frontend/lib/tenant.ts`, tenant-check flow |
| Admissions pipeline | `frontend/app/admin/admissions`, `backend/academic/views/admission.py` |
| Academic year rollover and promotion controls | `frontend/app/admin/academic/years`, `frontend/app/admin/academic/promotion-exceptions`, `backend/academic/services/academic_year_service.py` |
| Teacher and student portals | `frontend/app/teacher`, `frontend/app/student` |
| Parent portal | `frontend/app/parent` |
| AI tutor and AI academic tools | `frontend/app/student/ai-tutor`, `docs/ai`, `backend/ai_engine` |
| AI grading with approval | `docs/ai/06-ai-grading.md`, `frontend/app/teacher/grading/[submissionId]` |
| At-risk student analytics | `docs/ai/07-risk-analytics.md`, `frontend/app/admin/ai-analytics`, `frontend/app/teacher` |
| ERP admin assistant | `docs/ai/08-admin-assistant.md`, `backend/ai_engine/services/admin_assistant_service.py` |
| Finance and payment gateways | `frontend/app/admin/finance`, `frontend/app/student/fees`, `backend/billing_school` |
| Auditability | `backend/core/utils/audit.py`, `frontend/app/admin/system/audit-logs`, `frontend/app/(saas)/saas/audit` |
| Mobile and offline support | `mobile/screens`, `frontend/app/offline`, `frontend/app/student/offline` |

## 6. Suggested Comparison Narrative

Use this framing in proposals and pitch meetings:

### Against a standalone LMS

“Those systems help deliver content. This platform helps run the school and improve learning outcomes in the same environment.”

### Against a standalone school ERP

“Those systems help record school operations. This platform also supports teaching, learning, AI guidance, and student engagement.”

### Against generic ‘AI for education’ products

“Those tools often sit outside the institution workflow. This platform places AI directly inside grading, tutoring, planning, analytics, and admin decision support.”

### Against single-school custom software

“Those systems can be hard to scale across branches. This platform is structured as a multi-tenant SaaS foundation from the start.”

## 7. Strongest Homepage Differentiator Blocks

If you only have room for 4 differentiator blocks, use these:

### 1. One platform for the whole school

Academics, finance, communication, operations, and portals together.

### 2. AI that helps teachers and admins work

Tutoring, grading drafts, analytics, and school insight assistants.

### 3. Launch branded portals for every school

Tenant-aware domains, school pages, and role-based experiences.

### 4. Built for scale and trust

Tenant isolation, audit logs, role controls, and operational depth.

## 8. Proposal-Ready Feature Bundles

### Bundle: Smart School Core

- admissions
- students, teachers, classes, subjects
- timetable
- assignments and results
- notices and messaging
- parent and student portals

### Bundle: AI Academic Suite

- AI tutor
- lesson summaries
- quiz generator
- exam generator
- AI grading drafts
- risk analytics

### Bundle: Institutional Operations Suite

- finance
- audit logs
- reports
- library
- transport
- hostel
- HR/payroll
- inventory

### Bundle: Multi-School SaaS Suite

- tenant management
- school branding
- custom domains
- SaaS admin controls
- plans and school lifecycle management

## 9. Marketing Warnings

Do not position the platform as:

- only an LMS
- only a school ERP
- only an AI tutor
- only a student app

The biggest commercial strength is the combination.

Do not claim:

- full autonomous decision-making
- compliance certifications not formally completed
- guaranteed learning outcomes

Use precise language instead:

- AI-assisted
- teacher-approved
- tenant-isolated
- role-based
- workflow-integrated

## 10. Recommended Tagline Directions

- The AI-powered school operating system
- Where school operations and learning work together
- The all-in-one platform for modern schools
- Built for schools that want more than an LMS
- One platform for every school stakeholder

