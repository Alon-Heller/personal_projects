# Habit Garden 🌱

A private, phone-first app that rewards doing things I tend to drop: recurring
**rhythms** and dreaded one-off **dragons**. No accounts, no server: data lives
in this browser's localStorage.

Open `index.html` (double-clicking works) or serve the folder statically.

**Demo mode:** Setup → "Try the demo" (or open `index.html?demo`) for backdated example data showing every rhythm state. It is stored separately, so your own data is never touched; *Reset* rebuilds it relative to today, *Exit* goes back to your data.

| File | What it is |
|---|---|
| `js/storage.js` | The only code that reads/writes localStorage. Records have `id`, `createdAt`, `updatedAt`; deletes are tombstones. Swap or wrap this for sync. |
| `js/model.js` | Rhythm status and which dragon to show today. No DOM. |
| `js/scoring.js` | Point rules and totals. |
| `js/app.js` | Screens and taps. |
| `js/seed.js` | First-run example rhythms and dragon. |
| `js/demo.js` | Demo-mode data covering every rhythm state. |

## Rules so far
- **Status:** on rhythm under 80% of the expected gap since the last log (or, for "N× a week", while the last 7 days hold N logs); due at 80–100%; quiet past the gap. The gap is N days, or 7/N for "N× a week".
- **Logging:** one tap turns the card to a solid "Done" state; "+ again" logs extra times the same day. Every log has a 5-second undo. The Today list keeps its order while you are on it and re-sorts when you come back.
- **Today's dragon:** pinned, then highest dread. At most once every 10 days, the dragon left alone longest (10+ days) gets the spotlight for that day instead.
- **Points:** a log earns 10. Logging a quiet rhythm adds a welcome-back bonus of 2 per day past its expected gap (max +30). A dragon step earns 5, and slaying a dragon earns 20 × dread. Points are stored on each record when earned, so later edits never change them; only Undo takes back what that one action gave.
