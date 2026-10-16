import re
from typing import List, Dict, Any, Tuple
from ..schemas import RubricScore, PromptScoreResponse
from .safety import check_safety

# Định nghĩa 8 tiêu chí chấm điểm Prompt chuyên sâu
RUBRIC_CRITERIA = [
    {
        "id": "role",
        "name": "Vai trò chuyên gia (Role)",
        "weight": 1.25,
        "keywords": [
            r"bạn là", r"đóng vai", r"chuyên gia", r"senior", r"architect",
            r"bác sĩ", r"dược sĩ", r"kỹ sư", r"nhà nghiên cứu", r"act as", r"as a", r"lead"
        ],
        "missing_feedback": "Chưa xác định vai trò chuyên gia (Role Prompting)",
        "passed_feedback": "Đã thiết lập vai trò chuyên gia cụ thể."
    },
    {
        "id": "context",
        "name": "Bối cảnh & Tình huống (Context)",
        "weight": 1.25,
        "keywords": [
            r"trong hệ thống", r"trong dự án", r"bệnh nhân", r"người bệnh",
            r"đang gặp", r"trong bối cảnh", r"tình huống", r"cơ sở dữ liệu",
            r"phiên bản", r"ứng dụng", r"môi trường", r"triệu chứng", r"hệ thống"
        ],
        "missing_feedback": "Chưa cung cấp bối cảnh bài toán hoặc tình huống cụ thể",
        "passed_feedback": "Có bối cảnh và tình huống rõ ràng."
    },
    {
        "id": "clear_task",
        "name": "Nhiệm vụ rõ ràng (Task)",
        "weight": 1.5,
        "keywords": [
            r"hãy viết", r"hãy tối ưu", r"hãy phân tích", r"hãy giải thích",
            r"hãy tóm tắt", r"hãy soạn", r"thiết kế", r"kiểm tra", r"debug",
            r"tạo ra", r"xây dựng", r"lập trình", r"hướng dẫn", r"viết hàm"
        ],
        "missing_feedback": "Nhiệm vụ chưa rõ ràng hoặc thiếu động từ hành động chỉ định",
        "passed_feedback": "Nhiệm vụ cụ thể với động từ hành động rõ ràng."
    },
    {
        "id": "constraints",
        "name": "Ràng buộc & Quy tắc (Constraints)",
        "weight": 1.25,
        "keywords": [
            r"không được", r"tuyệt đối không", r"tránh", r"chỉ sử dụng",
            r"phải đảm bảo", r"yêu cầu", r"ràng buộc", r"không dùng",
            r"tuân thủ", r"giới hạn trong", r"do not", r"must not", r"nguyên tắc"
        ],
        "missing_feedback": "Chưa nêu các ràng buộc kỹ thuật hoặc điều kiện loại trừ",
        "passed_feedback": "Đã có ràng buộc và điều kiện biên khống chế AI."
    },
    {
        "id": "output_format",
        "name": "Định dạng đầu ra (Output Format)",
        "weight": 1.25,
        "keywords": [
            r"định dạng", r"json", r"markdown", r"dạng bảng", r"gạch đầu dòng",
            r"danh sách", r"code block", r"các phần sau", r"format",
            r"bảng phân tích", r"bảng so sánh", r"cấu trúc gồm", r"step by step"
        ],
        "missing_feedback": "Chưa chỉ định định dạng đầu ra mong muốn (Markdown, JSON, Bảng...)",
        "passed_feedback": "Đã chỉ định rõ định dạng và cấu trúc dữ liệu đầu ra."
    },
    {
        "id": "examples",
        "name": "Dữ liệu mẫu & Ví dụ (Few-shot)",
        "weight": 1.0,
        "keywords": [
            r"ví dụ", r"mẫu", r"đoạn code sau", r"lỗi sau", r"như sau:",
            r"input:", r"output:", r"case study", r"dữ liệu:", r"ca kiểm thử", r"cases"
        ],
        "missing_feedback": "Thiếu dữ liệu đầu vào chi tiết hoặc ví dụ minh họa (Few-shot)",
        "passed_feedback": "Có dữ liệu mẫu, đoạn code hoặc ví dụ đối chiếu."
    },
    {
        "id": "tone_and_depth",
        "name": "Độ sâu & Văn phong chuyên ngành",
        "weight": 1.25,
        "keywords": [
            r"chuyên sâu", r"chi tiết", r"chính xác", r"dễ hiểu", r"kiến trúc", r"tối ưu",
            r"chuẩn", r"khách quan", r"khoa học", r"production", r"y học chứng cứ", r"solid"
        ],
        "missing_feedback": "Câu lệnh còn sơ sài, thiếu từ vựng chuyên ngành",
        "passed_feedback": "Văn phong học thuật, sử dụng thuật ngữ đúng chuẩn."
    },
    {
        "id": "safety_guardrail",
        "name": "An toàn & Trách nhiệm (Safety)",
        "weight": 1.25,
        "keywords": [
            r"cảnh báo", r"an toàn", r"bảo mật", r"disclaimer", r"credentials",
            r"tham khảo", r"bác sĩ", r"owasp", r"chịu trách nhiệm", r"vulnerability"
        ],
        "missing_feedback": "Chưa có chỉ dẫn an toàn hoặc cảnh báo trách nhiệm pháp lý",
        "passed_feedback": "Đã tính đến yếu tố an toàn và trách nhiệm chuyên môn."
    }
]

