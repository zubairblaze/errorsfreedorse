ErrorsFree — XAMPP package (site + admin panel)
==============================================

This is the whole thing: the website, the admin panel, the API, and a
one-time installer. It needs XAMPP because the admin panel is PHP + MySQL.


INSTALL — about three minutes
-----------------------------

1. Copy this "errorsfree" folder into XAMPP's htdocs.

     Windows : C:\xampp\htdocs\errorsfree
     macOS   : /Applications/XAMPP/htdocs/errorsfree
     Linux   : /opt/lampp/htdocs/errorsfree

2. Start Apache AND MySQL in the XAMPP control panel. Both.

3. Create the database and user, once, in phpMyAdmin
   (http://localhost/phpmyadmin):

     - User accounts -> Add user account
     - User name:  errdorste
     - Host name:  localhost
     - Password:   your own choice
     - Tick "Create database with same name and grant all privileges"

   That is the only manual database step. The installer builds the tables.

4. Open:  http://localhost/errorsfree/setup.php

   It checks requirements, asks for those database details, creates the
   tables, creates your administrator account, and offers to load the
   starter content.

5. Delete setup.php when it tells you to.

Then:

     Website :  http://localhost/errorsfree/
     Admin   :  http://localhost/errorsfree/admin/


IF SOMETHING IS OFF
-------------------

"Object not found" / 404 on every page
    Apache is not running, or the folder is not directly inside htdocs.
    The path must be htdocs/errorsfree/index.html.

The page loads but is unstyled
    You opened index.html as a file. Use the http://localhost/... URL.

setup.php says the installer only runs from this machine
    You reached it by LAN IP or hostname. Use "localhost" exactly.

"Could not connect" on the database step
    MySQL is not started in XAMPP, or the user/password do not match what
    you created in phpMyAdmin. The message from MySQL is shown verbatim —
    read it, it is usually precise.

Port 80 is taken (Skype, IIS, Windows services)
    Change Apache's port in XAMPP to 8080, then use
    http://localhost:8080/errorsfree/


THE ADMIN PANEL
---------------

Manages blog posts, case studies, vibe-coded apps and services, and shows
contact enquiries and newsletter subscribers.

  * Draft vs published — drafts never appear on the public site or the API.
  * Body fields take HTML. Anything dangerous is stripped on save: scripts,
    styles, iframes, event handlers, javascript: links. Paragraphs, headings,
    lists, links, images, tables, bold and italic survive.
  * Images upload to uploads/. Type is checked by reading the file, not by
    trusting its name.
  * Account & password, bottom left, changes your password. Doing so signs
    out every other device immediately.
  * Five failed sign-ins locks the account briefly, and the delay grows.
    If you lock yourself out, wait it out or reset from the command line:
      php _backend/bin/setup-admin.php


PUTTING DATABASE CONTENT ONTO THE SITE
--------------------------------------

The public pages are static files, so editing in the admin panel does not
change them until the site is rebuilt from the database. From the project
source:

     EF_API_URL=http://localhost/errorsfree/api/ npm run build

Without EF_API_URL the site builds from the fixtures in src/data instead, so
a backend that is down can never block a build.

You can confirm the API is alive right now:

     http://localhost/errorsfree/api/?resource=posts


WHAT IS WHERE
-------------

  index.html, about/, blog/, case-studies/ …   the static site
  admin/         the panel
  api/           JSON API the site reads at build time
  uploads/       images added through the panel
  _backend/      code, schema and .env — denied over HTTP by .htaccess
  setup.php      the installer. Delete it after use.


BEFORE GOING LIVE
-----------------

  * Delete setup.php.
  * Set APP_HTTPS=1 and APP_ENV=production in _backend/.env.
  * Move _backend above the document root if the host allows it. The
    .htaccess denial is the fallback, not the real fix.
  * Change the admin password from the panel, and use a database password
    that has never been sent through a chat window or an email.

  hello@errorsfree.com  ·  +971 54 763 5672
