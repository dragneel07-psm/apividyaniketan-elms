# E-Learning Web App
## AI-Powered Multi-Tenant School Management Platform

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Django](https://img.shields.io/badge/Django-5.1-green.svg)](https://www.djangoproject.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

A comprehensive, AI-powered school management platform designed for K-12 institutions. Built with multi-tenancy, scalability, and modern best practices.

---

## 🎯 Project Overview

### Vision
Revolutionize K-12 education with an affordable, AI-powered, multi-tenant SaaS platform that enables schools to manage students, teachers, courses, assessments, and communication in one unified system.

### Target Market
- Small to medium private schools (100-500 students)
- Growing institutions seeking digital transformation
- Progressive public schools
- Initial focus: South Asia market

### Key Features
- 🏫 **Multi-Tenant Architecture** - Complete data isolation per school
- 🤖 **AI-Powered Learning** - 24/7 AI tutor, auto-grading, personalized recommendations
- 📚 **Course Management** - Rich content, lessons, assessments
- 📊 **Analytics & Reporting** - Real-time insights, performance tracking
- 💰 **Fee Management** - Structure, assignment, payment tracking
- 📱 **Mobile-Responsive** - Works seamlessly on all devices
- 🔒 **Enterprise Security** - HTTPS, JWT, RBAC, data encryption

---

## 📚 Documentation

### 📖 Quick Links
- **[Project Summary](PROJECT-SUMMARY.md)** - Complete overview of all work done
- **[Setup Guide](SETUP.md)** - Quick start for GitHub, CI/CD, and diagrams
- **[Architecture Diagrams](.agent/architecture/architecture-diagrams.md)** - Visual system design

### 📁 Complete Documentation Structure

```
.agent/
├── product-discovery/          # Phase 1: Requirements & Vision
│   ├── 01-product-vision.md
│   ├── 02-user-personas.md
│   ├── 03-mvp-features-backlog.md
│   ├── 04-user-stories.md
│   ├── 05-stakeholder-discussion-guide.md
│   └── README.md
├── planning/                   # Phase 2: Sprint Planning & Roadmap
│   ├── 01-sprint-planning-backlog.md
│   ├── 02-technical-feasibility.md
│   ├── 03-dependency-management.md
│   ├── 04-risk-assessment.md
│   ├── 05-release-roadmap.md
│   └── README.md
├── project-management/         # Phase 3: GitHub & Workflows
│   ├── project-board-setup.md
│   └── README.md
└── architecture/               # Phase 4: System Design
    ├── architecture-diagrams.md
    └── diagrams/ (PNG exports)
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 20+
- PostgreSQL 15+ (production) or SQLite (development)
- GitHub CLI (for project management)

### Installation

#### 1. Clone Repository
```bash
git clone https://github.com/yourusername/E-LearningWebApp.git
cd E-LearningWebApp
```

#### 2. Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Backend runs at: http://localhost:8000

#### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: http://localhost:3000

#### 4. Project Management Setup
```bash
# Install GitHub CLI
brew install gh  # macOS
# Or see: https://cli.github.com/

# Authenticate
gh auth login

# Create Sprint 1 issues
./scripts/create-sprint1-issues.sh

# Generate architecture diagrams
npm install -g @mermaid-js/mermaid-cli
./scripts/generate-diagrams.sh
```

---

## 🏗️ Technology Stack

### Backend
- **Framework**: Django 5.1 + Django REST Framework
- **Database**: PostgreSQL (production), SQLite (development)
- **Authentication**: JWT (djangorestframework-simplejwt)
- **Multi-Tenancy**: Database-per-tenant architecture
- **API Documentation**: Swagger/OpenAPI

### Frontend
- **Framework**: Next.js 14 (React 18)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: React Context + SWR
- **Forms**: React Hook Form + Zod validation

### AI Integration
- **Primary**: OpenAI GPT-4
- **Fallback**: Google Gemini
- **Features**: AI Tutor, Auto-grading, Feedback generation

### Infrastructure
- **Frontend Hosting**: Vercel
- **Backend Hosting**: DigitalOcean App Platform / AWS ECS
- **Database**: AWS RDS PostgreSQL / DigitalOcean Managed Database
- **File Storage**: AWS S3 / DigitalOcean Spaces
- **CDN**: Cloudflare
- **Monitoring**: Sentry + DataDog

### CI/CD
- **Platform**: GitHub Actions
- **Workflows**: Automated testing, linting, building, deployment
- **Environments**: Development, Staging, Production

---

## 📊 Project Status

### Current Sprint
**Sprint 1: Authentication & Tenant Isolation** (Completed March 2026)
- Status: ✅ Complete
- Goal: Secure multi-tenant authentication, RBAC, and strict data isolation.
- Story Points: 40

### Completed
- ✅ Sprint 0: Infrastructure (46 points)
- ✅ Product Discovery & Requirements
- ✅ Sprint Planning (12 sprints, 485 points)
- ✅ Technical Feasibility Analysis (90% confidence)
- ✅ Architecture Design (12 diagrams)
- ✅ Project Management Setup

### Timeline
- **MVP Launch**: June 30, 2026 (24 weeks)
- **Pilot Schools**: 3-5 schools
- **Year 1 Target**: 50 schools, $179K ARR

---

## 🎯 MVP Features (v1.0 - June 2026)

### Core Modules
1. **Multi-Tenancy & Authentication** - School tenant creation, JWT auth, RBAC
2. **School Administration** - Profile, classes, subjects, teachers
3. **Student Management** - Profiles, enrollment, bulk import
4. **Attendance** - Daily marking, reports, calendar view
5. **Courses & Lessons** - Rich content, file attachments, organization
6. **Assessments & Grading** - Multiple question types, manual/auto grading
7. **AI Features** - AI Tutor chatbot, auto-grading, feedback
8. **Communication** - Announcements, notices, notifications
9. **Fee Management** - Structure, assignment, payment tracking
10. **Reporting** - Performance, attendance, fee reports

---

## 🛠️ Development Workflow

### Branch Strategy
- `main` - Production
- `develop` - Staging
- `feature/*` - Feature branches
- `bugfix/*` - Bug fixes
- `hotfix/*` - Production hotfixes

### Commit Convention
```
[#issue-number] type: Short description

Types: feat, fix, docs, style, refactor, test, chore
Example: [#1] feat: Add user registration API
```

### Pull Request Process
1. Create feature branch from `develop`
2. Make changes and commit
3. Push and create PR
4. CI/CD runs automatically
5. Request code review
6. Merge after approval

---

## 🧪 Testing

### Backend
```bash
cd backend
python manage.py test
coverage run --source='.' manage.py test
coverage report
```

### Frontend
```bash
cd frontend
npm run test
npm run test:coverage
```

### E2E Testing
```bash
npm run test:e2e
```

---

## 📈 Metrics & Monitoring

### Performance Targets
- Page Load: <3 seconds
- API Response: <500ms (95th percentile)
- Uptime: 99.5%
- Test Coverage: >80%

### Monitoring Tools
- **Error Tracking**: Sentry
- **APM**: DataDog
- **Uptime**: Uptime Robot
- **Performance**: Lighthouse CI

---

## 🤝 Contributing

### Getting Started
1. Read the [Project Summary](PROJECT-SUMMARY.md)
2. Check [Sprint Planning](.agent/planning/01-sprint-planning-backlog.md)
3. Pick an issue from GitHub Projects
4. Follow the development workflow
5. Submit a PR

### Code Style
- **Backend**: Black, Flake8, isort
- **Frontend**: ESLint, Prettier
- **TypeScript**: Strict mode enabled

### Testing Requirements
- All new features must have tests
- Maintain >80% code coverage
- All tests must pass before merge

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Team

### Roles
- **Product Manager**: Vision, roadmap, stakeholder management
- **Tech Lead**: Architecture, code review, technical decisions
- **Backend Developers** (2): API development, database design
- **Frontend Developers** (2): UI/UX implementation
- **Full Stack Developer** (1): Cross-functional development
- **QA Engineer** (1): Testing, quality assurance
- **DevOps Engineer** (0.5): Infrastructure, CI/CD
- **UX Designer** (1): User research, design system

---

## 📞 Support

### Documentation
- [Product Discovery](.agent/product-discovery/README.md)
- [Planning](.agent/planning/README.md)
- [Project Management](.agent/project-management/README.md)
- [Architecture](.agent/architecture/architecture-diagrams.md)

### Contact
- **Email**: team@elearning-platform.com
- **Slack**: #elearning-dev
- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and ideas

---

## 🗺️ Roadmap

### Q2 2026 (Current)
- ✅ Sprint 0: Infrastructure
- 🏗️ Sprint 1-11: Feature Development
- 🚀 MVP Launch (June 30, 2026)

### Q3 2026
- v1.1: Parent Portal Full Features
- v1.2: Advanced AI Features
- v1.3: Mobile Apps (Beta)
- v1.4: Library Management

### Q4 2026
- v1.5: Exam Management
- v1.6: Transport Management
- v1.7: Messaging System
- v1.8: Video Integration

### 2027
- v2.0: Advanced Analytics & BI
- v2.1: Predictive Analytics
- v2.2: API for Third-Party Integrations
- v2.3: HR/Payroll Module
- v2.4: Alumni Portal
- v2.5: Enterprise Features

---

## 🎓 Learning Resources

- [Django Documentation](https://docs.djangoproject.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Multi-Tenancy Patterns](https://docs.microsoft.com/en-us/azure/architecture/patterns/multitenancy)
- [GitHub Actions](https://docs.github.com/en/actions)

---

## ⭐ Star History

If you find this project useful, please consider giving it a star!

---

**Built with ❤️ by the E-Learning Platform Team**

**Last Updated**: March 1, 2026
