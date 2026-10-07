const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
let server, browser, page, base;
const errors = [];
async function boot(suffix = '') {
  await page.goto(base + suffix);
  await page.waitForFunction(() => !document.querySelector('#mainEditor').disabled && document.querySelector('#btnTools svg'));
}
async function fresh(seed) {
  await boot();
  await page.evaluate(async () => {
    localStorage.clear();
    await new Promise((resolve, reject) => {
      const req = indexedDB.open('qte-editor', 1);
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(['notes', 'meta'], 'readwrite');
        tx.objectStore('notes').clear(); tx.objectStore('meta').clear();
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
    });
  });
  if (seed) await page.evaluate(seed => { for (const [key, value] of Object.entries(seed)) localStorage.setItem(key, value); }, seed);
  await boot();
  await page.waitForFunction(() => document.querySelector('#btnStats').textContent === 'Đã lưu');
}
async function stored() {
  return page.evaluate(async () => {
    const data = await QTEStorage.load();
    return { ...data, legacyNotes: localStorage.getItem('qte.notes.v1'), legacySnaps: localStorage.getItem('qte.snaps.v1') };
  });
}
async function tool(act) {
  await page.locator('#btnTools').click();
  await page.locator(`[data-act="${act}"]`).click();
}
before(async () => {
  server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.join(root, pathname === '/' ? 'index.html' : pathname);
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    try {
      res.setHeader('Content-Type', file.endsWith('.js') ? 'application/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.json') ? 'application/json' : 'text/html');
      res.end(fs.readFileSync(file));
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--no-zygote', '--single-process'],
  });
  page = await browser.newPage({ acceptDownloads: true });
  page.on('pageerror', error => errors.push(error.message));
});
after(async () => { await browser?.close(); await new Promise(resolve => server?.close(resolve)); });

test('legacy notes/history migrate atomically and survive reload; incoming Unicode gets its own note', async () => {
  const note = { id: 'old', title: 'Ghi chú cũ', body: 'Tiếng Việt 👋', updatedAt: Date.now(), codeMode: true, pinned: true };
  await fresh({
    'qte.notes.v1': JSON.stringify([note]), 'qte.active.v1': 'old',
    'qte.snaps.v1': JSON.stringify([{ id: 'snap', noteId: 'old', body: 'Bản trước', at: Date.now() }]),
    'qte.settings.v1': JSON.stringify({ theme: 'dark', fontSize: 20, shortcuts: ['Lưu tệp'] }),
  });
  let data = await stored();
  assert.equal(data.notes[0].body, note.body); assert.equal(data.snaps[0].body, 'Bản trước');
  assert.equal(data.legacyNotes, null); assert.equal(data.legacySnaps, null);
  await boot('/?text=' + encodeURIComponent('Nội dung mới 🎉'));
  assert.equal(await page.locator('#mainEditor').inputValue(), 'Nội dung mới 🎉');
  await page.waitForFunction(() => document.querySelector('#btnStats').textContent === 'Đã lưu');
  assert.equal((await stored()).notes.length, 2);
  await boot(); assert.equal(await page.locator('#mainEditor').inputValue(), 'Nội dung mới 🎉');
  assert.equal(await page.evaluate(() => location.search), '');
});

