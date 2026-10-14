const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium, webkit } = require('playwright');
const browserType = process.env.PLAYWRIGHT_BROWSER === 'webkit' ? webkit : chromium;
const root = path.resolve(__dirname, '..');
let server, browser, base;

before(async () => {
  server = http.createServer((req, res) => {
    const file = path.join(root, new URL(req.url, 'http://localhost').pathname.replace(/^\/$/, '/index.html'));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    try {
      res.setHeader('Content-Type', file.endsWith('.js') ? 'application/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.json') ? 'application/json' : 'text/html');
      res.end(fs.readFileSync(file));
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await browserType.launch({
    executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined,
    args: browserType === chromium ? ['--no-sandbox', '--disable-dev-shm-usage'] : [],
  });
});
after(async () => { await browser?.close(); await new Promise(resolve => server?.close(resolve)); });

async function open(t, seed = {}, init) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  t.after(() => context.close());
  await context.addInitScript(seed => {
    for (const [key, value] of Object.entries(seed)) localStorage.setItem(key, JSON.stringify(value));
  }, seed);
  if (init) await context.addInitScript(init);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  t.after(() => assert.deepEqual(errors, []));
  await page.goto(base);
  await page.waitForFunction(() => !document.querySelector('#mainEditor').disabled && document.querySelector('#btnTools svg'));
  return page;
}
const codeSeed = {
  'qte.notes.v1': [{ id: 'code', title: 'Code', body: '', updatedAt: 1, codeMode: true }],
  'qte.settings.v1': { fontSize: 16 },
};
async function observeEditor(page) {
  await page.locator('#mainEditor').evaluate(el => {
    window.keyboardMutations = [];
    new MutationObserver(records => window.keyboardMutations.push(...records.map(r => r.attributeName)))
      .observe(el, { attributes: true, attributeFilter: ['autocorrect', 'autocapitalize', 'spellcheck', 'inputmode'] });
  });
}
async function composingEnter(page, selector) {
  return page.locator(selector).evaluate(el => {
    el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    el.dispatchEvent(event);
    return { prevented: event.defaultPrevented, connected: el.isConnected, focused: document.activeElement === el };
  });
}

test('typing letters, numbers, symbols and pasting long text keep keyboard traits stable until blur', async t => {
  const page = await open(t);
  const editor = page.locator('#mainEditor');
  await editor.focus(); await observeEditor(page);
  for (const text of ['Sếp ', '12345 ', '!@#$% ', 'x'.repeat(80)]) {
    await page.keyboard.insertText(text);
    await page.waitForTimeout(160);
  }
  assert.deepEqual(await page.evaluate(() => window.keyboardMutations), []);
  await editor.evaluate(el => {
    const clipboard = new DataTransfer(); clipboard.setData('text/plain', 'Z'.repeat(100001));
    el.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, clipboardData: clipboard }));
    el.value += clipboard.getData('text/plain');
    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertFromPaste' }));
  });
  await page.waitForTimeout(180);
  // Only spelling is disabled once before the large paste; inputmode,
  // autocorrect and autocapitalize must stay untouched while focused.
  assert.deepEqual(await page.evaluate(() => window.keyboardMutations), ['spellcheck']);
  assert.equal(await editor.evaluate(el => document.activeElement === el), true);
  await editor.evaluate(el => el.blur());
  assert.equal(await editor.getAttribute('autocorrect'), 'off');
  assert.equal(await editor.evaluate(el => el.spellcheck), false);
  await editor.focus(); await page.evaluate(() => { window.keyboardMutations = []; });
  await editor.fill('Tiếng Việt 123 !@#'); await page.waitForTimeout(180);
  assert.deepEqual(await page.evaluate(() => window.keyboardMutations), []);
  await editor.evaluate(el => el.blur());
  assert.equal(await editor.getAttribute('autocorrect'), 'on');
  assert.equal(await editor.evaluate(el => el.spellcheck), true);
});

