// Demo mode: open index.html?demo to get backdated example data covering
// every rhythm state. It lives under its own storage key (see storage.js),
// so real data is never touched. "Reset demo" rebuilds it relative to today.
(function () {
  const HG = window.HG;
  const store = HG.store;

  // Noon, n days ago (local). n = 0 means "a few minutes ago".
  function daysAgo(n, minutesEarlier = 0) {
    if (n === 0) return new Date(Date.now() - (minutesEarlier + 1) * 60000).toISOString();
    const d = new Date();
    d.setDate(d.getDate() - n);
    d.setHours(12, 0, 0, 0);
    return d.toISOString();
  }

  function rhythm(name, kind, n, { addedDaysAgo = 60, logsDaysAgo = [] } = {}) {
    const r = store.create('rhythms', { name, kind, n, archived: false, createdAt: daysAgo(addedDaysAgo) });
    logsDaysAgo.forEach((d, i) =>
      store.create('logs', { rhythmId: r.id, at: daysAgo(d, i), points: 10, bonus: 0, createdAt: daysAgo(d, i) })
    );
  }

  function dragon(name, dread, steps, { addedDaysAgo = 3, doneSteps = 0, doneDaysAgo = 1 } = {}) {
    const d = store.create('dragons', { name, dread, pinned: false, archived: false, slainAt: null, createdAt: daysAgo(addedDaysAgo) });
    steps.forEach((text, i) =>
      store.create('steps', {
        dragonId: d.id,
        text,
        order: i,
        doneAt: i < doneSteps ? daysAgo(doneDaysAgo) : null,
        points: i < doneSteps ? 5 : null,
      })
    );
  }

  HG.seedDemo = function () {
    // Quiet
    rhythm('See a friend', 'every', 10, { logsDaysAgo: [40, 25] });        // 15 days past the gap: max bonus
    rhythm('Call my parents', 'every', 7, { logsDaysAgo: [16, 9] });       // just quiet: small bonus
    rhythm('Stretch', 'every', 3, { addedDaysAgo: 8 });                   // never logged and went quiet
    // Due
    rhythm('Cook something new', 'every', 7, { logsDaysAgo: [13, 6] });   // 6 of ~7 days
    rhythm('Meditate', 'perWeek', 3, { logsDaysAgo: [9, 2] });             // 2 days, gap ~2.3
    // On rhythm
    rhythm('Read before bed', 'perWeek', 4, { logsDaysAgo: [3, 1] });      // recent
    rhythm('Gym', 'perWeek', 2, { logsDaysAgo: [5, 3] });                 // gap nearly used, but 2 this week
    // Not started
    rhythm('Journal', 'every', 7, { addedDaysAgo: 0 });
    // Done today
    rhythm('Walk outside', 'every', 1, { logsDaysAgo: [1, 0] });
    rhythm('Play guitar', 'every', 2, { logsDaysAgo: [2, 0, 0] });        // done twice today

    // Dragons: an old one gets today's spotlight, the usual one sits below it.
    dragon('Cancel the old credit card', 3,
      ['Find the card’s phone number', 'Call and ask them to cancel it', 'Check the final statement is zero'],
      { doneSteps: 1 });
    dragon('Tax forms', 5, ['Find last year’s login', 'Download the forms', 'Fill in section A', 'Submit']);
    dragon('Fix the bike light', 2, ['Check which battery it takes', 'Buy the battery'], { addedDaysAgo: 30 });

    store.updateSettings({ seeded: true });
  };
})();
