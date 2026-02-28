/**
 * i18n - Internationalization Engine
 * Loads locale JSON files and applies translations to elements with data-i18n attributes.
 * Persists selected language to localStorage.
 */

const SUPPORTED_LANGS = ['en', 'bg', 'de', 'fr', 'es', 'it'];
const DEFAULT_LANG = 'en';
const STORAGE_KEY = 'projecthub-lang';

/** Base path to locale files — works both locally and on Netlify */
const LOCALE_BASE = '/locales/';

let currentLang = DEFAULT_LANG;
let translations = {};

/**
 * Detect the best locale base path (handles Vite dev server and subdirectory deploys)
 */
function getLocaleUrl(lang) {
  return `${LOCALE_BASE}${lang}.json`;
}

/**
 * Load a locale JSON file
 * @param {string} lang
 * @returns {Promise<Object>}
 */
async function loadLocale(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) lang = DEFAULT_LANG;
  try {
    const res = await fetch(getLocaleUrl(lang));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`[i18n] Failed to load locale "${lang}", falling back to "${DEFAULT_LANG}".`, err);
    if (lang !== DEFAULT_LANG) {
      const res = await fetch(getLocaleUrl(DEFAULT_LANG));
      return await res.json();
    }
    return {};
  }
}

/**
 * Apply loaded translations to the DOM.
 * Elements with data-i18n="key" get their textContent replaced.
 * Elements with data-i18n-html="key" get innerHTML replaced (for rich content).
 * Elements with data-i18n-placeholder="key" get their placeholder replaced.
 * Elements with data-i18n-title="key" get their title attribute replaced.
 */
function applyTranslations() {
  // Text content
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[key] !== undefined) {
      el.textContent = translations[key];
    }
  });

  // HTML content
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    if (translations[key] !== undefined) {
      el.innerHTML = translations[key];
    }
  });

  // Placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (translations[key] !== undefined) {
      el.placeholder = translations[key];
    }
  });

  // Title attributes
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (translations[key] !== undefined) {
      el.title = translations[key];
    }
  });

  // Update <html lang="...">
  document.documentElement.lang = currentLang;
}

/**
 * Update the language switcher UI to show the active language
 * @param {string} lang
 */
function updateDropdown(lang) {
  const display = document.getElementById('currentLanguage');
  if (display) display.textContent = lang.toUpperCase();

  // Mark active item
  document.querySelectorAll('[data-lang]').forEach(item => {
    item.classList.toggle('active', item.getAttribute('data-lang') === lang);
  });
}

/**
 * Switch the active language
 * @param {string} lang
 */
export async function setLanguage(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) lang = DEFAULT_LANG;
  currentLang = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  translations = await loadLocale(lang);
  applyTranslations();
  updateDropdown(lang);
}

/**
 * Get a translated string by key
 * @param {string} key
 * @param {string} [fallback]
 * @returns {string}
 */
export function t(key, fallback = '') {
  return translations[key] ?? fallback;
}

/**
 * Get the currently active language code
 * @returns {string}
 */
export function getCurrentLanguage() {
  return currentLang;
}

/**
 * Initialize i18n:
 * 1. Read saved language from localStorage (or browser preference)
 * 2. Load translations
 * 3. Apply to DOM
 * 4. Wire up language dropdown click handlers
 */
export async function initI18n() {
  // Determine language: localStorage → browser lang → default
  const saved = localStorage.getItem(STORAGE_KEY);
  const browserLang = navigator.language?.split('-')[0];
  const lang = SUPPORTED_LANGS.includes(saved)
    ? saved
    : SUPPORTED_LANGS.includes(browserLang)
    ? browserLang
    : DEFAULT_LANG;

  currentLang = lang;
  translations = await loadLocale(lang);
  applyTranslations();
  updateDropdown(lang);

  // Wire dropdown items
  document.querySelectorAll('[data-lang]').forEach(item => {
    item.addEventListener('click', async e => {
      e.preventDefault();
      await setLanguage(item.getAttribute('data-lang'));
    });
  });
}
