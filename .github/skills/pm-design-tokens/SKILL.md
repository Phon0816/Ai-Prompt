---
name: pm-design-tokens
description: Hệ design token giao diện SÁNG, tương phản dịu, hợp giới trẻ cho frontend React/Vite của AI-Prompt-Manager. Dùng mỗi khi tạo hoặc sửa màu, font, cỡ chữ, khoảng cách, bo góc, bóng, animation, theme, CSS hay Tailwind — kể cả khi người dùng chỉ nói "làm đẹp hơn", "đổi màu", "nhìn chói/nhạt quá", "chỉnh giao diện". Không dùng cho backend FastAPI.
---

# Token giao diện: sáng, dịu, trẻ

Nguồn sự thật duy nhất: `assets/tokens.css`. Nếu repo đã có file token/CSS biến, **grep trước, hợp nhất vào đó**, không tạo bản thứ hai. Nếu chưa có, copy file này vào `src/styles/tokens.css` và import ở entry (`main.tsx`).

## Quy tắc (kèm lý do)

1. **Chỉ dùng `var(--...)` trong component.** Không viết hex/rgb trực tiếp. Lý do: đổi giao diện ở một chỗ, và script kiểm tra chỉ nhìn được token.
2. **Chỉ giao diện sáng** (`color-scheme: light`). Không tự thêm dark mode; người dùng chưa yêu cầu và nó nhân đôi việc kiểm tra tương phản.
3. **Dịu nhưng không mờ.** Chữ có 3 bậc: `--ink-1` (thân bài, tiêu đề, ~10–11:1), `--ink-2` (mô tả, ~6:1), `--ink-3` (meta, placeholder, ≥4.5:1). Cấm `#000`/`#fff` làm chữ hoặc nền. Không có chữ nào dưới 4.5:1 (trừ disabled). Lý do: người trẻ đọc chủ yếu trên điện thoại, nhiều khi ngoài nắng; "dịu" đến từ bỏ độ gắt 21:1, không phải từ giảm xuống dưới ngưỡng đọc được.
4. **Tách lớp bằng độ sáng nền + bóng nhẹ, không bằng viền đậm.** Ngoại lệ bắt buộc: ô nhập, checkbox, toggle dùng `--line-control` (≥3:1) vì người dùng phải nhận ra ranh giới của control. `--line-soft` chỉ là trang trí.
5. **Mỗi màu một nghĩa, đừng mượn:** `--brand*` = hành động; `--hue-*` = nhận diện lĩnh vực; `--safety-*` = guardrail an toàn; `--ok-*`/`--err-*` = trạng thái. Điểm rubric **không** dùng đèn giao thông đỏ/vàng/xanh (người mù màu không phân biệt được, và đỏ nghĩa là lỗi): dùng một màu brand + nhãn chữ + icon.
6. **Chữ trên nền pastel luôn đi theo cặp** `--x-ink` trên `--x-bg`. Nút đặc = `--brand` + `--on-brand`. Không tự ghép chữ brand lên nền tint khác.
7. **Font:** Be Vietnam Pro cho giao diện, JetBrains Mono chỉ cho code, id model, API key đã che. Tiếng Việt: thân bài `line-height` ≥1.5, tiêu đề ≥1.3 (dấu thanh chồng dễ bị cắt khi chặt); không `text-transform: uppercase` hay giãn chữ rộng (khó đọc dấu); ô nhập ≥16px.
8. **Bo góc theo cấp, bóng 3 cấp:** control `--r-sm`, thẻ `--r-md`, modal `--r-lg`, chip `--r-xs`. Một radius cho mọi thứ là dấu hiệu "giao diện mẫu".
9. **Chuyển động chỉ để phản hồi hành động** (hover, nhấn, mở/đóng, xác nhận), 120–200ms, dùng `--dur-*`/`--ease`. Không làm hiệu ứng vào trang cho từng khối. `prefers-reduced-motion` đã xử lý trong tokens.css, đừng ghi đè.
10. **Tailwind:** nếu repo có `tailwind.config.*` hoặc `@theme`, map token vào theme (`'ink-1': 'var(--ink-1)'`), không chép hex.

## Cài font (self-host, không CDN)

```
npm i @fontsource/be-vietnam-pro @fontsource/jetbrains-mono
```
```ts
import "@fontsource/be-vietnam-pro/400.css"; // + 500, 600, 700
import "@fontsource/jetbrains-mono/400.css";
```
Chỉ nạp các weight đang dùng. Sau khi cài, mở thử một chuỗi có dấu như "Ràng buộc kỹ thuật, ưu tiên ổn định" để chắc chắn không rơi về font hệ thống.

## Kiểm tra trước khi báo xong

```
python .github/skills/pm-design-tokens/scripts/check_contrast.py src/styles/tokens.css
```
Phải ra `ĐẠT TẤT CẢ`. Script kiểm tra cả ngưỡng tối thiểu lẫn trần "không quá gắt" của chữ chính. Khi một cặp FAIL, **sửa giá trị token**, không nới ngưỡng trong script.

## Đổi màu thương hiệu

Chỉ sửa nhóm `--brand*`, rồi chạy script. Giữ nguyên các nhóm `--ok/err/safety/hue` để ý nghĩa màu không bị lẫn.
