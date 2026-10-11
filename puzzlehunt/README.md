# Puzzle Hunt 🍳🧩

A small puzzle hunt kit in the style of Boxaroo's *Colby's Curious Cookoff*. The hunt is split into **chapters**. Each chapter has a few puzzles and a **meta** that ties them together. You can add an optional **finale** that opens once every chapter meta is solved.

There's no build step and no server. Plain HTML/JS files work from GitHub Pages or straight from disk.

| File | What it is |
|---|---|
| `index.html` | The hunt the solver plays |
| `editor.html` | The editing UI |
| `hunt-data.js` | The hunt itself: text, images, hashed answers. The editor writes this file. |
| `core.js`, `widgets.js`, `player.js`, `style.css` | Shared engine, interactive widgets and theme |
| `editor.js`, `editor.css` | Editor code |

The `hunt-data.js` in the repo is a placeholder sample (two tiny chapters and a finale) that shows the structure, every widget type, and a few story scenes. Replace it with your own hunt.

## Making the hunt

1. Open `editor.html` in a desktop browser. Double-clicking the file works.
2. Pick things in the left sidebar to edit them:
   - **Hunt settings:** title, subtitle, mascot, welcome and ending text, whether chapters open all at once or one at a time, the image library, and a checklist of what's missing.
   - **Chapters:** title, icon, color, intro, and when the meta unlocks (after all puzzles, or after *N*).
   - **Puzzles / metas / finale:** title, icon, flavor line, the puzzle text, the answer (plus alternate spellings), "keep going" answers with custom nudges, hints revealed one at a time, and a message shown after solving.
3. Puzzle text uses simple Markdown, and the toolbar inserts the common pieces: monospace grids, tables, images, quotes. Expand the **Formatting cheat sheet** under any text box for the full list. Raw HTML also works. Hebrew and other RTL text is detected automatically.
4. **🧩 Interactive** (in the text toolbar) inserts a widget the solver can use. Whatever she enters is saved on her device:

   | Block | What she gets | How to write it |
   |---|---|---|
   | ` ```grid ` | Crossword-style grid to type into. Arrow keys move, and clicking a cell again or pressing Space switches across/down. | One row per line. `#` black cell, `.` empty cell, a letter is a given letter, a number is a clue number (`12A` is numbered and given). |
   | ` ```blanks ` | Letter boxes, plus a "Use as my answer" button | `4 3 3`, or `_ _ * _ / _ _ _` (`*` circled box, `/` new word, a letter is given) |
   | ` ```highlight ` | Letter grid she can color in with 3 markers (word searches, shading) | One row of letters per line |
   | ` ```order ` | List she drags into order (↑/↓ buttons too) | One item per line, in the order it should start |

5. **Story scenes** are story cards that pop up once: the hunt's *opening scene* (first visit), each chapter's *opening scene*, and each puzzle's *story scene* (right after solving, which works well on metas and the finale). She can replay them from **📖 Story so far** on the home page. **▶ Preview scene** in the editor shows the card.
6. **🧰 Tools** opens constructor helpers: letter count / enumeration, anagram checker, Caesar (all 25 shifts at once), Atbash, A1Z26, Morse, first letters, nth letters, alphabetize and reverse. **Insert at cursor** puts the result where you last clicked in the form.
7. **↶ / ↷** (or Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z when not typing in a box) undo and redo any edit, including deletions. Under **Hunt settings → Restore points** you can save named copies of the whole hunt and roll back. One is also saved automatically before opening a file, reloading, restoring, or starting a new hunt.
8. The right pane shows a **live preview** of whatever you're editing. **▶ Play-test** runs the whole hunt from scratch, with locks, the way the solver will see it.
9. Your draft saves automatically in that browser. Use **💾 Backup** now and then. It downloads everything, including the plain-text answers, and **📂 Open…** loads it back on any computer. Keep backups out of the repo (`.gitignore` already covers `hunt-private*.json`).

## Publishing

1. Click **⬇ Publish**. It downloads a new `hunt-data.js`.
2. Replace `puzzlehunt/hunt-data.js` with it, then commit and push.
3. Turn on GitHub Pages for the repo and send the solver `https://<user>.github.io/<repo>/puzzlehunt/`.

Progress (solves, guesses, hints used) is saved in the solver's browser on their device. A "Reset progress" link sits at the bottom of the home page.

### About spoilers

The published file stores answers only as salted SHA-256 hashes, so reading the source won't reveal them. Matching ignores case, spaces, punctuation and accents. Puzzle text, hints and after-solve messages are stored as plain text. If the repo is public, the solver could read them on GitHub, so make the repo private before publishing (GitHub Pages on a private repo needs a paid plan) or host the files somewhere else.
