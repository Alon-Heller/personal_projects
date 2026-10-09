# When Was That? 💬📅

A small quiz game for two people. Show your partner a chat screenshot. They drag a pin to the day they think it happened, anywhere between your first message and today, and score points for how close they get.

There are two ways to play:
- **Board:** a Jeopardy-style grid. Each column is a category and each row is a point value (100 / 200 / 300 / 400 by default). The player picks squares in any order.
- **Quick play:** every screenshot, shuffled, each worth 1000 points.

It's a single `index.html` file with no build step and no server. Everything stays in the browser on your device.

## How to play

1. **Open `index.html`** on your phone. The easiest way is to turn on GitHub Pages for this repo and open `…/chat-timeline-quiz/`. You can also send yourself the file and open it in a browser.
2. **Set the timeline:** the day of the first message and the quiz day (today).
3. **Add screenshots** and tap each one to:
   - set the **real date** of the messages (dates are pre-filled from file names like `Screenshot_20251103-…` or `IMG-20251103-WA0001`, so double-check them);
   - **draw black boxes** over anything that gives the answer away: WhatsApp date chips ("Today", "12 March"), the status-bar clock, and so on.
4. **Build the board** (optional):
   - rename, add or remove **categories**;
   - set the **point values** as a comma-separated list, for example `100, 200, 300, 400` or `100, 250, 500`. Each value is one row;
   - tap an empty square to fill it with a screenshot (pick an existing one or upload a new one). You can also pick the square from a screenshot's editor. Squares you leave empty are simply skipped.
   - You can change all of this later. Screenshots stay in your list even if their square or category is removed.
5. **Play** and hand over the phone. Pick a square (or start quick play), drag the pin or use the ±day/±week buttons, then lock it in.
6. At the end you see the total score, every guess against the real date on one timeline, and the screenshots in date order.

## Scoring

A guess earns a share of the question's value. That share halves every *N* days off. You can set *N* in the app (default 28):

`points = value × 0.5^(days_off / N)`

| Days off | Share (N = 28) | on a 400 | on a 100 |
|---|---|---|---|
| 0 | 100% | 400 | 100 |
| 7 | ~84% | 336 | 84 |
| 30 | ~48% | 190 | 48 |
| 90 | ~11% | 43 | 11 |

## Moving between devices

Screenshots are saved in the browser (IndexedDB). If you prepare the quiz on one phone and play on another, use **Export quiz** to get a `.json` file, then **Import quiz** on the other device. Don't commit exported files or screenshots to the repo, because they contain your private chats.