test('code really disables autocorrection and never rewrites unchanged keyboard attributes', async t => {
  const page = await open(t, codeSeed);
  const editor = page.locator('#mainEditor');
  assert.equal(await editor.getAttribute('autocorrect'), 'off');
  assert.equal(await editor.getAttribute('autocapitalize'), 'none');
  assert.equal(await editor.evaluate(el => el.spellcheck), false);
  if (await editor.evaluate(el => typeof el.autocorrect === 'boolean')) {
    assert.equal(await editor.evaluate(el => el.autocorrect), false);
  }
  await observeEditor(page);
  await editor.evaluate(el => {
    el.value = 'const n = 123;';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(180);
  assert.deepEqual(await page.evaluate(() => window.keyboardMutations), []);
  await editor.focus();
  const toggled = await editor.evaluate(el => {
    el.setSelectionRange(3, 5);
    document.getElementById('btnCode').click();
    const plain = el.getAttribute('autocorrect');
    document.getElementById('btnCode').click();
    return { plain, code: el.getAttribute('autocorrect'), focused: document.activeElement === el,
      selection: [el.selectionStart, el.selectionEnd], value: el.value };
  });
  assert.deepEqual(toggled, { plain: 'on', code: 'off', focused: true, selection: [3, 5], value: 'const n = 123;' });
});

test('IME composition and Safari keyCode 229 bypass code helpers and editor shortcuts', async t => {
  const page = await open(t, codeSeed);
  const editor = page.locator('#mainEditor');
  await editor.focus(); await observeEditor(page);
  const during = await editor.evaluate(el => {
    el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    const results = [];
    for (const options of [{ key: '(' }, { key: 'Enter' }, { key: 'f', ctrlKey: true }, { key: 'Tab' }]) {
      const event = new KeyboardEvent('keydown', { ...options, bubbles: true, cancelable: true });
      el.dispatchEvent(event); results.push(event.defaultPrevented);
    }
    el.value = 'Tiếng Việt';
    el.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true, data: 'Việt' }));
    return { prevented: results, value: el.value, focused: document.activeElement === el };
  });
  assert.deepEqual(during, { prevented: [false, false, false, false], value: 'Tiếng Việt', focused: true });
  await page.waitForTimeout(180);
  assert.deepEqual(await page.evaluate(() => window.keyboardMutations), []);
  await editor.evaluate(el => {
    el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: 'Việt' }));
    el.dispatchEvent(new InputEvent('input', { bubbles: true, data: 'Việt' }));
  });
  const legacy = await editor.evaluate(el => {
    const event = new KeyboardEvent('keydown', { key: 'Enter', keyCode: 229, bubbles: true, cancelable: true });
    el.dispatchEvent(event); return { prevented: event.defaultPrevented, value: el.value };
  });
  assert.deepEqual(legacy, { prevented: false, value: 'Tiếng Việt' });
  await page.waitForTimeout(750);
  assert.equal(await page.evaluate(async () => (await QTEStorage.load()).notes[0].body), 'Tiếng Việt');
  await editor.press('(');
  assert.equal(await editor.inputValue(), 'Tiếng Việt()');
});

test('note creation focuses synchronously and Enter only submits after name composition ends', async t => {
  const page = await open(t);
  await page.locator('#btnNotes').click();
  const nameFocus = await page.evaluate(() => {
    document.querySelector('[data-act="new-note"]').click();
    return document.activeElement.id;
  });
  assert.equal(nameFocus, 'noteName');
  await page.locator('#noteName').fill('Sếp 123');
  assert.deepEqual(await composingEnter(page, '#noteName'), { prevented: false, connected: true, focused: true });
  const editorFocus = await page.locator('#noteName').evaluate(el => {
    el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    return document.activeElement.id;
  });
  assert.equal(editorFocus, 'mainEditor');
  assert.equal(await page.locator('#noteTitle').textContent(), 'Sếp 123');
  await page.keyboard.insertText('Đã tạo');
  assert.equal(await page.locator('#mainEditor').inputValue(), 'Đã tạo');
});

