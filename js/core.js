/* =========================================
   Quick Text Editor Pro - Core System
   Xử lý giao diện, Icon và Auto-save
========================================= */

document.addEventListener('DOMContentLoaded', () => {
    loadIcons();
    initAutoSave();
    initUI();
    updateCounters();
});

// 1. Tải icon động từ file JSON
async function loadIcons() {
    try {
        const response = await fetch('icon/icon.json');
        const icons = await response.json();
        
        for (const [id, svg] of Object.entries(icons)) {
            const btn = document.getElementById(id);
            if (btn) {
                btn.innerHTML = svg;
            }
        }
    } catch (error) {
        console.error("Lỗi khi tải icon:", error);
    }
}

// 2. Hệ thống Tự động lưu (Auto-Save) bằng LocalStorage
const editor = document.getElementById('mainEditor');

function initAutoSave() {
    // Tải lại dữ liệu cũ khi mở app
    const savedText = localStorage.getItem('quickEditorText');
    if (savedText !== null) {
        editor.value = savedText;
    }

    // Lắng nghe sự kiện gõ phím để lưu tức thì
    editor.addEventListener('input', () => {
        localStorage.setItem('quickEditorText', editor.value);
        updateCounters();
    });
}

// 3. Cập nhật trạng thái số từ và ký tự thời gian thực
function updateCounters() {
    const text = editor.value;
    const charCount = text.length;
    
    // Thuật toán đếm từ: Cắt theo khoảng trắng, bỏ qua chuỗi rỗng
    const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
    
    document.getElementById('charCount').textContent = `${charCount} ký tự`;
    document.getElementById('wordCount').textContent = `${wordCount} từ`;
}

// 4. Xử lý sự kiện Giao diện (UI) cơ bản
function initUI() {
    // Bật/Tắt chế độ Code (Monospace)
    const btnCodeMode = document.getElementById('btnCodeMode');
    if (btnCodeMode) {
        btnCodeMode.addEventListener('click', () => {
            editor.classList.toggle('monospace-mode');
            btnCodeMode.classList.toggle('active');
            
            // Kích hoạt rung phản hồi nhẹ (Haptic Feedback) trên iOS nếu hỗ trợ
            if (navigator.vibrate) navigator.vibrate(50);
        });
    }

    // Nút Xóa toàn bộ
    const btnClear = document.getElementById('btnClear');
    if (btnClear) {
        btnClear.addEventListener('click', () => {
            if (confirm('Sếp có chắc chắn muốn xóa toàn bộ văn bản không?')) {
                editor.value = '';
                localStorage.removeItem('quickEditorText');
                updateCounters();
                editor.focus();
                if (navigator.vibrate) navigator.vibrate(100); // Rung mạnh hơn khi xóa
            }
        });
    }

    // Xử lý Action Sheet (Bảng chọn Xuất file)
    const exportSheet = document.getElementById('exportActionSheet');
    const btnExport = document.getElementById('btnExport');
    const btnCancelExport = document.getElementById('btnCancelExport');

    if (btnExport && exportSheet && btnCancelExport) {
        btnExport.addEventListener('click', () => {
            exportSheet.classList.remove('hidden');
        });

        btnCancelExport.addEventListener('click', () => {
            exportSheet.classList.add('hidden');
        });

        // Ẩn bảng chọn khi chạm ra vùng mờ bên ngoài
        exportSheet.addEventListener('click', (e) => {
            if (e.target === exportSheet) {
                exportSheet.classList.add('hidden');
            }
        });
    }
}
