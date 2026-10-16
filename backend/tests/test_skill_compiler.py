import unittest

from backend.models.skill_model import (
    RoutingMetadata,
    SkillConstraints,
    SkillManifest,
)
from backend.services.skill_compiler import SkillCompiler
from backend.services.skill_registry import SkillRegistry


class TestSkillCompiler(unittest.TestCase):
    def setUp(self):
        self.compiler = SkillCompiler()

    def test_routes_template_and_keyword_deterministically(self):
        manifests = [
            SkillManifest(
                id="it.debug",
                template_id="debug",
                instructions="Find the root cause and propose a safe fix.",
                routing=RoutingMetadata(
                    domains=["it"], template_ids=["debug"],
                    keywords=["exception", "debug"], priority=10,
                ),
            ),
            SkillManifest(
                id="it.generic",
                instructions="Give a general answer.",
                routing=RoutingMetadata(domains=["it"], priority=1),
            ),
        ]
        routed = self.compiler.route(
            manifests, domain_id="it", template_id="debug",
            raw_prompt="Debug this exception", limit=1
        )
        self.assertEqual(routed[0][0].id, "it.debug")
        self.assertGreaterEqual(routed[0][1], 0.5)

    def test_compile_is_bounded_and_has_priority(self):
        manifest = SkillManifest(
            id="it.long",
            instructions="A" * 10000,
            constraints=SkillConstraints(must=["Keep the API contract"]),
        )
        context = self.compiler.compile([(manifest, 1.0)], max_tokens=100)
        self.assertLessEqual(len(context), 400)
        self.assertIn("Priority:", context)
        self.assertIn("truncated", context)

    def test_registry_keeps_domain_json_compatibility(self):
        registry = SkillRegistry()
        registry.load()
        pack = registry.get_domain_pack("tech")
        self.assertEqual(pack["id"], "it")
        context = registry.select_skill_context("it", "code_generation", "write code")
        self.assertIn("SKILL CONTEXT", context)


if __name__ == "__main__":
    unittest.main()
