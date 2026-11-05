// The ONLY module that touches localStorage.
//
// Data is a set of collections ("kinds") of records keyed by id. Every record
// has: id, createdAt, updatedAt (ISO strings). Deleting leaves a tombstone
// ({deleted: true}) instead of removing the record, so a future sync layer can
// propagate deletes with "latest updatedAt wins" per record.
//
// To add server sync later, wrap or replace this module; keep the same API.
(function () {
  const HG = window.HG;
  // Demo mode (index.html?demo) keeps its data under a separate key.
  // Turned on by ?demo in the address, or by the in-app switch (a remembered
  // flag, which also works where the address can't carry ?demo).
  const MODE_KEY = 'habitGarden.mode';
  let demoFlag = false;
  try { demoFlag = localStorage.getItem(MODE_KEY) === 'demo'; } catch (_) {}
  HG.isDemo = new URLSearchParams(location.search).has('demo') || demoFlag;
  HG.setDemoMode = (on) => {
    try { on ? localStorage.setItem(MODE_KEY, 'demo') : localStorage.removeItem(MODE_KEY); } catch (_) {}
  };
  const KEY = HG.isDemo ? 'habitGarden.demo.v1' : 'habitGarden.v1';
  const SCHEMA = 1;
  const KINDS = ['rhythms', 'logs', 'dragons', 'steps', 'treats'];

  let db = null;
  const listeners = new Set();

  function emptyDb() {
    const t = HG.nowIso();
    const d = { schema: SCHEMA, settings: { id: 'settings', createdAt: t, updatedAt: t } };
    KINDS.forEach((k) => (d[k] = {}));
    return d;
  }

  function normalize(raw) {
    const base = emptyDb();
    if (!raw || typeof raw !== 'object') return base;
    if (raw.settings && typeof raw.settings === 'object') Object.assign(base.settings, raw.settings);
    KINDS.forEach((k) => {
      if (raw[k] && typeof raw[k] === 'object' && !Array.isArray(raw[k])) base[k] = raw[k];
    });
    return base;
  }

  function load() {
    if (db) return db;
    let raw = null;
    try {
      raw = localStorage.getItem(KEY);
    } catch (e) {
      console.warn('localStorage unavailable', e);
    }
    if (raw) {
      try {
        db = normalize(JSON.parse(raw));
      } catch (e) {
        // Never silently overwrite data we can't read: park it under another key.
        console.error('Stored data unreadable; keeping a copy', e);
        try { localStorage.setItem(KEY + '.unreadable-' + Date.now(), raw); } catch (_) {}
        db = null;
      }
    }
    if (!db) db = emptyDb();
    return db;
  }

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
    } catch (e) {
      console.error('Saving failed', e);
      alert('Could not save. Your browser storage may be full or blocked.');
    }
    listeners.forEach((fn) => fn());
  }

  function assertKind(kind) {
    if (!KINDS.includes(kind)) throw new Error('Unknown kind: ' + kind);
  }

  const copy = (r) => (r ? { ...r } : null);

  const store = {
    KINDS,

    // Live records of a kind. Archived ones are hidden unless asked for.
    list(kind, { includeArchived = false } = {}) {
      assertKind(kind);
      return Object.values(load()[kind])
        .filter((r) => !r.deleted && (includeArchived || !r.archived))
        .map(copy);
    },

    get(kind, id) {
      assertKind(kind);
      const r = load()[kind][id];
      return r && !r.deleted ? copy(r) : null;
    },

    create(kind, fields = {}) {
      assertKind(kind);
      const t = HG.nowIso();
      const rec = { ...fields, id: fields.id || HG.newId(), createdAt: fields.createdAt || t, updatedAt: t };
      load()[kind][rec.id] = rec;
      persist();
      return copy(rec);
    },

    update(kind, id, patch) {
      assertKind(kind);
      const cur = load()[kind][id];
      if (!cur || cur.deleted) return null;
      const rec = { ...cur, ...patch, id, createdAt: cur.createdAt, updatedAt: HG.nowIso() };
      db[kind][id] = rec;
      persist();
      return copy(rec);
    },

    remove(kind, id) {
      assertKind(kind);
      const cur = load()[kind][id];
      if (!cur) return;
      db[kind][id] = { id, createdAt: cur.createdAt, updatedAt: HG.nowIso(), deleted: true };
      persist();
    },

    settings() {
      return { ...load().settings };
    },

    updateSettings(patch) {
      const s = load().settings;
      Object.assign(s, patch, { updatedAt: HG.nowIso() });
      persist();
      return { ...s };
    },

    // Full backup as a JSON string (includes tombstones, for future sync).
    exportJSON() {
      return JSON.stringify({ app: 'habit-garden', exportedAt: HG.nowIso(), ...load() }, null, 2);
    },

    // Replace everything with a backup. Throws on obviously wrong input.
    importJSON(text) {
      const raw = JSON.parse(text);
      if (!raw || raw.app !== 'habit-garden') throw new Error('This is not a Habit Garden backup.');
      db = normalize(raw);
      persist();
    },

    // Wipe everything in the current store (used by "Reset demo").
    clearAll() {
      db = emptyDb();
      persist();
    },

    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };

  // Another tab changed the data: drop the cache and tell the UI.
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      db = null;
      listeners.forEach((fn) => fn());
    }
  });

  HG.store = store;
})();
