/**
 * Settings Page Module
 * Handles all user settings and preferences
 */

import { getCurrentUser } from './auth.js';
import { isDemoMode, demoServices } from '../utils/demoMode.js';
import { showSuccess, showError, showLoading, hideLoading, confirm as showConfirm } from '../utils/ui.js';
import { supabase } from '../services/supabase.js';

// ==================== STATE VARIABLES ====================

let currentUser = null;
let userSettings = {
  // General
  language: 'en',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '24h',
  timezone: 'auto',
  firstDayOfWeek: 'monday',
  defaultProjectView: 'grid',
  defaultSortOrder: 'newest',
  itemsPerPage: 20,
  
  // Appearance
  theme: 'light',
  colorScheme: 'default',
  compactMode: false,
  showAvatars: true,
  animateTransitions: true,
  fontSize: 'medium',
  
  // Notifications
  emailNotifications: {
    projectShared: true,
    taskAssigned: true,
    taskDeadline: true,
    projectStatus: true,
    mentions: true,
    weeklySummary: true
  },
  emailDigest: 'immediate',
  desktopNotifications: true,
  notificationSound: true,
  notificationBadge: true,
  quietHours: {
    enabled: false,
    from: '22:00',
    to: '08:00'
  },
  
  // Privacy
  profileVisibility: 'contacts',
  showEmail: false,
  showActivityStatus: true,
  defaultProjectVisibility: 'private',
  allowPublicSearch: true,
  twoFactorEnabled: false
};

// ==================== MAIN FUNCTIONS ====================

/**
 * Initialize settings page
 */
async function initSettingsPage() {
  try {
    // Check authentication
    currentUser = await getCurrentUser();
    
    if (!currentUser) {
      window.location.href = 'login.html';
      return;
    }

    // Load settings
    await loadUserSettings();
    
    // Populate forms
    populateSettingsForms();
    
    // Setup navigation
    setupSidebarNavigation();
    
    // Setup event listeners
    setupEventListeners();
    
    // Apply current theme
    applyTheme(userSettings.theme);
    applyColorScheme(userSettings.colorScheme);
    
    // Show demo banner if needed
    if (isDemoMode()) {
      showDemoBanner();
    }
  } catch (error) {
    console.error('Error initializing settings:', error);
    showError('Failed to load settings. Please refresh the page.');
  }
}

/**
 * Show demo mode banner
 */
function showDemoBanner() {
  const banner = document.getElementById('demoBanner');
  if (banner) {
    banner.style.display = 'block';
  }
}

/**
 * Load user settings from storage
 */
