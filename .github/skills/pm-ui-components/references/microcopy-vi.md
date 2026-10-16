# Giọng văn giao diện (tiếng Việt)

Chỉ đọc file này khi viết hoặc sửa chữ hiển thị. Nếu repo có i18n thì đưa chuỗi vào file ngôn ngữ; nếu không, giữ chuỗi gần component, đừng rải chuỗi tiếng Việt vào logic. Tên biến, hàm, commit vẫn bằng tiếng Anh.

## Giọng

- Xưng "bạn", câu ngắn, động từ rõ: **Chấm điểm**, **Tối ưu prompt**, **Gửi đến model**, **Lưu vào lịch sử**.
- Một hành động giữ **một tên** xuyên suốt: nút "Lưu" → thông báo "Đã lưu".
- Gọi theo thứ người dùng hiểu: "Bộ kỹ năng được chọn", không "skill registry resolver".
- Thân thiện nhưng không làm màu: hạn chế emoji; dùng icon thay. **Lĩnh vực y tế, lỗi, safety: trung tính, không emoji, không đùa.**
- Viết hoa kiểu câu (chỉ chữ đầu), không IN HOA cả nhãn.

## Nhãn điểm (một hue brand + chữ)

Ngưỡng dưới đây chỉ là gợi ý. **Lấy thang thật từ rubric trong code** rồi chia lại cho khớp.

| Khoảng | Nhãn |
|---|---|
| thấp nhất | Cần bổ sung |
| trung bình | Khá ổn |
| cao | Tốt |
| gần tối đa | Rất tốt |

Dòng giải thích luôn chỉ ra việc làm tiếp: "Còn thiếu ràng buộc kỹ thuật. Thêm phiên bản hoặc môi trường chạy để câu trả lời sát hơn."

## Lỗi gọi model

| Tình huống | Tiêu đề | Gợi ý hành động |
|---|---|---|
| Chưa có key | Chưa có API key OpenRouter | Thêm key để bắt đầu |
| 401 | API key không dùng được | Kiểm tra key trong Cài đặt |
| 402 | Tài khoản OpenRouter hết credit | Nạp thêm credit rồi thử lại. Prompt của bạn vẫn được giữ |
| 403 | Model không nhận nội dung này | Sửa lại prompt hoặc chọn model khác |
| 408 | Chờ quá lâu | Thử lại hoặc chọn model nhanh hơn |
| 429 | Đang gửi quá nhanh | Thử lại sau {n} giây |
| 502 / 503 | Model đang gặp sự cố | Chọn model khác hoặc thử lại sau |
| Ngắt giữa chừng | Câu trả lời bị ngắt giữa chừng | Phần đã nhận được giữ lại. Thử lại để nhận đủ |

Không viết "Rất tiếc…", "Oops!", hay đổ lỗi cho người dùng.

## Trạng thái trống

| Màn | Câu |
|---|---|
| Chưa chọn lĩnh vực | Chọn lĩnh vực để xem template phù hợp |
| Chưa có lịch sử | Chưa có prompt nào. Tối ưu prompt đầu tiên của bạn |
| Danh sách model rỗng | Không tải được danh sách model. Thử tải lại |

## Định dạng

- Thời gian: `Intl.DateTimeFormat("vi-VN")`, thời lượng `2,4 s` (dấu phẩy thập phân) bằng `Intl.NumberFormat("vi-VN")`.
- Đặt `<html lang="vi">`.
- Nút và nhãn không được cắt chữ: chuỗi tiếng Việt thường dài hơn tiếng Anh, chừa chỗ hoặc cho xuống dòng.
