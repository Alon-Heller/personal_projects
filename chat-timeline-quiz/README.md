# When Was That? 💬📅

A small quiz game for two people. Show your partner a chat screenshot. They drag a pin to the day they think it happened, anywhere between your first message and today, and score points for how close they get.

It's a single `index.html` file with no build step and no server. Everything stays in the browser on your device.

## How to play

1. **Open `index.html`** on your phone. The easiest way is to turn on GitHub Pages for this repo and open `…/chat-timeline-quiz/`. You can also send yourself the file and open it in a browser.
2. **Set the timeline:** the day of the first message and the quiz day (today).
3. **Add screenshots** and tap each one to:
   - set the **real date** of the messages (dates are pre-filled from file names like `Screenshot_20251103-…` or `IMG-20251103-WA0001`, so double-check them);
   - **draw black boxes** over anything that gives the answer away: WhatsApp date chips ("Today", "12 March"), the status-bar clock, and so on.
4. **Start the quiz** and hand over the phone. Screenshots come in random order. Drag the pin, or use the ±day/±week buttons, then lock it in.
5. At the end you see the total score, every guess against the real date on one timeline, and the screenshots in date order.

## Scoring

`points = 1000 × e^(−days_off / 40)`

| Days off | Points |
|---|---|
| 0 | 1000 |
| 7 | ~840 |
| 30 | ~470 |
| 90 | ~100 |

## Moving between devices

Screenshots are saved in the browser (IndexedDB). If you prepare the quiz on one phone and play on another, use **Export quiz** to get a `.json` file, then **Import quiz** on the other device. Don't commit exported files or screenshots to the repo, because they contain your private chats.
