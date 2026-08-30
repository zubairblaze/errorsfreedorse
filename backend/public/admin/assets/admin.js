/**
 * Admin panel behaviour.
 *
 * A separate file rather than inline script on purpose: the admin CSP
 * forbids inline execution outright, so an XSS that survived the sanitiser
 * still could not run here.
 */
(function () {
  'use strict';

  // Confirm destructive submissions.
  document.addEventListener('submit', function (event) {
    var form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    var message = form.getAttribute('data-confirm');
    if (message && !window.confirm(message)) event.preventDefault();
  });

  // Repeater rows: add and remove.
  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.matches('[data-add-row]')) {
      var repeater = target.closest('[data-repeater]');
      var rows = repeater && repeater.querySelector('[data-rows]');
      var last = rows && rows.lastElementChild;
      if (!rows || !last) return;

      var clone = last.cloneNode(true);
      var index = rows.children.length;
      clone.querySelectorAll('input').forEach(function (input) {
        input.value = '';
        // name is child[key][i][col]; renumber i so rows stay distinct.
        input.name = input.name.replace(/\[(\d+)\]/, '[' + index + ']');
      });
      rows.appendChild(clone);
      var first = clone.querySelector('input');
      if (first) first.focus();
    }

    if (target.matches('[data-remove-row]')) {
      var row = target.closest('.repeater__row');
      var container = row && row.parentElement;
      if (!row || !container) return;
      if (container.children.length > 1) {
        row.remove();
      } else {
        row.querySelectorAll('input').forEach(function (i) { i.value = ''; });
      }
    }
  });

  // Suggest a slug from the title until the slug is edited by hand.
  var title = document.querySelector('#f_title');
  var slug = document.querySelector('#f_slug');
  if (title && slug) {
    var touched = slug.value.trim() !== '';
    slug.addEventListener('input', function () { touched = true; });
    title.addEventListener('input', function () {
      if (touched) return;
      slug.value = title.value
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 160);
    });
  }
})();
