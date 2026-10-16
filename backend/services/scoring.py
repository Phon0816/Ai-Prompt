from typing import List, Dict, Any, Optional, Tuple
from ..schemas import ModelInfo, ScoredModel, WeightSliders, RecommendResponse

# Bản đồ điểm số chi phí theo cost_tier
COST_TIER_SCORES = {
    "free": 1.0,      # Miễn phí 100% -> 1.0
    "low": 0.8,       # Rất rẻ -> 0.8
    "medium": 0.5,    # Trung bình -> 0.5
    "high": 0.2       # Đắt -> 0.2
}

def normalize_weights(weights: Optional[WeightSliders]) -> Dict[str, float]:
    """Chuẩn hóa tổng 4 trọng số về đúng 1.0 để đảm bảo công bằng toán học."""
    if not weights:
        return {"task_fit": 0.40, "vietnamese": 0.25, "cost": 0.20, "speed": 0.15}

    raw = {
        "task_fit": max(0.0, float(weights.task_fit)),
        "vietnamese": max(0.0, float(weights.vietnamese)),
        "cost": max(0.0, float(weights.cost)),
        "speed": max(0.0, float(weights.speed)),
    }
    total = sum(raw.values())
    if total <= 0:
        return {"task_fit": 0.40, "vietnamese": 0.25, "cost": 0.20, "speed": 0.15}

    return {k: v / total for k, v in raw.items()}

def resolve_task_type(domain_id: str, template: Optional[Dict[str, Any]] = None) -> str:
    """Xác định loại tác vụ mục tiêu từ template hoặc domain."""
    if template and "default_task_type" in template:
        return template["default_task_type"]
    if domain_id == "it":
        return "code_generation"
    return "clinical_explanation"

def generate_model_reasons(
    model: Dict[str, Any],
    task_type: str,
    domain_id: str,
    scores: Dict[str, float]
) -> List[str]:
    """Sinh chuỗi lý do đề xuất cụ thể bằng tiếng Việt dựa trên điểm thành phần và thế mạnh thực tế."""
    reasons: List[str] = []
    task_score = scores["task_fit"]
    cost_score = scores["cost"]
    speed_score = scores["speed"]
    vi_score = scores["vietnamese"]

    # 1. Lý do về tác vụ
    if task_score >= 0.95:
        if "code" in task_type or domain_id == "it":
            reasons.append(f"Điểm phù hợp tác vụ xuất sắc (5/5) cho lập trình, gỡ lỗi và kiến trúc phần mềm.")
        else:
            reasons.append(f"Điểm phù hợp tác vụ xuất sắc (5/5) cho phân tích y văn và lập luận chẩn đoán phân biệt.")
    elif task_score >= 0.8:
        reasons.append(f"Khả năng xử lý tốt tác vụ {task_type.replace('_', ' ')} (4/5).")

    # 2. Lý do về chi phí
    if model.get("cost_tier") == "free":
        reasons.append("Hoàn toàn MIỄN PHÍ trên OpenRouter API, tối ưu 100% ngân sách thử nghiệm.")
    elif cost_score >= 0.8:
        reasons.append(f"Chi phí sử dụng cực kỳ tiết kiệm ({model.get('cost_tier')}).")

    # 3. Lý do về tiếng Việt
    if vi_score >= 0.95:
        reasons.append("Khả năng giao tiếp tiếng Việt tự nhiên chuẩn xác (5/5), tuân thủ định dạng chặt chẽ.")

    # 4. Lý do về tốc độ & context
    if speed_score >= 0.95:
        reasons.append(f"Tốc độ phản hồi cực nhanh (5/5) với độ trễ thấp.")
    if model.get("context_window", 0) >= 200000:
        cw_k = int(model['context_window'] / 1000)
        reasons.append(f"Cửa sổ ngữ cảnh cực lớn ({cw_k}k tokens), xử lý tập tài liệu đồ sộ không bị tràn bộ nhớ.")

    # Thêm thế mạnh nổi bật từ dữ liệu
    if model.get("strengths") and len(model["strengths"]) > 0:
        reasons.append(model["strengths"][0])

    return reasons[:3]

