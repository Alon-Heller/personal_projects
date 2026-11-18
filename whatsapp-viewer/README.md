# Chat Viewer: offline WhatsApp export viewer

Open a WhatsApp chat export and read it comfortably: smooth scrolling through a year or more of messages, full-text search, a photo and video gallery, a calendar for jumping to any date, and a few stats.

It's a single `index.html`. You don't install anything, there's no server, and nothing is uploaded.

## Privacy

- **Everything runs locally in your browser tab.** The export is read straight from your disk. Media is decompressed on demand and shown from local `blob:` URLs.
- **Network access is blocked by the page itself.** A Content-Security-Policy (`connect-src 'none'`, no remote images, media, scripts, styles or fonts) means the page *cannot* send or load anything over the network, even by mistake. You can check this in the `<meta http-equiv="Content-Security-Policy">` line at the top of the file. You can also go offline before opening a chat, and it works exactly the same.
- **Nothing from the chat is stored.** The browser remembers only your theme, which participant is "you", and your last scroll position (a message number) so you can pick up where you left off. Messages and media are never saved anywhere.

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
- **Jump to date**: a date picker plus a month-by-month heat-map calendar. Click any day to jump to it. It also shows stats: messages per person, active days, and the busiest day.
- Inline images, videos, voice notes (`.opus`), stickers and documents. *bold*, _italic_ and ~strike~ formatting and links are shown as in WhatsApp. Right-to-left text (Hebrew, Arabic) is supported. Light and dark themes are included, and the layout works on phones.
- Handles iPhone and Android export formats in many locales: `[31/12/2024, 22:15:03]`, `12/31/24, 10:15 PM -`, `31.12.2024, 22:15 -`, `2024-12-31 22:15 -`, and others. Day/month order is detected automatically. You can override it in Settings if dates look wrong.

Keyboard: `Ctrl/⌘+F` or `/` search · `Enter` / `Shift+Enter` next/previous result · `Home` / `End` first/last message · `Esc` close · `←` `→` in the photo viewer.

## Notes

- HEIC photos only display in Safari. Other browsers show the file name, and *Save a copy* still works.
- Some `.mov` videos use codecs your browser can't play. Use *Save a copy* to open them in another app.
- Media you didn't export ("image omitted" / `<Media omitted>`) shows as a note.

## Try it without your own data

`tools/make_sample.py` generates two fake year-long exports (iPhone-style and Android-style) using only the Python standard library. If `ffmpeg` is installed, it adds a few videos and voice notes too.

```bash
python3 tools/make_sample.py samples/
```
