# AI Prompt Manager

Ứng dụng web hỗ trợ **chọn mô hình AI và tối ưu hóa prompt theo ngữ cảnh chuyên ngành**. Người dùng nhập yêu cầu tự nhiên, chọn domain/template, nhận prompt có cấu trúc và gửi prompt đó đến model cloud qua OpenRouter.

> **Trạng thái:** bản demo học thuật. Hệ thống cloud-only, không dùng câu trả lời AI giả lập trong runtime.

## 1. Mục tiêu

AI Prompt Manager giải quyết các vấn đề thường gặp khi sử dụng LLM:

- Prompt thiếu vai trò, bối cảnh, ràng buộc hoặc định dạng đầu ra.
- Người dùng khó chọn model phù hợp giữa nhiều tiêu chí.
- Prompt theo chuyên ngành cần guardrail khác nhau.
- Không nhìn thấy pipeline hoặc latency của một lần chạy.
- Khó phân biệt lỗi provider, quota, rate limit và model không khả dụng.

## 2. Tính năng chính

- **Wizard 4 bước:** chọn lĩnh vực → chọn template/nhập yêu cầu → chọn model → xem kết quả.
- **Domain packs:** IT & Lập trình, Healthcare, Marketing và Education.
- **Skill Registry/Compiler:** chuẩn hóa skill thành manifest, route theo domain/template/keyword và giới hạn context trước khi gửi model.
- **Prompt Builder 6 slots:** Role, Context, Task, Constraints, Output Format và Safety Guardrails.
- **Rubric scoring:** chấm độ rõ ràng, đầy đủ, khả năng hành động, an toàn và mức độ phù hợp của prompt.
- **Model recommendation:** xếp hạng theo task fit, tiếng Việt, chi phí và tốc độ.
- **Fast mode:** skill loading → prompt builder → primary model → kết quả.
- **Quality mode:** skill loading → draft → critic → refinement → execution.
- **Realtime SSE:** hiển thị request ID, phase đang chạy, phase hoàn tất/bỏ qua và thời gian từng phase.
- **Có thể dừng xử lý:** frontend dùng `AbortController`, backend hủy task khi client ngắt stream.
- **Safety guardrails:** kiểm tra red flags, disclaimer theo domain và provider error mapping.
- **Lịch sử và cài đặt:** lưu lịch sử demo dạng JSON, quản lý API key ở backend và kiểm tra kết nối model.
- **Giao diện sáng responsive:** React/Vite, Be Vietnam Pro, liquid morphism nhẹ, hỗ trợ keyboard navigation và reduced motion.

## 3. Kiến trúc

```text
React/Vite frontend
        │
        ▼
FastAPI API
        │
        ├── Domain Pack JSON
        ├── Skill Registry → Skill Compiler
        ├── Prompt Builder → Rubric/Safety
        ├── Model Recommendation
        └── SSE Observability
                │
                ▼
        OpenRouter Cloud Models
```

### Luồng xử lý

1. Frontend tải danh sách domain từ `GET /api/domains`.
2. Người dùng chọn domain và template.
3. Backend đọc domain pack, chọn skill và tạo context có giới hạn.
4. Prompt Builder tạo prompt theo sáu slot và chạy safety checks.
5. Backend gọi model qua OpenRouter; Quality mode có thêm critic/refinement.
6. Frontend nhận event SSE và hiển thị live trace.
7. Kết quả, telemetry và request ID được trả về; lịch sử được lưu cho demo.

## 4. Domain và skill

Domain pack nằm tại `backend/data/domains/`:

| Domain | Nội dung chính | Guardrail |
|---|---|---|
| `it` | API, code generation, architecture, debugging | OWASP, credentials, SSL, destructive commands |
| `healthcare` | EBM, clinical explanation, patient education | Medical disclaimer, không kê đơn, red flags |
| `marketing` | Content strategy, campaign copy, audience research, KPI | Không claim sai, testimonial giả, spam, dark pattern |
| `education` | Lesson plan, tutoring, assessment, learning material | Không gian lận, đạo văn, bịa nguồn, bảo vệ dữ liệu học sinh |

Mỗi domain có thể khai báo:

- glossary và red flags;
- required disclaimer;
- default output format;
- template-specific `system_prompt`;
- `prompt_policy` cho role, context và constraints;
- model IDs được khuyến nghị.

## 5. API quan trọng

| Method | Endpoint | Mục đích |
|---|---|---|
| `GET` | `/api/health` | Kiểm tra backend |
| `GET` | `/api/domains` | Danh sách domain |
| `GET` | `/api/domains/{domain_id}` | Chi tiết domain và templates |
| `POST` | `/api/score` | Chấm điểm prompt |
| `POST` | `/api/recommend` | Khuyến nghị model |
| `POST` | `/api/optimize` | Tối ưu/chạy prompt dạng đồng bộ |
| `POST` | `/api/optimize/stream` | Tối ưu/chạy prompt qua SSE |
| `GET` | `/api/history` | Lịch sử chạy |
| `GET` | `/api/history/stats` | Thống kê lịch sử |
| `GET/POST/DELETE` | `/api/settings` | Cấu hình API key/model |

