# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import uuid as uuid_lib

from django.conf import settings
from django.db import models

from core.models.tenant import Tenant
from core.vector import VectorField


class AIInteractionLog(models.Model):
    log_id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, db_constraint=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    feature_used = models.CharField(max_length=100)  # e.g., 'tutor', 'grading', 'email'
    prompt_tokens = models.IntegerField(default=0)
    completion_tokens = models.IntegerField(default=0)
    total_tokens = models.IntegerField(default=0)
    cost_estimated = models.DecimalField(max_digits=10, decimal_places=6, default=0.0)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.tenant.name} - {self.feature_used}"


class StudentAIReport(models.Model):
    REPORT_TYPE_CHOICES = [
        ("student", "Student Report"),
        ("parent", "Parent Report"),
        ("teacher", "Teacher Report"),
        ("class", "Class Summary"),
    ]
    report_id = models.UUIDField(
        primary_key=True, default=uuid_lib.uuid4, editable=False
    )
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, db_constraint=False)
    student = models.ForeignKey(
        "academic.Student", on_delete=models.CASCADE, related_name="ai_reports"
    )
    report_type = models.CharField(
        max_length=20, choices=REPORT_TYPE_CHOICES, default="student"
    )
    report_data = models.JSONField()
    generated_at = models.DateTimeField(auto_now_add=True)
    is_automated = models.BooleanField(default=False)

    def __str__(self):
        return f"Report for {self.student} - {self.generated_at.date()}"


class LearningPath(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, db_constraint=False)
    student = models.ForeignKey(
        "academic.Student", on_delete=models.CASCADE, related_name="learning_paths"
    )
    subject = models.ForeignKey(
        "academic.Subject",
        on_delete=models.CASCADE,
        related_name="learning_paths",
        null=True,
        blank=True,
    )
    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    generated_by_ai = models.BooleanField(default=True)

    def __str__(self):
        return f"Path: {self.title} ({self.student})"


class LearningNode(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    learning_path = models.ForeignKey(
        LearningPath, on_delete=models.CASCADE, related_name="nodes"
    )
    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    order = models.IntegerField(default=0)
    resource_type = models.CharField(
        max_length=50,
        choices=[
            ("video", "Video"),
            ("article", "Article"),
            ("quiz", "Quiz"),
            ("assignment", "Assignment"),
            ("topic", "Topic Concept"),
        ],
        default="topic",
    )
    resource_link = models.CharField(
        max_length=500, null=True, blank=True
    )  # Could be internal URL or external
    lesson = models.ForeignKey(
        "academic.Lesson",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="learning_nodes",
    )
    estimated_minutes = models.IntegerField(default=15)
    status = models.CharField(
        max_length=20,
        choices=[
            ("locked", "Locked"),
            ("unlocked", "Unlocked"),
            ("in_progress", "In Progress"),
            ("completed", "Completed"),
        ],
        default="locked",
    )
    completed_at = models.DateTimeField(null=True, blank=True)

    # SM-2 Spaced Repetition fields
    ease_factor = models.FloatField(default=2.5, help_text="SM-2 ease factor (min 1.3)")
    interval_days = models.IntegerField(default=1, help_text="Days until next review")
    repetitions = models.IntegerField(
        default=0, help_text="Number of successful reviews"
    )
    next_review_at = models.DateTimeField(
        null=True, blank=True, help_text="Scheduled next review datetime"
    )
    last_quality = models.IntegerField(
        null=True, blank=True, help_text="Last recall quality rating (0-5)"
    )

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{self.order}. {self.title}"


class StudyEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, db_constraint=False)
    student = models.ForeignKey(
        "academic.Student", on_delete=models.CASCADE, related_name="study_events"
    )
    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    event_type = models.CharField(
        max_length=50,
        choices=[
            ("class", "Class Session"),
            ("study", "Self Study"),
            ("assignment", "Assignment due"),
            ("exam", "Exam Prep"),
            ("break", "Break"),
            ("review", "Spaced Review"),
            ("skill_practice", "Skill Practice"),
        ],
        default="study",
    )
    # Extra metadata set by the AI planner (not persisted to DB — used for response enrichment)
    node_id = models.UUIDField(
        null=True, blank=True, help_text="Learning node linked to this session"
    )
    skill_tag_id = models.UUIDField(
        null=True, blank=True, help_text="Skill gap linked to this session"
    )
    estimated_minutes = models.PositiveIntegerField(default=60)
    subject = models.ForeignKey(
        "academic.Subject", on_delete=models.SET_NULL, null=True, blank=True
    )
    is_completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.start_time})"


