import time
import uuid
import asyncio
import json
from datetime import datetime
from typing import Awaitable, Callable, Optional
from fastapi import APIRouter, BackgroundTasks, HTTPException, Response
from fastapi.responses import StreamingResponse
from ..schemas import (
    ScorePromptRequest,
    PromptScoreResponse,
    OptimizeRequest,
    OptimizeResponse
    , ExecutionTelemetry, PhaseTiming
)
from ..services.rubric import evaluate_prompt_rubric
from ..services.prompt_builder import build_optimized_prompt
from ..services.llm_client import execute_prompt_with_llm, ProviderError
from ..services.storage import storage_service
from ..services.skill_registry import skill_registry
from ..config import PRIMARY_MODEL_ID

router = APIRouter(tags=["Optimize & Scoring"])


def _provider_http_error(exc: ProviderError) -> HTTPException:
    return HTTPException(
        status_code=502,
        detail={
            "code": exc.error_code,
            "message": str(exc),
            "model_id": PRIMARY_MODEL_ID,
            "provider": "openrouter",
            "retryable": exc.retryable,
        },
    )


async def _save_history(history_item: dict) -> None:
    try:
        history_list = []
        try:
            history_list = await storage_service.read_json("history.json")
            if not isinstance(history_list, list):
                history_list = []
        except Exception:
            history_list = []
        history_list.insert(0, history_item)
        await storage_service.write_json("history.json", history_list[:50])
    except Exception as err:
        print(f"Cảnh báo: Không thể lưu history.json: {err}")

@router.post("/api/score", response_model=PromptScoreResponse)
async def score_prompt(payload: ScorePromptRequest):
    """
    Chấm điểm Prompt thô theo thời gian thực (real-time debounce 400ms ở frontend).
    Đánh giá 8 tiêu chí Rubric + phát hiện từ khóa đỏ nguy hiểm (Red Flags).
    Chạy bằng thuật toán nội bộ dưới 5ms; phần thực thi AI vẫn bắt buộc qua OpenRouter.
    """
    clean_domain = payload.domain_id.strip().lower()
    if clean_domain in ["health", "medical", "y-te"]:
        clean_domain = "healthcare"
    elif clean_domain in ["tech", "cntt", "software"]:
        clean_domain = "it"

    domain_pack = None
    try:
        domain_pack = skill_registry.get_domain_pack(clean_domain)
    except Exception:
        domain_pack = None

    return evaluate_prompt_rubric(
        raw_prompt=payload.raw_prompt,
        domain_id=clean_domain,
        domain_pack=domain_pack
    )

