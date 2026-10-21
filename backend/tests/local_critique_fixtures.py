from typing import List, Tuple


def generate_local_critique(domain_id: str, raw_prompt: str, draft_v1: str) -> Tuple[List[str], List[str]]:
    """Deterministic fixture for unit tests; never imported by runtime code."""
    if domain_id.lower().strip() == "it":
        return (
            [
                "Thiếu ràng buộc về khả năng chịu lỗi (Fault Tolerance).",
                "Cấu trúc dữ liệu đầu ra chưa đủ chặt chẽ.",
                "Chưa bao phủ toàn diện Edge Cases.",
            ],
            [
                "Đã bổ sung chuẩn xử lý ngoại lệ và khả năng chịu lỗi.",
                "Đã chuẩn hóa response schema.",
                "Đã đính kèm checklist kiểm thử biên.",
            ],
        )
    return (
        [
            "Chưa phân định rõ chẩn đoán sơ bộ và chẩn đoán phân biệt.",
            "Dấu hiệu cảnh báo cấp cứu chưa được làm nổi bật.",
            "Thiếu yêu cầu đối chiếu các xét nghiệm bổ trợ.",
        ],
        [
            "Đã nâng cấp nguyên tắc y học chứng cứ.",
            "Đã chèn khối cảnh báo dấu hiệu cấp cứu.",
            "Đã bổ sung danh mục xét nghiệm đối chiếu.",
        ],
    )