test('editing, selection tools, native undo/redo, code pairing and history restore', async () => {
  await fresh();
  await page.locator('#mainEditor').fill('xin chào Sếp');
  await page.locator('#mainEditor').evaluate(el => el.setSelectionRange(0, 8));
  await tool('upper');
  assert.equal(await page.locator('#mainEditor').inputValue(), 'XIN CHÀO Sếp');
  await page.locator('#btnCode').click();
  await page.locator('#btnUndo').click(); assert.equal(await page.locator('#mainEditor').inputValue(), 'xin chào Sếp');
  await page.locator('#btnRedo').click(); assert.equal(await page.locator('#mainEditor').inputValue(), 'XIN CHÀO Sếp');
  await page.locator('#mainEditor').fill(''); await page.locator('#mainEditor').press('(');
  assert.equal(await page.locator('#mainEditor').inputValue(), '()');
  await page.locator('#mainEditor').press('Backspace'); assert.equal(await page.locator('#mainEditor').inputValue(), '');
  await page.locator('#mainEditor').fill('a\nb'); await page.locator('#mainEditor').evaluate(el => el.setSelectionRange(0, 3));
  await page.locator('#mainEditor').press('Tab'); assert.equal(await page.locator('#mainEditor').inputValue(), '    a\n    b');
  await page.locator('#mainEditor').press('Shift+Tab'); assert.equal(await page.locator('#mainEditor').inputValue(), 'a\nb');
  await page.locator('#mainEditor').fill('  {'); await page.locator('#mainEditor').press('End'); await page.locator('#mainEditor').press('Enter');
  assert.equal(await page.locator('#mainEditor').inputValue(), '  {\n      ');
  await tool('history');
  await page.locator('[data-act="restore"]').first().click();
  assert.equal(await page.locator('#mainEditor').inputValue(), 'xin chào Sếp');
  await page.waitForTimeout(700); await boot(); assert.equal(await page.locator('#mainEditor').inputValue(), 'xin chào Sếp');
});

test('literal Unicode find/replace replaces all 1,200 occurrences and remains undoable', async () => {
  await fresh();
  await page.locator('#mainEditor').fill('İ ' + 'a.b '.repeat(1200));
  await tool('find'); await page.locator('#findQuery').fill('a.b');
  assert.equal(await page.locator('#findCount').textContent(), '1/1200');
  await page.locator('#findReplace').fill('Sếp'); await page.locator('#replaceAll').click();
  assert.equal(await page.locator('#mainEditor').inputValue(), 'İ ' + 'Sếp '.repeat(1200));
  await page.locator('#findClose').click(); await page.locator('#btnCode').click();
  await page.locator('#btnUndo').click(); assert.equal(await page.locator('#mainEditor').inputValue(), 'İ ' + 'a.b '.repeat(1200));
});

test('notes filter keeps the same input, focus and composition; titles open notes', async () => {
  await fresh({ 'qte.notes.v1': JSON.stringify([
    { id: 'one', title: 'Sếp', body: 'Một', updatedAt: 2 },
    { id: 'two', title: 'Khác', body: 'Hai', updatedAt: 1 },
  ]) });
  await page.locator('#btnNotes').click();
  await page.locator('#noteQuery').evaluate(el => { window.originalInput = el; el.focus(); });
  await page.locator('#noteQuery').fill('Sếp'); await page.waitForTimeout(160);
  assert.equal(await page.evaluate(() => document.getElementById('noteQuery') === window.originalInput && document.activeElement === window.originalInput), true);
  assert.equal(await page.locator('#noteResults .note-row').count(), 1);
  await page.locator('#noteQuery').evaluate(el => {
    el.value = 'Khác'; el.dispatchEvent(new CompositionEvent('compositionstart'));
    el.dispatchEvent(new InputEvent('input', { bubbles:true, isComposing:true, data:'Khác' }));
  });
  await page.waitForTimeout(160);
  assert.equal(await page.locator('#noteResults .row-label').textContent(), 'Sếp');
  await page.locator('#noteQuery').evaluate(el => el.dispatchEvent(new CompositionEvent('compositionend', {bubbles:true})));
  await page.waitForTimeout(160);
  assert.equal(await page.locator('#noteResults .row-label').textContent(), 'Khác');
  await page.locator('#noteQuery').fill('Sếp'); await page.waitForTimeout(160);
  await page.locator('.row-label[data-act="open-note"]').click();
  assert.equal(await page.locator('#mainEditor').inputValue(), 'Một');
  await page.locator('#btnNotes').click(); await page.locator('[data-act="new-note"]').click();
  await page.locator('#noteName').fill('Mới'); await page.locator('[data-act="save-new"]').click();
  await page.locator('#mainEditor').fill('Bản mới'); await page.waitForTimeout(700);
  await boot(); assert.equal(await page.locator('#mainEditor').inputValue(), 'Bản mới');
});

