/**
 * Charts Widget Component
 * Displays analytics charts for projects and tasks
 */
import { isDemoMode, demoServices } from '../../utils/demoMode.js';
import { getCurrentUser } from '../auth.js';
import { getAllProjects } from '../../services/projectService.js';
import supabase from '../../services/supabase.js';

export class ChartsWidget {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            showHeader: true,
            charts: ['projectTypes', 'projectStatus', 'taskTrend', 'progressOverview'],
            ...options
        };
        this.isDemo = isDemoMode();
        this.currentUser = null;
        this.chartInstances = {};
    }

    /**
     * Initialize the charts widget
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
            console.error('ChartsWidget initialization error:', error);
            this.renderError();
        }
    }

    /**
     * Render the charts widget
     */
    async render() {
        if (!this.container) return;

        // Show loading state
        this.renderLoading();

        try {
            // Load chart data
            const data = await this.loadChartData();
            
            // Render charts
            this.renderCharts(data);
        } catch (error) {
            console.error('Failed to load charts:', error);
            this.renderError();
        }
    }

    /**
     * Render loading state
     */
    renderLoading() {
        this.container.innerHTML = `
            ${this.options.showHeader ? `
                <h5 class="mb-3">Analytics</h5>
            ` : ''}
            
            <div class="row">
                <!-- Chart 1: Projects by Type -->
                <div class="col-lg-6 mb-4">
                    <div class="card shadow-sm">
                        <div class="card-header bg-white">
                            <h5 class="card-title mb-0">
                                <i class="bi bi-pie-chart me-2"></i>Projects by Type
                            </h5>
                        </div>
                        <div class="card-body position-relative" style="min-height: 300px;">
                            <div class="chart-loading d-flex align-items-center justify-content-center h-100">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Loading chart...</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Chart 2: Project Status -->
                <div class="col-lg-6 mb-4">
                    <div class="card shadow-sm">
                        <div class="card-header bg-white">
                            <h5 class="card-title mb-0">
                                <i class="bi bi-bar-chart me-2"></i>Project Status
                            </h5>
                        </div>
                        <div class="card-body position-relative" style="min-height: 300px;">
                            <div class="chart-loading d-flex align-items-center justify-content-center h-100">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Loading chart...</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Chart 3: Task Completion Trend -->
                <div class="col-lg-6 mb-4">
                    <div class="card shadow-sm">
                        <div class="card-header bg-white">
                            <h5 class="card-title mb-0">
                                <i class="bi bi-graph-up me-2"></i>Task Completion Trend
                            </h5>
                        </div>
                        <div class="card-body position-relative" style="min-height: 300px;">
                            <div class="chart-loading d-flex align-items-center justify-content-center h-100">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Loading chart...</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Chart 4: Progress Overview -->
                <div class="col-lg-6 mb-4">
                    <div class="card shadow-sm">
                        <div class="card-header bg-white">
                            <h5 class="card-title mb-0">
                                <i class="bi bi-speedometer me-2"></i>Progress Overview
                            </h5>
                        </div>
                        <div class="card-body position-relative" style="min-height: 300px;">
                            <div class="chart-loading d-flex align-items-center justify-content-center h-100">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Loading chart...</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Load chart data
     */
    async loadChartData() {
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
                console.warn('ChartsWidget: data fetch failed or timed out.', err.message);
                projects = [];
            }
        }

        return { projects: projects || [] };
    }

    /**
     * Render charts
     */
    async renderCharts(data) {
        this.container.innerHTML = `
            ${this.options.showHeader ? `
                <h5 class="mb-3">Analytics</h5>
            ` : ''}
            
            <div class="row">
                <!-- Chart 1: Projects by Type -->
                <div class="col-lg-6 mb-4">
                    <div class="card shadow-sm">
                        <div class="card-header bg-white">
                            <h5 class="card-title mb-0">
                                <i class="bi bi-pie-chart me-2"></i>Projects by Type
                            </h5>
                        </div>
                        <div class="card-body" style="min-height: 300px;">
                            <canvas id="projectTypeChart"></canvas>
                        </div>
                    </div>
                </div>

                <!-- Chart 2: Project Status -->
                <div class="col-lg-6 mb-4">
                    <div class="card shadow-sm">
                        <div class="card-header bg-white">
                            <h5 class="card-title mb-0">
                                <i class="bi bi-bar-chart me-2"></i>Project Status
                            </h5>
                        </div>
                        <div class="card-body" style="min-height: 300px;">
                            <canvas id="projectStatusChart"></canvas>
                        </div>
                    </div>
                </div>

                <!-- Chart 3: Task Completion Trend -->
                <div class="col-lg-6 mb-4">
                    <div class="card shadow-sm">
                        <div class="card-header bg-white">
                            <h5 class="card-title mb-0">
                                <i class="bi bi-graph-up me-2"></i>Task Completion Trend
                            </h5>
                        </div>
                        <div class="card-body" style="min-height: 300px;">
                            <canvas id="taskTrendChart"></canvas>
                        </div>
                    </div>
                </div>

                <!-- Chart 4: Progress Overview -->
                <div class="col-lg-6 mb-4">
                    <div class="card shadow-sm">
                        <div class="card-header bg-white">
                            <h5 class="card-title mb-0">
                                <i class="bi bi-speedometer me-2"></i>Progress Overview
                            </h5>
                        </div>
                        <div class="card-body" style="min-height: 300px;">
                            <canvas id="progressChart"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Wait for DOM update, then render charts
        setTimeout(() => {
            this.renderProjectTypeChart(data.projects);
            this.renderProjectStatusChart(data.projects);
            this.renderTaskTrendChart();
            this.renderProgressChart(data.projects);
        }, 100);
    }

    /**
     * Render project type chart
     */
    renderProjectTypeChart(projects) {
        const ctx = document.getElementById('projectTypeChart');
        if (!ctx) return;

        // Destroy existing chart
        if (this.chartInstances.projectType) {
            this.chartInstances.projectType.destroy();
        }

        const typeCount = {};
        projects.forEach(project => {
            typeCount[project.project_type] = (typeCount[project.project_type] || 0) + 1;
        });

        const labels = Object.keys(typeCount).map(type => this.formatProjectType(type));
        const data = Object.values(typeCount);
        const colors = ['#20b2aa', '#4169e1', '#ff6b6b', '#4ecdc4', '#45b7d1'];

        this.chartInstances.projectType = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    /**
     * Render project status chart
     */
    renderProjectStatusChart(projects) {
        const ctx = document.getElementById('projectStatusChart');
        if (!ctx) return;

        // Destroy existing chart
        if (this.chartInstances.projectStatus) {
            this.chartInstances.projectStatus.destroy();
        }

        const statusCount = {};
        projects.forEach(project => {
            statusCount[project.status] = (statusCount[project.status] || 0) + 1;
        });

        const labels = Object.keys(statusCount).map(status => this.capitalizeFirst(status));
        const data = Object.values(statusCount);

        this.chartInstances.projectStatus = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Projects',
                    data,
                    backgroundColor: '#20b2aa',
                    borderRadius: 4,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    /**
     * Render task completion trend chart
     */
    renderTaskTrendChart() {
        const ctx = document.getElementById('taskTrendChart');
        if (!ctx) return;

        // Destroy existing chart
        if (this.chartInstances.taskTrend) {
            this.chartInstances.taskTrend.destroy();
        }

        // Generate sample data for last 7 days
        const labels = [];
        const completedData = [];
        const createdData = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
            completedData.push(Math.floor(Math.random() * 10) + 1);
            createdData.push(Math.floor(Math.random() * 8) + 2);
        }

        this.chartInstances.taskTrend = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Tasks Completed',
                    data: completedData,
                    borderColor: '#20b2aa',
                    backgroundColor: 'rgba(32, 178, 170, 0.1)',
                    fill: true,
                    tension: 0.4
                }, {
                    label: 'Tasks Created',
                    data: createdData,
                    borderColor: '#4169e1',
                    backgroundColor: 'rgba(65, 105, 225, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    /**
     * Render progress overview chart
     */
    renderProgressChart(projects) {
        const ctx = document.getElementById('progressChart');
        if (!ctx) return;

        // Destroy existing chart
        if (this.chartInstances.progress) {
            this.chartInstances.progress.destroy();
        }

        // Calculate average progress
        const totalProgress = projects.reduce((sum, p) => sum + (p.progress_percentage || 0), 0);
        const avgProgress = projects.length > 0 ? Math.round(totalProgress / projects.length) : 0;

        this.chartInstances.progress = new Chart(ctx, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [avgProgress, 100 - avgProgress],
                    backgroundColor: ['#20b2aa', '#e5e7eb'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        display: false
                    }
                }
            },
            plugins: [{
                beforeDraw: (chart) => {
                    const ctx = chart.ctx;
                    const width = chart.width;
                    const height = chart.height;
                    
                    ctx.save();
                    ctx.font = 'bold 24px Arial';
                    ctx.fillStyle = '#20b2aa';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(`${avgProgress}%`, width / 2, height / 2 - 10);
                    
                    ctx.font = '14px Arial';
                    ctx.fillStyle = '#6b7280';
                    ctx.fillText('Complete', width / 2, height / 2 + 15);
                    ctx.restore();
                }
            }]
        });
    }

    /**
     * Render error state
     */
    renderError() {
        this.container.innerHTML = `
            ${this.options.showHeader ? `
                <h5 class="mb-3">Analytics</h5>
            ` : ''}
            
            <div class="alert alert-warning d-flex align-items-center" role="alert">
                <i class="bi bi-exclamation-triangle me-2"></i>
                <div>
                    Failed to load analytics charts. 
                    <button class="btn btn-link p-0 ms-1" onclick="window.location.reload()">
                        Try again
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Refresh charts data
     */
    async refresh() {
        await this.render();
    }

    /**
     * Destroy all chart instances
     */
    destroy() {
        Object.values(this.chartInstances).forEach(chart => {
            if (chart) chart.destroy();
        });
        this.chartInstances = {};
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

    /**
     * Utility: Capitalize first letter
     */
    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}