class ContentChunk(models.Model):
    SOURCE_TYPE_CHOICES = [
        ("lesson", "Lesson"),
        ("chapter", "Chapter"),
        ("material", "Material"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        db_constraint=False,
        related_name="content_chunks",
    )
    source_type = models.CharField(max_length=20, choices=SOURCE_TYPE_CHOICES)
    source_id = models.CharField(max_length=64, db_index=True)
    text = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)
    embedding = VectorField(
        dimensions=getattr(settings, "AI_EMBEDDING_DIMENSIONS", 1536)
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(
                fields=["tenant", "source_type"], name="ai_chunk_tenant_type_idx"
            ),
            models.Index(
                fields=["tenant", "source_id"], name="ai_chunk_tenant_source_idx"
            ),
        ]

    def __str__(self):
        return f"{self.source_type}:{self.source_id}"


class AiGeneratedArtifact(models.Model):
    ARTIFACT_TYPE_CHOICES = [
        ("summary", "Summary"),
        ("exam_notes", "Exam Notes"),
        ("exam_paper", "Exam Paper"),
        ("misconception_report", "Misconception Report"),
    ]
    SOURCE_TYPE_CHOICES = [
        ("lesson", "Lesson"),
        ("chapter", "Chapter"),
        ("material", "Material"),
        ("subject", "Subject"),
        ("class", "Class"),
        ("student", "Student"),
    ]
    LANG_CHOICES = [
        ("en", "English"),
        ("ne", "Nepali"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        db_constraint=False,
        related_name="ai_generated_artifacts",
    )
    artifact_type = models.CharField(max_length=32, choices=ARTIFACT_TYPE_CHOICES)
    source_type = models.CharField(
        max_length=20, choices=SOURCE_TYPE_CHOICES, default="lesson"
    )
    source_id = models.CharField(max_length=64, db_index=True)
    lang = models.CharField(max_length=2, choices=LANG_CHOICES, default="en")
    content = models.JSONField(default=dict, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(
                fields=["tenant", "artifact_type", "source_type"],
                name="ai_artifact_tenant_type_idx",
            ),
            models.Index(
                fields=["tenant", "source_type", "source_id"],
                name="ai_artifact_source_idx",
            ),
            models.Index(
                fields=["tenant", "lang", "created_at"],
                name="ai_artifact_lang_created_idx",
            ),
        ]

    def __str__(self):
        return f"{self.artifact_type}:{self.source_type}:{self.source_id}:{self.lang}"


class SkillTag(models.Model):
    """
    A fine-grained skill/concept that can be tagged on lessons and assessments.
    Used as the unit of mastery tracking in Bayesian Knowledge Tracing.
    Examples: "Quadratic Equations", "Cell Division", "Past Tense Verbs"
    """

    id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    tenant = models.ForeignKey(
        Tenant, on_delete=models.CASCADE, db_constraint=False, related_name="skill_tags"
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    subject = models.ForeignKey(
        "academic.Subject",
        on_delete=models.CASCADE,
        related_name="skill_tags",
        null=True,
        blank=True,
    )
    lessons = models.ManyToManyField(
        "academic.Lesson", blank=True, related_name="skill_tags"
    )
    assessments = models.ManyToManyField(
        "academic.Assessment", blank=True, related_name="skill_tags"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("tenant", "name", "subject")]
        indexes = [
            models.Index(
                fields=["tenant", "subject"], name="ai_skill_tenant_subject_idx"
            ),
        ]

    def __str__(self):
        return self.name


class SkillMastery(models.Model):
    """
    Per-student, per-skill BKT mastery estimate.
    Tracks the probability that a student has mastered a given SkillTag.
    Updated after every practice event (assessment submission, quiz, lesson review).
    """

    id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    student = models.ForeignKey(
        "academic.Student", on_delete=models.CASCADE, related_name="skill_masteries"
    )
    skill_tag = models.ForeignKey(
        SkillTag, on_delete=models.CASCADE, related_name="masteries"
    )

    # BKT parameters (can be tuned per skill or per student)
    p_mastery = models.FloatField(
        default=0.1, help_text="Current estimated probability of mastery (0-1)"
    )
    p_transit = models.FloatField(default=0.1, help_text="P(learn after practice)")
    p_slip = models.FloatField(default=0.1, help_text="P(wrong | mastered)")
    p_guess = models.FloatField(default=0.2, help_text="P(correct | not mastered)")

    observations = models.IntegerField(
        default=0, help_text="Number of practice events seen"
    )
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("student", "skill_tag")]
        indexes = [
            models.Index(
                fields=["student", "p_mastery"], name="ai_skill_mastery_student_idx"
            ),
        ]

    def __str__(self):
        return f"{self.student} | {self.skill_tag.name} | p={self.p_mastery:.2f}"


class SkillPracticeEvent(models.Model):
    """
    Records a single practice observation for BKT.
    Created whenever a student completes an assessment or lesson linked to a SkillTag.
    """

    SOURCE_CHOICES = [
        ("assessment", "Assessment"),
        ("lesson", "Lesson Review"),
        ("tutor", "AI Tutor"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    student = models.ForeignKey(
        "academic.Student", on_delete=models.CASCADE, related_name="skill_events"
    )
    skill_tag = models.ForeignKey(
        SkillTag, on_delete=models.CASCADE, related_name="events"
    )
    correct = models.BooleanField(
        help_text="True if the student answered/performed correctly"
    )
    score_pct = models.FloatField(default=0.0, help_text="Score as percentage (0-100)")
    source_type = models.CharField(
        max_length=20, choices=SOURCE_CHOICES, default="assessment"
    )
    source_id = models.CharField(max_length=64, blank=True, default="")
    mastery_before = models.FloatField(default=0.0)
    mastery_after = models.FloatField(default=0.0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["student", "skill_tag", "created_at"],
                name="ai_spe_student_skill_idx",
            ),
        ]

    def __str__(self):
        return (
            f"{self.student} | {self.skill_tag.name} | {'✓' if self.correct else '✗'}"
        )


class TutorConversation(models.Model):
    """
    Persists a multi-turn tutor chat session per student.
    Replaces localStorage-only storage so history survives across devices/sessions.
    """

    MODE_CHOICES = [("direct", "Direct"), ("socratic", "Socratic")]

    id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        db_constraint=False,
        related_name="tutor_conversations",
    )
    student = models.ForeignKey(
        "academic.Student",
        on_delete=models.CASCADE,
        related_name="tutor_conversations",
        null=True,
        blank=True,
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="tutor_conversations",
    )
    subject = models.ForeignKey(
        "academic.Subject", on_delete=models.SET_NULL, null=True, blank=True
    )
    lesson = models.ForeignKey(
        "academic.Lesson", on_delete=models.SET_NULL, null=True, blank=True
    )
    title = models.CharField(max_length=255, blank=True, default="")
    preferred_mode = models.CharField(
        max_length=16,
        choices=MODE_CHOICES,
        default="direct",
        help_text="Persisted teaching mode (direct | socratic). Auto-selected if not set.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [
            models.Index(
                fields=["tenant", "user", "-updated_at"], name="ai_conv_tenant_user_idx"
            ),
        ]

    def __str__(self):
        return f"Conversation {self.id} ({self.user})"


class TutorMessage(models.Model):
    """
    A single message turn in a TutorConversation.
    """

    ROLE_CHOICES = [("user", "User"), ("assistant", "Assistant")]

    id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    conversation = models.ForeignKey(
        TutorConversation, on_delete=models.CASCADE, related_name="messages"
    )
    role = models.CharField(max_length=16, choices=ROLE_CHOICES)
    content = models.TextField()
    sources = models.JSONField(default=list, blank=True)
    prompt_tokens = models.IntegerField(default=0)
    completion_tokens = models.IntegerField(default=0)
    is_demo = models.BooleanField(default=False)
    confidence = models.FloatField(
        null=True,
        blank=True,
        help_text="RAG confidence score (0-1) for assistant messages",
    )
    confidence_label = models.CharField(
        max_length=16, blank=True, default="", help_text="high | moderate | low"
    )
    mode = models.CharField(
        max_length=16, blank=True, default="direct", help_text="direct | socratic"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(
                fields=["conversation", "created_at"], name="ai_msg_conv_created_idx"
            ),
        ]

    def __str__(self):
        return f"[{self.role}] {self.content[:60]}"


class GradingRubric(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        db_constraint=False,
        related_name="grading_rubrics",
    )
    title = models.CharField(max_length=255)
    criteria = models.JSONField(default=list, blank=True)
    total_points = models.PositiveIntegerField(default=100)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["tenant", "title"], name="ai_rubric_tenant_title_idx"),
            models.Index(
                fields=["tenant", "created_at"], name="ai_rubric_tenant_created_idx"
            ),
        ]

    def __str__(self):
        return f"{self.title} ({self.total_points})"


