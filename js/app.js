/* Quick Text Editor Pro 1.1 — static build for GitHub Pages */
(function () {
  const NOTES_KEY = "qte.notes.v1";
  const SETTINGS_KEY = "qte.settings.v1";
  const ACTIVE_KEY = "qte.active.v1";
  const SNAP_KEY = "qte.snaps.v1";
  const LEGACY_KEY = "quickEditorText";
  const FONT_STEPS = [16, 17, 18, 20, 22];
  const EXPORTS = [
    [".txt", "Văn bản thuần", "text/plain"],
    [".md", "Markdown", "text/markdown"],
    [".json", "Dữ liệu JSON", "application/json"],
    [".html", "Mã HTML", "text/html"],
    [".css", "Định dạng CSS", "text/css"],
    [".js", "JavaScript", "text/javascript"],
    [".mobileconfig", "Apple Config", "application/x-apple-aspen-config"],
  ];
  const PAIRS = { "(": ")", "[": "]", "{": "}", '"': '"', "'": "'", "`": "`" };
  const CLOSERS = new Set([")", "]", "}", '"', "'", "`"]);

  const svg = (body) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  const ICON = {
    settings: svg('<circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/>'),
    code: svg('<path d="m8 8-4 4 4 4M16 8l4 4-4 4"/>'),
    trash: svg('<path d="M4 7h16M9 7V5h6v2M8 7l1 13h6l1-13"/>'),
    copy: svg('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5h10"/>'),
    check: svg('<path d="m5 12 4 4L19 7"/>'),
    braces: svg('<path d="M8 4c-2 1-3 2-3 8s1 7 3 8M16 4c2 1 3 2 3 8s-1 7-3 8"/>'),
    download: svg('<path d="M12 4v11M8 11l4 4 4-4M5 20h14"/>'),
    send: svg('<path d="M21 3 10 14M21 3l-7 18-4-7-7-4 18-7Z"/>'),
    chev: svg('<path d="m6 9 6 6 6-6"/>'),
    x: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
    pin: svg('<path d="M9 4h6l-1 6 3 3v2H7v-2l3-3-1-6ZM12 15v5"/>'),
    plus: svg('<path d="M12 5v14M5 12h14"/>'),
    minus: svg('<path d="M5 12h14"/>'),
    search: svg('<circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/>'),
    undo: svg('<path d="M9 14 4 9l5-5"/><path d="M4 9h9a6 6 0 1 1 0 12H9"/>'),
    redo: svg('<path d="m15 14 5-5-5-5"/><path d="M20 9h-9a6 6 0 1 0 0 12h4"/>'),
  };

  const $ = (id) => document.getElementById(id);
  const area = $("mainEditor");
  const layer = $("layer");
  let data = null;
  let panel = null;
  let confirmRun = null;
  let confirmMeta = null;
  let statMode = 0;
  let liveSaved = false;
  let savedTimer = 0;
  let toastTimer = 0;
  let snapTimer, saveTimer = 0;
  let copied = false;
  let findOpen = false;
  let query = "";
  let replacement = "";
  let matchIndex = 0;
  let noteQuery = "";
  let naming = null;
  let nameDraft = "";
  let exportExt = null;
  let exportName = "";
  let customName = "";
  let caret = { start: 0, end: 0 };

  function uid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return `n-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
  function esc(s) {
    const map = { "&": "&" + "amp;", "<": "&" + "lt;", ">": "&" + "gt;", '"': "&" + "quot;", "'": "&" + "#39;" };
    return String(s).replace(/[&<>"']/g, (c) => map[c]);
  }
  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }
  function makeNote(body, title) {
    return { id: uid(), body: body || "", title: String(title || "").trim(), updatedAt: Date.now(), pinned: false, codeMode: false };
  }
  function noteLabel(note) {
    const t = String(note && note.title || "").trim();
    return t || "Không có tiêu đề";
  }
  function titleFromBody(body) {
    const line = String(body || "").split("\n").find((l) => l.trim());
    const t = line ? line.trim() : "";
    if (!t) return "Không có tiêu đề";
    return t.length > 42 ? `${t.slice(0, 42)}…` : t;
  }
  function fileBase(title) {
    const cleaned = String(title || "")
      .replace(/[\\/:*?"<>|{}\n\r]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 48);
    return cleaned && cleaned !== "Không tiêu đề" ? cleaned : "Tai_Lieu";
  }
  function balanced(text, open, close) {
    let n = 0;
    let quote = "";
    let esc = false;
    for (let i = 0; i < text.length; i += 1) {
      const c = text[i];
      if (quote) {
        if (esc) { esc = false; continue; }
        if (c === "\\") { esc = true; continue; }
        if (c === quote) quote = "";
        continue;
      }
      if (c === '"' || c === "'" || c === "`") { quote = c; continue; }
      if (c === open) n += 1;
      else if (c === close) {
        n -= 1;
        if (n < 0) return false;
      }
    }
    return n === 0 && !quote;
  }
  function formatError(ext, text) {
    const trimmed = String(text ?? "").trim();
    if (!trimmed) return "Nội dung trống — chưa xuất";
    if (ext === ".json") {
      try { JSON.parse(trimmed); return ""; } catch { return "JSON không hợp lệ — chưa xuất"; }
    }
    if (ext === ".html") {
      return /<\/?[a-z][\s\S]*?>/i.test(trimmed) ? "" : "HTML không hợp lệ — chưa xuất";
    }
    if (ext === ".css") {
      return balanced(trimmed, "{", "}") ? "" : "CSS không hợp lệ — chưa xuất";
    }
    if (ext === ".js") {
      const ok = balanced(trimmed, "{", "}") && balanced(trimmed, "(", ")") && balanced(trimmed, "[", "]");
      return ok ? "" : "JavaScript không hợp lệ — chưa xuất";
    }
    if (ext === ".mobileconfig") {
      return /<\?xml|<plist[\s>]/i.test(trimmed) ? "" : "mobileconfig không hợp lệ — chưa xuất";
    }
    return "";
  }
  function takeIncomingText() {
    const url = new URL(window.location.href);
    let text = url.searchParams.get("text") ?? url.searchParams.get("input") ?? url.searchParams.get("content");
    if ((text == null || text === "") && url.hash.startsWith("#text=")) text = decodeURIComponent(url.hash.slice(6));
    if (text == null || text === "") return null;
    url.searchParams.delete("text");
    url.searchParams.delete("input");
    url.searchParams.delete("content");
    const hash = url.hash.startsWith("#text=") ? "" : url.hash;
    history.replaceState(null, "", `${url.pathname}${url.search}${hash}`);
    return text;
  }
  function sanitizeSettings(raw) {
    const theme = raw && (raw.theme === "light" || raw.theme === "dark" || raw.theme === "system") ? raw.theme : "system";
    const fontSize = raw && raw.fontSize >= 16 && raw.fontSize <= 22 ? raw.fontSize : 17;
    const shortcuts = Array.isArray(raw && raw.shortcuts)
      ? raw.shortcuts
          .map((s) => String(s).trim())
          .filter(Boolean)
          .map((s) => (s === "Dich Thuat" ? "Dịch thuật AI" : s))
          .filter((s, i, all) => all.indexOf(s) === i)
          .slice(0, 8)
      : ["Commit", "Lưu tệp", "Dịch thuật AI"];
    return {
      theme,
      fontSize,
      wrap: !raw || raw.wrap !== false,
      tabSize: raw && raw.tabSize === 2 ? 2 : 4,
      shortcuts: shortcuts.length ? shortcuts : ["Commit", "Lưu tệp", "Dịch thuật AI"],
    };
  }
  function loadAll() {
    const settings = sanitizeSettings(readJSON(SETTINGS_KEY, {}));
    let notes = readJSON(NOTES_KEY, []);
    if (!Array.isArray(notes)) notes = [];
    notes = notes.filter((n) => n && typeof n.id === "string" && typeof n.body === "string");
    let snaps = readJSON(SNAP_KEY, []);
    if (!Array.isArray(snaps)) snaps = [];
    const incoming = takeIncomingText();
    const fromLink = incoming != null;
    if (!notes.length) {
      let body = "";
      try { body = localStorage.getItem(LEGACY_KEY) || ""; } catch (e) { body = ""; }
      if (incoming != null) body = incoming;
      const note = makeNote(body);
      return { notes: [note], activeId: note.id, settings, snaps, fromLink };
    }
    if (incoming != null) {
      const note = makeNote(incoming);
      return { notes: [note, ...notes], activeId: note.id, settings, snaps, fromLink };
    }
    let activeId = "";
    try { activeId = localStorage.getItem(ACTIVE_KEY) || ""; } catch (e) { activeId = ""; }
    if (!notes.some((n) => n.id === activeId)) activeId = notes[0].id;
    return { notes, activeId, settings, snaps, fromLink };
  }
  function persist() {
    try {
      localStorage.setItem(NOTES_KEY, JSON.stringify(data.notes));
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(data.settings));
      localStorage.setItem(ACTIVE_KEY, data.activeId);
      localStorage.setItem(SNAP_KEY, JSON.stringify(data.snaps));
      localStorage.removeItem(LEGACY_KEY);
      return true;
    } catch {
      return false;
    }
  }
  function active() {
    return data.notes.find((n) => n.id === data.activeId) || data.notes[0];
  }
  function toast(message) {
    const el = $("toast");
    el.textContent = message;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 2200);
  }
  function isDark() {
    const t = data.settings.theme;
    if (t === "dark") return true;
    if (t === "light") return false;
    return matchMedia("(prefers-color-scheme: dark)").matches;
  }
  function applyTheme() {
    const dark = isDark();
    const bg = dark ? "#000000" : "#f2f2f7";
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.documentElement.style.backgroundColor = bg;
    document.body.style.backgroundColor = bg;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", bg);
    document.documentElement.style.setProperty("--editor-size", `${data.settings.fontSize}px`);
  }
  function countStats(text) {
    const chars = text.length;
    const charsNoSpace = text.replace(/\s/g, "").length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const lines = text === "" ? 0 : text.split("\n").length;
    const reading = words === 0 ? "0 phút đọc" : `${Math.max(1, Math.round(words / 220))} phút đọc`;
    return { chars, charsNoSpace, words, lines, reading };
  }
  function lineCol(value, index) {
    const parts = value.slice(0, Math.max(0, index)).split("\n");
    return { line: parts.length, col: parts[parts.length - 1].length + 1 };
  }
  function sortNotes(notes) {
    return notes.slice().sort((a, b) => (a.pinned === b.pinned ? b.updatedAt - a.updatedAt : a.pinned ? -1 : 1));
  }
  function formatWhen(ts) {
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  }
  function pushSnap(noteId, body) {
    if (!body) return;
    if (data.snaps.find((s) => s.noteId === noteId)?.body === body) return;
    const next = [{ id: uid(), noteId, body, at: Date.now() }, ...data.snaps];
    const kept = [];
    const counts = new Map();
    next.forEach((snap) => {
      const c = counts.get(snap.noteId) || 0;
      if (c >= 12) return;
      counts.set(snap.noteId, c + 1);
      if (kept.length < 120) kept.push(snap);
    });
    data.snaps = kept;
  }
  function rememberSnap() {
    const note = active();
    pushSnap(note.id, note.body);
    persist();
  }
  function scheduleSnap() {
    clearTimeout(snapTimer);
    snapTimer = setTimeout(() => {
      const note = active();
      pushSnap(note.id, note.body);
      persist();
    }, 4000);
  }
  function markSaved() {
    clearTimeout(savedTimer);
    liveSaved = false;
    savedTimer = setTimeout(() => {
      liveSaved = true;
      paintChrome();
      savedTimer = setTimeout(() => { liveSaved = false; paintChrome(); }, 1000);
    }, 450);
  }
  function longToken(body) {
    return /\S{80,}/.test(body || "");
  }
  function tuneInput(body) {
    const heavy = longToken(body);
    area.spellcheck = !heavy && !active().codeMode;
    area.autocorrect = heavy || active().codeMode ? "off" : "on";
    area.autocapitalize = heavy || active().codeMode ? "off" : "sentences";
  }
  function updateBody(body) {
    const note = active();
    note.body = body;
    note.updatedAt = Date.now();
    tuneInput(body);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { if (!persist()) toast("Không lưu được — bộ nhớ máy đầy"); }, 250);
    markSaved();
    scheduleSnap();
    paintChrome();
  }
  function replaceRange(from, to, text, selStart, selEnd) {
    const el = area;
    el.focus();
    const a = Math.max(0, Math.min(from, el.value.length));
    const b = Math.max(a, Math.min(to, el.value.length));
    el.setSelectionRange(a, b);
    const ok = document.execCommand("insertText", false, text);
    if (!ok) el.value = el.value.slice(0, a) + text + el.value.slice(b);
    const max = el.value.length;
    el.setSelectionRange(Math.max(0, Math.min(selStart, max)), Math.max(0, Math.min(selEnd, max)));
    updateBody(el.value);
    syncCaret();
  }
  function syncCaret() {
    caret = { start: area.selectionStart, end: area.selectionEnd };
    paintChrome();
  }
  function paintChrome() {
    const note = active();
    const stats = countStats(note.body);
    const selected = Math.abs(caret.end - caret.start);
    const lc = lineCol(note.body, caret.start);
    const labels = [
      selected ? `Chọn ${selected} · ${stats.words} từ` : `${stats.chars} ký tự · ${stats.words} từ`,
      `${stats.lines} dòng · ${stats.reading}`,
      `${stats.charsNoSpace} không khoảng trắng`,
    ];
    if (note.codeMode) labels.push(`Dòng ${lc.line} · Cột ${lc.col}`);
    $("noteTitle").textContent = noteLabel(note);
    $("btnStats").textContent = liveSaved ? "Đã lưu" : labels[statMode % labels.length];
    $("btnCode").classList.toggle("is-on", note.codeMode);
    $("btnCode").setAttribute("aria-pressed", note.codeMode ? "true" : "false");
    $("symBar").hidden = !note.codeMode;
    area.classList.toggle("mono", note.codeMode);
    area.classList.toggle("nowrap", data.settings.wrap === false);
    area.spellcheck = !note.codeMode;
    area.autocapitalize = note.codeMode ? "off" : "sentences";
    area.autocorrect = note.codeMode ? "off" : "on";
    $("findBar").hidden = !findOpen;
    const matches = findMatches(note.body, query);
    $("findCount").textContent = query ? `${matches.length ? (matchIndex % matches.length) + 1 : 0}/${matches.length}` : "";
    $("btnCopy").innerHTML = copied ? ICON.check : ICON.copy;
  }
  function findMatches(value, q) {
    if (!q) return [];
    const hay = value.toLocaleLowerCase("vi");
    const needle = q.toLocaleLowerCase("vi");
    const out = [];
    let i = 0;
    while (i <= hay.length - needle.length) {
      const at = hay.indexOf(needle, i);
      if (at < 0) break;
      out.push({ start: at, end: at + needle.length });
      i = at + Math.max(needle.length, 1);
      if (out.length >= 500) break;
    }
    return out;
  }
  function jumpMatch(delta) {
    const matches = findMatches(area.value, query);
    if (!matches.length) return;
    matchIndex = (matchIndex + delta + matches.length) % matches.length;
    const hit = matches[matchIndex];
    area.focus();
    area.setSelectionRange(hit.start, hit.end);
    const line = area.value.slice(0, hit.start).split("\n").length;
    const lh = parseFloat(getComputedStyle(area).lineHeight) || 24;
    area.scrollTop = Math.max(0, (line - 3) * lh);
    syncCaret();
  }
  function replaceMatches(value, q, rep, oneIndex) {
    const matches = findMatches(value, q);
    const chosen = oneIndex == null ? matches : matches[oneIndex] ? [matches[oneIndex]] : [];
    let next = value;
    for (let i = chosen.length - 1; i >= 0; i -= 1) {
      const m = chosen[i];
      next = next.slice(0, m.start) + rep + next.slice(m.end);
    }
    return next;
  }

  function planKey(e, value, start, end) {
    if (e.isComposing || e.key === "Process" || e.metaKey || e.ctrlKey || e.altKey) return null;
    const codeMode = active().codeMode;
    const tabSize = data.settings.tabSize;
    if (e.key === "Tab") return e.shiftKey ? outdent(value, start, end, tabSize) : indent(value, start, end, tabSize);
    if (!codeMode) return null;
    const closer = PAIRS[e.key];
    if (closer && start !== end) {
      const selected = value.slice(start, end);
      return { from: start, to: end, text: e.key + selected + closer, selStart: start + 1, selEnd: end + 1 };
    }
    if (closer && start === end && (e.key === '"' || e.key === "'" || e.key === "`") && value[start] === e.key) {
      return { from: start, to: start, text: "", selStart: start + 1, selEnd: start + 1 };
    }
    if (closer && start === end) {
      return { from: start, to: end, text: e.key + closer, selStart: start + 1, selEnd: start + 1 };
    }
    if (CLOSERS.has(e.key) && start === end && value[start] === e.key) {
      return { from: start, to: start, text: "", selStart: start + 1, selEnd: start + 1 };
    }
    if (e.key === "Backspace" && start === end && start > 0 && PAIRS[value[start - 1]] === value[start]) {
      return { from: start - 1, to: start + 1, text: "", selStart: start - 1, selEnd: start - 1 };
    }
    if (e.key === "Enter" && start === end) {
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const line = value.slice(lineStart, start);
      const base = (/^\s*/.exec(line) || [""])[0];
      const extra = /[[{(]\s*$/.test(line) ? " ".repeat(tabSize) : "";
      const text = `\n${base}${extra}`;
      return { from: start, to: end, text, selStart: start + text.length, selEnd: start + text.length };
    }
    return null;
  }
  function lineSpan(value, start, end) {
    const from = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    let to = end;
    if (to > start && value[to - 1] === "\n") to -= 1;
    const nl = value.indexOf("\n", to);
    return { from, to: nl < 0 ? value.length : nl };
  }
  function indent(value, start, end, tabSize) {
    if (start === end) {
      const text = " ".repeat(tabSize);
      return { from: start, to: end, text, selStart: start + text.length, selEnd: start + text.length };
    }
    const span = lineSpan(value, start, end);
    const pad = " ".repeat(tabSize);
    const text = value.slice(span.from, span.to).split("\n").map((line) => pad + line).join("\n");
    return { from: span.from, to: span.to, text, selStart: span.from, selEnd: span.from + text.length };
  }
  function stripIndent(line, tabSize) {
    if (line.startsWith(" ".repeat(tabSize))) return line.slice(tabSize);
    if (line.startsWith("\t")) return line.slice(1);
    return line.replace(/^ +/, (spaces) => spaces.slice(Math.min(spaces.length, tabSize)));
  }
  function outdent(value, start, end, tabSize) {
    const span = lineSpan(value, start, end);
    const raw = value.slice(span.from, span.to).split("\n");
    const next = raw.map((line) => stripIndent(line, tabSize));
    const text = next.join("\n");
    if (start === end) {
      const lineIndex = value.slice(span.from, start).split("\n").length - 1;
      const removed = (raw[lineIndex] || "").length - (next[lineIndex] || "").length;
      const sel = Math.max(span.from, start - removed);
      return { from: span.from, to: span.to, text, selStart: sel, selEnd: sel };
    }
    return { from: span.from, to: span.to, text, selStart: span.from, selEnd: span.from + text.length };
  }

  function mapRegion(fn) {
    const start = area.selectionStart;
    const end = area.selectionEnd;
    const has = start !== end;
    const from = has ? Math.min(start, end) : 0;
    const to = has ? Math.max(start, end) : area.value.length;
    const chunk = fn(area.value.slice(from, to));
    return { value: area.value.slice(0, from) + chunk + area.value.slice(to), selStart: from, selEnd: from + chunk.length };
  }
  function transform(fn) {
    try {
      rememberSnap();
      const region = mapRegion(fn);
      replaceRange(0, area.value.length, region.value, region.selStart, region.selEnd);
      closePanel();
    } catch (error) {
      toast(error && error.message ? error.message : "Không xử lý được");
    }
  }
  function formatJson(pretty) {
    const start = area.selectionStart;
    const end = area.selectionEnd;
    const has = start !== end;
    const from = has ? Math.min(start, end) : 0;
    const to = has ? Math.max(start, end) : area.value.length;
    const chunk = has ? area.value.slice(from, to) : area.value.trim();
    let text;
    try { text = JSON.stringify(JSON.parse(chunk), null, pretty ? 2 : 0); }
    catch { toast("JSON không hợp lệ"); return; }
    rememberSnap();
    if (!has) replaceRange(0, area.value.length, text, 0, text.length);
    else replaceRange(0, area.value.length, area.value.slice(0, from) + text + area.value.slice(to), from, from + text.length);
    closePanel();
  }
  function sortLines(chunk) {
    const ends = chunk.endsWith("\n");
    const lines = chunk.replace(/\n$/, "").split("\n");
    lines.sort((a, b) => a.localeCompare(b, "vi", { sensitivity: "base", numeric: true }));
    return lines.join("\n") + (ends ? "\n" : "");
  }
  function reverseLines(chunk) {
    const ends = chunk.endsWith("\n");
    return chunk.replace(/\n$/, "").split("\n").reverse().join("\n") + (ends ? "\n" : "");
  }
  function uniqueLines(chunk) {
    const ends = chunk.endsWith("\n");
    const seen = new Set();
    const lines = [];
    chunk.replace(/\n$/, "").split("\n").forEach((line) => {
      if (seen.has(line)) return;
      seen.add(line);
      lines.push(line);
    });
    return lines.join("\n") + (ends ? "\n" : "");
  }
  function utf8ToB64(chunk) {
    const bytes = new TextEncoder().encode(chunk);
    let bin = "";
    bytes.forEach((b) => { bin += String.fromCharCode(b); });
    return btoa(bin);
  }
  function b64ToUtf8(chunk) {
    const bin = atob(chunk.trim());
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  function titleCase(chunk) {
    return chunk.replace(/\S+/g, (word) => word.charAt(0).toLocaleUpperCase("vi") + word.slice(1).toLocaleLowerCase("vi"));
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        ta.remove();
        return ok;
      } catch {
        return false;
      }
    }
  }
  async function saveFile(name, mime, text) {
    const type = `${mime};charset=utf-8`;
    const blob = new Blob([text], { type });
    const file = new File([blob], name, { type, lastModified: Date.now() });
    // title/text makes iOS Save to Files write a second .txt of the filename
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file] });
      return "shared";
    }
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1500);
    return "downloaded";
  }
  async function sendTo(name) {
    const target = name.trim();
    if (!target) return;
    const text = area.value;
    await copyText(text);
    const encodedName = encodeURIComponent(target);
    const encodedText = encodeURIComponent(text);
    const long = encodedText.length > 1800;
    const href = long
      ? `shortcuts://run-shortcut?name=${encodedName}`
      : `shortcuts://run-shortcut?name=${encodedName}&input=text&text=${encodedText}`;
    if (navigator.vibrate) navigator.vibrate(20);
    closePanel();
    if (long) toast("Văn bản dài đã copy. Phím tắt hãy lấy Clipboard.");
    location.href = href;
  }

  function createNamedNote(raw) {
    const current = active();
    pushSnap(current.id, current.body);
    const note = makeNote("", raw);
    data.notes.unshift(note);
    data.activeId = note.id;
    naming = null;
    nameDraft = "";
    persist();
    area.value = "";
    closePanel();
    paintChrome();
    setTimeout(() => area.focus(), 40);
  }
  function saveNoteName(id, raw) {
    const note = data.notes.find((n) => n.id === id);
    if (!note) return;
    note.title = String(raw || "").trim();
    note.updatedAt = Date.now();
    naming = null;
    nameDraft = "";
    persist();
    paintChrome();
    renderLayer();
  }
  function sheet(title, body) {
    return `<div class="overlay"><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="sheet-head"><h2 class="sheet-title">${esc(title)}</h2></div><div class="can-scroll">${body}</div></div><button type="button" class="sheet-cancel" data-act="close">Hủy</button></div>`;
  }
  function modal(title, body) {
    return `<div class="overlay center"><div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-head"><div class="traffic"><button type="button" class="dot red" data-act="close" aria-label="Đóng"></button><button type="button" class="dot yellow" data-act="close" aria-label="Đóng"></button><button type="button" class="dot green" data-act="close" aria-label="Đóng"></button></div><h2 class="modal-title">${esc(title)}</h2><div class="modal-spacer"></div></div><div class="can-scroll">${body}</div></div></div>`;
  }
  function row(act, label, extra) {
    return `<button type="button" class="row-btn" data-act="${act}" ${extra || ""}><span class="row-main">${esc(label)}</span></button>`;
  }
  function renderLayer() {
    if (!panel) { layer.innerHTML = ""; return; }
    if (panel === "confirm") {
      layer.innerHTML = `<div class="overlay center"><div class="modal" role="alertdialog" aria-modal="true"><div class="modal-head"><h2 class="modal-title">${esc(confirmMeta.title)}</h2></div><div class="pad"><p class="about">${esc(confirmMeta.message)}</p><button type="button" class="text-btn ${confirmMeta.danger ? "danger" : "accent"}" data-act="confirm-yes">${esc(confirmMeta.confirm)}</button><button type="button" class="text-btn" data-act="close">Hủy</button></div></div></div>`;
      return;
    }
    if (panel === "notes") {
      const q = noteQuery.trim().toLocaleLowerCase("vi");
      const items = sortNotes(data.notes).filter((n) => !q || noteLabel(n).toLocaleLowerCase("vi").includes(q) || n.body.toLocaleLowerCase("vi").includes(q));
      const list = items.map((n) => {
        if (naming === n.id) {
          return `<div class="note-row is-active"><div class="pad"><input id="noteName" class="field" placeholder="Không có tiêu đề" aria-label="Tên ghi chú" value="${esc(nameDraft)}"><button type="button" class="text-btn accent" data-act="save-name" data-id="${esc(n.id)}">Lưu tên</button></div></div>`;
        }
        return `<div class="note-row${n.id === data.activeId ? " is-active" : ""}" data-act="open-note" data-id="${esc(n.id)}"><div class="note-open"><button type="button" class="row-label" data-act="rename-note" data-id="${esc(n.id)}">${esc(noteLabel(n))}</button><span class="row-sub">${esc(formatWhen(n.updatedAt))} · ${countStats(n.body).words} từ</span></div><div class="note-actions"><button type="button" class="icon-btn mini${n.pinned ? " is-on" : ""}" data-act="pin" data-id="${esc(n.id)}" aria-label="Ghim">${ICON.pin}</button><button type="button" class="icon-btn mini danger" data-act="delete-note" data-id="${esc(n.id)}" aria-label="Xóa ghi chú">${ICON.trash}</button></div></div>`;
      }).join("");
      const create = naming === "new"
        ? `<div class="pad"><label class="setting-label" for="noteName">Tên ghi chú</label><input id="noteName" class="field" placeholder="Không có tiêu đề" aria-label="Tên ghi chú" value="${esc(nameDraft)}"><button type="button" class="text-btn accent" data-act="save-new">Tạo</button></div>`
        : `<button type="button" class="row-btn accent" data-act="new-note"><span class="row-main">${ICON.plus} Ghi chú mới</span></button>`;
      layer.innerHTML = sheet("Ghi chú", `<div class="search-wrap"><input id="noteQuery" class="field" placeholder="Lọc ghi chú" aria-label="Lọc ghi chú" value="${esc(noteQuery)}"></div><div class="group">${create}${list || '<div class="empty-hint">Không có ghi chú khớp.</div>'}</div>`);
      const input = $("noteQuery");
      if (input) {
        input.addEventListener("input", () => {
          noteQuery = input.value;
          const pos = input.selectionStart;
          renderLayer();
          const again = $("noteQuery");
          if (again) { again.focus(); again.setSelectionRange(pos, pos); }
        });
      }
      const nameInput = $("noteName");
      if (nameInput) {
        nameInput.addEventListener("input", () => { nameDraft = nameInput.value; });
        nameInput.addEventListener("keydown", (e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          if (naming === "new") createNamedNote(nameInput.value);
          else saveNoteName(naming, nameInput.value);
        });
        setTimeout(() => nameInput.focus(), 40);
      }
      return;
    }
    if (panel === "tools") {
      const tools = [
        ["upper", "IN HOA"], ["lower", "chữ thường"], ["title", "Viết hoa chữ đầu"],
        ["sort", "Sắp xếp dòng"], ["reverse", "Đảo thứ tự dòng"], ["unique", "Xóa dòng trùng"],
        ["trim", "Cắt khoảng trắng thừa"], ["blank", "Gộp dòng trống"], ["html", "Bỏ thẻ HTML"],
      ];
      const dataTools = [
        ["json-pretty", "JSON đẹp"], ["json-min", "JSON gọn"], ["b64e", "Base64 mã hóa"],
        ["b64d", "Base64 giải mã"], ["urle", "URL mã hóa"], ["urld", "URL giải mã"],
      ];
      const more = [["find", "Tìm và thay"], ["dup", "Nhân bản ghi chú"], ["history", "Lịch sử phiên bản"], ["share", "Chia sẻ văn bản"]];
      const group = (list) => `<div class="group">${list.map(([act, label]) => row(act, label)).join("")}</div>`;
      layer.innerHTML = sheet("Công cụ", `<div class="section-label">Văn bản</div>${group(tools)}<div class="section-label">Dữ liệu</div>${group(dataTools)}<div class="section-label">Ghi chú</div>${group(more)}`);
      return;
    }
    if (panel === "history") {
      const snaps = data.snaps.filter((s) => s.noteId === active().id);
      const body = snaps.length
        ? `<div class="group">${snaps.map((s) => `<button type="button" class="row-btn" data-act="restore" data-id="${esc(s.id)}"><span class="row-copy"><span class="row-label">${esc(formatWhen(s.at))}</span><span class="row-sub">${esc(titleFromBody(s.body))}</span></span></button>`).join("")}</div>`
        : `<div class="empty-hint">Chưa có phiên bản. Bản lưu được tạo sau khi bạn ngừng gõ vài giây.</div>`;
      layer.innerHTML = sheet("Lịch sử phiên bản", body);
      return;
    }
    if (panel === "export") {
      if (!exportExt) {
        layer.innerHTML = sheet("Xuất tệp", `<div class="group">${EXPORTS.map(([ext, label]) => `<button type="button" class="row-btn accent" data-act="pick-ext" data-ext="${ext}">${esc(label)} (${ext})</button>`).join("")}</div>`);
      } else {
        layer.innerHTML = sheet(`Xuất ${exportExt}`, `<div class="pad"><label class="setting-label" for="exportName">Tên tệp</label><input id="exportName" class="field" value="${esc(exportName)}"><button type="button" class="text-btn accent" data-act="do-export">Xuất ${esc(exportExt)}</button><button type="button" class="text-btn" data-act="export-back">Chọn lại định dạng</button></div>`);
        const input = $("exportName");
        if (input) input.addEventListener("input", () => { exportName = input.value; });
      }
      return;
    }
    if (panel === "send") {
      const list = data.settings.shortcuts.map((name) => `<button type="button" class="row-btn accent" data-act="send" data-name="${esc(name)}">${esc(name)}</button>`).join("");
      layer.innerHTML = sheet("Gửi sang Phím tắt", `<div class="group">${list}</div><div class="section-label">Phím tắt khác</div><div class="group"><div class="shortcut-edit"><input id="customName" class="field" placeholder="Tên Phím tắt" aria-label="Tên Phím tắt" value="${esc(customName)}"><button type="button" class="sym-btn" data-act="send-custom">Gửi</button></div></div>`);
      const input = $("customName");
      if (input) {
        input.addEventListener("input", () => { customName = input.value; });
        input.addEventListener("keydown", (e) => { if (e.key === "Enter") sendTo(customName); });
      }
      return;
    }
    if (panel === "settings") {
      const s = data.settings;
      const shortcuts = s.shortcuts.map((name, index) => `<div class="shortcut-edit"><input class="field" data-shortcut="${index}" aria-label="Phím tắt ${index + 1}" value="${esc(name)}"><button type="button" class="icon-btn mini danger" data-act="del-shortcut" data-index="${index}" aria-label="Xóa phím tắt">${ICON.trash}</button></div>`).join("");
      layer.innerHTML = modal("Fast text editing", `<div class="pad">
        <div class="setting-block"><div class="setting-label">Giao diện</div><div class="seg">
          <button type="button" class="${s.theme === "system" ? "is-on" : ""}" data-act="theme" data-theme="system">Hệ thống</button>
          <button type="button" class="${s.theme === "light" ? "is-on" : ""}" data-act="theme" data-theme="light">Sáng</button>
          <button type="button" class="${s.theme === "dark" ? "is-on" : ""}" data-act="theme" data-theme="dark">Tối</button>
        </div></div>
        <div class="setting-block"><div class="setting-label">Cỡ chữ</div><div class="stepper">
          <button type="button" class="sym-btn" data-act="font" data-dir="-1" aria-label="Nhỏ hơn">${ICON.minus}</button>
          <span>${s.fontSize} px</span>
          <button type="button" class="sym-btn" data-act="font" data-dir="1" aria-label="Lớn hơn">${ICON.plus}</button>
        </div></div>
        <div class="group">
          <button type="button" class="row-btn" data-act="wrap"><span>Ngắt dòng</span><span class="row-sub">${s.wrap ? "Bật" : "Tắt"}</span></button>
          <button type="button" class="row-btn" data-act="tabsize"><span>Độ rộng Tab</span><span class="row-sub">${s.tabSize} dấu cách</span></button>
        </div>
        <div class="setting-block"><div class="setting-label">Phím tắt hay dùng</div><div class="group">${shortcuts}${s.shortcuts.length < 8 ? '<button type="button" class="row-btn accent" data-act="add-shortcut">Thêm tên</button>' : ""}</div></div>
        <div class="group">
          <a class="row-btn" href="https://browse.shortcuty.app/user/Sentechtipsvn" target="_blank" rel="noreferrer"><span class="row-main">Tác giả</span></a>
          <a class="row-btn" href="mailto:sentechtips@gmail.com"><span class="row-main">Liên hệ</span></a>
          <button type="button" class="row-btn" data-act="info"><span class="row-main">Thông tin</span></button>
        </div>
      </div>`);
      layer.querySelectorAll("[data-shortcut]").forEach((input) => {
        input.addEventListener("input", () => {
          const shortcuts = data.settings.shortcuts.slice();
          shortcuts[Number(input.dataset.shortcut)] = input.value;
          data.settings.shortcuts = shortcuts;
          persist();
        });
      });
      return;
    }
    if (panel === "info") {
      layer.innerHTML = modal("Thông tin", `<div class="pad"><div class="about-name">Quick Text Editor Pro</div><div class="about-ver">Phiên bản 1.1</div><p class="about">Soạn thảo nhanh cho webclip trên màn hình chính và Phím tắt iOS. Văn bản tự lưu trên máy, có nhiều ghi chú, lịch sử phiên bản, công cụ JSON / Base64 và xuất tệp.</p><p class="about">Phím tắt đổ nội dung vào bằng cách mở địa chỉ kèm ?text=. Gửi ngược lại bằng nút máy bay. Nếu văn bản quá dài, app copy vào Clipboard rồi mở Phím tắt không kèm URL.</p><button type="button" class="text-btn accent" data-act="settings">Quay lại</button></div>`);
    }
  }
  function openPanel(name) {
    panel = name;
    renderLayer();
  }
  function closePanel() {
    panel = null;
    confirmRun = null;
    layer.innerHTML = "";
  }
  function ask(meta) {
    confirmMeta = meta;
    confirmRun = meta.run;
    openPanel("confirm");
  }

  layer.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) {
      if (e.target.classList.contains("overlay")) closePanel();
      return;
    }
    const act = btn.dataset.act;
    if (act === "close") { closePanel(); return; }
    if (act === "confirm-yes" && confirmRun) { const run = confirmRun; confirmRun = null; run(); return; }
    if (act === "open-note") {
      const current = active();
      pushSnap(current.id, current.body);
      data.activeId = btn.dataset.id;
      persist();
      area.value = active().body;
      caret = { start: 0, end: 0 };
      closePanel();
      paintChrome();
      return;
    }
    if (act === "new-note") {
      naming = "new";
      nameDraft = "";
      renderLayer();
      return;
    }
    if (act === "rename-note") {
      const note = data.notes.find((n) => n.id === btn.dataset.id);
      naming = btn.dataset.id;
      nameDraft = note && note.title ? note.title : "";
      renderLayer();
      return;
    }
    if (act === "save-new") {
      createNamedNote(($("noteName") && $("noteName").value) || nameDraft);
      return;
    }
    if (act === "save-name") {
      saveNoteName(btn.dataset.id, ($("noteName") && $("noteName").value) || nameDraft);
      return;
    }
    if (act === "pin") {
      const note = data.notes.find((n) => n.id === btn.dataset.id);
      if (note) note.pinned = !note.pinned;
      persist();
      renderLayer();
      return;
    }
    if (act === "delete-note") {
      const id = btn.dataset.id;
      const note = data.notes.find((n) => n.id === id);
      ask({
        title: "Xóa ghi chú",
        message: `Xóa “${noteLabel(note)}”?`,
        confirm: "Xóa",
        danger: true,
        run: () => {
          data.notes = data.notes.filter((n) => n.id !== id);
          data.snaps = data.snaps.filter((s) => s.noteId !== id);
          if (!data.notes.length) data.notes = [makeNote("")];
          if (data.activeId === id) data.activeId = data.notes[0].id;
          persist();
          area.value = active().body;
          closePanel();
          paintChrome();
        },
      });
      return;
    }
    if (act === "upper") return transform((c) => c.toLocaleUpperCase("vi"));
    if (act === "lower") return transform((c) => c.toLocaleLowerCase("vi"));
    if (act === "title") return transform(titleCase);
    if (act === "sort") return transform(sortLines);
    if (act === "reverse") return transform(reverseLines);
    if (act === "unique") return transform(uniqueLines);
    if (act === "trim") return transform((c) => c.split("\n").map((line) => line.replace(/[ \t]+$/g, "")).join("\n").replace(/^\n+|\n+$/g, ""));
    if (act === "blank") return transform((c) => c.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n"));
    if (act === "html") return transform((c) => c.replace(/<[^>]*>/g, ""));
    if (act === "json-pretty") return formatJson(true);
    if (act === "json-min") return formatJson(false);
    if (act === "b64e") return transform(utf8ToB64);
    if (act === "b64d") return transform((c) => { try { return b64ToUtf8(c); } catch { throw new Error("Base64 không hợp lệ"); } });
    if (act === "urle") return transform((c) => encodeURIComponent(c));
    if (act === "urld") return transform((c) => { try { return decodeURIComponent(c); } catch { throw new Error("URL không hợp lệ"); } });
    if (act === "find") { closePanel(); findOpen = true; paintChrome(); $("findQuery").focus(); return; }
    if (act === "dup") {
      const note = active();
      const copy = makeNote(note.body, note.title);
      copy.codeMode = note.codeMode;
      data.notes.unshift(copy);
      data.activeId = copy.id;
      persist();
      area.value = copy.body;
      closePanel();
      paintChrome();
      toast("Đã nhân bản");
      return;
    }
    if (act === "history") return openPanel("history");
    if (act === "share") {
      const text = area.value;
      if (!text) { toast("Không có nội dung"); return; }
      if (navigator.share) {
        navigator.share({ title: titleFromBody(text), text }).catch((error) => {
          if (!(error instanceof DOMException && error.name === "AbortError")) toast("Không chia sẻ được");
        });
      } else {
        copyText(text).then((ok) => toast(ok ? "Đã copy — máy không có bảng chia sẻ" : "Không chia sẻ được"));
      }
      return;
    }
    if (act === "restore") {
      const snap = data.snaps.find((s) => s.id === btn.dataset.id);
      if (!snap) return;
      rememberSnap();
      replaceRange(0, area.value.length, snap.body, snap.body.length, snap.body.length);
      closePanel();
      toast("Đã khôi phục phiên bản");
      return;
    }
    if (act === "pick-ext") {
      const ext = btn.dataset.ext;
      const bad = formatError(ext, area.value);
      if (bad) { toast(bad); return; }
      exportExt = ext;
      exportName = fileBase(noteLabel(active()));
      renderLayer();
      return;
    }
    if (act === "export-back") { exportExt = null; renderLayer(); return; }
    if (act === "do-export") {
      const typed = ($("exportName") && $("exportName").value) || exportName;
      const bad = formatError(exportExt, area.value);
      if (bad) { toast(bad); return; }
      let base = fileBase(typed);
      if (base.toLowerCase().endsWith(String(exportExt).toLowerCase())) base = base.slice(0, -exportExt.length).trim() || "Tai_Lieu";
      const fileName = `${base}${exportExt}`;
      const mime = (EXPORTS.find((item) => item[0] === exportExt) || ["", "", "text/plain"])[2];
      const body = area.value;
      saveFile(fileName, mime, body).then((mode) => {
        closePanel();
        exportExt = null;
        toast(mode === "shared" ? "Đã mở bảng chia sẻ" : "Đã tải tệp");
      }).catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        toast("Không xuất được tệp");
      });
      return;
    }
    if (act === "send") return sendTo(btn.dataset.name || "");
    if (act === "send-custom") return sendTo(customName);
    if (act === "theme") { data.settings.theme = btn.dataset.theme; persist(); applyTheme(); renderLayer(); return; }
    if (act === "font") {
      const idx = Math.max(0, FONT_STEPS.indexOf(data.settings.fontSize));
      const next = Math.min(FONT_STEPS.length - 1, Math.max(0, idx + Number(btn.dataset.dir)));
      data.settings.fontSize = FONT_STEPS[next];
      persist();
      applyTheme();
      renderLayer();
      return;
    }
    if (act === "wrap") { data.settings.wrap = !data.settings.wrap; persist(); paintChrome(); renderLayer(); return; }
    if (act === "tabsize") { data.settings.tabSize = data.settings.tabSize === 2 ? 4 : 2; persist(); renderLayer(); return; }
    if (act === "del-shortcut") {
      const shortcuts = data.settings.shortcuts.filter((_, i) => i !== Number(btn.dataset.index));
      data.settings.shortcuts = shortcuts.length ? shortcuts : ["Commit"];
      persist();
      renderLayer();
      return;
    }
    if (act === "add-shortcut") {
      data.settings.shortcuts = data.settings.shortcuts.concat("Phím tắt mới");
      persist();
      renderLayer();
      return;
    }
    if (act === "info") return openPanel("info");
    if (act === "settings") return openPanel("settings");
  });

  function bootIcons() {
    $("btnSettings").innerHTML = ICON.settings;
    $("btnCode").innerHTML = ICON.code;
    $("btnClear").innerHTML = ICON.trash;
    $("btnCopy").innerHTML = ICON.copy;
    $("btnTools").innerHTML = ICON.braces;
    $("btnExport").innerHTML = ICON.download;
    $("btnSend").innerHTML = ICON.send;
    $("findPrev").innerHTML = ICON.chev;
    $("findPrev").style.transform = "rotate(180deg)";
    $("findNext").innerHTML = ICON.chev;
    $("findClose").innerHTML = ICON.x;
    $("btnUndo").innerHTML = ICON.undo;
    $("btnRedo").innerHTML = ICON.redo;
  }

  $("btnSettings").addEventListener("click", () => openPanel("settings"));
  $("btnNotes").addEventListener("click", () => { naming = null; nameDraft = ""; openPanel("notes"); });
  $("btnStats").addEventListener("click", () => { statMode += 1; paintChrome(); });
  $("btnCode").addEventListener("click", () => {
    const note = active();
    note.codeMode = !note.codeMode;
    persist();
    paintChrome();
  });
  $("btnTools").addEventListener("click", () => openPanel("tools"));
  $("btnExport").addEventListener("click", () => { exportExt = null; openPanel("export"); });
  $("btnSend").addEventListener("click", () => openPanel("send"));
  $("btnClear").addEventListener("click", () => ask({
    title: "Xóa nội dung",
    message: "Xóa toàn bộ văn bản trong ghi chú này? Có thể khôi phục từ lịch sử nếu đã từng lưu.",
    confirm: "Xóa",
    danger: true,
    run: () => {
      rememberSnap();
      replaceRange(0, area.value.length, "", 0, 0);
      closePanel();
      area.focus();
    },
  }));
  $("btnCopy").addEventListener("click", async () => {
    if (!area.value) { toast("Không có nội dung"); return; }
    const ok = await copyText(area.value);
    if (!ok) { toast("Không sao chép được"); return; }
    copied = true;
    paintChrome();
    setTimeout(() => { copied = false; paintChrome(); }, 1200);
    if (navigator.vibrate) navigator.vibrate(15);
  });
  $("findClose").addEventListener("click", () => { findOpen = false; paintChrome(); });
  $("findPrev").addEventListener("click", () => jumpMatch(-1));
  $("findNext").addEventListener("click", () => jumpMatch(1));
  $("findQuery").addEventListener("input", () => { query = $("findQuery").value; matchIndex = 0; paintChrome(); });
  $("findQuery").addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); jumpMatch(e.shiftKey ? -1 : 1); }
  });
  $("findReplace").addEventListener("input", () => { replacement = $("findReplace").value; });
  function doReplace(all) {
    if (!query) return;
    const matches = findMatches(area.value, query);
    const idx = Math.min(matchIndex, Math.max(matches.length - 1, 0));
    const hit = matches[idx];
    rememberSnap();
    const next = replaceMatches(area.value, query, replacement, all ? null : idx);
    const cursor = all || !hit ? next.length : hit.start + replacement.length;
    replaceRange(0, area.value.length, next, cursor, cursor);
  }
  $("replaceOne").addEventListener("click", () => doReplace(false));
  $("replaceAll").addEventListener("click", () => doReplace(true));
  document.querySelectorAll("[data-insert]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const token = btn.dataset.insert;
      if (token === "tab") {
        const text = " ".repeat(data.settings.tabSize);
        replaceRange(area.selectionStart, area.selectionEnd, text, area.selectionStart + text.length, area.selectionStart + text.length);
        return;
      }
      const start = area.selectionStart;
      replaceRange(start, area.selectionEnd, token, start + 1, start + 1);
    });
  });
  $("btnUndo").addEventListener("click", () => { area.focus(); document.execCommand("undo"); updateBody(area.value); syncCaret(); });
  $("btnRedo").addEventListener("click", () => { area.focus(); document.execCommand("redo"); updateBody(area.value); syncCaret(); });

  area.addEventListener("input", () => { updateBody(area.value); caret = { start: area.selectionStart, end: area.selectionEnd }; });
  area.addEventListener("paste", () => { tuneInput(area.value); });
  area.addEventListener("keyup", syncCaret);
  area.addEventListener("click", syncCaret);
  area.addEventListener("select", syncCaret);
  area.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") { e.preventDefault(); findOpen = true; paintChrome(); $("findQuery").focus(); return; }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") { e.preventDefault(); toast("Đã lưu"); return; }
    const plan = planKey(e, area.value, area.selectionStart, area.selectionEnd);
    if (!plan) return;
    e.preventDefault();
    if (plan.text === "" && plan.from === plan.to) {
      area.setSelectionRange(plan.selStart, plan.selEnd);
      syncCaret();
      return;
    }
    replaceRange(plan.from, plan.to, plan.text, plan.selStart, plan.selEnd);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (panel) closePanel();
    else if (findOpen) { findOpen = false; paintChrome(); }
  });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { if (data.settings.theme === "system") applyTheme(); });

  data = loadAll();
  persist();
  bootIcons();
  area.value = active().body;
  tuneInput(area.value);
  applyTheme();
  paintChrome();
  if (data.fromLink) toast("Đã nhận văn bản từ liên kết");
})();
