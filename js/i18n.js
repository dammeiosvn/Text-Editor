/* The JSON catalog is authoritative; its generated copy keeps boot usable if fetch fails. */
window.QTEI18n = (() => {
  let strings = window.QTEFallback;
  function t(key, params = {}) {
    if (typeof strings[key] !== 'string') throw new Error(`Missing translation: ${key}`);
    return strings[key].replace(/\{(\w+)\}/g, (match, name) =>
      Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match);
  }
  async function init() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    try {
      const response = await fetch('Language/vi-VN.json?v=1.2.1', { signal: controller.signal });
      if (!response.ok) throw new Error('Catalog unavailable');
      const catalog = await response.json();
      const valid = Object.fromEntries(Object.entries(catalog).filter(([,value]) => typeof value === 'string'));
      strings = Object.assign(Object.create(null), window.QTEFallback, valid);
    } catch { strings = window.QTEFallback; }
    finally { clearTimeout(timeout); }
  }
  function apply(root) {
    root.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.dataset.i18n, { chars: 0, words: 0 });
    });
    for (const attr of ['aria-label', 'placeholder']) {
      root.querySelectorAll(`[data-i18n-${attr}]`).forEach(el => {
        el.setAttribute(attr, t(el.getAttribute(`data-i18n-${attr}`)));
      });
    }
  }
  return { t, init, apply };
})();
