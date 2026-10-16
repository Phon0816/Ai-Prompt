import unittest
import json
from pathlib import Path
from backend.services.scoring import normalize_weights, rank_models
from backend.schemas import WeightSliders
from backend.main import app
from fastapi.testclient import TestClient

class TestScoringAlgorithm(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        models_path = Path(__file__).resolve().parent.parent / "data" / "models.json"
        with open(models_path, "r", encoding="utf-8") as f:
            self.models = json.load(f)

    def test_weight_normalization(self):
        w = WeightSliders(task_fit=0.8, vietnamese=0.2, cost=0.0, speed=0.0)
        norm = normalize_weights(w)
        self.assertAlmostEqual(sum(norm.values()), 1.0, places=4)
        self.assertAlmostEqual(norm["task_fit"], 0.8, places=2)
        self.assertAlmostEqual(norm["vietnamese"], 0.2, places=2)

    def test_rank_models_returns_top_3(self):
        res = rank_models(
            models=self.models,
            domain_id="it"
        )
        self.assertEqual(len(res.top_models), 3)
        self.assertEqual(res.top_models[0].rank, 1)
        self.assertEqual(res.top_models[1].rank, 2)
        self.assertEqual(res.top_models[2].rank, 3)
        self.assertTrue(res.top_models[0].is_top_choice)
        self.assertFalse(res.top_models[1].is_top_choice)
        self.assertGreater(len(res.top_models[0].reasons), 0)
        self.assertTrue(len(res.unselected_summary) > 10)

    def test_cost_priority_favors_free_models(self):
        # Ưu tiên 100% chi phí
        free_weight = WeightSliders(task_fit=0.0, vietnamese=0.0, cost=1.0, speed=0.0)
        res = rank_models(
            models=self.models,
            domain_id="it",
            weights_input=free_weight
        )
        top_model = res.top_models[0].model
        self.assertEqual(top_model.cost_tier, "free")

    def test_speed_priority_favors_fastest_models(self):
        # Ưu tiên 100% tốc độ
        speed_weight = WeightSliders(task_fit=0.0, vietnamese=0.0, cost=0.0, speed=1.0)
        res = rank_models(
            models=self.models,
            domain_id="it",
            weights_input=speed_weight
        )
        top_model = res.top_models[0].model
        self.assertEqual(top_model.speed, 5)

    def test_recommend_api_endpoint(self):
        response = self.client.post(
            "/api/recommend",
            json={
                "domain_id": "healthcare",
                "template_id": "clinical_term_explanation",
                "weights": {
                    "task_fit": 0.5,
                    "vietnamese": 0.3,
                    "cost": 0.1,
                    "speed": 0.1
                }
            }
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("top_models", data)
        self.assertEqual(len(data["top_models"]), 3)
        self.assertIn("unselected_summary", data)
        self.assertIn("applied_weights", data)
        self.assertGreaterEqual(data["top_models"][0]["final_score"], data["top_models"][1]["final_score"])

if __name__ == '__main__':
    unittest.main()
