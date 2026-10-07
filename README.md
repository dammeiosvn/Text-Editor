# Quick Text Editor Pro

[Site tĩnh cho GitHub Pages:](https://dammeiosvn.github.io/Text-Editor/) 

Thêm vào màn hình chính iOS bằng Safari, rồi dùng để soạn chữ và gửi sang Phím tắt.

Phím tắt đổ chữ vào app:

```
https://dammeiosvn.github.io/Text-Editor/?text=Nội%20dung
```

Cũng nhận `?input=` và `?content=`.

Gửi ngược lại bằng nút máy bay. Văn bản dài được copy vào Clipboard rồi mở Phím tắt, không nhét hết vào URL.

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
