# Rà soát Text-Editor — 1.2.0

Ngày kiểm tra: 07/10/2026. Mốc trước sửa: `b6f914c425f9dc21b8f06b260b1776afe41001fb`.

## Các lỗi đã tái hiện và sửa

| Mức | Trước sửa | Sau sửa |
| --- | --- | --- |
| Cao | `textarea` rộng hơn màn hình 32px vì `width:100%` cộng padding; phần bên phải bị cắt. | `border-box` toàn giao diện; đo biên vùng nhập trên cả 7 kích thước. |
| Cao | Input, keyup, click, select đều đếm lại toàn bộ chữ/từ/dòng; `btnCopy` dựng SVG lại liên tục. | Cache thống kê, gom cập nhật bằng requestAnimationFrame, chỉ đổi DOM khi cần; đếm văn bản >100.000 ký tự bằng Worker, bỏ kết quả cũ. |
| Cao | Mỗi lần lưu ghi toàn bộ notes + snapshots bằng JSON vào localStorage; lịch sử dễ nhân nhiều lần dung lượng văn bản. | IndexedDB với giao dịch notes/meta, chỉ ghi note thay đổi và lịch sử khi lịch sử đổi; debounce 600ms, flush lúc ẩn/rời trang; giới hạn lịch sử. |
| Cao | Nhãn “Đã lưu” chạy theo bộ hẹn giờ, không phụ thuộc kết quả lưu; Ctrl/Cmd+S chỉ báo toast. | Nhãn chỉ hiện sau commit thành công, lỗi hiện “Chưa lưu”; phím tắt thực sự gọi lưu. Chuyển dữ liệu thất bại vẫn giữ bản localStorage. |
| Cao | “Thay tất cả” chỉ thay tối đa 500 lần và nối lại toàn chuỗi mỗi lần; lower-case có thể làm sai offset Unicode. | Tìm literal bằng RegExp trên văn bản gốc, không giới hạn 500; ghép các phần một lượt. Đã kiểm tra 1.200 kết quả và Undo. |
| Vừa | Bộ lọc ghi chú xóa/dựng lại cả dialog cùng input mỗi ký tự, làm gián đoạn focus/IME và chạy lại animation. | Giữ input, debounce 120ms, chỉ thay danh sách kết quả; chờ composition kết thúc. Đổi cài đặt không chạy lại hiệu ứng mở popup. |
| Vừa | Spellcheck bị `paintChrome()` bật lại dù `tuneInput()` đã tắt cho đoạn dài. | Không ghi đè; tắt spellcheck/autocorrect cho code và văn bản lớn/chuỗi dài. |
| Vừa | Nút iPad vẫn 44px, các nút phụ 36/40px; dialog thiếu quản lý focus; chấm đóng 12px. | Nút chính iPad 56px, phụ ít nhất 44px; modal chặn focus nền và giữ Tab bên trong; một nút đóng 44px, hai chấm còn lại là trang trí. |
| Vừa | Phép đếm ngoặc chặn xuất JS hợp lệ có comment/regex/template; XML lỗi vẫn qua nếu chứa `<plist`. | Cho xuất bản nháp JS/CSS/HTML; JSON dùng JSON.parse, plist dùng DOMParser để kiểm tra XML. |
| Vừa | URL hash lỗi percent-encoding làm boot dừng; văn bản dài gửi Shortcut vẫn mở dù copy thất bại. | Bắt lỗi decode, boot tiếp; copy văn bản dài thất bại thì giữ popup và báo chưa mở Shortcut. |

## Phép đo

Chromium headless, cùng máy và cùng dữ liệu `"alpha beta gamma\n".repeat(65536)` = 1.114.112 ký tự.
Đo riêng thời gian thực thi handler bằng `performance.now()`; không bao gồm bố trí/paint textarea, bàn phím hệ điều hành hay tốc độ thiết bị thật.

| Công việc | Trước | Sau |
| --- | ---: | ---: |
| Một input event | 86,7ms | 0,2ms |
| 30 lượt đổi caret + keyup | 690ms | 0,1ms |

Thống kê sau khi gõ được cập nhật sau 120ms ngừng gõ; văn bản lớn được đếm ở Worker. Phép đo handler không phải tuyên bố FPS hay cam kết tốc độ trên mọi iPad.

## Xác minh

`npm test`: 10 nhóm kiểm tra Chromium thật, bao gồm:

1. Chuyển notes/settings/history cũ, nhận Unicode từ URL, reload.
2. Công cụ trên vùng chọn, native Undo/Redo, ngoặc, Tab/Shift+Tab, thụt đầu dòng, khôi phục lịch sử.
3. Literal find/replace 1.200 kết quả và Unicode trước kết quả.
4. Lọc ghi chú giữ nguyên input/focus; mở và tạo ghi chú.
5. Nội dung/tên file JS tải xuống; JSON/XML lỗi không xuất.
6. Lưu thất bại không báo “Đã lưu”; hash lỗi không làm app chết.
7. Migration lỗi giữ dữ liệu gốc; visibilitychange flush dữ liệu đang sửa.
8. Clipboard lỗi không mở Shortcut với văn bản dài.
9. Handler trên 1,1 triệu ký tự, spellcheck; lưu/reload 6MiB qua IndexedDB.
10. Bố cục/focus trên 390×844, 320×568, 820×1180, 1180×820, 600×1000, 667×375 và cửa sổ thấp 390×300.

Đã xem ảnh render điện thoại nhỏ, iPad và cửa sổ thấp. `node --check` cho các file JS và `git diff --check` đều đạt.

## Giới hạn còn lại

- Chưa thử trực tiếp Safari/iPhone/iPad thật, bàn phím tiếng Việt của iOS hay share sheet/Shortcut của iOS. Cửa sổ 390×300 là kiểm tra bố cục khi chiều cao giảm, không giả lập đầy đủ visualViewport/safe-area/animation bàn phím Safari.
- Textarea vẫn là bộ soạn thảo native; tài liệu rất lớn còn có thể chậm do wrap/layout của trình duyệt. JSON/Base64/sắp xếp/tìm kiếm lớn vẫn chạy khi người dùng chủ động gọi công cụ.
- IndexedDB vẫn thuộc bộ nhớ của trình duyệt. App báo lỗi ghi, nhưng không bảo đảm lưu được nếu hệ điều hành đóng tiến trình giữa giao dịch.
- Undo/Redo dùng lịch sử native trong phiên; lịch sử phiên bản lưu qua reload. App hiện chưa có service worker cho mở offline; đợt này tập trung soạn thảo và UI.