async function loadUserSettings() {
  try {
    let savedSettings = null;
    
    if (isDemoMode()) {
      // Load from localStorage in demo mode
      const stored = localStorage.getItem('demoSettings');
      if (stored) {
        savedSettings = JSON.parse(stored);
      }
    } else {
      // Load from Supabase
      const { data, error } = await supabase
        .from('profiles')
        .select('settings')
        .eq('id', currentUser.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      savedSettings = data?.settings;
    }
    
    // Merge with defaults
    if (savedSettings) {
      userSettings = { ...userSettings, ...savedSettings };
      // Deep merge for nested objects
      if (savedSettings.emailNotifications) {
        userSettings.emailNotifications = { ...userSettings.emailNotifications, ...savedSettings.emailNotifications };
      }
      if (savedSettings.quietHours) {
        userSettings.quietHours = { ...userSettings.quietHours, ...savedSettings.quietHours };
      }
    }
    
    return userSettings;
  } catch (error) {
    console.error('Error loading settings:', error);
    return userSettings;
  }
}

/**
 * Populate all settings forms with current values
 */
function populateSettingsForms() {
  try {
    // General Settings
    document.getElementById('language').value = userSettings.language || 'en';
    document.getElementById('timezone').value = userSettings.timezone || 'auto';
    
    // Date format
    const dateFormats = { 'MM/DD/YYYY': 'dateUS', 'DD/MM/YYYY': 'dateEU', 'YYYY-MM-DD': 'dateISO' };
    const dateFormatId = dateFormats[userSettings.dateFormat] || 'dateEU';
    document.getElementById(dateFormatId).checked = true;
    
    // Time format
    const timeFormat = userSettings.timeFormat === '12h' ? 'time12' : 'time24';
    document.getElementById(timeFormat).checked = true;
    
    // First day of week
    const firstDay = userSettings.firstDayOfWeek === 'sunday' ? 'sunday' : 'monday';
    document.getElementById(firstDay).checked = true;
    
    // Default view
    const view = userSettings.defaultProjectView === 'list' ? 'viewList' : 'viewGrid';
    document.getElementById(view).checked = true;
    
    // Sort order
    document.getElementById('defaultSort').value = userSettings.defaultSortOrder || 'newest';
    document.getElementById('itemsPerPage').value = userSettings.itemsPerPage || 20;
    
    // Notifications
    document.getElementById('emailProjectShared').checked = userSettings.emailNotifications?.projectShared !== false;
    document.getElementById('emailTaskAssigned').checked = userSettings.emailNotifications?.taskAssigned !== false;
    document.getElementById('emailTaskDeadline').checked = userSettings.emailNotifications?.taskDeadline !== false;
    document.getElementById('emailProjectStatus').checked = userSettings.emailNotifications?.projectStatus || false;
    document.getElementById('emailMentions').checked = userSettings.emailNotifications?.mentions !== false;
    document.getElementById('emailWeeklySummary').checked = userSettings.emailNotifications?.weeklySummary || false;
    
    // Email digest
    const digest = userSettings.emailDigest || 'immediate';
    document.getElementById(`digest${digest.charAt(0).toUpperCase() + digest.slice(1)}`).checked = true;
    
    // In-app notifications
    document.getElementById('desktopNotifications').checked = userSettings.desktopNotifications !== false;
    document.getElementById('notificationSound').checked = userSettings.notificationSound || false;
    document.getElementById('notificationBadge').checked = userSettings.notificationBadge !== false;
    
    // Quiet hours
    document.getElementById('quietHoursEnabled').checked = userSettings.quietHours?.enabled || false;
    document.getElementById('quietHoursFrom').value = userSettings.quietHours?.from || '22:00';
    document.getElementById('quietHoursTo').value = userSettings.quietHours?.to || '08:00';
    toggleQuietHoursSettings();
    
    // Appearance - Theme
    const theme = userSettings.theme || 'light';
    document.getElementById(`theme${theme.charAt(0).toUpperCase() + theme.slice(1)}`).checked = true;
    highlightThemeCard(theme);
    
    // Color scheme
    const colorScheme = userSettings.colorScheme || 'default';
    document.getElementById(`color${colorScheme.charAt(0).toUpperCase() + colorScheme.slice(1)}`).checked = true;
    highlightColorCard(colorScheme);
    
    // Display options
    document.getElementById('compactMode').checked = userSettings.compactMode || false;
    document.getElementById('showAvatars').checked = userSettings.showAvatars !== false;
    document.getElementById('animateTransitions').checked = userSettings.animateTransitions !== false;
    
    // Font size
    const fontSizeMap = { 'small': 1, 'medium': 2, 'large': 3 };
    const fontSizeValue = fontSizeMap[userSettings.fontSize] || 2;
    document.getElementById('fontSize').value = fontSizeValue;
    
    // Privacy
    const visibility = userSettings.profileVisibility || 'contacts';
    document.getElementById(`visibility${visibility.charAt(0).toUpperCase() + visibility.slice(1)}`).checked = true;
    
    document.getElementById('showEmail').checked = userSettings.showEmail || false;
    document.getElementById('showActivityStatus').checked = userSettings.showActivityStatus !== false;
    
    const projectVis = userSettings.defaultProjectVisibility === 'public' ? 'projectPublic' : 'projectPrivate';
    document.getElementById(projectVis).checked = true;
    
    document.getElementById('allowFindProjects').checked = userSettings.allowPublicSearch !== false;
    
    // Storage
    calculateStorageUsage();
  } catch (error) {
    console.error('Error populating forms:', error);
  }
}

/**
 * Setup sidebar navigation
 */
function setupSidebarNavigation() {
  const navButtons = document.querySelectorAll('.settings-sidebar .nav-link');
  
  navButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      // Update active state
      navButtons.forEach(b => b.classList.remove('active'));
      button.classList.add('active');
    });
  });
}

/**
 * Handle general settings save
 */
