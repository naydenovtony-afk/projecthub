/**
 * Activity Feed Widget Component
 * Displays recent project activities and updates
 */
import { isDemoMode, demoServices } from '../../utils/demoMode.js';
import { getCurrentUser } from '../auth.js';
import { getAllProjects } from '../../services/projectService.js';
import { formatDate, getRelativeTime } from '../../utils/helpers.js';
import supabase from '../../services/supabase.js';

export class ActivityFeedWidget {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            maxActivities: 10,
            showHeader: true,
            showViewAllButton: false,
            ...options
        };
        this.isDemo = isDemoMode();
        this.currentUser = null;
    }

    /**
     * Initialize the activity feed widget
     */
    async initialize() {
        try {
            if (this.isDemo) {
                this.currentUser = await demoServices.auth.getCurrentUser();
            } else {
                // Read from cache set by dashboard-modular.js before widgets were initialized
                try { this.currentUser = JSON.parse(localStorage.getItem('auth_user') || localStorage.getItem('user')); } catch(e) {}
                if (!this.currentUser) this.currentUser = getCurrentUser();
            }
            
            await this.render();
        } catch (error) {
            console.error('ActivityFeedWidget initialization error:', error);
            this.renderError();
        }
    }

    /**
     * Render the activity feed widget
     */
    async render() {
        if (!this.container) return;

        // Show loading state
        this.renderLoading();

        try {
            // Load activity data
            const activities = await this.loadActivities();
            
            // Render activities
            this.renderActivities(activities);
        } catch (error) {
            console.error('Failed to load activity feed:', error);
            this.renderError();
        }
    }

    /**
     * Render loading state
     */
    renderLoading() {
        this.container.innerHTML = `
            ${this.options.showHeader ? `
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="mb-0">Recent Activity</h5>
                    ${this.options.showViewAllButton ? `
                        <a href="./notifications.html${this.isDemo ? '?demo=true' : ''}" class="btn btn-sm btn-outline-primary">
                            View All <i class="bi bi-arrow-right ms-1"></i>
                        </a>
                    ` : ''}
                </div>
            ` : ''}
            
            <div class="activity-feed">
                ${Array(5).fill(0).map(() => `
                    <div class="activity-item">
                        <div class="activity-icon">
                            <div class="skeleton" style="width: 32px; height: 32px; border-radius: 50%;"></div>
                        </div>
                        <div class="activity-content">
                            <div class="skeleton" style="width: 80%; height: 1rem; margin-bottom: 0.5rem;"></div>
                            <div class="skeleton" style="width: 60%; height: 0.875rem; margin-bottom: 0.25rem;"></div>
                            <div class="skeleton" style="width: 40%; height: 0.75rem;"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Load activities data
     */
    async loadActivities() {
        let activities;
        
        if (this.isDemo) {
            activities = await demoServices.activity.getByUser(this.currentUser.id);
        } else {
            activities = await this.fetchRealActivity();
        }
        
        // Sort by created_at descending, take top activities
        return activities
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, this.options.maxActivities);
    }

    /**
     * Fetch real activity from Supabase
     */
    async fetchRealActivity() {
        const projects = await getAllProjects(this.currentUser.id);
        const projectIds = projects.map(p => p.id);
        
        if (projectIds.length === 0) return [];
        
        const { data } = await supabase
            .from('project_updates')
            .select('*')
            .in('project_id', projectIds)
            .order('created_at', { ascending: false })
            .limit(this.options.maxActivities);
        
        return data || [];
    }

    /**
     * Render activities
     */
    renderActivities(activities) {
        if (activities.length === 0) {
            this.renderEmpty();
            return;
        }

        this.container.innerHTML = `
            ${this.options.showHeader ? `
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="mb-0">Recent Activity</h5>
                    ${this.options.showViewAllButton ? `
                        <a href="./notifications.html${this.isDemo ? '?demo=true' : ''}" class="btn btn-sm btn-outline-primary">
                            View All <i class="bi bi-arrow-right ms-1"></i>
                        </a>
                    ` : ''}
                </div>
            ` : ''}
            
            <div class="activity-feed">
                ${activities.map(activity => this.renderActivityItem(activity)).join('')}
            </div>
        `;
    }

    /**
     * Render a single activity item
     */
    renderActivityItem(activity) {
        const icon = this.getActivityIcon(activity.activity_type);
        const iconClass = `bi ${icon}`;
        
        return `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="${iconClass}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-text">
                        <strong>${this.escapeHtml(activity.user_name || this.currentUser.email)}</strong>
                        ${this.getActivityText(activity)}
                    </div>
                    <div class="activity-meta">
                        <span class="activity-project">
                            <i class="bi bi-folder me-1"></i>
                            ${this.escapeHtml(activity.project_title || 'Unknown Project')}
                        </span>
                        <span class="activity-time">
                            <i class="bi bi-clock me-1"></i>
                            ${getRelativeTime(activity.created_at)}
                        </span>
                    </div>
                    ${activity.description ? `
                        <div class="activity-description">
                            ${this.escapeHtml(activity.description)}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Get activity icon based on type
     */
    getActivityIcon(type) {
        const icons = {
            'task_completed': 'check-circle-fill text-success',
            'task_created': 'plus-circle text-primary',
            'task_updated': 'arrow-repeat text-info',
            'file_uploaded': 'file-earmark-arrow-up text-warning',
            'project_updated': 'pencil-square text-primary',
            'milestone': 'flag-fill text-success',
            'comment': 'chat-dots text-info',
            'project_created': 'folder-plus text-success'
        };
        return icons[type] || 'circle text-secondary';
    }

    /**
     * Get activity text based on type
     */
    getActivityText(activity) {
        const texts = {
            'task_completed': 'completed a task',
            'task_created': 'created a new task',
            'task_updated': 'updated a task',
            'file_uploaded': 'uploaded a file',
            'project_updated': 'updated the project',
            'milestone': 'reached a milestone',
            'comment': 'added a comment',
            'project_created': 'created the project'
        };
        return texts[activity.activity_type] || 'performed an action';
    }

    /**
     * Render empty state
     */
    renderEmpty() {
        this.container.innerHTML = `
            ${this.options.showHeader ? `
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="mb-0">Recent Activity</h5>
                </div>
            ` : ''}
            
            <div class="empty-state-container">
                <div class="empty-state-illustration">
                    <svg width="180" height="180" viewBox="0 0 180 180" fill="none">
                        <circle cx="90" cy="90" r="70" fill="var(--primary-color)" opacity="0.1"/>
                        <circle cx="90" cy="90" r="40" stroke="var(--primary-color)" stroke-width="3" opacity="0.3"/>
                        <path d="M90 50 L90 90 L120 90" stroke="var(--primary-color)" stroke-width="3" stroke-linecap="round"/>
                        <circle cx="90" cy="90" r="5" fill="var(--primary-color)"/>
                    </svg>
                </div>
                <h3 class="empty-state-title">No Recent Activity</h3>
                <p class="empty-state-description">
                    Your activity will appear here as you work on projects.
                </p>
            </div>
        `;
    }

    /**
     * Render error state
     */
    renderError() {
        this.container.innerHTML = `
            ${this.options.showHeader ? `
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="mb-0">Recent Activity</h5>
                </div>
            ` : ''}
            
            <div class="alert alert-warning d-flex align-items-center" role="alert">
                <i class="bi bi-exclamation-triangle me-2"></i>
                <div>
                    Failed to load recent activity. 
                    <button class="btn btn-link p-0 ms-1" onclick="window.location.reload()">
                        Try again
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Refresh activity data
     */
    async refresh() {
        await this.render();
    }

    /**
     * Add a new activity item (for real-time updates)
     */
    addActivity(activity) {
        const activityFeed = this.container.querySelector('.activity-feed');
        if (!activityFeed) return;

        const newItem = document.createElement('div');
        newItem.innerHTML = this.renderActivityItem(activity);
        
        // Add to top of feed
        activityFeed.insertBefore(newItem.firstElementChild, activityFeed.firstElementChild);
        
        // Remove last item if over limit
        const items = activityFeed.querySelectorAll('.activity-item');
        if (items.length > this.options.maxActivities) {
            items[items.length - 1].remove();
        }
    }

    /**
     * Utility: Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}