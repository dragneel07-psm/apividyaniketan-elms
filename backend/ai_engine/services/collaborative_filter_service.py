# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
CollaborativeFilterService — "Students like you also learned..." recommendations.

Algorithm:
  1. Build a skill mastery vector for the target student (skill_tag_id → p_mastery).
  2. Find other students in the same class who have a similar mastery profile
     (cosine similarity of mastery vectors, min similarity 0.6).
  3. Identify lessons that similar students recently completed but the target
     student has NOT yet started.
  4. Rank those lessons by:
       a. How many similar students completed them (popularity among peers)
       b. Whether they map to the target student's skill gaps (relevance boost)
  5. Return top-N recommended lessons.

This runs entirely in-memory using Python (no pgvector needed) because mastery
vectors are small (~100 dimensions at most).
"""

from __future__ import annotations

import logging
import math
from typing import Any

logger = logging.getLogger(__name__)

# Number of peer students to consider
MAX_PEERS = 20
# Minimum cosine similarity to qualify as "similar"
MIN_PEER_SIMILARITY = 0.6
# Maximum recommendations to return
TOP_N = 8


class CollaborativeFilterService:
    def __init__(self, *, tenant):
        self.tenant = tenant

    def recommend_lessons(self, student, using="default") -> list[dict[str, Any]]:
        """
        Return a ranked list of lesson recommendations for a student based on
        what similar peers have completed.

        Returns:
          [
            {
              "lesson_id": int,
              "lesson_title": str,
              "subject_name": str,
              "peer_completion_count": int,
              "relevance_score": float,   # higher = more relevant (gap match + popularity)
              "reason": str,
            }
          ]
        """
        from academic.models import Lesson, LessonProgress
        from academic.models.student import Student
        from ai_engine.models import SkillMastery, SkillTag

        # 1. Build target student's mastery vector
        target_vector = self._mastery_vector(student, using=using)
        if not target_vector:
            return []

        # 2. Fetch peer students (same class)
        peers = (
            Student.objects.using(using)
            .filter(academic_class=student.academic_class)
            .exclude(student_id=student.student_id)
            .select_related("user")[
                : MAX_PEERS * 3
            ]  # over-fetch; filter by similarity next
        )

        # 3. Bulk-fetch all peer masteries in one query, then compute similarity
        from ai_engine.models import SkillMastery

        peer_list = list(peers)
        peer_ids_all = [p.student_id for p in peer_list]
        peer_masteries_raw = (
            SkillMastery.objects.using(using)
            .filter(student_id__in=peer_ids_all)
            .values("student_id", "skill_tag_id", "p_mastery")
        )
        peer_vectors: dict = {}
        for row in peer_masteries_raw:
            sid = row["student_id"]
            peer_vectors.setdefault(sid, {})[str(row["skill_tag_id"])] = row[
                "p_mastery"
            ]

        similar_peers = []
        for peer in peer_list:
            peer_vector = peer_vectors.get(peer.student_id)
            if not peer_vector:
                continue
            sim = self._skill_vector_similarity(target_vector, peer_vector)
            if sim >= MIN_PEER_SIMILARITY:
                similar_peers.append((peer, sim))

        similar_peers.sort(key=lambda x: x[1], reverse=True)
        similar_peers = similar_peers[:MAX_PEERS]

        if not similar_peers:
            return []

        # 4. Collect lessons completed by similar peers
        peer_ids = [p.student_id for p, _ in similar_peers]
        peer_completions = (
            LessonProgress.objects.using(using)
            .filter(student_id__in=peer_ids, completed=True)
            .values("lesson_id")
        )
        peer_lesson_counts: dict[int, int] = {}
        for row in peer_completions:
            lid = row["lesson_id"]
            peer_lesson_counts[lid] = peer_lesson_counts.get(lid, 0) + 1

        if not peer_lesson_counts:
            return []

        # 5. Remove lessons the target student has already started
        started = set(
            LessonProgress.objects.using(using)
            .filter(student=student)
            .values_list("lesson_id", flat=True)
        )
        candidate_ids = [lid for lid in peer_lesson_counts if lid not in started]

        if not candidate_ids:
            return []

        # 6. Fetch lesson metadata
        lessons = {
            l.id: l
            for l in Lesson.objects.using(using)
            .filter(id__in=candidate_ids)
            .select_related("chapter__subject")
        }

        # 7. Identify student's skill gaps (p_mastery < 0.6)
        gap_skill_ids = set(
            SkillMastery.objects.using(using)
            .filter(student=student, p_mastery__lt=0.6)
            .values_list("skill_tag_id", flat=True)
        )

        # Build lesson → skill tags mapping for gap boost
        from ai_engine.models import SkillTag

        skill_tags_by_lesson: dict[int, set] = {}
        for tag in (
            SkillTag.objects.using(using)
            .filter(
                lessons__id__in=candidate_ids,
                tenant=self.tenant,
            )
            .prefetch_related("lessons")
        ):
            for lesson in tag.lessons.filter(id__in=candidate_ids):
                skill_tags_by_lesson.setdefault(lesson.id, set()).add(tag.id)

        # 8. Score and rank
        results = []
        for lid in candidate_ids:
            lesson = lessons.get(lid)
            if lesson is None:
                continue
            peer_count = peer_lesson_counts[lid]
            # Gap relevance boost: how many of this lesson's skill tags are gaps
            lesson_skill_ids = skill_tags_by_lesson.get(lid, set())
            gap_overlap = len(lesson_skill_ids & gap_skill_ids)
            relevance = peer_count + (gap_overlap * 2)  # weight gap matches

            subject_name = ""
            try:
                subject_name = lesson.chapter.subject.name
            except Exception:
                pass

            peer_pct = round((peer_count / len(similar_peers)) * 100)
            reason = (
                f"{peer_pct}% of students with similar skill levels completed this lesson"
                + (
                    f" — it covers {gap_overlap} of your skill gap areas"
                    if gap_overlap
                    else ""
                )
            )

            results.append(
                {
                    "lesson_id": lid,
                    "lesson_title": lesson.title,
                    "subject_name": subject_name,
                    "peer_completion_count": peer_count,
                    "relevance_score": round(relevance, 2),
                    "reason": reason,
                }
            )

        results.sort(key=lambda x: x["relevance_score"], reverse=True)
        return results[:TOP_N]

    # ------------------------------------------------------------------ #
    #  Internals
    # ------------------------------------------------------------------ #

    def _mastery_vector(self, student, using="default") -> dict[str, float]:
        from ai_engine.models import SkillMastery

        return {
            str(m.skill_tag_id): m.p_mastery
            for m in SkillMastery.objects.using(using).filter(student=student)
        }

    @staticmethod
    def _skill_vector_similarity(a: dict[str, float], b: dict[str, float]) -> float:
        keys = set(a) & set(b)
        if not keys:
            return 0.0
        dot = sum(a[k] * b[k] for k in keys)
        norm_a = math.sqrt(sum(v**2 for v in a.values()))
        norm_b = math.sqrt(sum(v**2 for v in b.values()))
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot / (norm_a * norm_b)
