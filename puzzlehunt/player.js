// The hunt player. Used by index.html (the real hunt) and by the editor's previews.
(function () {
  'use strict';
  const { h, markdown, normalizeAnswer, hashAnswer } = window.HuntCore;
  const CONFETTI = ['🍅', '🧀', '🥕', '🍋', '🌶️', '🥐', '🍓', '✨', '🎉', '🫐'];

  // opts: { storage: 'local' | 'memory', useHash: bool, route: {...}, onNavigate(route) }
  function HuntPlayer(root, hunt, opts = {}) {
    const storageKey = 'puzzlehunt-progress:' + hunt.salt;
    let progress = load();
    let route = opts.route || (opts.useHash ? parseHash() : { view: 'home' });
    let flash = null; // feedback shown once after a submit

    function load() {
      const blank = { solved: {}, guesses: {}, hints: {} };
      if (opts.storage !== 'local') return blank;
      try { return Object.assign(blank, JSON.parse(localStorage.getItem(storageKey)) || {}); } catch { return blank; }
    }
    function save() {
      if (opts.storage !== 'local') return;
      try { localStorage.setItem(storageKey, JSON.stringify(progress)); } catch { /* private mode etc. */ }
    }

    // ---------- Lookup & unlock rules ----------
    const chapters = () => hunt.chapters || [];
    function find(id) {
      for (const [ci, ch] of chapters().entries()) {
        const fi = ch.puzzles.findIndex((p) => p.id === id);
        if (fi >= 0) return { puzzle: ch.puzzles[fi], chapter: ch, ci, kind: 'feeder', index: fi };
        if (ch.meta && ch.meta.id === id) return { puzzle: ch.meta, chapter: ch, ci, kind: 'meta' };
      }
      if (hunt.finale && hunt.finale.id === id) return { puzzle: hunt.finale, chapter: null, kind: 'finale' };
      return null;
    }
    const isSolved = (p) => !!(p && progress.solved[p.id]);
    const solvedCount = (ch) => ch.puzzles.filter(isSolved).length;
    const chapterUnlocked = (ci) => opts.unlockAll ||
      hunt.settings?.chapterUnlock !== 'sequential' || ci === 0 || isSolved(chapters()[ci - 1].meta);
    function metaNeed(ch) {
      const n = ch.metaUnlock === 'all' || ch.metaUnlock == null ? ch.puzzles.length : Number(ch.metaUnlock);
      return Math.min(Math.max(n, 0), ch.puzzles.length);
    }
    const metaUnlocked = (ch, ci) => opts.unlockAll || chapterUnlocked(ci) && solvedCount(ch) >= metaNeed(ch);
    const finaleOn = () => !!(hunt.finale && hunt.finale.enabled);
    const allMetasSolved = () => chapters().every((ch) => isSolved(ch.meta));
    const finaleUnlocked = () => finaleOn() && (opts.unlockAll || allMetasSolved());
    const huntComplete = () => (finaleOn() ? isSolved(hunt.finale) : chapters().length > 0 && allMetasSolved());
    function unlocked(info) {
      if (!info) return false;
      if (info.kind === 'feeder') return chapterUnlocked(info.ci);
      if (info.kind === 'meta') return metaUnlocked(info.chapter, info.ci);
      return finaleUnlocked();
    }

    // ---------- Routing ----------
    function parseHash() {
      const m = location.hash.match(/^#\/(chapter|puzzle)\/(.+)$/);
      return m ? { view: m[1], id: decodeURIComponent(m[2]) } : { view: 'home' };
    }
    function go(r) {
      route = r;
      flash = null;
      if (opts.useHash) {
        const hash = r.view === 'home' ? '#/' : `#/${r.view}/${encodeURIComponent(r.id)}`;
        if (location.hash !== hash) history.pushState(null, '', hash);
      }
      opts.onNavigate && opts.onNavigate(r);
      render();
      (opts.scrollEl || window).scrollTo({ top: 0 });
    }
    if (opts.useHash) window.addEventListener('popstate', () => { route = parseHash(); flash = null; render(); });

    // ---------- Views ----------
    const md = (src) => markdown(src, hunt.images);
    const icon = (s) => (s && s.startsWith('img:') ? h('img', { src: hunt.images?.[s.slice(4)] || '', alt: '' }) : s || '🍽️');
    const colorVars = (ch) => (ch && ch.color ? { '--c': ch.color } : {});

    function render() {
      root.classList.add('hunt');
      root.replaceChildren(h('div', { class: 'wrap' }, view()));
      if (opts.useHash) document.title = pageTitle();
    }
    function pageTitle() {
      const info = route.view === 'puzzle' ? find(route.id) : null;
      const ch = route.view === 'chapter' ? chapters().find((c) => c.id === route.id) : null;
      return [info?.puzzle.title || ch?.title, hunt.title].filter(Boolean).join(' · ');
    }
    function view() {
      if (route.view === 'chapter') {
        const ci = chapters().findIndex((c) => c.id === route.id);
        if (ci >= 0) return chapterView(chapters()[ci], ci);
      }
      if (route.view === 'puzzle') {
        const info = find(route.id);
        if (info) return puzzleView(info);
      }
      return homeView();
    }

    function homeView() {
      const done = huntComplete();
      return [
        h('header', { class: 'masthead' },
          h('div', { class: 'mascot' }, icon(hunt.mascot || '🧑‍🍳')),
          h('h1', { class: 'title', dir: 'auto' }, hunt.title || 'Untitled hunt'),
          hunt.subtitle && h('p', { class: 'subtitle', dir: 'auto' }, hunt.subtitle)),
        hunt.intro && h('section', { class: 'card paper body', dir: 'auto', html: md(hunt.intro) }),
        done && hunt.ending && h('section', { class: 'card body', style: { background: '#d9f0df' }, dir: 'auto' },
          h('div', { class: 'ribbon', style: { '--c': 'var(--basil)' } }, '★ Hunt complete'),
          h('div', { html: md(hunt.ending) })),
        h('div', { class: 'chapters' }, chapters().map(chapterCard)),
        finaleOn() && finaleCard(),
        h('footer', { class: 'footer muted' },
          opts.storage === 'local' && h('button', {
            class: 'linkish', onclick: () => {
              if (confirm('Erase all progress on this device and start over?')) { progress = { solved: {}, guesses: {}, hints: {} }; save(); render(); }
            },
          }, 'Reset progress')),
      ];
    }

    function chapterCard(ch, ci) {
      const open = chapterUnlocked(ci);
      return h('button', {
        class: 'chapter-card' + (open ? '' : ' locked'), style: colorVars(ch),
        onclick: () => open && go({ view: 'chapter', id: ch.id }),
      },
        h('div', { class: 'top' },
          h('div', { class: 'icon' }, icon(ch.icon)),
          h('div', {},
            h('div', { class: 'num' }, 'Chapter ' + (ci + 1)),
            h('h3', { dir: 'auto' }, ch.title || 'Untitled chapter'))),
        h('div', { class: 'bottom' },
          open
            ? [h('div', { dir: 'auto' }, ch.subtitle || ''),
              h('div', { class: 'dots', title: `${solvedCount(ch)} of ${ch.puzzles.length} solved` },
                ch.puzzles.map((p) => h('i', { class: isSolved(p) ? 'on' : '' })),
                ch.meta && h('i', { class: 'meta' + (isSolved(ch.meta) ? ' on' : '') })),
              isSolved(ch.meta) && h('div', { style: { marginTop: '10px' } }, h('span', { class: 'answer' }, progress.solved[ch.meta.id]))]
            : h('div', { class: 'lock-note' }, '🔒 Solve the previous chapter’s meta to open')));
    }

    function finaleCard() {
      const f = hunt.finale;
      const open = finaleUnlocked();
      return h('button', {
        class: 'meta-card finale' + (open ? '' : ' locked'),
        onclick: () => open && go({ view: 'puzzle', id: f.id }),
      },
        h('div', { class: 'dish' }, plateDish(f)),
        h('div', {},
          h('div', { class: 'kicker' }, open ? 'The grand finale' : '🔒 Solve every chapter meta to unlock'),
          h('h2', { dir: 'auto' }, f.title || 'Finale'),
          isSolved(f) && h('span', { class: 'answer' }, progress.solved[f.id])));
    }

    function plateDish(p) {
      return [icon(p.icon), isSolved(p) && h('span', { class: 'stamp' }, 'SOLVED')];
    }

    function chapterView(ch, ci) {
      if (!chapterUnlocked(ci)) return [backHome(), h('div', { class: 'card' }, '🔒 This chapter is still locked.')];
      const need = metaNeed(ch);
      const metaOpen = metaUnlocked(ch, ci);
      const left = Math.max(need - solvedCount(ch), 0);
      return h('div', { style: colorVars(ch) },
        backHome(),
        h('section', { class: 'banner' },
          h('div', { class: 'icon' }, icon(ch.icon)),
          h('div', {},
            h('div', { class: 'sub' }, 'Chapter ' + (ci + 1)),
            h('h1', { dir: 'auto' }, ch.title || 'Untitled chapter'),
            ch.subtitle && h('div', { class: 'sub', dir: 'auto' }, ch.subtitle))),
        ch.intro && h('section', { class: 'card body', dir: 'auto', html: md(ch.intro) }),
        h('div', { class: 'plates' }, ch.puzzles.map((p) =>
          h('button', { class: 'plate', onclick: () => go({ view: 'puzzle', id: p.id }) },
            h('div', { class: 'dish' }, plateDish(p)),
            h('div', { class: 'name', dir: 'auto' }, p.title || 'Untitled puzzle'),
            isSolved(p) && h('span', { class: 'answer' }, progress.solved[p.id])))),
        ch.meta && h('button', {
          class: 'meta-card' + (metaOpen ? '' : ' locked'),
          onclick: () => metaOpen && go({ view: 'puzzle', id: ch.meta.id }),
        },
          h('div', { class: 'dish' }, plateDish(ch.meta)),
          h('div', {},
            h('div', { class: 'kicker' }, metaOpen ? 'The chapter meta' : `🔒 Solve ${left} more puzzle${left === 1 ? '' : 's'} to unlock the meta`),
            h('h2', { dir: 'auto' }, ch.meta.title || 'Meta'),
            isSolved(ch.meta) && h('span', { class: 'answer' }, progress.solved[ch.meta.id]))));
    }

    function puzzleView(info) {
      const { puzzle: p, chapter: ch, kind } = info;
      const back = ch
        ? h('button', { class: 'back', onclick: () => go({ view: 'chapter', id: ch.id }) }, '← ', ch.title || 'Chapter')
        : backHome();
      if (!unlocked(info)) return [back, h('div', { class: 'card' }, '🔒 This puzzle is still locked.')];
      const solved = isSolved(p);
      const hintsShown = progress.hints[p.id] || 0;
      const hints = (p.hints || []).filter((x) => x && x.trim());
      const guesses = progress.guesses[p.id] || [];
      const kicker = kind === 'meta' ? 'Meta' : kind === 'finale' ? 'Finale' : null;

      return h('div', { style: colorVars(ch) },
        back,
        h('header', { class: 'puzzle-head' },
          h('div', { class: 'dish' }, plateDish(p)),
          h('div', {},
            kicker && h('div', { class: 'ribbon' }, kicker),
            h('h1', { dir: 'auto' }, p.title || 'Untitled puzzle'))),
        p.flavor && h('p', { class: 'flavor', dir: 'auto' }, p.flavor),
        h('section', { class: 'card paper body', dir: 'auto', html: md(p.body) || '<p class="muted">(No puzzle content yet.)</p>' }),

        h('section', { class: 'card answer-box' },
          solved
            ? [h('div', { class: 'solved-banner' }, '🎉 Solved!', h('span', { class: 'solved-answer' }, progress.solved[p.id])),
              p.solveText && h('div', { class: 'body', dir: 'auto', style: { marginTop: '12px' }, html: md(p.solveText) })]
            : [h('h3', {}, 'Your answer'),
              h('form', { onsubmit: (e) => { e.preventDefault(); submit(p, e.target.elements.guess.value); } },
                h('input', { name: 'guess', autocomplete: 'off', autocapitalize: 'characters', spellcheck: false, placeholder: 'Type your answer…', dir: 'auto' }),
                h('button', { class: 'btn primary', type: 'submit' }, 'Submit'))],
          flash && h('div', { class: 'feedback ' + flash.kind, dir: 'auto' }, flash.text),
          guesses.length > 0 && h('ul', { class: 'guesses' }, guesses.map((g) => h('li', { class: g.result, dir: 'auto' }, g.text)))),

        hints.length > 0 && h('section', { class: 'card' },
          h('h3', {}, '💡 Need a nudge?'),
          hints.slice(0, hintsShown).map((t, i) =>
            h('div', { class: 'hint' }, h('b', {}, `Hint ${i + 1}`), h('div', { class: 'body', dir: 'auto', html: md(t) }))),
          hintsShown < hints.length
            ? h('button', {
              class: 'btn quiet', style: { marginTop: '10px' },
              onclick: () => { progress.hints[p.id] = hintsShown + 1; save(); render(); },
            }, hintsShown ? 'Show another hint' : 'Show a hint', ` (${hints.length - hintsShown} left)`)
            : h('p', { class: 'muted', style: { marginTop: '10px' } }, 'That’s every hint for this one!')));
    }

    function backHome() {
      return h('button', { class: 'back', onclick: () => go({ view: 'home' }) }, '← ', hunt.title || 'Home');
    }

    // ---------- Answer checking ----------
    function submit(p, raw) {
      const norm = normalizeAnswer(raw);
      if (!norm) return;
      const display = raw.trim().toUpperCase();
      const guesses = (progress.guesses[p.id] = progress.guesses[p.id] || []);
      const hash = hashAnswer(hunt.salt, raw);
      const before = snapshotUnlocks();

      if ((p.answerHashes || []).includes(hash)) {
        progress.solved[p.id] = display;
        guesses.unshift({ text: display, result: 'right' });
        const newly = snapshotUnlocks().filter((x) => !before.includes(x));
        flash = { kind: 'right', text: newly.length ? `Correct! ${newly.join(' ')}` : 'Correct!' };
        celebrate();
      } else if (guesses.some((g) => normalizeAnswer(g.text) === norm)) {
        flash = { kind: 'wrong', text: `You already tried ${display}.` };
      } else {
        const partial = (p.partials || []).find((x) => x.hash === hash);
        if (partial) {
          guesses.unshift({ text: display, result: 'partial' });
          flash = { kind: 'partial', text: partial.message || 'Keep going!' };
        } else {
          guesses.unshift({ text: display, result: 'wrong' });
          flash = { kind: 'wrong', text: `${display} isn’t it. Try again!` };
        }
      }
      save();
      render();
    }

    function snapshotUnlocks() {
      const out = [];
      chapters().forEach((ch, ci) => {
        if (ch.meta && metaUnlocked(ch, ci)) out.push(`The “${ch.meta.title || 'meta'}” meta is now open!`);
        if (chapterUnlocked(ci)) out.push(`Chapter ${ci + 1} is now open!`);
      });
      if (finaleUnlocked()) out.push('The finale is now open!');
      if (huntComplete()) out.push('You finished the whole hunt! 🏆');
      return out;
    }

    function celebrate() {
      const box = h('div', { class: 'hunt-confetti' });
      for (let i = 0; i < 28; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 160 + Math.random() * 260;
        box.append(h('span', {
          style: {
            '--dx': `${Math.cos(a) * r}px`, '--dy': `${Math.sin(a) * r - 80}px`,
            '--rot': `${Math.random() * 720 - 360}deg`, animationDelay: `${Math.random() * 0.15}s`,
          },
        }, CONFETTI[i % CONFETTI.length]));
      }
      document.body.append(box);
      setTimeout(() => box.remove(), 1900);
    }

    render();
    return {
      setHunt(next) { hunt = next; render(); },
      go,
      reset() { progress = { solved: {}, guesses: {}, hints: {} }; save(); render(); },
    };
  }

  window.HuntPlayer = HuntPlayer;
})();
