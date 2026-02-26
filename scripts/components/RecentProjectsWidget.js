/**
 * Recent Projects Widget Component
 * Displays recent projects in card format with loading states
 */
import { isDemoMode, demoServices } from '../../utils/demoMode.js';
import { getCurrentUser } from '../auth.js';
import { getAllProjects } from '../../services/projectService.js';
import { getRelativeTime } from '../../utils/helpers.js';
import { showError } from '../../utils/uiModular.js';

export class RecentProjectsWidget {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            maxProjects: 5,
            showHeader: true,
            showViewAllButton: true,
            ...options
        };
        this.isDemo = isDemoMode();
        this.currentUser = null;
    }

    /**
     * Initialize the recent projects widget
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
            console.error('RecentProjectsWidget initialization error:', error);
            this.renderError();
        }
    }

    /**
     * Render the recent projects widget
     */
    async render() {
        if (!this.container) return;

        // Show loading state
        this.renderLoading();

        try {
            // Load projects data
            const projects = await this.loadProjects();
            
            // Render projects
            this.renderProjects(projects);
        } catch (error) {
            console.error('Failed to load recent projects:', error);
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
                    <h5 class="mb-0">Recent Projects</h5>
                    ${this.options.showViewAllButton ? `
                        <a href="./projects.html${this.isDemo ? '?demo=true' : ''}" class="btn btn-sm btn-outline-primary">
                            View All <i class="bi bi-arrow-right ms-1"></i>
                        </a>
                    ` : ''}
                </div>
            ` : ''}
            
            <div class="row">
                ${Array(3).fill(0).map(() => `
                    <div class="col-lg-4 col-md-6 mb-4">
                        <div class="card">
                            <div class="skeleton" style="height: 180px; border-radius: 16px 16px 0 0;"></div>
                            <div class="card-body">
                                <div class="skeleton" style="width: 80%; height: 1.5rem; margin-bottom: 0.75rem;"></div>
                                <div class="skeleton" style="width: 100%; height: 1rem; margin-bottom: 0.5rem;"></div>
                                <div class="skeleton" style="width: 60%; height: 1rem; margin-bottom: 1rem;"></div>
                                <div class="skeleton" style="width: 100%; height: 8px; border-radius: 4px;"></div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Load projects data
     */
    async loadProjects() {
        let projects;
        
        if (this.isDemo) {
            projects = await demoServices.projects.getAll(this.currentUser.id);
        } else {
            try {
                const timeout = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('timeout')), 6000)
                );
                projects = await Promise.race([getAllProjects(this.currentUser?.id), timeout]);
            } catch (err) {
                console.warn('RecentProjectsWidget: data fetch failed or timed out.', err.message);
                projects = [];
            }
        }
        
        // Sort by updated_at, take top projects
        return (projects || [])
            .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
            .slice(0, this.options.maxProjects);
    }

    /**
     * Render projects
     */
    renderProjects(projects) {
        if (projects.length === 0) {
            this.renderEmpty();
            return;
        }

        this.container.innerHTML = `
            ${this.options.showHeader ? `
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="mb-0">Recent Projects</h5>
                    ${this.options.showViewAllButton ? `
                        <a href="./projects.html${this.isDemo ? '?demo=true' : ''}" class="btn btn-sm btn-outline-primary">
                            View All <i class="bi bi-arrow-right ms-1"></i>
                        </a>
                    ` : ''}
                </div>
            ` : ''}
            
            <div class="row">
                ${projects.map(project => this.renderProjectCard(project)).join('')}
            </div>
        `;
    }

    /**
     * Render a single project card
     */
    renderProjectCard(project) {
        const statusColors = {
            'planning': 'secondary',
            'active': 'success', 
            'completed': 'primary',
            'paused': 'warning',
            'archived': 'dark'
        };

        const statusColor = statusColors[project.status] || 'secondary';
        const progress = project.progress_percentage || 0;

        return `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="project-card" onclick="window.location.href='./project-details.html?id=${project.id}${this.isDemo ? '&demo=true' : ''}'">
                    <div class="project-cover" style="background: linear-gradient(135deg, #20b2aa 0%, #4169e1 100%);">
                        <span class="project-cover-icon">
                            <i class="bi bi-kanban-fill"></i>
                        </span>
                    </div>
                    <div class="project-badges">
                        <span class="badge bg-${statusColor}">${this.capitalizeFirst(project.status)}</span>
                    </div>
                    <div class="project-body">
                        <h5 class="project-title">${this.escapeHtml(project.title)}</h5>
                        <p class="project-description">${this.escapeHtml(project.description || 'No description')}</p>
                        <div class="project-meta">
                            <span class="project-meta-item">
                                <i class="bi bi-tag"></i>
                                ${this.formatProjectType(project.project_type)}
                            </span>
                            <span class="project-meta-item">
                                <i class="bi bi-clock"></i>
                                ${getRelativeTime(project.updated_at)}
                            </span>
                        </div>
                        <div class="project-progress">
                            <div class="project-progress-label">
                                <span>Progress</span>
                                <span class="project-progress-value">${progress}%</span>
                            </div>
                            <div class="progress">
                                <div class="progress-bar" style="width: ${progress}%"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render empty state
     */
    renderEmpty() {
        this.container.innerHTML = `
            ${this.options.showHeader ? `
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="mb-0">Recent Projects</h5>
                </div>
            ` : ''}
            
            <div class="empty-state-container">
                <div class="empty-state-illustration">
                    <svg width="240" height="240" viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="120" cy="120" r="100" fill="var(--primary-color)" opacity="0.1"/>
                        <path d="M60 90 L80 90 L90 80 L180 80 L180 160 L60 160 Z" 
                              fill="var(--primary-color)" opacity="0.3"/>
                        <circle cx="100" cy="120" r="15" fill="var(--primary-color)" opacity="0.5"/>
                        <circle cx="140" cy="120" r="15" fill="var(--primary-color)" opacity="0.5"/>
                    </svg>
                </div>
                <h3 class="empty-state-title">No Projects Yet</h3>
                <p class="empty-state-description">Create your first project to get started</p>
                <a href="./project-form.html${this.isDemo ? '?demo=true' : ''}" class="btn btn-primary">
                    <i class="bi bi-plus-circle me-2"></i>Create Project
                </a>
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
                    <h5 class="mb-0">Recent Projects</h5>
                </div>
            ` : ''}
            
            <div class="alert alert-warning d-flex align-items-center" role="alert">
                <i class="bi bi-exclamation-triangle me-2"></i>
                <div>
                    Failed to load recent projects. 
                    <button class="btn btn-link p-0 ms-1" onclick="window.location.reload()">
                        Try again
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Refresh projects data
     */
    async refresh() {
        await this.render();
    }

    /**
     * Utility: Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Utility: Capitalize first letter
     */
    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Utility: Format project type for display
     */
    formatProjectType(type) {
        const typeMap = {
            'academic': 'Academic & Research',
            'corporate': 'Corporate/Business',
            'eu_funded': 'EU-Funded Project',
            'public': 'Public Initiative',
            'personal': 'Personal/Other'
        };
        return typeMap[type] || type;
    }
}