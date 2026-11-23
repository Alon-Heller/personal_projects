# Chat Viewer: offline WhatsApp export viewer

Open a WhatsApp chat export and read it comfortably: smooth scrolling through a year or more of messages, full-text search, a photo and video gallery, a calendar for jumping to any date, and a few stats.

It's a single `index.html`. You don't install anything, there's no server, and nothing is uploaded.

## Privacy

- **Everything runs locally in your browser tab.** The export is read straight from your disk. Media is decompressed on demand and shown from local `blob:` URLs.
- **Network access is blocked by the page itself.** A Content-Security-Policy (`connect-src 'none'`, no remote images, media, scripts, styles or fonts) means the page *cannot* send or load anything over the network, even by mistake. You can check this in the `<meta http-equiv="Content-Security-Policy">` line at the top of the file. You can also go offline before opening a chat, and it works exactly the same.
- **Nothing from the chat is stored.** The browser remembers only your theme, which participant is "you", your last scroll position, and your starred messages. Scroll position and stars are saved as message numbers plus a short checksum, never the text. Messages and media are never saved anywhere.

## How to use

1. Export the chat on your phone:
   - **iPhone:** open the chat → tap the contact's name → *Export Chat* → *Attach Media*.
   - **Android:** open the chat → ⋮ → *More* → *Export chat* → *Include media*.
2. Copy the resulting `.zip` to your computer, for example with AirDrop, a USB cable or Nearby Share. To keep it fully offline, avoid sending it through a cloud service.
3. Open `index.html` in Chrome, Edge, Firefox or Safari, straight from disk (`file://` is fine). Then either:
   - drag the `.zip` onto the page (you don't need to unzip it), or
   - use **Open .zip / .txt**, or
   - use **Open unzipped folder**. You can also drag a folder in, or select a `.txt` together with its media files.
4. Pick which participant is you, so your messages show on the right.

## Features

- **Fast scrolling for big chats.** Only the messages near the screen are rendered, so 100k+ messages scroll smoothly. Day separators and a floating date chip show where you are.
- **Timeline scrubber** on the right edge. Drag it to fly through months, and hover it to see month labels.
- **Search** (Ctrl/⌘+F or `/`) across all messages, with highlighted matches and a results list. Enter / Shift+Enter step through results. You can filter by sender or by type (with photo/video, file/audio, link).
- **Media panel** with photos and videos (grouped by month, newest first), voice notes and audio, files, and every link shared in the chat. Each item has *show in chat*.
- **Photo viewer** with ←/→ keys or swipe, the caption, *Show in chat*, and *Save a copy*.
- **Stars**: point at a message (on a phone, tap it) and click ☆ to star it. These are the viewer's own stars, separate from anything starred in WhatsApp. The ★ panel lists all starred messages, oldest or newest first, with photo thumbnails. Click one to jump to it. Search has a *Starred only* filter. Stars are remembered per chat in this browser. Use *Save stars to file* / *Load stars from file* to back them up or move them to another browser.
- **Board** (columns button in the header, or press `B`): sort your starred messages into named columns. The bottom 20% holds every starred message that isn't in a column yet, oldest first. Drag cards up into columns, between columns, up and down within a column, or back down to the bottom row. *+ New column* adds a column. Click a column's name to rename it. Drag the ⋮⋮ handle to reorder columns, and × deletes a column (its cards go back to the bottom row, still starred). Hover a card to *show it in the chat* or take it out of its column. Esc cancels a drag. The board is saved per chat in this browser, and *Save stars to file* includes your columns and your quiz.
- **Quiz** (dial button in the header, or press `Q`): a Jeopardy-style "when was this sent?" game built from your starred messages.
  - *Set up*: name the categories, set the point values (for example `100, 200, 300, 400`), and click a square to pick a starred message for it. The picker can show all starred messages, one of your Board columns (in that column's order), or only the ones not in any column. If a category has the same name as a column, the picker opens on that column. For each square, choose the context separately for *before answering* and *after the reveal* (how many messages before and after it). The reveal always shows at least what the question showed. The preview shows the chat around the message in zones: shown with the question, shown only after the reveal (dashed gold), and 3 greyed messages beyond each edge that are never shown, so you can see what's just outside. Dates and times are always hidden. *Auto-fill empty* puts random unused starred messages in the empty squares. To swap two squares, hover one and click its ⇄ button, then click the other square (Esc cancels). Empty squares work too, so this also moves a message, and a square that was already played is re-scored for its new point value.
  - *Play*: click a square, read the message, then turn the half-circle dial (first day of the chat on the left, last day on the right) to your guess. Fine-tune with the ±day/week/month buttons or the ← → keys, and press *Lock in* or Enter. Coloured bands fan out around the real date, and you score `value × 0.5^(days off / N)`, where N ("half points at N days off") defaults to 28. The game is saved as you go, and *New game* clears the scores but keeps the squares.
  - *Clean view* (button in the quiz toolbar) hides the app header, toolbar and side panel, so only the board and a small score remain, filling the screen. Press Esc or the small × to come back.
  - *Prizes*: four times per game (about every 5-7 squares on a 20-30 square board) a popup announces that you just passed a points milestone and unlocked Prize #1...#4. Milestones are multiples of 500 when the score allows, otherwise multiples of 100. A prize fires early if the score really crosses a multiple of 500 near its planned spot, and any prize still owed is given on the last square, so all four always happen. *New game* resets them.
- **Jump to date**: a date picker plus a month-by-month heat-map calendar. Click any day to jump to it. It also shows stats: messages per person, active days, and the busiest day.
- Inline images, videos, voice notes (`.opus`), stickers and documents. *bold*, _italic_ and ~strike~ formatting and links are shown as in WhatsApp. Right-to-left text (Hebrew, Arabic) is supported. Light and dark themes are included, and the layout works on phones.
- Handles iPhone and Android export formats in many locales: `[31/12/2024, 22:15:03]`, `12/31/24, 10:15 PM -`, `31.12.2024, 22:15 -`, `2024-12-31 22:15 -`, and others. Day/month order is detected automatically. You can override it in Settings if dates look wrong.

Keyboard: `Ctrl/⌘+F` or `/` search · `Enter` / `Shift+Enter` next/previous result · `Home` / `End` first/last message · `B` board · `Q` quiz · `Esc` close · `←` `→` in the photo viewer.

## Notes

- HEIC photos only display in Safari. Other browsers show the file name, and *Save a copy* still works.
- Some `.mov` videos use codecs your browser can't play. Use *Save a copy* to open them in another app.
- Media you didn't export ("image omitted" / `<Media omitted>`) shows as a note.

## Try it without your own data

`tools/make_sample.py` generates two fake year-long exports (iPhone-style and Android-style) using only the Python standard library. If `ffmpeg` is installed, it adds a few videos and voice notes too.

```bash
python3 tools/make_sample.py samples/
```