async function handleGeneralSettingsSave() {
  try {
    showLoading();
    
    // Get values
    userSettings.language = document.getElementById('language').value;
    userSettings.timezone = document.getElementById('timezone').value;
    
    // Date format
    const dateFormat = document.querySelector('input[name="dateFormat"]:checked');
    userSettings.dateFormat = dateFormat ? dateFormat.value : 'DD/MM/YYYY';
    
    // Time format
    const timeFormat = document.querySelector('input[name="timeFormat"]:checked');
    userSettings.timeFormat = timeFormat ? timeFormat.value : '24h';
    
    // First day of week
    const firstDay = document.querySelector('input[name="firstDay"]:checked');
    userSettings.firstDayOfWeek = firstDay ? firstDay.value : 'monday';
    
    // Default view
    const view = document.querySelector('input[name="defaultView"]:checked');
    userSettings.defaultProjectView = view ? view.value : 'grid';
    
    userSettings.defaultSortOrder = document.getElementById('defaultSort').value;
    userSettings.itemsPerPage = parseInt(document.getElementById('itemsPerPage').value);
    
    // Save settings
    await saveSettings();
    
    hideLoading();
    showSuccess('General settings saved successfully!');
  } catch (error) {
    console.error('Error saving general settings:', error);
    hideLoading();
    showError('Failed to save settings');
  }
}

/**
 * Handle notification settings save
 */
async function handleNotificationSettingsSave() {
  try {
    showLoading();
    
    // Email notifications
    userSettings.emailNotifications = {
      projectShared: document.getElementById('emailProjectShared').checked,
      taskAssigned: document.getElementById('emailTaskAssigned').checked,
      taskDeadline: document.getElementById('emailTaskDeadline').checked,
      projectStatus: document.getElementById('emailProjectStatus').checked,
      mentions: document.getElementById('emailMentions').checked,
      weeklySummary: document.getElementById('emailWeeklySummary').checked
    };
    
    // Email digest
    const digest = document.querySelector('input[name="emailDigest"]:checked');
    userSettings.emailDigest = digest ? digest.value : 'immediate';
    
    // In-app notifications
    userSettings.desktopNotifications = document.getElementById('desktopNotifications').checked;
    userSettings.notificationSound = document.getElementById('notificationSound').checked;
    userSettings.notificationBadge = document.getElementById('notificationBadge').checked;
    
    // Quiet hours
    userSettings.quietHours = {
      enabled: document.getElementById('quietHoursEnabled').checked,
      from: document.getElementById('quietHoursFrom').value,
      to: document.getElementById('quietHoursTo').value
    };
    
    // Request notification permission if enabled
    if (userSettings.desktopNotifications) {
      await requestNotificationPermission();
    }
    
    // Save settings
    await saveSettings();
    
    hideLoading();
    showSuccess('Notification settings saved successfully!');
  } catch (error) {
    console.error('Error saving notification settings:', error);
    hideLoading();
    showError('Failed to save settings');
  }
}

/**
 * Handle appearance settings change
 */
async function handleAppearanceChange() {
  try {
    showLoading();
    
    // Get theme
    const theme = document.querySelector('input[name="theme"]:checked');
    userSettings.theme = theme ? theme.value : 'light';
    
    // Get color scheme
    const colorScheme = document.querySelector('input[name="colorScheme"]:checked');
    userSettings.colorScheme = colorScheme ? colorScheme.value : 'default';
    
    // Display options
    userSettings.compactMode = document.getElementById('compactMode').checked;
    userSettings.showAvatars = document.getElementById('showAvatars').checked;
    userSettings.animateTransitions = document.getElementById('animateTransitions').checked;
    
    // Font size
    const fontSizeValue = parseInt(document.getElementById('fontSize').value);
    const fontSizeMap = { 1: 'small', 2: 'medium', 3: 'large' };
    userSettings.fontSize = fontSizeMap[fontSizeValue] || 'medium';
    
    // Apply changes immediately
    applyTheme(userSettings.theme);
    applyColorScheme(userSettings.colorScheme);
    applyCompactMode(userSettings.compactMode);
    applyFontSize(userSettings.fontSize);
    
    // Save settings
    await saveSettings();
    
    hideLoading();
    showSuccess('Appearance settings applied!');
  } catch (error) {
    console.error('Error saving appearance settings:', error);
    hideLoading();
    showError('Failed to save settings');
  }
}

/**
 * Apply theme
 */
