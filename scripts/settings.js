/**
 * Settings Page Script
 * Handles user preferences, appearance, notifications, privacy, and account settings
 */

import { isDemoMode, demoServices } from '../utils/demoMode.js';
import { getCurrentUser } from './auth.js';
import { showError, showSuccess, confirm } from '../utils/ui.js';
import { getCurrentTheme, setTheme } from './theme.js';
import { formatDate } from '../utils/helpers.js';

let currentUser = null;
let isDemo = false;
let settings = {};

// Default settings
const DEFAULT_SETTINGS = {
  theme: 'light',
  fontSize: 'medium',
  compactMode: false,
  emailTaskAssigned: true,
  emailProjectUpdates: true,
  emailComments: true,
  emailWeeklySummary: false,
  pushEnabled: false,
  profileVisibility: 'team',
  showOnlineStatus: true,
  language: 'en',
  timezone: 'Europe/Sofia'
};

/**
 * Initialize settings page
 */
export async function initSettingsPage() {
  try {
    // Check demo mode
    isDemo = isDemoMode();
    
    if (isDemo) {
      currentUser = await demoServices.auth.getCurrentUser();
      showDemoBadge();
    } else {
      currentUser = await getCurrentUser();
      if (!currentUser) {
        window.location.href = './login.html';
        return;
      }
    }
    
    // Update navbar
    updateNavbar();
    
    // Load settings
    loadSettings();
    
    // Setup event listeners
    setupEventListeners();
    
  } catch (error) {
    console.error('Settings page init error:', error);
    showError('Failed to load settings');
  }
}

/**
 * Show demo mode badge
 */