test('composing Enter does not navigate to Shortcuts or move focus out of find input', async t => {
  const page = await open(t);
  await page.route('**/js/app.js*', route => route.fulfill({
    contentType: 'application/javascript',
    body: fs.readFileSync(path.join(root, 'js/app.js'), 'utf8').replace('location.href = href;', 'window.capturedShortcutURL = href;'),
  }));
  await page.reload();
  await page.waitForFunction(() => !document.querySelector('#mainEditor').disabled && document.querySelector('#btnTools svg'));
  await page.locator('#mainEditor').fill('Sếp 123'); await page.locator('#btnSend').click();
  await page.locator('#customName').fill('Phím tắt');
  assert.deepEqual(await composingEnter(page, '#customName'), { prevented: false, connected: true, focused: true });
  assert.equal(await page.evaluate(() => window.capturedShortcutURL), undefined);
  await page.locator('#customName').evaluate(el => el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true })));
  await page.keyboard.press('Escape');
  await page.locator('#btnTools').click(); await page.locator('[data-act="find"]').click();
  await page.locator('#findQuery').fill('Sếp');
  assert.deepEqual(await composingEnter(page, '#findQuery'), { prevented: false, connected: true, focused: true });
});

test('viewport resize/scroll follows keyboard panning without forcing document scroll or refocusing', async t => {
  const page = await open(t, {}, () => {
    const viewport = new EventTarget();
    Object.assign(viewport, { height: 844, width: 390, offsetTop: 0, offsetLeft: 0, scale: 1 });
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport });
    Object.defineProperty(window, 'scrollY', { configurable: true, get: () => 72 });
    window.forcedScrolls = 0;
    window.scrollTo = () => { window.forcedScrolls++; };
  });
  await page.locator('#mainEditor').focus();
  await page.evaluate(() => {
    window.forcedScrolls = 0;
    Object.assign(window.visualViewport, { height: 430, offsetTop: 42 });
    for (let i = 0; i < 20; i++) {
      window.visualViewport.dispatchEvent(new Event('resize'));
      window.visualViewport.dispatchEvent(new Event('scroll'));
      window.dispatchEvent(new Event('scroll'));
    }
  });
  await page.waitForTimeout(60);
  assert.deepEqual(await page.evaluate(() => ({
    scrolls: window.forcedScrolls, focused: document.activeElement.id,
    height: document.documentElement.style.getPropertyValue('--app-h'),
    top: document.documentElement.style.getPropertyValue('--app-top'),
  })), { scrolls: 0, focused: 'mainEditor', height: '430px', top: '42px' });
});

test('smallest code font stays at least 16px and symbol/undo buttons preserve editor focus and selection', async t => {
  const page = await open(t, codeSeed);
  const editor = page.locator('#mainEditor');
  assert.ok(await editor.evaluate(el => parseFloat(getComputedStyle(el).fontSize) >= 16));
  await editor.fill('let x = Sếp;');
  await editor.evaluate(el => {
    el.setSelectionRange(8, 11);
    window.editorBlurs = 0;
    el.addEventListener('blur', () => window.editorBlurs++);
  });
  await page.locator('[data-insert="()"]').tap();
  assert.equal(await editor.inputValue(), 'let x = (Sếp);');
  assert.deepEqual(await editor.evaluate(el => [el.selectionStart, el.selectionEnd]), [9, 12]);
  assert.equal(await page.evaluate(() => window.editorBlurs), 0);
  await page.locator('#btnUndo').tap();
  assert.equal(await editor.inputValue(), 'let x = Sếp;');
  assert.equal(await page.evaluate(() => window.editorBlurs), 0);
  await editor.evaluate(el => el.setSelectionRange(8, 11));
  await page.locator('[data-insert="()"]').click();
  assert.equal(await editor.inputValue(), 'let x = (Sếp);');
  await page.locator('#btnUndo').click();
  assert.equal(await editor.inputValue(), 'let x = Sếp;');
  assert.equal(await page.evaluate(() => window.editorBlurs), 0);
});

test('a pending notes filter waits for composition before updating results', async t => {
  const page = await open(t, { 'qte.notes.v1': [
    { id: 'one', title: 'Sếp', body: 'Một', updatedAt: 2 },
    { id: 'two', title: 'Khác', body: 'Hai', updatedAt: 1 },
  ] });
  await page.locator('#btnNotes').click();
  await page.locator('#noteQuery').fill('S');
  await page.locator('#noteQuery').evaluate(el => {
    el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    el.value = 'Khác';
    el.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true }));
  });
  await page.waitForTimeout(180);
  assert.equal(await page.locator('#noteResults .note-row').count(), 2);
  await page.locator('#noteQuery').evaluate(el => el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true })));
  await page.waitForTimeout(180);
  assert.equal(await page.locator('#noteResults .row-label').textContent(), 'Khác');
});
