# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.contrib.auth import get_user_model

from core.models import Tenant

from .models import Conversation, ConversationParticipant

User = get_user_model()


class GroupSyncService:
    @staticmethod
    def sync_section_group(student):
        """
        Syncs a student with their Section group chat.
        Creates the group if it doesn't exist.
        """
        if not student.section:
            return

        tenant = student.user.tenant
        section = student.section
        class_obj = section.academic_class

        group_title = f"Class: {class_obj.name} - {section.name}"
        context_id = str(section.id)

        # Get or create the section conversation
        conversation, created = Conversation.objects.get_or_create(
            context_type="section",
            context_id=context_id,
            tenant=tenant,
            defaults={
                "type": "group",
                "title": group_title,
            },
        )

        # Ensure student is a participant
        ConversationParticipant.objects.get_or_create(
            conversation=conversation, user=student.user
        )

        # If student was in a different section before, we might want to remove them.
        # However, complexity arises if they were in multiple sections (unlikely in this model).
        # For now, we just ensure they are in the CURRENT section group.

    @staticmethod
    def remove_from_old_sections(student, old_section_id):
        """
        Removes a student from their previous section group.
        """
        if not old_section_id:
            return

        ConversationParticipant.objects.filter(
            conversation__context_type="section",
            conversation__context_id=str(old_section_id),
            user=student.user,
        ).delete()

    @staticmethod
    def sync_subject_groups(student):
        """
        Logic to sync student with groups for each subject they are enrolled in.
        (To be implemented if subject-specific groups are required)
        """
        pass
