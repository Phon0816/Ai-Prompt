import unittest
from fastapi.testclient import TestClient
from backend.main import app


class TestHistoryEndpoints(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_get_history_returns_list(self):
        res = self.client.get("/api/history")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsInstance(data, list)

    def test_get_history_with_domain_filter(self):
        res = self.client.get("/api/history?domain=it&limit=10")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsInstance(data, list)

    def test_get_history_stats(self):
        res = self.client.get("/api/history/stats")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("total_runs", data)
        self.assertIn("avg_improvement", data)
        self.assertIn("domain_breakdown", data)
        self.assertIn("model_breakdown", data)
        self.assertIn("source_breakdown", data)


class TestSettingsEndpoints(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_get_settings(self):
        res = self.client.get("/api/settings")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("has_api_key", data)
        self.assertIn("api_key_preview", data)
        self.assertIn("env_file_path", data)

    def test_update_apikey_invalid_format(self):
        res = self.client.post(
            "/api/settings/apikey",
            json={"api_key": "invalid_key_no_prefix"}
        )
        self.assertEqual(res.status_code, 400)

    def test_update_apikey_empty(self):
        res = self.client.post(
            "/api/settings/apikey",
            json={"api_key": ""}
        )
        self.assertEqual(res.status_code, 400)

    def test_offline_endpoint_removed(self):
        res = self.client.post("/api/settings/offline", json={"enabled": True})
        self.assertEqual(res.status_code, 404)

    def test_update_default_model(self):
        res = self.client.post(
            "/api/settings/default-model",
            json={"model_id": "meta-llama/llama-3.3-70b-instruct"}
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["default_model_id"], "nvidia/nemotron-3-super-120b-a12b:free")

        # Kiểm tra get_settings trả về model vừa lưu
        get_res = self.client.get("/api/settings")
        self.assertEqual(get_res.status_code, 200)
        self.assertEqual(get_res.json()["default_model_id"], "nvidia/nemotron-3-super-120b-a12b:free")


if __name__ == "__main__":
    unittest.main()
