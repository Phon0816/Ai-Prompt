---
name: pm-ui-components
description: Mẫu giao diện và trạng thái cho các màn hình riêng của AI-Prompt-Manager: chọn lĩnh vực và template, ô nhập prompt thô, builder 6 nhóm (vai trò, bối cảnh, nhiệm vụ, ràng buộc, định dạng, safety guardrail), bảng điểm rubric, luồng Generator–Critic, khung phản hồi AI, lịch sử, cài đặt API key OpenRouter và model mặc định. Dùng khi thêm hoặc sửa bất kỳ component, trang React nào thuộc các màn này, hoặc khi xử lý loading, lỗi, trạng thái trống, streaming.
---

# Component của AI-Prompt-Manager

Dùng cùng `pm-design-tokens` (màu, chữ, bo góc). Chuỗi giao diện tiếng Việt, giọng và câu mẫu ở `references/microcopy-vi.md` (đọc khi viết chữ hiển thị).

## Trước khi code

- Đọc `src/` để map **vai trò → file thật**. Tên dưới đây là theo vai trò, repo có thể gọi khác. Có component làm đúng việc rồi thì sửa nó, không tạo bản trùng.
- Mobile-first: một cột dưới 768px (builder và preview thành tab), từ 1024px hai cột (nhập + xây | kết quả).
- Mỗi màn hình có đúng **một** nút brand đặc (hành động chính). Còn lại là nút viền/chữ.

## Ba nguyên tắc xuyên suốt

1. **Không bao giờ hiện nội dung AI giả, mô phỏng hay placeholder như thể là câu trả lời.** Hệ thống chỉ trả lời bằng model cloud qua OpenRouter (đã bỏ Local Offline Engine). Thiếu key hoặc lỗi thì hiện trạng thái lỗi có hành động tiếp theo, không "gợi ý tạm".
2. **Output của model là dữ liệu không tin cậy.** Render markdown qua thư viện có sanitize; không `dangerouslySetInnerHTML` với chuỗi từ model.
3. **Mọi lần gọi model đều dừng được.** Có `AbortController`, nút Dừng, chống bấm đúp, trạng thái đang chạy rõ ràng. Vòng Critic không tự lặp.

## Bản đồ màn hình

