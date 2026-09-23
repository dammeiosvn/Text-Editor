/* =========================================
   Quick Text Editor Pro - Core System
   Xử lý giao diện, Icon, Auto-save & Splash
========================================= */

document.addEventListener('DOMContentLoaded', () => {
    loadIcons();
    initAutoSave();
    initUI();
    updateCounters();
});

const svgIcons = {
    "btnSettings": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><path d=\"M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z\"/></svg>",
    "btnCodeMode": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><path d=\"M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z\"/></svg>",
    "btnClear": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><path d=\"M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7z\"/></svg>",
    "btnCopy": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><path d=\"M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z\"/></svg>",
    "btnShare": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><path d=\"M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92z\"/></svg>",
    "btnExport": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><path d=\"M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z\"/></svg>",
    "btnReturn": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><path d=\"M19 7v4H5.83l3.58-3.59L8 6l-6 6 6 6 1.41-1.41L5.83 13H21V7h-2z\"/></svg>"
};

function loadIcons() {
    for (const [id, svg] of Object.entries(svgIcons)) {
        const btn = document.getElementById(id);
        if (btn) {
            btn.innerHTML = svg;
        }
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
    // --- XỬ LÝ SPLASH SCREEN ---
    const splash = document.getElementById('splashScreen');
    if (splash) {
        setTimeout(() => {
            splash.classList.add('hidden');
            setTimeout(() => splash.remove(), 500); 
        }, 2000); 
    }
    // ---------------------------

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
            if (confirm('Sếp có chắc chắn muốn xóa toàn bộ văn bản không?')) {
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