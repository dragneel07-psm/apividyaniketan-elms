# 🚀 Sprint 4 - Quick Start Guide

**Pick a task and get started immediately!**

---

## ⚡ Quick Task Selection

### **Beginner-Friendly** (< 2 hours)
1. **LIB-2.1: Deploy Library Module** ⭐ **RECOMMENDED START**
   - Why: Quick win, well-defined, low risk
   - Time: 30 minutes
   - Skills: Basic Django commands
   - **Start Now**: [Jump to instructions](#task-lib-21-library-deployment)

2. **PERF-4.3: Frontend Optimization**
   - Why: Immediate visible impact
   - Time: 1-2 hours
   - Skills: Next.js, bundle analysis
   - **Start Now**: [Jump to instructions](#task-perf-43-frontend-optimization)

### **Intermediate** (2-4 hours)
3. **AS-1.1: Create Quiz Interface**
   - Why: Core Sprint 4 goal
   - Time: 3-4 hours
   - Skills: React, Forms, API integration
   - **Start Now**: [Jump to instructions](#task-as-11-quiz-creation)

4. **LIB-2.3: Student Book Browsing**
   - Why: Great UX feature
   - Time: 2-3 hours
   - Skills: React, search/filter
   - **Start Now**: [Jump to instructions](#task-lib-23-book-browsing)

### **Advanced** (4-8 hours)
5. **AI-3.1: Learning Path Optimization**
   - Why: Innovative AI feature
   - Time: 6-8 hours
   - Skills: Python, AI/ML, Algorithms
   - **Start Now**: [Jump to instructions](#task-ai-31-learning-paths)

---

## 📝 Task: LIB-2.1 - Library Deployment

**Goal**: Get the library module working in 30 minutes

### Step 1: Apply Migrations (5 min)

```bash
cd backend

# Check migration status
python manage.py showmigrations library

# Apply migrations
python manage.py migrate library

# Apply to tenant database
python setup_tenant_db.py localhost
```

**Expected Output**:
```
✓ Migrations applied
✓ Tables created: library_book, library_bookissue
```

### Step 2: Create Sample Books (10 min)

Create `backend/scripts/populate_library.py`:

```python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from library.models import Book
from core.models import Tenant

tenant = Tenant.objects.get(domain_url='localhost')

books = [
    {
        "title": "Introduction to Algorithms",
        "author": "Cormen, Leiserson, Rivest, Stein",
        "isbn": "9780262033848",
        "category": "technology",
        "publisher": "MIT Press",
        "published_year": 2009,
        "total_copies": 3,
        "available_copies": 3,
    },
    {
        "title": "Clean Code",
        "author": "Robert C. Martin",
        "isbn": "9780132350884",
        "category": "technology",
        "publisher": "Prentice Hall",
        "published_year": 2008,
        "total_copies": 2,
        "available_copies": 2,
    },
    # Add more books...
]

for book_data in books:
    book_data['tenant'] = tenant
    Book.objects.using(tenant.db_alias).get_or_create(
        isbn=book_data['isbn'],
        defaults=book_data
    )

print(f"✅ Created {len(books)} books")
```

Run it:
```bash
python scripts/populate_library.py
```

### Step 3: Test API (5 min)

```bash
# Test library endpoints
python verify_library.py

# Or manually:
curl -H "x-tenant-id: demo" http://localhost:8000/api/library/books/
```

### Step 4: Verify in Frontend (10 min)

1. Navigate to `http://localhost:3000/student/library`
2. Should see books listed (if page exists)
3. If page doesn't exist, that's the next task!

**✅ DONE!** Library module is now deployed.

---

## 📝 Task: AS-1.1 - Quiz Creation

**Goal**: Teachers can create quizzes

### Step 1: Check Existing Models (5 min)

```bash
# Check if Assessment model exists
cd backend
python manage.py shell -c "from academic.models import Assessment; print('OK')"
```

### Step 2: Create Quiz Form Component (60 min)

Create `frontend/app/teacher/assessments/new/page.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { academicAPI } from '@/lib/api';

export default function CreateQuizPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    type: 'quiz',
    subject: '',
    due_date: '',
    time_limit: 30,
    total_marks: 100,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await academicAPI.createAssessment(formData);
      router.push('/teacher/assessments');
    } catch (error) {
      console.error('Failed to create quiz:', error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Create New Quiz</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Add form fields */}
        <button type="submit">Create Quiz</button>
      </form>
    </div>
  );
}
```

### Step 3: Add Route (5 min)

The route is automatically created by Next.js App Router.

### Step 4: Test (10 min)

1. Login as teacher
2. Navigate to `/teacher/assessments/new`
3. Fill form and submit
4. Verify quiz created

**✅ DONE!** Basic quiz creation working.

---

## 📝 Task: PERF-4.3 - Frontend Optimization

**Goal**: Reduce bundle size by 20%

### Step 1: Analyze Current Size (5 min)

```bash
cd frontend

# Build for production
npm run build

# Check output
# Look for: Page Size (KB) in output
```

### Step 2: Remove Unused Dependencies (20 min)

```bash
# Check for unused packages
npx depcheck

# Remove unused ones
npm uninstall <package-name>
```

### Step 3: Implement Code Splitting (30 min)

```typescript
// Instead of:
import { HeavyComponent } from './components';

// Use dynamic import:
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./components/HeavyComponent'), {
  loading: () => <p>Loading...</p>
});
```

### Step 4: Optimize Images (15 min)

```typescript
// Replace <img> with next/image
import Image from 'next/image';

<Image 
  src="/logo.png" 
  alt="Logo" 
  width={200} 
  height={100}
  priority
/>
```

### Step 5: Measure Results (5 min)

```bash
npm run build

# Compare with Step 1 output
# Should see 15-30% reduction
```

**✅ DONE!** App is faster!

---

## 📝 Task: LIB-2.3 - Book Browsing

**Goal**: Students can search and browse books

### Step 1: Create Library Page (45 min)

Create `frontend/app/student/library/page.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { libraryAPI } from '@/lib/api';

export default function StudentLibraryPage() {
  const [books, setBooks] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    const data = await libraryAPI.getBooks();
    setBooks(data);
  };

  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'all' || book.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Library</h1>
      
      {/* Search bar */}
      <input 
        type="text"
        placeholder="Search books..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 p-2 border rounded w-full"
      />

      {/* Book grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filteredBooks.map(book => (
          <div key={book.book_id} className="border rounded p-4">
            <h3 className="font-bold">{book.title}</h3>
            <p className="text-sm text-gray-600">{book.author}</p>
            <p className="text-xs mt-2">
              Available: {book.available_copies}/{book.total_copies}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Step 2: Add Library API Methods (15 min)

In `frontend/lib/api.ts`:

```typescript
export const libraryAPI = {
  async getBooks() {
    return apiRequest('/library/books/', 'GET');
  },
  
  async getBook(id: string) {
    return apiRequest(`/library/books/${id}/`, 'GET');
  },
  
  async issueBook(bookId: string, studentId: string, dueDate: string) {
    return apiRequest('/library/issues/', 'POST', {
      book: bookId,
      student: studentId,
      due_date: dueDate,
    });
  },
};
```

### Step 3: Test (10 min)

1. Login as student
2. Click "Library" in navigation
3. Search for books
4. Filter by category

**✅ DONE!** Students can browse books!

---

## 📝 Task: AI-3.1 - Learning Paths

**Goal**: AI generates personalized learning paths

### Step 1: Create Learning Path Service (2 hours)

Create `backend/ai_engine/services/learning_path_service.py`:

```python
from academic.models import Student, LessonProgress, Subject
from typing import Dict, List

class LearningPathService:
    def __init__(self, student: Student):
        self.student = student
        
    def generate_learning_path(self) -> Dict:
        """Generate personalized learning path"""
        
        # 1. Get student's subjects
        subjects = self.student.academic_class.subjects.all()
        
        # 2. Analyze progress per subject
        paths = []
        for subject in subjects:
            path = self._analyze_subject(subject)
            paths.append(path)
        
        return {
            'student_id': str(self.student.student_id),
            'paths': paths,
            'estimated_completion': self._estimate_completion(),
            'recommendations':self._get_recommendations(),
        }
    
    def _analyze_subject(self, subject) -> Dict:
        # Get lessons and chapters
        chapters = subject.chapters.all()
        completed_lessons = LessonProgress.objects.filter(
            student=self.student,
            lesson__chapter__subject=subject,
            completion_percentage=100
        ).count()
        
        total_lessons = sum(ch.lessons.count() for ch in chapters)
        
        return {
            'subject': subject.name,
            'progress': (completed_lessons / total_lessons * 100) if total_lessons else 0,
            'next_lesson': self._get_next_lesson(subject),
            'weak_topics': self._identify_weak_topics(subject),
        }
```

### Step 2: Create API Endpoint (30 min)

In `backend/ai_engine/views.py`:

```python
from rest_framework.decorators import action
from rest_framework.response import Response
from .services.learning_path_service import LearningPathService

class AIEngineViewSet(viewsets.ViewSet):
    @action(detail=False, methods=['get'])
    def learning_path(self, request):
        student = request.user.student
        service = LearningPathService(student)
        path = service.generate_learning_path()
        return Response(path)
```

### Step 3: Create Frontend Page (90 min)

Create `frontend/app/student/learning-path/page.tsx`

### Step 4: Test

```bash
python -c "
from ai_engine.services.learning_path_service import LearningPathService
from academic.models import Student
student = Student.objects.first()
service = LearningPathService(student)
print(service.generate_learning_path())
"
```

**✅ DONE!** AI learning paths working!

---

## 🎯 Recommended First Day Plan

**Morning (3 hours)**:
1. ☕ Read Sprint 4 kickoff (30 min)
2. 🚀 Complete LIB-2.1: Library Deployment (30 min)
3. 📝 Start AS-1.1: Quiz Creation (2 hours)

**Afternoon (3 hours)**:
4. 🎨 Complete Quiz UI (90 min)
5. ⚡ Start PERF-4.3: Frontend Optimization (90 min)

**Evening (Optional)**:
6. 📚 Read about learning paths
7. Plan tomorrow's tasks

---

## 📊 Track Your Progress

Create a simple checklist:

```
Sprint 4 Progress
=================
[ ] LIB-2.1: Library Deployment
[ ] LIB-2.2: Sample Books
[ ] AS-1.1: Quiz Creation
[ ] LIB-2.3: Book Browsing
[ ] PERF-4.3: Frontend Optimization
[ ] AI-3.1: Learning Paths
```

---

## 🚨 When You Get Stuck

1. **Check documentation**: `DEPLOYMENT_GUIDE.md`, `QUICK_REFERENCE.md`
2. **Look at similar code**: Find existing components/views
3. **Use verification scripts**: Test APIs with `verify_*.py`
4. **Read error messages**: They usually tell you what's wrong
5. **Take a break**: Sometimes stepping away helps!

---

**🎉 You've got this! Pick a task and start coding!** 🚀
