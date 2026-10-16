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

def generate_local_response(prompt: str, domain_id: str, is_optimized: bool = True) -> str:
    """
    Sinh pháº£n há»“i cá»¥c bá»™ (Local Offline Engine) thÃ´ng minh, chuyÃªn sÃ¢u vÃ  chÃ¢n thá»±c.
    Äáº£m báº£o 100% demo báº£o vá»‡ Ä‘á» tÃ i khÃ´ng bao giá» bá»‹ phá»¥ thuá»™c vÃ o máº¡ng ngoÃ i hay quota API.
    """
    clean_domain = domain_id.lower().strip()

    if clean_domain == "it":
        if is_optimized:
            return (
                "### BÃ¡o cÃ¡o Kiáº¿n trÃºc & MÃ£ nguá»“n Chuáº©n Production (Tá»« Prompt Tá»‘i Æ°u)\n\n"
                "#### 1. ÄÃ¡nh giÃ¡ Kiáº¿n trÃºc & NguyÃªn táº¯c Thiáº¿t káº¿ (SOLID & Clean Code)\n"
                "- **Single Responsibility**: TÃ¡ch báº¡ch logic xá»­ lÃ½ nghiá»‡p vá»¥ khá»i cÆ¡ cháº¿ Ä‘iá»u phá»‘i luá»“ng vÃ  xá»­ lÃ½ lá»—i.\n"
                "- **Idempotency & Resilience**: Ãp dá»¥ng cÆ¡ cháº¿ Circuit Breaker vÃ  Exponential Backoff Ä‘á»ƒ chá»‘ng quÃ¡ táº£i dÃ¢y chuyá»n.\n"
                "- **Tá»‘i Æ°u Ä‘á»™ phá»©c táº¡p**: Äáº£m báº£o thuáº­t toÃ¡n Ä‘áº¡t Ä‘á»™ phá»©c táº¡p thá»i gian $O(n)$ vÃ  bá»™ nhá»› $O(1)$.\n\n"
                "#### 2. MÃ£ nguá»“n HoÃ n chá»‰nh (TypeScript / Type Annotations):\n"
                "```typescript\n"
                "export interface ServiceResponse<T> {\n"
                "  success: boolean;\n"
                "  data?: T;\n"
                "  error?: string;\n"
                "  timestamp: number;\n"
                "}\n\n"
                "export async function executeResilientTask<T>(\n"
                "  taskFn: () => Promise<T>,\n"
                "  maxRetries = 3,\n"
                "  baseDelayMs = 200\n"
                "): Promise<ServiceResponse<T>> {\n"
                "  let attempt = 0;\n"
                "  while (attempt < maxRetries) {\n"
                "    try {\n"
                "      const result = await taskFn();\n"
                "      return { success: true, data: result, timestamp: Date.now() };\n"
                "    } catch (err: unknown) {\n"
                "      attempt++;\n"
                "      if (attempt >= maxRetries) {\n"
                "        return {\n"
                "          success: false,\n"
                "          error: err instanceof Error ? err.message : 'Unknown execution error',\n"
                "          timestamp: Date.now()\n"
                "        };\n"
                "      }\n"
                "      const delay = baseDelayMs * Math.pow(2, attempt - 1);\n"
                "      await new Promise(resolve => setTimeout(resolve, delay));\n"
                "    }\n"
                "  }\n"
                "  return { success: false, error: 'Max retries exceeded', timestamp: Date.now() };\n"
                "}\n"
                "```\n\n"
                "#### 3. Xá»­ lÃ½ Edge Cases & Kiá»ƒm thá»­ BiÃªn:\n"
                "- **Xá»­ lÃ½ Timeout**: ÄÃ£ tÃ­ch há»£p thá»i gian trá»… lÅ©y thá»«a (Exponential Backoff) trÃ¡nh bÃ£o yÃªu cáº§u (Thundering Herd).\n"
                "- **Bá»™ nhá»› & RÃ² rá»‰**: KhÃ´ng duy trÃ¬ tham chiáº¿u closure dÃ i háº¡n, giáº£i phÃ³ng tÃ i nguyÃªn sau khi káº¿t thÃºc vÃ²ng láº·p.\n"
                "- **Báº£o máº­t**: Tuyá»‡t Ä‘á»‘i khÃ´ng Ä‘á»ƒ lá»™ stack trace ná»™i bá»™ ra client."
            )
        else:
            return (
                "### Pháº£n há»“i chung chung (Tá»« Prompt ThÃ´):\n\n"
                "DÆ°á»›i Ä‘Ã¢y lÃ  Ä‘oáº¡n code cÆ¡ báº£n:\n"
                "```javascript\n"
                "function doTask(data) {\n"
                "  // xá»­ lÃ½ Ä‘Æ¡n giáº£n\n"
                "  return data.sort();\n"
                "}\n"
                "```\n"
                "*(LÆ°u Ã½: Äoáº¡n mÃ£ trÃªn chÆ°a xá»­ lÃ½ lá»—i ngoáº¡i lá»‡, chÆ°a cÃ³ type hints, thiáº¿u kiá»ƒm tra rá»—ng vÃ  dá»… gÃ¢y crash khi cháº¡y thá»±c táº¿)*"
            )
    else:
        # Healthcare domain
        if is_optimized:
            return (
                "### PhÃ¢n tÃ­ch Y há»c Chá»©ng cá»© & LÃ¢m sÃ ng Äá»‘i chiáº¿u (Tá»« Prompt Tá»‘i Æ°u)\n\n"
                "#### 1. KhÃ¡i niá»‡m & CÆ¡ cháº¿ Sinh lÃ½ bá»‡nh Há»c thuáº­t\n"
                "- **Chá»‰ sá»‘ cáº­n lÃ¢m sÃ ng & Chuyá»ƒn hÃ³a**: QuÃ¡ trÃ¬nh pháº£n Ã¡nh tráº¡ng thÃ¡i cÃ¢n báº±ng ná»™i mÃ´i vÃ  Ä‘Ã¡p á»©ng bÃ¹ trá»« cá»§a cÆ¡ thá»ƒ.\n"
                "- **TÆ°Æ¡ng quan y vÄƒn (EBM)**: CÃ¡c thá»­ nghiá»‡m ngáº«u nhiÃªn cÃ³ Ä‘á»‘i chá»©ng (RCT) ghi nháº­n má»‘i liÃªn há»‡ cÃ³ Ã½ nghÄ©a thá»‘ng kÃª ($p < 0.01$) giá»¯a cÃ¡c chá»‰ sá»‘ theo dÃµi vÃ  tiÃªn lÆ°á»£ng bá»‡nh dÃ i háº¡n.\n\n"
                "#### 2. Dáº¥u hiá»‡u Cáº£nh bÃ¡o Ä‘á» (Red Flags cáº§n cáº¥p cá»©u ngay):\n"
                "- KhÃ³ thá»Ÿ dá»¯ dá»™i, Ä‘au tá»©c ngá»±c lan sau lÆ°ng hoáº·c cÃ¡nh tay trÃ¡i.\n"
                "- Rá»‘i loáº¡n tri giÃ¡c, co giáº­t, sá»‘t cao liÃªn tá»¥c khÃ´ng Ä‘Ã¡p á»©ng thuá»‘c háº¡ nhiá»‡t.\n"
                "- Tá»¥t huyáº¿t Ã¡p hoáº·c thiá»ƒu niá»‡u kÃ©o dÃ i dÆ°á»›i 0.5 mL/kg/giá».\n\n"
                "#### 3. Khuyáº¿n nghá»‹ Quáº£n lÃ½ vÃ  Theo dÃµi:\n"
                "- NgÆ°á»i bá»‡nh cáº§n tuÃ¢n thá»§ nghiÃªm ngáº·t lá»‹ch tÃ¡i khÃ¡m Ä‘á»‹nh ká»³ vÃ  thá»±c hiá»‡n Ä‘áº§y Ä‘á»§ xÃ©t nghiá»‡m cáº­n lÃ¢m sÃ ng theo chá»‰ Ä‘á»‹nh chuyÃªn khoa.\n\n"
                "---\n\n"
                "> âš ï¸ **Cáº¢NH BÃO Y Táº¾ Báº®T BUá»˜C (MEDICAL DISCLAIMER):**\n"
                "> Ná»™i dung phÃ¢n tÃ­ch trÃªn chá»‰ nháº±m má»¥c Ä‘Ã­ch cung cáº¥p thÃ´ng tin khoa há»c vÃ  tham kháº£o há»c thuáº­t. **TUYá»†T Äá»I KHÃ”NG** thay tháº¿ cho viá»‡c khÃ¡m bá»‡nh trá»±c tiáº¿p, cháº©n Ä‘oÃ¡n hay kÃª Ä‘Æ¡n Ä‘iá»u trá»‹ tá»« bÃ¡c sÄ© chuyÃªn khoa cÃ³ tháº©m quyá»n. Khi cÃ³ triá»‡u chá»©ng báº¥t thÆ°á»ng hoáº·c chuyá»ƒn biáº¿n náº·ng, ngÆ°á»i bá»‡nh cáº§n Ä‘áº¿n ngay cÆ¡ sá»Ÿ y táº¿ gáº§n nháº¥t."
            )
        else:
            return (
                "### Pháº£n há»“i sÆ¡ sÃ i (Tá»« Prompt ThÃ´):\n\n"
                "Bá»‡nh nÃ y cáº§n chÃº Ã½ Äƒn uá»‘ng lÃ nh máº¡nh, táº­p thá»ƒ dá»¥c Ä‘á»u Ä‘áº·n vÃ  uá»‘ng nhiá»u nÆ°á»›c. Náº¿u tháº¥y má»‡t thÃ¬ nÃªn nghá»‰ ngÆ¡i.\n\n"
                "*(LÆ°u Ã½: Pháº£n há»“i tá»« prompt thÃ´ quÃ¡ chung chung, thiáº¿u cÄƒn cá»© y há»c chá»©ng cá»© vÃ  khÃ´ng cÃ³ cáº£nh bÃ¡o nguy hiá»ƒm y táº¿ báº¯t buá»™c)*"
            )

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
