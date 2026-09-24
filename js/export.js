const MY_SHORTCUTS = [
    "Commit",
    "Lưu tệp",
    "Dich Thuat"
];

document.addEventListener('DOMContentLoaded', () => {
    const editor = document.getElementById('mainEditor');
    const exportSheet = document.getElementById('exportActionSheet');

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

    const btnReturn = document.getElementById('btnReturn');
    if (btnReturn) {
        btnReturn.addEventListener('click', () => {
            createShortcutSheet();
        });
    }

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

    function validateTextForExtension(text, ext) {
        const trimmed = text.trim();
        if (ext === '.json') {
            try {
                JSON.parse(trimmed);
                return true;
            } catch (e) {
                alert(t('invalid_json'));
                return false;
            }
        }
        if (ext === '.html') {
            if (!trimmed.toLowerCase().includes('<html') && !trimmed.toLowerCase().includes('<!doctype')) {
                alert(t('invalid_html'));
                return false;
            }
            return true;
        }
        if (ext === '.css') {
            if (!trimmed.includes('{') || !trimmed.includes('}')) {
                alert(t('invalid_css'));
                return false;
            }
            return true;
        }
        if (ext === '.mobileconfig') {
            if (!trimmed.includes('plist') && !trimmed.includes('xml')) {
                alert(t('invalid_config'));
                return false;
            }
            return true;
        }
        return true;
    }

    const exportOptions = document.querySelectorAll('.export-option:not(.shortcut-option)');
    exportOptions.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const ext = e.target.getAttribute('data-ext');
            if (!ext) return;

            exportSheet.classList.add('hidden');

            const text = editor.value;
            if (!validateTextForExtension(text, ext)) {
                return;
            }

            let customName = prompt(t('export_prompt').replace('{ext}', ext), "Tai_Lieu_Moi");
            if (customName === null) return;
            
            customName = customName.trim();
            if (customName === "") customName = "Untitled";
            if (customName.endsWith(ext)) customName = customName.slice(0, -ext.length);

            const fileName = `${customName}${ext}`;
            const mimeTypes = {
                '.txt': 'text/plain',
                '.json': 'application/json',
                '.css': 'text/css',
                '.html': 'text/html',
                '.mobileconfig': 'application/x-apple-aspen-config',
                '.js': 'text/javascript'
            };
            const mimeType = mimeTypes[ext] || 'text/plain';
            const blob = new Blob([text], { type: `${mimeType};charset=utf-8` });
            const file = new File([blob], fileName, { type: mimeType });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: fileName
                    });
                } catch (error) {
                    console.log('Hủy chia sẻ file', error);
                }
            } else {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(a.href);
            }
        });
    });
});