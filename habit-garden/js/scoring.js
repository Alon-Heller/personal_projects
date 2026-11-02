// Points. Each action's points are worked out once, when it happens, and stored
// on the record (log.points, step.points, dragon.bounty). Editing a rhythm or
// dragon later never changes what was already earned. Undo removes exactly
// what that action gave; nothing else ever takes points away.
(function () {
  const HG = window.HG;
  const { store, model } = HG;

  const RULES = {
    logBase: 10,          // any rhythm log
    comebackPerDay: 2,    // per day past the expected gap, when the rhythm was quiet
    comebackCap: 30,      // max comeback bonus
    step: 5,              // any dragon step
    bountyPerDread: 20,   // slaying a dragon: 20 × dread (20–100)
  };

  // Points a log would earn right now. A comeback bonus applies when the
  // rhythm is quiet, i.e. on the first log after it went quiet.
  function rhythmLogPoints(rhythm, now = new Date()) {
    const s = model.rhythmState(rhythm, now);
    let bonus = 0;
    if (s.status === 'quiet') {
      const overdueDays = Math.max(1, Math.ceil(s.daysSince - s.gap));
      bonus = Math.min(RULES.comebackCap, RULES.comebackPerDay * overdueDays);
    }
    return { base: RULES.logBase, bonus, total: RULES.logBase + bonus, comeback: bonus > 0 };
  }

  const stepPoints = () => RULES.step;
  const bounty = (dread) => RULES.bountyPerDread * dread;

  // Every point event, newest first: { at, points, kind, label }.
  function events() {
    const rhythms = Object.fromEntries(store.list('rhythms', { includeArchived: true }).map((r) => [r.id, r]));
    const dragons = Object.fromEntries(store.list('dragons', { includeArchived: true }).map((d) => [d.id, d]));
    const out = [];
    store.list('logs').forEach((l) => {
      if (l.points) out.push({ at: l.at, points: l.points, kind: l.bonus ? 'comeback' : 'log', label: rhythms[l.rhythmId]?.name || 'A rhythm' });
    });
    store.list('steps').forEach((s) => {
      if (s.doneAt && s.points) out.push({ at: s.doneAt, points: s.points, kind: 'step', label: s.text });
    });
    Object.values(dragons).forEach((d) => {
      if (d.slainAt && d.bounty) out.push({ at: d.slainAt, points: d.bounty, kind: 'slay', label: d.name });
    });
    return out.sort((a, b) => b.at.localeCompare(a.at));
  }

  function totals(now = new Date()) {
    const today = HG.dayKey(now);
    let total = 0, todayPts = 0;
    events().forEach((e) => {
      total += e.points;
      if (HG.dayKey(e.at) === today) todayPts += e.points;
    });
    return { total, today: todayPts };
  }

  HG.scoring = { RULES, rhythmLogPoints, stepPoints, bounty, events, totals };
})();
