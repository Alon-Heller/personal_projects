# Kazler's Kastle

A cozy first-person word-puzzle game in the browser. Walk the castle, read the panels, type the words that open the doors. Nothing is explained: figure out the rules by watching what changes.

This README is spoiler-free. **Don't open `js/levels.js` or `js/rules.js` if you want to play fresh.**

## Play

The game uses JavaScript modules, so it needs to be served over http (opening `index.html` straight from disk won't work).

- **GitHub Pages:** turn on Pages for this repo and open `…/kazlers-kastle/`.
- **Locally:** from this folder run `python3 serve.py` and open http://localhost:8000. (It turns off browser caching, so a refresh always picks up a `git pull`.)

Desktop only: keyboard and mouse.

| Key | Action |
|---|---|
| W A S D + mouse | walk and look |
| Shift | hurry |
| Click or E | write on the panel you're looking at |
| Enter / Tab | submit / step back |
| F or right-click | lantern |
| H | flash arrows toward the nearest puzzle you can reach |
| T | jump to the nearest unsolved puzzle you can reach (for playtesting) |
| M | map of the castle; click a room you can reach to travel there |
| Esc | pause |

Progress saves in your browser. "Start over" on the pause screen wipes it.

## For the builder

- No build step. Three.js (r170, MIT) is vendored in `lib/`.
- `node tools/verify.mjs` checks that every panel's answer follows from its rules and that the map and doors are consistent. Run it after changing levels.
