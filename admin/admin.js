/* Website-Admin – Newness of Life
   Lädt alle Inhalte (data/*.json) über /.netlify/functions/admin-api,
   zeigt sie als Formulare und speichert Änderungen als Commit.  */
(function () {
  'use strict';

  var API = '/.netlify/functions/admin-api';
  var SESSION_KEY = 'nol-admin-session';

  // ------------------------------------------------------------------
  // Bereiche (linke Navigation)
  // ------------------------------------------------------------------
  var PAGES = [
    { id: 'home', title: 'Startseite', icon: 'fa-house', url: '/', files: ['data/homepage.json'],
      hint: 'Alles, was auf der Startseite steht.' },
    { id: 'gottesdienste', title: 'Gottesdienste', icon: 'fa-church', url: '/gottesdienste', files: ['data/pages/gottesdienste.json'],
      hint: 'Zeiten, Ablauf und weitere Treffen.' },
    { id: 'events', title: 'Veranstaltungen', icon: 'fa-calendar-days', url: '/veranstaltungen',
      files: ['data/events.json', 'data/pages/veranstaltungen.json'],
      hint: 'Termine anlegen, ändern oder löschen. Vergangene Termine verschwinden automatisch von der Website.' },
    { id: 'ueber-uns', title: 'Über uns', icon: 'fa-people-group', url: '/ueber-uns', files: ['data/pages/ueber-uns.json'],
      hint: 'Geschichte, Vision und Werte der Gemeinde.' },
    { id: 'spenden', title: 'Spenden', icon: 'fa-hand-holding-heart', url: '/spenden', files: ['data/pages/spenden.json'],
      hint: 'Bankverbindung, PayPal und Texte der Spendenseite.' },
    { id: 'global', title: 'Menü & Fußbereich', icon: 'fa-bars', url: '/', files: ['data/global.json'],
      hint: 'Logo, Menüpunkte, Hinweisbalken und der untere Bereich jeder Seite.' },
    { id: 'settings', title: 'Kontakt & Social Media', icon: 'fa-address-card', url: '/#kontakt', files: ['data/settings.json'],
      hint: 'Adresse, E-Mail, Telefon und Social-Media-Links – erscheinen auf allen Seiten.' },
    { id: 'impressum', title: 'Impressum', icon: 'fa-scale-balanced', url: '/impressum', files: ['data/pages/impressum.json'] },
    { id: 'datenschutz', title: 'Datenschutz', icon: 'fa-shield-halved', url: '/datenschutz', files: ['data/pages/datenschutz.json'] }
  ];

  // ------------------------------------------------------------------
  // Beschriftungen
  // ------------------------------------------------------------------
  var SECTION_LABELS = {
    hero: 'Großes Titelbild oben', service_info: 'Infokasten „Unser Gottesdienst“', services_section: 'Abschnitt Gottesdienst',
    meetings: 'Regelmäßige Treffen', about_section: 'Abschnitt „Über uns“', events_section: 'Kommende Veranstaltungen',
    contact_section: 'Kontaktformular', seo: 'Google-Suche (Titel & Beschreibung)', intro: 'Einleitung',
    first_visit: 'Dein erster Besuch', main_service: 'Hauptgottesdienst', other_meetings: 'Weitere Treffen',
    cta: 'Einladung (dunkler Balken)', anfahrt: 'Anfahrt', story: 'Geschichte', vision: 'Vision & Mission',
    values: 'Werte', roots: 'Unsere Wurzeln (CLGI)', impact: 'Was deine Spende bewirkt', options: 'Überschrift Spendenwege',
    bank_details: 'Banküberweisung', online_donation: 'PayPal', receipt: 'Spendenquittung',
    header: 'Kopfbereich & Menü', footer: 'Fußbereich', announcement: 'Hinweisbalken ganz oben',
    contact: 'Kontaktdaten', social_media: 'Social Media', items: 'Termine', categories: 'Kategorien',
    regular: 'Regelmäßige Termine', upcoming: 'Kommende Veranstaltungen', logo: 'Logo', navigation: 'Menüpunkte',
    cta_button: 'Button oben rechts', features: 'Was dich erwartet (Punkte)'
  };

  var LABELS = {
    title: 'Überschrift', subtitle: 'Untertitel', text: 'Text', description: 'Beschreibung', background_image: 'Hintergrundbild',
    image: 'Bild', video: 'Hintergrundvideo (Adresse einer MP4-Datei, optional)', cta_text: 'Button-Text', cta_link: 'Button-Link',
    cta2_text: 'Zweiter Button – Text', cta2_link: 'Zweiter Button – Link', button_text: 'Button-Text', button_link: 'Button-Link',
    when: 'Wann', kids: 'Kinder', language: 'Sprache', directions_text: 'Link-Text „Route planen“', label: 'Kategorie-Text',
    time: 'Uhrzeit', day: 'Tag', link: 'Link (optional)', show: 'Auf der Website anzeigen', count: 'Wie viele Termine anzeigen?',
    form_title: 'Überschrift Formular', name_placeholder: 'Feld „Name“', email_placeholder: 'Feld „E-Mail“',
    message_placeholder: 'Feld „Nachricht“', send_button: 'Button „Senden“', address_title: 'Überschrift Adresse',
    success_message: 'Meldung nach dem Absenden', error_message: 'Meldung bei Fehler', meta_title: 'Titel in Google',
    meta_description: 'Beschreibung in Google', duration: 'Dauer', icon: 'Symbol', mission: 'Hervorgehobener Satz (Auftrag)',
    verse: 'Bibelstelle', account_holder: 'Empfänger', iban: 'IBAN', bic: 'BIC', bank_name: 'Bank', reference: 'Verwendungszweck',
    recipient_label: 'Bezeichnung „Empfänger“', bank_label: 'Bezeichnung „Bank“', reference_label: 'Bezeichnung „Verwendungszweck“',
    paypal_link: 'PayPal-Spendenlink', note: 'Hinweis', alt: 'Bildbeschreibung (für Blinde)', subtext: 'Untertitel unter dem Namen',
    url: 'Link', about_text: 'Text über die Gemeinde', nav_heading: 'Überschrift Navigation', contact_heading: 'Überschrift Kontakt',
    contact_button: 'Link „Kontaktformular“', follow_heading: 'Überschrift Social Media', donate_heading: 'Überschrift Spenden',
    donation_text: 'Text Spenden', donate_button: 'Link „Jetzt spenden“', copyright: 'Name im Copyright',
    rights_text: '„Alle Rechte vorbehalten“', privacy_label: 'Link „Datenschutz“', imprint_label: 'Link „Impressum“',
    site_title: 'Name der Website', site_description: 'Kurzbeschreibung der Gemeinde', email: 'E-Mail', phone: 'Telefon',
    whatsapp: 'WhatsApp-Nummer', address: 'Straße und Hausnummer', city: 'PLZ und Ort', maps_url: 'Google-Maps-Link',
    instagram: 'Instagram', facebook: 'Facebook', youtube: 'YouTube', tiktok: 'TikTok', date: 'Beginn', end_date: 'Ende (optional)',
    location: 'Ort', category: 'Kategorie', published: 'Veröffentlicht', content_html: 'Inhalt', all_label: 'Filter „Alle Monate“',
    empty_text: 'Text, wenn keine Termine geplant sind', calendar_button: 'Link „Zum Kalender“', name: 'Name', color: 'Farbe'
  };

  var HIDDEN_KEYS = ['id', 'i18n_key'];
  var NOT_TRANSLATED = ['url', 'link', 'cta_link', 'cta2_link', 'button_link', 'image', 'background_image', 'video', 'icon',
    'color', 'date', 'end_date', 'category', 'email', 'phone', 'whatsapp', 'maps_url', 'iban', 'bic', 'account_holder',
    'bank_name', 'paypal_link', 'instagram', 'facebook', 'youtube', 'tiktok', 'address', 'city', 'site_title', 'meta_title',
    'meta_description', 'site_description', 'copyright', 'name'];
  var LONG_KEYS = ['text', 'description', 'subtitle', 'about_text', 'note', 'site_description', 'meta_description',
    'success_message', 'error_message', 'donation_text', 'mission', 'empty_text'];
  var ICONS = [
    ['fa-church', 'Kirche'], ['fa-music', 'Musik'], ['fa-book-bible', 'Bibel'], ['fa-book-open', 'Buch'], ['fa-hands-praying', 'Gebet'],
    ['fa-pray', 'Beten'], ['fa-cross', 'Kreuz'], ['fa-dove', 'Taube'], ['fa-child', 'Kind'], ['fa-children', 'Kinder'],
    ['fa-users', 'Gruppe'], ['fa-people-group', 'Gemeinschaft'], ['fa-heart', 'Herz'], ['fa-hand-holding-heart', 'Hilfe'],
    ['fa-seedling', 'Wachstum'], ['fa-globe', 'Welt'], ['fa-star', 'Stern'], ['fa-microphone', 'Mikrofon'],
    ['fa-utensils', 'Essen'], ['fa-mug-hot', 'Kaffee'], ['fa-calendar', 'Kalender'], ['fa-clock', 'Uhr'], ['fa-language', 'Sprache']
  ];

  // ------------------------------------------------------------------
  // Zustand & Hilfsfunktionen
  // ------------------------------------------------------------------
  var state = { session: null, email: '', files: {}, original: {}, images: [], localPreviews: {}, page: null };

  function $(sel, root) { return (root || document).querySelector(sel); }
  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== undefined && attrs[k] !== null && attrs[k] !== false) n.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function humanize(key) { return key.replace(/_/g, ' ').replace(/^./, function (c) { return c.toUpperCase(); }); }
  function labelFor(key) { return LABELS[key] || humanize(key); }

  function api(action, payload) {
    var headers = { 'Content-Type': 'application/json' };
    if (state.session) headers.Authorization = 'Bearer ' + state.session;
    return fetch(API, { method: 'POST', headers: headers, body: JSON.stringify(Object.assign({ action: action }, payload || {})) })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          if (res.status === 401 && action !== 'verify') { logout('Deine Anmeldung ist abgelaufen. Bitte melde dich neu an.'); }
          if (!res.ok) throw new Error(data.error || 'Fehler ' + res.status);
          return data;
        });
      });
  }

  function isDirty(file) { return JSON.stringify(state.files[file]) !== state.original[file]; }
  function dirtyFiles() { return Object.keys(state.files).filter(isDirty); }
  function markChanged() {
    var n = dirtyFiles().length;
    $('#save-btn').disabled = n === 0;
    setSaveStatus(n ? 'Nicht gespeicherte Änderungen' : '', n ? 'pending' : '');
    document.querySelectorAll('#page-nav a').forEach(function (a) {
      var page = PAGES.find(function (p) { return p.id === a.dataset.page; });
      a.classList.toggle('has-changes', page.files.some(isDirty));
    });
  }
  function setSaveStatus(text, kind) {
    var s = $('#save-status');
    s.textContent = text;
    s.className = 'save-status' + (kind ? ' is-' + kind : '');
  }

  // ------------------------------------------------------------------
  // Anmeldung
  // ------------------------------------------------------------------
  function showLogin(message) {
    $('#app-view').hidden = true;
    $('#login-view').hidden = false;
    if (message) setLoginStatus(message, 'error');
  }
  function setLoginStatus(text, kind) {
    var s = $('#login-status');
    s.textContent = text;
    s.className = 'status' + (kind ? ' is-' + kind : '');
  }
  function logout(message) {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) { /* ignorieren */ }
    state.session = null;
    showLogin(message);
  }

  $('#login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var email = $('#login-email').value.trim();
    var btn = e.target.querySelector('button');
    btn.disabled = true;
    setLoginStatus('Einen Moment …');
    api('request-link', { email: email })
      .then(function (data) { setLoginStatus(data.message + ' Schau auch im Spam-Ordner nach.', 'ok'); })
      .catch(function (err) { setLoginStatus(err.message, 'error'); })
      .finally(function () { btn.disabled = false; });
  });
  $('#logout-btn').addEventListener('click', function () {
    if (dirtyFiles().length && !confirm('Es gibt nicht gespeicherte Änderungen. Trotzdem abmelden?')) return;
    logout('Du bist abgemeldet.');
  });

  function start() {
    var m = location.hash.match(/login=([^&]+)/);
    if (m) {
      history.replaceState(null, '', location.pathname);
      $('#login-view').hidden = false;
      setLoginStatus('Anmeldung wird geprüft …');
      api('verify', { token: m[1] }).then(function (data) {
        try { localStorage.setItem(SESSION_KEY, JSON.stringify(data)); } catch (e) { /* ignorieren */ }
        boot(data);
      }).catch(function (err) { showLogin(err.message); });
      return;
    }
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { saved = null; }
    if (saved && saved.session && saved.exp * 1000 > Date.now()) boot(saved);
    else showLogin();
  }

  function boot(data) {
    state.session = data.session;
    state.email = data.email;
    $('#login-view').hidden = true;
    $('#app-view').hidden = false;
    $('#user-email').textContent = data.email;
    buildNav();
    api('load').then(function (res) {
      Object.keys(res.files).forEach(function (f) {
        if (res.files[f]) { state.files[f] = res.files[f]; state.original[f] = JSON.stringify(res.files[f]); }
      });
      state.images = res.images || [];
      var start = (location.hash.match(/seite=([\w-]+)/) || [])[1] || 'home';
      openPage(start);
    }).catch(function (err) {
      $('#editor').innerHTML = '';
      $('#editor').appendChild(el('div', { class: 'notice is-error' }, [el('strong', { text: 'Inhalte konnten nicht geladen werden. ' }), err.message]));
    });
  }

  // ------------------------------------------------------------------
  // Navigation
  // ------------------------------------------------------------------
  function buildNav() {
    var nav = $('#page-nav');
    nav.innerHTML = '';
    PAGES.forEach(function (p) {
      nav.appendChild(el('a', { href: '#seite=' + p.id, 'data-page': p.id, onclick: function (e) {
        e.preventDefault(); openPage(p.id); document.body.classList.remove('nav-open');
      } }, [el('i', { class: 'fa-solid ' + p.icon, 'aria-hidden': 'true' }), el('span', { text: p.title })]));
    });
  }
  $('#nav-btn').addEventListener('click', function () { document.body.classList.toggle('nav-open'); });
  $('#en-toggle').addEventListener('change', function (e) { document.body.classList.toggle('show-en', e.target.checked); });

  function openPage(id) {
    var page = PAGES.find(function (p) { return p.id === id; }) || PAGES[0];
    state.page = page;
    history.replaceState(null, '', '#seite=' + page.id);
    document.querySelectorAll('#page-nav a').forEach(function (a) { a.classList.toggle('is-active', a.dataset.page === page.id); });
    $('#page-title').textContent = page.title;
    $('#page-hint').textContent = page.hint || '';
    $('#view-page').href = page.url;
    var editor = $('#editor');
    editor.innerHTML = '';
    page.files.forEach(function (file) {
      var data = state.files[file];
      if (!data) { editor.appendChild(el('div', { class: 'notice is-error', text: 'Datei fehlt: ' + file })); return; }
      if (file === 'data/events.json') renderEvents(editor, file);
      else renderTopLevel(editor, data, file, file === 'data/pages/veranstaltungen.json' ? 'Texte der Seite' : null);
    });
    markChanged();
    window.scrollTo(0, 0);
  }

  // ------------------------------------------------------------------
  // Formulare
  // ------------------------------------------------------------------
  function renderTopLevel(container, data, file, heading) {
    if (heading) container.appendChild(el('h2', { class: 'group-heading', text: heading }));
    var keys = Object.keys(data).filter(function (k) { return !/_en$/.test(k) && HIDDEN_KEYS.indexOf(k) < 0; });
    var simple = keys.filter(function (k) { return data[k] === null || typeof data[k] !== 'object'; });
    if (simple.length) {
      var loose = el('div', { class: 'fields' });
      simple.forEach(function (k) { loose.appendChild(renderField(data, k, file)); });
      container.appendChild(el('section', { class: 'card' }, [el('h2', { text: 'Allgemein' }), loose]));
    }
    keys.forEach(function (key) {
      var v = data[key];
      if (Array.isArray(v)) {
        var card = el('section', { class: 'card' }, [el('h2', { text: SECTION_LABELS[key] || labelFor(key) })]);
        card.appendChild(renderList(data, key, file));
        container.appendChild(card);
      } else if (v && typeof v === 'object') {
        container.appendChild(renderCard(SECTION_LABELS[key] || labelFor(key), v, file, key === 'seo'));
      }
    });
  }

  function renderCard(title, obj, file, isSeo) {
    var card = el('section', { class: 'card' + (isSeo ? ' card-seo' : '') }, [el('h2', { text: title })]);
    if (isSeo) card.appendChild(el('p', { class: 'muted small', text: 'So erscheint die Seite in den Google-Suchergebnissen. Titel bis ca. 60 Zeichen, Beschreibung bis ca. 155 Zeichen.' }));
    card.appendChild(renderObject(obj, file));
    return card;
  }

  function renderObject(obj, file) {
    var wrap = el('div', { class: 'fields' });
    Object.keys(obj).forEach(function (key) {
      if (/_en$/.test(key) || HIDDEN_KEYS.indexOf(key) >= 0) return;
      var v = obj[key];
      if (Array.isArray(v)) {
        wrap.appendChild(el('div', { class: 'sub-group' }, [el('h3', { text: SECTION_LABELS[key] || labelFor(key) }), renderList(obj, key, file)]));
      } else if (v && typeof v === 'object') {
        wrap.appendChild(el('div', { class: 'sub-group' }, [el('h3', { text: SECTION_LABELS[key] || labelFor(key) }), renderObject(v, file)]));
      } else {
        wrap.appendChild(renderField(obj, key, file));
      }
    });
    return wrap;
  }

  function fieldType(key, value) {
    if (typeof value === 'boolean') return 'bool';
    if (typeof value === 'number') return 'number';
    if (key === 'content_html') return 'rich';
    if (/(^|_)image$/.test(key) || key === 'background_image') return 'image';
    if (key === 'icon') return 'icon';
    if (key === 'color') return 'color';
    if (key === 'date' || key === 'end_date') return 'datetime';
    if (LONG_KEYS.indexOf(key) >= 0 || String(value || '').length > 90 || /\n/.test(String(value || ''))) return 'long';
    return 'text';
  }

  function renderField(obj, key, file) {
    var type = fieldType(key, obj[key]);
    var id = 'f' + Math.random().toString(36).slice(2, 9);
    var field = el('div', { class: 'field field-' + type });
    var label = el('label', { for: id, text: labelFor(key) });
    field.appendChild(label);
    var change = function (value) { obj[key] = value; markChanged(); };

    if (type === 'bool') {
      var cb = el('input', { type: 'checkbox', id: id });
      cb.checked = !!obj[key];
      cb.addEventListener('change', function () { change(cb.checked); });
      field.className += ' field-inline';
      field.insertBefore(cb, label);
      return field;
    }
    if (type === 'number') {
      var num = el('input', { type: 'number', id: id, min: '0', value: obj[key] });
      num.addEventListener('input', function () { change(parseInt(num.value, 10) || 0); });
      field.appendChild(num);
      return field;
    }
    if (type === 'image') { field.appendChild(imageInput(obj, key, id)); return field; }
    if (type === 'rich') {
      field.appendChild(richEditor(obj, key));
      if (obj[key + '_en'] !== undefined) {
        var enWrap = el('div', { class: 'en-field' }, [el('span', { class: 'en-badge', text: 'EN' }), richEditor(obj, key + '_en')]);
        field.appendChild(enWrap);
      }
      return field;
    }
    if (type === 'icon') {
      var sel = el('select', { id: id });
      var known = ICONS.some(function (i) { return i[0] === obj[key]; });
      if (!known && obj[key]) sel.appendChild(el('option', { value: obj[key], text: obj[key] }));
      ICONS.forEach(function (i) { sel.appendChild(el('option', { value: i[0], text: i[1] })); });
      sel.value = obj[key] || '';
      var prev = el('i', { class: 'fa-solid ' + (obj[key] || ''), 'aria-hidden': 'true' });
      sel.addEventListener('change', function () { prev.className = 'fa-solid ' + sel.value; change(sel.value); });
      field.appendChild(el('div', { class: 'icon-row' }, [prev, sel]));
      return field;
    }
    if (type === 'color') {
      var col = el('input', { type: 'color', id: id, value: obj[key] || '#2350B8' });
      col.addEventListener('input', function () { change(col.value); });
      field.appendChild(col);
      return field;
    }
    if (type === 'datetime') {
      var dt = el('input', { type: 'datetime-local', id: id, value: String(obj[key] || '').slice(0, 16) });
      dt.addEventListener('input', function () { change(dt.value ? dt.value + ':00' : ''); });
      field.appendChild(dt);
      return field;
    }

    var input = type === 'long' ? el('textarea', { id: id, rows: '3' }) : el('input', { type: 'text', id: id });
    input.value = obj[key] == null ? '' : obj[key];
    if (key === 'email') input.type = 'email';
    input.addEventListener('input', function () { change(input.value); autosize(input); updateCounter(); });
    field.appendChild(input);
    if (type === 'long') setTimeout(function () { autosize(input); }, 0);

    var counter = null;
    var limit = key === 'meta_title' ? 60 : key === 'meta_description' ? 155 : 0;
    function updateCounter() {
      if (!counter) return;
      var n = input.value.length;
      counter.textContent = n + ' / ' + limit + ' Zeichen';
      counter.classList.toggle('is-over', n > limit);
    }
    if (limit) { counter = el('span', { class: 'counter' }); field.appendChild(counter); updateCounter(); }

    if (NOT_TRANSLATED.indexOf(key) < 0 && typeof obj[key] === 'string') {
      var enId = id + 'en';
      var enInput = type === 'long' ? el('textarea', { id: enId, rows: '3' }) : el('input', { type: 'text', id: enId });
      enInput.value = obj[key + '_en'] || '';
      enInput.placeholder = 'Englische Version (optional)';
      enInput.addEventListener('input', function () { obj[key + '_en'] = enInput.value; markChanged(); autosize(enInput); });
      field.appendChild(el('div', { class: 'en-field' }, [el('label', { for: enId, class: 'en-badge', text: 'EN' }), enInput]));
      if (type === 'long') setTimeout(function () { autosize(enInput); }, 0);
    }
    return field;
  }

  function autosize(t) {
    if (t.tagName !== 'TEXTAREA') return;
    t.style.height = 'auto';
    t.style.height = Math.max(t.scrollHeight + 2, 64) + 'px';
  }

  // ------------------------------------------------------------------
  // Listen
  // ------------------------------------------------------------------
  function itemTitle(item, i) {
    if (!item || typeof item !== 'object') return 'Eintrag ' + (i + 1);
    return item.title || item.label || item.name || item.question || 'Eintrag ' + (i + 1);
  }

  function blankFrom(template) {
    var out = {};
    Object.keys(template || {}).forEach(function (k) {
      var v = template[k];
      if (typeof v === 'boolean') out[k] = true;
      else if (typeof v === 'number') out[k] = v;
      else if (k === 'icon') out[k] = v;
      else if (Array.isArray(v)) out[k] = [];
      else if (v && typeof v === 'object') out[k] = blankFrom(v);
      else out[k] = '';
    });
    return out;
  }

  function renderList(parent, key, file, opts) {
    opts = opts || {};
    var arr = parent[key];
    var wrap = el('div', { class: 'list' });
    function redraw() {
      wrap.innerHTML = '';
      var order = arr.map(function (_, i) { return i; });
      if (opts.sort) order.sort(function (a, b) { return opts.sort(arr[a], arr[b]); });
      order.forEach(function (i, pos) {
        var item = arr[i];
        var details = el('details', { class: 'list-item' + (opts.itemClass ? ' ' + opts.itemClass(item) : '') });
        var summary = el('summary', {}, [
          el('span', { class: 'list-title', text: opts.summary ? opts.summary(item, i) : itemTitle(item, i) })
        ]);
        var tools = el('span', { class: 'list-tools' });
        if (!opts.sort) {
          tools.appendChild(el('button', { type: 'button', class: 'icon-btn', title: 'Nach oben', 'aria-label': 'Nach oben', disabled: pos === 0 ? 'disabled' : null,
            onclick: function (e) { e.preventDefault(); var t = arr[i - 1]; arr[i - 1] = arr[i]; arr[i] = t; markChanged(); redraw(); } },
            [el('i', { class: 'fa-solid fa-arrow-up' })]));
          tools.appendChild(el('button', { type: 'button', class: 'icon-btn', title: 'Nach unten', 'aria-label': 'Nach unten', disabled: pos === arr.length - 1 ? 'disabled' : null,
            onclick: function (e) { e.preventDefault(); var t = arr[i + 1]; arr[i + 1] = arr[i]; arr[i] = t; markChanged(); redraw(); } },
            [el('i', { class: 'fa-solid fa-arrow-down' })]));
        }
        tools.appendChild(el('button', { type: 'button', class: 'icon-btn danger', title: 'Löschen', 'aria-label': 'Löschen',
          onclick: function (e) {
            e.preventDefault();
            if (!confirm('„' + itemTitle(item, i) + '“ wirklich löschen?')) return;
            arr.splice(i, 1); markChanged(); redraw();
          } }, [el('i', { class: 'fa-regular fa-trash-can' })]));
        summary.appendChild(tools);
        details.appendChild(summary);
        var body = typeof item === 'object' ? renderObject(item, file) : el('div');
        body.addEventListener('input', function () {
          summary.querySelector('.list-title').textContent = opts.summary ? opts.summary(item, i) : itemTitle(item, i);
        });
        details.appendChild(body);
        if (opts.openIndex === i) details.open = true;
        wrap.appendChild(details);
      });
      wrap.appendChild(el('button', { type: 'button', class: 'btn btn-light add-btn', onclick: function () {
        var fresh = opts.create ? opts.create() : blankFrom(arr[0]);
        arr.push(fresh);
        opts.openIndex = arr.length - 1;
        markChanged(); redraw();
        var last = wrap.querySelector('details[open]');
        if (last) last.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } }, [el('i', { class: 'fa-solid fa-plus' }), ' ' + (opts.addLabel || 'Eintrag hinzufügen')]));
    }
    redraw();
    return wrap;
  }

  // ------------------------------------------------------------------
  // Veranstaltungen
  // ------------------------------------------------------------------
  function renderEvents(container, file) {
    var data = state.files[file];
    var todayKey = new Date().toISOString().slice(0, 10);
    var card = el('section', { class: 'card' }, [
      el('h2', { text: 'Termine' }),
      el('p', { class: 'muted small', text: 'Neue Termine erscheinen nach dem Speichern automatisch auf der Website (sortiert nach Datum). Ohne Bild wird ein farbiges Datums-Feld angezeigt.' })
    ]);
    var categories = data.categories || [];
    card.appendChild(renderList(data, 'items', file, {
      addLabel: 'Neuen Termin anlegen',
      sort: function (a, b) {
        var pa = String(a.date).slice(0, 10) < todayKey, pb = String(b.date).slice(0, 10) < todayKey;
        if (pa !== pb) return pa ? 1 : -1;
        return pa ? String(b.date).localeCompare(String(a.date)) : String(a.date).localeCompare(String(b.date));
      },
      itemClass: function (item) { return String(item.date).slice(0, 10) < todayKey ? 'is-past' : ''; },
      summary: function (item) {
        var d = String(item.date || '');
        var nice = d ? d.slice(8, 10) + '.' + d.slice(5, 7) + '.' + d.slice(0, 4) : 'ohne Datum';
        var past = d.slice(0, 10) < todayKey ? ' · vergangen' : '';
        var hidden = item.published === false ? ' · versteckt' : '';
        return nice + ' – ' + (item.title || 'Neuer Termin') + past + hidden;
      },
      create: function () {
        var d = new Date(Date.now() + 7 * 864e5);
        return { id: String(Date.now()), title: '', title_en: '', date: d.toISOString().slice(0, 10) + 'T19:00:00', end_date: '',
          location: 'In der Gemeinde', location_en: 'At our church', category: (categories[0] || {}).id || '',
          image: '', description: '', description_en: '', published: true };
      }
    }));
    container.appendChild(card);

    // Kategorie als Auswahlfeld statt Freitext
    card.addEventListener('toggle', function () { enhanceCategories(card, categories); }, true);

    var catCard = el('section', { class: 'card' }, [el('h2', { text: 'Kategorien' }),
      el('p', { class: 'muted small', text: 'Kategorien färben die Termine ein, z. B. „Jugend“ oder „Special Event“.' })]);
    catCard.appendChild(renderList(data, 'categories', file, { addLabel: 'Kategorie hinzufügen', create: function () {
      return { id: 'kategorie-' + Date.now().toString(36), name: '', name_en: '', color: '#2350B8' };
    } }));
    container.appendChild(catCard);
  }

  function enhanceCategories(root, categories) {
    root.querySelectorAll('.field-text').forEach(function (f) {
      var lab = f.querySelector('label');
      var input = f.querySelector('input');
      if (!lab || lab.textContent !== LABELS.category || f.dataset.enhanced) return;
      f.dataset.enhanced = '1';
      var sel = el('select', { id: input.id });
      sel.appendChild(el('option', { value: '', text: '– keine –' }));
      categories.forEach(function (c) { sel.appendChild(el('option', { value: c.id, text: c.name })); });
      sel.value = input.value;
      sel.addEventListener('change', function () { input.value = sel.value; input.dispatchEvent(new Event('input', { bubbles: true })); });
      input.hidden = true;
      f.insertBefore(sel, input);
    });
  }

  // ------------------------------------------------------------------
  // Texteditor für Impressum/Datenschutz
  // ------------------------------------------------------------------
  function richEditor(obj, key) {
    var box = el('div', { class: 'rich' });
    var area = el('div', { class: 'rich-area', contenteditable: 'true', role: 'textbox', 'aria-multiline': 'true' });
    area.innerHTML = obj[key] || '';
    var bar = el('div', { class: 'rich-bar' });
    [['formatBlock', 'h2', 'Überschrift'], ['formatBlock', 'h3', 'Zwischenüberschrift'], ['formatBlock', 'p', 'Absatz'],
     ['bold', null, 'Fett'], ['insertUnorderedList', null, 'Liste'], ['createLink', null, 'Link'], ['removeFormat', null, 'Formatierung entfernen']]
      .forEach(function (b) {
        bar.appendChild(el('button', { type: 'button', class: 'btn btn-light btn-xs', text: b[2], onmousedown: function (e) {
          e.preventDefault();
          area.focus();
          if (b[0] === 'createLink') {
            var url = prompt('Link-Adresse (z. B. https://… oder mailto:…)');
            if (url) document.execCommand('createLink', false, url);
          } else {
            document.execCommand(b[0], false, b[1] ? '<' + b[1] + '>' : null);
          }
          obj[key] = area.innerHTML; markChanged();
        } }));
      });
    area.addEventListener('input', function () { obj[key] = area.innerHTML; markChanged(); });
    box.appendChild(bar);
    box.appendChild(area);
    return box;
  }

  // ------------------------------------------------------------------
  // Bilder
  // ------------------------------------------------------------------
  function imgSrc(path) { return state.localPreviews[path] || path; }

  function imageInput(obj, key, id) {
    var wrap = el('div', { class: 'image-field' });
    var preview = el('div', { class: 'image-preview' });
    function draw() {
      preview.innerHTML = '';
      if (obj[key]) preview.appendChild(el('img', { src: imgSrc(obj[key]), alt: '' }));
      else preview.appendChild(el('span', { class: 'muted small', text: 'Kein Bild' }));
    }
    draw();
    var choose = el('button', { type: 'button', class: 'btn btn-light', id: id, onclick: function () {
      pickImage(function (path) { obj[key] = path; markChanged(); draw(); });
    } }, [el('i', { class: 'fa-regular fa-image' }), ' Bild ändern']);
    var remove = el('button', { type: 'button', class: 'btn btn-light', onclick: function () { obj[key] = ''; markChanged(); draw(); } },
      [el('i', { class: 'fa-regular fa-trash-can' }), ' Entfernen']);
    wrap.appendChild(preview);
    wrap.appendChild(el('div', { class: 'image-actions' }, [choose, remove]));
    return wrap;
  }

  var pickCallback = null;
  function pickImage(cb) {
    pickCallback = cb;
    var grid = $('#image-grid');
    grid.innerHTML = '';
    state.images.slice().reverse().forEach(function (img) {
      grid.appendChild(el('button', { type: 'button', class: 'image-choice', title: img.path.split('/').pop(), onclick: function () {
        $('#image-dialog').close(); if (pickCallback) pickCallback(img.path);
      } }, [el('img', { src: imgSrc(img.path), alt: '', loading: 'lazy' })]));
    });
    $('#upload-status').textContent = '';
    $('#image-dialog').showModal();
  }

  function resizeImage(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = reject;
      reader.onload = function () {
        var img = new Image();
        img.onerror = function () { reject(new Error('Das Bild konnte nicht gelesen werden.')); };
        img.onload = function () {
          var max = 1920;
          var scale = Math.min(1, max / Math.max(img.width, img.height));
          if (scale === 1 && file.size < 900 * 1024) { resolve({ data: reader.result, type: file.type }); return; }
          var canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          var keepPng = file.type === 'image/png' && file.size < 2.5 * 1024 * 1024;
          var type = keepPng ? 'image/png' : 'image/jpeg';
          resolve({ data: canvas.toDataURL(type, 0.85), type: type });
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  $('#image-upload').addEventListener('change', function (e) {
    var file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    var status = $('#upload-status');
    status.textContent = 'Bild wird hochgeladen …';
    resizeImage(file).then(function (img) {
      return api('upload', { name: file.name, type: img.type, data: img.data }).then(function (res) {
        state.localPreviews[res.path] = img.data;
        state.images.push({ path: res.path });
        status.textContent = '';
        $('#image-dialog').close();
        if (pickCallback) pickCallback(res.path);
      });
    }).catch(function (err) { status.textContent = err.message; });
  });

  // ------------------------------------------------------------------
  // Speichern
  // ------------------------------------------------------------------
  $('#save-btn').addEventListener('click', function () {
    var files = {};
    dirtyFiles().forEach(function (f) { files[f] = state.files[f]; });
    var btn = $('#save-btn');
    btn.disabled = true;
    setSaveStatus('Wird gespeichert …', 'pending');
    api('save', { files: files }).then(function () {
      Object.keys(files).forEach(function (f) { state.original[f] = JSON.stringify(state.files[f]); });
      markChanged();
      setSaveStatus('Gespeichert. Die Website ist in ca. 1–2 Minuten aktualisiert.', 'ok');
    }).catch(function (err) {
      setSaveStatus(err.message, 'error');
      btn.disabled = false;
    });
  });

  window.addEventListener('beforeunload', function (e) {
    if (state.session && dirtyFiles().length) { e.preventDefault(); e.returnValue = ''; }
  });

  window.addEventListener('hashchange', function () { if (/login=/.test(location.hash)) start(); });
  start();
})();
