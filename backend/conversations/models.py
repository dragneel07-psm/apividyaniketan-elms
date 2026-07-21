# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import uuid

from django.conf import settings
from django.db import models


class Conversation(models.Model):
    CONVERSATION_TYPES = [
        ("direct", "Direct Message"),
        ("group", "Group Chat"),
    ]

    conversation_id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    tenant = models.ForeignKey(
        "core.Tenant",
        on_delete=models.CASCADE,
        related_name="conversations",
        null=True,
        blank=True,
        db_constraint=False,
    )
    type = models.CharField(max_length=20, choices=CONVERSATION_TYPES, default="direct")
    title = models.CharField(max_length=255, null=True, blank=True)

    # Auto-Sync Context
    CONTEXT_TYPES = [
        ("section", "Class Section"),
        ("subject", "Subject Group"),
        ("department", "Department"),
    ]
    context_type = models.CharField(
        max_length=50, choices=CONTEXT_TYPES, null=True, blank=True
    )
    context_id = models.CharField(max_length=255, null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.type} - {self.title or self.conversation_id}"


class ConversationParticipant(models.Model):
    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE, related_name="participants"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="conversation_memberships",
    )
    joined_at = models.DateTimeField(auto_now_add=True)
    last_read_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["conversation", "user"]

    def __str__(self):
        return f"{self.user} in {self.conversation}"


class Message(models.Model):
    message_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE, related_name="messages"
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_messages"
    )
    content = models.TextField()
    is_system_message = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Touch the conversation to update updated_at for sorting
        self.conversation.save()

    def __str__(self):
        return f"Msg from {self.sender} in {self.conversation}"
