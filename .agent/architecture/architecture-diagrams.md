# Technical Architecture Diagrams
## AI-Powered Multi-Tenant School Management Platform

**Version:** 1.0  
**Date:** January 19, 2026

---

## Architecture Overview

This document contains Mermaid diagrams that can be rendered in GitHub, VS Code, or any Mermaid-compatible viewer.

---

## 1. System Architecture (High-Level)

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web Browser]
        MOBILE[Mobile App<br/>Future]
    end

    subgraph "CDN & Load Balancer"
        CF[Cloudflare CDN]
        LB[Load Balancer]
    end

    subgraph "Application Layer"
        FE[Next.js Frontend<br/>Vercel]
        BE[Django Backend<br/>DigitalOcean/AWS]
    end

    subgraph "Data Layer"
        REDIS[(Redis Cache)]
        PG_DEFAULT[(PostgreSQL<br/>Default DB)]
        PG_T1[(PostgreSQL<br/>Tenant 1 DB)]
        PG_T2[(PostgreSQL<br/>Tenant 2 DB)]
        PG_TN[(PostgreSQL<br/>Tenant N DB)]
    end

    subgraph "External Services"
        OPENAI[OpenAI API<br/>GPT-4]
        GEMINI[Google Gemini<br/>Fallback]
        EMAIL[SendGrid<br/>Email Service]
        S3[AWS S3<br/>File Storage]
    end

    subgraph "Monitoring & Logging"
        SENTRY[Sentry<br/>Error Tracking]
        DATADOG[DataDog<br/>Monitoring]
    end

    WEB --> CF
    MOBILE -.-> CF
    CF --> LB
    LB --> FE
    FE --> BE
    BE --> REDIS
    BE --> PG_DEFAULT
    BE --> PG_T1
    BE --> PG_T2
    BE --> PG_TN
    BE --> OPENAI
    BE -.-> GEMINI
    BE --> EMAIL
    BE --> S3
    BE --> SENTRY
    BE --> DATADOG

    style WEB fill:#4A90E2
    style FE fill:#50E3C2
    style BE fill:#F5A623
    style PG_DEFAULT fill:#BD10E0
    style PG_T1 fill:#BD10E0
    style OPENAI fill:#7ED321
```

---

## 2. Multi-Tenant Architecture

```mermaid
graph TB
    subgraph "Request Flow"
        REQ[HTTP Request<br/>school1.platform.com]
    end

    subgraph "Tenant Middleware"
        TM[Tenant Middleware<br/>Extract Subdomain]
        TL[Tenant Lookup<br/>Get Tenant Object]
        DBA[Set DB Alias<br/>tenant.db_alias]
    end

    subgraph "Database Router"
        DR[Database Router<br/>Route Query]
        SHARED{Is Shared<br/>App?}
        TENANT{Is Tenant<br/>App?}
    end

    subgraph "Databases"
        DEFAULT[(Default DB<br/>Tenants, Users, Billing)]
        SCHOOL1[(School 1 DB<br/>Students, Classes, etc.)]
        SCHOOL2[(School 2 DB<br/>Students, Classes, etc.)]
    end

    REQ --> TM
    TM --> TL
    TL --> DBA
    DBA --> DR
    DR --> SHARED
    DR --> TENANT
    SHARED -->|Yes| DEFAULT
    TENANT -->|Yes| SCHOOL1
    TENANT -->|Yes| SCHOOL2

    style REQ fill:#4A90E2
    style TM fill:#F5A623
    style DR fill:#50E3C2
    style DEFAULT fill:#BD10E0
    style SCHOOL1 fill:#7ED321
    style SCHOOL2 fill:#7ED321
```

---

## 3. Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant BE as Backend
    participant DB as Database
    participant JWT as JWT Service

    U->>FE: Enter credentials
    FE->>BE: POST /api/auth/login
    BE->>DB: Verify credentials
    DB-->>BE: User found
    BE->>JWT: Generate tokens
    JWT-->>BE: Access + Refresh tokens
    BE-->>FE: Return tokens
    FE->>FE: Store in localStorage
    FE-->>U: Redirect to dashboard

    Note over FE,BE: Subsequent Requests
    U->>FE: Access protected page
    FE->>BE: GET /api/students<br/>Authorization: Bearer {token}
    BE->>JWT: Validate token
    JWT-->>BE: Token valid
    BE->>DB: Query students
    DB-->>BE: Return data
    BE-->>FE: Return JSON
    FE-->>U: Display data
```

