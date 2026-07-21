# System Design Plan: E-Learning SaaS Platform

## 1. Executive Summary
The E-Learning SaaS Platform is a cloud-native, multi-tenant application designed to provide schools and educational institutions with a comprehensive management system. It features AI-powered tutoring, automated grading, and a scalable architecture that ensures data isolation and performance for every tenant. The system employs a "Database-per-Tenant" strategy for maximum security and scalability.

## 2. High-Level Architecture
The system follows a modern **Micro-Modular Monolith** architecture, splitting responsibilities clearly between a high-performance frontend and a robust, logic-heavy backend.

### Architecture Diagram (Conceptual)
```mermaid
graph TD
    Client[Web/Mobile Clients] -->|HTTPS/JSON| LB[Load Balancer]
    LB --> FE[Next.js Frontend Server]
    FE -->|API Calls (JWT)| BE[Django Backend API]
    
    subgraph "Backend Infrastructure"
        BE --> Router[Tenant Router]
        Router -->|Shared Data| SharedDB[(Shared Database)]
        Router -->|Tenant A| TenantADB[(Tenant A Database)]
        Router -->|Tenant B| TenantBDB[(Tenant B Database)]
        
        BE -->|Async Tasks| Redis[Redis / Celery]
        BE -->|AI Logic| AI[AI Engine Service]
        AI -->|LLM API| OpenAI[OpenAI / LLM Provider]
    end
```

## 3. Technology Stack

### Frontend (Client-Side)
- **Framework**: Next.js 15+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + ShadcnUI (Radix Primitives)
- **State Management**: React Hooks + Context (Minimal external state libs)
- **Fetching**: Native `fetch` with centralized API client wrapper (`lib/api.ts`)

### Backend (Server-Side)
- **Framework**: Django 5.x + Django Rest Framework (DRF)
- **Language**: Python 3.11+
- **Authentication**: `rest_framework_simplejwt` (JWT Access/Refresh tokens)
- **Task Queue**: Celery (for grading, report generation, email sending)
- **Cache**: Redis

### Database Layer
- **Strategy**: Multi-tenancy with **Database-per-Tenant** isolation.
- **Engine**: PostgreSQL (Production) / SQLite (Dev/Proto).
- **Routing**: Custom Django Database Router (`TenantDatabaseRouter`) based on app labels.

## 4. Database Design & Multi-Tenancy

### Shared Database (`default`)
Stores global data required for routing and billing.
- **Apps**: `core`, `billing`, `users` (Global Admin only)
- **Key Models**:
    - `Tenant`: Stores `tenant_id`, `subdomain`, `db_name`, `status`.
    - `Domain`: Maps custom domains to tenants.
    - `Subscription`: Global billing and plan limits.

### Tenant Databases (`school_xyz`)
Stores private data isolated for each school.
- **Apps**: `users` (School Users), `academic`, `ai_engine`, `notifications`
- **Key Models**:
    - `UserAccount`: Local users (Student, Teacher, Parent) specific to this tenant.
    - `AcademicClass`: Classes and sections.
    - `Course`, `Lesson`, `Assessment`: Curriculum content.
    - `Student`, `Teacher`: Profiles linked to `UserAccount`.

### Tenant Resolution Flow
1. **Request Ingress**: Middleware (`TenantMiddleware`) intercepts request.
2. **Identification**: Extracts subdomain (e.g., `school-a.app.com`) or header (`X-Tenant-ID`).
3. **Lookup**: Queries `SharedDB` to find `Tenant` object.
4. **Context**: Sets thread-local storage with tenant info.
5. **Routing**: Database Router directs queries to `school_a_db` for tenant-specific apps.

## 5. Module Breakdown

### A. Core & Authentication
- Centralized user management with Role-Based Access Control (RBAC).
- **Roles**: `SaaS Admin`, `School Admin`, `Teacher`, `Student`, `Parent`.
- Secure Password Reset functionality (Tenant-aware).

### B. Academic Management
- **Class Implementation**: Manage Grades, Sections, and Academic Years.
- **Curriculum**: Courses -> Lessons -> Attachments (PDF/Video).
- **Assessments**: Quizzes, Assignments, and Exams with Due Dates.

### C. AI Engine
- **AI Tutor**: Context-aware chatbot for students (Subject-specific help).
- **Auto-Grader**: NLP-based automated assessment grading service.
- **Analytics**: "Weak Area" detection based on student performance.

### D. Billing (SaaS)
- Subscription Management (Bronze, Silver, Gold).
- Invoicing and Payment Gateway integration (Stripe/Razorpay).
- Usage limits enforcement (Storage, AI Tokens).

## 6. Security & Scalability

### Security
- **Isolation**: Physical data separation prevents cross-tenant data leaks.
- **Network**: All API traffic encrypted via TLS 1.3.
- **API Security**: Rate limiting per tenant, CORS configuration allowing specific subdomains.

### Scalability
- **Horizontal Scaling**: Backend instances can scale behind a Load Balancer (stateless).
- **Database Scaling**: Each tenant has a dedicated DB; "Noisy Neighbor" problem is minimized. Large tenants can be moved to dedicated physical servers easily.
- **Async Processing**: Heavy AI tasks are offloaded to Celery workers.

## 7. Deployment Roadmap
1. **Containerization**: Dockerize Backend (Django + Gunicorn) and Frontend (Node.js).
2. **Orchestration**: Kubernetes (K8s) or AWS ECS for managing containers.
3. **Managed DB**: AWS RDS (PostgreSQL) for automated backups and scaling.
4. **Content Delivery**: AWS S3 + CloudFront for serving static media (Lesson Videos/PDFs).
