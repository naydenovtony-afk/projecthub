/**
 * Dashboard Page Controller - Modular Version
 * Coordinates all dashboard widgets and manages page state
 */
import { isDemoMode, enableDemoMode, disableDemoMode, demoServices, DEMO_USER } from '../utils/demoMode.js';
import { getCurrentUser, checkAuthStatus, logout } from './auth.js';
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
        console.log('🚀 STARTING DASHBOARD');

        // Step 1: Check for explicit demo param in URL
        const urlParams = new URLSearchParams(window.location.search);
        const demoFromUrl = urlParams.get('demo') === 'true';

        // Step 2: Resolve the current user from Supabase localStorage token (fast, no network needed)
        // We read the token directly instead of calling getSession() which may hang on proxy issues.
        let realUser = null;
        try {
            const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
            if (sbKey) {
                const parsed = JSON.parse(localStorage.getItem(sbKey));
                realUser = parsed?.currentSession?.user || parsed?.session?.user || parsed?.user || null;
            }
        } catch(e) {
            console.warn('Could not read Supabase token from localStorage:', e);
        }

        const isDemoEmail = realUser?.email === 'demo@projecthub.com';

        // Step 3: Decide demo vs real mode
        if (demoFromUrl || isDemoEmail) {
            // Explicitly demo: URL param or logged-in as the demo account
            isDemo = true;
            enableDemoMode();
            currentUser = await demoServices.auth.getCurrentUser();
            currentUser = currentUser || { ...DEMO_USER };

        } else if (realUser) {
            // A real (non-demo) authenticated user
            isDemo = false;
            disableDemoMode(); // Clear any stale demo flag from localStorage

            // Use the cached normalized profile set during login, falling back to auth data
            const cached = (() => {
                try { return JSON.parse(localStorage.getItem('auth_user') || localStorage.getItem('user')); } catch { return null; }
            })();

            currentUser = cached || {
                id: realUser.id,
                email: realUser.email,
                full_name: realUser.user_metadata?.full_name || realUser.email.split('@')[0],
                role: realUser.app_metadata?.role || realUser.user_metadata?.role || 'user'
            };

            // Ensure the user is cached so widgets that call getCurrentUser() independently work correctly
            if (!cached) {
                localStorage.setItem('auth_user', JSON.stringify(currentUser));
                localStorage.setItem('user', JSON.stringify(currentUser));
            }

        } else {
            // No active session at all → redirect to login
            disableDemoMode();
            console.warn('No session found, redirecting to login.');
            window.location.href = './login.html';
            return;
        }

        console.log('✅ User resolved:', currentUser.email, '| Demo mode:', isDemo);

        // Safety net: real admin users should not be on the dashboard
        if (currentUser.role === 'admin' && !isDemo) {
            console.warn('🔴 Admin user on dashboard - redirecting to admin.html');
            window.location.replace('./admin.html');
            return;
        }

        // Show demo badge only for demo sessions
        if (isDemo) {
            showDemoBadge();
        }

        // Initialize navigation
        await initNavigation();

        // Initialize widgets safely (errors in one widget won't crash the others)
        await initWidgetsSafely();

        // Setup event listeners
        setupEventListeners();

        console.log('✅ Dashboard fully loaded!');

    } catch (error) {
        console.error('❌ Dashboard error:', error);
        showEmergencyDashboard();
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
 * Initialize all widgets safely - errors in one won't stop the others
 */
async function initWidgetsSafely() {
    const widgets = [
        { name: 'Stats',     fn: () => initStatsWidget() },
        { name: 'Projects',  fn: () => initRecentProjectsWidget() },
        { name: 'Activity',  fn: () => initActivityFeedWidget() },
        { name: 'Charts',    fn: () => initChartsWidget() }
    ];

    for (const widget of widgets) {
        try {
            console.log(`📊 Loading ${widget.name} widget...`);
            await widget.fn();
            console.log(`✅ ${widget.name} widget loaded`);
        } catch (error) {
            console.error(`❌ ${widget.name} widget failed:`, error);
            // Continue loading remaining widgets
        }
    }
}

/**
 * Emergency dashboard fallback when normal initialization fails
 */
function showEmergencyDashboard() {
    const container = document.querySelector('.container-fluid') || document.body;
    container.innerHTML = `
        <div class="row justify-content-center mt-5">
            <div class="col-md-8">
                <div class="card shadow">
                    <div class="card-body text-center p-5">
                        <h2>🚨 Emergency Dashboard</h2>
                        <p class="lead">Auth system bypassed - you're in emergency mode!</p>
                        <div class="row mt-4 g-3">
                            <div class="col-md-3">
                                <div class="card bg-primary text-white">
                                    <div class="card-body">
                                        <h4>5</h4><p class="mb-0">Projects</p>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="card bg-success text-white">
                                    <div class="card-body">
                                        <h4>12</h4><p class="mb-0">Tasks</p>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="card bg-warning text-white">
                                    <div class="card-body">
                                        <h4>85%</h4><p class="mb-0">Complete</p>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="card bg-info text-white">
                                    <div class="card-body">
                                        <h4>23</h4><p class="mb-0">Files</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="mt-4">
                            <a href="./projects.html?demo=true" class="btn btn-primary me-2">📁 View Projects</a>
                            <a href="./tasks.html?demo=true" class="btn btn-success me-2">✅ View Tasks</a>
                            <button class="btn btn-warning" onclick="window.location.reload()">🔄 Reload</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
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

// NOTE: initDashboard is called from the inline <script type="module"> in dashboard.html
// Do NOT add a second DOMContentLoaded listener here to avoid running it twice.

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