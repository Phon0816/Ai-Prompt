"""Canonical, backwards-compatible models for runtime skills.

Domain JSON files and repository ``SKILL.md`` files are intentionally still
accepted as input.  The models provide one validated representation after
loading, so routing and prompt compilation do not depend on ad-hoc dict keys.
"""

from __future__ import annotations

import hashlib
import json
from typing import Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class RoutingMetadata(BaseModel):
    model_config = ConfigDict(extra="ignore")
    keywords: List[str] = Field(default_factory=list)
    domains: List[str] = Field(default_factory=list)
    template_ids: List[str] = Field(default_factory=list)
    priority: int = Field(default=0, ge=-100, le=100)
    min_confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class SafetyPolicy(BaseModel):
    model_config = ConfigDict(extra="ignore")
    rules: List[str] = Field(default_factory=list)
    red_flags: List[str] = Field(default_factory=list)
    required_disclaimer: Optional[str] = None


class OutputContract(BaseModel):
    model_config = ConfigDict(extra="ignore")
    format: str = "Markdown"
    sections: List[str] = Field(default_factory=list)
    required_fields: List[str] = Field(default_factory=list)
    content_type: Optional[str] = None


class SkillConstraints(BaseModel):
    model_config = ConfigDict(extra="ignore")
    must: List[str] = Field(default_factory=list)
    should: List[str] = Field(default_factory=list)
    must_not: List[str] = Field(default_factory=list)


class SkillRelations(BaseModel):
    model_config = ConfigDict(extra="ignore")
    requires: List[str] = Field(default_factory=list)
    conflicts: List[str] = Field(default_factory=list)


class TokenBudget(BaseModel):
    model_config = ConfigDict(extra="ignore")
    max_context_tokens: int = Field(default=1200, ge=64, le=16000)
    max_instruction_tokens: int = Field(default=900, ge=32, le=12000)


class SkillManifest(BaseModel):
    """A normalized skill manifest used by the registry and compiler."""

    model_config = ConfigDict(extra="allow")
    id: str = Field(min_length=1)
    name: str = ""
    description: str = ""
    version: str = "1.0.0"
    source: str = "domain"
    domain_id: Optional[str] = None
    template_id: Optional[str] = None
    instructions: str = ""
    routing: RoutingMetadata = Field(default_factory=RoutingMetadata)
    safety: SafetyPolicy = Field(default_factory=SafetyPolicy)
    output: OutputContract = Field(default_factory=OutputContract)
    constraints: SkillConstraints = Field(default_factory=SkillConstraints)
    relations: SkillRelations = Field(default_factory=SkillRelations)
    budget: TokenBudget = Field(default_factory=TokenBudget)
    hash: Optional[str] = None

    @field_validator("id", "version", mode="before")
    @classmethod
    def _strip_required(cls, value: object) -> str:
        return str(value).strip()

    def content_hash(self) -> str:
        payload = self.model_dump(exclude={"hash"}, mode="json")
        canonical = json.dumps(payload, ensure_ascii=False, sort_keys=True)
        return hashlib.sha256(canonical.encode("utf-8")).hexdigest()[:16]

    def with_hash(self) -> "SkillManifest":
        if self.hash:
            return self
        return self.model_copy(update={"hash": self.content_hash()})
