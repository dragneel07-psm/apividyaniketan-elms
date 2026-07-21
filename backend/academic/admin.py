# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.contrib import admin

from .models import (
    AcademicClass,
    AcademicYear,
    AdmissionEnquiry,
    Assessment,
    Attendance,
    Chapter,
    Lesson,
    LessonMaterial,
    LessonProgress,
    Notice,
    Parent,
    Result,
    Section,
    Student,
    Subject,
    Teacher,
    Timetable,
)


@admin.register(AcademicYear)
class AcademicYearAdmin(admin.ModelAdmin):
    list_display = ("name", "start_date", "end_date", "is_current")
    ordering = ("-start_date",)


@admin.register(AcademicClass)
class AcademicClassAdmin(admin.ModelAdmin):
    list_display = ("name", "order")
    ordering = ("order",)


@admin.register(Section)
class SectionAdmin(admin.ModelAdmin):
    list_display = ("name", "academic_class", "capacity")
    list_filter = ("academic_class",)


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ("user", "academic_class")
    list_filter = ("academic_class",)
    raw_id_fields = ("user", "academic_class")


@admin.register(Teacher)
class TeacherAdmin(admin.ModelAdmin):
    list_display = ("user",)
    raw_id_fields = ("user",)


@admin.register(Parent)
class ParentAdmin(admin.ModelAdmin):
    list_display = ("user",)
    raw_id_fields = ("user",)
    filter_horizontal = ("students",)


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ("name", "academic_class", "teacher", "additional_teacher_count")
    list_filter = ("academic_class", "teacher", "additional_teachers")
    search_fields = ("name",)
    filter_horizontal = ("additional_teachers",)

    def additional_teacher_count(self, obj):
        return obj.additional_teachers.count()

    additional_teacher_count.short_description = "Additional Teachers"


@admin.register(Chapter)
class ChapterAdmin(admin.ModelAdmin):
    list_display = ("title", "subject", "order")
    list_filter = ("subject",)
    ordering = ("subject", "order")


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ("title", "chapter", "content_type", "order", "is_published")
    list_filter = ("chapter__subject", "content_type", "is_published")
    search_fields = ("title", "content")


@admin.register(LessonMaterial)
class LessonMaterialAdmin(admin.ModelAdmin):
    list_display = ("title", "lesson", "material_type")
    list_filter = ("material_type", "lesson__chapter__subject")


@admin.register(LessonProgress)
class LessonProgressAdmin(admin.ModelAdmin):
    list_display = ("student", "lesson", "completed", "last_accessed")
    list_filter = ("completed", "lesson__chapter__subject")


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ("student", "subject", "date", "status")
    list_filter = ("status", "date", "subject")
    search_fields = ("student__user__first_name", "student__user__last_name")


@admin.register(Timetable)
class TimetableAdmin(admin.ModelAdmin):
    list_display = (
        "academic_class",
        "day_of_week",
        "start_time",
        "end_time",
        "subject_name",
        "entry_type",
        "status",
    )
    list_filter = ("day_of_week", "academic_class", "entry_type", "status")


@admin.register(Assessment)
class AssessmentAdmin(admin.ModelAdmin):
    list_display = ("title", "subject", "type", "total_marks", "due_date")
    list_filter = ("type", "subject")
    search_fields = ("title", "description")


@admin.register(Result)
class ResultAdmin(admin.ModelAdmin):
    list_display = ("assessment", "student", "score", "submitted_at")
    list_filter = ("assessment__subject",)


@admin.register(Notice)
class NoticeAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "priority", "published_date")
    list_filter = ("category", "priority")
    search_fields = ("title", "content")


@admin.register(AdmissionEnquiry)
class AdmissionEnquiryAdmin(admin.ModelAdmin):
    list_display = (
        "first_name",
        "last_name",
        "phone_number",
        "desired_class",
        "status",
        "source",
        "created_at",
    )
    list_filter = ("status", "source", "desired_class")
    search_fields = (
        "first_name",
        "last_name",
        "guardian_name",
        "email",
        "phone_number",
    )
