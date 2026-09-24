/* =========================================
   Quick Text Editor Pro - Export & Integration
   Xuất file, Chia sẻ, Tương tác Shortcut (Bản Pro)
========================================= */

// 1. DANH SÁCH PHÍM TẮT RUỘT LƯU TRÊN CLOUD (GITHUB)
// Sếp có thể thêm, sửa, xóa tên các phím tắt ở đây. Nó sẽ đồng bộ vĩnh viễn trên mọi thiết bị.
const MY_SHORTCUTS = [
    "XulyVanBan",
    "Lưu tệp",
    "Dich Thuat"
];

document.addEventListener('DOMContentLoaded', () => {
    const editor = document.getElementById('mainEditor');
    const exportSheet = document.getElementById('exportActionSheet');

    // --- NÚT CÀI ĐẶT (Thông báo cơ chế mới) ---
    const btnSettings = document.getElementById('btnSettings');
    if (btnSettings) {
        btnSettings.addEventListener('click', () => {
            if (navigator.vibrate) navigator.vibrate(50);
            alert("⚙️ CẤU HÌNH HỆ THỐNG\n\nDanh sách Phím tắt đích hiện được lưu cứng trên GitHub (file export.js) để đồng bộ vĩnh viễn trên mọi thiết bị của sếp.\n\nSếp hãy vào repo để thêm/sửa tên Phím tắt nhé!");
        });
    }

    // --- TẠO MENU CHỌN PHÍM TẮT ĐỘNG ---
    function createShortcutSheet() {
        const existing = document.getElementById('shortcutActionSheet');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'shortcutActionSheet';
        overlay.className = 'action-sheet-overlay hidden';

        let optionsHtml = '';
        MY_SHORTCUTS.forEach(name => {
            optionsHtml += `<button class="export-option shortcut-option" data-name="${name}">${name}</button>`;
        });
        optionsHtml += `<button class="export-option shortcut-option" data-name="CUSTOM">✍️ Nhập tên Phím tắt khác...</button>`;

        overlay.innerHTML = `
            <div class="action-sheet">
                <div class="action-sheet-header">Bắn dữ liệu sang Phím tắt</div>
                <div class="action-sheet-options">
                    ${optionsHtml}
                </div>
                <button class="action-sheet-cancel" id="btnCancelShortcut">Hủy</button>
            </div>
        `;
        document.body.appendChild(overlay);

        setTimeout(() => overlay.classList.remove('hidden'), 10);

        const btnCancel = overlay.querySelector('#btnCancelShortcut');
        btnCancel.addEventListener('click', () => {
            overlay.classList.add('hidden');
            setTimeout(() => overlay.remove(), 300);
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.add('hidden');
                setTimeout(() => overlay.remove(), 300);
            }
        });

        const options = overlay.querySelectorAll('.shortcut-option');
        options.forEach(btn => {
            btn.addEventListener('click', (e) => {
                let targetName = e.target.getAttribute('data-name');
                if (targetName === 'CUSTOM') {
                    targetName = prompt("Nhập tên Phím tắt sếp muốn gửi đến:");
                    if (!targetName || targetName.trim() === "") return;
                }

                const text = editor.value;
                navigator.clipboard.writeText(text);
                if (navigator.vibrate) navigator.vibrate(50);

                const encodedText = encodeURIComponent(text);
                const encodedName = encodeURIComponent(targetName.trim());
                window.location.href = `shortcuts://run-shortcut?name=${encodedName}&input=text&text=${encodedText}`;

                overlay.classList.add('hidden');
                setTimeout(() => overlay.remove(), 300);
            });
        });
    }

    // --- NÚT GỬI VỀ PHÍM TẮT ---
    const btnReturn = document.getElementById('btnReturn');
    if (btnReturn) {
        btnReturn.addEventListener('click', () => {
            createShortcutSheet();
        });
    }

    // --- NÚT COPY ---
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

    // --- NÚT CHIA SẺ ---
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

    // --- CHỨC NĂNG XUẤT FILE ---
    const exportOptions = document.querySelectorAll('.export-option:not(.shortcut-option)');
    exportOptions.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const ext = e.target.getAttribute('data-ext');
            if (!ext) return;

            exportSheet.classList.add('hidden');

            let customName = prompt(`Nhập tên file để xuất (không cần gõ đuôi ${ext}):`, "Tai_Lieu_Moi");
            if (customName === null) return;
            
            customName = customName.trim();
            if (customName === "") customName = "Untitled";
            if (customName.endsWith(ext)) customName = customName.slice(0, -ext.length);

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