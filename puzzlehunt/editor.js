// Hunt editor: edit chapters, puzzles, metas and the finale; autosaves a draft in this browser;
// publishes hunt-data.js (answers hashed) and private backups (answers in plain text).
(function () {
  'use strict';
  const { h, hashAnswer, normalizeAnswer, uid } = window.HuntCore;

  const COLORS = ['#e4572e', '#4f9d69', '#4d9de0', '#c2417a', '#f2b134', '#8e5cc9', '#2a9d8f', '#d17b2c'];
  const EMOJI = '🍳 🧂 🫒 🍜 🌶️ 🍲 🌿 🍕 🍚 🍽️ 🥗 🍝 🧀 🍰 🍪 🍩 🍓 🍋 🥐 🥕 🍅 🫖 ☕ 🍷 🧁 🥟 🍣 🌮 🥞 🍯 🔪 🥄 ⭐ ❤️ 🔍 🧩 🗝️ 📖 💌 🎁 🌙 🌸 🐱 🐶 ✈️ 🏠 🎵 🎬'.split(' ');

  const $ = (id) => document.getElementById(id);
  const clone = (x) => JSON.parse(JSON.stringify(x));

  let draft;
  let sel = { type: 'hunt' };
  let saveTimer, previewTimer;

  // ---------- Draft storage (IndexedDB holds images comfortably; localStorage is a fallback) ----------
  const DB = 'puzzlehunt-editor';
  function idb() {
    return new Promise((resolve, reject) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }
  async function storeGet(key) {
    try {
      const db = await idb();
      return await new Promise((res, rej) => {
        const q = db.transaction('kv').objectStore('kv').get(key);
        q.onsuccess = () => res(q.result);
        q.onerror = () => rej(q.error);
      });
    } catch {
      try { return JSON.parse(localStorage.getItem(DB + ':' + key)); } catch { return null; }
    }
  }
  async function storeSet(key, value) {
    try {
      const db = await idb();
      await new Promise((res, rej) => {
        const tx = db.transaction('kv', 'readwrite');
        tx.objectStore('kv').put(value, key);
        tx.oncomplete = res;
        tx.onerror = () => rej(tx.error);
      });
    } catch {
      localStorage.setItem(DB + ':' + key, JSON.stringify(value));
    }
  }

  // ---------- Model ----------
  function blankPuzzle(title = 'New puzzle', icon = '🍽️') {
    return { id: uid('p'), title, icon, flavor: '', body: '', answer: '', alts: '', answerHashes: [], partials: [], hints: [], solveText: '' };
  }
  function blankChapter(n) {
    return {
      id: uid('c'), title: 'Chapter ' + n, subtitle: '', icon: '📖', color: COLORS[(n - 1) % COLORS.length],
      intro: '', metaUnlock: 'all', puzzles: [blankPuzzle()], meta: blankPuzzle('The meta', '⭐'),
    };
  }
  function blankHunt() {
    return normalize({
      salt: uid('hunt') + Math.random().toString(36).slice(2, 8), title: 'My puzzle hunt', subtitle: '', mascot: '🧑‍🍳',
      intro: '', ending: '', chapters: [blankChapter(1)],
    });
  }
  function normalize(x) {
    x = x || {};
    x.version = 1;
    x.salt = x.salt || uid('hunt');
    x.settings = Object.assign({ chapterUnlock: 'all' }, x.settings);
    x.images = x.images || {};
    x.chapters = (x.chapters || []).map((c, i) => {
      c.id = c.id || uid('c');
      c.puzzles = (c.puzzles || []).map(fixPuzzle);
      c.meta = fixPuzzle(c.meta || blankPuzzle('The meta', '⭐'));
      c.color = c.color || COLORS[i % COLORS.length];
      if (c.metaUnlock == null) c.metaUnlock = 'all';
      return c;
    });
    x.finale = fixPuzzle(x.finale || Object.assign(blankPuzzle('The finale', '🏆'), { enabled: false }));
    return x;
  }
  function fixPuzzle(p) {
    p.id = p.id || uid('p');
    p.answerHashes = p.answerHashes || [];
    p.partials = p.partials || [];
    p.hints = p.hints || [];
    return p;
  }
  function eachPuzzle(hunt, fn) {
    hunt.chapters.forEach((c, ci) => {
      c.puzzles.forEach((p, pi) => fn(p, { type: 'puzzle', ci, pi }));
      fn(c.meta, { type: 'meta', ci });
    });
    if (hunt.finale.enabled) fn(hunt.finale, { type: 'finale' });
  }
  // A puzzle loaded from a published file has hashes but no plain answer (answer === undefined).
  const answerKnown = (p) => typeof p.answer === 'string';
  function rehash(p) {
    if (answerKnown(p)) {
      p.answerHashes = [p.answer, ...String(p.alts || '').split('\n')].map((a) => hashAnswer(draft.salt, a)).filter(Boolean);
    }
    p.partials.forEach((x) => { if (typeof x.answer === 'string') x.hash = hashAnswer(draft.salt, x.answer); });
  }
  function publishable() {
    const pub = clone(draft);
    const strip = (p) => { delete p.answer; delete p.alts; p.partials.forEach((x) => delete x.answer); };
    pub.chapters.forEach((c) => { c.puzzles.forEach(strip); strip(c.meta); });
    strip(pub.finale);
    return pub;
  }
  function problems() {
    const out = [];
    if (!draft.chapters.length) out.push({ text: 'The hunt has no chapters yet.' });
    draft.chapters.forEach((c, ci) => {
      if (!c.puzzles.length) out.push({ text: `“${c.title}” has no puzzles.`, sel: { type: 'chapter', ci } });
    });
    eachPuzzle(draft, (p, where) => {
      if (!p.answerHashes.length) out.push({ text: `“${p.title || 'Untitled'}” has no answer.`, sel: where });
    });
    return out;
  }

  function current() {
    if (sel.type === 'chapter') return draft.chapters[sel.ci];
    if (sel.type === 'puzzle') return draft.chapters[sel.ci]?.puzzles[sel.pi];
    if (sel.type === 'meta') return draft.chapters[sel.ci]?.meta;
    if (sel.type === 'finale') return draft.finale;
    return draft;
  }

  // ---------- Change handling ----------
  function changed(opts = {}) {
    status('Saving…');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 400);
    clearTimeout(previewTimer);
    previewTimer = setTimeout(renderPreview, 250);
    if (opts.tree) renderTree();
    if (opts.form) renderForm();
  }
  async function save() {
    try {
      await storeSet('draft', { savedAt: Date.now(), hunt: draft });
      status('All changes saved in this browser. Publish when you’re ready.');
    } catch (e) {
      status('⚠ Couldn’t save the draft (storage full?). Download a backup!', true);
    }
  }
  function status(text, warn) {
    const el = $('status');
    el.textContent = text;
    el.classList.toggle('warn', !!warn);
  }
  function select(s) {
    sel = s;
    renderAll();
    $('form').scrollTop = 0;
  }
  function renderAll() { renderTree(); renderForm(); renderPreview(); }

  // ---------- Tree ----------
  const icoEl = (s) => (s && s.startsWith('img:') ? h('img', { src: draft.images[s.slice(4)] || '', alt: '' }) : s || '•');
  const same = (a, b) => a.type === b.type && a.ci === b.ci && a.pi === b.pi;

  function renderTree() {
    const item = (s, ico, name, cls = '', warn = false) =>
      h('button', { class: `t-item ${cls}${same(s, sel) ? ' sel' : ''}`, onclick: () => select(s) },
        h('span', { class: 't-ico' }, ico), h('span', { class: 't-name' }, name), warn && h('span', { class: 't-warn', title: 'No answer yet' }, '⚠'));
    const noAns = (p) => !p.answerHashes.length;

    $('tree').replaceChildren(...[
      item({ type: 'hunt' }, icoEl(draft.mascot), 'Hunt settings'),
      draft.chapters.map((c, ci) => [
        h('button', { class: `t-item t-chapter${same({ type: 'chapter', ci }, sel) ? ' sel' : ''}`, onclick: () => select({ type: 'chapter', ci }) },
          h('span', { class: 'swatch', style: { background: c.color } }),
          h('span', { class: 't-name' }, `${ci + 1}. ${c.title || 'Untitled chapter'}`)),
        c.puzzles.map((p, pi) => item({ type: 'puzzle', ci, pi }, icoEl(p.icon), p.title || 'Untitled', 't-child', noAns(p))),
        item({ type: 'meta', ci }, icoEl(c.meta.icon), 'Meta: ' + (c.meta.title || 'Untitled'), 't-child', noAns(c.meta)),
        h('button', { class: 't-item t-add', onclick: () => addPuzzle(ci) }, '+ Add puzzle'),
      ]),
      h('button', { class: 't-item t-add top', onclick: addChapter }, '+ Add chapter'),
      item({ type: 'finale' }, icoEl(draft.finale.icon), 'Finale: ' + (draft.finale.title || 'Untitled'),
        't-chapter' + (draft.finale.enabled ? '' : ' t-off'), draft.finale.enabled && noAns(draft.finale)),
    ].flat(Infinity).filter(Boolean));
  }

  function addPuzzle(ci) {
    const c = draft.chapters[ci];
    c.puzzles.push(blankPuzzle('Puzzle ' + (c.puzzles.length + 1)));
    changed();
    select({ type: 'puzzle', ci, pi: c.puzzles.length - 1 });
  }
  function addChapter() {
    draft.chapters.push(blankChapter(draft.chapters.length + 1));
    changed();
    select({ type: 'chapter', ci: draft.chapters.length - 1 });
  }

  // ---------- Form building blocks ----------
  function field(label, input, help) {
    return h('label', { class: 'field' }, h('span', { class: 'lbl' }, label), input, help && h('small', {}, help));
  }
  function textInput(obj, key, o = {}) {
    return h(o.multiline ? 'textarea' : 'input', {
      value: obj[key] ?? '', placeholder: o.placeholder || '', rows: o.rows || 3, dir: 'auto', class: o.class,
      oninput: (e) => { obj[key] = e.target.value; o.after && o.after(e); changed({ tree: o.tree }); },
    });
  }
  const text = (label, obj, key, o = {}) => field(label, textInput(obj, key, o), o.help);
  const btn = (label, onclick, cls = '') => h('button', { class: 'ed-btn small ' + cls, type: 'button', onclick }, label);

  function mdField(label, obj, key, o = {}) {
    const ta = h('textarea', {
      class: 'md', rows: o.rows || 8, value: obj[key] || '', placeholder: o.placeholder || '', dir: 'auto',
      oninput: () => { obj[key] = ta.value; changed(); },
    });
    const put = (str, selectFrom, selectTo) => {
      const s = ta.selectionStart;
      ta.setRangeText(str, s, ta.selectionEnd, 'end');
      if (selectFrom != null) ta.setSelectionRange(s + selectFrom, s + selectTo);
      ta.focus();
      ta.dispatchEvent(new Event('input'));
    };
    const wrap = (before, after = before, ph = 'text') => {
      const inner = ta.value.slice(ta.selectionStart, ta.selectionEnd) || ph;
      put(before + inner + after, before.length, before.length + inner.length);
    };
    const prefixLines = (prefix) => {
      const v = ta.value;
      const start = v.lastIndexOf('\n', ta.selectionStart - 1) + 1;
      let end = v.indexOf('\n', ta.selectionEnd);
      if (end < 0) end = v.length;
      ta.setSelectionRange(start, end);
      put(v.slice(start, end).split('\n').map((l) => prefix + l).join('\n'));
    };
    const block = (str) => {
      const before = ta.value.slice(0, ta.selectionStart);
      const pad = !before || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
      put(pad + str + '\n');
    };
    const tb = (lbl, fn, title) => h('button', { type: 'button', title, onclick: fn }, lbl);
    return h('div', { class: 'field' },
      h('span', { class: 'lbl' }, label),
      h('div', { class: 'toolbar' },
        tb('B', () => wrap('**'), 'Bold'),
        tb('I', () => wrap('*'), 'Italic'),
        tb('Heading', () => prefixLines('## ')),
        tb('• List', () => prefixLines('- ')),
        tb('1. List', () => prefixLines('1. ')),
        tb('Quote', () => prefixLines('> ')),
        tb('Grid', () => block('```\nA B C D\nE F G H\n```'), 'Monospace block: letter grids, ciphers, blanks'),
        tb('Table', () => block('| Clue | Answer |\n|---|---|\n| first clue | _ _ _ _ |\n| second clue | _ _ _ |')),
        tb('Link', () => wrap('[', '](https://)', 'link text')),
        tb('🖼 Image', () => pickImage((k) => block(`![](img:${k})`)), 'Upload an image into the puzzle'),
        tb('Line', () => block('---'), 'Horizontal divider')),
      ta,
      o.help && h('small', {}, o.help),
      o.cheat && h('details', { class: 'cheat' }, h('summary', {}, 'Formatting cheat sheet'), h('pre', {}, CHEAT)));
  }
  const CHEAT = `**bold**   *italic*   ~~strike~~   \`code\`
## Heading       ### Smaller heading
- bullet         1. numbered
> quote / callout box
---              (divider line)
\`\`\`
monospace block: grids, ciphers, _ _ _ blanks
\`\`\`
| a | b |        (table; the |---| line makes the first row a header)
|---|---|
| 1 | 2 |
![caption](img:name)   uploaded image (use the 🖼 button)
[text](https://…)      link
Single line breaks are kept. Raw HTML works too (e.g. <span style="color:red">).
Hebrew/RTL text is detected automatically.`;

  function iconField(label, obj, key) {
    const now = h('div', { class: 'icon-now' });
    const paint = () => now.replaceChildren(icoEl(obj[key]));
    paint();
    const input = h('input', {
      value: obj[key] && !obj[key].startsWith('img:') ? obj[key] : '', placeholder: 'emoji',
      oninput: (e) => { obj[key] = e.target.value; paint(); changed({ tree: true }); },
    });
    return h('div', { class: 'field' },
      h('span', { class: 'lbl' }, label),
      h('div', { class: 'icon-row' }, now, input,
        btn('Upload picture', () => pickImage((k) => { obj[key] = 'img:' + k; input.value = ''; paint(); changed({ tree: true }); }))),
      h('div', { class: 'emoji-picks' }, EMOJI.map((e) =>
        h('button', { type: 'button', onclick: () => { obj[key] = e; input.value = e; paint(); changed({ tree: true }); } }, e))));
  }

  function colorField(label, obj, key) {
    const picker = h('input', { type: 'color', value: obj[key], oninput: (e) => { obj[key] = e.target.value; changed({ tree: true }); } });
    return h('div', { class: 'field' },
      h('span', { class: 'lbl' }, label),
      h('div', { class: 'swatches' },
        COLORS.map((c) => h('button', {
          type: 'button', title: c, style: { background: c },
          onclick: () => { obj[key] = c; picker.value = c; changed({ tree: true }); },
        })),
        picker));
  }

  function moveButtons(arr, index, onMoved) {
    const mv = (d) => {
      const j = index + d;
      if (j < 0 || j >= arr.length) return;
      [arr[index], arr[j]] = [arr[j], arr[index]];
      onMoved(j);
    };
    return [btn('↑ Move up', () => mv(-1)), btn('↓ Move down', () => mv(1))].map((b, i) => {
      b.disabled = i === 0 ? index === 0 : index === arr.length - 1;
      return b;
    });
  }

  // ---------- Images ----------
  function pickImage(onDone) {
    const input = h('input', { type: 'file', accept: 'image/*' });
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      try {
        const url = await processImage(file);
        let base = file.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'image';
        let key = base;
        for (let n = 2; draft.images[key]; n++) key = `${base}-${n}`;
        draft.images[key] = url;
        onDone(key);
        changed();
      } catch (e) {
        alert('Could not read that image: ' + e.message);
      }
    };
    input.click();
  }
  const readAsDataURL = (file) => new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = () => rej(fr.error);
    fr.readAsDataURL(file);
  });
  // Small images and SVG/GIF are kept as-is; big photos are scaled to 1600px so the hunt file stays light.
  async function processImage(file) {
    const raw = await readAsDataURL(file);
    if (/svg|gif/.test(file.type) || file.size < 300 * 1024) return raw;
    const img = new Image();
    img.src = raw;
    await img.decode();
    const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = h('canvas', { width: Math.round(img.naturalWidth * scale), height: Math.round(img.naturalHeight * scale) });
    const ctx = canvas.getContext('2d');
    if (file.type === 'image/png') {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const png = canvas.toDataURL('image/png');
      if (png.length < 900 * 1024) return png;
    }
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  }
  const imageUsed = (key) => JSON.stringify({ ...draft, images: null }).includes('img:' + key);

  // ---------- Forms ----------
  function renderForm() {
    const target = current();
    if (!target) { sel = { type: 'hunt' }; return renderForm(); }
    let content;
    if (sel.type === 'hunt') content = huntForm();
    else if (sel.type === 'chapter') content = chapterForm(target, sel.ci);
    else content = puzzleForm(target);
    $('form').replaceChildren(...[content].flat(Infinity).filter(Boolean));
  }

  function huntForm() {
    const probs = problems();
    const imgKeys = Object.keys(draft.images);
    return [
      h('h2', {}, 'Hunt settings'),
      h('p', { class: 'help' }, 'Pick anything on the left to edit it. Changes save automatically in this browser and show up in the preview on the right.'),
      text('Title', draft, 'title', { tree: true }),
      text('Subtitle', draft, 'subtitle', { help: 'Shown in handwriting under the title.' }),
      iconField('Mascot', draft, 'mascot'),
      mdField('Welcome text', draft, 'intro', { rows: 7, cheat: true, help: 'The story and the rules, shown on the home page.' }),
      mdField('Ending text', draft, 'ending', { rows: 4, help: 'Shown on the home page once the whole hunt is solved.' }),
      field('Chapter unlocking', h('select', {
        value: draft.settings.chapterUnlock,
        onchange: (e) => { draft.settings.chapterUnlock = e.target.value; changed(); },
      },
        h('option', { value: 'all' }, 'All chapters are open from the start'),
        h('option', { value: 'sequential' }, 'One at a time: solving a chapter’s meta opens the next one'))),

      h('h3', {}, 'Checklist'),
      probs.length
        ? h('ul', { class: 'checklist' }, probs.map((p) => h('li', {}, p.sel ? h('a', { onclick: () => select(p.sel) }, p.text) : p.text)))
        : h('ul', { class: 'checklist' }, h('li', { class: 'ok' }, '✓ Every puzzle has an answer. Ready to publish!')),

      h('h3', {}, `Images (${imgKeys.length})`),
      h('p', { class: 'help' }, 'Images you upload live inside the hunt file. Use them in any text with ', h('code', {}, '![](img:name)'), '.'),
      h('div', { class: 'row-btns' }, btn('+ Upload image', () => pickImage(() => renderForm()))),
      h('div', { class: 'images' }, imgKeys.map((k) => h('div', { class: 'img-card' },
        h('img', { src: draft.images[k], alt: k }),
        h('code', { title: k }, 'img:' + k),
        h('div', {}, `${Math.round((draft.images[k].length * 0.75) / 1024)} KB${imageUsed(k) ? '' : ' · unused'}`),
        h('div', { class: 'row-btns' },
          btn('Copy', () => navigator.clipboard?.writeText(`![](img:${k})`)),
          btn('Delete', () => {
            if (imageUsed(k) && !confirm(`img:${k} is still used somewhere. Delete anyway?`)) return;
            delete draft.images[k];
            changed({ form: true });
          }, 'danger'))))),

      h('h3', {}, 'Start over'),
      h('div', { class: 'callout' }, 'Your draft lives only in this browser. Use 💾 Backup now and then. It keeps the plain-text answers, so you can keep editing on another computer.'),
      h('div', { class: 'row-btns' },
        btn('Reload the published hunt-data.js', async () => {
          if (!window.HUNT) return alert('No hunt-data.js found next to the editor.');
          if (!confirm('Replace your draft with the published hunt-data.js? Unsaved draft changes will be lost.')) return;
          load(clone(window.HUNT));
        }, 'danger'),
        btn('New blank hunt', () => {
          if (!confirm('Start a brand-new empty hunt? Your current draft will be replaced (back it up first!).')) return;
          load(blankHunt());
        }, 'danger')),
    ];
  }

  function chapterForm(c, ci) {
    const count = c.puzzles.length;
    return [
      h('div', { class: 'crumbs' }, `Chapter ${ci + 1}`),
      h('h2', {}, c.title || 'Untitled chapter'),
      h('div', { class: 'row-btns' },
        moveButtons(draft.chapters, ci, (j) => { changed(); select({ type: 'chapter', ci: j }); }),
        btn('+ Add puzzle', () => addPuzzle(ci)),
        btn('Delete chapter', () => {
          if (!confirm(`Delete “${c.title}” and all ${count} of its puzzles and its meta?`)) return;
          draft.chapters.splice(ci, 1);
          changed();
          select({ type: 'hunt' });
        }, 'danger')),
      h('div', { class: 'two' },
        text('Chapter title', c, 'title', { tree: true }),
        text('Subtitle', c, 'subtitle')),
      iconField('Icon', c, 'icon'),
      colorField('Color', c, 'color'),
      mdField('Chapter intro', c, 'intro', { rows: 4, help: 'Optional story shown at the top of the chapter page.' }),
      h('h3', {}, 'When does the meta unlock?'),
      h('div', { class: 'two' },
        field('Rule', h('select', {
          value: c.metaUnlock === 'all' ? 'all' : 'n',
          onchange: (e) => { c.metaUnlock = e.target.value === 'all' ? 'all' : Math.max(count - 1, 0); changed({ form: true }); },
        }, h('option', { value: 'all' }, 'After all puzzles are solved'), h('option', { value: 'n' }, 'After a number of puzzles'))),
        c.metaUnlock !== 'all' && field('Number of puzzles', h('input', {
          type: 'number', min: 0, max: count, value: c.metaUnlock,
          oninput: (e) => { c.metaUnlock = Math.max(0, parseInt(e.target.value, 10) || 0); changed(); },
        }), `out of ${count}. Use 0 to have the meta open from the start.`)),
    ];
  }

  function puzzleForm(p) {
    const kind = sel.type;
    const c = draft.chapters[sel.ci];
    const crumbs = kind === 'finale' ? 'Finale' : `Chapter ${sel.ci + 1}: ${c.title} › ${kind === 'meta' ? 'Meta' : 'Puzzle ' + (sel.pi + 1)}`;
    const checked = h('small', { class: 'checked-as' });
    const showChecked = () => {
      checked.textContent = answerKnown(p)
        ? (normalizeAnswer(p.answer) ? 'Accepted as: ' + normalizeAnswer(p.answer) + '  (case, spaces and punctuation are ignored)' : '')
        : '';
    };
    showChecked();
    const altsBox = textInput(p, 'alts', {
      multiline: true, rows: 2, placeholder: answerKnown(p) ? 'One per line, e.g. a spelling variant' : 'Type the main answer above first',
      after: () => rehash(p),
    });
    altsBox.disabled = !answerKnown(p);

    return [
      h('div', { class: 'crumbs' }, crumbs),
      h('h2', {}, p.title || 'Untitled'),
      kind === 'puzzle' && h('div', { class: 'row-btns' },
        moveButtons(c.puzzles, sel.pi, (j) => { changed(); select({ type: 'puzzle', ci: sel.ci, pi: j }); }),
        draft.chapters.length > 1 && h('select', {
          class: 'ed-btn small', value: '',
          onchange: (e) => {
            const to = Number(e.target.value);
            const [moved] = c.puzzles.splice(sel.pi, 1);
            draft.chapters[to].puzzles.push(moved);
            changed();
            select({ type: 'puzzle', ci: to, pi: draft.chapters[to].puzzles.length - 1 });
          },
        }, h('option', { value: '', disabled: true }, 'Move to chapter…'),
          draft.chapters.map((ch, i) => i !== sel.ci && h('option', { value: i }, `${i + 1}. ${ch.title}`))),
        btn('Duplicate', () => {
          const copy = Object.assign(clone(p), { id: uid('p'), title: p.title + ' (copy)' });
          c.puzzles.splice(sel.pi + 1, 0, copy);
          changed();
          select({ type: 'puzzle', ci: sel.ci, pi: sel.pi + 1 });
        }),
        btn('Delete puzzle', () => {
          if (!confirm(`Delete “${p.title}”?`)) return;
          c.puzzles.splice(sel.pi, 1);
          changed();
          select({ type: 'chapter', ci: sel.ci });
        }, 'danger')),
      kind === 'finale' && h('label', { class: 'field' },
        h('input', { type: 'checkbox', checked: !!p.enabled, onchange: (e) => { p.enabled = e.target.checked; changed({ tree: true, form: true }); } }),
        ' Include a final meta that unlocks once every chapter meta is solved'),
      kind === 'meta' && h('div', { class: 'callout' }, 'This is the chapter’s meta. It usually uses the answers of the chapter’s puzzles. Set when it unlocks on the chapter page.'),

      (kind !== 'finale' || p.enabled) && [
        h('div', { class: 'two' },
          text('Title', p, 'title', { tree: true }),
          text('Flavor text', p, 'flavor', { help: 'A short teaser line in handwriting, above the puzzle.' })),
        iconField('Icon', p, 'icon'),
        mdField('Puzzle', p, 'body', { rows: 14, cheat: true, placeholder: 'Write the puzzle here. Use the buttons above for grids, tables and images.' }),

        h('h3', {}, 'Answer'),
        field('Answer', textInput(p, 'answer', {
          class: 'answer-in',
          placeholder: answerKnown(p) ? 'e.g. SOUP FOR TWO' : 'Answer is set (hidden in the published file). Type here to replace it.',
          after: () => { rehash(p); showChecked(); altsBox.disabled = false; altsBox.placeholder = 'One per line, e.g. a spelling variant'; },
          tree: true,
        }), checked),
        field('Also accept', altsBox),

        h('h3', {}, '“Keep going” answers'),
        h('p', { class: 'help' }, 'Wrong-but-close answers that get a custom nudge instead of “Try again”, e.g. an intermediate step.'),
        p.partials.map((x, i) => h('div', { class: 'list-row' },
          h('input', {
            value: x.answer ?? '', placeholder: typeof x.answer === 'string' ? 'answer' : '(hidden; type to replace)', class: 'answer-in', style: { flex: '0 1 38%' },
            oninput: (e) => { x.answer = e.target.value; rehash(p); changed(); },
          }),
          h('input', { value: x.message || '', placeholder: 'Message, e.g. “Close! Now take the first letters.”', dir: 'auto', oninput: (e) => { x.message = e.target.value; changed(); } }),
          btn('✕', () => { p.partials.splice(i, 1); changed({ form: true }); }, 'x'))),
        h('div', { class: 'row-btns' }, btn('+ Add “keep going” answer', () => { p.partials.push({ answer: '', message: '', hash: null }); changed({ form: true }); })),

        h('h3', {}, 'Hints'),
        h('p', { class: 'help' }, 'Revealed one at a time when the solver asks. Go from gentle to big.'),
        p.hints.map((t, i) => h('div', { class: 'list-row' },
          h('span', { class: 'num-tag' }, i + 1 + '.'),
          h('textarea', { rows: 2, value: t, dir: 'auto', oninput: (e) => { p.hints[i] = e.target.value; changed(); } }),
          i > 0 && btn('↑', () => { [p.hints[i - 1], p.hints[i]] = [p.hints[i], p.hints[i - 1]]; changed({ form: true }); }, 'x'),
          btn('✕', () => { p.hints.splice(i, 1); changed({ form: true }); }, 'x'))),
        h('div', { class: 'row-btns' }, btn('+ Add hint', () => { p.hints.push(''); changed({ form: true }); })),

        h('h3', {}, 'After solving'),
        mdField('Message shown once solved', p, 'solveText', { rows: 3, help: 'Optional: a bit of story, a photo, a sweet note…' }),
      ],
    ];
  }

  // ---------- Preview ----------
  function previewRoute() {
    if (sel.type === 'chapter') return { view: 'chapter', id: draft.chapters[sel.ci].id };
    if (sel.type === 'hunt') return { view: 'home' };
    const p = current();
    if (sel.type === 'finale' && !p.enabled) return { view: 'home' };
    return { view: 'puzzle', id: p.id };
  }
  function renderPreview() {
    const box = $('preview');
    const scroll = box.scrollTop;
    box.replaceChildren();
    const mount = h('div');
    box.append(mount);
    window.HuntPlayer(mount, publishable(), { storage: 'memory', unlockAll: true, route: previewRoute(), scrollEl: box });
    box.scrollTop = scroll;
  }
  function playTest() {
    const scroll = h('div', { class: 'ed-overlay-scroll' });
    const overlay = h('div', { class: 'ed-overlay' },
      h('div', { class: 'ed-overlay-bar' },
        h('span', {}, '▶ Play-test: a fresh run with locks, exactly as the solver will see it. Progress here isn’t saved.'),
        h('button', { class: 'ed-btn small', onclick: () => overlay.remove() }, 'Close ✕')),
      scroll);
    const mount = h('div');
    scroll.append(mount);
    document.body.append(overlay);
    window.HuntPlayer(mount, publishable(), { storage: 'memory', scrollEl: scroll });
  }

  // ---------- Files ----------
  function download(name, content, type) {
    const a = h('a', { href: URL.createObjectURL(new Blob([content], { type })), download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function publish() {
    const probs = problems();
    if (probs.length && !confirm(`Heads up:\n\n${probs.map((p) => '• ' + p.text).join('\n')}\n\nPublish anyway?`)) return;
    const js = '// Generated by the hunt editor (editor.html). Answers are stored as salted hashes.\nwindow.HUNT = ' +
      JSON.stringify(publishable(), null, 2) + ';\n';
    download('hunt-data.js', js, 'text/javascript');
    status('Downloaded hunt-data.js. Replace the one next to index.html with it.');
  }
  function backup() {
    const stamp = new Date().toISOString().slice(0, 10);
    download(`hunt-private-${stamp}.json`, JSON.stringify({ kind: 'puzzlehunt-backup', hunt: draft }, null, 1), 'application/json');
    status('Backup downloaded. It contains the answers, so don’t share it with your solver!');
  }
  async function openFile(file) {
    const text = await file.text();
    let data;
    try {
      const json = text.trim().startsWith('{') ? text : text.replace(/^[\s\S]*?window\.HUNT\s*=\s*/, '').replace(/;\s*$/, '');
      data = JSON.parse(json);
    } catch {
      return alert('That file doesn’t look like a hunt-data.js or a hunt backup.');
    }
    const hunt = data.kind === 'puzzlehunt-backup' ? data.hunt : data;
    if (!hunt || !Array.isArray(hunt.chapters)) return alert('That file doesn’t look like a hunt.');
    if (!confirm('Replace your current draft with this file?')) return;
    load(hunt);
  }

  function load(hunt) {
    draft = normalize(hunt);
    sel = { type: 'hunt' };
    renderAll();
    save();
  }

  // ---------- Boot ----------
  $('btn-play').onclick = playTest;
  $('btn-publish').onclick = publish;
  $('btn-backup').onclick = backup;
  $('btn-open').onclick = () => $('file-open').click();
  $('file-open').onchange = (e) => { if (e.target.files[0]) openFile(e.target.files[0]); e.target.value = ''; };

  (async () => {
    const saved = await storeGet('draft');
    if (saved && saved.hunt) {
      draft = normalize(saved.hunt);
      renderAll();
      status(`Restored your draft from ${new Date(saved.savedAt).toLocaleString()}.`);
    } else {
      draft = normalize(window.HUNT ? clone(window.HUNT) : blankHunt());
      renderAll();
      status(window.HUNT ? 'Loaded the published hunt-data.js. Edits save in this browser as you go.' : 'Started a new hunt.');
    }
  })();
})();
