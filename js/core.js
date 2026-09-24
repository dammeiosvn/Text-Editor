let langData = {};

document.addEventListener('DOMContentLoaded', async () => {
    await loadLanguage();
    loadIcons();
    initAutoSave();
    initUI();
    updateCounters();
});

async function loadLanguage() {
    let userLang = navigator.language || navigator.userLanguage || 'en-GB';
    try {
        let res = await fetch(`Language/${userLang}.json`);
        if (!res.ok) throw new Error();
        langData = await res.json();
    } catch (e) {
        try {
            let fallbackRes = await fetch('Language/en-GB.json');
            langData = await fallbackRes.json();
        } catch (err) {
            langData = {};
        }
    }
}

function t(key) {
    return langData[key] || key;
}

async function loadIcons() {
    try {
        const response = await fetch('icon/icon.json');
        const icons = await response.json();
        for (const [id, svg] of Object.entries(icons)) {
            const btn = document.getElementById(id);
            if (btn) btn.innerHTML = svg;
        }
    } catch (error) {
        console.error(error);
    }
}

const editor = document.getElementById('mainEditor');

function initAutoSave() {
    const savedText = localStorage.getItem('quickEditorText');
    if (savedText !== null) {
        editor.value = savedText;
    }
    editor.addEventListener('input', () => {
        localStorage.setItem('quickEditorText', editor.value);
        updateCounters();
    });
}

function updateCounters() {
    const text = editor.value;
    const charCount = text.length;
    const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
    document.getElementById('charCount').textContent = `${charCount} ký tự`;
    document.getElementById('wordCount').textContent = `${wordCount} từ`;
}

function initUI() {
    const splash = document.getElementById('splashScreen');
    if (splash) {
        setTimeout(() => {
            splash.classList.add('hidden');
            setTimeout(() => splash.remove(), 500);
        }, 2000);
    }

    const btnSettings = document.getElementById('btnSettings');
    if (btnSettings) {
        btnSettings.addEventListener('click', () => {
            if (navigator.vibrate) navigator.vibrate(50);
            openMacModal();
        });
    }

    const btnCodeMode = document.getElementById('btnCodeMode');
    if (btnCodeMode) {
        btnCodeMode.addEventListener('click', () => {
            editor.classList.toggle('monospace-mode');
            btnCodeMode.classList.toggle('active');
            if (navigator.vibrate) navigator.vibrate(50);
        });
    }

    const btnClear = document.getElementById('btnClear');
    if (btnClear) {
        btnClear.addEventListener('click', () => {
            if (confirm(t('clear_confirm'))) {
                editor.value = '';
                localStorage.removeItem('quickEditorText');
                updateCounters();
                editor.focus();
                if (navigator.vibrate) navigator.vibrate(100);
            }
        });
    }

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
        exportSheet.addEventListener('click', (e) => {
            if (e.target === exportSheet) {
                exportSheet.classList.add('hidden');
            }
        });
    }
}

function openMacModal() {
    let existing = document.getElementById('macModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'macModal';
    modal.className = 'mac-modal-overlay';
    modal.innerHTML = `
        <div class="mac-modal-window">
            <div class="mac-modal-header">
                <div class="mac-traffic-lights">
                    <button class="mac-dot red" id="macCloseBtn"></button>
                    <button class="mac-dot yellow"></button>
                    <button class="mac-dot green"></button>
                </div>
                <div class="mac-modal-title">Fast text editing</div>
            </div>
            <div class="mac-modal-body">
                <a href="https://browse.shortcuty.app/user/Sentechtipsvn" target="_blank" class="pill-card">
                    <div class="pill-left">
                        <img src="icon/avatar.png" class="pill-icon" alt="Avatar">
                        <span>${t('author')}</span>
                    </div>
                    <span>➔</span>
                </a>
                <a href="mailto:sentechtips@gmail.com" class="pill-card">
                    <div class="pill-left">
                        <img src="icon/contacst.png" class="pill-icon" alt="Contact">
                        <span>${t('contact')}</span>
                    </div>
                    <span>➔</span>
                </a>
                <div class="pill-card" style="flex-direction: column; align-items: flex-start; cursor: default;">
                    <div class="pill-left" style="margin-bottom: 8px;">
                        <img src="icon/info.png" class="pill-icon" alt="Info">
                        <span style="font-weight: 600;">${t('info')}</span>
                    </div>
                    <div class="pill-info-text">
                        Quick Text Editor Pro v2.6. Công cụ soạn thảo văn bản và mã nguồn tối ưu cho iOS Shortcuts. Hỗ trợ tự động lưu, xuất file đa định dạng và tương tác URL Scheme hai chiều.
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const closeBtn = modal.querySelector('#macCloseBtn');
    closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        setTimeout(() => modal.remove(), 300);
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
            setTimeout(() => modal.remove(), 300);
        }
    });
}