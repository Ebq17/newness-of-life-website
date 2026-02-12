/**
 * CMS Preview Script
 * Ermoeglicht Click-to-Edit und Live-Update Funktionalitaet in der Vorschau
 */
(function() {
  'use strict';

  // Nur aktivieren wenn im CMS-Preview Modus (im iframe)
  if (window.parent === window) {
    return;
  }

  let isEditMode = false;
  let activeElement = null;
  const ADMIN_ORIGIN = 'http://localhost:3001';

  console.log('[CMS Preview] Script geladen, warte auf Nachrichten von:', ADMIN_ORIGIN);

  // Notify parent that iframe is ready
  function notifyReady() {
    window.parent.postMessage({ type: 'iframeReady' }, ADMIN_ORIGIN);
    console.log('[CMS Preview] Ready-Signal gesendet');
  }

  // Helper to get nested value from object
  function getNestedValue(obj, path) {
    return path.split('.').reduce((o, k) => (o || {})[k], obj);
  }

  // Update element content based on data path - with visual feedback
  function updateElementContent(element, value) {
    if (!element) return;

    if (element.hasAttribute('data-cms-attr')) {
      const attr = element.getAttribute('data-cms-attr');
      if (attr === 'href') {
        element.href = value;
        return;
      }
      if (attr === 'src') {
        element.src = value;
        return;
      }
      if (attr === 'background-image') {
        const overlay = element.getAttribute('data-cms-bg-overlay') || '';
        const host = element.classList.contains('cms-edit-layer') && element.parentElement
          ? element.parentElement
          : element;
        if (value) {
          const overlayPrefix = overlay ? `${overlay}, ` : '';
          host.style.backgroundImage = `${overlayPrefix}url("${value}")`;
          host.style.backgroundSize = 'cover';
          host.style.backgroundPosition = 'center';
          host.dataset.hasImage = 'true';
          element.dataset.hasImage = 'true';
          const video = host.querySelector('video');
          if (video) {
            video.pause();
          }
        } else {
          host.style.backgroundImage = '';
          host.dataset.hasImage = 'false';
          element.dataset.hasImage = 'false';
          const video = host.querySelector('video');
          if (video) {
            video.play().catch(() => {});
          }
        }
        return;
      }
    }

    const oldValue = element.tagName === 'IMG' ? element.src : element.textContent;

    if (element.tagName === 'IMG') {
      element.src = value;
    } else if (element.tagName === 'A') {
      element.textContent = value;
    } else if (element.hasAttribute('data-cms-format') && element.getAttribute('data-cms-format') === 'html') {
      element.innerHTML = value;
    } else {
      element.textContent = value;
    }

    // Visual feedback - flash effect
    element.classList.add('cms-flash-update');
    setTimeout(function() {
      element.classList.remove('cms-flash-update');
    }, 600);

    console.log('[CMS Preview] Element aktualisiert:', element.dataset.cmsField, '| Neu:', value);
  }

  // Styles fuer Highlight-Effekte
  const style = document.createElement('style');
  style.textContent = `
    /* Editierbare Elemente */
    [data-cms-field] {
      cursor: pointer;
      transition: outline 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
      position: relative;
    }
    body.cms-edit-mode .cms-edit-layer{
      pointer-events: auto;
    }

    /* Hover Effekt - nur im Edit Mode */
    body.cms-edit-mode [data-cms-field]:hover {
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

    /* Label Tooltip - nur im Edit Mode */
    body.cms-edit-mode [data-cms-field]::before {
      content: attr(data-cms-label);
      position: absolute;
      top: -28px;
      left: 0;
      background: #2563EB;
      color: white;
      font-size: 11px;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 4px;
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transform: translateY(4px);
      transition: opacity 0.15s ease, transform 0.15s ease;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }

    body.cms-edit-mode [data-cms-field]:hover::before,
    [data-cms-field].cms-active::before {
      opacity: 1;
      transform: translateY(0);
    }

    /* Edit Icon - nur im Edit Mode */
    body.cms-edit-mode [data-cms-field]::after {
      content: '';
      position: absolute;
      top: 4px;
      right: 4px;
      width: 22px;
      height: 22px;
      background: #2563EB url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2'%3E%3Cpath d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'/%3E%3Cpath d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'/%3E%3C/svg%3E") center/12px no-repeat;
      border-radius: 4px;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.15s ease;
      z-index: 10001;
    }

    body.cms-edit-mode [data-cms-field]:hover::after {
      opacity: 1;
    }

    /* Hinweis bei fehlendem Hintergrundbild */
    body.cms-edit-mode [data-cms-attr="background-image"][data-has-image="false"]::after {
      content: "Kein Hintergrundbild";
      position: absolute;
      bottom: 12px;
      left: 12px;
      background: rgba(0,0,0,0.65);
      color: #fff;
      font-size: 11px;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 6px;
      letter-spacing: 0.02em;
      z-index: 10002;
      opacity: 1;
    }

    /* Live Update Flash - Gruener Effekt */
    .cms-flash-update {
      animation: flashUpdateGreen 0.6s ease !important;
    }

    @keyframes flashUpdateGreen {
      0% {
        box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.6);
        background-color: rgba(16, 185, 129, 0.15);
      }
      100% {
        box-shadow: none;
        background-color: transparent;
      }
    }

    /* Section Hidden */
    [data-cms-section].cms-section-hidden {
      display: none !important;
    }

    /* Highlight effect for focused elements */
    [data-cms-field].cms-highlight {
      outline: 3px solid #10B981 !important;
      outline-offset: 3px;
    }
  `;
  document.head.appendChild(style);

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

  // Click Handler for editable elements
  document.addEventListener('click', function(e) {
    if (!isEditMode) return;

    const target = e.target.closest('[data-cms-field]');

    // Prevent all link/button navigation in edit mode
    const link = e.target.closest('a');
    const button = e.target.closest('button');
    if (link || button) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!target) return;

    e.preventDefault();
    e.stopPropagation();

    activateElement(target);

    const path = target.getAttribute('data-cms-field');
    const label = target.getAttribute('data-cms-label') || path;
    let value;

    if (target.tagName === 'IMG') {
      value = target.src;
    } else if (target.tagName === 'A' && target.hasAttribute('data-cms-attr') && target.getAttribute('data-cms-attr') === 'href') {
      value = target.href;
    } else if (target.hasAttribute('data-cms-format') && target.getAttribute('data-cms-format') === 'html') {
      value = target.innerHTML;
    } else {
      value = target.textContent;
    }

    // Message an Parent (Admin) senden
    window.parent.postMessage({
      type: 'elementClicked',
      payload: { path: path, label: label, value: value }
    }, ADMIN_ORIGIN);

    console.log('[CMS Preview] Element geklickt:', path, label);
  }, true);

  // Prevent form submissions in edit mode
  document.addEventListener('submit', function(e) {
    if (isEditMode) {
      e.preventDefault();
      e.stopPropagation();
      console.log('[CMS Preview] Form submission verhindert');
    }
  }, true);

  // Message Handler - empfaengt Updates vom Editor
  window.addEventListener('message', function(e) {
    // Accept messages from admin origin
    if (e.origin !== ADMIN_ORIGIN) {
      return;
    }

    const { type, payload } = e.data || {};

    console.log('[CMS Preview] Nachricht empfangen:', type, payload);

    switch (type) {
      case 'updateContent':
        // LIVE UPDATE: Inhalt sofort aktualisieren
        if (payload && payload.path) {
          const elements = document.querySelectorAll(`[data-cms-field="${payload.path}"]`);
          elements.forEach(el => {
            updateElementContent(el, payload.value);
          });
        }
        break;

      case 'initialLoad':
        // Alle CMS-Felder mit initialen Daten befuellen
        if (payload) {
          document.querySelectorAll('[data-cms-field]').forEach(el => {
            const path = el.getAttribute('data-cms-field');
            const value = getNestedValue(payload, path);
            if (value !== undefined) {
              updateElementContent(el, value);
            }
          });
          console.log('[CMS Preview] Initialdaten geladen');
        }
        break;

      case 'setEditMode':
        isEditMode = payload?.enabled || false;
        document.body.classList.toggle('cms-edit-mode', isEditMode);
        console.log('[CMS Preview] Edit-Modus:', isEditMode ? 'AN' : 'AUS');
        if (!isEditMode) {
          activateElement(null);
        }
        break;

      case 'highlightElement':
        // Element hervorheben wenn Feld im Editor fokussiert wird
        if (payload && payload.path) {
          document.querySelectorAll('.cms-highlight').forEach(el => el.classList.remove('cms-highlight'));
          const elements = document.querySelectorAll(`[data-cms-field="${payload.path}"]`);
          elements.forEach(el => {
            el.classList.add('cms-highlight');
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          });
        }
        break;

      case 'clearHighlight':
        document.querySelectorAll('.cms-highlight, .cms-active').forEach(el => {
          el.classList.remove('cms-highlight', 'cms-active');
        });
        activeElement = null;
        break;

      case 'toggleSection':
        // Section ein-/ausblenden
        if (payload && payload.sectionId) {
          const section = document.querySelector(`[data-cms-section="${payload.sectionId}"], #${payload.sectionId}, [id="${payload.sectionId}"]`);
          if (section) {
            section.classList.toggle('cms-section-hidden', !payload.enabled);
            console.log('[CMS Preview] Section', payload.sectionId, payload.enabled ? 'eingeblendet' : 'ausgeblendet');
          }
        }
        break;

      case 'updateStyle':
        // Style fuer Section aktualisieren (Hintergrund etc.)
        if (payload && payload.sectionId && payload.style) {
          const section = document.querySelector(`[data-cms-section="${payload.sectionId}"], #${payload.sectionId}, [id="${payload.sectionId}"]`);
          if (section) {
            Object.assign(section.style, payload.style);
            console.log('[CMS Preview] Style aktualisiert fuer', payload.sectionId);
          }
        }
        break;
    }
  });

  // Keyboard Shortcuts
  document.addEventListener('keydown', function(e) {
    if (!isEditMode) return;

    // ESC - Auswahl aufheben
    if (e.key === 'Escape') {
      activateElement(null);
      window.parent.postMessage({ type: 'elementDeselected' }, ADMIN_ORIGIN);
    }

    // Tab - Naechstes editierbares Element
    if (e.key === 'Tab' && !e.shiftKey && activeElement) {
      e.preventDefault();
      const elements = Array.from(document.querySelectorAll('[data-cms-field]'));
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
      const elements = Array.from(document.querySelectorAll('[data-cms-field]'));
      const currentIndex = elements.indexOf(activeElement);
      const prevIndex = (currentIndex - 1 + elements.length) % elements.length;
      const prevElement = elements[prevIndex];
      if (prevElement) {
        prevElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        prevElement.click();
      }
    }
  });

  // Ready signal senden wenn DOM geladen
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(notifyReady, 100);
    });
  } else {
    setTimeout(notifyReady, 100);
  }

  console.log('[CMS Preview] ' + getEditableElements().length + ' editierbare Elemente gefunden');
})();