function applyTheme(theme) {
  const body = document.body;
  
  if (theme === 'dark') {
    body.classList.add('dark-mode');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#212529');
  } else if (theme === 'light') {
    body.classList.remove('dark-mode');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#ffffff');
  } else if (theme === 'auto') {
    const isDark = detectSystemTheme() === 'dark';
    body.classList.toggle('dark-mode', isDark);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isDark ? '#212529' : '#ffffff');
  }
  
  // Save to localStorage
  localStorage.setItem('theme', theme);
}

/**
 * Apply color scheme
 */
function applyColorScheme(scheme) {
  const root = document.documentElement;
  
  const schemes = {
    default: {
      primary: '#0dcaf0',
      secondary: '#0d6efd',
      accent: '#198754'
    },
    professional: {
      primary: '#1e3a8a',
      secondary: '#64748b',
      accent: '#334155'
    },
    vibrant: {
      primary: '#8b5cf6',
      secondary: '#ec4899',
      accent: '#f59e0b'
    },
    nature: {
      primary: '#10b981',
      secondary: '#84cc16',
      accent: '#78716c'
    }
  };
  
  const colors = schemes[scheme] || schemes.default;
  
  root.style.setProperty('--primary-color', colors.primary);
  root.style.setProperty('--secondary-color', colors.secondary);
  root.style.setProperty('--accent-color', colors.accent);
  
  localStorage.setItem('colorScheme', scheme);
}

/**
 * Apply compact mode
 */
function applyCompactMode(enabled) {
  document.body.classList.toggle('compact-mode', enabled);
}

/**
 * Apply font size
 */
function applyFontSize(size) {
  const root = document.documentElement;
  const sizes = {
    small: '14px',
    medium: '16px',
    large: '18px'
  };
  
  root.style.setProperty('--base-font-size', sizes[size] || sizes.medium);
}

/**
 * Handle privacy settings save
 */
async function handlePrivacySettingsSave() {
  try {
    showLoading();
    
    // Profile visibility
    const visibility = document.querySelector('input[name="profileVisibility"]:checked');
    userSettings.profileVisibility = visibility ? visibility.value : 'contacts';
    
    userSettings.showEmail = document.getElementById('showEmail').checked;
    userSettings.showActivityStatus = document.getElementById('showActivityStatus').checked;
    
    // Project privacy
    const projectVis = document.querySelector('input[name="defaultProjectVisibility"]:checked');
    userSettings.defaultProjectVisibility = projectVis ? projectVis.value : 'private';
    
    userSettings.allowPublicSearch = document.getElementById('allowFindProjects').checked;
    
    // Save settings
    await saveSettings();
    
    hideLoading();
    showSuccess('Privacy settings saved successfully!');
  } catch (error) {
    console.error('Error saving privacy settings:', error);
    hideLoading();
    showError('Failed to save settings');
  }
}

/**
 * Show enable 2FA modal
 */
function showEnable2FAModal() {
  const modal = new bootstrap.Modal(document.getElementById('enable2FAModal'));
  modal.show();
  
  // Reset to step 1
  document.getElementById('2faStep1').style.display = 'block';
  document.getElementById('2faStep2').style.display = 'none';
  document.getElementById('2faStep3').style.display = 'none';
}

/**
 * Handle 2FA setup steps
 */
async function handleEnable2FA() {
  const step1 = document.getElementById('2faStep1');
  const step2 = document.getElementById('2faStep2');
  const step3 = document.getElementById('2faStep3');
  const nextBtn = document.getElementById('2faNextBtn');
  
  if (step1.style.display !== 'none') {
    // Move to step 2
    step1.style.display = 'none';
    step2.style.display = 'block';
    nextBtn.textContent = 'Verify';
  } else if (step2.style.display !== 'none') {
    // Verify code and move to step 3
    const code = document.getElementById('2faCode').value;
    if (code.length !== 6) {
      showError('Please enter a valid 6-digit code');
      return;
    }
    
    step2.style.display = 'none';
    step3.style.display = 'block';
    nextBtn.textContent = 'Complete Setup';
  } else {
    // Complete setup
    try {
      showLoading();
      
      userSettings.twoFactorEnabled = true;
      await saveSettings();
      
      hideLoading();
      bootstrap.Modal.getInstance(document.getElementById('enable2FAModal')).hide();
      showSuccess('Two-factor authentication enabled successfully!');
      
      // Update UI
      populateSettingsForms();
    } catch (error) {
      console.error('Error enabling 2FA:', error);
      hideLoading();
      showError('Failed to enable 2FA');
    }
  }
}

/**
 * Calculate storage usage
 */
