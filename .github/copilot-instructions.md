# AI-Prompt-Manager — quy tắc frontend (React/Vite)

Nếu đã có file này, hợp nhất phần dưới vào cuối file cũ. Giữ ngắn: đây là nội dung luôn được nạp.

- Giao diện chỉ SÁNG, tương phản dịu. Màu/chữ/khoảng cách/bo góc chỉ lấy từ `var(--...)` trong `src/styles/tokens.css` (nguồn: `.github/skills/pm-design-tokens/assets/tokens.css`). Không viết hex trong component.
- Chữ không dưới 4.5:1; cấm đen/trắng thuần cho chữ và nền. Sửa màu xong chạy `python .github/skills/pm-design-tokens/scripts/check_contrast.py src/styles/tokens.css`.
- Font Be Vietnam Pro (UI), JetBrains Mono (code, id model). Tiếng Việt: line-height thân bài ≥1.5, không uppercase.
- Không bao giờ hiển thị câu trả lời AI giả/mô phỏng. Chỉ model cloud qua OpenRouter; thiếu key hoặc lỗi thì hiện trạng thái lỗi có hành động.
- Output model là dữ liệu không tin cậy: sanitize khi render markdown. API key không bao giờ hiện đầy đủ trên giao diện.
- Mọi lần gọi model phải dừng được và chống bấm đúp.
- Điểm rubric không dùng đèn giao thông; màu cam đào chỉ cho safety guardrail.
- Khi làm UI, xem thêm các skill `pm-ui-components` và `pm-ux-a11y-review` trong `.github/skills/`.
