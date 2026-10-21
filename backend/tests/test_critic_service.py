import unittest
import asyncio
import os
from backend.services.critic_service import run_generator_critic_loop, generate_local_critique
from backend.services.storage import storage_service


class TestCriticService(unittest.TestCase):
    def setUp(self):
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)

    def tearDown(self):
        self.loop.close()

    def test_local_critique_it(self):
        critiques, improvements = generate_local_critique("it", "viet api login", "draft v1 content")
        self.assertGreater(len(critiques), 0)
        self.assertGreater(len(improvements), 0)
        self.assertTrue(any("fault tolerance" in c.lower() or "chịu lỗi" in c.lower() for c in critiques))

    def test_local_critique_healthcare(self):
        critiques, improvements = generate_local_critique("healthcare", "xet nghiem men gan", "draft v1 content")
        self.assertGreater(len(critiques), 0)
        self.assertGreater(len(improvements), 0)
        self.assertTrue(any("cấp cứu" in c.lower() or "đối chiếu" in c.lower() for c in critiques))

    def test_generator_critic_loop_flow(self):
        if os.getenv("RUN_LIVE_PROVIDER_TESTS") != "1":
            self.skipTest("Set RUN_LIVE_PROVIDER_TESTS=1 to run cloud-provider integration tests.")

        async def _test():
            domain_pack = await storage_service.read_json("domains/it.json")
            prompt_v2, slots, raw_score, v2_score, report = await run_generator_critic_loop(
                domain_id="it",
                template_id="it_code_gen",
                raw_prompt="viết hàm tính Fibonacci tối ưu",
                selected_model_id="nvidia/nemotron-3-super-120b-a12b:free",
                domain_pack=domain_pack
            )
            self.assertTrue(report.enabled)
            self.assertGreater(len(report.critique_points), 0)
            self.assertGreater(len(report.improvements_applied), 0)
            self.assertGreaterEqual(v2_score, report.v1_score)
            self.assertIn("Fibonacci", prompt_v2)

        self.loop.run_until_complete(_test())


if __name__ == "__main__":
    unittest.main()
