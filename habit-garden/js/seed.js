// First-run examples, so the app isn't empty. Edit or archive them in Setup.
(function () {
  const HG = window.HG;
  const store = HG.store;

  HG.seedIfFirstRun = function () {
    if (store.settings().seeded) return;
    store.create('rhythms', { name: 'Meditate', kind: 'perWeek', n: 3, archived: false });
    store.create('rhythms', { name: 'See a friend', kind: 'every', n: 10, archived: false });
    store.create('rhythms', { name: 'Cook something new', kind: 'every', n: 7, archived: false });

    const d = store.create('dragons', { name: 'Cancel the old credit card', dread: 3, pinned: false, archived: false, slainAt: null });
    ['Find the card’s phone number', 'Call and ask them to cancel it', 'Check the final statement is zero'].forEach((text, i) =>
      store.create('steps', { dragonId: d.id, text, order: i, doneAt: null })
    );
    store.updateSettings({ seeded: true });
  };
})();
