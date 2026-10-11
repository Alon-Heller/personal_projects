// Interactive puzzle widgets. Authors write fenced blocks in puzzle Markdown:
//   ```grid       crossword-style grid to type into
//   ```blanks     answer boxes
//   ```highlight  letter grid to color in (word searches, shading)
//   ```order      list to drag into order
// core.js turns them into <div class="widget">; hydrate() brings them to life.
(function () {
  'use strict';
  const { h, inline } = window.HuntCore;
  const MARKERS = ['#ffd84d', '#8fd3a6', '#ff9eb5'];

  // state: { [widgetIndex]: value }, mutated in place; onChange() is called after every edit.
  function hydrate(container, { state = {}, onChange = () => {}, useAnswer, images } = {}) {
    container.querySelectorAll('.widget').forEach((el, i) => {
      const build = BUILDERS[el.dataset.type];
      if (!build) return;
      const set = (v) => { state[i] = v; onChange(); };
      try {
        el.replaceChildren(build(el.dataset.src || '', state[i], set, { useAnswer, images }));
      } catch (e) {
        el.textContent = '⚠ ' + e.message;
      }
    });
  }

  const lines = (src) => src.split('\n').map((l) => l.trim()).filter(Boolean);
  const tokens = (row) => (/\s/.test(row) ? row.split(/\s+/) : [...row]);
  const lastChar = (v) => [...v].pop() || '';
  const up = (s) => s.toLocaleUpperCase();

  // Letter-box input that replaces its content on each keystroke.
  function box(value, given, cls = '') {
    const inp = h('input', {
      class: 'w-box ' + cls + (given ? ' given' : ''), value: given || value || '', readOnly: !!given,
      autocomplete: 'off', autocapitalize: 'characters', spellcheck: false, 'aria-label': 'letter',
    });
    inp.addEventListener('focus', () => inp.select());
    return inp;
  }

  // ---------- grid ----------
  // Tokens: # = black, . or _ = empty, a letter = given, 12 = numbered empty, 12A = numbered given.
  function parseGrid(src) {
    return lines(src).map((row) => tokens(row).map((t) => {
      if (t === '#') return { block: true };
      if (t === '.' || t === '_') return {};
      const m = t.match(/^(\d+)(.?)$/);
      if (m) return { num: m[1], given: m[2] && m[2] !== '.' && m[2] !== '_' ? up(m[2]) : '' };
      return { given: up(t[0]) };
    }));
  }

  function gridWidget(src, saved, set) {
    const rows = parseGrid(src);
    const cols = Math.max(0, ...rows.map((r) => r.length));
    const vals = Object.assign({}, saved);
    const inputs = {};
    let dir = [0, 1]; // across
    const el = h('div', { class: 'w-grid', style: { gridTemplateColumns: `repeat(${cols}, var(--cell))` } });

    const at = (r, c) => inputs[`${r},${c}`];
    const step = (r, c, [dr, dc], skipBlocks) => {
      for (let rr = r + dr, cc = c + dc; rr >= 0 && rr < rows.length && cc >= 0 && cc < cols; rr += dr, cc += dc) {
        if (at(rr, cc)) return at(rr, cc);
        if (!skipBlocks) return null;
      }
      return null;
    };
    const markWord = (r, c) => {
      el.querySelectorAll('.word').forEach((x) => x.classList.remove('word'));
      for (const sign of [1, -1]) {
        for (let rr = r, cc = c; at(rr, cc); rr += dir[0] * sign, cc += dir[1] * sign) at(rr, cc).parentNode.classList.add('word');
      }
    };

    rows.forEach((row, r) => {
      for (let c = 0; c < cols; c++) {
        const cell = row[c] || { block: true };
        if (cell.block) { el.append(h('div', { class: 'w-cell block' })); continue; }
        const key = `${r},${c}`;
        const inp = box(vals[key], cell.given);
        inputs[key] = inp;
        let wasFocused = false;
        inp.addEventListener('pointerdown', () => { wasFocused = document.activeElement === inp; });
        inp.addEventListener('click', () => {
          if (wasFocused) dir = dir[0] ? [0, 1] : [1, 0];
          markWord(r, c);
        });
        inp.addEventListener('focus', () => markWord(r, c));
        inp.addEventListener('input', () => {
          const ch = up(lastChar(inp.value));
          inp.value = ch;
          vals[key] = ch;
          set(Object.assign({}, vals));
          if (!ch) return;
          let next = step(r, c, dir, false);
          while (next && next.readOnly) {
            const [nr, nc] = next.dataset.rc.split(',').map(Number);
            next = step(nr, nc, dir, false);
          }
          next && next.focus();
        });
        inp.addEventListener('keydown', (e) => {
          const arrows = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
          if (arrows[e.key]) {
            e.preventDefault();
            dir = arrows[e.key][0] ? [1, 0] : [0, 1];
            const n = step(r, c, arrows[e.key], true);
            n ? n.focus() : markWord(r, c);
          } else if (e.key === 'Backspace' && !inp.value) {
            e.preventDefault();
            const p = step(r, c, [-dir[0], -dir[1]], false);
            if (p) {
              p.focus();
              if (!p.readOnly) { p.value = ''; vals[p.dataset.rc] = ''; set(Object.assign({}, vals)); }
            }
          } else if (e.key === ' ') {
            e.preventDefault();
            dir = dir[0] ? [0, 1] : [1, 0];
            markWord(r, c);
          }
        });
        inp.dataset.rc = key;
        el.append(h('div', { class: 'w-cell' }, cell.num && h('span', { class: 'w-num' }, cell.num), inp));
      }
    });
    return h('div', { class: 'w-wrap' }, el,
      h('div', { class: 'w-tools' },
        h('button', { class: 'w-mini', type: 'button', onclick: () => {
          if (!confirm('Clear this grid?')) return;
          for (const [k, inp] of Object.entries(inputs)) if (!inp.readOnly) { inp.value = ''; vals[k] = ''; }
          set({});
        } }, 'Clear')));
  }

  // ---------- blanks ----------
  // "4 3 3" or "(4, 3, 3)" → word lengths. Otherwise tokens: _ box, * circled box, / word break, letter = given.
  function parseBlanks(src) {
    const text = lines(src).join(' ');
    if (/^[\d\s,()]+$/.test(text)) {
      return text.match(/\d+/g).map((n) => Array.from({ length: +n }, () => ({})));
    }
    const words = [[]];
    for (const t of text.split(/\s+/)) {
      if (t === '/') words.push([]);
      else if (t === '_') words[words.length - 1].push({});
      else if (t === '*') words[words.length - 1].push({ circled: true });
      else words[words.length - 1].push({ given: up(t[0]) });
    }
    return words.filter((w) => w.length);
  }

  function blanksWidget(src, saved, set, { useAnswer }) {
    const words = parseBlanks(src);
    const vals = Array.isArray(saved) ? saved.slice() : [];
    const all = [];
    const save = () => set(all.map((b) => (b.readOnly ? '' : b.value)));
    const el = h('div', { class: 'w-blanks' }, words.map((w) => h('div', { class: 'w-word' }, w.map((cell) => {
      const i = all.length;
      const b = box(vals[i], cell.given, cell.circled ? 'circled' : '');
      all.push(b);
      return b;
    }))));
    const nextOpen = (i, d) => { for (let j = i + d; j >= 0 && j < all.length; j += d) if (!all[j].readOnly) return all[j]; return null; };
    all.forEach((b, i) => {
      b.addEventListener('input', () => {
        b.value = up(lastChar(b.value));
        save();
        if (b.value) nextOpen(i, 1)?.focus();
      });
      b.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !b.value) {
          e.preventDefault();
          const p = nextOpen(i, -1);
          if (p) { p.focus(); p.value = ''; save(); }
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault();
          nextOpen(i, e.key === 'ArrowRight' ? 1 : -1)?.focus();
        }
      });
    });
    let k = 0;
    const text = () => words.map((w) => w.map(() => all[k++].value || '?').join('')).join(' ');
    return h('div', { class: 'w-wrap' }, el,
      useAnswer && h('div', { class: 'w-tools' },
        h('button', { class: 'w-mini', type: 'button', onclick: () => { k = 0; useAnswer(text()); } }, 'Use as my answer ↓')));
  }

  // ---------- highlight ----------
  function highlightWidget(src, saved, set) {
    const rows = lines(src).map((r) => tokens(r).map(up));
    const cols = Math.max(0, ...rows.map((r) => r.length));
    const vals = Object.assign({}, saved);
    let cur = 0;
    let painting = null; // null | 'paint' | 'erase'
    const paint = (cell) => {
      const key = cell.dataset.rc;
      if (painting === 'erase') { delete vals[key]; cell.style.background = ''; }
      else { vals[key] = cur; cell.style.background = MARKERS[cur]; }
    };
    const grid = h('div', { class: 'w-hl', style: { gridTemplateColumns: `repeat(${cols}, var(--cell))` } },
      rows.flatMap((row, r) => Array.from({ length: cols }, (_, c) => {
        const key = `${r},${c}`;
        return h('div', {
          class: 'w-hc', 'data-rc': key,
          style: vals[key] != null ? { background: MARKERS[vals[key]] } : {},
        }, row[c] || '');
      })));
    grid.addEventListener('pointerdown', (e) => {
      const cell = e.target.closest('.w-hc');
      if (!cell) return;
      e.preventDefault();
      painting = vals[cell.dataset.rc] === cur ? 'erase' : 'paint';
      grid.setPointerCapture(e.pointerId);
      paint(cell);
    });
    grid.addEventListener('pointermove', (e) => {
      if (!painting) return;
      const cell = document.elementFromPoint(e.clientX, e.clientY)?.closest('.w-hc');
      if (cell && grid.contains(cell)) paint(cell);
    });
    const stop = () => { if (painting) { painting = null; set(Object.assign({}, vals)); } };
    grid.addEventListener('pointerup', stop);
    grid.addEventListener('pointercancel', stop);

    const swatches = MARKERS.map((color, i) => h('button', {
      type: 'button', class: 'w-swatch' + (i === cur ? ' on' : ''), style: { background: color }, 'aria-label': 'marker ' + (i + 1),
      onclick: (e) => { cur = i; e.target.parentNode.querySelectorAll('.w-swatch').forEach((s, j) => s.classList.toggle('on', j === i)); },
    }));
    return h('div', { class: 'w-wrap' }, grid,
      h('div', { class: 'w-tools' }, swatches,
        h('button', { class: 'w-mini', type: 'button', onclick: () => {
          if (!confirm('Clear all highlights?')) return;
          for (const k in vals) delete vals[k];
          grid.querySelectorAll('.w-hc').forEach((c) => { c.style.background = ''; });
          set({});
        } }, 'Clear')));
  }

  // ---------- order ----------
  function orderWidget(src, saved, set, { images }) {
    const items = lines(src);
    const order = Array.isArray(saved) && saved.length === items.length ? saved.slice() : items.map((_, i) => i);
    const list = h('ol', { class: 'w-order' });
    const commit = () => set([...list.children].map((li) => +li.dataset.i));
    const move = (li, d) => {
      const sib = d < 0 ? li.previousElementSibling : li.nextElementSibling;
      if (!sib) return;
      d < 0 ? list.insertBefore(li, sib) : list.insertBefore(sib, li);
      commit();
    };
    for (const i of order) {
      const handle = h('span', { class: 'w-handle', title: 'Drag' }, '⠿');
      const li = h('li', { 'data-i': i },
        handle,
        h('span', { class: 'w-item', dir: 'auto', html: inline(items[i], images) }),
        h('button', { class: 'w-mini', type: 'button', 'aria-label': 'Move up', onclick: () => move(li, -1) }, '↑'),
        h('button', { class: 'w-mini', type: 'button', 'aria-label': 'Move down', onclick: () => move(li, 1) }, '↓'));
      // Listen on window: moving the item in the DOM would drop pointer capture on the handle.
      handle.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        li.classList.add('dragging');
        const onMove = (ev) => {
          const over = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('li');
          if (!over || over === li || over.parentNode !== list) return;
          const rect = over.getBoundingClientRect();
          list.insertBefore(li, ev.clientY > rect.top + rect.height / 2 ? over.nextSibling : over);
        };
        const onUp = () => {
          li.classList.remove('dragging');
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          window.removeEventListener('pointercancel', onUp);
          commit();
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
      });
      list.append(li);
    }
    return h('div', { class: 'w-wrap' }, list);
  }

  const BUILDERS = { grid: gridWidget, blanks: blanksWidget, highlight: highlightWidget, order: orderWidget };

  // Starter snippets for the editor's "Interactive" menu.
  const TEMPLATES = {
    grid: '```grid\n1 . 2 . .\n. # . # .\n3 . . . .\n```',
    blanks: '```blanks\n_ _ * _ / _ * _\n```',
    highlight: '```highlight\nP E P P E R\nS A L T X O\nO L I V E S\n```',
    order: '```order\nThird step\nFirst step\nSecond step\n```',
  };

  window.HuntWidgets = { hydrate, TEMPLATES, types: Object.keys(BUILDERS) };
})();
