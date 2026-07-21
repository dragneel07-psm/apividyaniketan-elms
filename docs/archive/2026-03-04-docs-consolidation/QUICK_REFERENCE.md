# 📖 E-Learning Platform - Quick Reference Guide

> **Quick commands and references for daily development**

---

## ⚡ Quick Start

```bash
# Backend
cd backend && source venv/bin/activate && python manage.py runserver

# Frontend  
cd frontend && npm run dev

# Access
http://localhost:3000
```

---

## 🔑 Demo Accounts

```
Student:  student@demo.com  / student123
Teacher:  teacher@demo.com  / teacher123
Parent:   parent@demo.com   / parent123
Admin:    admin@demo.com    / admin123
```

---

## 🛠️ Common Commands

### Django (Backend)

```bash
# Migrations
python manage.py makemigrations
python manage.py migrate
python manage.py migrate --database=demo_school

# Server
python manage.py runserver
python manage.py runserver 0.0.0.0:8000  # Accessible on network

# Shell
python manage.py shell
python manage.py shell_plus  # If django-extensions installed

# Create user
python manage.py createsuperuser

# Collect static files
python manage.py collectstatic

# Database
python manage.py dbshell
python manage.py dumpdata > backup.json
python manage.py loaddata backup.json
```

### Next.js (Frontend)

```bash
# Development
npm run dev

# Build
npm run build
npm run start  # Run production build locally

# Lint
npm run lint

# Type check
npm run type-check

# Clean
rm -rf .next node_modules
npm install
```

### Git

```bash
# Status
git status
git log --oneline -10

# Commit
git add .
git commit -m "feat: description"
git push origin main

# Branches
git checkout -b feature/new-feature
git merge feature/new-feature
git branch -d feature/new-feature
```

---

## 📂 Project Structure

```
E-LearningWebApp/
├── backend/
│   ├── academic/          # Academic models (Student, Teacher, Class)
│   ├── ai_engine/         # AI services (recommendations, analytics)
│   ├── billing/           # Subscription and payment
│   ├── library/           # Library management
│   ├── notifications/     # Notification system
│   ├── core/              # Multi-tenancy, base models
│   ├── users/             # User authentication
│   ├── config/            # Settings and configuration
│   └── scripts/           # Utility scripts
│
├── frontend/
│   ├── app/               # Next.js App Router
│   │   ├── student/       # Student portal
│   │   ├── teacher/       # Teacher portal
│   │   ├── parent/        # Parent portal
│   │   └── admin/         # Admin portal
│   ├── components/        # Reusable components
│   ├── lib/               # Utilities and API client
│   └── public/            # Static assets
│
└── docs/                  # Documentation
```

---

## 🌐 API Endpoints

### Authentication
```
POST /api/token/                    # Login
POST /api/token/refresh/            # Refresh token
POST /api/register/                 # Register
```

### Academic
```
GET  /api/academic/students/        # List students
POST /api/academic/students/        # Create student
GET  /api/academic/students/me/     # Current student
GET  /api/academic/classes/         # List classes
GET  /api/academic/subjects/        # List subjects
GET  /api/academic/chapters/        # List chapters
GET  /api/academic/lessons/         # List lessons
POST /api/academic/attendance/      # Mark attendance
```

### AI Engine
```
GET  /api/ai/recommendations/       # Get recommendations
GET  /api/ai/reports/student/{id}/  # Generate AI report
POST /api/ai/tutor/chat/            # AI tutor chat
```

### Library
```
GET  /api/library/books/            # List books
POST /api/library/books/            # Add book
POST /api/library/issues/           # Issue book
PATCH /api/library/issues/{id}/     # Return book
```

---

## 🧪 Testing Commands

```bash
# Run all verification scripts
cd backend

python verify_teacher_fix.py
python verify_student_dashboard.py
python verify_admin_panel.py
python verify_parent_portal.py
python verify_library.py

# Django tests
python manage.py test

# Frontend tests
cd frontend
npm test
```

---

## 🔧 Troubleshooting

### Port Already in Use

```bash
# Find process using port 8000
lsof -ti:8000

# Kill it
kill -9 $(lsof -ti:8000)

# Or use different port
python manage.py runserver 8001
```

### Database Locked

```bash
# Stop all Django processes
pkill -f runserver

# Restart server
python manage.py runserver
```

### Module Not Found

```bash
# Backend
pip install -r requirements.txt

# Frontend
rm -rf node_modules package-lock.json
npm install
```

### Migrations Out of Sync

```bash
# Reset migrations (DANGER: Deletes data!)
python manage.py migrate YOUR_APP zero
python manage.py migrate YOUR_APP

# Or reset database completely
rm db.sqlite3
rm config/*.sqlite3
python manage.py migrate
python scripts/create_test_accounts.py
```

---

## 📊 Database Quick Access

### SQLite Commands

```bash
# Open database
sqlite3 config/school_demo.sqlite3

# Common queries
.tables                              # List tables
SELECT * FROM users_useraccount;    # List users
SELECT * FROM academic_student;     # List students
.schema academic_student             # Show table structure
.quit                                # Exit
```

### Django Shell Queries

```python
# Open shell
python manage.py shell

# Query examples
from users.models import UserAccount
from academic.models import Student, Teacher

# List all users
UserAccount.objects.all()

# Get specific student
student = Student.objects.first()
print(f"{student.user.first_name} {student.user.last_name}")

# Get teacher's subjects
teacher = Teacher.objects.first()
teacher.subjects.all()
```

---

## 🎨 Frontend Development

### Component Structure

```typescript
// components/ui/button.tsx
import { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost'
}

export function Button({ variant = 'default', ...props }: ButtonProps) {
  return <button className={`btn btn-${variant}`} {...props} />
}
```

### API Client Usage

```typescript
// In any component
import { academicAPI, aiAPI } from '@/lib/api'

// Fetch data
const students = await academicAPI.getStudents()
const report = await aiAPI.getStudentReport(studentId)
```

---

## 🔐 Environment Variables

### Backend (.env)

```bash
SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=sqlite:///db.sqlite3
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 📝 Git Workflow

```bash
# Start new feature
git checkout -b feature/student-dashboard
git add .
git commit -m "feat: add student dashboard"
git push origin feature/student-dashboard

# Update main
git checkout main
git pull origin main
git merge feature/student-dashboard
git push origin main
```

---

## 🚀 Deployment Quick Commands

### Build for Production

```bash
# Frontend
cd frontend
npm run build

# Test production build
npm run start
```

### Deploy to Vercel

```bash
cd frontend
vercel --prod
```

### Deploy Backend to Railway

```bash
cd backend
railway up
```

---

## 📞 Support & Resources

- **Documentation**: See `DEPLOYMENT_GUIDE.md`
- **Issues**: Create GitHub issue
- **Task Status**: See `TASK_*_COMPLETE.md` files

---

**Happy Coding! 🎉**
