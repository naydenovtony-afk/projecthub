/**
 * Stats Widget Component
 * Displays dashboard statistics cards with loading states
 */
import { isDemoMode, demoServices } from '../../utils/demoMode.js';
import { getCurrentUser } from '../auth.js';
import { getAllProjects } from '../../services/projectService.js';
import supabase from '../../services/supabase.js';

export class StatsWidget {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.isDemo = isDemoMode();
        this.currentUser = null;
    }

    /**
     * Initialize the stats widget
     */
    async initialize() {
        try {
            if (this.isDemo) {
                this.currentUser = await demoServices.auth.getCurrentUser();
            } else {
                this.currentUser = await getCurrentUser();
            }
            
            await this.render();
        } catch (error) {
            console.error('StatsWidget initialization error:', error);
            this.renderError();
        }
    }

    /**
     * Render the stats widget
     */
    async render() {
        if (!this.container) return;

        // Show loading state
        this.renderLoading();

        try {
            // Load stats data
            const stats = await this.loadStats();
            
            // Render stats cards
            this.renderStats(stats);
        } catch (error) {
            console.error('Failed to load stats:', error);
            this.renderError();
        }
    }

    /**
     * Render loading state
     */
    renderLoading() {
        this.container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h5 class="mb-0">Overview</h5>
                <button class="btn btn-sm btn-outline-secondary" id="refreshStats">
                    <i class="bi bi-arrow-clockwise"></i> Refresh
                </button>
            </div>
            
            <div class="row g-4">
                ${Array(4).fill(0).map(() => `
                    <div class="col-6 col-md-6 col-lg-3">
                        <div class="card stat-card shadow-sm">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-start">
                                    <div style="flex: 1;">
                                        <div class="skeleton" style="width: 60%; height: 1rem; margin-bottom: 0.5rem;"></div>
                                        <div class="skeleton" style="width: 80px; height: 2.5rem; margin-bottom: 0.5rem;"></div>
                                        <div class="skeleton" style="width: 120px; height: 1rem;"></div>
                                    </div>
                                    <div class="stat-icon">
                                        <div class="skeleton" style="width: 48px; height: 48px; border-radius: 50%;"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Load stats data
     */
    async loadStats() {
        if (this.isDemo) {
            return await demoServices.stats.getDashboard(this.currentUser.id);
        } else {
            return await this.fetchRealStats();
        }
    }

    /**
     * Fetch real stats from Supabase
     */
    async fetchRealStats() {
        const projects = await getAllProjects(this.currentUser.id);
        let totalTasks = 0;
        let completedTasks = 0;
        
        for (const project of projects) {
            const { data: tasks } = await supabase
                .from('tasks')
                .select('id, status')
                .eq('project_id', project.id);
            
            if (tasks) {
                totalTasks += tasks.length;
                completedTasks += tasks.filter(t => t.status === 'done').length;
            }
        }
        
        return {
            totalProjects: projects.length,
            activeProjects: projects.filter(p => p.status === 'active').length,
            totalTasks,
            completedTasks,
            completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
            totalFiles: 0 // Placeholder for files count
        };
    }

    /**
     * Render stats cards
     */
    renderStats(stats) {
        this.container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h5 class="mb-0">Overview</h5>
                <button class="btn btn-sm btn-outline-secondary" id="refreshStats">
                    <i class="bi bi-arrow-clockwise"></i> Refresh
                </button>
            </div>
            
            <div class="row g-4">
                <!-- Total Projects Card -->
                <div class="col-6 col-md-6 col-lg-3">
                    <div class="card stat-card shadow-sm">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <p class="text-muted mb-2 small">Total Projects</p>
                                    <div class="stat-value">${stats.totalProjects}</div>
                                    <small class="text-muted">All projects</small>
                                </div>
                                <div class="stat-icon">
                                    <i class="bi bi-graph-up"></i>
                                </div>
                            </div>
                            <a href="./projects.html${this.isDemo ? '?demo=true' : ''}" class="btn btn-link btn-sm p-0 mt-3">View all →</a>
                        </div>
                    </div>
                </div>

                <!-- Active Tasks Card -->
                <div class="col-6 col-md-6 col-lg-3">
                    <div class="card stat-card shadow-sm">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <p class="text-muted mb-2 small">Active Tasks</p>
                                    <div class="stat-value">${stats.totalTasks || 0}</div>
                                    <small class="text-muted">In progress</small>
                                </div>
                                <div class="stat-icon">
                                    <i class="bi bi-check-circle"></i>
                                </div>
                            </div>
                            <a href="./tasks.html${this.isDemo ? '?demo=true' : ''}" class="btn btn-link btn-sm p-0 mt-3">View tasks →</a>
                        </div>
                    </div>
                </div>

                <!-- Completion Rate Card -->
                <div class="col-6 col-md-6 col-lg-3">
                    <div class="card stat-card shadow-sm">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <p class="text-muted mb-2 small">Completion Rate</p>
                                    <div class="stat-value">${stats.completionRate}%</div>
                                    <small class="text-muted">Overall progress</small>
                                </div>
                                <div class="stat-icon">
                                    <i class="bi bi-pie-chart"></i>
                                </div>
                            </div>
                            <a href="./projects.html${this.isDemo ? '?demo=true' : ''}" class="btn btn-link btn-sm p-0 mt-3">View progress →</a>
                        </div>
                    </div>
                </div>

                <!-- Total Files Card -->
                <div class="col-6 col-md-6 col-lg-3">
                    <div class="card stat-card shadow-sm">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <p class="text-muted mb-2 small">Total Files</p>
                                    <div class="stat-value">${stats.totalFiles || 0}</div>
                                    <small class="text-muted">Uploaded</small>
                                </div>
                                <div class="stat-icon">
                                    <i class="bi bi-folder-check"></i>
                                </div>
                            </div>
                            <a href="./files.html${this.isDemo ? '?demo=true' : ''}" class="btn btn-link btn-sm p-0 mt-3">View files →</a>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Setup refresh button
        const refreshBtn = this.container.querySelector('#refreshStats');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refresh());
        }
    }

    /**
     * Render error state
     */
    renderError() {
        this.container.innerHTML = `
            <div class="alert alert-warning d-flex align-items-center" role="alert">
                <i class="bi bi-exclamation-triangle me-2"></i>
                <div>
                    Failed to load dashboard stats. 
                    <button class="btn btn-link p-0 ms-1" onclick="window.location.reload()">
                        Try again
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Refresh stats data
     */
    async refresh() {
        await this.render();
    }

    /**
     * Update a specific stat value
     */
    updateStat(statKey, value) {
        const statElement = this.container.querySelector(`[data-stat="${statKey}"]`);
        if (statElement) {
            statElement.textContent = value;
        }
    }
}