async def _optimize_pipeline(
    payload: OptimizeRequest,
    background_tasks: BackgroundTasks,
    response: Response,
    emit: Optional[Callable[[str, dict], Awaitable[None]]] = None,
):
    """
    Pipeline chính Bước 4:
    1. Phân rã và xây dựng Prompt tối ưu qua 6 slots kỹ thuật.
    2. Chấm điểm so sánh Rubric trước và sau (Raw Score vs Optimized Score).
    3. Chạy song song thực thi AI cho cả prompt thô và prompt tối ưu trên cùng mô hình được chọn.
    4. Tự động lưu lịch sử vào history.json qua asyncio.Lock an toàn.
    """
    start_time = time.perf_counter()
    request_id = str(uuid.uuid4())
    response.headers["X-Request-ID"] = request_id
    phase_timings = {}
    async def progress(event: str, data: dict) -> None:
        if emit:
            await emit(event, data)

    async def phase_started(name: str) -> None:
        await progress("phase", {"phase": name, "status": "started"})

    async def phase_completed(name: str, duration_ms: int, status: str = "completed") -> None:
        await progress("phase", {"phase": name, "status": status, "duration_ms": duration_ms})

    await progress("request_id", {"request_id": request_id})
    if not payload.run_ai_execution:
        raise HTTPException(
            status_code=400,
            detail="Cloud model execution là bắt buộc; không hỗ trợ chế độ chỉ tối ưu cục bộ.",
        )
    clean_domain = payload.domain_id.strip().lower()
    if clean_domain in ["health", "medical", "y-te"]:
        clean_domain = "healthcare"
    elif clean_domain in ["tech", "cntt", "software"]:
        clean_domain = "it"

    # 1. Đọc domain pack và skill context
    phase_start = time.perf_counter()
    await phase_started("skill_loading")
    try:
        domain_pack = skill_registry.get_domain_pack(clean_domain)
    except Exception as e:
        raise HTTPException(
            status_code=404,
            detail=f"Không thể đọc dữ liệu domain pack '{clean_domain}': {str(e)}"
        )

    # 2. Quality dùng Nemotron -> Laguna -> Nemotron; Fast chỉ dùng Nemotron.
    skill_context = skill_registry.select_skill_context(
        clean_domain, payload.template_id, payload.raw_prompt
    )
    phase_timings["skill_loading"] = int((time.perf_counter() - phase_start) * 1000)
    await phase_completed("skill_loading", phase_timings["skill_loading"])
    quality_mode = payload.execution_mode == "quality" or payload.enable_critic
    critic_report = None
    if quality_mode:
        from ..services.critic_service import run_generator_critic_loop
        try:
            quality_timings = {}
            async def emit_quality_phase(name: str, status: str, duration_ms: Optional[int]) -> None:
                await progress("phase", {
                    "phase": name,
                    "status": status,
                    **({"duration_ms": duration_ms} if duration_ms is not None else {}),
                })
            optimized_prompt, slots, raw_score, opt_score, critic_report = await run_generator_critic_loop(
                domain_id=clean_domain,
                template_id=payload.template_id,
                raw_prompt=payload.raw_prompt,
                selected_model_id=PRIMARY_MODEL_ID,
                domain_pack=domain_pack,
                critic_model_id=payload.critic_model_id,
                skill_context=skill_context,
                telemetry=quality_timings,
                emit_phase=emit_quality_phase,
            )
            phase_timings.update(quality_timings)
        except ProviderError as exc:
            raise _provider_http_error(exc) from exc
        except RuntimeError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc
    else:
        await phase_started("draft")
        phase_start = time.perf_counter()
        optimized_prompt, slots, raw_score, opt_score = build_optimized_prompt(
            domain_id=clean_domain,
            template_id=payload.template_id,
            raw_prompt=payload.raw_prompt,
            domain_pack=domain_pack
        )
        phase_timings["draft"] = int((time.perf_counter() - phase_start) * 1000)
        phase_timings["critic"] = 0
        phase_timings["refinement"] = 0
        await phase_completed("draft", phase_timings["draft"])
        await phase_completed("critic", 0, "skipped")
        await phase_completed("refinement", 0, "skipped")

    diff_tokens = max(0, int((len(optimized_prompt) - len(payload.raw_prompt)) / 4))

    # 3. Cùng một model xử lý hai bước: chuẩn hóa prompt rồi sinh câu trả lời.
    raw_ai_text = None
    opt_ai_text = None
    exec_source = "openrouter"

    if payload.run_ai_execution:
        await phase_started("execution")
        model_id = PRIMARY_MODEL_ID
        phase_start = time.perf_counter()
        if not quality_mode:
            try:
                optimized_prompt, _ = await execute_prompt_with_llm(
                    prompt=(
                        "Hãy chuyển yêu cầu người dùng dưới đây thành một optimized prompt "
                        "rõ ràng, đầy đủ và có thể dùng trực tiếp cho bước trả lời tiếp theo. "
                        "Chỉ trả về optimized prompt, không giải thích ngoài lề.\n\n"
                        f"YÊU CẦU NGƯỜI DÙNG:\n{payload.raw_prompt}"
                    ),
                    model_id=model_id,
                    domain_id=clean_domain,
                    is_optimized=True,
                    skill_context=skill_context,
                )
            except ProviderError as exc:
                raise _provider_http_error(exc) from exc
            except RuntimeError as exc:
                raise HTTPException(status_code=502, detail=str(exc)) from exc
            phase_timings["draft"] = phase_timings.get("draft", 0) + int((time.perf_counter() - phase_start) * 1000)

        execution_start = time.perf_counter()
        if payload.compare_raw:
            try:
                raw_result, opt_result = await asyncio.gather(
                    execute_prompt_with_llm(
                        prompt=payload.raw_prompt,
                        model_id=model_id,
                        domain_id=clean_domain,
                        is_optimized=False,
                        skill_context=skill_context,
                    ),
                    execute_prompt_with_llm(
                        prompt=optimized_prompt,
                        model_id=model_id,
                        domain_id=clean_domain,
                        is_optimized=True,
                        skill_context=skill_context,
                    ),
                )
            except ProviderError as exc:
                raise _provider_http_error(exc) from exc
            except RuntimeError as exc:
                raise HTTPException(status_code=502, detail=str(exc)) from exc
            raw_ai_text, _ = raw_result
            opt_ai_text, exec_source = opt_result
        else:
            try:
                opt_ai_text, exec_source = await execute_prompt_with_llm(
                    prompt=optimized_prompt,
                    model_id=model_id,
                    domain_id=clean_domain,
                    is_optimized=True,
                    skill_context=skill_context,
                )
            except ProviderError as exc:
                raise _provider_http_error(exc) from exc
            except RuntimeError as exc:
                raise HTTPException(status_code=502, detail=str(exc)) from exc
        phase_timings["execution"] = int((time.perf_counter() - execution_start) * 1000)
        await phase_completed("execution", phase_timings["execution"])

    execution_time_ms = int((time.perf_counter() - start_time) * 1000)
    telemetry = ExecutionTelemetry(
        request_id=request_id,
        phases=[
            PhaseTiming(phase=phase, duration_ms=duration, status="skipped" if duration == 0 else "completed")
            for phase, duration in phase_timings.items()
        ],
    )

    # 4. Ghi lịch sử sau khi trả response, không làm tăng latency người dùng.
    history_id = str(uuid.uuid4())
    background_tasks.add_task(
        _save_history,
        {
            "id": history_id,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "domain_id": clean_domain,
            "template_id": payload.template_id,
            "model_used": PRIMARY_MODEL_ID,
            "raw_prompt": payload.raw_prompt,
            "optimized_prompt": optimized_prompt,
            "raw_score": raw_score,
            "optimized_score": opt_score,
            "source": exec_source,
            "execution_time_ms": execution_time_ms,
            "execution_mode": "quality" if quality_mode else "fast",
            "request_id": request_id,
            "phase_timings": phase_timings,
        },
    )

    result = OptimizeResponse(
        optimized_prompt=optimized_prompt,
        slots=slots,
        raw_score=raw_score,
        optimized_score=opt_score,
        diff_added_tokens=diff_tokens,
        ai_raw_response=raw_ai_text,
        ai_optimized_response=opt_ai_text,
        execution_source=exec_source,
        execution_time_ms=execution_time_ms,
        model_used=PRIMARY_MODEL_ID,
        history_id=history_id,
        critic_report=critic_report,
        telemetry=telemetry,
    )
    await progress("result", result.model_dump())
    return result


