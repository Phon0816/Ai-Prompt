from fastapi import APIRouter, HTTPException
from ..schemas import RecommendRequest, RecommendResponse
from ..services.scoring import rank_models
from ..services.storage import storage_service

router = APIRouter(prefix="/api/recommend", tags=["Recommendation"])

@router.post("", response_model=RecommendResponse)
async def recommend_models(payload: RecommendRequest):
    """
    Khuyến nghị Top 3 mô hình AI tối ưu nhất dựa trên thuật toán tính điểm đa tiêu chí:
    score = w1*task_fit + w2*vietnamese + w3*cost + w4*speed.
    Hỗ trợ 4 thanh trượt trọng số cập nhật thời gian thực.
    """
    clean_domain = payload.domain_id.strip().lower()
    if clean_domain in ["health", "medical", "y-te"]:
        clean_domain = "healthcare"
    elif clean_domain in ["tech", "cntt", "software"]:
        clean_domain = "it"

    # 1. Đọc kho dữ liệu 8 models từ models.json
    try:
        models = await storage_service.read_json("models.json")
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Không thể đọc danh mục mô hình AI: {str(e)}"
        )

    # 2. Tìm template tương ứng (nếu có)
    matched_template = None
    if payload.template_id:
        try:
            domain_pack = await storage_service.read_json(f"domains/{clean_domain}.json")
            templates = domain_pack.get("templates", [])
            matched_template = next(
                (t for t in templates if t.get("id") == payload.template_id),
                None
            )
        except Exception:
            matched_template = None

    # 3. Chạy thuật toán chấm điểm và xếp hạng
    return rank_models(
        models=models,
        domain_id=clean_domain,
        template=matched_template,
        weights_input=payload.weights
    )
