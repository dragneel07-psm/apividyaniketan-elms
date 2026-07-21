# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from conversations.services import GroupSyncService

from .models.student import Student


@receiver(pre_save, sender=Student)
def track_section_change(sender, instance, **kwargs):
    """
    Store the old section ID to handle participant removal if it changes.
    """
    if instance.pk:
        try:
            old_instance = Student.objects.get(pk=instance.pk)
            instance._old_section_id = old_instance.section_id
        except Student.DoesNotExist:
            instance._old_section_id = None
    else:
        instance._old_section_id = None


@receiver(post_save, sender=Student)
def sync_student_groups(sender, instance, created, **kwargs):
    """
    Trigger GroupSyncService when a student is saved.
    """
    # 1. Handle Section Change (Removal from old)
    old_section_id = getattr(instance, "_old_section_id", None)
    if old_section_id and old_section_id != instance.section_id:
        GroupSyncService.remove_from_old_sections(instance, old_section_id)

    # 2. Sync with New Section
    if instance.section:
        GroupSyncService.sync_section_group(instance)
