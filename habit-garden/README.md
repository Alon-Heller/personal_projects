# Habit Garden 🌱

A private, phone-first app that rewards doing things I tend to drop: recurring
**rhythms** and dreaded one-off **dragons**. No accounts, no server: data lives
in this browser's localStorage.

Open `index.html` (double-clicking works) or serve the folder statically.

| File | What it is |
|---|---|
| `js/storage.js` | The only code that reads/writes localStorage. Records have `id`, `createdAt`, `updatedAt`; deletes are tombstones. Swap or wrap this for sync. |
| `js/model.js` | Rhythm status and which dragon to show today. No DOM. |
| `js/app.js` | Screens and taps. |
| `js/seed.js` | First-run example rhythms and dragon. |

## Rules so far
- **Status:** on rhythm under 80% of the expected gap since the last log (or, for "N× a week", while the last 7 days hold N logs); due at 80–100%; quiet past the gap. The gap is N days, or 7/N for "N× a week".
- **Logging:** one tap, as often as you like per day, with a 5-second undo.
- **Today's dragon:** pinned, then highest dread. At most once every 10 days, the dragon left alone longest (10+ days) gets the spotlight for that day instead.
