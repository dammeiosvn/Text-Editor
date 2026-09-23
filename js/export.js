/* =========================================
   Quick Text Editor Pro - Export & Integration
   Xuất file, Chia sẻ, Tương tác Shortcut và Cài đặt
========================================= */

document.addEventListener('DOMContentLoaded', () => {
    const editor = document.getElementById('mainEditor');
    const exportSheet = document.getElementById('exportActionSheet');

    // ----------------------------------------------------
    // 1. NÚT CÀI ĐẶT (GÓC TRÁI HEADER) - Cấu hình Phím tắt
    // ----------------------------------------------------
    const btnSettings = document.getElementById('btnSettings');
    if (btnSettings) {
        btnSettings.addEventListener('click', () => {
            if (navigator.vibrate) navigator.vibrate(50);
            
            let currentName = localStorage.getItem('targetShortcutName') || "";
            let newName = prompt("⚙️ CÀI ĐẶT WEBCLIP\n\nNhập tên Phím tắt trên máy mà sếp muốn gửi văn bản đến (Ví dụ: Luu Code, Dich Thuat...):", currentName);
            
            if (newName !== null) {
                if (newName.trim() === "") {
                    localStorage.removeItem('targetShortcutName');
                    alert("Đã xóa liên kết Phím tắt.");
                } else {
                    localStorage.setItem('targetShortcutName', newName.trim());
                    alert("Đã cập nhật Phím tắt đích thành:\n" + newName.trim());
                }
            }
        });
    }

    // ----------------------------------------------------
    // 2. NÚT GỬI VỀ PHÍM TẮT (SHORTCUT INTEGRATION)
    // ----------------------------------------------------
    const btnReturn = document.getElementById('btnReturn');
    if (btnReturn) {
        btnReturn.addEventListener('click', () => {
            const text = editor.value;
            
            // Backup 1: Tự động copy vào bộ nhớ tạm
            navigator.clipboard.writeText(text);
            if (navigator.vibrate) navigator.vibrate(50);
            
            // Kiểm tra xem đã cấu hình tên Phím tắt chưa
            let shortcutName = localStorage.getItem('targetShortcutName');
            if (!shortcutName) {
                shortcutName = prompt("Sếp chưa cài đặt Phím tắt đích!\nNhập tên Phím tắt sếp muốn gửi văn bản đến:");
                if (shortcutName && shortcutName.trim() !== "") {
                    localStorage.setItem('targetShortcutName', shortcutName.trim());
                } else {
                    window.location.href = "shortcuts://"; 
                    return;
                }
            }
            
            const encodedText = encodeURIComponent(text);
            const encodedName = encodeURIComponent(shortcutName.trim());
            
            window.location.href = `shortcuts://run-shortcut?name=${encodedName}&input=text&text=${encodedText}`;
        });
    }

    // ----------------------------------------------------
    // 3. NÚT COPY (Có hiệu ứng nháy xanh)
    // ----------------------------------------------------
    const btnCopy = document.getElementById('btnCopy');
    if (btnCopy) {
        btnCopy.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(editor.value);
                if (navigator.vibrate) navigator.vibrate(50);
                
                const originalIcon = btnCopy.innerHTML;
                btnCopy.style.backgroundColor = '#34c759';
                btnCopy.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
                
                setTimeout(() => {
                    btnCopy.style.backgroundColor = '';
                    btnCopy.innerHTML = originalIcon;
                }, 1500);
            } catch (err) {
                alert('Lỗi sao chép: ' + err);
            }
        });
    }

    // ----------------------------------------------------
    // 4. NÚT CHIA SẺ (SHARE API)
    // ----------------------------------------------------
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

    // ----------------------------------------------------
    // 5. CHỨC NĂNG XUẤT FILE (Cập nhật: Cho phép nhập tên file)
    // ----------------------------------------------------
    const exportOptions = document.querySelectorAll('.export-option');
    exportOptions.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const ext = e.target.getAttribute('data-ext');
            if (!ext) return;

            // Ẩn bảng chọn đi trước khi hiện Popup
            exportSheet.classList.add('hidden');

            // Hiện popup hỏi tên file
            let customName = prompt(`Nhập tên file để xuất (không cần gõ đuôi ${ext}):`, "Tai_Lieu_Moi");
            
            // Nếu bấm Hủy (Cancel) thì thoát
            if (customName === null) return;
            
            // Xử lý khoảng trắng thừa
            customName = customName.trim();
            if (customName === "") customName = "Untitled";
            
            // Tránh việc sếp gõ nhầm cả đuôi file vào (VD: "code.json" sẽ bị thành "code.json.json")
            if (customName.endsWith(ext)) {
                customName = customName.slice(0, -ext.length);
            }

            const fileName = `${customName}${ext}`;
            const text = editor.value;
            const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
            
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href);
        });
    });
});