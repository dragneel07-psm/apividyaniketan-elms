# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from academic.models import AcademicClass, Student, Teacher
from core.models import Tenant
from users.models import UserAccount

# Get first tenant
tenant = Tenant.objects.first()

# Create Teacher Account
teacher_user = UserAccount.objects.create_user(
    username="teacher_demo",
    email="teacher@demo.com",
    password="teacher123",
    first_name="John",
    last_name="Smith",
    role="teacher",
    tenant=tenant,
)

teacher = Teacher.objects.create(user=teacher_user)

print(f"✅ Created Teacher: {teacher_user.username}")
print(f"   Email: {teacher_user.email}")
print(f"   Password: teacher123")
print(f"   Name: {teacher_user.first_name} {teacher_user.last_name}")

# Create Student Account
student_user = UserAccount.objects.create_user(
    username="student_demo",
    email="student@demo.com",
    password="student123",
    first_name="Emma",
    last_name="Johnson",
    role="student",
    tenant=tenant,
)

# Get first class to assign student
academic_class = AcademicClass.objects.first()

student = Student.objects.create(user=student_user, academic_class=academic_class)

print(f"\n✅ Created Student: {student_user.username}")
print(f"   Email: {student_user.email}")
print(f"   Password: student123")
print(f"   Name: {student_user.first_name} {student_user.last_name}")
print(f"   Class: Grade {academic_class.grade} - Section {academic_class.section}")

print("\n🎉 Demo accounts created successfully!")
