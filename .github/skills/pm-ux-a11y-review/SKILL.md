---
name: pm-ux-a11y-review
description: Quy trình tự kiểm tra và tự phản biện giao diện AI-Prompt-Manager trước khi báo hoàn thành — tương phản, bàn phím, mobile, tiếng Việt, trạng thái lỗi/trống, bảo mật hiển thị. Dùng khi vừa làm xong một thay đổi frontend, khi review diff/PR giao diện, hoặc khi người dùng nói "kiểm tra", "review", "đánh giá UI/UX", "có ổn chưa", "accessibility", "dễ dùng chưa".
---

# Tự kiểm tra giao diện

Chạy khi một thay đổi frontend sắp được báo xong. Chỉ duyệt các mục **liên quan tới diff**, đừng kiểm tra cả app.

## Quy trình

1. **Chạy script tương phản** nếu có đụng tới màu:
   `python .github/skills/pm-design-tokens/scripts/check_contrast.py src/styles/tokens.css` (phải `ĐẠT TẤT CẢ`).
2. **Duyệt checklist** bên dưới, chỉ các mục liên quan.
3. **Tự phản biện:** viết ra 3 điểm yếu thật của chính thay đổi này, như một người review khó tính sẽ nêu. Sửa những điểm sửa được; điểm không sửa được thì ghi vào báo cáo. Không viết điểm yếu cho đủ số (nếu thật sự không có, nói "không thấy thêm" kèm lý do đã kiểm tra những gì).
4. **Báo cáo ≤ 10 dòng:** Đã đạt / Đã sửa trong lúc review / Còn rủi ro.

## Câu hỏi tự phản biện (chọn câu hợp với thay đổi)

- Bỏ hết màu đi, người dùng còn hiểu trạng thái này không? (đủ/thiếu, Generator/Critic, lỗi/ổn)
- Một bạn 17 tuổi dùng điện thoại ngoài nắng có đọc được dòng nhỏ nhất không?
- Chỗ nào nhìn như mẫu AI mặc định (thẻ giống hệt nhau, gradient, nhãn IN HOA)?
- Có chỗ nào gọi model mà người dùng không dừng được, hoặc bấm hai lần sẽ gửi hai lần?
- Có hex/rgb nằm ngoài tokens.css, hoặc một token bị tạo trùng không?
- Chuỗi dài nhất (tiếng Việt, có dấu) có làm vỡ bố cục không?
- Nếu model/OpenRouter lỗi thì màn này hiện gì? Có chỗ nào đang hiện nội dung giả thay vì lỗi không?

## Checklist

**Hình ảnh**
- Chỉ dùng `var(--...)`; chữ không dưới 4.5:1; chữ chính không phải đen thuần trên trắng thuần.
- Một nút brand đặc mỗi màn; bo góc đúng cấp; bóng nhẹ, không viền đậm tách khối.
- Điểm/trạng thái không dùng đèn giao thông; màu cam đào chỉ cho safety.

**Bàn phím và trình đọc màn hình**
- Tab đi theo thứ tự đọc; `:focus-visible` thấy rõ; không bẫy focus (trừ modal có thoát bằng Esc).
- Nút chỉ có icon có `aria-label`; input có `<label>`.
- Kết quả bất đồng bộ (điểm mới, lỗi, câu trả lời xong) báo qua `aria-live` hoặc `role="status"`/`role="alert"`.
- Không có thông tin chỉ truyền đạt bằng màu.

**Mobile và tiếng Việt**
- Kiểm tra ở 360px, 768px, 1280px; phóng 200% không cuộn ngang.
- Vùng chạm ≥44px; ô nhập ≥16px.
- Font nạp đủ dấu; `lang="vi"`; không uppercase; `line-height` không chặt hơn mức trong tokens.
- Số và ngày dùng `Intl` vi-VN.

**Trạng thái**
- Có đủ: đang tải, trống (kèm hành động), lỗi (theo ma trận trong `pm-ui-components`), bị ngắt giữa stream.
- Hành động phá huỷ (xoá lịch sử, xoá key) có xác nhận hoặc hoàn tác.

**An toàn hiển thị**
- Output model đi qua sanitize; không `dangerouslySetInnerHTML` với dữ liệu từ model.
- API key chỉ ở dạng che; không `console.log` key, không đưa key vào URL.
- Lĩnh vực y tế: có dải lưu ý, giọng trung tính, không emoji.

## Khi không chắc

Nếu không chạy được app để nhìn thật, nói rõ "chưa kiểm tra bằng mắt" thay vì khẳng định đạt. Script tương phản và đọc code chứng minh được token và cấu trúc, không chứng minh được bố cục.
