# AI Prompt Optimizer & Model Recommender

> **Đồ án:** Ứng dụng Web khuyến nghị mô hình AI và tối ưu hóa câu lệnh (Prompt) theo ngữ cảnh cho từng lĩnh vực chuyên ngành (IT & Lập trình, Y tế & Chăm sóc sức khỏe).

---

## 🌟 1. Tổng quan Kiến trúc Hệ thống

Ứng dụng được thiết kế theo chuẩn **Senior Full-Stack & Prompt Engineering**, giải quyết triệt để vấn đề prompt mơ hồ và khuyến nghị mô hình không chính xác:

1. **Giao diện Wizard 4 Bước Chuyên nghiệp + 2 Tab Phụ**:
   - **Bước 1: Chọn Lĩnh vực**: DomainCard trực quan (IT & Healthcare), danh sách nhiệm vụ điển hình, cảnh báo an toàn y tế bắt buộc.
   - **Bước 2: Nhập Yêu cầu**: Template picker theo chuyên ngành, ô nhập prompt với real-time scoring (ScoreRing 0–10 theo 8 tiêu chí rubric), phát hiện từ khóa nguy hiểm y khoa (Red Flags) tức thì, nút gạt **Bật/Tắt Chế độ Multi-Agent Phản biện (Generator - Critic Loop)**.
   - **Bước 3: Khuyến nghị Mô hình AI**: Thuật toán đa tiêu chí (Task Fit, Vietnamese, Cost, Speed), 4 thanh trượt trọng số cập nhật điểm và thứ hạng real-time, giải thích lý do cụ thể bằng tiếng Việt.
   - **Bước 4: Kết quả & Đối sánh**:
     - *Slot-based Prompt Breakdown*: Vai trò, Bối cảnh, Nhiệm vụ, Ràng buộc, Định dạng đầu ra, Cảnh báo an toàn (Guardrail).
     - *Prompt Diff*: So sánh trực quan văn bản trước/sau, bảng đối chiếu điểm 8 tiêu chí Rubric.
     - *Phản biện Multi-Agent (Hot)*: Theo dõi trực quan pipeline: Prompt Builder tạo Draft v1 ➔ Laguna Critic Auditor phản biện ➔ Python refinement áp dụng góp ý thành Prompt v2.
     - *AI Execution & Comparison*: Chạy song song cả 2 prompt trên cùng mô hình để kiểm chứng kết quả thực tế.
     - *Xuất dữ liệu*: Sao chép, tải JSON, tải Markdown, lưu lịch sử.
   - **Tab Lịch sử**: Lưu trữ với `asyncio.Lock`, KPI thống kê (điểm tăng trung bình, mô hình phổ biến nhất, tổng số lượt), bộ lọc lĩnh vực, chi tiết từng phiên chạy.
   - **Tab Cài đặt**: Quản lý OpenRouter API Key (bảo mật tuyệt đối phía backend, không bao giờ lộ ra frontend), chọn mô hình mặc định.

2. **Cơ chế Đột phá: Multi-Agent Generator - Critic Loop (Adversarial Refinement)**:
   - Thay vì chỉ dựa vào 1 lần sinh prompt duy nhất, hệ thống tổ chức 2 tác tử AI độc lập: Agent 1 (Generator) soạn thảo bản sơ thảo ➔ Agent 2 (Critic đóng vai trò Lead Prompt Auditor) phân tích kẽ hở logic, bảo mật và thiếu sót kiểm thử biên ➔ Refiner tiếp thu phản biện để nâng cấp Prompt lên điểm tuyệt đối (9.8 - 10.0).
   - Skill routing và prompt assembly chạy cục bộ để giảm độ trễ; mọi phản hồi AI và Critic đều bắt buộc được sinh bởi model qua OpenRouter, không có local fallback. Manifest skill được chuẩn hóa bằng Pydantic (routing, safety, output contract, constraints, quan hệ phụ thuộc/xung đột, version/hash và token budget), sau đó compiler validate, route deterministic theo domain/template/từ khóa/confidence và giới hạn context.
   - **Realtime observability:** Pipeline hỗ trợ SSE qua `/api/optimize/stream`, phát sự kiện `request_id`, `phase started/completed/skipped`, kết quả cuối và lỗi. Backend đo latency thật cho skill loading, draft, critic, refinement và execution.

---

## 📂 2. Cấu trúc Thư mục