| Vai trò | Làm | Tránh |
|---|---|---|
| **Chọn lĩnh vực + template** | Chọn lĩnh vực trước, template lọc theo lĩnh vực. Chip lĩnh vực dùng `data-hue` theo hash id (lĩnh vực sẽ tăng thêm). Sau khi người dùng nhập, hiện **skill được tự chọn + lý do một dòng + cách đổi tay**. | Gắn màu cứng theo tên "IT"/"Y tế". Tự chọn skill mà không cho người dùng thấy. |
| **Ô nhập prompt thô** | Textarea tự giãn, font sans (đây là ngôn ngữ tự nhiên, không phải code), `Ctrl/⌘+Enter` để chấm điểm, giữ nháp khi đổi tab. | Font mono cho prompt thô. |
| **Prompt Meter** (điểm nhấn duy nhất của giao diện) | Thanh 6 ô khớp 6 nhóm + điểm tổng. Ô đầy = nhóm đủ. Mỗi ô có icon và `aria-label` tên nhóm; điểm hiện bằng số + nhãn chữ. | Chỉ dùng màu để báo đủ/thiếu. Thêm hiệu ứng cho các khối khác (giữ yên để Meter nổi). |
| **Builder 6 nhóm** | Thứ tự cố định: Vai trò chuyên gia → Bối cảnh & thuật ngữ → Nhiệm vụ → Ràng buộc kỹ thuật → Định dạng đầu ra → Safety guardrail. Đánh số **vì thứ tự này là thứ tự ghép prompt**. Mỗi nhóm là accordion, mobile mặc định gập nhóm đã đủ; có nhãn nguồn "Tự động" / "Bạn đã sửa" và nút "Khôi phục gợi ý". Safety: vạch trái `--safety-line`, icon khiên, mặc định không cho xoá hẳn; nếu cho tắt thì phải xác nhận rõ. | Đánh số cho thứ khác không tuần tự. Tô sáu màu khác nhau cho sáu nhóm (nhiễu, và màu cam đào đã dành riêng cho safety). |
| **Prompt ghép (preview)** | Khung `--bg-sunken`, chữ sans, nhãn nhỏ ở ranh giới mỗi nhóm, nút Sao chép. Chỉ khối code bên trong prompt mới dùng mono. | Hiện prompt cuối dưới dạng một bức tường chữ không phân nhóm. |
| **Bảng điểm rubric** | Mỗi tiêu chí: tên, điểm/tối đa, một dòng lý do, nút "Sửa chỗ này" nhảy tới nhóm liên quan. Cập nhật điểm dùng vùng `aria-live="polite"`. | Đèn giao thông đỏ/vàng/xanh. Chỉ hiện tổng điểm không lý do. |
| **Generator–Critic** | Hai giọng phân biệt bằng nhãn + icon + căn lề (Generator trái, nền `--brand-tint`; Critic phải, nền `--bg-sunken`), không chỉ bằng màu. Ghi "Vòng n", model đã dùng cho mỗi lượt. Mỗi nhận xét của Critic có nút "Áp dụng" → cập nhật builder và đánh dấu phần thay đổi một lần. Có nút Dừng. | Tự chạy vòng tiếp theo. Dùng chat bubble đồ chơi cho nội dung chuyên môn dài. |
| **Khung phản hồi AI** | Streaming nếu backend hỗ trợ (kiểm tra trước); nếu không, skeleton + bộ đếm giây. Chip meta: model (mono), thời gian `2,4 s` (`Intl` vi-VN), lĩnh vực. Nút Sao chép, Lưu. Với lĩnh vực có guardrail y tế: dải lưu ý cố định phía trên, giọng trung tính, không emoji. | Cắt cụt câu trả lời dài bằng `overflow:hidden`. |
| **Lịch sử** | Từ 768px là bảng (thời gian, lĩnh vực, template, điểm, model, thời lượng); dưới đó là danh sách thẻ. Lọc theo lĩnh vực/model. Mở lại = khôi phục đủ prompt thô, prompt đã xây, câu trả lời. Xoá có xác nhận và hoàn tác. | Bảng ngang phải cuộn trên điện thoại. |
| **Cài đặt: API key + model** | Key: `type="password"`, `autocomplete="off"`, sau khi lưu chỉ hiện `••••` + 4 ký tự cuối, xoá giá trị khỏi state, có nút "Kiểm tra kết nối". Model: combobox có tìm kiếm, id hiện bằng mono, badge "Mặc định", đủ trạng thái tải/lỗi/trống của danh sách. | Nhận lại key đầy đủ từ API rồi che bằng CSS. Nếu backend đang trả key đầy đủ về client, **báo lại cho người dùng**, đừng vá bằng giao diện. |

## Mọi lần gọi model: ma trận trạng thái

Map theo **mã lỗi backend trả về**, không đoán chuỗi message. Các mã dưới đây là mã của OpenRouter; xác nhận backend có chuyển chúng nguyên vẹn không.

| Tình huống | Hiển thị |
|---|---|
| Chưa có API key | Trạng thái chặn + nút "Thêm API key" → Cài đặt. Không cho gửi. |
| 401 | Key không hợp lệ hoặc đã bị tắt → mở Cài đặt. |
| 402 | Tài khoản OpenRouter hết credit → hướng dẫn nạp, giữ nguyên prompt. |
| 403 | Model từ chối vì nội dung bị kiểm duyệt → cho sửa prompt hoặc đổi model. |
| 408 / mất mạng | Hết thời gian chờ → nút thử lại + gợi ý model nhanh hơn. |
| 429 | Đếm ngược theo `Retry-After` nếu backend chuyển tiếp; nút thử lại tắt đến khi hết. |
| 502 / 503 | Model đang lỗi hoặc không có nhà cung cấp phù hợp → mở nhanh combobox đổi model. |
| Lỗi giữa luồng stream (HTTP 200 nhưng lỗi nằm trong dữ liệu) | Giữ phần đã nhận, gắn nhãn "Bị ngắt giữa chừng", cho thử lại. |

Lỗi nói rõ chuyện gì đã xảy ra và làm gì tiếp, không xin lỗi dài, không đùa (nhất là lĩnh vực y tế).

## Giữ cho không "giống mẫu AI"

- Không rải thẻ giống hệt nhau cho mọi thứ; thẻ chỉ dùng khi nội dung thực sự là một đơn vị độc lập.
- Không nhãn IN HOA phía trên mỗi tiêu đề, không gradient trang trí, không `→` gắn cuối mọi nút.
- Trạng thái trống luôn có một hành động cụ thể ("Chọn lĩnh vực để bắt đầu"), không chỉ hình minh hoạ.
