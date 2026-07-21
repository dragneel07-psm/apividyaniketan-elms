# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Conversation, ConversationParticipant, Message

User = get_user_model()


class UserShortSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["user_id", "email", "full_name", "role"]

    def get_full_name(self, obj):
        return obj.get_full_name()


class MessageSerializer(serializers.ModelSerializer):
    sender_details = UserShortSerializer(source="sender", read_only=True)

    class Meta:
        model = Message
        fields = [
            "message_id",
            "conversation",
            "sender",
            "sender_details",
            "content",
            "is_system_message",
            "created_at",
        ]
        read_only_fields = ["sender", "is_system_message"]


class ConversationParticipantSerializer(serializers.ModelSerializer):
    user_details = UserShortSerializer(source="user", read_only=True)

    class Meta:
        model = ConversationParticipant
        fields = ["user", "user_details", "joined_at", "last_read_at"]


class ConversationSerializer(serializers.ModelSerializer):
    participants = ConversationParticipantSerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            "conversation_id",
            "type",
            "title",
            "participants",
            "last_message",
            "unread_count",
            "created_at",
            "updated_at",
        ]

    def get_last_message(self, obj):
        last_msg = obj.messages.last()
        if last_msg:
            return MessageSerializer(last_msg).data
        return None

    def get_unread_count(self, obj):
        user = self.context.get("request").user
        participant = obj.participants.filter(user=user).first()
        if not participant:
            return 0
        return obj.messages.filter(created_at__gt=participant.last_read_at).count()