def generate_unselected_summary(
    unselected_models: List[Tuple[Dict[str, Any], float]],
    task_type: str,
    domain_id: str
) -> str:
    """Tạo dòng giải thích cụ thể vì sao không chọn các mô hình từ hạng 4 trở xuống."""
    if not unselected_models:
        return "Tất cả các mô hình trong kho đều được đưa vào danh sách so sánh."

    explanations = []
    for model, score in unselected_models[:3]:
        name = model.get("name", model.get("id"))
        weaknesses = model.get("weaknesses", [])
        weakness_str = weaknesses[0] if weaknesses else "điểm tổng hợp chưa đủ cạnh tranh với top 3"
        explanations.append(f"• {name} (Điểm: {score:.1f}/10): {weakness_str}")

    return (
        "Lý do các mô hình từ hạng 4 trở xuống không nằm trong top đề xuất ưu tiên:\n"
        + "\n".join(explanations)
    )

def rank_models(
    models: List[Dict[str, Any]],
    domain_id: str,
    template: Optional[Dict[str, Any]] = None,
    weights_input: Optional[WeightSliders] = None
) -> RecommendResponse:
    """
    Thuật toán cốt lõi tính điểm đa tiêu chí:
    score = w1*task_fit + w2*vietnamese + w3*cost + w4*speed (chuẩn hóa về thang 10.0).
    Trả về top 3 ModelCard kèm điểm chi tiết, lý do và giải thích loại trừ.
    """
    weights = normalize_weights(weights_input)
    task_type = resolve_task_type(domain_id, template)
    recommended_ids = template.get("recommended_model_ids", []) if template else []

    scored_list: List[Tuple[Dict[str, Any], float, Dict[str, float], List[str]]] = []

    for m in models:
        # 1. Tính điểm task_fit (thang 0.0 - 1.0)
        task_fit_dict = m.get("task_fit", {})
        raw_task_val = task_fit_dict.get(task_type, 3)
        # Nếu model được template đề xuất đặc biệt, cộng điểm ưu tiên
        if m.get("id") in recommended_ids:
            raw_task_val = min(5, raw_task_val + 0.5)
        task_fit_norm = min(1.0, raw_task_val / 5.0)

        # 2. Tính điểm vietnamese (thang 0.0 - 1.0)
        vi_norm = min(1.0, float(m.get("vietnamese", 3)) / 5.0)

        # 3. Tính điểm cost (thang 0.0 - 1.0)
        cost_tier = m.get("cost_tier", "medium")
        cost_norm = COST_TIER_SCORES.get(cost_tier, 0.5)

        # 4. Tính điểm speed (thang 0.0 - 1.0)
        speed_norm = min(1.0, float(m.get("speed", 3)) / 5.0)

        # Tính điểm tổng hợp (thang 0.0 - 1.0 -> chuyển sang thang 10.0)
        composite_score_norm = (
            weights["task_fit"] * task_fit_norm +
            weights["vietnamese"] * vi_norm +
            weights["cost"] * cost_norm +
            weights["speed"] * speed_norm
        )
        final_score_10 = round(composite_score_norm * 10.0, 1)

        breakdown = {
            "task_fit": round(task_fit_norm * 10.0, 1),
            "vietnamese": round(vi_norm * 10.0, 1),
            "cost": round(cost_norm * 10.0, 1),
            "speed": round(speed_norm * 10.0, 1),
        }

        reasons = generate_model_reasons(
            model=m,
            task_type=task_type,
            domain_id=domain_id,
            scores={
                "task_fit": task_fit_norm,
                "vietnamese": vi_norm,
                "cost": cost_norm,
                "speed": speed_norm
            }
        )

        scored_list.append((m, final_score_10, breakdown, reasons))

    # Sắp xếp giảm dần theo điểm số cuối cùng
    scored_list.sort(key=lambda x: x[1], reverse=True)

    # Phân chia Top 3 và phần còn lại
    top_3_items = scored_list[:3]
    remaining_items = [(item[0], item[1]) for item in scored_list[3:]]

    top_models: List[ScoredModel] = []
    for rank_idx, (m, f_score, bdown, reas) in enumerate(top_3_items, start=1):
        model_obj = ModelInfo(**m)
        top_models.append(
            ScoredModel(
                rank=rank_idx,
                model=model_obj,
                final_score=f_score,
                score_breakdown=bdown,
                reasons=reas,
                is_top_choice=(rank_idx == 1)
            )
        )

    unselected_text = generate_unselected_summary(
        unselected_models=remaining_items,
        task_type=task_type,
        domain_id=domain_id
    )

    applied_w = WeightSliders(
        task_fit=round(weights["task_fit"], 2),
        vietnamese=round(weights["vietnamese"], 2),
        cost=round(weights["cost"], 2),
        speed=round(weights["speed"], 2)
    )

    return RecommendResponse(
        top_models=top_models,
        unselected_summary=unselected_text,
        applied_weights=applied_w
    )
