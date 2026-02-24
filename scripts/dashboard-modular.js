/**
 * Dashboard Page Controller - Modular Version
 * Coordinates all dashboard widgets and manages page state
 */
import { isDemoMode, demoServices } from '../utils/demoMode.js';
import { getCurrentUser, checkAuth, logout } from './auth.js';
import { showError, showSuccess } from '../utils/uiModular.js';
import { NavBar } from './components/NavBar.js';
import { StatsWidget } from './components/StatsWidget.js';
import { RecentProjectsWidget } from './components/RecentProjectsWidget.js';
import { ActivityFeedWidget } from './components/ActivityFeedWidget.js';
import { ChartsWidget } from './components/ChartsWidget.js';

let currentUser = null;
let isDemo = false;

// Widget instances
let navBar = null;
let statsWidget = null;
let recentProjectsWidget = null;
let activityFeedWidget = null;
let chartsWidget = null;

/**
 * Initialize dashboard page
 */
async function initDashboard() {
    try {
        // Check if demo mode
        isDemo = isDemoMode();
        
        if (isDemo) {
            console.log('🎭 Running dashboard in DEMO MODE');
            currentUser = await demoServices.auth.getCurrentUser();
            showDemoBadge();
        } else {
            // Use checkAuth() to validate the real Supabase session,
            // not just the localStorage cache (which may be stale for new users)
            currentUser = await checkAuth();
            if (!currentUser) {
                // checkAuth() already redirects to login if no session
                return;
            }
        }

        // Initialize navigation
        await initNavigation();
        
        // Initialize all dashboard widgets
        await Promise.all([
            initStatsWidget(),
            initRecentProjectsWidget(),
            initActivityFeedWidget(),
            initChartsWidget()
        ]);
        
        // Setup event listeners
        setupEventListeners();
        
        console.log('✅ Dashboard initialized successfully');
        
    } catch (error) {
        console.error('Dashboard initialization error:', error);
        showError('Failed to initialize dashboard');
    }
}

/**
 * Initialize navigation bar
 */
async function initNavigation() {
    navBar = new NavBar('navbar-container', {
        currentPage: 'dashboard',
        user: currentUser,
        showSearch: true,
        showNotifications: true,
        showUserMenu: true
    });
    
    await navBar.render();
}

/**
 * Initialize stats widget
 */
async function initStatsWidget() {
    statsWidget = new StatsWidget('statsSection');
    await statsWidget.initialize();
}

/**
 * Initialize recent projects widget
 */
async function initRecentProjectsWidget() {
    recentProjectsWidget = new RecentProjectsWidget('recentProjectsSection', {
        maxProjects: 6,
        showHeader: true,
        showViewAllButton: true
    });
    await recentProjectsWidget.initialize();
}

/**
 * Initialize activity feed widget
 */
async function initActivityFeedWidget() {
    activityFeedWidget = new ActivityFeedWidget('activityFeedSection', {
        maxActivities: 10,
        showHeader: true,
        showViewAllButton: false
    });
    await activityFeedWidget.initialize();
}

/**
 * Initialize charts widget
 */
async function initChartsWidget() {
    chartsWidget = new ChartsWidget('chartsSection', {
        showHeader: true,
        charts: ['projectTypes', 'projectStatus', 'taskTrend', 'progressOverview']
    });
    await chartsWidget.initialize();
}

/**
 * Show demo mode badge
 */
function showDemoBadge() {
    // Check if demo badge already exists
    if (document.getElementById('demoBadge')) return;
    
    const badge = document.createElement('div');
    badge.id = 'demoBadge';
    badge.className = 'alert alert-info alert-dismissible fade show demo-badge';
    badge.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1050;
        min-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    badge.innerHTML = `
        <i class="bi bi-info-circle me-2"></i>
        <strong>Demo Mode</strong> - You're exploring with sample data.
        <a href="../pages/register.html" class="alert-link ms-2 fw-bold">Create Real Account</a>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(badge);
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Global refresh button
    const globalRefreshBtn = document.getElementById('globalRefresh');
    if (globalRefreshBtn) {
        globalRefreshBtn.addEventListener('click', handleGlobalRefresh);
    }

    // Stats refresh button
    document.addEventListener('click', (e) => {
        if (e.target.id === 'refreshStats') {
            statsWidget?.refresh();
        }
    });

    // Handle window resize for charts
    window.addEventListener('resize', debounce(() => {
        chartsWidget?.refresh();
    }, 300));

    // Handle theme changes
    document.addEventListener('themeChanged', () => {
        // Refresh charts when theme changes to update colors
        setTimeout(() => {
            chartsWidget?.refresh();
        }, 100);
    });
}

/**
 * Handle global dashboard refresh
 */
async function handleGlobalRefresh() {
    try {
        const refreshBtn = document.getElementById('globalRefresh');
        if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise spin"></i> Refreshing...';
        }

        // Refresh all widgets
        await Promise.all([
            statsWidget?.refresh(),
            recentProjectsWidget?.refresh(),
            activityFeedWidget?.refresh(),
            chartsWidget?.refresh()
        ]);

        showSuccess('Dashboard refreshed successfully');
        
    } catch (error) {
        console.error('Failed to refresh dashboard:', error);
        showError('Failed to refresh dashboard');
    } finally {
        const refreshBtn = document.getElementById('globalRefresh');
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Refresh';
        }
    }
}

/**
 * Handle widget errors
 */
function handleWidgetError(widgetName, error) {
    console.error(`${widgetName} error:`, error);
    showError(`Failed to load ${widgetName.toLowerCase()}`);
}

/**
 * Refresh specific widget
 */
async function refreshWidget(widgetName) {
    try {
        switch (widgetName) {
            case 'stats':
                await statsWidget?.refresh();
                break;
            case 'projects':
                await recentProjectsWidget?.refresh();
                break;
            case 'activity':
                await activityFeedWidget?.refresh();
                break;
            case 'charts':
                await chartsWidget?.refresh();
                break;
            default:
                console.warn('Unknown widget:', widgetName);
        }
    } catch (error) {
        handleWidgetError(widgetName, error);
    }
}

/**
 * Utility: Debounce function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Cleanup function for page unload
 */
function cleanup() {
    // Destroy chart instances
    chartsWidget?.destroy();
    
    // Clear any intervals or timeouts
    // (Add any cleanup logic here)
}

// Public API for external access
window.dashboardController = {
    refreshWidget,
    handleGlobalRefresh,
    getCurrentUser: () => currentUser,
    getWidgetInstance: (name) => {
        const widgets = {
            stats: statsWidget,
            projects: recentProjectsWidget,
            activity: activityFeedWidget,
            charts: chartsWidget,
            navbar: navBar
        };
        return widgets[name];
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initDashboard);

// Cleanup on page unload
window.addEventListener('beforeunload', cleanup);

// Export for module usage
export {
    initDashboard,
    refreshWidget,
    handleGlobalRefresh,
    currentUser,
    isDemo
};