// UI: tabs and screens.
(function () {
  const HG = window.HG;
  const { store, model, scoring, esc } = HG;

  const view = document.getElementById('view');
  const TABS = ['today', 'garden', 'setup'];

  function currentTab() {
    const t = location.hash.replace('#', '');
    return TABS.includes(t) ? t : 'today';
  }

  // The Today list keeps its order while you're on the screen, so a card you
  // tap changes in place instead of jumping. It re-sorts when you come back.
  let todayOrder = null;
  let justLogged = null; // rhythm id whose done state should animate in

  function render({ resort = false } = {}) {
    if (resort) todayOrder = null;
    const tab = currentTab();
    document.querySelectorAll('.tabs [data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    if (tab === 'today') renderToday();
    else if (tab === 'garden') renderPlaceholder('Garden', '🌱', 'Your garden will grow here from the points you earn.');
    else renderPlaceholder('Setup', '🛠️', 'Adding and editing rhythms and dragons comes in a later step.');
    renderDemoBanner();
  }

  // ---------- Demo banner ----------

  function renderDemoBanner() {
    if (!HG.isDemo) {
      if (currentTab() === 'setup')
        view.insertAdjacentHTML('beforeend', `<p class="demo-link"><button class="btn link demo-try" data-demo-switch="on">Try the demo with example data →</button><br><small>Kept separate from your own data.</small></p>`);
      return;
    }
    view.insertAdjacentHTML(
      'afterbegin',
      `<div class="demo-banner">
         <span>🧪 Demo data. Your own data isn't touched.</span>
         <span class="demo-actions">
           <button class="demo-btn" data-demo-reset>Reset</button>
           <button class="demo-btn" data-demo-switch="off">Exit</button>
         </span>
       </div>`
    );
  }

  // ---------- Today ----------

  const STATUS_LABEL = { on: 'on rhythm', due: 'due', quiet: 'quiet', new: 'not started' };

  function renderToday() {
    const now = new Date();
    const dateText = now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
    let rows = model.todayRhythms(now);
    if (todayOrder) {
      const pos = (id) => (todayOrder.includes(id) ? todayOrder.indexOf(id) : Infinity);
      rows = rows.slice().sort((a, b) => pos(a.rhythm.id) - pos(b.rhythm.id));
    }
    todayOrder = rows.map((x) => x.rhythm.id);
    const pick = model.pickTodayDragon(now);
    const pts = scoring.totals(now);

    view.innerHTML = `
      <header class="top top-row">
        <div>
          <h1>Today</h1>
          <p class="sub">${esc(dateText)}</p>
        </div>
        <a href="#garden" class="points" id="points" aria-label="${pts.total} points">
          <span class="points-num">🌱 ${pts.total}</span>
          <span class="points-today">${pts.today ? `+${pts.today} today` : 'points'}</span>
        </a>
      </header>

      <section>
        <h2 class="sec">Rhythms</h2>
        ${rows.length ? rows.map(rhythmCard).join('') : `<p class="empty">No rhythms yet. Add some in Setup.</p>`}
      </section>

      <section>
        <h2 class="sec">Dragon</h2>
        ${pick.main ? dragonCard(pick.main, pick.reason) : `<p class="empty">No dragons waiting. Lovely.</p>`}
        ${pick.reason === 'old' && pick.usual ? dragonCard(pick.usual, 'usual', true) : ''}
      </section>
    `;
    justLogged = null;
  }

  function rhythmCard({ rhythm: r, state: s }) {
    const when = !s.everLogged ? 'not logged yet · ' : s.daysSince > 0 ? `last time ${HG.agoText(s.daysSince)} · ` : '';
    const done = s.todayCount > 0;
    const action = done
      ? `<div class="done-wrap">
           <div class="done-badge ${justLogged === r.id ? 'just' : ''}" aria-label="Done today">
             <span class="tick" aria-hidden="true">✓</span><span>${s.todayCount > 1 ? `Done ${s.todayCount}×` : 'Done'}</span>
           </div>
           <button class="again-btn" data-log="${esc(r.id)}" aria-label="Log ${esc(r.name)} again">+ again</button>
         </div>`
      : `<button class="log-btn" data-log="${esc(r.id)}" aria-label="Log ${esc(r.name)}">
           <span class="tick" aria-hidden="true">✓</span><span>Did it</span>
         </button>`;
    return `
      <article class="card rhythm st-${s.status} ${done ? 'done' : ''}">
        <div class="r-main">
          <div class="r-name">${esc(r.name)}</div>
          <div class="r-meta">
            <span class="pill">${STATUS_LABEL[s.status]}</span>
          </div>
          <div class="r-when">${when}${esc(model.targetLabel(r))}</div>
          ${s.status === 'quiet' ? `<div class="r-welcome">${s.everLogged ? 'Welcome back' : 'First-time'} bonus waiting: +${scoring.rhythmLogPoints(r).bonus}</div>` : ''}
        </div>
        ${action}
      </article>`;
  }

  const dreadDots = (n) => '●'.repeat(n) + '○'.repeat(5 - n);

  function dragonCard(d, reason, compact = false) {
    const steps = model.stepsFor(d.id);
    const next = steps.find((s) => !s.doneAt);
    const doneCount = steps.filter((s) => s.doneAt).length;
    const label = {
      pinned: '📌 Pinned dragon',
      dread: '🐉 Top dragon',
      old: '🕸️ An old dragon wakes up',
      usual: 'Your usual dragon',
    }[reason];

    let body;
    if (next) {
      body = `
        <div class="d-progress">Step ${doneCount + 1} of ${steps.length}</div>
        <div class="d-step">${esc(next.text)}</div>
        <div class="d-actions">
          <button class="btn primary" data-step-done="${esc(next.id)}">Done</button>
          <button class="btn link" data-slay="${esc(d.id)}" data-early="1">Slain already?</button>
        </div>`;
    } else if (steps.length) {
      body = `
        <div class="d-step">Every step is done.</div>
        <div class="d-actions"><button class="btn primary" data-slay="${esc(d.id)}">Slay it 🗡️</button></div>`;
    } else {
      body = `
        <div class="d-step muted">No steps yet. Add a tiny first one in Setup.</div>
        <div class="d-actions"><button class="btn link" data-slay="${esc(d.id)}" data-early="1">Slain already?</button></div>`;
    }

    return `
      <article class="card dragon ${compact ? 'compact' : ''} ${reason === 'old' ? 'old' : ''}">
        <div class="d-label"><span>${label}</span><span class="dread" title="Dread ${d.dread} of 5">${dreadDots(d.dread)}</span></div>
        <div class="d-name">${esc(d.name)}</div>
        ${body}
      </article>`;
  }

  // ---------- Actions ----------

  view.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    if (btn.dataset.demoSwitch) {
      HG.setDemoMode(btn.dataset.demoSwitch === 'on');
      // Reload without ?demo so the remembered flag decides the mode.
      if (location.search) location.href = location.pathname + '#today';
      else {
        location.hash = 'today';
        location.reload();
      }
      return;
    }

    if (btn.dataset.demoReset !== undefined) {
      store.clearAll();
      HG.seedDemo();
      render({ resort: true });
      toast('Demo reset to fresh example data');
      return;
    }

    if (btn.dataset.log) {
      const r = store.get('rhythms', btn.dataset.log);
      if (!r) return;
      const p = scoring.rhythmLogPoints(r);
      const firstEver = !model.logsFor(r.id).length;
      const log = store.create('logs', { rhythmId: r.id, at: HG.nowIso(), points: p.total, bonus: p.bonus });
      const cheer = firstEver ? 'first time!' : 'welcome back!';
      floatPoints(btn, p.comeback ? `+${p.total} ${cheer}` : `+${p.total}`, p.comeback);
      justLogged = r.id;
      render();
      toast(
        p.comeback && firstEver ? `First “${r.name}” · +${p.total}`
          : p.comeback ? `Welcome back to “${r.name}” · +${p.total}`
          : `Logged “${r.name}” · +${p.total}`, () => store.remove('logs', log.id));
    }

    if (btn.dataset.stepDone) {
      const s = store.get('steps', btn.dataset.stepDone);
      if (!s) return;
      const pts = scoring.stepPoints();
      store.update('steps', s.id, { doneAt: HG.nowIso(), points: pts });
      floatPoints(btn, `+${pts}`);
      render();
      toast(`Step done · +${pts}`, () => store.update('steps', s.id, { doneAt: null, points: null }));
    }

    if (btn.dataset.slay) {
      const d = store.get('dragons', btn.dataset.slay);
      if (!d) return;
      if (btn.dataset.early && !confirm(`Mark “${d.name}” as slain?`)) return;
      const b = scoring.bounty(d.dread);
      store.update('dragons', d.id, { slainAt: HG.nowIso(), bounty: b });
      floatPoints(btn, `+${b} bounty!`, true);
      render();
      toast(`“${d.name}” slain 🗡️ · +${b}`, () => store.update('dragons', d.id, { slainAt: null, bounty: null }));
    }
  });

  // ---------- "+N" that floats up from where you tapped ----------

  function floatPoints(anchor, text, big = false) {
    const r = anchor.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'float-pts' + (big ? ' big' : '');
    el.textContent = text;
    el.style.top = r.top + 'px';
    document.body.appendChild(el);
    // Keep the text on screen: centre it on the button, but clamp to the edges.
    const half = el.offsetWidth * 0.55 + 16; // room for the 1.1× pop
    const x = Math.min(Math.max(r.left + r.width / 2, half), window.innerWidth - half);
    el.style.left = x + 'px';
    el.addEventListener('animationend', () => el.remove());
  }

  // ---------- Toast with undo ----------

  const toastEl = document.getElementById('toast');
  let toastTimer = null;

  function toast(msg, undo) {
    clearTimeout(toastTimer);
    toastEl.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button class="toast-undo">Undo</button>' : ''}`;
    toastEl.hidden = false;
    requestAnimationFrame(() => toastEl.classList.add('show'));
    const btn = toastEl.querySelector('.toast-undo');
    if (btn)
      btn.onclick = () => {
        undo();
        hideToast();
        render();
      };
    toastTimer = setTimeout(hideToast, 5000);
  }

  function hideToast() {
    toastEl.classList.remove('show');
    setTimeout(() => (toastEl.hidden = true), 200);
  }

  // ---------- Placeholders ----------

  function renderPlaceholder(title, icon, text) {
    view.innerHTML = `
      <header class="top"><h1>${esc(title)}</h1></header>
      <div class="placeholder"><div class="ph-icon">${icon}</div><p>${esc(text)}</p></div>`;
  }

  // ---------- Boot ----------

  HG.seedIfFirstRun();
  window.addEventListener('hashchange', () => {
    render({ resort: true });
    window.scrollTo(0, 0);
  });
  // Re-render when the day changes or the app comes back to the foreground.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) render({ resort: true });
  });
  // Another tab changed the data (storage.js has already dropped its cache).
  window.addEventListener('storage', () => render({ resort: true }));
  render({ resort: true });
})();
