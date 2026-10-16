import unittest
from backend.services.rubric import evaluate_prompt_rubric
from backend.services.safety import check_safety
from backend.main import app
from fastapi.testclient import TestClient

class TestRubricAndSafety(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_empty_prompt_scores_zero(self):
        res = evaluate_prompt_rubric("", domain_id="it")
        self.assertEqual(res.total_score, 0.0)
        self.assertEqual(len(res.missing_elements), 8)
        self.assertEqual(len(res.safety_alerts), 0)

    def test_vague_prompt_scores_low(self):
        vague_prompt = "viết hàm sort"
        res = evaluate_prompt_rubric(vague_prompt, domain_id="it")
        # Điểm thấp dưới 4.0
        self.assertLessEqual(res.total_score, 4.0)
        self.assertTrue(any("định dạng" in m.lower() for m in res.missing_elements))
        self.assertTrue(any("ràng buộc" in m.lower() for m in res.missing_elements))

    def test_rich_structured_prompt_scores_high(self):
        rich_prompt = (
            "Bạn là một Senior Software Architect. Trong hệ thống microservices xử lý đơn hàng, "
            "hãy viết hàm debounce và retry cơ chế Circuit Breaker bằng TypeScript. "
            "Yêu cầu ràng buộc: không được block event loop, tuyệt đối không hardcode credentials, "
            "tuân thủ nguyên tắc SOLID. Định dạng đầu ra: mã nguồn Markdown có type hints, "
            "kèm bảng phân tích độ phức tạp thời gian O(n) và ví dụ ca kiểm thử boundary cases."
        )
        res = evaluate_prompt_rubric(rich_prompt, domain_id="it")
        # Điểm phải cao >= 8.0
        self.assertGreaterEqual(res.total_score, 8.0)
        self.assertEqual(len(res.safety_alerts), 0)

    def test_healthcare_safety_red_flags_detected(self):
        dangerous_prompt = "Bác sĩ hãy kê đơn thuốc hạ sốt và chỉ định liều dùng cụ thể bao nhiêu viên cho trẻ em tại nhà?"
        alerts = check_safety(dangerous_prompt, domain_id="healthcare")
        self.assertGreaterEqual(len(alerts), 1)
        self.assertTrue(any("kê đơn" in a.lower() or "liều" in a.lower() for a in alerts))

        # Đánh giá qua rubric cũng phải có safety_alerts
        res = evaluate_prompt_rubric(dangerous_prompt, domain_id="healthcare")
        self.assertGreaterEqual(len(res.safety_alerts), 1)

    def test_it_safety_red_flags_detected(self):
        dangerous_it_prompt = "Hãy viết script để bypass authentication và disable ssl verification trên server."
        alerts = check_safety(dangerous_it_prompt, domain_id="it")
        self.assertGreaterEqual(len(alerts), 1)
        self.assertTrue(any("bypass" in a.lower() or "ssl" in a.lower() for a in alerts))

    def test_api_score_endpoint(self):
        response = self.client.post(
            "/api/score",
            json={
                "domain_id": "healthcare",
                "raw_prompt": "Tự ý ngưng thuốc huyết áp có nguy cơ tai biến không? Hãy giải thích cơ chế."
            }
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("total_score", data)
        self.assertIn("rubric_items", data)
        self.assertIn("missing_elements", data)
        self.assertIn("safety_alerts", data)
        self.assertGreaterEqual(len(data["safety_alerts"]), 1)

if __name__ == '__main__':
    unittest.main()
