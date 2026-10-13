/* Sprachumschaltung DE/EN
   Deutsche Texte stehen im HTML. Englische Texte kommen aus dem Admin und
   stehen als data-en / data-en-html / data-en-placeholder an den Elementen. */
(function () {
  'use strict';
  var KEY = 'site-language';

  var I18n = {
    currentLang: 'de',

    apply: function (lang) {
      this.currentLang = lang;
      document.documentElement.lang = lang;
      try { sessionStorage.setItem(KEY, lang); } catch (e) { /* ignorieren */ }

      document.querySelectorAll('[data-en]').forEach(function (el) {
        if (el.dataset.de === undefined) el.dataset.de = el.innerHTML;
        if (lang === 'en') {
          el.textContent = el.getAttribute('data-en');
          el.innerHTML = el.innerHTML.replace(/\n/g, '<br>');
        } else {
          el.innerHTML = el.dataset.de;
        }
      });
      document.querySelectorAll('[data-en-html]').forEach(function (el) {
        if (el.dataset.de === undefined) el.dataset.de = el.innerHTML;
        el.innerHTML = lang === 'en' ? el.getAttribute('data-en-html') : el.dataset.de;
      });
      document.querySelectorAll('[data-en-placeholder]').forEach(function (el) {
        if (el.dataset.dePlaceholder === undefined) el.dataset.dePlaceholder = el.getAttribute('placeholder') || '';
        el.setAttribute('placeholder', lang === 'en' ? el.getAttribute('data-en-placeholder') : el.dataset.dePlaceholder);
      });

      var btn = document.getElementById('langToggle');
      if (btn) {
        btn.textContent = lang === 'en' ? 'DE' : 'EN';
        btn.title = lang === 'en' ? 'Auf Deutsch wechseln' : 'Switch to English';
      }
    },

    toggleLanguage: function () { this.apply(this.currentLang === 'en' ? 'de' : 'en'); },
    setLanguage: function (lang) { if (lang === 'de' || lang === 'en') this.apply(lang); }
  };

  window.I18n = I18n;
  document.addEventListener('DOMContentLoaded', function () {
    var saved = 'de';
    try { saved = sessionStorage.getItem(KEY) || 'de'; } catch (e) { /* ignorieren */ }
    if (saved === 'en') I18n.apply('en');
  });
})();
