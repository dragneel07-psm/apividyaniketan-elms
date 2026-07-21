# Issue #1: User Registration API - Development Guide

**Branch**: `feature/1-user-registration-api`  
**Story Points**: 5  
**Estimated Time**: 4-6 hours

---

## 📋 Task Overview

Create a user registration API endpoint that allows new users to register with email and password.

### User Story
**As a** new user  
**I want** to register with email and password  
**So that** I can access the platform

---

## ✅ Acceptance Criteria

- [ ] POST /api/auth/register endpoint created
- [ ] Email validation implemented
- [ ] Password hashing with bcrypt
- [ ] Returns JWT token on success
- [ ] Error handling for duplicate emails
- [ ] Unit tests written (>80% coverage)

---

## 🛠️ Implementation Steps

### Step 1: Install Required Packages (if not already installed)

```bash
cd backend
source .venv/bin/activate

# Check if installed
pip list | grep djangorestframework-simplejwt

# If not installed
pip install djangorestframework-simplejwt
pip freeze > requirements.txt
```

### Step 2: Update Settings

**File**: `backend/config/settings/base.py`

Add to `INSTALLED_APPS` if not already there:
```python
INSTALLED_APPS = [
    # ...
    'rest_framework',
    'rest_framework_simplejwt',
    # ...
]
```

Add JWT configuration:
```python
from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
}
```

### Step 3: Create Registration Serializer