async function calculateStorageUsage() {
  try {
    let usage = {
      total: 5000, // 5 GB in MB
      used: 0,
      projects: 0,
      files: 0,
      images: 0
    };
    
    if (isDemoMode()) {
      // Mock data for demo
      usage = {
        total: 5000,
        used: 245,
        projects: 50,
        files: 180,
        images: 15
      };
    } else {
      // Query Supabase Storage
      const { data, error } = await supabase.storage
        .from('project-files')
        .list(currentUser.id);
      
      if (!error && data) {
        data.forEach(file => {
          const sizeInMB = file.metadata?.size ? file.metadata.size / (1024 * 1024) : 0;
          usage.used += sizeInMB;
          
          if (file.metadata?.mimetype?.startsWith('image/')) {
            usage.images += sizeInMB;
          } else {
            usage.files += sizeInMB;
          }
        });
      }
    }
    
    displayStorageUsage(usage);
  } catch (error) {
    console.error('Error calculating storage:', error);
  }
}

/**
 * Display storage usage
 */
function displayStorageUsage(usage) {
  const percentage = Math.round((usage.used / usage.total) * 100);
  
  // Update progress bar
  const progressBar = document.querySelector('#data .progress-bar');
  if (progressBar) {
    progressBar.style.width = `${percentage}%`;
    progressBar.classList.toggle('bg-warning', percentage > 50);
    progressBar.classList.toggle('bg-danger', percentage > 80);
  }
  
  // Update text
  const usageText = document.querySelector('#data .progress').previousElementSibling;
  if (usageText) {
    usageText.querySelector('span:first-child').textContent = `Used: ${Math.round(usage.used)} MB / ${Math.round(usage.total / 1024)} GB`;
    usageText.querySelector('span:last-child').textContent = `${percentage}%`;
  }
  
  // Update breakdown
  const breakdown = document.querySelectorAll('.storage-item strong');
  if (breakdown.length >= 3) {
    breakdown[0].textContent = `${Math.round(usage.projects)} MB`;
    breakdown[1].textContent = `${Math.round(usage.files)} MB`;
    breakdown[2].textContent = `${Math.round(usage.images)} MB`;
  }
}

/**
 * Handle export data
 */
async function handleExportData() {
  try {
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('exportModal'));
    modal.show();
    
    // Reset UI
    document.getElementById('exportProgress').style.width = '0%';
    document.getElementById('exportStatus').textContent = 'Preparing export...';
    document.getElementById('exportComplete').style.display = 'none';
    document.getElementById('exportCloseBtn').disabled = true;
    
    // Simulate progress
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += 10;
      document.getElementById('exportProgress').style.width = `${progress}%`;
      
      if (progress === 30) {
        document.getElementById('exportStatus').textContent = 'Gathering projects...';
      } else if (progress === 60) {
        document.getElementById('exportStatus').textContent = 'Collecting tasks and files...';
      } else if (progress === 90) {
        document.getElementById('exportStatus').textContent = 'Creating archive...';
      }
      
      if (progress >= 100) {
        clearInterval(progressInterval);
        completeExport();
      }
    }, 300);
    
  } catch (error) {
    console.error('Error exporting data:', error);
    showError('Failed to export data');
    bootstrap.Modal.getInstance(document.getElementById('exportModal')).hide();
  }
}

/**
 * Complete export
 */
async function completeExport() {
  try {
    let exportData = {};
    
    if (isDemoMode()) {
      // Export demo data
      exportData = {
        user: currentUser,
        settings: userSettings,
        projects: await demoServices.projects.getAll(currentUser.id),
        tasks: await demoServices.tasks.getAll(currentUser.id),
        contacts: await demoServices.contacts.getAll(currentUser.id),
        activity: await demoServices.activity.getByUser(currentUser.id),
        exportDate: new Date().toISOString()
      };
    } else {
      // Export real data from Supabase
      const { data: projects } = await supabase.from('projects').select('*').eq('user_id', currentUser.id);
      const { data: tasks } = await supabase.from('tasks').select('*');
      const { data: contacts } = await supabase.from('contacts').select('*').eq('user_id', currentUser.id);
      
      exportData = {
        user: currentUser,
        settings: userSettings,
        projects: projects || [],
        tasks: tasks || [],
        contacts: contacts || [],
        exportDate: new Date().toISOString()
      };
    }
    
    // Create download
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.getElementById('downloadExportBtn');
    link.href = url;
    link.download = `projecthub-export-${new Date().toISOString().split('T')[0]}.json`;
    
    // Show complete
    document.getElementById('exportProgress').style.width = '100%';
    document.getElementById('exportStatus').textContent = 'Export complete!';
    document.getElementById('exportComplete').style.display = 'block';
    document.getElementById('exportCloseBtn').disabled = false;
    
  } catch (error) {
    console.error('Error completing export:', error);
    showError('Failed to create export file');
  }
}