test('exports valid JavaScript drafts exactly; JSON and plist XML reject invalid input', async () => {
  await fresh(); const js = '// unmatched { in a comment\nconst r = /}/;\nexport default `hello ${1}`;';
  await page.locator('#mainEditor').fill(js); await page.locator('#btnExport').click();
  await page.locator('[data-ext=".js"]').click(); await page.locator('#exportName').fill('test.js');
  const downloadPromise = page.waitForEvent('download'); await page.locator('[data-act="do-export"]').click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(), 'test.js');
  assert.equal(fs.readFileSync(await download.path(), 'utf8'), js);
  await page.locator('#mainEditor').fill('{broken'); await page.locator('#btnExport').click(); await page.locator('[data-ext=".json"]').click();
  assert.match(await page.locator('#toast').textContent(), /JSON không hợp lệ/);
  await page.keyboard.press('Escape'); await page.locator('#mainEditor').fill('<?xml version="1.0"?><plist><dict></plist>');
  await page.locator('#btnExport').click(); await page.locator('[data-ext=".mobileconfig"]').click();
  assert.match(await page.locator('#toast').textContent(), /XML plist/); await page.keyboard.press('Escape');
});

test('save failure never shows saved or deletes legacy data; malformed incoming hash does not crash boot', async () => {
  await fresh();
  await page.evaluate(() => { QTEStorage.save = async () => { throw new Error('quota'); }; });
  await page.locator('#mainEditor').fill('Chưa lưu'); await page.waitForTimeout(800);
  assert.equal(await page.locator('#btnStats').textContent(), 'Chưa lưu');
  assert.match(await page.locator('#toast').textContent(), /Không lưu được/);
  await page.locator('#mainEditor').press('Control+s'); await page.waitForTimeout(50);
  assert.match(await page.locator('#toast').textContent(), /Không lưu được/);
  await boot('/?malformed=1#text=%E0%A4%A');
  assert.ok(await page.locator('#btnTools svg').count());
  assert.match(await page.locator('#toast').textContent(), /không hợp lệ/);
});

test('failed migration preserves localStorage; visibility flush saves without waiting for debounce', async () => {
  await fresh();
  await page.evaluate(async () => {
    const req = indexedDB.open('qte-editor', 1);
    await new Promise(resolve => { req.onsuccess = resolve; });
    const tx = req.result.transaction(['notes','meta'], 'readwrite');
    tx.objectStore('notes').clear(); tx.objectStore('meta').clear();
    await new Promise(resolve => { tx.oncomplete = resolve; }); req.result.close();
    localStorage.setItem('qte.notes.v1', JSON.stringify([{id:'safe', body:'Giữ bản cũ', title:'Cũ', updatedAt:1}]));
    localStorage.setItem('qte.snaps.v1', JSON.stringify([{id:'s', noteId:'safe', body:'Lịch sử cũ', at:1}]));
  });
  await page.route('**/js/storage.js*', route => route.fulfill({
    contentType: 'application/javascript',
    body: fs.readFileSync(path.join(root, 'js/storage.js'), 'utf8') + '\nQTEStorage.save = async () => { throw new Error("quota"); };',
  }));
  await boot(); await page.waitForTimeout(100);
  assert.equal(await page.locator('#mainEditor').inputValue(), 'Giữ bản cũ');
  assert.ok(await page.evaluate(() => localStorage.getItem('qte.notes.v1')));
  assert.ok(await page.evaluate(() => localStorage.getItem('qte.snaps.v1')));
  assert.equal(await page.locator('#btnStats').textContent(), 'Chưa lưu');
  await page.unroute('**/js/storage.js*'); await boot();
  await page.waitForFunction(() => document.querySelector('#btnStats').textContent === 'Đã lưu');
  await page.locator('#mainEditor').fill('Chuyển ứng dụng');
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, value:'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForFunction(() => document.querySelector('#btnStats').textContent === 'Đã lưu');
  assert.equal((await stored()).notes[0].body, 'Chuyển ứng dụng');
});

