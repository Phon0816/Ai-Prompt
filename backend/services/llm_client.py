import os
import asyncio
import json
import urllib.request
import urllib.error
from typing import Tuple, Optional

try:
    import httpx
except ImportError:
    httpx = None

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
_http_client = None


class ProviderError(RuntimeError):
    def __init__(self, error_code: str, message: str, status_code: int | None = None, retryable: bool = False):
        super().__init__(message)
        self.error_code = error_code
        self.status_code = status_code
        self.retryable = retryable


def provider_error(status_code: int, message: str) -> ProviderError:
    if status_code in (401, 403):
        return ProviderError("AUTH_INVALID", message, status_code)
    if status_code == 402:
        return ProviderError("QUOTA_EXCEEDED", message, status_code)
    if status_code == 404:
        return ProviderError("MODEL_UNAVAILABLE", message, status_code)
    if status_code == 429:
        return ProviderError("PROVIDER_RATE_LIMIT", message, status_code, True)
    return ProviderError("PROVIDER_ERROR", message, status_code, status_code >= 500)


async def close_http_client() -> None:
    global _http_client
    if _http_client is not None:
        await _http_client.aclose()
        _http_client = None


async def get_http_client():
    global _http_client
    if httpx is None:
        return None
    if _http_client is None:
        _http_client = httpx.AsyncClient(
            timeout=httpx.Timeout(18.0, connect=5.0)
        )
    return _http_client

async def execute_prompt_with_llm(
    prompt: str,
    model_id: str,
    domain_id: str,
    is_optimized: bool = True,
    skill_context: str = ""
) -> Tuple[str, str]:
    """
    Gá»i OpenRouter API thá»±c táº¿. KhÃ´ng cÃ³ local fallback: má»i pháº£n há»“i pháº£i
    Ä‘Æ°á»£c sinh bá»Ÿi model Ä‘Ã£ chá»n.
    """
    api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError(
            "OPENROUTER_API_KEY chÆ°a Ä‘Æ°á»£c cáº¥u hÃ¬nh. KhÃ´ng thá»ƒ thá»±c thi prompt qua model."
        )

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "AI-Prompt-Manager-v2"
    }
    messages = []
    if skill_context:
        messages.append({
            "role": "system",
            "content": (
                "Báº¡n pháº£i tuÃ¢n thá»§ cÃ¡c skill chuyÃªn ngÃ nh Ä‘Æ°á»£c chá»n dÆ°á»›i Ä‘Ã¢y. "
                "Chá»‰ Ã¡p dá»¥ng pháº§n liÃªn quan Ä‘áº¿n yÃªu cáº§u ngÆ°á»i dÃ¹ng.\n\n"
                f"{skill_context}"
            ),
        })
    messages.append({"role": "user", "content": prompt})
    payload = {
        "model": model_id,
        "messages": messages,
        "temperature": 0.4 if is_optimized else 0.7,
        "max_tokens": 2048
    }

    # Thá»­ gá»i API vá»›i cÆ¡ cháº¿ retry 1 láº§n vÃ  timeout 18 giÃ¢y
    for attempt in range(2):
        try:
            if httpx is not None:
                client = await get_http_client()
                res = await client.post(OPENROUTER_API_URL, headers=headers, json=payload)
                status_code = res.status_code
                response_text = res.text
                data = res.json() if status_code == 200 else {}
            else:
                request_data = json.dumps(payload).encode("utf-8")
                request = urllib.request.Request(
                    OPENROUTER_API_URL,
                    data=request_data,
                    headers=headers,
                    method="POST",
                )
                with urllib.request.urlopen(request, timeout=18.0) as response:
                    status_code = response.status
                    response_text = response.read().decode("utf-8")
                data = json.loads(response_text) if status_code == 200 else {}

            if status_code == 200:
                choices = data.get("choices", [])
                if choices and len(choices) > 0:
                    content = choices[0].get("message", {}).get("content", "")
                    if content and content.strip():
                        return content.strip(), "openrouter"
            else:
                raise provider_error(
                    status_code,
                    f"OpenRouter provider error (HTTP {status_code}): {response_text[:300]}",
                )

        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")[:300]
            raise provider_error(
                exc.code,
                f"OpenRouter provider error (HTTP {exc.code}): {detail}",
            ) from exc
        except RuntimeError:
            raise
        except Exception as exc:
            if attempt == 0:
                await asyncio.sleep(1.0)
                continue
            raise RuntimeError(f"KhÃ´ng thá»ƒ thá»±c thi prompt qua OpenRouter: {exc}") from exc

    raise RuntimeError("OpenRouter khÃ´ng tráº£ vá» ná»™i dung há»£p lá»‡.")
