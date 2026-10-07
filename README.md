# Quick Text Editor Pro

[Site tĩnh cho GitHub Pages:](https://dammeiosvn.github.io/Text-Editor/) 

Thêm vào màn hình chính iOS bằng Safari, rồi dùng để soạn chữ và gửi sang Phím tắt.

Phím tắt đổ chữ vào app:

```
https://dammeiosvn.github.io/Text-Editor/?text=Nội%20dung
```

Cũng nhận `?input=` và `?content=`.

Gửi ngược lại bằng nút máy bay. App truyền toàn bộ nội dung trực tiếp vào Phím tắt:

```text
shortcuts://run-shortcut?name=Tên_Phím_Tắt&input=text&text=Văn_bản_đã_mã_hóa_URL
```

Trong Phím tắt, dùng biến **Đầu vào phím tắt** (Shortcut Input) dưới dạng **Văn bản** để xử lý hoặc đóng gói/lưu tệp. Tên và nội dung được mã hóa URL riêng; không dùng Clipboard, không cắt nội dung dài.

[Định dạng URL theo tài liệu Apple](https://support.apple.com/guide/shortcuts/apd624386f42/ios).

## Bản 1.2.0

- Vùng nhập vừa màn hình; nút lớn hơn trên iPad, popup và thanh tìm kiếm dùng được khi cửa sổ thấp.
- Thống kê được giữ lại giữa các lần đổi con trỏ; văn bản lớn được đếm trong Web Worker.
- Ghi chú và lịch sử chuyển sang IndexedDB. Dữ liệu cũ chỉ được xóa khỏi localStorage sau khi giao dịch chuyển dữ liệu thành công.
- Tự lưu sau 600ms ngừng gõ; lưu ngay khi chuyển ứng dụng/rời trang. “Đã lưu” chỉ hiện khi giao dịch thành công; lỗi hiện “Chưa lưu”.
- Lịch sử giữ tối đa 12 bản/ghi chú, 120 bản toàn bộ và khoảng 8MiB nội dung UTF-16; vẫn giữ bản mới nhất nếu một bản vượt giới hạn đó.
- Thay tất cả không còn giới hạn 500 kết quả. Lọc ghi chú giữ nguyên ô nhập và hỗ trợ IME.
- Bấm tên để mở ghi chú, nút bút để đổi tên. Xuất JS/CSS/HTML không chặn bản nháp bằng phép đếm ngoặc; JSON và XML plist vẫn được kiểm tra.

## Kiểm thử

```sh
npm ci
npx playwright install chromium
npm test
```

Có thể dùng Chromium có sẵn qua `PLAYWRIGHT_EXECUTABLE_PATH=/đường/dẫn/chromium npm test`.
Xem [AUDIT.md](AUDIT.md) để biết lỗi đã tái hiện, phép đo và giới hạn kiểm tra.

## Bản 1.2.1 — Ngôn ngữ và Phím tắt

`Language/vi-VN.json` là nguồn chuỗi giao diện tiếng Việt: 132 key, gồm nhãn, placeholder, aria-label, thống kê có tham số, popup và thông báo lỗi. `en-GB.json` có cùng key và placeholder; ứng dụng hiện vẫn dùng tiếng Việt.

Giao diện đọc JSON khi khởi động. `js/vi-VN.js` là bản dự phòng được sinh từ JSON để giao diện vẫn mở được khi tải JSON lỗi. Khi sửa tệp tiếng Việt, chạy:

```sh
npm run build:language
npm test
```

Các test phát hiện key thiếu, placeholder không khớp và bản dự phòng chưa cập nhật. Luồng Phím tắt luôn dùng `input=text`; nút Sao chép riêng vẫn giữ chức năng sao chép.
