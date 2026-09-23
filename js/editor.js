/* =========================================
   Quick Text Editor Pro - Editor Features
   Xử lý Tab, tự động đóng ngoặc khi code
========================================= */

document.addEventListener('DOMContentLoaded', () => {
    const editor = document.getElementById('mainEditor');

    editor.addEventListener('keydown', function(e) {
        // 1. Xử lý phím Tab (Thụt lề 4 khoảng trắng thay vì nhảy trỏ)
        if (e.key === 'Tab') {
            e.preventDefault(); // Ngăn trình duyệt nhảy sang nút khác
            const start = this.selectionStart;
            const end = this.selectionEnd;

            // Chèn 4 khoảng trắng tại vị trí con trỏ
            this.value = this.value.substring(0, start) + "    " + this.value.substring(end);
            
            // Đặt lại vị trí con trỏ ngay sau khoảng trắng
            this.selectionStart = this.selectionEnd = start + 4;
            
            // Kích hoạt event input để Auto-save nhận diện
            this.dispatchEvent(new Event('input'));
        }

        // 2. Tự động đóng ngoặc và nháy kép
        const pairs = {
            '(': ')',
            '[': ']',
            '{': '}',
            '"': '"',
            "'": "'"
        };

        if (pairs[e.key]) {
            e.preventDefault();
            const start = this.selectionStart;
            const end = this.selectionEnd;
            const closingChar = pairs[e.key];

            // Chèn ký tự mở và đóng
            this.value = this.value.substring(0, start) + e.key + closingChar + this.value.substring(end);
            
            // Đặt con trỏ vào giữa cặp ngoặc
            this.selectionStart = this.selectionEnd = start + 1;
            
            this.dispatchEvent(new Event('input'));
        }
    });
});
