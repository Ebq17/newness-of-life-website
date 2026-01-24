/**
 * CMS Preview Script
 * Ermoeglicht Click-to-Edit Funktionalitaet in der Vorschau
 */
(function() {
  'use strict';

  // Nur aktivieren wenn im CMS-Preview Modus
  if (!window.location.search.includes('cms-preview=1')) {
    return;
  }

  console.log('[CMS Preview] Aktiviert');

  // Styles fuer Highlight-Effekte
  const style = document.createElement('style');
  style.textContent = `
    /* Editierbare Elemente */
    [data-cms-field] {
      cursor: pointer;
      transition: outline 0.15s ease, background-color 0.15s ease;
      position: relative;
    }

    /* Hover Effekt */
    [data-cms-field]:hover {
      outline: 2px dashed #2563EB;
      outline-offset: 2px;
      background-color: rgba(37, 99, 235, 0.05);
    }

    /* Aktiv/Ausgewaehlt */
    [data-cms-field].cms-active {
      outline: 3px solid #2563EB !important;
      outline-offset: 2px;
      background-color: rgba(37, 99, 235, 0.1) !important;
    }

    /* Label Tooltip */
    [data-cms-field]::before {
      content: attr(data-cms-label);
      position: absolute;
      top: -24px;
      left: 0;
      background: #2563EB;
      color: white;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 4px;
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transform: translateY(4px);
      transition: opacity 0.15s ease, transform 0.15s ease;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    [data-cms-field]:hover::before,
    [data-cms-field].cms-active::before {
      opacity: 1;
      transform: translateY(0);
    }

    /* Edit Icon */
    [data-cms-field]::after {
      content: '';
      position: absolute;
      top: 4px;
      right: 4px;
      width: 20px;
      height: 20px;
      background: #2563EB url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2'%3E%3Cpath d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'/%3E%3Cpath d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'/%3E%3C/svg%3E") center/12px no-repeat;
      border-radius: 4px;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.15s ease;
      z-index: 10001;
    }

    [data-cms-field]:hover::after {
      opacity: 1;
    }

    /* CMS Preview Indicator */
    .cms-preview-indicator {
      position: fixed;
      bottom: 16px;
      left: 16px;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: white;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      z-index: 99999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .cms-preview-indicator::before {
      content: '';
      width: 8px;
      height: 8px;
      background: #10B981;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    /* Live Update Flash */
    .cms-flash-update {
      animation: flashUpdate 0.5s ease;
    }

    @keyframes flashUpdate {
      0% { background-color: rgba(16, 185, 129, 0.3); }
      100% { background-color: transparent; }
    }
  `;
  document.head.appendChild(style);

  // Preview Indicator hinzufuegen
  const indicator = document.createElement('div');
  indicator.className = 'cms-preview-indicator';
  indicator.textContent = 'CMS Vorschau - Klicke zum Bearbeiten';
  document.body.appendChild(indicator);

  // Aktives Element tracken
  let activeElement = null;

  // Alle editierbaren Elemente finden
  function getEditableElements() {
    return document.querySelectorAll('[data-cms-field]');
  }

  // Element aktivieren
  function activateElement(el) {
    if (activeElement) {
      activeElement.classList.remove('cms-active');
    }
    activeElement = el;
    if (el) {
      el.classList.add('cms-active');
    }
  }

  // Click Handler
  document.addEventListener('click', function(e) {
    const target = e.target.closest('[data-cms-field]');
    if (!target) return;

    e.preventDefault();
    e.stopPropagation();

    activateElement(target);

    const field = target.getAttribute('data-cms-field');
    const label = target.getAttribute('data-cms-label') || field;

    // Message an Parent (Admin) senden
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'cms-select-field',
        field: field,
        label: label
      }, '*');
    }

    console.log('[CMS Preview] Feld ausgewaehlt:', field, label);
  }, true);

  // Live Updates empfangen
  window.addEventListener('message', function(e) {
    if (!e.data || e.data.type !== 'cms-update-field') return;

    const field = e.data.field;
    const value = e.data.value;

    // Element mit diesem Feld finden und updaten
    const elements = document.querySelectorAll('[data-cms-field="' + field + '"]');
    elements.forEach(function(el) {
      // Je nach Element-Typ updaten
      if (el.tagName === 'IMG') {
        el.src = value;
      } else if (el.tagName === 'A') {
        if (el.hasAttribute('data-cms-attr') && el.getAttribute('data-cms-attr') === 'href') {
          el.href = value;
        } else {
          el.textContent = value;
        }
      } else if (el.hasAttribute('data-cms-format') && el.getAttribute('data-cms-format') === 'html') {
        el.innerHTML = value;
      } else {
        el.textContent = value;
      }

      // Flash Effekt
      el.classList.add('cms-flash-update');
      setTimeout(function() {
        el.classList.remove('cms-flash-update');
      }, 500);
    });

    console.log('[CMS Preview] Feld aktualisiert:', field, value);
  });

  // Keyboard Shortcuts
  document.addEventListener('keydown', function(e) {
    // ESC - Auswahl aufheben
    if (e.key === 'Escape') {
      activateElement(null);
    }

    // Tab - Naechstes editierbares Element
    if (e.key === 'Tab' && !e.shiftKey && activeElement) {
      e.preventDefault();
      const elements = Array.from(getEditableElements());
      const currentIndex = elements.indexOf(activeElement);
      const nextIndex = (currentIndex + 1) % elements.length;
      const nextElement = elements[nextIndex];
      if (nextElement) {
        nextElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        nextElement.click();
      }
    }

    // Shift+Tab - Vorheriges editierbares Element
    if (e.key === 'Tab' && e.shiftKey && activeElement) {
      e.preventDefault();
      const elements = Array.from(getEditableElements());
      const currentIndex = elements.indexOf(activeElement);
      const prevIndex = (currentIndex - 1 + elements.length) % elements.length;
      const prevElement = elements[prevIndex];
      if (prevElement) {
        prevElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        prevElement.click();
      }
    }
  });

  // Link-Klicks abfangen (Navigation innerhalb der Vorschau)
  document.addEventListener('click', function(e) {
    const link = e.target.closest('a[href]');
    if (!link) return;

    // Wenn es ein CMS-Feld ist, nicht navigieren
    if (link.closest('[data-cms-field]')) return;

    const href = link.getAttribute('href');
    if (!href) return;

    // Externe Links ignorieren
    if (href.startsWith('http') || href.startsWith('//') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      return;
    }

    // Anker-Links erlauben
    if (href.startsWith('#')) {
      return;
    }

    // Interne Navigation - Message an Parent
    e.preventDefault();
    if (window.parent && window.parent !== window) {
      // Nur den Dateinamen extrahieren
      const page = href.split('#')[0].split('?')[0];
      if (page) {
        window.parent.postMessage({
          type: 'cms-navigate',
          page: page
        }, '*');
      }
    }
  });

  console.log('[CMS Preview] ' + getEditableElements().length + ' editierbare Elemente gefunden');
})();
