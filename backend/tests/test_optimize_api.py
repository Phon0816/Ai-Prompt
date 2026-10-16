import unittest
from fastapi.testclient import TestClient
from backend.main import app

class TestOptimizeEndpoint(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_score_endpoint(self):
        payload = {
            "domain_id": "it",
            "raw_prompt": "Viết code circuit breaker"
        }
        res = self.client.post("/api/score", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("total_score", data)
        self.assertIn("rubric_items", data)

    def test_optimize_endpoint_requires_ai_execution(self):
        payload = {
            "domain_id": "it",
            "template_id": "it_api_arch",
            "raw_prompt": "Viết hàm retry API",
            "selected_model_id": "nvidia/nemotron-3-super-120b-a12b:free",
            "run_ai_execution": False
        }
        res = self.client.post("/api/optimize", json=payload)
        self.assertEqual(res.status_code, 400)
        self.assertIn("Cloud model execution", res.json()["detail"])

    def test_optimize_endpoint_requires_cloud_model(self):
        payload = {
            "domain_id": "healthcare",
            "template_id": "med_ebm_analysis",
            "raw_prompt": "Đánh giá triệu chứng sốt cao co giật",
            "selected_model_id": "meta-llama/llama-3.3-70b-instruct:free",
            "run_ai_execution": True
        }
        res = self.client.post("/api/optimize", json=payload)
        self.assertIn(res.status_code, [200, 502])
        if res.status_code == 200:
            data = res.json()
            self.assertIn("ai_optimized_response", data)
            self.assertIsNone(data["ai_raw_response"])
            self.assertEqual(data["execution_source"], "openrouter")
        else:
            self.assertIn("OpenRouter", res.json()["detail"])

if __name__ == "__main__":
    unittest.main()
