// App logic on top of the store: rhythm status, dragon order. No DOM here.
(function () {
  const HG = window.HG;
  const store = HG.store;

  // Rhythm targets:
  //   { kind: 'perWeek', n: 3 }  -> "about 3× a week"
  //   { kind: 'every',   n: 10 } -> "every ~10 days"
  const expectedGap = (r) => (r.kind === 'perWeek' ? 7 / r.n : r.n);

  const targetLabel = (r) => {
    if (r.kind === 'perWeek') return r.n === 1 ? 'about weekly' : `about ${r.n}× a week`;
    if (r.n === 1) return 'daily';
    if (r.n === 7) return 'weekly';
    return `every ~${r.n} days`;
  };

  const logsFor = (rhythmId) =>
    store
      .list('logs')
      .filter((l) => l.rhythmId === rhythmId)
      .sort((a, b) => a.at.localeCompare(b.at));

  // Status rules:
  //   on rhythm: under 80% of the expected gap since the last log
  //              (for "N× a week": also on rhythm while the last 7 days hold N logs)
  //   due:       80–100% of the gap
  //   quiet:     past the gap
  //   new:       never logged and not yet quiet (counted from when it was added)
  function rhythmState(r, now = new Date()) {
    const logs = logsFor(r.id);
    const last = logs[logs.length - 1];
    const anchor = last ? last.at : r.createdAt;
    const daysSince = HG.daysBetween(anchor, now);
    const gap = expectedGap(r);
    const ratio = daysSince / gap;
    const todayKey = HG.dayKey(now);
    const todayCount = logs.filter((l) => HG.dayKey(l.at) === todayKey).length;
    const weekCount = logs.filter((l) => HG.daysBetween(l.at, now) < 7).length;

    let status;
    if (daysSince > gap) status = 'quiet';
    else if (!last) status = 'new';
    else if (ratio < 0.8 || (r.kind === 'perWeek' && weekCount >= r.n)) status = 'on';
    else status = 'due';

    return { status, daysSince, gap, ratio, last, todayCount, weekCount, everLogged: !!last };
  }

  const STATUS_ORDER = { quiet: 0, due: 1, new: 2, on: 3 };

  // Quiet first, then due, then not started, then on rhythm.
  function todayRhythms(now = new Date()) {
    return store
      .list('rhythms')
      .map((r) => ({ rhythm: r, state: rhythmState(r, now) }))
      .sort(
        (a, b) =>
          STATUS_ORDER[a.state.status] - STATUS_ORDER[b.state.status] ||
          b.state.ratio - a.state.ratio ||
          a.rhythm.name.localeCompare(b.rhythm.name)
      );
  }

  // ---- Dragons ----

  const stepsFor = (dragonId) =>
    store
      .list('steps')
      .filter((s) => s.dragonId === dragonId)
      .sort((a, b) => a.order - b.order);

  const nextStep = (dragonId) => stepsFor(dragonId).find((s) => !s.doneAt) || null;

  const activeDragons = () => store.list('dragons').filter((d) => !d.slainAt);

  // When I last did anything about this dragon.
  function lastTouched(d) {
    return stepsFor(d.id).reduce((t, s) => (s.doneAt && s.doneAt > t ? s.doneAt : t), d.createdAt);
  }

  const OLD_DRAGON_EVERY_DAYS = 10;
  const OLD_DRAGON_MIN_IDLE_DAYS = 10;

  // Which dragon to show on Today.
  // Usually: pinned first, then highest dread, then oldest.
  // At most once every 10 days, the dragon left alone the longest (10+ days)
  // gets the spotlight for that whole day instead.
  // Returns { main, reason: 'pinned'|'dread'|'old', usual }.
  function pickTodayDragon(now = new Date()) {
    const ds = activeDragons();
    if (!ds.length) return { main: null };
    const ranked = ds.slice().sort(
      (a, b) =>
        (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) ||
        b.dread - a.dread ||
        a.createdAt.localeCompare(b.createdAt)
    );
    const usual = ranked[0];
    const usualResult = { main: usual, reason: usual.pinned ? 'pinned' : 'dread', usual };
    const today = HG.dayKey(now);
    const od = store.settings().oldDragon;

    if (od && od.day === today) {
      const d = ds.find((x) => x.id === od.dragonId);
      return d && d.id !== usual.id ? { main: d, reason: 'old', usual } : usualResult;
    }

    const allowed = !od || HG.daysBetween(od.day, today) >= OLD_DRAGON_EVERY_DAYS;
    if (!allowed) return usualResult;

    const old = ds
      .filter((d) => d.id !== usual.id)
      .map((d) => ({ d, t: lastTouched(d) }))
      .filter((x) => HG.daysBetween(x.t, now) >= OLD_DRAGON_MIN_IDLE_DAYS)
      .sort((a, b) => a.t.localeCompare(b.t))[0];
    if (!old) return usualResult;

    store.updateSettings({ oldDragon: { dragonId: old.d.id, day: today } });
    return { main: old.d, reason: 'old', usual };
  }

  HG.model = {
    expectedGap,
    targetLabel,
    logsFor,
    rhythmState,
    todayRhythms,
    stepsFor,
    nextStep,
    activeDragons,
    lastTouched,
    pickTodayDragon,
  };
})();
