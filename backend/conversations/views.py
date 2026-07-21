# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.db.models import Q
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .ai_handler import handle_ai_response
from .models import Conversation, ConversationParticipant, Message
from .serializers import (
    ConversationParticipantSerializer,
    ConversationSerializer,
    MessageSerializer,
)


class ConversationViewSet(viewsets.ModelViewSet):
    queryset = Conversation.objects.all()
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Filter by tenant and where the user is a participant
        return Conversation.objects.filter(
            tenant=self.request.tenant, participants__user=self.request.user
        ).distinct()

    def perform_create(self, serializer):
        conversation = serializer.save(tenant=self.request.tenant)
        # Auto-add the creator as a participant
        ConversationParticipant.objects.get_or_create(
            conversation=conversation,
            user=self.request.user,
        )
        # Add any participants passed in the request
        for uid in self.request.data.get("participants", []):
            ConversationParticipant.objects.get_or_create(
                conversation=conversation,
                user_id=uid,
            )

    @action(detail=True, methods=["post"])
    def mark_as_read(self, request, pk=None):
        conversation = self.get_object()
        participant = conversation.participants.filter(user=request.user).first()
        if participant:
            participant.last_read_at = timezone.now()
            participant.save()
            return Response({"status": "marked as read"})
        return Response(
            {"error": "Not a participant"}, status=status.HTTP_403_FORBIDDEN
        )

    @action(detail=False, methods=["post"])
    def start_direct_message(self, request):
        other_user_id = request.data.get("user_id")
        if not other_user_id:
            return Response(
                {"error": "user_id is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        # Check if direct conversation already exists between these two
        existing = (
            Conversation.objects.filter(
                type="direct",
                tenant=self.request.tenant,
                participants__user=request.user,
            )
            .filter(participants__user_id=other_user_id)
            .first()
        )

        if existing:
            return Response(
                ConversationSerializer(existing, context={"request": request}).data
            )

        # Create new direct conversation
        conversation = Conversation.objects.create(
            type="direct", tenant=self.request.tenant
        )
        ConversationParticipant.objects.create(
            conversation=conversation, user=request.user
        )
        ConversationParticipant.objects.create(
            conversation=conversation, user_id=other_user_id
        )

        return Response(
            ConversationSerializer(conversation, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["post"])
    def create_group(self, request):
        title = request.data.get("title")
        participant_ids = request.data.get("participant_ids", [])

        if not title:
            return Response(
                {"error": "title is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        conversation = Conversation.objects.create(
            type="group", title=title, tenant=self.request.tenant
        )

        # Add creator
        ConversationParticipant.objects.create(
            conversation=conversation, user=request.user
        )

        # Add others
        for user_id in participant_ids:
            ConversationParticipant.objects.get_or_create(
                conversation=conversation, user_id=user_id
            )

        return Response(
            ConversationSerializer(conversation, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"])
    def add_participants(self, request, pk=None):
        conversation = self.get_object()
        if conversation.type != "group":
            return Response(
                {"error": "Can only add participants to groups"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        participant_ids = request.data.get("participant_ids", [])
        for user_id in participant_ids:
            ConversationParticipant.objects.get_or_create(
                conversation=conversation, user_id=user_id
            )

        return Response({"status": "participants added"})

    @action(detail=True, methods=["post"])
    def remove_participant(self, request, pk=None):
        conversation = self.get_object()
        user_id = request.data.get("user_id")
        if not user_id:
            return Response(
                {"error": "user_id is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        ConversationParticipant.objects.filter(
            conversation=conversation, user_id=user_id
        ).delete()
        return Response({"status": "participant removed"})


class MessageViewSet(viewsets.ModelViewSet):
    queryset = Message.objects.all()
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        conversation_id = self.request.query_params.get("conversation")
        if not conversation_id:
            return Message.objects.none()

        # Ensure user is participant in this conversation
        if not ConversationParticipant.objects.filter(
            conversation_id=conversation_id, user=self.request.user
        ).exists():
            return Message.objects.none()

        return Message.objects.filter(conversation_id=conversation_id).order_by(
            "created_at"
        )

    def perform_create(self, serializer):
        conversation_id = self.request.data.get("conversation")
        # Security check: Ensure user is participant
        if not ConversationParticipant.objects.filter(
            conversation_id=conversation_id, user=self.request.user
        ).exists():
            raise permissions.exceptions.PermissionDenied(
                "You are not a participant in this conversation."
            )

        message = serializer.save(sender=self.request.user)

        # Trigger AI Response (Phase 3)
        handle_ai_response(conversation_id, message.content, self.request.user)
