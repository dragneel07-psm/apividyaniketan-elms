# Testing Folder Structure

This repository uses a centralized `tests/` directory for end-to-end and future automation layers.

## Tree

```text
tests/
├── README.md
├── accessibility/
│   └── .gitkeep
├── e2e/
│   ├── admin/
│   │   └── .gitkeep
│   ├── auth/
│   │   └── .gitkeep
│   ├── critical/
│   │   └── lms-critical.spec.ts
│   ├── smoke/
│   │   └── example.spec.ts
│   ├── student/
│   │   └── .gitkeep
│   └── teacher/
│       └── .gitkeep
├── fixtures/
│   ├── data/
│   │   └── .gitkeep
│   └── files/
│       └── sample-upload.pdf
├── helpers/
│   ├── api/
│   │   └── .gitkeep
│   ├── auth/
│   │   └── .gitkeep
│   └── ui/
│       └── .gitkeep
├── performance/
│   └── .gitkeep
├── reports/
│   └── .gitkeep
├── setup/
│   └── .gitkeep
└── visual/
    └── .gitkeep
```

## Purpose

- `e2e/critical`: high-priority LMS business flows (auth, student, teacher, admin).
- `e2e/smoke`: basic platform sanity checks.
- `fixtures/files`: binary/static files for upload/download test paths.
- `fixtures/data`: JSON/CSV test payloads.
- `helpers/*`: shared test utilities, API clients, and auth setup helpers.
- `setup`: global setup/teardown hooks when needed.
- `accessibility`, `performance`, `visual`: reserved suites for specialized quality gates.
- `reports`: artifacts if you choose to store custom summaries/screenshots.

## Run

- `npm run test:e2e`
- `npm run test:e2e:critical`
- `npm run test:e2e:smoke`
- `npm run test:e2e:scale`

## Deployed Scale Run

`test:e2e:scale` seeds and validates a large LMS dataset on a deployed environment:

- 100 students
- 20 teachers
- 3 staff
- 10 classes (with sections)
- subjects, chapters, lessons, and lesson materials

Required env vars for deployed execution:

- `E2E_BASE_URL` (frontend URL)
- `E2E_API_URL` (backend URL)
- `E2E_ADMIN_EMAIL`
- `E2E_ADMIN_PASSWORD`
- `E2E_ADMIN_SCHOOL_CODE` (or `E2E_TENANT`)

Optional size overrides:

- `E2E_DUMMY_STUDENTS`
- `E2E_DUMMY_TEACHERS`
- `E2E_DUMMY_STAFF`
- `E2E_DUMMY_CLASSES`
- `E2E_DUMMY_SUBJECTS_PER_CLASS`
- `E2E_DUMMY_CHAPTERS_PER_SUBJECT`
- `E2E_DUMMY_LESSONS_PER_CHAPTER`
