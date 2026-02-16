/**
 * Internationalization (i18n) Module
 * Handles language switching between German and English
 */
const I18n = {
  currentLang: 'de',
  translations: {},

  async init() {
    // Load saved language preference
    this.currentLang = localStorage.getItem('site-language') || 'de';

    // Load translations
    try {
      const response = await fetch('/data/translations.json');
      this.translations = await response.json();
    } catch (e) {
      console.warn('Could not load translations:', e);
      return;
    }

    // Apply translations
    this.applyTranslations();

    // Update language switcher UI
    this.updateSwitcher();

    // Set html lang attribute
    document.documentElement.lang = this.currentLang;
  },

  setLanguage(lang) {
    if (lang !== 'de' && lang !== 'en') return;

    this.currentLang = lang;
    localStorage.setItem('site-language', lang);
    document.documentElement.lang = lang;

    this.applyTranslations();
    this.updateSwitcher();
  },

  toggleLanguage() {
    this.setLanguage(this.currentLang === 'de' ? 'en' : 'de');
  },

  t(key) {
    const keys = key.split('.');
    let value = this.translations[this.currentLang];

    for (const k of keys) {
      if (value && value[k] !== undefined) {
        value = value[k];
      } else {
        return key; // Return key if translation not found
      }
    }

    return value;
  },

  applyTranslations() {
    // Find all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const translation = this.t(key);

      if (translation && translation !== key) {
        // Check if it's an input placeholder
        if (el.hasAttribute('placeholder')) {
          el.placeholder = translation;
        } else {
          el.textContent = translation;
        }
      }
    });

    // Handle data-i18n-html for HTML content
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      const translation = this.t(key);

      if (translation && translation !== key) {
        el.innerHTML = translation;
      }
    });

    // Handle data-i18n-placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      const translation = this.t(key);

      if (translation && translation !== key) {
        el.placeholder = translation;
      }
    });
  },

  updateSwitcher() {
    const switcher = document.getElementById('langSwitcher');
    if (switcher) {
      const deBtn = switcher.querySelector('[data-lang="de"]');
      const enBtn = switcher.querySelector('[data-lang="en"]');

      if (deBtn) deBtn.classList.toggle('active', this.currentLang === 'de');
      if (enBtn) enBtn.classList.toggle('active', this.currentLang === 'en');
    }

    // Update single toggle button if exists
    const toggleBtn = document.getElementById('langToggle');
    if (toggleBtn) {
      toggleBtn.textContent = this.currentLang === 'de' ? 'EN' : 'DE';
      toggleBtn.setAttribute('title', this.currentLang === 'de' ? 'Switch to English' : 'Auf Deutsch wechseln');
    }
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => I18n.init());
