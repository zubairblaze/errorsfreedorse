ErrorsFree — local test build
=============================

This is the whole site, built to run from the root of a server rather than
a subfolder, so it previews cleanly on your machine.

  IMPORTANT: do not double-click site/index.html. A static site still needs
  a server to resolve /about/ -> /about/index.html. Opening it as a file
  gives you an unstyled page. Use one of the three options below instead —
  each takes about five seconds.


OPTION 1 — Node  (recommended, nothing to install)
--------------------------------------------------
  Mac / Linux:  double-click  start-mac-linux.command
                or in Terminal:  node start.mjs
  Windows:      double-click  start-windows.bat
                or in Command Prompt:  node start.mjs

  Then open  http://localhost:8080
  Stop it with Ctrl+C.

  Port already busy?   PORT=8081 node start.mjs


OPTION 2 — Python  (already on every Mac and Linux machine)
-----------------------------------------------------------
  cd site
  python3 -m http.server 8080

  Then open  http://localhost:8080


OPTION 3 — PHP  (if you have it locally for cPanel work)
--------------------------------------------------------
  cd site
  php -S localhost:8080

  Then open  http://localhost:8080


WHAT TO LOOK AT
---------------
  * The Palette button, bottom-right of every page. Four colour directions,
    each in light and dark — eight looks. Your pick decides the brand.
      Meridian  corporate blue, the Dell register. Safest for conversion.
      Obsidian  near-black + electric lime. Developer-tool sharp.
      Dune      ink + warm gold. Gulf-premium.
      Quantum   indigo into violet. AI-native.
    Your choice is remembered as you move between pages.

  * The hero. Move your mouse across it and scroll — the nested frames
    drift on both. It is a browser window showing itself, five levels deep,
    drawn in CSS rather than exported as images.

  * The reload. Refresh in a new browser tab or window for the zoom-through
    intro; it only plays once per session, on purpose.

  * Our Process, on the home page and /about/. Hover the four steps and
    watch the matching ring light up. Left alone, it cycles on its own.

  * /blog/ — filter by category. /blog/<any post> — the post template.
  * /contact/ — submit it empty, then with a bad email. Validation is
    frontend-only in Phase 1; nothing is sent anywhere.
  * /services/ai-integration/ — a full service detail page.
  * Any wrong URL, e.g. /nope/ — the 404.

  * Resize the window down to phone width. The hero recursion drops from
    five levels to three, and the menu becomes a sheet.

  * If your OS is set to reduce motion, every nested visual keeps its
    geometry and simply stops moving. Nothing disappears.


NOTE ON THIS BUILD
------------------
This copy is built for a server ROOT so it previews easily. The zip for
cPanel is built for a nested subfolder and is a separate file — do not
upload this one. Rebuild the deploy copy any time with:

  SITE_BASE=/errorsfree npm run build

  hello@errorsfree.com  ·  +971 54 763 5672
