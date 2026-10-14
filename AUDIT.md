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

## Cập nhật 1.2.1 — 07/10/2026

- Danh mục tiếng Việt tăng từ 16 lên 132 key. Có 126 key dùng trong runtime/HTML; 6 key tương thích/nhãn dự phòng vẫn được giữ. Hai danh mục VI/EN khớp toàn bộ key và placeholder.
- Giao diện đã đọc `Language/vi-VN.json`, gồm chuỗi tĩnh, popup, lỗi và thống kê. Có fallback sinh tự động từ JSON; kiểm tra fallback giống nguồn, sửa JSON tác động giao diện và bản dịch được escape khi đưa vào HTML.
- Theo yêu cầu mới, thay toàn bộ luồng gửi Phím tắt bằng `shortcuts://run-shortcut?name=...&input=text&text=...`. Bỏ ngưỡng 1.800 ký tự và bỏ việc copy trước khi gọi; văn bản dài cũng truyền nguyên văn qua URL. Thông tin và README đã được sửa theo luồng này.
- Kiểm tra tại ranh giới điều hướng OS: tên mặc định/tên tự nhập/Enter, tiếng Việt/emoji/ký tự URL/xuống dòng/văn bản dài đều giải mã đúng và không gọi clipboard. Chưa xác minh việc nhận trên ứng dụng Shortcuts của iOS thật.
- Bộ kiểm tra hiện có 13 nhóm (11 nhóm trình duyệt, 2 nhóm danh mục). Nhóm kiểm tra Clipboard thất bại của bản 1.2.0 được thay bằng kiểm tra đầu vào Văn bản.

## Cập nhật 1.2.2 — 14/10/2026: bàn phím và luồng nhập

Mốc trước sửa: `f480efdb6c78fab7e19991714c0504f74603381d`.

### Lỗi xác minh được trong code và trình duyệt