test('long Shortcut text refuses navigation when clipboard fails', async () => {
  await fresh(); await page.locator('#mainEditor').fill('a'.repeat(3000));
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable:true, value:{writeText:async()=>{throw new Error('denied');}} });
    const exec = document.execCommand.bind(document);
    document.execCommand = (command, ...args) => command === 'copy' ? false : exec(command, ...args);
  });
  const url = page.url(); await page.locator('#btnSend').click(); await page.locator('[data-act="send"]').first().click();
  assert.match(await page.locator('#toast').textContent(), /Chưa mở Phím tắt/);
  assert.equal(page.url(), url); await page.keyboard.press('Escape');
});

test('large notes: input and caret callbacks stay cheap; heavy text disables spellcheck; IDB reload retains > localStorage quota', async () => {
  await fresh();
  const costs = await page.evaluate(() => {
    const e = document.getElementById('mainEditor'); e.value = 'alpha beta gamma\n'.repeat(65536);
    let t = performance.now(); e.dispatchEvent(new Event('input')); const inputMs = performance.now() - t;
    t = performance.now(); for (let i = 0; i < 30; i++) { e.setSelectionRange(e.value.length - i, e.value.length - i); e.dispatchEvent(new Event('keyup')); }
    return { inputMs, caret30Ms: performance.now() - t };
  });
  console.log('1.1M-character callback costs:', costs);
  assert.ok(costs.inputMs < 25); assert.ok(costs.caret30Ms < 50);
  await page.waitForTimeout(750);
  assert.equal(await page.locator('#mainEditor').evaluate(el => el.spellcheck), false);
  assert.equal((await stored()).notes[0].body.length, 1114112);
  await page.waitForFunction(() => document.querySelector('#btnStats').textContent.endsWith('196608 từ'));
  await page.locator('#btnStats').click();
  assert.equal(await page.locator('#btnStats').textContent(), '65537 dòng · 894 phút đọc');
  await page.locator('#mainEditor').evaluate(el => { el.value = 'x'.repeat(6 * 1024 * 1024); el.dispatchEvent(new Event('input')); });
  await page.waitForFunction(() => document.querySelector('#btnStats').textContent === 'Đã lưu', { timeout: 10000 });
  await boot(); assert.equal((await page.locator('#mainEditor').inputValue()).length, 6 * 1024 * 1024);
});

test('responsive phone/iPad/Split View/landscape and keyboard-height windows fit usable controls; dialogs contain focus', async () => {
  await fresh();
  for (const [name, width, height] of [['phone',390,844],['small',320,568],['ipad',820,1180],['ipad-landscape',1180,820],['split',600,1000],['landscape',667,375],['keyboard',390,300]]) {
    await page.setViewportSize({ width, height }); await page.waitForTimeout(60);
    const box = await page.locator('#mainEditor').boundingBox(); assert.ok(box.x >= 0 && box.x + box.width <= width + 1, name + ' editor width');
    for (const id of ['btnSettings','btnCode','btnClear','btnCopy','btnTools','btnExport','btnSend']) {
      const b = await page.locator('#' + id).boundingBox(); assert.ok(b.width >= 44 && b.height >= 44 && b.y + b.height <= height + 1, name + ' ' + id);
    }
    await page.locator('#btnSettings').click();
    const modal = await page.locator('.modal').boundingBox(); assert.ok(modal.x >= 0 && modal.x + modal.width <= width + 1 && modal.y + modal.height <= height + 1, name + ' modal bounds');
    assert.equal(await page.locator('#mainEditor').evaluate(el => el.parentElement.inert), true);
    await page.locator('#layer button').last().focus(); await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.closest('#layer') != null), true);
    await page.locator('.can-scroll').evaluate(el => { el.scrollTop = 0; });
    await page.waitForTimeout(280);
    await page.screenshot({ path: `/tmp/text-v1.2-${name}.png` }); await page.keyboard.press('Escape');
    await tool('find'); const field = await page.locator('#findQuery').boundingBox(); assert.ok(field.width >= 70, name + ' find field');
    await page.locator('#findClose').click();
  }
  assert.deepEqual(errors, []);
});
