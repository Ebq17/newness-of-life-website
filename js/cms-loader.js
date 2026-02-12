// js/cms-loader.js

(function() {
  'use strict';

  // Helper to get nested value from object
  function getNestedValue(obj, path) {
    return path.split('.').reduce((o, k) => (o || {})[k], obj);
  }

  // Function to load and apply CMS content
  async function loadCMSContent() {
    // Determine current page based on filename
    const path = window.location.pathname;
    let pageSlug = 'homepage'; // Default to homepage
    if (path === '/' || path === '/index.html') {
      pageSlug = 'homepage';
    } else {
      const match = path.match(/\/(.*?)\.html$/);
      if (match && match[1]) {
        pageSlug = match[1];
      }
    }

    let dataFilePath = '';
    if (pageSlug === 'homepage') {
      dataFilePath = 'data/homepage.json';
    } else {
      dataFilePath = `data/pages/${pageSlug}.json`;
    }

    try {
      const response = await fetch(dataFilePath);
      if (!response.ok) {
        // Fallback: If page-specific data is not found, try to load global data for some fields
        console.warn(`[CMS Loader] Page data not found for ${pageSlug}. Attempting to use default/global values.`);
        // For now, we'll just proceed with empty data, but here could be a fallback to global.json
        return; // Exit if no page-specific data
      }
      const data = await response.json();

      // Apply data to elements
      document.querySelectorAll('[data-cms-field]').forEach(element => {
        const fieldPath = element.getAttribute('data-cms-field');
        const value = getNestedValue(data, fieldPath);

        if (value !== undefined) {
          // Skip arrays and objects - they can't be displayed as simple text
          if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
            return;
          }

          const format = element.getAttribute('data-cms-format');
          const attr = element.getAttribute('data-cms-attr');

          if (attr) {
            attr.split(',').forEach(a => {
              a = a.trim();
              if (a === 'textContent') {
                element.textContent = value;
              } else if (a === 'innerHTML') {
                element.innerHTML = value;
              } else {
                element.setAttribute(a, value);
              }
            });
          } else if (element.tagName === 'IMG') {
            element.src = value;
          } else if (element.tagName === 'A') {
            element.href = value;
          } else if (format === 'html') {
            element.innerHTML = value;
          } else {
            element.textContent = value;
          }
        }
      });
    } catch (error) {
      console.error(`[CMS Loader] Error loading or applying CMS content for ${pageSlug}:`, error);
    }
  }

  // Run on page load
  document.addEventListener('DOMContentLoaded', loadCMSContent);
})();