def evaluate_prompt_rubric(
    raw_prompt: str, 
    domain_id: str, 
    domain_pack: Dict[str, Any] = None
) -> PromptScoreResponse:
    """
    Chấm điểm Prompt thô theo 8 tiêu chí rubric chuẩn quốc tế.
    Hoàn toàn bằng thuật toán mã nguồn nội bộ (Rule-based Regex & Heuristic analysis),
    chạy 100% offline, nhanh dưới 5ms, không phụ thuộc vào LLM.
    """
    text = (raw_prompt or "").strip()
    text_lower = text.lower()
    text_length = len(text)

    # 1. Kiểm tra an toàn từ khóa đỏ (Red flags)
    safety_alerts = check_safety(text, domain_id, domain_pack)

    # Nếu chuỗi rỗng
    if not text:
        empty_items = [
            RubricScore(
                criterion=c["id"],
                name=c["name"],
                score=0,
                max_score=int(c["weight"] * 10),
                passed=False,
                feedback="Vui lòng nhập nội dung câu hỏi hoặc yêu cầu."
            ) for c in RUBRIC_CRITERIA
        ]
        return PromptScoreResponse(
            total_score=0.0,
            max_score=10.0,
            rubric_items=empty_items,
            missing_elements=[c["missing_feedback"] for c in RUBRIC_CRITERIA],
            safety_alerts=[]
        )

    rubric_items: List[RubricScore] = []
    missing_elements: List[str] = []
    total_raw_score = 0.0

    for c in RUBRIC_CRITERIA:
        cid = c["id"]
        weight = c["weight"]
        max_score_int = int(weight * 10)
        passed = False
        score_val = 0.0

        # Kiểm tra matching theo keywords regex
        matches = [re.search(kw, text_lower) for kw in c["keywords"]]
        has_keyword = any(m is not None for m in matches)

        # Tiêu chí đặc thù theo độ dài & ngữ cảnh:
        if cid == "clear_task":
            # Nhiệm vụ: có từ khóa task hoặc có độ dài hợp lý
            if has_keyword or (text_length >= 25 and any(w in text_lower for w in ["làm sao", "cách", "giúp", "viết", "cho", "tìm"])):
                passed = True
                score_val = weight
        elif cid == "context":
            # Bối cảnh: từ khóa hoặc độ dài trên 70 ký tự
            if has_keyword or text_length >= 70:
                passed = True
                score_val = weight
        elif cid == "examples":
            # Ví dụ: có từ khóa hoặc chứa code block ``` hoặc ngoặc kép dài
            if has_keyword or "```" in text or "{" in text or (text.count('"') >= 2 and text_length >= 50):
                passed = True
                score_val = weight
        elif cid == "tone_and_depth":
            # Độ sâu: có từ khóa hoặc prompt dài và có cấu trúc
            if has_keyword or text_length >= 110:
                passed = True
                score_val = weight
        else:
            if has_keyword:
                passed = True
                score_val = weight

        # Phạt điểm nếu phát hiện Red flags trong tiêu chí an toàn
        if cid == "safety_guardrail" and len(safety_alerts) > 0:
            passed = False
            score_val = 0.0

        total_raw_score += score_val

        if not passed:
            missing_elements.append(c["missing_feedback"])

        rubric_items.append(
            RubricScore(
                criterion=cid,
                name=c["name"],
                score=int(score_val * 10),
                max_score=max_score_int,
                passed=passed,
                feedback=c["passed_feedback"] if passed else c["missing_feedback"]
            )
        )

    # Làm tròn điểm tổng 1 chữ số thập phân, chặn trong khoảng [0, 10.0]
    total_score = min(10.0, max(0.0, round(total_raw_score, 1)))

    return PromptScoreResponse(
        total_score=total_score,
        max_score=10.0,
        rubric_items=rubric_items,
        missing_elements=missing_elements,
        safety_alerts=safety_alerts
    )