**File**: `backend/users/serializers.py` (create if doesn't exist)

```python
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.tokens import RefreshToken
import re

User = get_user_model()


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    tokens = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'email', 'password', 'password_confirm', 'first_name', 
                  'last_name', 'role', 'tokens']
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
            'role': {'required': True},
        }
    
    def validate_email(self, value):
        """Validate email format and uniqueness"""
        # Email format validation
        email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_regex, value):
            raise serializers.ValidationError("Invalid email format")
        
        # Check if email already exists
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("User with this email already exists")
        
        return value.lower()
    
    def validate(self, attrs):
        """Validate that passwords match"""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                "password": "Password fields didn't match."
            })
        return attrs
    
    def get_tokens(self, obj):
        """Generate JWT tokens for the user"""
        refresh = RefreshToken.for_user(obj)
        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }
    
    def create(self, validated_data):
        """Create user with hashed password"""
        validated_data.pop('password_confirm')
        
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            role=validated_data.get('role', 'student'),
        )
        
        return user
```

### Step 4: Create Registration View

**File**: `backend/users/views.py` (update or create)

```python
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .serializers import UserRegistrationSerializer


@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    """
    Register a new user
    
    POST /api/auth/register
    {
        "email": "user@example.com",
        "password": "SecurePass123",
        "password_confirm": "SecurePass123",
        "first_name": "John",
        "last_name": "Doe",
        "role": "student"
    }
    """
    serializer = UserRegistrationSerializer(data=request.data)
    
    if serializer.is_valid():
        user = serializer.save()
        return Response({
            'message': 'User registered successfully',
            'user': {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role': user.role,
            },
            'tokens': serializer.data['tokens']
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
```

### Step 5: Add URL Route

**File**: `backend/users/urls.py` (create if doesn't exist)

```python
from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.register_user, name='register'),
]
```

**File**: `backend/config/urls.py` (update)

```python
from django.urls import path, include

urlpatterns = [
    # ... existing patterns
    path('api/auth/', include('users.urls')),
]
```

### Step 6: Write Unit Tests

**File**: `backend/users/tests.py` (create or update)

```python
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()


class UserRegistrationTests(TestCase):
    """Test suite for user registration"""
    
    def setUp(self):
        self.client = APIClient()
        self.register_url = '/api/auth/register/'
        self.valid_payload = {
            'email': 'test@example.com',
            'password': 'TestPass123!',
            'password_confirm': 'TestPass123!',
            'first_name': 'Test',
            'last_name': 'User',
            'role': 'student'
        }
    
    def test_register_user_success(self):
        """Test successful user registration"""
        response = self.client.post(self.register_url, self.valid_payload)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('tokens', response.data)
        self.assertIn('access', response.data['tokens'])
        self.assertIn('refresh', response.data['tokens'])
        self.assertEqual(response.data['user']['email'], 'test@example.com')
        
        # Verify user was created in database
        self.assertTrue(User.objects.filter(email='test@example.com').exists())
    
    def test_register_duplicate_email(self):
        """Test registration with duplicate email"""
        # Create first user
        self.client.post(self.register_url, self.valid_payload)
        
        # Try to create second user with same email
        response = self.client.post(self.register_url, self.valid_payload)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)
    
    def test_register_invalid_email(self):
        """Test registration with invalid email format"""
        payload = self.valid_payload.copy()
        payload['email'] = 'invalid-email'
        
        response = self.client.post(self.register_url, payload)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)
    
    def test_register_password_mismatch(self):
        """Test registration with mismatched passwords"""
        payload = self.valid_payload.copy()
        payload['password_confirm'] = 'DifferentPass123!'
        
        response = self.client.post(self.register_url, payload)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)
    
    def test_register_weak_password(self):
        """Test registration with weak password"""
        payload = self.valid_payload.copy()
        payload['password'] = '123'
        payload['password_confirm'] = '123'
        
        response = self.client.post(self.register_url, payload)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)
    
    def test_register_missing_fields(self):
        """Test registration with missing required fields"""
        response = self.client.post(self.register_url, {})
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)
        self.assertIn('password', response.data)
    
    def test_password_is_hashed(self):
        """Test that password is hashed in database"""
        self.client.post(self.register_url, self.valid_payload)
        
        user = User.objects.get(email='test@example.com')
        self.assertNotEqual(user.password, 'TestPass123!')
        self.assertTrue(user.password.startswith('bcrypt') or user.password.startswith('pbkdf2'))
```

### Step 7: Run Tests

```bash
cd backend
python manage.py test users.tests.UserRegistrationTests

# Check coverage
coverage run --source='.' manage.py test users.tests.UserRegistrationTests
coverage report
```

### Step 8: Manual Testing

```bash
# Start the server (if not running)
python manage.py runserver

# Test with curl
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!",
    "password_confirm": "SecurePass123!",
    "first_name": "John",
    "last_name": "Doe",
    "role": "student"
  }'
```

---

## 🧪 Testing Checklist

- [ ] Unit tests pass
- [ ] Code coverage >80%
- [ ] Manual testing successful
- [ ] Duplicate email returns error
- [ ] Invalid email format returns error
- [ ] Password mismatch returns error
- [ ] Weak password returns error
- [ ] JWT tokens are returned
- [ ] Password is hashed in database

---

## 📝 Commit Message

```bash
git add .
git commit -m "[#1] feat: Add user registration API

- Implemented POST /api/auth/register endpoint
- Added email validation with regex
- Password hashing with Django's built-in hasher
- JWT token generation on successful registration
- Error handling for duplicate emails
- Comprehensive unit tests with 85% coverage

Closes #1"
```

---

## 🔄 Create Pull Request

```bash
git push -u origin feature/1-user-registration-api

gh pr create --title "User Registration API" --body "## Description
Implements user registration API endpoint with email/password authentication.

## Changes
- Created UserRegistrationSerializer with email validation
- Implemented register_user view with JWT token generation
- Added URL routing for /api/auth/register/
- Comprehensive unit tests (85% coverage)

## Testing
- ✅ All unit tests passing
- ✅ Manual testing successful
- ✅ Email validation working
- ✅ Password hashing confirmed
- ✅ JWT tokens generated correctly

## Closes
Closes #1"
```

---

## ✅ Definition of Done

- [ ] Code written and follows Django/DRF best practices
- [ ] All acceptance criteria met
- [ ] Unit tests written (>80% coverage)
- [ ] All tests passing
- [ ] Code reviewed (self-review first)
- [ ] Documentation updated (API docs)
- [ ] Manual testing completed
- [ ] Pull request created
- [ ] Ready for team review

---

## 🆘 Troubleshooting

### Issue: ImportError for simplejwt
**Solution**: `pip install djangorestframework-simplejwt`

### Issue: Tests failing
**Solution**: Check database migrations: `python manage.py migrate`

### Issue: 500 error
**Solution**: Check Django logs, ensure SECRET_KEY is set

---

## 📚 Resources

- [DRF SimpleJWT Docs](https://django-rest-framework-simplejwt.readthedocs.io/)
- [Django User Model](https://docs.djangoproject.com/en/5.1/ref/contrib/auth/)
- [DRF Serializers](https://www.django-rest-framework.org/api-guide/serializers/)

---

**Ready to code!** Follow the steps above and you'll complete this issue successfully. 🚀

**Estimated Time**: 4-6 hours  
**Current Branch**: feature/1-user-registration-api  
**Next Issue**: #2 (JWT Authentication)