function showDemoBadge() {
  const badge = document.createElement('div');
  badge.className = 'alert alert-info alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
  badge.style.zIndex = '9999';
  badge.innerHTML = `
    <i class="bi bi-info-circle me-2"></i>
    <strong>Demo Mode:</strong> Settings changes are temporary.
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  document.body.appendChild(badge);
}

/**
 * Update navbar with user info
 */
function updateNavbar() {
  document.getElementById('navUserName').textContent = currentUser.full_name;
  document.getElementById('navUserEmail').textContent = currentUser.email;
  
  const navAvatar = document.getElementById('navUserAvatar');
  if (currentUser.avatar_url) {
    navAvatar.innerHTML = `<img src="${currentUser.avatar_url}" alt="Avatar" class="rounded-circle" width="40" height="40">`;
  } else {
    const initials = currentUser.full_name.split(' ').map(n => n[0]).join('').toUpperCase();
    navAvatar.innerHTML = initials;
  }
}

/**
 * Load settings from localStorage or use defaults
 */
function loadSettings() {
  // Load from localStorage or use defaults
  const saved = localStorage.getItem('userSettings');
  settings = saved ? JSON.parse(saved) : { ...DEFAULT_SETTINGS };
  
  // Apply theme
  const currentTheme = getCurrentTheme();
  settings.theme = currentTheme;
  
  // Apply settings to UI
  applySettingsToUI();
  
  // Load account info
  loadAccountInfo();
}

/**
 * Apply settings to UI elements
 */
function applySettingsToUI() {
  // Theme selection
  document.querySelectorAll('.theme-option').forEach(option => {
    option.classList.toggle('active', option.dataset.theme === settings.theme);
  });
  
  // Font size
  document.getElementById('fontSizeSelect').value = settings.fontSize;
  applyFontSize(settings.fontSize);
  
  // Compact mode
  document.getElementById('compactModeSwitch').checked = settings.compactMode;
  applyCompactMode(settings.compactMode);
  
  // Email notifications
  document.getElementById('emailTaskAssigned').checked = settings.emailTaskAssigned;
  document.getElementById('emailProjectUpdates').checked = settings.emailProjectUpdates;
  document.getElementById('emailComments').checked = settings.emailComments;
  document.getElementById('emailWeeklySummary').checked = settings.emailWeeklySummary;
  
  // Push notifications
  document.getElementById('pushEnabled').checked = settings.pushEnabled;
  
  // Privacy
  document.getElementById('profileVisibility').value = settings.profileVisibility;
  document.getElementById('showOnlineStatus').checked = settings.showOnlineStatus;
  
  // Language & timezone
  document.getElementById('languageSelect').value = settings.language;
  document.getElementById('timezoneSelect').value = settings.timezone;
}

/**
 * Load account information
 */
function loadAccountInfo() {
  document.getElementById('accountEmail').value = currentUser.email;
  document.getElementById('accountType').value = currentUser.role === 'admin' ? 'Admin' : 'Free';
  document.getElementById('memberSince').value = formatDate(currentUser.created_at);
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
  // Tab navigation
  document.querySelectorAll('[data-settings-tab]').forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab(tab.dataset.settingsTab);
    });
  });
  
  // Theme options
  document.querySelectorAll('.theme-option').forEach(option => {
    option.addEventListener('click', () => {
      const theme = option.dataset.theme;
      
      // Update UI
      document.querySelectorAll('.theme-option').forEach(opt => {
        opt.classList.remove('active');
      });
      option.classList.add('active');
      
      // Apply theme
      if (theme === 'auto') {
        // Auto theme - use system preference
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(systemPrefersDark ? 'dark' : 'light');
      } else {
        setTheme(theme);
      }
      
      settings.theme = theme;
    });
  });
  
  // Font size
  document.getElementById('fontSizeSelect').addEventListener('change', (e) => {
    settings.fontSize = e.target.value;
    applyFontSize(e.target.value);
  });
  
  // Compact mode
  document.getElementById('compactModeSwitch').addEventListener('change', (e) => {
    settings.compactMode = e.target.checked;
    applyCompactMode(e.target.checked);
  });
  
  // Save settings button
  document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
  
  // Reset settings button
  document.getElementById('resetSettingsBtn').addEventListener('click', resetSettings);
  
  // Change password button
  document.getElementById('changePasswordBtn').addEventListener('click', () => {
    showSuccess('Password change feature coming soon');
  });
  
  // Export data button
  document.getElementById('exportDataBtn').addEventListener('click', exportData);
  
  // Delete account button
  document.getElementById('deleteAccountBtn').addEventListener('click', deleteAccount);
}

/**
 * Switch between settings tabs
 */
function switchTab(tabName) {
  // Update sidebar
  document.querySelectorAll('[data-settings-tab]').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.settingsTab === tabName);
  });
  
  // Update panels
  document.querySelectorAll('.settings-panel').forEach(panel => {
    panel.style.display = 'none';
  });
  document.getElementById(`${tabName}-panel`).style.display = 'block';
}

/**
 * Apply font size setting
 */
function applyFontSize(size) {
  const root = document.documentElement;
  switch(size) {
    case 'small':
      root.style.fontSize = '14px';
      break;
    case 'large':
      root.style.fontSize = '18px';
      break;
    default:
      root.style.fontSize = '16px';
  }
}

/**
 * Apply compact mode setting
 */
function applyCompactMode(enabled) {
  document.body.classList.toggle('compact-mode', enabled);
}

/**
 * Save all settings to localStorage
 */
async function saveSettings() {
  try {
    // Collect all settings
    settings.emailTaskAssigned = document.getElementById('emailTaskAssigned').checked;
    settings.emailProjectUpdates = document.getElementById('emailProjectUpdates').checked;
    settings.emailComments = document.getElementById('emailComments').checked;
    settings.emailWeeklySummary = document.getElementById('emailWeeklySummary').checked;
    settings.pushEnabled = document.getElementById('pushEnabled').checked;
    settings.profileVisibility = document.getElementById('profileVisibility').value;
    settings.showOnlineStatus = document.getElementById('showOnlineStatus').checked;
    settings.language = document.getElementById('languageSelect').value;
    settings.timezone = document.getElementById('timezoneSelect').value;
    
    // Save to localStorage
    localStorage.setItem('userSettings', JSON.stringify(settings));
    
    // In real app, would save to database
    if (!isDemo) {
      // await saveToDatabase(settings);
    }
    
    showSuccess('Settings saved successfully');
    
  } catch (error) {
    console.error('Failed to save settings:', error);
    showError('Failed to save settings');
  }
}

/**
 * Reset all settings to defaults
 */
async function resetSettings() {
  const confirmed = await confirm(
    'Reset all settings?',
    'This will restore all settings to their default values.'
  );
  
  if (!confirmed) return;
  
  try {
    settings = { ...DEFAULT_SETTINGS };
    localStorage.setItem('userSettings', JSON.stringify(settings));
    
    // Reload page to apply defaults
    window.location.reload();
    
  } catch (error) {
    console.error('Failed to reset settings:', error);
    showError('Failed to reset settings');
  }
}

/**
 * Export user data as JSON file
 */
async function exportData() {
  try {
    showSuccess('Preparing data export... This may take a moment.');
    
    // Simulate export process
    setTimeout(() => {
      const data = {
        user: currentUser,
        settings: settings,
        exportDate: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `projecthub-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showSuccess('Data exported successfully');
    }, 1500);
    
  } catch (error) {
    console.error('Failed to export data:', error);
    showError('Failed to export data');
  }
}