```text
AI-Prompt/
├── backend/
│   ├── main.py                     # FastAPI entrypoint & middleware CORS
│   ├── schemas.py                  # Pydantic schemas chặt chẽ
│   ├── models/skill_model.py       # SkillManifest và các policy/contract schemas
│   ├── routers/
│   │   ├── domains.py              # GET /api/domains, GET /api/domains/{id}
│   │   ├── recommend.py            # POST /api/recommend (thuật toán TOPSIS/weighted sum)
│   │   ├── optimize.py             # Scoring, optimize đồng bộ và optimize SSE realtime
│   │   ├── history.py              # GET/DELETE /api/history, GET /api/history/stats (asyncio.Lock)
│   │   └── settings.py             # GET/POST/DELETE /api/settings (bảo mật API key phía server)
│   ├── services/
│   │   ├── skill_compiler.py       # Validate, route và compile skill context bounded
│   │   ├── skill_registry.py       # Registry domain JSON và .github/skills/SKILL.md
│   │   ├── rubric.py               # Chấm điểm 8 tiêu chí Rubric (0-10)
│   │   ├── safety.py               # Quét Red Flags & chèn Medical Guardrails
│   │   ├── scoring.py              # Tính điểm khuyến nghị mô hình theo trọng số
│   │   ├── prompt_builder.py       # Pipeline slot-based prompt engineering cục bộ
│   │   ├── storage_service.py      # Đọc/ghi JSON an toàn với asyncio.Lock
│   │   └── llm_client.py           # Gọi OpenRouter có retry, không local fallback
│   ├── data/
│   │   ├── models.json             # 8 mô hình AI hàng đầu kèm chỉ số chi tiết
│   │   ├── history.json            # Lưu trữ lịch sử các phiên chạy
│   │   └── domains/
│   │       ├── it.json             # Glossary, red flags, và 4 templates IT chuyên sâu
│   │       └── healthcare.json     # Glossary, red flags, và 4 templates Y tế chuẩn chứng cứ
│   └── tests/
│       ├── test_rubric.py          # Unit tests cho Rubric & Safety
│       ├── test_scoring.py         # Unit tests cho Model Scoring
│       ├── test_prompt_builder.py  # Unit tests cho Pipeline tạo prompt
│       └── test_history_settings.py# Unit tests cho API History & Settings
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js           # API client với URL fallback & error handling
│   │   ├── store/
│   │   │   └── wizardContext.jsx   # State machine quản lý toàn bộ luồng Wizard
│   │   ├── components/
│   │   │   ├── Stepper.jsx         # Thanh tiến trình 4 bước có trạng thái hoàn thành
│   │   │   ├── DomainCard.jsx      # Thẻ lĩnh vực có huy hiệu cảnh báo
│   │   │   ├── TemplatePicker.jsx  # Danh sách mẫu prompt chuyên ngành có tìm kiếm
│   │   │   ├── ScoreRing.jsx       # Vòng tròn điểm số SVG hoạt họa 0-10
│   │   │   ├── ModelCard.jsx       # Thẻ mô hình hiển thị điểm số và lý do đề xuất
│   │   │   └── PromptDiff.jsx      # Bộ so sánh trực quan câu lệnh trước & sau
│   │   ├── pages/
│   │   │   ├── Wizard.jsx          # Màn hình Wizard chính 4 bước
│   │   │   ├── History.jsx         # Bảng lịch sử & KPI thống kê
│   │   │   └── Settings.jsx        # Cấu hình API key và kiểm tra kết nối cloud
│   │   ├── App.jsx                 # Layout điều hướng chính (Header, Tabs, Footer)
│   │   └── index.css               # Design system, liquid morphism workspace và responsive styles
│   ├── vite.config.js              # Cấu hình Vite dev server proxy
│   └── package.json
│
└── README.md
```

---

## 🚀 3. Hướng dẫn Khởi chạy Dự án

### Yêu cầu tiên quyết
- Python 3.10+
- Node.js 18+ và npm