/**
 * Handle import data
 */
async function handleImportData(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  try {
    showLoading();
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        
        // Validate structure
        if (!data.projects && !data.tasks) {
          throw new Error('Invalid import file format');
        }
        
        // Confirm import
        const confirmed = await showConfirm(
          `Import ${data.projects?.length || 0} projects and ${data.tasks?.length || 0} tasks?`
        );
        
        if (!confirmed) {
          hideLoading();
          return;
        }
        
        // Import data (in demo mode, just simulate)
        if (isDemoMode()) {
          showSuccess('Data imported successfully! (Demo mode - not persisted)');
        } else {
          // Import to Supabase
          if (data.projects?.length) {
            await supabase.from('projects').insert(data.projects.map(p => ({
              ...p,
              user_id: currentUser.id,
              id: undefined
            })));
          }
          
          showSuccess('Data imported successfully!');
        }
        
        hideLoading();
        
        // Clear file input
        event.target.value = '';
      } catch (error) {
        console.error('Error parsing import file:', error);
        hideLoading();
        showError('Invalid file format or corrupted data');
      }
    };
    
    reader.readAsText(file);
  } catch (error) {
    console.error('Error importing data:', error);
    hideLoading();
    showError('Failed to import data');
  }
}

/**
 * Handle delete all data
 */
async function handleDeleteAllData() {
  // Validation handled by modal input
  const input = document.getElementById('confirmDeleteDataInput');
  if (input.value !== 'DELETE') {
    showError('Please type DELETE to confirm');
    return;
  }
  
  try {
    showLoading();
    
    if (isDemoMode()) {
      // Clear demo data
      localStorage.removeItem('demoProjects');
      localStorage.removeItem('demoTasks');
      localStorage.removeItem('demoContacts');
      showSuccess('All data deleted');
    } else {
      // Delete from Supabase (cascade will handle related data)
      await supabase.from('projects').delete().eq('user_id', currentUser.id);
      await supabase.from('contacts').delete().eq('user_id', currentUser.id);
      showSuccess('All data deleted successfully');
    }
    
    hideLoading();
    bootstrap.Modal.getInstance(document.getElementById('confirmDeleteDataModal')).hide();
    
    // Redirect to dashboard
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1500);
  } catch (error) {
    console.error('Error deleting data:', error);
    hideLoading();
    showError('Failed to delete data');
  }
}

/**
 * Handle delete account
 */
async function handleDeleteAccount() {
  const input = document.getElementById('confirmDeleteAccountInput');
  if (input.value !== 'DELETE MY ACCOUNT') {
    showError('Please type DELETE MY ACCOUNT to confirm');
    return;
  }
  
  try {
    showLoading();
    
    if (isDemoMode()) {
      showError('Cannot delete account in demo mode');
      hideLoading();
      return;
    }
    
    // Delete all data first
    await supabase.from('projects').delete().eq('user_id', currentUser.id);
    await supabase.from('contacts').delete().eq('user_id', currentUser.id);
    await supabase.from('profiles').delete().eq('id', currentUser.id);
    
    // Delete auth user
    await supabase.auth.admin.deleteUser(currentUser.id);
    
    hideLoading();
    showSuccess('Account deleted successfully');
    
    // Logout and redirect
    setTimeout(() => {
      localStorage.clear();
      window.location.href = '../index.html';
    }, 1500);
  } catch (error) {
    console.error('Error deleting account:', error);
    hideLoading();
    showError('Failed to delete account');
  }
}

/**
 * Save settings to storage
 */