/**
 * Delete user account with double confirmation
 */
async function deleteAccount() {
  const confirmed = await confirm(
    'Delete your account?',
    'This action cannot be undone. All your data will be permanently deleted.'
  );
  
  if (!confirmed) return;
  
  // Second confirmation
  const doubleConfirmed = await confirm(
    'Are you absolutely sure?',
    'Type DELETE to confirm account deletion.'
  );
  
  if (!doubleConfirmed) return;
  
  try {
    if (isDemo) {
      showSuccess('Demo account cannot be deleted');
      return;
    }
    
    // In real app, would delete account
    showSuccess('Account deletion initiated. You will receive a confirmation email.');
    
  } catch (error) {
    console.error('Failed to delete account:', error);
    showError('Failed to delete account');
  }
}

// Add settings-specific CSS
const style = document.createElement('style');
style.textContent = `
  .settings-panel {
    animation: fadeIn 0.3s ease;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .theme-option {
    cursor: pointer;
    border: 2px solid transparent;
    border-radius: 8px;
    padding: 8px;
    transition: all 0.2s ease;
  }
  
  .theme-option:hover {
    border-color: var(--primary-color);
  }
  
  .theme-option.active {
    border-color: var(--primary-color);
    background: rgba(32, 178, 170, 0.1);
  }
  
  .theme-preview {
    width: 100%;
    height: 120px;
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  
  .theme-preview-header {
    height: 30px;
    background: var(--primary-color);
  }
  
  .theme-preview-body {
    padding: 8px;
    display: flex;
    gap: 8px;
    height: 90px;
  }
  
  .theme-preview-card {
    flex: 1;
    background: #f0f0f0;
    border-radius: 4px;
  }
  
  .light-theme .theme-preview-body {
    background: white;
  }
  
  .dark-theme .theme-preview-body {
    background: #1a1d29;
  }
  
  .dark-theme .theme-preview-card {
    background: #2d3142;
  }
  
  .auto-theme .theme-preview-body {
    background: linear-gradient(90deg, white 50%, #1a1d29 50%);
  }
  
  .theme-option-label {
    text-align: center;
    font-weight: 500;
  }
  
  .list-group-item-action.active {
    background-color: var(--primary-color);
    border-color: var(--primary-color);
  }
  
  /* Compact mode styles */
  body.compact-mode .card {
    margin-bottom: 0.75rem;
  }
  
  body.compact-mode .card-body {
    padding: 1rem;
  }
  
  body.compact-mode .mb-4 {
    margin-bottom: 1rem !important;
  }
`;
document.head.appendChild(style);