### Bước 1: Khởi động Backend (FastAPI)
Mở cửa sổ dòng lệnh thứ nhất tại thư mục dự án:
```powershell
# Di chuyển vào thư mục backend nếu cần, hoặc chạy trực tiếp từ thư mục gốc
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
- Kiểm tra tài liệu Swagger API tại: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- Kiểm tra trạng thái hoạt động: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

### Bước 2: Khởi động Frontend (React + Vite)
Mở cửa sổ dòng lệnh thứ hai tại thư mục `frontend`:
```powershell
cd frontend
npm install
npm run dev
```
- Truy cập giao diện ứng dụng tại: [http://localhost:5173](http://localhost:5173)

### Bước 3: Chạy Kiểm thử Đơn vị (Backend Unit Tests)
Tại thư mục gốc dự án:
```powershell
python -m unittest discover -s backend/tests
```
Các test không cần API key sẽ chạy độc lập; nhóm test provider có thể phụ thuộc quota và trạng thái OpenRouter.

---

## 🔑 4. Cấu hình OpenRouter API

1. **Cách 1 (Giao diện Web)**:
   - Vào Tab **"Cài đặt"** trên thanh menu của ứng dụng.
   - Nhập OpenRouter API Key (bắt đầu bằng `sk-or-v1-...`). Backend sẽ tự động lưu và mã hóa hiển thị an toàn.
2. **Cách 2 (File .env)**:
   - Tạo file `.env` tại thư mục gốc với nội dung:
     ```env
     OPENROUTER_API_KEY=sk-or-v1-your-key-here
     ```
3. **API Key là bắt buộc**: Ứng dụng chạy cloud-only qua OpenRouter; không có offline/local fallback. Nếu thiếu key hoặc provider lỗi, hệ thống trả lỗi rõ ràng thay vì sinh nội dung giả lập.

### Mã lỗi provider

Backend phân biệt các lỗi phổ biến để dễ xử lý:

| Mã lỗi | Ý nghĩa |
| :--- | :--- |
| `CONFIG_NO_API_KEY` | Chưa cấu hình API key |
| `AUTH_INVALID` | API key không hợp lệ hoặc không có quyền |
| `PROVIDER_RATE_LIMIT` | Provider trả HTTP 429; cần chờ rate limit reset |
| `QUOTA_EXCEEDED` | Hết quota/credit; cần kiểm tra billing |
| `MODEL_UNAVAILABLE` | Model không tồn tại hoặc tạm thời không khả dụng |
| `PROVIDER_TIMEOUT` | Provider phản hồi quá thời gian |
| `INVALID_PROVIDER_RESPONSE` | Model không trả về text hợp lệ |

---

## 📋 5. Danh sách API Endpoints Chính

| Phương thức | Đường dẫn API | Mô tả chức năng |
| :--- | :--- | :--- |
| `GET` | `/api/domains` | Lấy danh sách chuyên ngành (IT, Healthcare) |
| `GET` | `/api/domains/{id}` | Lấy chi tiết templates, glossary, red flags của domain |
| `POST` | `/api/score` | Đánh giá prompt thô theo 8 tiêu chí rubric & kiểm tra safety |
| `POST` | `/api/recommend` | Tính toán điểm và xếp hạng mô hình AI theo 4 trọng số |
| `POST` | `/api/optimize` | Tối ưu hóa prompt theo cấu trúc Slot-based & nhúng guardrail |
| `POST` | `/api/optimize/stream` | SSE realtime: stream request ID, phase timings, kết quả và lỗi |
| `GET` | `/api/history` | Xem lịch sử các lần tối ưu (hỗ trợ lọc theo domain) |
| `GET` | `/api/history/stats` | Thống kê KPI: lượt chạy, điểm tăng trung bình, top model |
| `DELETE` | `/api/history/{id}` | Xóa một bản ghi lịch sử cụ thể |
| `DELETE` | `/api/history` | Xóa toàn bộ lịch sử |
| `GET` | `/api/settings` | Lấy trạng thái API key (che dấu) và model mặc định |
| `POST` | `/api/settings/apikey` | Cập nhật OpenRouter API Key an toàn phía server |
| `POST` | `/api/settings/test-connection` | Gửi `hi` tới model chính, fallback Laguna nếu cần |

### SSE event contract

`POST /api/optimize/stream` trả về `text/event-stream`. Các event chính:

- `request_id`: `{ "request_id": "..." }`
- `phase`: `{ "phase": "draft", "status": "started" }`
- `phase`: `{ "phase": "draft", "status": "completed", "duration_ms": 1234 }`
- `phase`: `{ "phase": "critic", "status": "skipped", "duration_ms": 0 }`
- `result`: toàn bộ `OptimizeResponse`, gồm `telemetry.request_id` và danh sách phase timings.
- `error`: `{ "message": "...", "request_id": "..." }`

Quality mode stream theo thứ tự `skill_loading → draft → critic → refinement → execution`. Fast mode đánh dấu `critic` và `refinement` là `skipped`.

## 🧩 6. Skill model và compiler

Skill được chuẩn hóa qua `SkillManifest` trong `backend/models/skill_model.py`, gồm:

- `version`, `source`, `domain_id`, `template_id` và content hash.
- `routing`: keywords, domain, template, priority, minimum confidence.
- `safety`: rules, red flags và disclaimer bắt buộc.
- `output`: format, sections và required fields.
- `constraints`: `must`, `should`, `must_not`.
- `relations`: `requires`, `conflicts`.
- `budget`: giới hạn context/instruction tokens.

`SkillRegistry` vẫn tương thích với `backend/data/domains/*.json` và `.github/skills/*/SKILL.md`. `SkillCompiler` validate, chọn skill deterministic, gắn confidence và cắt context theo ngân sách trước khi gửi vào system message của model.
