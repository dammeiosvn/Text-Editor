/* =========================================
   Quick Text Editor Pro - Export & Integration
   Xuất file, Chia sẻ, Tương tác với iOS Shortcut
========================================= */

document.addEventListener('DOMContentLoaded', () => {
    const editor = document.getElementById('mainEditor');
    const exportSheet = document.getElementById('exportActionSheet');

    // 1. Chức năng Copy (Kế thừa logic cũ sếp thích nhưng mượt hơn)
    const btnCopy = document.getElementById('btnCopy');
    if (btnCopy) {
        btnCopy.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(editor.value);
                if (navigator.vibrate) navigator.vibrate(50);
                
                // Hiệu ứng đổi icon thành dấu Tick xanh
                const originalIcon = btnCopy.innerHTML;
                btnCopy.style.backgroundColor = '#34c759';
                btnCopy.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
                
                // Trả về nút cũ sau 1.5s
                setTimeout(() => {
                    btnCopy.style.backgroundColor = '';
                    btnCopy.innerHTML = originalIcon;
                }, 1500);
            } catch (err) {
                alert('Lỗi sao chép: ' + err);
            }
        });
    }

    // 2. Chức năng Share
    const btnShare = document.getElementById('btnShare');
    if (btnShare) {
        btnShare.addEventListener('click', async () => {
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: 'Quick Text Editor Pro',
                        text: editor.value
                    });
                } catch (error) {
                    console.log('Hủy chia sẻ', error);
                }
            } else {
                alert('Trình duyệt không hỗ trợ chia sẻ API');
            }
        });
    }

    // 3. Logic Xuất File (Tạo file ảo Offline 100%)
    const exportOptions = document.querySelectorAll('.export-option');
    exportOptions.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const ext = e.target.getAttribute('data-ext');
            if (!ext) return;

            const text = editor.value;
            const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
            
            // Tự động đặt tên file kèm ngày tháng hiện tại
            const date = new Date();
            const dateStr = `${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
            const fileName = `Sentechtipsvn_${dateStr}${ext}`;

            // Tạo thẻ a ẩn để tải xuống file thông qua Share Sheet của iOS
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            
            // Dọn dẹp RAM và đóng menu
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href);
            exportSheet.classList.add('hidden');
        });
    });

    // 4. Tương tác với iOS Shortcuts
    const btnReturn = document.getElementById('btnReturn');
    if (btnReturn) {
        btnReturn.addEventListener('click', () => {
            // Lưu dữ liệu vào Clipboard trước để Shortcut có thể nhận
            navigator.clipboard.writeText(editor.value).then(() => {
                if (navigator.vibrate) navigator.vibrate(50);
                // Mở lại ứng dụng Shortcuts
                window.location.href = "shortcuts://";
            });
        });
    }
});
