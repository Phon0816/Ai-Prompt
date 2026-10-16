import unittest
import asyncio
from backend.services.storage import storage_service
from backend.services.prompt_builder import build_optimized_prompt, extract_relevant_glossary

class TestPromptBuilder(unittest.TestCase):
    def setUp(self):
        # Đọc dữ liệu domain test đồng bộ qua loop
        loop = asyncio.new_event_loop()
        self.it_pack = loop.run_until_complete(storage_service.read_json("domains/it.json"))
        self.health_pack = loop.run_until_complete(storage_service.read_json("domains/healthcare.json"))
        loop.close()

    def test_extract_relevant_glossary(self):
        glossary = {"SOLID": "5 nguyên tắc thiết kế", "Circuit Breaker": "Bộ ngắt mạch"}
        res = extract_relevant_glossary("Cần áp dụng kiến trúc SOLID vào dự án", glossary)
        self.assertIn("SOLID", res)

    def test_build_optimized_prompt_it(self):
        raw_prompt = "Viết hàm xử lý retry request khi gọi api"
        opt_prompt, slots, raw_score, opt_score = build_optimized_prompt(
            domain_id="it",
            template_id="it_api_arch",
            raw_prompt=raw_prompt,
            domain_pack=self.it_pack
        )
        self.assertEqual(len(slots), 6)
        slot_names = [s.slot_name for s in slots]
        self.assertListEqual(slot_names, ["role", "context", "task", "constraints", "output_format", "safety"])
        self.assertGreaterEqual(opt_score, 9.0)
        self.assertIn("ROLE PROMPTING", opt_prompt)
        self.assertIn("SOLID", opt_prompt)

    def test_build_optimized_prompt_healthcare(self):
        raw_prompt = "Bệnh nhân sốt cao cần uống thuốc gì liều lượng ra sao?"
        opt_prompt, slots, raw_score, opt_score = build_optimized_prompt(
            domain_id="healthcare",
            template_id="med_ebm_analysis",
            raw_prompt=raw_prompt,
            domain_pack=self.health_pack
        )
        self.assertEqual(len(slots), 6)
        self.assertGreaterEqual(opt_score, 9.0)
        # Bắt buộc có disclaimer
        self.assertIn("CẢNH BÁO Y TẾ BẮT BUỘC", opt_prompt)
        self.assertIn("Bác sĩ chuyên khoa", opt_prompt)

if __name__ == "__main__":
    unittest.main()