---

## 4. Multi-Tenant Request Flow

```mermaid
sequenceDiagram
    participant C as Client<br/>school1.platform.com
    participant M as Tenant Middleware
    participant R as Database Router
    participant D1 as Default DB
    participant T1 as School 1 DB

    C->>M: GET /api/students
    M->>M: Extract subdomain: school1
    M->>D1: SELECT * FROM tenants<br/>WHERE subdomain='school1'
    D1-->>M: Tenant(id=1, db_alias='school1_db')
    M->>M: Set request.tenant = Tenant(1)
    M->>M: Set request.db_alias = 'school1_db'
    M->>R: Query Student.objects.all()
    R->>R: Check app_label: 'academic'
    R->>R: Is 'academic' in TENANT_APPS? Yes
    R->>T1: SELECT * FROM students<br/>USING school1_db
    T1-->>R: Return students
    R-->>M: Return queryset
    M-->>C: Return JSON response
```

---

## 5. AI Integration Architecture

```mermaid
graph TB
    subgraph "Frontend"
        CHAT[AI Tutor Chat UI]
        GRADE[Auto-Grade UI]
    end

    subgraph "Backend - AI Service Layer"
        ABS[AI Abstraction Layer]
        CACHE[Response Cache<br/>Redis]
        LIMIT[Rate Limiter<br/>Token Counter]
    end

    subgraph "AI Providers"
        OAI[OpenAI GPT-4<br/>Primary]
        GEM[Google Gemini<br/>Fallback]
    end

    subgraph "Database"
        CONV[(Conversation<br/>History)]
        USAGE[(Token Usage<br/>Tracking)]
    end

    CHAT --> ABS
    GRADE --> ABS
    ABS --> CACHE
    CACHE -->|Cache Miss| LIMIT
    LIMIT --> OAI
    OAI -.->|Failure| GEM
    OAI --> CONV
    OAI --> USAGE
    CACHE -->|Cache Hit| CHAT

    style CHAT fill:#4A90E2
    style ABS fill:#F5A623
    style CACHE fill:#50E3C2
    style OAI fill:#7ED321
    style GEM fill:#7ED321
```

---

## 6. Data Model (Core Entities)

```mermaid
erDiagram
    TENANT ||--o{ USER : has
    TENANT ||--o{ ACADEMIC_CLASS : has
    TENANT ||--o{ SUBSCRIPTION : has
    
    USER ||--o| STUDENT : "is a"
    USER ||--o| TEACHER : "is a"
    USER ||--o| PARENT : "is a"
    
    ACADEMIC_CLASS ||--o{ STUDENT : contains
    ACADEMIC_CLASS ||--o{ COURSE : has
    ACADEMIC_CLASS ||--o{ TEACHER : "assigned to"
    
    COURSE ||--o{ LESSON : contains
    COURSE ||--o{ ASSESSMENT : has
    COURSE }o--|| TEACHER : "taught by"
    
    STUDENT ||--o{ ATTENDANCE : has
    STUDENT ||--o{ SUBMISSION : submits
    STUDENT ||--o{ RESULT : has
    STUDENT ||--o{ STUDENT_FEE : "assigned to"
    
    ASSESSMENT ||--o{ SUBMISSION : receives
    SUBMISSION ||--o| RESULT : "graded as"
    
    PARENT ||--o{ STUDENT : "parent of"
    
    TENANT {
        uuid id PK
        string subdomain
        string name
        string db_alias
        boolean is_active
    }
    
    USER {
        uuid id PK
        uuid tenant_id FK
        string email
        string password_hash
        enum role
        datetime created_at
    }
    
    STUDENT {
        uuid id PK
        uuid user_id FK
        uuid academic_class_id FK
        string roll_number
        date date_of_birth
    }
    
    ACADEMIC_CLASS {
        uuid id PK
        uuid tenant_id FK
        string name
        int grade
        string section
    }
    
    COURSE {
        uuid id PK
        uuid academic_class_id FK
        uuid teacher_id FK
        string subject
        string description
    }
```

---

## 7. API Architecture

