/**
 * Theme Management - Dark Mode Support
 * Handles theme switching and persistence
 */

// Theme constants
const THEME_KEY = 'projecthub-theme';
const THEME_DARK = 'dark';
const THEME_LIGHT = 'light';

/**
 * Get current theme from localStorage
 * @returns {string} Current theme (light or dark)
 */
export function getCurrentTheme() {
  return localStorage.getItem(THEME_KEY) || THEME_LIGHT;
}

/**
 * Set theme and apply to document
 * @param {string} theme - Theme to set (light or dark)
 */
export function setTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
}

/**
 * Apply theme to document
 * @param {string} theme - Theme to apply
 */
function applyTheme(theme) {
  if (theme === THEME_DARK) {
    document.documentElement.setAttribute('data-bs-theme', 'dark');
    document.documentElement.classList.add('dark-mode');
    document.body.classList.add('dark-mode');
  } else {
    document.documentElement.setAttribute('data-bs-theme', 'light');
    document.documentElement.classList.remove('dark-mode');
    document.body.classList.remove('dark-mode');
  }
  
  // Update toggle buttons
  updateThemeToggles(theme);
}

/**
 * Toggle between light and dark theme
 * @returns {string} New theme
 */
export function toggleTheme() {
  const currentTheme = getCurrentTheme();
  const newTheme = currentTheme === THEME_DARK ? THEME_LIGHT : THEME_DARK;
  setTheme(newTheme);
  return newTheme;
}

/**
 * Update theme toggle button icons
 * @param {string} theme - Current theme
 */
function updateThemeToggles(theme) {
  const toggles = document.querySelectorAll('[data-theme-toggle]');
  toggles.forEach(toggle => {
    const icon = toggle.querySelector('i');
    if (icon) {
      icon.className = theme === THEME_DARK ? 'bi bi-sun-fill' : 'bi bi-moon-fill';
    }
  });
}

/**
 * Initialize theme system
 */
export function initTheme() {
  const savedTheme = getCurrentTheme();
  applyTheme(savedTheme);
  
  // Setup toggle buttons
  const toggles = document.querySelectorAll('[data-theme-toggle]');
  toggles.forEach(toggle => {
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      toggleTheme();
    });
  });
}

// Auto-initialize on page load
if (typeof document !== 'undefined') {
  // Apply theme immediately to prevent flash
  const savedTheme = localStorage.getItem(THEME_KEY) || THEME_LIGHT;
  if (savedTheme === THEME_DARK) {
    document.documentElement.setAttribute('data-bs-theme', 'dark');
    document.documentElement.classList.add('dark-mode');
    if (document.body) document.body.classList.add('dark-mode');
  }
  
  // Initialize properly when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme);
  } else {
    initTheme();
  }
}