### SSE events

`/api/optimize/stream` phát các event:

- `request_id`
- `phase` với `started`, `completed`, `skipped`
- `result`
- `error`

Các phase chính: `skill_loading`, `draft`, `critic`, `refinement`, `execution`.

## 6. Provider errors

Runtime chỉ gọi OpenRouter. Một số mã lỗi được chuẩn hóa:

| Mã | Ý nghĩa |
|---|---|
| `AUTH_INVALID` | API key không hợp lệ hoặc không có quyền |
| `QUOTA_EXCEEDED` | Hết quota |
| `PROVIDER_RATE_LIMIT` | Provider giới hạn tần suất |
| `MODEL_UNAVAILABLE` | Model/provider không khả dụng |
| `PROVIDER_TIMEOUT` | Provider phản hồi quá thời gian |
| `PROVIDER_ERROR` | Lỗi provider khác |

Khi provider lỗi, giao diện phải hiển thị lỗi và hành động retry/dừng phù hợp; không hiển thị kết quả giả.

## 7. Cấu trúc thư mục

```text
AI-Prompt/
├── backend/
│   ├── data/domains/       # Domain packs
│   ├── models/             # SkillManifest và model schemas
│   ├── routers/            # FastAPI endpoints
│   ├── services/           # Skill, prompt, safety, LLM, storage
│   └── tests/              # Backend unit/API tests
├── frontend/
│   └── src/
│       ├── api/            # API client và SSE parser
│       ├── components/     # DomainCard, ModelCard, PromptDiff...
│       ├── pages/          # Landing, Dashboard, Wizard, History, Settings
│       ├── store/          # Wizard state
│       └── styles/         # Tokens và landing styles
├── .github/skills/         # Quy chuẩn UI/accessibility/design tokens
├── Mau_Bao_Cao-NLS-HIU.docx
└── README.md
```

## 8. Cài đặt và chạy

### Yêu cầu

- Python 3.10+
- Node.js 18+
- OpenRouter API key

### Backend

Từ thư mục gốc:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
```

Tạo file `.env` và khai báo:

```env
OPENROUTER_API_KEY=your_openrouter_key
```

Khởi động FastAPI:

```powershell
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

Backend docs: `http://127.0.0.1:8000/docs`

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Frontend mặc định chạy tại `http://localhost:5173`.

## 9. Kiểm thử và kiểm tra chất lượng

```powershell
# Backend tests
python -m unittest discover -s backend\tests -p "test_*.py"

# Frontend production build
cd frontend
npm run build
```

Test quality mode gọi provider thật chỉ chạy khi chủ động bật:

```powershell
$env:RUN_LIVE_PROVIDER_TESTS="1"
python -m unittest backend.tests.test_critic_service
```

Để kiểm tra contrast token:

```powershell
python .github\skills\pm-design-tokens\scripts\check_contrast.py frontend\src\styles\tokens.css
```

## 10. Giới hạn của bản demo

- Model miễn phí có thể bị rate limit hoặc hết quota.
- `history.json` phù hợp demo/single-instance, chưa phải persistence production.
- Chưa có authentication và phân quyền người dùng.
- Quality mode có latency và chi phí cao hơn Fast mode.
- Cần kiểm tra nội dung AI trước khi dùng trong healthcare, education hoặc marketing thực tế.
- Browser visual regression và benchmark quy mô lớn chưa được tích hợp tự động.

## 11. Hướng phát triển

- Chuyển history sang SQLite/PostgreSQL.
- Thêm user authentication và workspace theo người dùng.
- Cho phép tạo/version domain pack trong giao diện.
- Bổ sung provider fallback có kiểm soát và retry/backoff.
- Thêm dashboard latency, cost và quality benchmark.
- Thêm automated browser tests và export báo cáo PDF/DOCX.

## 12. Tài liệu báo cáo

`Mau_Bao_Cao-NLS-HIU.docx` là mẫu báo cáo môn học. Khung năm phần được giữ nguyên:

1. Mở đầu.
2. Cơ sở lý thuyết & công cụ.
3. Nội dung thực hiện.
4. Kết quả và đánh giá.
5. Kết luận & hướng phát triển.

Các hình phù hợp để đưa vào báo cáo gồm: kiến trúc hệ thống, Skill Registry, Domain Pack, Wizard 4 bước, SSE Live Trace, Prompt Diff, rubric score và biểu đồ latency.