```mermaid
graph LR
    subgraph "API Layer"
        REST[REST API<br/>Django REST Framework]
        AUTH[Authentication<br/>JWT]
        PERM[Permissions<br/>RBAC]
    end

    subgraph "Business Logic"
        VIEW[ViewSets]
        SERIAL[Serializers]
        VALID[Validators]
    end

    subgraph "Data Access"
        ORM[Django ORM]
        ROUTER[DB Router]
        CACHE[Query Cache]
    end

    subgraph "Database"
        DB[(PostgreSQL)]
    end

    REST --> AUTH
    AUTH --> PERM
    PERM --> VIEW
    VIEW --> SERIAL
    SERIAL --> VALID
    VALID --> ORM
    ORM --> ROUTER
    ROUTER --> CACHE
    CACHE --> DB

    style REST fill:#4A90E2
    style VIEW fill:#F5A623
    style ORM fill:#50E3C2
    style DB fill:#BD10E0
```

---

## 8. Frontend Architecture

```mermaid
graph TB
    subgraph "Next.js Application"
        PAGES[Pages<br/>App Router]
        COMP[Components<br/>React]
        HOOKS[Custom Hooks]
    end

    subgraph "State Management"
        CTX[Context API<br/>Auth State]
        SWR[SWR<br/>Server State]
        LOCAL[Local State<br/>useState]
    end

    subgraph "UI Layer"
        SHADCN[shadcn/ui<br/>Components]
        TAILWIND[Tailwind CSS<br/>Styling]
    end

    subgraph "API Client"
        FETCH[Fetch Wrapper<br/>apiRequest]
        TYPES[TypeScript Types]
    end

    PAGES --> COMP
    COMP --> HOOKS
    HOOKS --> CTX
    HOOKS --> SWR
    COMP --> LOCAL
    COMP --> SHADCN
    SHADCN --> TAILWIND
    HOOKS --> FETCH
    FETCH --> TYPES

    style PAGES fill:#4A90E2
    style COMP fill:#50E3C2
    style SWR fill:#F5A623
    style SHADCN fill:#7ED321
```

---

## 9. Deployment Architecture

```mermaid
graph TB
    subgraph "Development"
        DEV_FE[Frontend Dev<br/>localhost:3000]
        DEV_BE[Backend Dev<br/>localhost:8000]
        DEV_DB[(SQLite)]
    end

    subgraph "Staging"
        STG_FE[Frontend Staging<br/>Vercel Preview]
        STG_BE[Backend Staging<br/>DO App Platform]
        STG_DB[(PostgreSQL<br/>Staging)]
    end

    subgraph "Production"
        PROD_FE[Frontend Prod<br/>Vercel]
        PROD_BE[Backend Prod<br/>DO App Platform]
        PROD_DB[(PostgreSQL<br/>Production)]
        PROD_REDIS[(Redis)]
        PROD_S3[S3 Storage]
    end

    subgraph "CI/CD"
        GH[GitHub]
        GHA[GitHub Actions]
    end

    DEV_FE -.-> GH
    DEV_BE -.-> GH
    GH --> GHA
    GHA -->|Deploy| STG_FE
    GHA -->|Deploy| STG_BE
    GHA -->|Approval| PROD_FE
    GHA -->|Approval| PROD_BE

    style DEV_FE fill:#4A90E2
    style STG_FE fill:#F5A623
    style PROD_FE fill:#7ED321
    style GHA fill:#BD10E0
```

---

## 10. Security Architecture

```mermaid
graph TB
    subgraph "External Threats"
        ATTACKER[Potential Attacker]
    end

    subgraph "Security Layers"
        CF[Cloudflare<br/>DDoS Protection]
        WAF[Web Application<br/>Firewall]
        HTTPS[HTTPS/TLS 1.3<br/>Encryption]
    end

    subgraph "Application Security"
        AUTH[JWT Authentication]
        RBAC[Role-Based<br/>Access Control]
        CSRF[CSRF Protection]
        XSS[XSS Prevention]
        SQL[SQL Injection<br/>Prevention]
    end

    subgraph "Data Security"
        ENCRYPT[Data Encryption<br/>at Rest]
        BACKUP[Encrypted<br/>Backups]
        AUDIT[Audit Logs]
    end

    ATTACKER -.->|Attack| CF
    CF --> WAF
    WAF --> HTTPS
    HTTPS --> AUTH
    AUTH --> RBAC
    RBAC --> CSRF
    CSRF --> XSS
    XSS --> SQL
    SQL --> ENCRYPT
    ENCRYPT --> BACKUP
    BACKUP --> AUDIT

    style ATTACKER fill:#FF0000
    style CF fill:#F5A623
    style AUTH fill:#7ED321
    style ENCRYPT fill:#BD10E0
```

