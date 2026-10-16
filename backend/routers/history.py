"""
Router Lịch sử - Quản lý toàn bộ dữ liệu lịch sử tối ưu hóa Prompt.
Tất cả các thao tác đọc/ghi đều thông qua storage_service với asyncio.Lock
để đảm bảo an toàn dữ liệu khi ghi/đọc đồng thời.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from ..services.storage import storage_service

router = APIRouter(tags=["History"])

HISTORY_FILE = "history.json"


async def _read_history() -> list:
    """Đọc toàn bộ lịch sử, trả về list rỗng nếu file chưa tồn tại."""
    try:
        data = await storage_service.read_json(HISTORY_FILE)
        if isinstance(data, list):
            return data
        return []
    except FileNotFoundError:
        return []
    except Exception:
        return []


@router.get("/api/history")
async def get_history(
    domain: Optional[str] = Query(None, description="Lọc theo domain_id (it / healthcare)"),
    limit: int = Query(50, ge=1, le=200, description="Số bản ghi tối đa"),
):
    """
    Lấy danh sách lịch sử tối ưu hóa Prompt, hỗ trợ lọc theo domain và giới hạn số lượng.
    """
    history = await _read_history()

    if domain:
        clean = domain.strip().lower()
        if clean in ["health", "medical", "y-te"]:
            clean = "healthcare"
        elif clean in ["tech", "cntt", "software"]:
            clean = "it"
        history = [item for item in history if item.get("domain_id") == clean]

    return history[:limit]


@router.get("/api/history/stats")
async def get_history_stats():
    """
    Thống kê tổng hợp lịch sử: tổng lần chạy, điểm tăng trung bình,
    phân bổ theo domain, phân bổ theo model, phân bổ theo source.
    """
    history = await _read_history()

    if not history:
        return {
            "total_runs": 0,
            "avg_raw_score": 0,
            "avg_optimized_score": 0,
            "avg_improvement": 0,
            "domain_breakdown": {},
            "model_breakdown": {},
            "source_breakdown": {},
            "avg_execution_time_ms": 0,
        }

    total = len(history)

    raw_scores = [item.get("raw_score", 0) for item in history]
    opt_scores = [item.get("optimized_score", 0) for item in history]
    improvements = [opt - raw for raw, opt in zip(raw_scores, opt_scores)]
    exec_times = [item.get("execution_time_ms", 0) for item in history]

    # Phân bổ theo domain
    domain_counts = {}
    for item in history:
        d = item.get("domain_id", "unknown")
        domain_counts[d] = domain_counts.get(d, 0) + 1

    # Phân bổ theo model
    model_counts = {}
    for item in history:
        m = item.get("model_used", "unknown")
        if m:
            # Lấy tên ngắn từ model ID (phần sau dấu /)
            short_name = m.split("/")[-1] if "/" in m else m
            model_counts[short_name] = model_counts.get(short_name, 0) + 1

    # Phân bổ theo source
    source_counts = {}
    for item in history:
        s = item.get("source", "local")
        source_counts[s] = source_counts.get(s, 0) + 1

    return {
        "total_runs": total,
        "avg_raw_score": round(sum(raw_scores) / total, 2),
        "avg_optimized_score": round(sum(opt_scores) / total, 2),
        "avg_improvement": round(sum(improvements) / total, 2),
        "domain_breakdown": domain_counts,
        "model_breakdown": model_counts,
        "source_breakdown": source_counts,
        "avg_execution_time_ms": round(sum(exec_times) / total),
    }


@router.delete("/api/history/{history_id}")
async def delete_history_item(history_id: str):
    """Xóa một bản ghi lịch sử theo ID."""
    history = await _read_history()
    new_history = [item for item in history if item.get("id") != history_id]

    if len(new_history) == len(history):
        raise HTTPException(status_code=404, detail=f"Không tìm thấy bản ghi với ID: {history_id}")

    await storage_service.write_json(HISTORY_FILE, new_history)
    return {"deleted": True, "remaining": len(new_history)}


@router.delete("/api/history")
async def clear_all_history():
    """Xóa toàn bộ lịch sử tối ưu hóa."""
    await storage_service.write_json(HISTORY_FILE, [])
    return {"cleared": True, "remaining": 0}
