ErrorsFree — local test build
=============================

  START HERE
  ----------
  Mac / Linux : double-click  start-mac-linux.command
  Windows     : double-click  start-windows.bat
  Any OS      : open a terminal in this folder and run:  node start.mjs

  It prints a URL and opens your browser. Read the port in that URL.


IF YOU SEE YOUR OLD SITE
------------------------
You are looking at a different server, not this preview. Almost always XAMPP.

  * XAMPP's Apache usually sits on port 80 or 8080. This preview deliberately
    avoids both — it starts at 4321 and moves up until it finds a free port.
  * So check the address bar. If it does not say the port the terminal
    printed, you are on the wrong server.
  * Hard-reload once you are on the right URL: Ctrl+Shift+R (Cmd+Shift+R on
    a Mac). A normal reload can serve a cached copy.

  How to tell instantly that you have the RIGHT build:
    - "Case Studies" appears in the top navigation.
    - The hero image is a browser window containing itself, and it moves as
      you scroll.
    - BUILD.txt in this folder names the build.

  Do NOT open site/index.html by double-clicking it. A static site still
  needs a server to resolve /about/ into /about/index.html; opened as a file
  you get an unstyled page.


NO NODE INSTALLED?
------------------
Either of these works just as well. Run it from inside the site folder:

  cd site && python3 -m http.server 4321
  cd site && php -S localhost:4321

Then open http://localhost:4321


WHAT TO LOOK AT
---------------
  * The hero. Scroll slowly. It is a browser window showing itself, falling
    toward you without end — the frames recycle, so it never bottoms out.
    Move the mouse across it too.

  * "Our Process", further down the home page. It pins for three screens and
    flies you through Build > Test > Refine > Repeat and back into Build.
    The loop closing on itself is the point.

  * The Palette button, bottom-right of every page. Four colour directions,
    each in light and dark. Your pick decides the brand.
      Meridian  corporate blue, the Dell register. Safest for conversion.
      Obsidian  near-black + electric lime. Developer-tool sharp.
      Dune      ink + warm gold. Gulf-premium.
      Quantum   indigo into violet. AI-native.
    The choice follows you between pages.

  * /case-studies/ — the new section. Index plus a full case study.
  * /blog/ — filter by category.  /contact/ — submit it empty, then with a
    bad email. Validation is frontend-only here; nothing is sent anywhere.
  * Any wrong URL, e.g. /nope/ — the 404.

  * Resize to phone width. The hero recursion drops from five levels to
    three and the menu becomes a sheet.

  * If your OS is set to reduce motion, every nested visual keeps its
    geometry and simply stops moving. Nothing disappears.


PHOTOGRAPHY
-----------
Cards currently show generated nested-frame plates rather than photographs.
Twelve images exist but are not in this zip. From the project source run:

  bash scripts/download-images.sh && npm run build

Missing images always fall back to the plates, so nothing ever looks broken.


NOTE ON THIS BUILD
------------------
This copy is built to run from a server ROOT so it previews easily. The
cPanel upload is a different build and a separate file — do not upload this
one. Rebuild the deploy copy with:

  SITE_BASE=/errorsfree npm run build

  hello@errorsfree.com  ·  +971 54 763 5672
