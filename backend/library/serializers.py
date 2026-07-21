# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import Book, BookIssue


class BookSerializer(serializers.ModelSerializer):

    class Meta:
        model = Book
        fields = "__all__"
        read_only_fields = ["book_id", "created_at", "updated_at", "available_copies"]

    def validate(self, attrs):
        """Run model validation"""
        # Create a temporary instance for validation
        instance = Book(**attrs)
        if self.instance:
            instance.pk = self.instance.pk

        try:
            instance.clean()
        except DjangoValidationError as e:
            raise serializers.ValidationError(e.message_dict)

        # Check ISBN uniqueness manually
        isbn = attrs.get("isbn")
        if isbn:
            qs = Book.objects.filter(isbn=isbn)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)

            if qs.exists():
                raise serializers.ValidationError(
                    {"isbn": "Book with this ISBN already exists."}
                )

        return attrs

    def create(self, validated_data):
        # Set available_copies equal to total_copies for new books
        validated_data["available_copies"] = validated_data.get("total_copies", 1)
        return super().create(validated_data)


class BookIssueSerializer(serializers.ModelSerializer):
    book_title = serializers.CharField(source="book.title", read_only=True)
    book_author = serializers.CharField(source="book.author", read_only=True)
    student_name = serializers.SerializerMethodField()

    class Meta:
        model = BookIssue
        fields = "__all__"
        read_only_fields = [
            "issue_id",
            "issued_date",
            "due_date",
            "return_date",
            "fine_amount",
            "status",
        ]

    def validate(self, attrs):
        """Run model validation"""
        # Create a temporary instance for validation
        instance = BookIssue(**attrs)
        if self.instance:
            instance.pk = self.instance.pk

        try:
            instance.clean()
        except DjangoValidationError as e:
            raise serializers.ValidationError(e.message_dict)

        return attrs

    def get_student_name(self, obj):
        return f"{obj.student.user.first_name} {obj.student.user.last_name}"
