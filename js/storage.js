/* Keep large notes and snapshots out of synchronous localStorage writes. */
window.QTEStorage = (() => {
  let db;
  let queue = Promise.resolve();
  let savedNotes = new Map();
  let savedSnaps;
  function request(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  function complete(tx) {
    return new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onabort = () => reject(tx.error || new Error(QTEI18n.t('storage_transaction_failed')));
      tx.onerror = () => {}; // onabort owns the failure, including quota errors.
    });
  }
  async function load() {
    if (db) db.close();
    const req = indexedDB.open('qte-editor', 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('notes', { keyPath: 'id' });
      req.result.createObjectStore('meta');
    };
    db = await request(req);
    db.onversionchange = () => { db.close(); db = null; };
    const tx = db.transaction(['notes', 'meta'], 'readonly');
    const done = complete(tx);
    const [notes, meta, snaps] = await Promise.all([
      request(tx.objectStore('notes').getAll()), request(tx.objectStore('meta').get('current')),
      request(tx.objectStore('meta').get('snaps')),
    ]);
    await done;
    savedNotes = new Map(notes.map(n => [n.id, { ...n }]));
    savedSnaps = snaps || [];
    return meta ? { ...meta, notes, snaps: savedSnaps } : null;
  }
  function save(data) {
    const snapshot = {
      notes: data.notes.map(n => ({ ...n })),
      settings: { ...data.settings, shortcuts: data.settings.shortcuts.slice() },
      activeId: data.activeId, snaps: data.snaps,
    };
    const task = queue.then(async () => {
      if (!db) throw new Error(QTEI18n.t('storage_not_ready'));
      const tx = db.transaction(['notes', 'meta'], 'readwrite');
      const done = complete(tx);
      const notes = tx.objectStore('notes');
      const next = new Map(snapshot.notes.map(n => [n.id, n]));
      for (const n of snapshot.notes) {
        const old = savedNotes.get(n.id);
        if (!old || Object.keys(n).some(key => n[key] !== old[key])) notes.put(n);
      }
      for (const id of savedNotes.keys()) if (!next.has(id)) notes.delete(id);
      const meta = tx.objectStore('meta');
      // Snapshots are written only when history changes, not on every keystroke.
      if (snapshot.snaps !== savedSnaps) meta.put(snapshot.snaps, 'snaps');
      meta.put({ activeId: snapshot.activeId, settings: snapshot.settings }, 'current');
      await done;
      savedNotes = next;
      savedSnaps = snapshot.snaps;
    });
    queue = task.catch(() => {});
    return task;
  }
  return { load, save };
})();