@router.post("/api/optimize", response_model=OptimizeResponse)
async def optimize_and_execute(
    payload: OptimizeRequest, background_tasks: BackgroundTasks, response: Response
):
    return await _optimize_pipeline(payload, background_tasks, response)


@router.post("/api/optimize/stream")
async def optimize_stream(payload: OptimizeRequest):
    async def event_stream():
        queue: asyncio.Queue[tuple[str, dict]] = asyncio.Queue()
        background_tasks = BackgroundTasks()
        stream_request_id = None

        async def emit(event: str, data: dict) -> None:
            await queue.put((event, data))

        task = asyncio.create_task(
            _optimize_pipeline(payload, background_tasks, Response(), emit)
        )
        try:
            while True:
                if task.done() and queue.empty():
                    break
                try:
                    event, data = await asyncio.wait_for(queue.get(), timeout=0.25)
                    if event == "request_id":
                        stream_request_id = data.get("request_id")
                    yield f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
                except asyncio.TimeoutError:
                    continue
            try:
                await task
                await background_tasks()
            except Exception as exc:
                detail = exc.detail if isinstance(exc, HTTPException) else str(exc)
                if isinstance(detail, dict):
                    message = detail.get("message", str(detail))
                else:
                    message = str(detail)
                yield f"event: error\ndata: {json.dumps({'message': message, 'request_id': stream_request_id}, ensure_ascii=False)}\n\n"
        finally:
            if not task.done():
                task.cancel()

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )
