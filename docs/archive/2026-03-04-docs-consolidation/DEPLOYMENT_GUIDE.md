# 🚀 E-Learning Platform - Deployment & Setup Guide

> **Complete guide for setting up, running, and deploying the E-Learning Web Application**

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Database Configuration](#database-configuration)
4. [Demo Data Setup](#demo-data-setup)
5. [Running the Application](#running-the-application)
6. [Testing & Verification](#testing--verification)
7. [Production Deployment](#production-deployment)
8. [Troubleshooting](#troubleshooting)
9. [Demo Accounts](#demo-accounts)

---

## 🔧 Prerequisites

### Required Software

```bash
# Backend (Django)
Python 3.11+
pip (Python package manager)
SQLite (included with Python)

# Frontend (Next.js)
Node.js 18+
npm or yarn

# Version Control
Git
```

### Check Installations

```bash
python --version    # Should be 3.11+
node --version      # Should be 18+
npm --version       # Should be 8+
git --version       # Should be 2.0+
```

---

## 🚀 Initial Setup

### 1. Clone Repository

```bash
git clone https://github.com/dragneel07-psm/E-LearningWebApp.git
cd E-LearningWebApp
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Create .env.local file
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
```

---

## 💾 Database Configuration

### 1. Run Initial Migrations

```bash
cd backend

# Apply migrations to default database
python manage.py migrate

# Create superuser (optional)
python manage.py createsuperuser
```

### 2. Setup Tenant Database

```bash
# Setup tenant for localhost
python setup_tenant_db.py localhost
```

**Expected Output**:
```
✓ Found tenant: Demo School
✓ Database configuration added
✓ Migrations complete for demo_school
```

### 3. Verify Migrations

```bash
# Check migration status
python manage.py showmigrations

# All should show [X] (applied)
```

---

## 🎭 Demo Data Setup

### Create Test Accounts

```bash
cd backend

# Run test account creation script
python scripts/create_test_accounts.py
```

**This creates**:
- ✅ SaaS Admin account
- ✅ School Admin account  
- ✅ Teacher account with subjects (Physics, Mathematics)
- ✅ Student account (Grade 10, Section A)
- ✅ Parent account (linked to student)
- ✅ Academic class (Grade 10, Section A)
- ✅ 2 Subjects with 2 chapters

**Expected Output**:
```
✅ Updated Saas_admin: saas_admin / saas123
✅ Updated Admin: school_admin / admin123
✅ Setup Academic Class: Grade 10
✅ Updated Teacher: teacher_test / teacher123
✅ Setup Subjects: Physics, Mathematics
✅ Setup Chapters for Physics
✅ Updated Student: student_test / student123
✅ Created Parent: parent_test / parent123

🎉 Test accounts setup complete!
```

---

## ▶️ Running the Application

### Development Mode

#### Terminal 1: Backend Server

```bash
cd backend
source venv/bin/activate  # If not already activated
python manage.py runserver
```

**Running at**: `http://localhost:8000`

#### Terminal 2: Frontend Server

```bash
cd frontend
npm run dev
```

**Running at**: `http://localhost:3000`

### Access the Application

Open your browser and navigate to:
- **Frontend**: http://localhost:3000
- **Backend Admin**: http://localhost:8000/admin
- **API Docs**: http://localhost:8000/api/

---

## 🧪 Testing & Verification

### Run Verification Scripts

All verification scripts are in `backend/` directory:

```bash
cd backend

# Verify teacher APIs
python verify_teacher_fix.py

# Verify student APIs
python verify_student_dashboard.py

# Verify admin APIs
python verify_admin_panel.py

# Verify parent APIs
python verify_parent_portal.py

# Verify library module
python verify_library.py
```

### Manual Testing

Login with demo accounts and test features:

#### 1. **Student Dashboard** (`student@demo.com` / `student123`)
- ✅ View overview cards (attendance, assignments, exams)
- ✅ See enrolled subjects
- ✅ Check AI recommendations
- ✅ Access AI tutor chat

#### 2. **Teacher Dashboard** (`teacher@demo.com` / `teacher123`)
- ✅ View assigned classes
- ✅ Create lessons
- ✅ Mark attendance
- ✅ View analytics

#### 3. **Parent Portal** (`parent@demo.com` / `parent123`)
- ✅ View children profiles
- ✅ Generate AI progress reports
- ✅ Check attendance and grades

#### 4. **Admin Panel** (`admin@demo.com` / `admin123`)
- ✅ Manage students
- ✅ View statistics
- ✅ Manage classes and sections

---

## 🌐 Production Deployment

### Environment Variables

Create `.env` files for production:

#### Backend `.env`

```bash
# Django Settings
SECRET_KEY=your-super-secret-key-change-this
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# Database (for production, use PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/elearning

# CORS
CORS_ALLOWED_ORIGINS=https://yourdomain.com

# Email
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# AI Services (if using external APIs)
OPENAI_API_KEY=your-openai-key
```

#### Frontend `.env.production`

```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

### Production Checklist

- [ ] Set `DEBUG = False` in Django settings
- [ ] Configure production database (PostgreSQL recommended)
- [ ] Set up static file serving (Nginx/CloudFront)
- [ ] Configure HTTPS/SSL certificates
- [ ] Set up email service (SendGrid/AWS SES)
- [ ] Enable CORS for production domain
- [ ] Configure backup strategy
- [ ] Set up monitoring (Sentry, New Relic)
- [ ] Configure CDN for frontend assets
- [ ] Set up CI/CD pipeline

### Deployment Platforms

#### Option 1: Vercel (Frontend) + Railway (Backend)

**Frontend (Vercel)**:
```bash
cd frontend
npm run build
vercel --prod
```

**Backend (Railway)**:
```bash
# Install Railway CLI
npm i -g @railway/cli

# Deploy
cd backend
railway login
railway init
railway up
```

#### Option 2: AWS (Full Stack)

- **Frontend**: Deploy to S3 + CloudFront
- **Backend**: Deploy to EC2 or Elastic Beanstalk
- **Database**: RDS (PostgreSQL)
- **Media**: S3 bucket

#### Option 3: DigitalOcean (Droplet)

1. Create Droplet (Ubuntu 22.04)
2. Install Nginx, PostgreSQL, Python
3. Set up Gunicorn for Django
4. Configure Nginx as reverse proxy
5. Set up SSL with Let's Encrypt

---

## 🐛 Troubleshooting

### Common Issues

#### 1. **500 Error on Teacher Dashboard**

**Problem**: Missing analytics method

**Solution**:
```bash
# Verify ai_engine app is installed
python manage.py shell -c "from ai_engine.services.predictive_service import PredictiveAnalyticsService; print('OK')"

# If error, check backend/ai_engine/services/predictive_service.py
```

#### 2. **Student Dashboard Shows None**

**Problem**: User first_name/last_name not set

**Solution**:
```bash
# Re-run account creation
python scripts/create_test_accounts.py
```

#### 3. **404 on Library APIs**

**Problem**: Library module not migrated

**Solution**:
```bash
# Apply library migrations
python manage.py migrate library
python setup_tenant_db.py localhost
```

#### 4. **Multi-tenancy Database Not Found**

**Problem**: Tenant database not registered

**Solution**:
```bash
# Restart Django server after running
python setup_tenant_db.py localhost
# Then restart: python manage.py runserver
```

#### 5. **CORS Errors**

**Problem**: Frontend can't access backend

**Solution**:
```python
# In backend/config/settings/base.py
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
```

### Debug Mode

Enable detailed error messages:

**Backend**:
```python
# config/settings/base.py
DEBUG = True  # Only for development!
```

**Frontend**:
```bash
# Run with debugging
npm run dev -- --turbo false
```

---

## 🔑 Demo Accounts

### All Demo Credentials

| Role | Email | Password | Features |
|------|-------|----------|----------|
| **SaaS Admin** | `saas_admin@demo.com` | `saas123` | Full system access |
| **School Admin** | `admin@demo.com` | `admin123` | Student management |
| **Teacher** | `teacher@demo.com` | `teacher123` | Classes, lessons, grades |
| **Student** | `student@demo.com` | `student123` | Dashboard, AI tutor |
| **Parent** | `parent@demo.com` | `parent123` | AI progress reports |

### User Roles & Permissions

**SaaS Admin**:
- Manage tenants (schools)
- System-wide configuration
- Billing and subscriptions

**School Admin**:
- Manage students, teachers, staff
- Academic year setup
- School-wide reports

**Teacher**:
- Create/manage lessons
- Mark attendance
- Grade assignments
- View class analytics

**Student**:
- View dashboard
- Access course materials
- Submit assignments
- Use AI tutor

**Parent**:
- View children's progress
- Generate AI reports
- Communication with teachers

---

## 📊 Data Model Summary

### Core Entities

```
Tenant (School)
  ├── Users (Admin, Teacher, Student, Parent)
  ├── AcademicClass (Grade 10, 11, 12)
  │     └── Sections (A, B, C)
  ├── Subjects (Math, Physics, etc.)
  │     └── Chapters
  │           └── Lessons
  ├── Assessments (Quizzes, Exams)
  ├── Attendance Records
  └── AI Reports
```

### Multi-Tenancy

- Each school is a separate tenant
- Data isolation per tenant
- Shared user authentication
- Tenant-specific databases

---

## 🔄 Maintenance

### Regular Tasks

#### Daily
- Check server logs
- Monitor error rates
- Backup database

#### Weekly
- Review AI report quality
- Update content recommendations
- Check storage usage

#### Monthly
- Update dependencies
- Security patches
- Performance optimization
- User feedback review

### Backup Strategy

```bash
# Database backup
python manage.py dumpdata > backup_$(date +%Y%m%d).json

# Restore from backup
python manage.py loaddata backup_20260122.json
```

---

## 📚 Additional Resources

### Documentation Links

- **Django**: https://docs.djangoproject.com/
- **Next.js**: https://nextjs.org/docs
- **REST Framework**: https://www.django-rest-framework.org/

### Project Documentation

- `TEACHER_DASHBOARD_FIX.md` - Teacher features
- `TASK_1_COMPLETE.md` - Student dashboard
- `TASK_2_COMPLETE.md` - Admin panel
- `TASK_3_COMPLETE.md` - Parent portal
- `TASK_4_COMPLETE.md` - Library module
- `SPRINT3-VERIFICATION.md` - Testing guide

---

## 🎯 Next Steps

1. ✅ **Run the application** using demo accounts
2. ✅ **Test all features** with verification scripts
3. ✅ **Customize branding** (logo, colors, name)
4. ✅ **Add real content** (courses, lessons, materials)
5. ✅ **Configure email** for notifications
6. ✅ **Set up analytics** (Google Analytics, Mixpanel)
7. ✅ **Deploy to production** using guide above
8. ✅ **Train users** on the platform

---

## ✅ Quick Start Summary

```bash
# 1. Clone and setup
git clone <repo-url> && cd E-LearningWebApp

# 2. Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python setup_tenant_db.py localhost
python scripts/create_test_accounts.py

# 3. Frontend
cd ../frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# 4. Run (2 terminals)
# Terminal 1: cd backend && python manage.py runserver
# Terminal 2: cd frontend && npm run dev

# 5. Access
# Open http://localhost:3000
# Login with demo accounts
```

---

## 💡 Tips & Best Practices

1. **Always use virtual environment** for Python
2. **Keep dependencies updated** regularly
3. **Test on multiple devices** (desktop, tablet, mobile)
4. **Monitor API response times** for performance
5. **Use environment variables** for sensitive data
6. **Enable logging** for debugging
7. **Regular backups** are essential
8. **Document custom changes** for future reference

---

## 📝 License & Support

- **License**: MIT (or your chosen license)
- **Support**: Create issues on GitHub
- **Contributing**: See CONTRIBUTING.md

---

**Last Updated**: January 22, 2026  
**Version**: 1.0.0  
**Maintainer**: Development Team

---

🎉 **You're all set! Happy Learning!** 🎓
