from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import json
import re
from ..models.skill_model import OutputContract, RoutingMetadata, SafetyPolicy, SkillManifest
from .skill_compiler import skill_compiler


ALIASES = {
    "health": "healthcare",
    "medical": "healthcare",
    "y-te": "healthcare",
    "tech": "it",
    "cntt": "it",
    "software": "it",
}


class SkillRegistry:
    """In-memory domain/skill registry. Disk is read once per process."""

    def __init__(self, data_dir: Optional[Path] = None) -> None:
        self.data_dir = data_dir or Path(__file__).resolve().parent.parent / "data"
        self._packs: Dict[str, Dict[str, Any]] = {}
        self._skills: Dict[str, List[SkillManifest]] = {}
        self._repo_skills: List[SkillManifest] = []

    def load(self) -> None:
        domains_dir = self.data_dir / "domains"
        for path in domains_dir.glob("*.json"):
            with path.open("r", encoding="utf-8") as source:
                pack = json.load(source)
            domain_id = str(pack.get("id") or path.stem).strip().lower()
            self._packs[domain_id] = pack
            self._skills[domain_id] = self._build_skills(domain_id, pack)
        self._repo_skills = self._load_repo_skills()

    def get_domain_pack(self, domain_id: str) -> Dict[str, Any]:
        clean_id = self.normalize_domain(domain_id)
        if not self._packs:
            self.load()
        try:
            return self._packs[clean_id]
        except KeyError as exc:
            raise FileNotFoundError(f"Domain pack '{clean_id}' không tồn tại") from exc

    def select_skill_context(
        self, domain_id: str, template_id: Optional[str], raw_prompt: str, max_skills: int = 2
    ) -> str:
        clean_id = self.normalize_domain(domain_id)
        if not self._skills:
            self.load()
        skills = self._skills.get(clean_id, [])
        selected = skill_compiler.route(
            skills, domain_id=clean_id, template_id=template_id,
            raw_prompt=raw_prompt, limit=max_skills
        )
        if not selected and skills:
            selected = [(sorted(
                skills, key=lambda item: item.routing.priority, reverse=True
            )[0], 0.1)]
        selected_repo = skill_compiler.route(
            self._repo_skills, domain_id=clean_id, template_id=template_id,
            raw_prompt=raw_prompt, limit=1
        )
        return skill_compiler.compile(selected + selected_repo)

    @staticmethod
    def normalize_domain(domain_id: str) -> str:
        clean_id = (domain_id or "").strip().lower()
        return ALIASES.get(clean_id, clean_id)

    @staticmethod
    def _build_skills(domain_id: str, pack: Dict[str, Any]) -> List[SkillManifest]:
        skills: List[SkillManifest] = []
        base_triggers = [domain_id]
        for template in pack.get("templates", []):
            title = str(template.get("title", ""))
            task_type = str(template.get("default_task_type", ""))
            triggers = base_triggers + re.findall(r"[a-zA-ZÀ-ỹ0-9_-]{4,}", f"{title} {task_type}".lower())
            instructions = template.get("system_prompt", "").strip()
            if instructions:
                    skills.append(SkillManifest(
                        id=f"{domain_id}.{template.get('id', 'default')}",
                        name=title,
                        description=str(template.get("description", "")),
                        domain_id=domain_id,
                        template_id=template.get("id"),
                        instructions=instructions,
                        routing=RoutingMetadata(
                            domains=[domain_id], template_ids=[str(template.get("id", ""))],
                            keywords=list(dict.fromkeys(triggers)), priority=10,
                        ),
                        safety=SafetyPolicy(
                            red_flags=list(pack.get("red_flags", [])),
                            required_disclaimer=pack.get("required_disclaimer"),
                        ),
                        output=OutputContract(format="Markdown"),
                    ))
        return skills

    def _load_repo_skills(self) -> List[SkillManifest]:
        skills_dir = self.data_dir.parent.parent / ".github" / "skills"
        loaded: List[SkillManifest] = []
        for path in sorted(skills_dir.glob("*/SKILL.md")):
            content = path.read_text(encoding="utf-8")
            metadata, body = self._split_frontmatter(content)
            loaded.append(SkillManifest(
                id=path.parent.name,
                name=metadata.get("name", path.parent.name),
                description=metadata.get("description", ""),
                source="repository",
                instructions=body.strip(),
                routing=RoutingMetadata(
                    keywords=list(dict.fromkeys(re.findall(
                        r"[a-zA-ZÀ-ỹ0-9_+#.-]{3,}",
                        f"{path.parent.name} {metadata.get('name', '')} "
                        f"{metadata.get('description', '')} {body}"
                    .lower()))),
                    priority=5,
                ),
            ).with_hash())
        return loaded

    @staticmethod
    def _split_frontmatter(content: str) -> Tuple[Dict[str, str], str]:
        if not content.startswith("---"):
            return {}, content
        parts = content.split("---", 2)
        if len(parts) != 3:
            return {}, content
        metadata: Dict[str, str] = {}
        for line in parts[1].splitlines():
            if ":" in line:
                key, value = line.split(":", 1)
                metadata[key.strip()] = value.strip()
        return metadata, parts[2]


skill_registry = SkillRegistry()
