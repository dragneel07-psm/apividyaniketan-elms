# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import csv
import io
import logging

from django.contrib.auth import get_user_model
from django.db import transaction

from academic.models import AcademicClass, Section, Student
from academic.serializers import StudentCreateSerializer

logger = logging.getLogger(__name__)


class BulkImportService:
    REQUIRED_COLUMNS = ["first_name", "last_name", "email", "class", "section"]

    def process_file(self, file_obj):
        """
        Process uploaded file (CSV/Excel) and create students.
        """
        rows = []

        try:
            # 1. Handle CSV using built-in module
            if file_obj.name.endswith(".csv"):
                # Read as text. Check if file_obj is bytes or text mode
                if isinstance(file_obj.read(0), bytes):
                    file_obj.seek(0)
                    file_data = file_obj.read().decode("utf-8")
                else:
                    file_obj.seek(0)
                    file_data = file_obj.read()

                csv_reader = csv.DictReader(io.StringIO(file_data))

                # Normalize headers manually
                if csv_reader.fieldnames:
                    fieldnames = [
                        f.lower().strip().replace(" ", "_")
                        for f in csv_reader.fieldnames
                    ]
                    csv_reader.fieldnames = fieldnames
                else:
                    return {
                        "success": False,
                        "error": "CSV file appears to be empty or missing headers",
                    }

                # Validation
                missing_cols = [
                    col for col in self.REQUIRED_COLUMNS if col not in fieldnames
                ]
                if missing_cols:
                    return {
                        "success": False,
                        "error": f"Missing columns: {', '.join(missing_cols)}",
                    }

                rows = list(csv_reader)

            # 2. Handle Excel using pandas (Fallback if broken)
            else:
                try:
                    import pandas as pd

                    df = pd.read_excel(file_obj)
                    df.columns = (
                        df.columns.str.lower().str.strip().str.replace(" ", "_")
                    )

                    missing_cols = [
                        col for col in self.REQUIRED_COLUMNS if col not in df.columns
                    ]
                    if missing_cols:
                        return {
                            "success": False,
                            "error": f"Missing columns: {', '.join(missing_cols)}",
                        }

                    rows = df.to_dict("records")
                except ImportError as ie:
                    # Fallback or error if pandas is broken
                    return {
                        "success": False,
                        "error": f"Excel import requires properly installed pandas/openpyxl. Please use CSV instead. Error: {ie}",
                    }
                except Exception as e:
                    # Some pandas errors (like the numpy one) might happen at import or runtime
                    return {"success": False, "error": f"Error reading Excel file: {e}"}

        except Exception as e:
            logger.error(f"Error reading file: {e}")
            return {"success": False, "error": f"Failed to read file: {str(e)}"}

        results = {"created": 0, "failed": 0, "errors": []}

        # Iterate through rows
        for index, row in enumerate(rows):
            row_idx = index + 2
            try:
                # Basic data extraction
                email = str(row.get("email", "")).strip()
                first_name = str(row.get("first_name", "")).strip()
                last_name = str(row.get("last_name", "")).strip()
                class_name = str(row.get("class", "")).strip()
                section_name = str(row.get("section", "")).strip()
                phone = str(row.get("phone", "")).strip()

                if not email:
                    results["failed"] += 1
                    results["errors"].append(
                        {"row": row_idx, "error": "Email is required"}
                    )
                    continue

                with transaction.atomic():
                    # Lookup Class
                    academic_class = AcademicClass.objects.filter(
                        name__iexact=class_name
                    ).first()
                    if not academic_class:
                        raise Exception(f"Class '{class_name}' not found")

                    # Lookup Section
                    section = None
                    if section_name:
                        section = Section.objects.filter(
                            name__iexact=section_name, academic_class=academic_class
                        ).first()
                        if not section:
                            raise Exception(
                                f"Section '{section_name}' not found for class '{class_name}'"
                            )

                    # Prepare data for serializer
                    student_data = {
                        "email": email,
                        "first_name": first_name,
                        "last_name": last_name,
                        "password": "Student@123",  # Default password
                        "academic_class": academic_class.id,
                        "section": section.id if section else None,
                        "phone_number": phone,
                        "learning_style": "visual",
                        "daily_study_goal": 30,
                    }

                    serializer = StudentCreateSerializer(data=student_data)
                    if serializer.is_valid():
                        serializer.save()
                        results["created"] += 1
                    else:
                        results["failed"] += 1
                        err_msg = "; ".join(
                            [f"{k}: {v[0]}" for k, v in serializer.errors.items()]
                        )
                        results["errors"].append({"row": row_idx, "error": err_msg})

            except Exception as e:
                results["failed"] += 1
                results["errors"].append({"row": row_idx, "error": str(e)})

        return {"success": True, "results": results}
