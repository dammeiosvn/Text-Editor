const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const vi = JSON.parse(read('Language/vi-VN.json'));
const en = JSON.parse(read('Language/en-GB.json'));

test('language catalogs cover every code/HTML key and have matching placeholders', () => {
  assert.deepEqual(Object.keys(vi).sort(), Object.keys(en).sort());
  const keys = new Set();
  for (const file of ['js/app.js','js/storage.js']) {
    for (const hit of read(file).matchAll(/\bt\(["']([a-z_]+)["']/g)) keys.add(hit[1]);
  }
  for (const hit of read('index.html').matchAll(/data-i18n(?:-[a-z-]+)?="([a-z_]+)"/g)) keys.add(hit[1]);
  for (const hit of read('js/app.js').matchAll(/\["\.[a-z]+", "([a-z_]+)"/g)) keys.add(hit[1]);
  for (const key of ['on','off']) keys.add(key);
  for (const key of keys) assert.equal(typeof vi[key], 'string', 'Missing key: ' + key);
  for (const key of Object.keys(vi)) {
    assert.ok(vi[key].trim() && en[key].trim(), 'Empty translation: ' + key);
    const tokens = text => [...text.matchAll(/\{(\w+)\}/g)].map(hit => hit[1]).sort();
    assert.deepEqual(tokens(vi[key]), tokens(en[key]), 'Placeholder mismatch: ' + key);
  }
  console.log(`${keys.size} runtime keys covered; ${Object.keys(vi).length} keys per catalog`);
});

test('generated fallback matches canonical vi-VN.json exactly and substitutes parameters literally', () => {
  const context = {window:{}}; vm.createContext(context);
  vm.runInContext(read('js/vi-VN.js'), context); vm.runInContext(read('js/i18n.js'), context);
  assert.deepEqual(JSON.parse(JSON.stringify(context.window.QTEFallback)), vi);
  assert.equal(context.window.QTEI18n.t('stats_chars_words', {chars:10,words:2}), '10 ký tự · 2 từ');
  assert.equal(context.window.QTEI18n.t('note_delete_confirm', {title:'$& {words}'}), 'Xóa “$& {words}”?');
  assert.throws(() => context.window.QTEI18n.t('missing_key'), /Missing translation/);
});