---

## 11. CI/CD Pipeline

```mermaid
graph LR
    subgraph "Developer"
        CODE[Write Code]
        COMMIT[Git Commit]
        PUSH[Git Push]
    end

    subgraph "GitHub Actions"
        LINT[Lint Check<br/>ESLint, Black]
        TEST[Run Tests<br/>Jest, Pytest]
        BUILD[Build<br/>Docker Images]
        SCAN[Security Scan<br/>Snyk]
    end

    subgraph "Deployment"
        STG[Deploy to<br/>Staging]
        SMOKE[Smoke Tests]
        APPROVE[Manual<br/>Approval]
        PROD[Deploy to<br/>Production]
    end

    CODE --> COMMIT
    COMMIT --> PUSH
    PUSH --> LINT
    LINT --> TEST
    TEST --> BUILD
    BUILD --> SCAN
    SCAN --> STG
    STG --> SMOKE
    SMOKE --> APPROVE
    APPROVE --> PROD

    style CODE fill:#4A90E2
    style TEST fill:#F5A623
    style SCAN fill:#FF6B6B
    style PROD fill:#7ED321
```

---

## 12. Monitoring & Observability

```mermaid
graph TB
    subgraph "Application"
        APP[Django Backend<br/>Next.js Frontend]
    end

    subgraph "Metrics Collection"
        PROM[Prometheus<br/>Metrics]
        LOGS[Centralized<br/>Logging]
        TRACES[Distributed<br/>Tracing]
    end

    subgraph "Monitoring Tools"
        DATADOG[DataDog<br/>APM]
        SENTRY[Sentry<br/>Error Tracking]
        UPTIME[Uptime Robot<br/>Availability]
    end

    subgraph "Alerting"
        SLACK[Slack<br/>Notifications]
        EMAIL[Email<br/>Alerts]
        PAGER[PagerDuty<br/>On-Call]
    end

    APP --> PROM
    APP --> LOGS
    APP --> TRACES
    PROM --> DATADOG
    LOGS --> DATADOG
    TRACES --> DATADOG
    APP --> SENTRY
    APP --> UPTIME
    DATADOG --> SLACK
    SENTRY --> SLACK
    UPTIME --> EMAIL
    DATADOG -.->|Critical| PAGER

    style APP fill:#4A90E2
    style DATADOG fill:#7ED321
    style SENTRY fill:#FF6B6B
    style SLACK fill:#F5A623
```

---

## How to View These Diagrams

### Option 1: GitHub (Recommended)
1. Push this file to your GitHub repository
2. View it on GitHub - diagrams will render automatically

### Option 2: VS Code
1. Install "Markdown Preview Mermaid Support" extension
2. Open this file in VS Code
3. Press `Cmd+Shift+V` (Mac) or `Ctrl+Shift+V` (Windows)

### Option 3: Mermaid Live Editor
1. Go to https://mermaid.live
2. Copy and paste any diagram code
3. View and export as PNG/SVG

### Option 4: Generate Images
```bash
# Install mermaid-cli
npm install -g @mermaid-js/mermaid-cli

# Generate PNG images
mmdc -i architecture-diagrams.md -o diagrams/
```

---

## Diagram Descriptions

### 1. System Architecture
Shows the complete system with all layers: client, CDN, application, data, external services, and monitoring.

### 2. Multi-Tenant Architecture
Illustrates how tenant isolation works with database-per-tenant approach.

### 3. Authentication Flow
Sequence diagram showing login and subsequent authenticated requests.

### 4. Multi-Tenant Request Flow
Detailed sequence of how a request is routed to the correct tenant database.

### 5. AI Integration Architecture
Shows how AI features are integrated with caching and fallback mechanisms.

### 6. Data Model
Entity-relationship diagram of core database entities.

### 7. API Architecture
Layers of the REST API from request to database.

### 8. Frontend Architecture
Next.js application structure with state management and UI layers.

### 9. Deployment Architecture
Development, staging, and production environments with CI/CD flow.

### 10. Security Architecture
Multiple layers of security from external threats to data protection.

### 11. CI/CD Pipeline
Automated pipeline from code commit to production deployment.

### 12. Monitoring & Observability
How the application is monitored and alerts are sent.

---

**Document Owner**: Technical Lead  
**Last Updated**: January 19, 2026  
**Review Cycle**: Quarterly or when architecture changes
