"""
Router Cài đặt - Quản lý cấu hình hệ thống (API Key, chế độ Offline, mô hình mặc định).
API Key được lưu trữ an toàn trong file .env trên Backend, KHÔNG BAO GIỜ gửi key ra Frontend.
"""

import os
from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from ..services.llm_client import ProviderError, execute_prompt_with_llm
from ..config import PRIMARY_MODEL_ID, CRITIC_MODEL_ID
try:
    from dotenv import load_dotenv, set_key
except ImportError:
    def load_dotenv(dotenv_path=None, override=False):
        p = Path(dotenv_path) if dotenv_path else Path(".env")
        if p.exists():
            for line in p.read_text(encoding="utf-8", errors="ignore").splitlines():
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                k, v = k.strip(), v.strip().strip('"').strip("'")
                if override or k not in os.environ:
                    os.environ[k] = v

    def set_key(dotenv_path, key_to_set, value_to_set):
        p = Path(dotenv_path)
        lines = []
        found = False
        if p.exists():
            for line in p.read_text(encoding="utf-8", errors="ignore").splitlines():
                if line.strip().startswith(f"{key_to_set}=") or line.strip() == key_to_set:
                    lines.append(f"{key_to_set}={value_to_set}")
                    found = True
                else:
                    lines.append(line)
        if not found:
            lines.append(f"{key_to_set}={value_to_set}")
        p.write_text("\n".join(lines) + "\n", encoding="utf-8")

router = APIRouter(tags=["Settings"])

# Đường dẫn .env nằm ở thư mục gốc dự án
ENV_PATH = Path(__file__).resolve().parent.parent.parent / ".env"
DEMO_MODEL_ID = PRIMARY_MODEL_ID


def _connection_error_code(error: Exception) -> str:
    if isinstance(error, ProviderError):
        return error.error_code
    message = str(error).lower()
    if "chưa được cấu hình" in message or ("api_key" in message and "cấu hình" in message):
        return "CONFIG_NO_API_KEY"
    if "http 401" in message or "http 403" in message or ("api key" in message and "từ chối" in message):
        return "AUTH_INVALID"
    if "http 402" in message or "quota" in message or "credit" in message:
        return "QUOTA_EXCEEDED"
    if "timeout" in message or "timed out" in message:
        return "PROVIDER_TIMEOUT"
    if "model" in message and ("not found" in message or "unavailable" in message):
        return "MODEL_UNAVAILABLE"
    if "không trả về nội dung hợp lệ" in message:
        return "INVALID_PROVIDER_RESPONSE"
    if "http 429" in message or "rate limit" in message:
        return "PROVIDER_RATE_LIMIT"
    if "http 402" in message or "quota" in message or "credit" in message:
        return "QUOTA_EXCEEDED"
    if "http " in message:
        return "PROVIDER_ERROR"
    return "NETWORK_ERROR"


def _ensure_env_file():
    """Tạo file .env nếu chưa tồn tại."""
    if not ENV_PATH.exists():
        ENV_PATH.write_text("# AI-Prompt-Manager Configuration\n", encoding="utf-8")


class ApiKeyPayload(BaseModel):
    api_key: str


class SettingsResponse(BaseModel):
    has_api_key: bool
    api_key_preview: str
    default_model_id: str
    env_file_path: str


@router.get("/api/settings", response_model=SettingsResponse)
async def get_settings():
    """
    Trả về trạng thái cài đặt hiện tại.
    Chỉ trả về preview API key (ẩn phần lớn ký tự), KHÔNG BAO GIỜ trả nguyên key.
    """
    _ensure_env_file()
    load_dotenv(ENV_PATH, override=True)

    api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
    has_key = bool(api_key)

    # Tạo preview: chỉ hiện 4 ký tự đầu + 4 ký tự cuối
    if has_key and len(api_key) > 12:
        preview = f"{api_key[:4]}{'*' * (len(api_key) - 8)}{api_key[-4:]}"
    elif has_key:
        preview = f"{api_key[:2]}{'*' * max(0, len(api_key) - 2)}"
    else:
        preview = "(Chưa cài đặt)"

    return SettingsResponse(
        has_api_key=has_key,
        api_key_preview=preview,
        default_model_id=DEMO_MODEL_ID,
        env_file_path=str(ENV_PATH),
    )


