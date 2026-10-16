"""Deterministic skill routing and bounded context compilation."""

from __future__ import annotations

import re
from typing import Iterable, List, Sequence, Tuple

from ..models.skill_model import SkillManifest


def _terms(value: str) -> set[str]:
    return set(re.findall(r"[a-zA-ZÀ-ỹ0-9_+#.-]{3,}", (value or "").lower()))


class SkillCompiler:
    """Validate, route and compile manifests without semantic/embedding state."""

    def validate(self, manifest: SkillManifest) -> SkillManifest:
        if not manifest.instructions.strip():
            raise ValueError(f"Skill '{manifest.id}' không có instructions")
        return manifest.with_hash()

    def route(
        self,
        manifests: Iterable[SkillManifest],
        *,
        domain_id: str,
        template_id: str | None,
        raw_prompt: str,
        limit: int = 2,
    ) -> List[Tuple[SkillManifest, float]]:
        text = _terms(raw_prompt)
        domain = (domain_id or "").lower()
        ranked: List[Tuple[float, SkillManifest]] = []
        for manifest in manifests:
            routing = manifest.routing
            score = float(routing.priority)
            keywords = set(_terms(" ".join(routing.keywords)))
            if domain and domain in {item.lower() for item in routing.domains}:
                score += 20
            if template_id and template_id in routing.template_ids:
                score += 50
            score += min(30.0, float(len(text & keywords) * 10))
            if score <= 0:
                continue
            confidence = min(1.0, score / 100.0)
            if confidence >= routing.min_confidence:
                ranked.append((score, manifest))
        ranked.sort(key=lambda item: (-item[0], item[1].id))
        return [(manifest, min(1.0, score / 100.0)) for score, manifest in ranked[:limit]]

    def compile(
        self,
        selected: Sequence[Tuple[SkillManifest, float]],
        *,
        max_tokens: int = 1800,
    ) -> str:
        """Compile selected context with explicit instruction precedence.

        Approximate token accounting keeps this dependency-free and deterministic.
        """
        if not selected:
            return ""
        max_chars = max(256, max_tokens * 4)
        parts = [
            "[SKILL CONTEXT]\n"
            "Priority: safety policies and explicit user requirements override skill "
            "defaults; more specific skills override general guidance."
        ]
        used = len(parts[0])
        for manifest, confidence in selected:
            skill = self.validate(manifest)
            block = (
                f"\n\n[{skill.source.upper()} SKILL: {skill.id} | "
                f"confidence={confidence:.2f} | priority={skill.routing.priority}]\n"
                f"Instructions:\n{skill.instructions.strip()}"
            )
            if skill.constraints.must:
                block += "\nMust:\n- " + "\n- ".join(skill.constraints.must)
            if skill.constraints.must_not:
                block += "\nMust not:\n- " + "\n- ".join(skill.constraints.must_not)
            if skill.safety.rules:
                block += "\nSafety:\n- " + "\n- ".join(skill.safety.rules)
            if skill.safety.red_flags:
                block += "\nSafety red flags:\n- " + "\n- ".join(skill.safety.red_flags)
            if skill.safety.required_disclaimer:
                block += "\nRequired disclaimer:\n" + skill.safety.required_disclaimer
            if skill.output.sections:
                block += "\nOutput sections: " + ", ".join(skill.output.sections)
            if skill.relations.requires:
                block += "\nRequires: " + ", ".join(skill.relations.requires)
            if skill.relations.conflicts:
                block += "\nConflicts: " + ", ".join(skill.relations.conflicts)
            if used + len(block) > max_chars:
                remaining = max_chars - used
                marker = "\n[skill context truncated]"
                if remaining > len(marker):
                    parts.append(block[:remaining - len(marker)].rstrip() + marker)
                break
            parts.append(block)
            used += len(block)
        return "".join(parts)


skill_compiler = SkillCompiler()