async function saveSettings() {
  try {
    if (isDemoMode()) {
      // Save to localStorage
      localStorage.setItem('demoSettings', JSON.stringify(userSettings));
    } else {
      // Save to Supabase
      const { error } = await supabase
        .from('profiles')
        .update({
          settings: userSettings,
          settings_updated_at: new Date().toISOString()
        })
        .eq('id', currentUser.id);
      
      if (error) throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    throw error;
  }
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
  // General settings
  document.getElementById('saveLanguageSettings')?.addEventListener('click', handleGeneralSettingsSave);
  document.getElementById('saveViewSettings')?.addEventListener('click', handleGeneralSettingsSave);
  
  // Notifications
  document.getElementById('saveNotificationSettings')?.addEventListener('click', handleNotificationSettingsSave);
  document.getElementById('quietHoursEnabled')?.addEventListener('change', toggleQuietHoursSettings);
  
  // Appearance
  document.getElementById('saveAppearanceSettings')?.addEventListener('click', handleAppearanceChange);
  
  // Theme cards - click to select
  document.querySelectorAll('.theme-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      card.querySelector('input[type="radio"]').checked = true;
    });
  });
  
  // Color cards - click to select
  document.querySelectorAll('.color-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.color-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      card.querySelector('input[type="radio"]').checked = true;
    });
  });
  
  // Font size slider - live update
  document.getElementById('fontSize')?.addEventListener('input', (e) => {
    const sizeMap = { 1: 'small', 2: 'medium', 3: 'large' };
    applyFontSize(sizeMap[e.target.value]);
  });
  
  // Privacy
  document.getElementById('savePrivacySettings')?.addEventListener('click', handlePrivacySettingsSave);
  
  // 2FA
  document.querySelector('[data-bs-target="#enable2FAModal"]')?.addEventListener('click', showEnable2FAModal);
  document.getElementById('2faNextBtn')?.addEventListener('click', handleEnable2FA);
  
  // Change password
  document.getElementById('changePasswordBtn')?.addEventListener('click', () => {
    const modal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
    modal.show();
  });
  
  // Data & Storage
  document.getElementById('exportDataBtn')?.addEventListener('click', handleExportData);
  document.getElementById('importFile')?.addEventListener('change', handleImportData);
  
  // Delete confirmations - enable buttons when input matches
  document.getElementById('confirmDeleteDataInput')?.addEventListener('input', (e) => {
    document.getElementById('confirmDeleteDataBtn').disabled = e.target.value !== 'DELETE';
  });
  
  document.getElementById('confirmDeleteAccountInput')?.addEventListener('input', (e) => {
    document.getElementById('confirmDeleteAccountBtn').disabled = e.target.value !== 'DELETE MY ACCOUNT';
  });
  
  document.getElementById('confirmDeleteDataBtn')?.addEventListener('click', handleDeleteAllData);
  document.getElementById('confirmDeleteAccountBtn')?.addEventListener('click', handleDeleteAccount);
  
  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    if (isDemoMode()) {
      localStorage.removeItem('demoSession');
      window.location.href = '../index.html';
    } else {
      await supabase.auth.signOut();
      window.location.href = 'login.html';
    }
  });
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Toggle quiet hours settings visibility
 */
function toggleQuietHoursSettings() {
  const enabled = document.getElementById('quietHoursEnabled').checked;
  const settings = document.getElementById('quietHoursSettings');
  settings.style.display = enabled ? 'block' : 'none';
}

/**
 * Highlight selected theme card
 */
function highlightThemeCard(theme) {
  document.querySelectorAll('.theme-card').forEach(card => {
    const radio = card.querySelector('input[type="radio"]');
    if (radio && radio.value === theme) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });
}

/**
 * Highlight selected color card
 */
function highlightColorCard(scheme) {
  document.querySelectorAll('.color-card').forEach(card => {
    const radio = card.querySelector('input[type="radio"]');
    if (radio && radio.value === scheme) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });
}

/**
 * Request notification permission
 */
async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  return false;
}

/**
 * Detect system theme preference
 */
function detectSystemTheme() {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Show toast notification
 */
function showToast(title, message, type = 'success') {
  const toast = document.getElementById('messageToast');
  const toastTitle = document.getElementById('toastTitle');
  const toastMessage = document.getElementById('toastMessage');
  const toastIcon = document.getElementById('toastIcon');

  toastTitle.textContent = title;
  toastMessage.textContent = message;

  if (type === 'error') {
    toastIcon.className = 'bi bi-x-circle-fill text-danger me-2';
  } else {
    toastIcon.className = 'bi bi-check-circle-fill text-success me-2';
  }

  const bsToast = new bootstrap.Toast(toast);
  bsToast.show();
}

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', initSettingsPage);
