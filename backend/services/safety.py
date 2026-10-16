import re
from typing import List, Dict, Any, Optional

# Các mẫu cảnh báo nguy cơ y tế cao
CRITICAL_HEALTHCARE_PATTERNS = [
    {
        "pattern": r"(kê đơn|chỉ định thuốc|uống thuốc gì|cho tôi đơn thuốc|mua thuốc gì)",
        "alert": "Phát hiện yêu cầu kê đơn thuốc trực tuyến. Hệ thống AI không có thẩm quyền kê đơn thay bác sĩ."
    },
    {
        "pattern": r"(liều dùng|liều lượng|uống mấy viên|tiêm mấy ml|uống bao nhiêu mg)",
        "alert": "Phát hiện yêu cầu chỉ định liều lượng cụ thể. Liều dùng phải do bác sĩ trực tiếp quyết định dựa trên thể trạng và chức năng gan/thận."
    },
    {
        "pattern": r"(tự ý ngưng thuốc|bỏ thuốc|không cần uống thuốc|ngưng kháng sinh)",
        "alert": "Phát hiện hành vi tự ý ngưng hoặc thay đổi phác đồ điều trị. Điều này có thể gây nguy hiểm tính mạng hoặc kháng thuốc."
    },
    {
        "pattern": r"(cấp cứu tại nhà|tự chữa tai biến|tự xử lý đột quỵ|tự chữa nhồi máu cơ tim)",
        "alert": "Phát hiện tình huống cấp cứu khẩn cấp. Cần gọi cấp cứu 115 hoặc đến bệnh viện ngay lập tức thay vì tra cứu AI."
    },
    {
        "pattern": r"(phá thai tại nhà|uống thuốc phá thai|tự phá thai)",
        "alert": "Cảnh báo an toàn y tế nghiêm trọng: Tuyệt đối không tự ý dùng thuốc phá thai tại nhà vì nguy cơ băng huyết và tử vong."
    }
]

# Các mẫu cảnh báo an toàn mã nguồn IT
CRITICAL_IT_PATTERNS = [
    {
        "pattern": r"(bypass authentication|bypass auth|vượt qua xác thực|bẻ khóa mật khẩu)",
        "alert": "Phát hiện yêu cầu vượt qua cơ chế xác thực hoặc bảo mật trái phép."
    },
    {
        "pattern": r"(disable ssl|tắt xác thực ssl|verify\s*=\s*false)",
        "alert": "Cảnh báo bảo mật: Tắt kiểm tra SSL/TLS khiến hệ thống dễ bị tấn công Man-in-the-Middle (MitM)."
    },
    {
        "pattern": r"(hardcode api key|hardcode password|lưu mật khẩu trong code)",
        "alert": "Phát hiện nguy cơ lộ lọt thông tin bí mật (Secret Leaks) do hardcode credentials."
    },
    {
        "pattern": r"(rm -rf|chmod 777|drop database|eval\(user_input\))",
        "alert": "Phát hiện thao tác nguy hiểm có thể phá hủy dữ liệu hoặc gây lỗi thực thi mã từ xa (RCE)."
    }
]

def check_safety(raw_prompt: str, domain_id: str, domain_pack: Optional[Dict[str, Any]] = None) -> List[str]:
    """
    Kiểm tra từ khóa đỏ (Red Flags) và nguy cơ an toàn trong prompt thô.
    Chạy 100% bằng code rule-based regex, độc lập với LLM.
    """
    if not raw_prompt or not raw_prompt.strip():
        return []

    text_lower = raw_prompt.lower().strip()
    alerts: List[str] = []

    # 1. Kiểm tra theo danh sách red_flags trong domain pack
    if domain_pack and "red_flags" in domain_pack:
        for flag in domain_pack["red_flags"]:
            flag_clean = flag.lower().strip()
            if flag_clean and flag_clean in text_lower:
                if domain_id == "healthcare":
                    alerts.append(f"Từ khóa y tế nguy hiểm: '{flag}' — Bắt buộc kích hoạt Guardrail cảnh báo y tế.")
                else:
                    alerts.append(f"Cảnh báo rủi ro an ninh phần mềm: Phát hiện từ khóa '{flag}'.")

    # 2. Kiểm tra theo bộ mẫu Regular Expression chuyên sâu
    if domain_id == "healthcare":
        for item in CRITICAL_HEALTHCARE_PATTERNS:
            if re.search(item["pattern"], text_lower):
                if item["alert"] not in alerts:
                    alerts.append(item["alert"])
    elif domain_id == "it":
        for item in CRITICAL_IT_PATTERNS:
            if re.search(item["pattern"], text_lower):
                if item["alert"] not in alerts:
                    alerts.append(item["alert"])

    return list(dict.fromkeys(alerts))  # Loại bỏ trùng lặp giữ nguyên thứ tự
