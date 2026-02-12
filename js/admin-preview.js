/**
 * Admin Preview Edit Mode Script
 * - Blockiert Links und Buttons im Edit-Mode
 * - Ermöglicht Click-to-Edit auf Elemente mit data-edit Attribut
 * - Kommuniziert mit dem Parent-Editor via postMessage
 */

(function() {
  'use strict';

  // Check if we're in an iframe (admin preview)
  const isInIframe = window.self !== window.top;
  if (!isInIframe) return;

  // Check for edit mode via URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const isEditMode = urlParams.get('editMode') === 'true';

  if (!isEditMode) return;

  console.log('[Admin Preview] Edit mode active');

  // Styles for edit mode
  const style = document.createElement('style');
  style.textContent = `
    /* Edit Mode Indicator */
    body::before {
      content: '✏️ Bearbeiten-Modus – Klicke auf Elemente zum Bearbeiten';
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(90deg, #2563EB, #10B981);
      color: white;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 500;
      text-align: center;
      z-index: 99999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    body {
      padding-top: 36px !important;
    }

    /* Editable elements hover effect */
    [data-edit] {
      cursor: pointer !important;
      transition: outline 0.15s ease, background-color 0.15s ease;
      outline: 2px dashed transparent;
      outline-offset: 4px;
    }

    [data-edit]:hover {
      outline: 2px dashed #2563EB !important;
      background-color: rgba(37, 99, 235, 0.05) !important;
    }

    [data-edit].selected {
      outline: 3px solid #2563EB !important;
      background-color: rgba(37, 99, 235, 0.1) !important;
    }

    /* Image edit overlay */
    [data-edit][data-edit-type="image"] {
      position: relative;
    }

    [data-edit][data-edit-type="image"]::after {
      content: '📷 Bild ändern';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0,0,0,0.7);
      color: white;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      opacity: 0;
      transition: opacity 0.2s;
      pointer-events: none;
    }

    [data-edit][data-edit-type="image"]:hover::after {
      opacity: 1;
    }

    /* Disabled links indicator */
    a, button, [onclick] {
      cursor: pointer !important;
    }

    a:not([data-edit])::after {
      content: ' 🔗';
      font-size: 10px;
      opacity: 0.5;
    }
  `;
  document.head.appendChild(style);

  let selectedElement = null;

  // Block all link clicks
  document.addEventListener('click', function(e) {
    const target = e.target;

    // Check if it's an editable element
    const editableEl = target.closest('[data-edit]');
    if (editableEl) {
      e.preventDefault();
      e.stopPropagation();

      // Deselect previous
      if (selectedElement) {
        selectedElement.classList.remove('selected');
      }

      // Select new
      selectedElement = editableEl;
      selectedElement.classList.add('selected');

      // Get edit info
      const editId = editableEl.dataset.edit;
      const editType = editableEl.dataset.editType || 'text';
      const currentValue = editableEl.textContent.trim();

      // Send message to parent
      window.parent.postMessage({
        type: 'EDIT_ELEMENT',
        data: {
          id: editId,
          type: editType,
          value: currentValue,
          tagName: editableEl.tagName,
          rect: editableEl.getBoundingClientRect()
        }
      }, '*');

      return false;
    }

    // Block link navigation
    const link = target.closest('a');
    if (link) {
      e.preventDefault();
      e.stopPropagation();

      // Show tooltip
      showTooltip(link, 'Link blockiert – Ctrl+Click zum Öffnen');
      return false;
    }

    // Block button clicks
    const button = target.closest('button');
    if (button) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Block form submissions
    const form = target.closest('form');
    if (form) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }, true);

  // Allow Ctrl+Click to open links
  document.addEventListener('click', function(e) {
    if (e.ctrlKey || e.metaKey) {
      const link = e.target.closest('a');
      if (link && link.href) {
        window.open(link.href, '_blank');
      }
    }
  });

  // Block form submissions
  document.addEventListener('submit', function(e) {
    e.preventDefault();
    e.stopPropagation();
  }, true);

  // Tooltip helper
  function showTooltip(element, text) {
    const existing = document.querySelector('.edit-tooltip');
    if (existing) existing.remove();

    const tooltip = document.createElement('div');
    tooltip.className = 'edit-tooltip';
    tooltip.textContent = text;
    tooltip.style.cssText = `
      position: fixed;
      background: #111827;
      color: white;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      z-index: 999999;
      pointer-events: none;
      animation: fadeIn 0.2s ease;
    `;

    const rect = element.getBoundingClientRect();
    tooltip.style.top = (rect.bottom + 8) + 'px';
    tooltip.style.left = rect.left + 'px';

    document.body.appendChild(tooltip);

    setTimeout(() => tooltip.remove(), 2000);
  }

  // Listen for messages from parent
  window.addEventListener('message', function(e) {
    if (e.data.type === 'UPDATE_CONTENT') {
      const { id, value } = e.data;
      const element = document.querySelector(`[data-edit="${id}"]`);
      if (element) {
        if (element.tagName === 'IMG') {
          element.src = value;
        } else {
          element.textContent = value;
        }
      }
    }

    if (e.data.type === 'HIGHLIGHT_ELEMENT') {
      const { id } = e.data;
      const element = document.querySelector(`[data-edit="${id}"]`);
      if (element) {
        if (selectedElement) {
          selectedElement.classList.remove('selected');
        }
        selectedElement = element;
        selectedElement.classList.add('selected');
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  });

  // Notify parent that edit mode is ready
  window.parent.postMessage({ type: 'EDIT_MODE_READY' }, '*');

})();