@router.post("/api/settings/apikey")
async def update_api_key(payload: ApiKeyPayload):
    """
    Cập nhật OpenRouter API Key vào file .env trên Backend.
    Key được lưu trữ server-side, không bao giờ để lộ ở client.
    """
    _ensure_env_file()
    key = payload.api_key.strip()

    if not key:
        raise HTTPException(status_code=400, detail="API Key không được để trống.")

    # Kiểm tra format cơ bản (OpenRouter key thường bắt đầu bằng sk-)
    if not key.startswith("sk-"):
        raise HTTPException(
            status_code=400,
            detail="API Key không hợp lệ. OpenRouter API Key thường bắt đầu bằng 'sk-'."
        )

    set_key(str(ENV_PATH), "OPENROUTER_API_KEY", key)
    load_dotenv(ENV_PATH, override=True)

    return {
        "updated": True,
        "preview": f"{key[:4]}{'*' * (len(key) - 8)}{key[-4:]}",
        "message": "Đã cập nhật API Key thành công. Các lần chạy tiếp theo sẽ sử dụng key mới."
    }


@router.delete("/api/settings/apikey")
async def remove_api_key():
    """Xóa API Key; các request tiếp theo sẽ bị từ chối cho tới khi cấu hình key mới."""
    _ensure_env_file()
    set_key(str(ENV_PATH), "OPENROUTER_API_KEY", "")
    load_dotenv(ENV_PATH, override=True)

    return {
        "removed": True,
        "message": "Đã xóa API Key. Hãy cấu hình key mới trước khi thực thi prompt."
    }


@router.post("/api/settings/test-connection")
async def test_connection():
    """Thử Nemotron 3 Super trước rồi fallback sang Laguna để kiểm tra cloud thật."""
    _ensure_env_file()
    load_dotenv(ENV_PATH, override=True)
    if not os.getenv("OPENROUTER_API_KEY", "").strip():
        return {
            "ok": False,
            "error_code": "CONFIG_NO_API_KEY",
            "message": "Chưa cấu hình OPENROUTER_API_KEY trên backend."
        }
    failures = []
    for model_id in (DEMO_MODEL_ID, CRITIC_MODEL_ID):
        try:
            response, source = await execute_prompt_with_llm(
                prompt="hi",
                model_id=model_id,
                domain_id="it",
                is_optimized=True,
            )
            if response and response.strip():
                return {
                    "ok": True,
                    "model_id": model_id,
                    "source": source,
                    "message": f"Model {model_id} đã phản hồi và đang hoạt động.",
                    "fallback_used": model_id != DEMO_MODEL_ID,
                    "failed_attempts": failures,
                }
            failures.append({
                "model_id": model_id,
                "error_code": "INVALID_PROVIDER_RESPONSE",
                "message": "Model không trả về nội dung."
            })
        except Exception as exc:
            failures.append({
                "model_id": model_id,
                "error_code": _connection_error_code(exc),
                "message": str(exc)
            })

    all_rate_limited = bool(failures) and all(
        failure.get("error_code") == "PROVIDER_RATE_LIMIT"
        for failure in failures
    )
    return {
        "ok": False,
        "error_code": "PROVIDER_RATE_LIMIT" if all_rate_limited else "ALL_MODELS_UNAVAILABLE",
        "message": (
            "Provider đang rate limit tất cả model. Vui lòng thử lại sau."
            if all_rate_limited
            else "Không model nào phản hồi text."
        ),
        "failed_attempts": failures,
    }


class DefaultModelPayload(BaseModel):
    model_id: str


@router.post("/api/settings/default-model")
async def update_default_model(payload: DefaultModelPayload):
    """Cập nhật ID mô hình mặc định trong file .env."""
    _ensure_env_file()
    set_key(str(ENV_PATH), "DEFAULT_MODEL_ID", PRIMARY_MODEL_ID)
    load_dotenv(ENV_PATH, override=True)

    return {
        "default_model_id": PRIMARY_MODEL_ID,
        "message": "Bản demo cố định mô hình Nvidia Nemotron 3 Super 120B."
    }
