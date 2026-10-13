/* Newness of Life – Website-Skript
   Menü, Sprache (DE/EN), Kontaktformular, Kopier-Buttons, Monatsfilter. */
(function () {
  'use strict';

  var LANG_KEY = 'site-language';
  var lang = 'de';
  try { if (sessionStorage.getItem(LANG_KEY) === 'en') lang = 'en'; } catch (e) { /* ignorieren */ }

  /* ---------- Sprache ---------- */
  function applyLanguage(next) {
    lang = next;
    try { sessionStorage.setItem(LANG_KEY, next); } catch (e) { /* ignorieren */ }
    document.documentElement.lang = next;

    document.querySelectorAll('[data-en]').forEach(function (el) {
      if (el.dataset.de === undefined) el.dataset.de = el.innerHTML;
      if (next === 'en') {
        el.textContent = el.getAttribute('data-en');
        el.innerHTML = el.innerHTML.replace(/\n/g, '<br>');
      } else {
        el.innerHTML = el.dataset.de;
      }
    });
    document.querySelectorAll('[data-en-html]').forEach(function (el) {
      if (el.dataset.de === undefined) el.dataset.de = el.innerHTML;
      el.innerHTML = next === 'en' ? el.getAttribute('data-en-html') : el.dataset.de;
    });
    document.querySelectorAll('[data-en-placeholder]').forEach(function (el) {
      if (el.dataset.dePlaceholder === undefined) el.dataset.dePlaceholder = el.getAttribute('placeholder') || '';
      el.setAttribute('placeholder', next === 'en' ? el.getAttribute('data-en-placeholder') : el.dataset.dePlaceholder);
    });

    var toggle = document.getElementById('langToggle');
    if (toggle) {
      toggle.textContent = next === 'en' ? 'DE' : 'EN';
      toggle.setAttribute('aria-label', next === 'en' ? 'Auf Deutsch wechseln' : 'Switch to English');
    }
  }

  /* ---------- Menü ---------- */
  function initMenu() {
    var btn = document.querySelector('.menu-toggle');
    var header = document.querySelector('.site-header');
    if (btn) {
      btn.addEventListener('click', function () {
        var open = !document.body.classList.contains('menu-open');
        document.body.classList.toggle('menu-open', open);
        btn.setAttribute('aria-expanded', String(open));
      });
      document.querySelectorAll('.main-nav a').forEach(function (a) {
        a.addEventListener('click', function () {
          document.body.classList.remove('menu-open');
          btn.setAttribute('aria-expanded', 'false');
        });
      });
    }
    if (header) {
      var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 8); };
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    }
  }

  /* ---------- Kontaktformular ---------- */
  function initContactForm() {
    var form = document.getElementById('contact-form');
    if (!form) return;
    var status = document.getElementById('contact-status');
    var button = form.querySelector('button[type="submit"]');
    var t = function (de, en) { return lang === 'en' ? en : de; };
    var msg = function (key) {
      return (lang === 'en' && form.getAttribute('data-' + key + '-en')) || form.getAttribute('data-' + key) || '';
    };
    var setStatus = function (text, kind) {
      status.textContent = text;
      status.className = 'form-status' + (kind ? ' is-' + kind : '');
    };

    async function sendToApi(payload) {
      var res = await fetch('/.netlify/functions/contact-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      });
      var data = {};
      try { data = await res.json(); } catch (e) { /* keine JSON-Antwort */ }
      if (!res.ok) {
        var err = new Error(data.error || 'HTTP ' + res.status);
        err.validation = res.status === 400 || res.status === 422 || res.status === 429;
        throw err;
      }
      return data;
    }

    async function sendToNetlifyForms(formData) {
      var body = new URLSearchParams();
      formData.forEach(function (value, key) { if (typeof value === 'string') body.append(key, value); });
      var res = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString()
      });
      if (!res.ok) throw new Error('Netlify Forms HTTP ' + res.status);
    }

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      var email = String(fd.get('email') || '').trim();
      if (!String(fd.get('name') || '').trim() || !String(fd.get('message') || '').trim()) {
        setStatus(t('Bitte fülle Name und Nachricht aus.', 'Please fill in your name and message.'), 'error');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setStatus(t('Bitte gib eine gültige E-Mail-Adresse ein, z. B. name@beispiel.de.', 'Please enter a valid email address, e.g. name@example.com.'), 'error');
        return;
      }
      button.disabled = true;
      setStatus(t('Wird gesendet …', 'Sending …'));
      var payload = {
        name: fd.get('name') || '', email: email, message: fd.get('message') || '',
        subject: '', website: fd.get('website') || '', lang: lang
      };
      try {
        try {
          await sendToApi(payload);
        } catch (apiErr) {
          if (apiErr.validation) throw apiErr;
          await sendToNetlifyForms(fd);
        }
        form.reset();
        setStatus(msg('msg-ok'), 'ok');
      } catch (err) {
        setStatus(msg('msg-error'), 'error');
      } finally {
        button.disabled = false;
      }
    });
  }

  /* ---------- Kopieren (IBAN etc.) ---------- */
  function initCopyButtons() {
    document.querySelectorAll('[data-copy]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = document.querySelector(btn.getAttribute('data-copy'));
        if (!target || !navigator.clipboard) return;
        navigator.clipboard.writeText(target.textContent.trim()).then(function () {
          btn.classList.add('is-copied');
          var icon = btn.querySelector('i');
          if (icon) icon.className = 'fa-solid fa-check';
          setTimeout(function () {
            btn.classList.remove('is-copied');
            if (icon) icon.className = 'fa-regular fa-copy';
          }, 1600);
        });
      });
    });
  }

  /* ---------- Monatsfilter (Veranstaltungen) ---------- */
  function initMonthFilter() {
    var chips = document.querySelectorAll('.month-chip');
    if (!chips.length) return;
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var target = chip.getAttribute('data-month');
        chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
        document.querySelectorAll('.month-block').forEach(function (block) {
          block.hidden = target !== 'all' && block.getAttribute('data-month') !== target;
        });
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initMenu();
    initContactForm();
    initCopyButtons();
    initMonthFilter();
    var toggle = document.getElementById('langToggle');
    if (toggle) toggle.addEventListener('click', function () { applyLanguage(lang === 'en' ? 'de' : 'en'); });
    if (lang === 'en') applyLanguage('en');
  });
})();
