# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
KnowledgeGraphService — Manages the concept prerequisite graph and uses it to
find root-cause skill gaps when BKT detects low mastery.

Core idea: when a student is weak at skill X, walk the prerequisite graph
backwards to find which foundational skills may be missing. Instead of just
telling a student "practice Quadratic Equations", the learning path can first
ensure they have mastered "Factoring Polynomials" and "Expanding Brackets".

Features:
  - Add/remove prerequisite edges (admin/teacher)
  - Auto-generate prerequisite edges for a subject via LLM
  - Given a set of low-mastery skills, find root-cause gaps
  - Expose graph structure for visualisation
"""

from __future__ import annotations

import json
import logging
from typing import Any

from ai_engine.models import AIInteractionLog, SkillMastery, SkillPrerequisite, SkillTag
from ai_engine.services.provider_config import get_ai_provider_config

logger = logging.getLogger(__name__)

# BKT mastery threshold below which a skill is considered a gap
MASTERY_THRESHOLD = 0.6
# Max graph depth when walking prerequisites
MAX_DEPTH = 5


class KnowledgeGraphService:
    def __init__(self, *, tenant, user=None):
        self.tenant = tenant
        self.user = user
        self.config = get_ai_provider_config()

    # ------------------------------------------------------------------ #
    #  Prerequisite management
    # ------------------------------------------------------------------ #

    def add_prerequisite(
        self, skill_id: str, prerequisite_id: str, using="default"
    ) -> SkillPrerequisite:
        """
        Add a prerequisite edge: skill requires prerequisite.
        Silently returns existing edge if already exists.
        """
        skill = SkillTag.objects.using(using).get(id=skill_id, tenant=self.tenant)
        prereq = SkillTag.objects.using(using).get(
            id=prerequisite_id, tenant=self.tenant
        )

        # Prevent self-loops
        if skill.id == prereq.id:
            raise ValueError("A skill cannot be its own prerequisite.")

        # Prevent cycles (check if skill is already a prerequisite of prerequisite)
        if self._is_reachable(
            start_id=str(prereq.id), target_id=str(skill.id), using=using
        ):
            raise ValueError(
                f"Adding this edge would create a cycle in the prerequisite graph."
            )

        obj, _ = SkillPrerequisite.objects.using(using).get_or_create(
            skill=skill, prerequisite=prereq
        )
        return obj

    def remove_prerequisite(
        self, skill_id: str, prerequisite_id: str, using="default"
    ) -> bool:
        deleted, _ = (
            SkillPrerequisite.objects.using(using)
            .filter(skill_id=skill_id, prerequisite_id=prerequisite_id)
            .delete()
        )
        return deleted > 0

    def get_graph_for_subject(self, subject_id, using="default") -> dict[str, Any]:
        """
        Return full prerequisite graph for a subject.
        Format: { nodes: [...], edges: [...] }
        """
        skills = SkillTag.objects.using(using).filter(
            tenant=self.tenant, subject_id=subject_id
        )
        skill_ids = {str(s.id) for s in skills}

        edges = (
            SkillPrerequisite.objects.using(using)
            .filter(skill_id__in=skill_ids)
            .select_related("skill", "prerequisite")
        )

        nodes = [{"id": str(s.id), "name": s.name} for s in skills]
        edge_list = [
            {
                "from": str(e.prerequisite_id),
                "to": str(e.skill_id),
                "label": "required for",
            }
            for e in edges
        ]
        return {"nodes": nodes, "edges": edge_list}

    # ------------------------------------------------------------------ #
    #  Root-cause gap analysis
    # ------------------------------------------------------------------ #

    def find_root_cause_gaps(self, student, using="default") -> list[dict]:
        """
        For each low-mastery skill, walk the prerequisite graph to find
        which foundational skills are likely missing.

        Returns a list of root-cause gaps ordered by depth (deepest roots first):
          [
            {
              "skill_id": str,
              "skill_name": str,
              "p_mastery": float,
              "root_cause_of": [ { skill_id, skill_name, p_mastery } ],
              "depth": int,
            }
          ]
        """
        # Load all mastery records for this student
        masteries = {
            str(m.skill_tag_id): m.p_mastery
            for m in SkillMastery.objects.using(using).filter(student=student)
        }

        low_mastery_ids = {sid for sid, p in masteries.items() if p < MASTERY_THRESHOLD}
        if not low_mastery_ids:
            return []

        # For each low-mastery skill, find prerequisite gaps
        root_causes: dict[str, dict] = {}

        for skill_id in low_mastery_ids:
            self._walk_prerequisites(
                skill_id=skill_id,
                masteries=masteries,
                root_causes=root_causes,
                caused_by_skill_id=skill_id,
                depth=1,
                using=using,
            )

        # Enrich with SkillTag metadata
        all_ids = set(root_causes.keys()) | low_mastery_ids
        tags = {
            str(t.id): t
            for t in SkillTag.objects.using(using).filter(
                id__in=all_ids, tenant=self.tenant
            )
        }
        skill_tags_all = {
            str(t.id): t
            for t in SkillTag.objects.using(using).filter(
                tenant=self.tenant, id__in=low_mastery_ids
            )
        }

        result = []
        for skill_id, info in root_causes.items():
            tag = tags.get(skill_id)
            if tag is None:
                continue
            caused_by = [
                {
                    "skill_id": cid,
                    "skill_name": (tags[cid].name if cid in tags else cid),
                    "p_mastery": masteries.get(cid, 0.0),
                }
                for cid in info["caused_by"]
                if cid in tags
            ]
            result.append(
                {
                    "skill_id": skill_id,
                    "skill_name": tag.name,
                    "p_mastery": masteries.get(skill_id, 0.0),
                    "root_cause_of": caused_by,
                    "depth": info["depth"],
                }
            )

        return sorted(result, key=lambda x: (-x["depth"], x["p_mastery"]))

    # ------------------------------------------------------------------ #
    #  LLM-powered graph generation
    # ------------------------------------------------------------------ #

    def generate_prerequisites_for_subject(
        self, subject_id, using="default"
    ) -> list[dict]:
        """
        Use LLM to auto-generate prerequisite relationships between skills in a subject.
        Returns a list of { skill_name, prerequisite_name, created: bool } dicts.

        Only creates edges where both skills already exist as SkillTag objects.
        """
        skills = list(
            SkillTag.objects.using(using)
            .filter(tenant=self.tenant, subject_id=subject_id)
            .values("id", "name")
        )
        if len(skills) < 2:
            return []

        from ai_engine.services.ai_client import (
            parse_json_content,
            provider_ready,
            structured_chat,
        )

        if not provider_ready():
            return []

        skill_names = [s["name"] for s in skills]
        skill_name_to_id = {s["name"]: str(s["id"]) for s in skills}

        system_prompt = (
            "You are a curriculum expert. Given a list of academic skills/concepts, "
            "identify prerequisite relationships (skill A must be learned before skill B). "
            'Respond with JSON: {"pairs": [{"skill": <advanced concept>, '
            '"prerequisite": <foundational concept>}]}. Only include relationships where '
            "both names appear exactly in the input list."
        )
        user_prompt = (
            f"Skills: {json.dumps(skill_names)}\n\n"
            "List prerequisite pairs (max 20). Only use skill names from the list above exactly as given."
        )

        pairs_schema = {
            "type": "object",
            "properties": {
                "pairs": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "skill": {"type": "string"},
                            "prerequisite": {"type": "string"},
                        },
                        "required": ["skill", "prerequisite"],
                        "additionalProperties": False,
                    },
                }
            },
            "required": ["pairs"],
            "additionalProperties": False,
        }

        try:
            response = structured_chat(
                [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                schema=pairs_schema,
                schema_name="prerequisite_pairs",
                temperature=0.2,
                max_tokens=600,
            )
            pt = getattr(response.usage, "prompt_tokens", 0)
            ct = getattr(response.usage, "completion_tokens", 0)
            AIInteractionLog.objects.using(using).create(
                tenant=self.tenant,
                user=self.user,
                feature_used="knowledge_graph_generation",
                prompt_tokens=pt,
                completion_tokens=ct,
                total_tokens=pt + ct,
            )
            parsed = parse_json_content(response)
            pairs = parsed.get("pairs", []) if isinstance(parsed, dict) else parsed
        except Exception as exc:
            logger.warning("KnowledgeGraphService: LLM call failed: %s", exc)
            return []

        results = []
        for pair in pairs:
            if not isinstance(pair, dict):
                continue
            skill_name = pair.get("skill", "")
            prereq_name = pair.get("prerequisite", "")
            if (
                skill_name not in skill_name_to_id
                or prereq_name not in skill_name_to_id
            ):
                continue
            try:
                self.add_prerequisite(
                    skill_id=skill_name_to_id[skill_name],
                    prerequisite_id=skill_name_to_id[prereq_name],
                    using=using,
                )
                results.append(
                    {
                        "skill_name": skill_name,
                        "prerequisite_name": prereq_name,
                        "created": True,
                    }
                )
            except Exception as exc:
                results.append(
                    {
                        "skill_name": skill_name,
                        "prerequisite_name": prereq_name,
                        "created": False,
                        "error": str(exc),
                    }
                )

        return results

    # ------------------------------------------------------------------ #
    #  Internals
    # ------------------------------------------------------------------ #

    def _walk_prerequisites(
        self,
        *,
        skill_id: str,
        masteries: dict,
        root_causes: dict,
        caused_by_skill_id: str,
        depth: int,
        using: str,
    ):
        if depth > MAX_DEPTH:
            return

        prereqs = (
            SkillPrerequisite.objects.using(using)
            .filter(skill_id=skill_id)
            .values_list("prerequisite_id", flat=True)
        )

        for prereq_id in prereqs:
            prereq_id_str = str(prereq_id)
            p_mastery = masteries.get(prereq_id_str, 0.0)
            if p_mastery < MASTERY_THRESHOLD:
                if prereq_id_str not in root_causes:
                    root_causes[prereq_id_str] = {"caused_by": set(), "depth": depth}
                root_causes[prereq_id_str]["caused_by"].add(caused_by_skill_id)
                root_causes[prereq_id_str]["depth"] = max(
                    root_causes[prereq_id_str]["depth"], depth
                )
                # Recurse deeper
                self._walk_prerequisites(
                    skill_id=prereq_id_str,
                    masteries=masteries,
                    root_causes=root_causes,
                    caused_by_skill_id=prereq_id_str,
                    depth=depth + 1,
                    using=using,
                )

    def _is_reachable(self, start_id: str, target_id: str, using: str) -> bool:
        """BFS to check if target is reachable from start via prerequisite edges."""
        visited = set()
        queue = [start_id]
        while queue:
            current = queue.pop(0)
            if current == target_id:
                return True
            if current in visited:
                continue
            visited.add(current)
            prereqs = (
                SkillPrerequisite.objects.using(using)
                .filter(skill_id=current)
                .values_list("prerequisite_id", flat=True)
            )
            queue.extend(str(p) for p in prereqs)
        return False


knowledge_graph_service_factory = KnowledgeGraphService
