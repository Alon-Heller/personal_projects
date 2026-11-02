// Small shared helpers. Everything hangs off one global namespace (window.HG)
// so the app runs from plain <script> tags, including straight from disk.
(function () {
  const HG = (window.HG = window.HG || {});

  const pad = (n) => String(n).padStart(2, '0');

  // Local calendar day as "YYYY-MM-DD".
  HG.dayKey = (d = new Date()) => {
    d = new Date(d);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  // Whole calendar days from a to b (local time, DST-safe).
  HG.daysBetween = (a, b) => {
    const da = toDate(a), db = toDate(b);
    const ua = Date.UTC(da.getFullYear(), da.getMonth(), da.getDate());
    const ub = Date.UTC(db.getFullYear(), db.getMonth(), db.getDate());
    return Math.round((ub - ua) / 86400000);
  };

  // "YYYY-MM-DD" is parsed as local midnight, anything else via Date.
  function toDate(x) {
    if (typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x)) {
      const [y, m, d] = x.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date(x);
  }

  HG.esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  HG.newId = () =>
    window.crypto && crypto.randomUUID
      ? crypto.randomUUID()
      : 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);

  HG.nowIso = () => new Date().toISOString();

  HG.agoText = (days) => {
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    return `${days} days ago`;
  };
})();
