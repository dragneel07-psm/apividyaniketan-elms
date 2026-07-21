# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.conf import settings
from django.db.models import Q

from ai_engine.services.tutor_service import ai_tutor_service
from users.models import UserAccount

from .models import Conversation, ConversationParticipant, Message


def handle_ai_response(conversation_id, user_message_content, user):
    """
    Trigger an AI response if the conversation is with an AI assistant
    or if the message contains an @ai trigger.
    """
    try:
        conversation = Conversation.objects.get(conversation_id=conversation_id)

        is_triggered = False
        if conversation.type == "direct":
            # Check if any participant is our AI Assistant
            ai_participant = (
                conversation.participants.filter(
                    Q(user__email="ai-assistant@apeesys.com")
                    | Q(user__username="ai_assistant")
                )
                .exclude(user=user)
                .exists()
            )

            if ai_participant:
                is_triggered = True

        elif (
            conversation.type == "group"
            and user_message_content.strip().lower().startswith("@ai")
        ):
            is_triggered = True
            user_message_content = (
                user_message_content.lower().replace("@ai", "", 1).strip()
            )

        if not is_triggered:
            return None

        # Get conversation history for context
        history = Message.objects.filter(conversation=conversation).order_by(
            "-created_at"
        )[:5]
        history_formatted = []
        for msg in reversed(history):
            role = (
                "assistant"
                if msg.sender.email == "ai-assistant@apeesys.com"
                else "user"
            )
            history_formatted.append({"role": role, "content": msg.content})

        # Generate AI response using Tutor Service
        # Note: We pass the history to maintain conversation context
        response_data = ai_tutor_service.generate_tutor_response(
            message=user_message_content, conversation_history=history_formatted
        )

        # Get or create AI Assistant user for this tenant
        ai_user, _ = UserAccount.objects.get_or_create(
            email="ai-assistant@apeesys.com",
            defaults={
                "username": "ai_assistant",
                "first_name": "AI",
                "last_name": "Assistant",
                "role": "admin",
                "tenant": conversation.tenant,
            },
        )

        # Save AI message
        ai_message = Message.objects.create(
            conversation=conversation,
            sender=ai_user,
            content=response_data["response"],
            tenant=conversation.tenant,
        )

        return ai_message
    except Exception as e:
        print(f"Error in handle_ai_response: {e}")
        return None