| Trước sửa | Sau sửa |
| --- | --- |
| `tuneInput()` gán lại ba thuộc tính sau 120ms ngừng gõ, kể cả giá trị không đổi; vượt 80 ký tự liền nhau còn đổi cấu hình tự viết hoa khi ô vẫn focus. | Giữ cấu hình tự sửa/viết hoa trong phiên focus, chỉ gán attribute thực sự khác khi ô chưa focus. Đổi chế độ code là thao tác chủ động, cấu hình trước khi focus lại. |
| `.autocorrect = "off"` được property boolean hiểu là `true`; kiểm tra thực tế thấy attribute vẫn là `on` ở chế độ code. | Dùng `setAttribute("autocorrect", "off")`, kiểm tra attribute và property boolean trên cả hai engine. Tham chiếu [chuẩn HTML về autocorrect](https://html.spec.whatwg.org/multipage/interaction.html#dom-autocorrect). |
| Handler cuộn gọi `scrollTo(0, 0)` liên tục. 20 lượt sự kiện mô phỏng bàn phím tạo 21 lệnh ép cuộn. | Gom đồng bộ bằng requestAnimationFrame, cập nhật chiều cao và offset visualViewport; cùng phép thử có 0 lệnh ép cuộn và giữ focus. |
| Chế độ code trừ 1px từ cỡ chữ thấp nhất 16px, còn 15px. | Cỡ chữ code không dưới 16px để giảm khả năng Safari zoom ô nhập. |
| Chỉ kiểm tra `isComposing` trong một phần handler; phím tắt Ctrl/Cmd+F, Enter ở tên ghi chú/Phím tắt/tìm kiếm và trạng thái IME không gắn cờ vẫn chạy lệnh. | Theo dõi compositionstart/end/blur, kiểm tra thêm keyCode 229 và Process; bỏ xử lý lệnh khi đang ghép chữ, tiếp tục cập nhật thống kê sau compositionend. |
| Lượt lọc ghi chú đã hẹn trước compositionstart vẫn chạy giữa lúc đang ghép chữ. | Hủy lượt lọc đang chờ và kiểm tra lại trạng thái composition trước khi render. |
| Focus ô tên/ghi chú mới bị trì hoãn bằng setTimeout; có thể ra khỏi thao tác mở bàn phím được iOS cho phép. | Focus đồng bộ trong thao tác tạo/đổi tên; bỏ việc khôi phục focus trung gian khi công cụ quay lại editor. |
| Nút ngoặc thay toàn bộ vùng chọn bằng cặp ngoặc rỗng; bấm nút có thể làm mất rồi lấy lại focus. | Bọc nguyên vùng chọn, giữ selection bên trong và giữ focus khi bấm các nút soạn thảo. |

### Phạm vi kiểm tra

- 8 nhóm hồi quy mới đều thất bại trên bản 1.2.1 trong Chromium trước khi sửa.
- Bản 1.2.2 đạt **21/21 trên Chromium và 21/21 trên WebKit**: 19 nhóm trình duyệt, 2 nhóm danh mục ngôn ngữ. Các luồng cũ lưu/reload, chuyển ghi chú, Undo/Redo, tìm/thay, xuất tệp, lịch sử, đầu vào Phím tắt và lỗi lưu vẫn đạt.
- Kiểm tra mới dùng cửa sổ 390×844, touch/mobile; quan sát mutation của thuộc tính nhập, focus, selection và lệnh scrollTo; có ghép dấu, keyCode 229, gõ chữ/số/ký tự và dán hơn 100.000 ký tự. Nút soạn thảo được thử cả touch tap và mouse click; chỉ chặn `mousedown` để giữ focus bằng chuột, không chặn `pointerdown`/touch để WebKit vẫn phát click.
- Dán dữ liệu lớn chỉ tắt `spellcheck` một lần trước khi chèn để tránh kiểm tra chính tả nặng; không thay `autocorrect`, `autocapitalize` hay `inputmode` lúc dán. Cấu hình nặng/nhẹ được áp dụng khi rời ô nhập. Không ghi bẩn lại khi nội dung không thay đổi.
- Đã xem ảnh WebKit trên khung điện thoại và cửa sổ thấp 390×300; kiểm tra 7 kích thước điện thoại/iPad/cửa sổ hẹp. Kiểm tra cú pháp JavaScript và `git diff --check` đạt.
- Tăng phiên bản/cache URL lên 1.2.2 để tải bộ JS/CSS mới sau khi cập nhật trang.

### Giới hạn và thử trên iPhone

Chưa tái hiện trực tiếp nút **123 / #+= / ABC** trên bàn phím hệ thống iOS. Các lỗi ứng dụng phía trên đã tái hiện và sửa, nhưng liên hệ giữa chúng và triệu chứng kẹt bàn phím trên thiết bị của người dùng vẫn cần xác nhận bằng thiết bị thật. WebKit Linux và sự kiện composition/viewport mô phỏng không phải bàn phím iOS.

Văn bản nhiều MiB vẫn có thể tốn thời gian bố trí/wrap trong textarea native; nhóm kiểm tra 6MiB lưu/reload hoàn thành ở cả hai engine nhưng chậm hơn rõ rệt trên WebKit. Chi phí handler không đo toàn bộ thời gian trình duyệt hay bàn phím hệ điều hành.

Sau khi bản sửa được cập nhật lên GitHub Pages, thử trong Safari và WebClip màn hình chính:

1. Gõ tiếng Việt, đổi ABC → 123 → #+= → ABC nhiều lần khi đang nhập; làm ở cả chế độ chữ và code.
2. Thử ô tìm kiếm, tên ghi chú và tên Phím tắt; ghép dấu rồi Enter, bảo đảm chỉ gửi/chạy lệnh bằng Enter sau khi đã ghép xong.
3. Dán chuỗi Base64 dài, đổi bàn phím và tiếp tục gõ; đóng/mở bàn phím, xoay máy, chuyển ứng dụng rồi quay lại.
4. Chọn một đoạn chữ, bấm ngoặc/Tab/Undo/Redo; kiểm tra nội dung, vùng chọn và bàn phím.
5. Mở lại WebClip, kiểm tra mục thông tin hiển thị 1.2.2 và nội dung vừa nhập vẫn còn sau reload.