class AIGradingDraft(models.Model):
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        db_constraint=False,
        related_name="ai_grading_drafts",
    )
    submission = models.ForeignKey(
        "academic.Submission",
        on_delete=models.CASCADE,
        related_name="ai_grading_drafts",
    )
    rubric = models.ForeignKey(
        GradingRubric, on_delete=models.CASCADE, related_name="drafts"
    )
    score = models.FloatField(default=0)
    feedback = models.TextField(blank=True, default="")
    criteria_breakdown = models.JSONField(default=list, blank=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default="draft")
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_ai_grading_drafts",
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_ai_grading_drafts",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["tenant", "status"], name="ai_grd_draft_tnt_st_idx"),
            models.Index(
                fields=["tenant", "submission", "created_at"],
                name="ai_grade_draft_submission_idx",
            ),
        ]

    def __str__(self):
        return f"{self.submission_id}:{self.status}:{self.score}"


class SkillPrerequisite(models.Model):
    """
    Directed edge in the concept prerequisite graph.
    skill → requires → prerequisite

    Example: "Quadratic Equations" requires "Factoring Polynomials"
    The graph is tenant-scoped via the SkillTag FKs (which are already tenant-scoped).
    """

    id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    skill = models.ForeignKey(
        "SkillTag",
        on_delete=models.CASCADE,
        related_name="prerequisites",
        help_text="The skill that depends on a prerequisite.",
    )
    prerequisite = models.ForeignKey(
        "SkillTag",
        on_delete=models.CASCADE,
        related_name="dependents",
        help_text="The skill that must be understood first.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("skill", "prerequisite")]
        indexes = [
            models.Index(fields=["skill"], name="ai_prereq_skill_idx"),
            models.Index(fields=["prerequisite"], name="ai_prereq_prereq_idx"),
        ]

    def __str__(self):
        return f"{self.skill.name} → requires → {self.prerequisite.name}"


class AITokenBudget(models.Model):
    """
    Daily token budget per tenant (and optionally per student).

    Scope priority (highest wins):
      1. Student-level budget (student is set)
      2. Tenant-level budget (student is None)
      3. No limit (no active budget record found)

    Reset logic:
      - `used_today` resets to 0 when `reset_at` is in the past.
      - `reset_at` is advanced by 1 day on each reset.
      - No Celery task needed — reset happens inline on the first request after midnight.
    """

    id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        db_constraint=False,
        related_name="ai_token_budgets",
    )
    student = models.ForeignKey(
        "academic.Student",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="ai_token_budgets",
        help_text="Null = tenant-wide budget. Set = per-student override.",
    )
    daily_limit_tokens = models.IntegerField(
        default=10000,
        help_text="Max tokens per day. 0 = unlimited.",
    )
    used_today = models.IntegerField(default=0, help_text="Tokens consumed today.")
    reset_at = models.DateTimeField(
        help_text="Next daily reset timestamp (UTC midnight)."
    )
    is_active = models.BooleanField(
        default=True, help_text="Disable to suspend enforcement."
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # At most one active budget per (tenant, student) pair
        unique_together = [("tenant", "student")]
        indexes = [
            models.Index(
                fields=["tenant", "is_active"], name="ai_budget_tenant_active_idx"
            ),
            models.Index(
                fields=["tenant", "student"], name="ai_budget_tenant_student_idx"
            ),
        ]

    def __str__(self):
        scope = f"student:{self.student_id}" if self.student_id else "tenant-wide"
        return f"Budget({scope}) {self.used_today}/{self.daily_limit_tokens} tokens/day"
