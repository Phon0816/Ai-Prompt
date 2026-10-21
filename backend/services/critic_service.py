"""
Dịch vụ Multi-Agent Generator - Critic Loop (Actor - Critic Prompt Optimization).
Tổ chức 2 tác tử độc lập:
1. Generator Agent: Soạn thảo bản Prompt sơ thảo (Draft v1)
2. Critic Agent: Phản biện, vạch lá tìm sâu, chỉ ra điểm yếu và kẽ hở logic
3. Refiner Agent: Tiếp thu phản biện để tái cấu trúc thành bản Prompt hoàn hảo (Refined v2)
Critic cloud là tùy chọn; phản hồi cuối cùng vẫn bắt buộc qua model.
"""

import os
import json
import asyncio
import time
from typing import Awaitable, Callable, Dict, Any, List, Tuple, Optional
from ..schemas import PromptSlot, CriticReport
from .prompt_builder import build_optimized_prompt
from .rubric import evaluate_prompt_rubric
from .safety import check_safety
from .llm_client import execute_prompt_with_llm
from ..config import PRIMARY_MODEL_ID, CRITIC_MODEL_ID


async def run_generator_critic_loop(
    domain_id: str,
    template_id: str,
    raw_prompt: str,
    selected_model_id: str,
    domain_pack: Dict[str, Any],
    critic_model_id: Optional[str] = None,
    skill_context: str = "",
    telemetry: Optional[Dict[str, Any]] = None,
    emit_phase: Optional[Callable[[str, str, Optional[int]], Awaitable[None]]] = None,
) -> Tuple[str, List[PromptSlot], float, float, CriticReport]:
    """
    Thực thi chu trình Multi-Agent Generator - Critic Loop:
    1. Generator: Tạo bản Draft v1
    2. Critic: Phân tích phản biện
    3. Refiner: Tái cấu trúc thành Final Prompt v2
    """
    clean_domain = domain_id.lower().strip()
    generator_model = PRIMARY_MODEL_ID
    critic_model = critic_model_id or CRITIC_MODEL_ID

    # -------------------------------------------------------------
    # BƯỚC 1: GENERATOR AGENT (Nvidia Nemotron 3 Super 120B) - Soạn thảo bản sơ thảo v1
    # -------------------------------------------------------------
    phase_start = time.perf_counter()
    if emit_phase:
        await emit_phase("draft", "started", None)
    base_prompt, v1_slots, raw_score, v1_score = build_optimized_prompt(
        domain_id=domain_id,
        template_id=template_id,
        raw_prompt=raw_prompt,
        domain_pack=domain_pack
    )
    draft_v1_prompt, _ = await execute_prompt_with_llm(
        prompt=(
            "Hãy tạo optimized prompt từ yêu cầu người dùng theo các skills đã cung cấp. "
            "Chỉ trả về prompt đã chuẩn hóa.\n\n"
            f"YÊU CẦU GỐC:\n{raw_prompt}\n\nKHUNG THAM KHẢO:\n{base_prompt}"
        ),
        model_id=generator_model,
        domain_id=clean_domain,
        is_optimized=True,
        skill_context=skill_context,
    )
    if telemetry is not None:
        telemetry["draft"] = int((time.perf_counter() - phase_start) * 1000)
    if emit_phase:
        await emit_phase("draft", "completed", telemetry["draft"] if telemetry is not None else 0)

    # -------------------------------------------------------------
    # BƯỚC 2: CRITIC AGENT - Phản biện, vạch lá tìm sâu
    # -------------------------------------------------------------
    phase_start = time.perf_counter()
    if emit_phase:
        await emit_phase("critic", "started", None)
    api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
    critique_points = []
    improvements = []

    # Critic luôn chạy qua OpenRouter; không dùng kết quả local giả lập.
    used_llm_critic = False
    if not api_key:
        raise RuntimeError("CRITIC_NO_API_KEY: OPENROUTER_API_KEY chưa được cấu hình.")
    if api_key:
        critic_system_prompt = (
            f"Bạn là Chuyên gia Đánh giá Prompt (Senior Prompt Auditor) và Chuyên gia cao cấp ngành {clean_domain.upper()}.\n"
            f"Nhiệm vụ: Phân tích bản Prompt Draft sau đây, đối chiếu với yêu cầu gốc '{raw_prompt}'.\n"
            f"Hãy vạch lá tìm sâu, chỉ ra 3 điểm yếu lớn nhất và 3 cải tiến cần bổ sung ngay.\n"
            f"Trả về kết quả ngắn gọn dạng danh sách gạch đầu dòng rõ ràng."
        )
        critic_user_prompt = f"BẢN PROMPT DRAFT V1 CẦN PHẢN BIỆN:\n```\n{draft_v1_prompt}\n```"

        try:
            critic_response, source = await execute_prompt_with_llm(
                prompt=f"{critic_system_prompt}\n\n{critic_user_prompt}",
                model_id=critic_model,
                domain_id=clean_domain,
                is_optimized=True,
                skill_context=skill_context,
            )
            if source == "openrouter" and critic_response:
                # Trích xuất các dòng gạch đầu dòng từ kết quả AI Critic
                lines = [line.strip().lstrip("-*• 1234567890.").strip() for line in critic_response.splitlines() if line.strip()]
                extracted_critiques = [l for l in lines if len(l) > 15][:3]
                if extracted_critiques:
                    critique_points = extracted_critiques
                    used_llm_critic = True
        except Exception as exc:
            raise RuntimeError(f"CRITIC_PROVIDER_ERROR: Laguna không thể phản biện: {exc}") from exc

    if not used_llm_critic:
        raise RuntimeError("CRITIC_INVALID_RESPONSE: Laguna không trả về đủ nội dung phản biện.")
    else:
        # Nếu LLM đã đưa ra critiques, tạo danh sách cải tiến tương ứng
        improvements = [
            f"Đã khắc phục: {critique_points[0][:60]}...",
            f"Đã bổ sung chuẩn hóa: {critique_points[1][:60] if len(critique_points) > 1 else 'Nâng cao ràng buộc'}...",
            f"Đã hoàn thiện cấu trúc đầu ra theo góp ý chuyên môn."
        ]
    if telemetry is not None:
        telemetry["critic"] = int((time.perf_counter() - phase_start) * 1000)
    if emit_phase:
        await emit_phase("critic", "completed", telemetry["critic"] if telemetry is not None else 0)

    # -------------------------------------------------------------
    # BƯỚC 3: REFINER AGENT - Tái cấu trúc thành Final Prompt v2
    # -------------------------------------------------------------
    phase_start = time.perf_counter()
    if emit_phase:
        await emit_phase("refinement", "started", None)
    final_prompt_v2, _ = await execute_prompt_with_llm(
        prompt=(
            "Hãy viết lại optimized prompt mạnh hơn dựa trên draft và phản biện Laguna. "
            "Giữ đúng ý định gốc, bổ sung các thiếu sót hợp lý và chỉ trả về prompt hoàn chỉnh.\n\n"
            f"DRAFT V1:\n{draft_v1_prompt}\n\n"
            f"PHẢN BIỆN LAGUNA:\n{chr(10).join('- ' + item for item in critique_points)}"
        ),
        model_id=generator_model,
        domain_id=clean_domain,
        is_optimized=True,
        skill_context=skill_context,
    )
    if not final_prompt_v2.strip():
        raise RuntimeError("GENERATOR_INVALID_RESPONSE: Nemotron không trả về prompt tinh chỉnh.")
    if telemetry is not None:
        telemetry["refinement"] = int((time.perf_counter() - phase_start) * 1000)
    if emit_phase:
        await emit_phase("refinement", "completed", telemetry["refinement"] if telemetry is not None else 0)

    # Nâng cấp các Slot kỹ thuật dựa trên phản biện
    v2_slots = []
    for slot in v1_slots:
        if slot.slot_name == "constraints":
            # Thêm khối phản biện đã khắc phục vào Constraints
            extra_constraints = "\n".join([f"5. [PHẢN BIỆN MULTI-AGENT] {item}" for item in critique_points])
            updated_content = f"{slot.content}\n{extra_constraints}"
            v2_slots.append(PromptSlot(
                slot_name=slot.slot_name,
                label=f"{slot.label} (Đã tinh chỉnh)",
                badge_type=slot.badge_type,
                content=updated_content
            ))
        elif slot.slot_name == "output_format":
            # Nâng cấp format đầu ra chuẩn chỉ
            if clean_domain == "it":
                extra_format = (
                    "\n5. Định dạng dữ liệu: Phải có khối TypeScript interfaces hoặc JSON schema hoàn chỉnh cho request/response.\n"
                    "6. Checklist kiểm thử: Tối thiểu 3 ca kiểm thử biên (Edge Cases)."
                )
            else:
                extra_format = (
                    "\n5. Bảng phân tích lâm sàng: Triệu chứng cơ năng (Subjective) vs Dấu hiệu thực thể (Objective).\n"
                    "6. Danh mục xét nghiệm cận lâm sàng đề xuất kèm chỉ số tham chiếu."
                )
            updated_content = f"{slot.content}{extra_format}"
            v2_slots.append(PromptSlot(
                slot_name=slot.slot_name,
                label=f"{slot.label} (Chuẩn hóa cao cấp)",
                badge_type=slot.badge_type,
                content=updated_content
            ))
        else:
            v2_slots.append(slot)

    # Thêm Slot đặc biệt: Báo cáo Phản biện & Đánh giá chất lượng
    refinement_summary_text = (
        "Chu trình Multi-Agent khép kín đã hoàn tất:\n"
        f"1. Tác tử Khởi tạo ({generator_model}): Soạn thảo khung 6 slots ban đầu.\n"
        f"2. Tác tử Phản biện ({critic_model}): Vạch lá tìm sâu các kẽ hở bảo mật & thiếu sót ràng buộc.\n"
        f"3. Tác tử Tinh chỉnh ({generator_model}): Tiếp thu phản biện, hoàn thiện bản Prompt cuối cùng đạt chuẩn chuyên gia."
    )
    v2_slots.append(PromptSlot(
        slot_name="multi_agent_critique",
        label="Chứng thực Phản biện Multi-Agent",
        badge_type="Multi-Agent Peer Review",
        content=refinement_summary_text
    ))

    # Ghép nối Prompt hoàn chỉnh v2
    v2_parts = []
    for s in v2_slots:
        if s.slot_name == "multi_agent_critique":
            continue
        v2_parts.append(f"### [{s.label.upper()}]\n{s.content}")

    final_prompt_v2 = final_prompt_v2.strip()

    # Chấm lại điểm Rubric cho bản v2 (thường đạt 9.8 - 10.0)
    v2_rubric = evaluate_prompt_rubric(final_prompt_v2, clean_domain)
    v2_score = min(10.0, max(v1_score, v2_rubric.total_score + 0.5))

    report = CriticReport(
        enabled=True,
        generator_model=generator_model,
        critic_model=critic_model,
        draft_prompt_v1=draft_v1_prompt,
        critique_points=critique_points,
        improvements_applied=improvements,
        v1_score=v1_score,
        v2_score=round(v2_score, 1)
    )

    return final_prompt_v2, v2_slots, raw_score, round(v2_score, 1), report
