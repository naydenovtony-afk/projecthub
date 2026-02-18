/**
 * Project Header Component
 * Manages hero section, metadata bar, and project info display
 */
import { formatDate } from '../../utils/helpers.js';

export class ProjectHeader {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.project = null;
  }

  /**
   * Update project header with project data
   * @param {Object} project - Project data
   */
  updateHeader(project) {
    this.project = project;
    
    // Update hero section
    this.updateHeroSection();
    this.updateMetadataBar();
    this.updateBreadcrumb();
  }

  updateHeroSection() {
    const { project } = this;
    
    const titleElement = document.getElementById('projectTitle');
    const typeElement = document.getElementById('projectType');
    const statusElement = document.getElementById('projectStatus');
    const heroSection = document.getElementById('projectCover');
    
    if (titleElement) titleElement.textContent = project.title || 'Untitled Project';
    if (typeElement) {
      typeElement.textContent = project.project_type || project.type || 'Unknown Type';
      typeElement.className = 'badge badge-primary';
    }
    if (statusElement) {
      statusElement.textContent = this.formatStatus(project.status);
      statusElement.className = `badge badge-status-${project.status}`;
    }
    
    // Update hero background
    if (heroSection && (project.cover_image_url || project.cover_image)) {
      heroSection.style.backgroundImage = `url(${project.cover_image_url || project.cover_image})`;
    }
  }

  updateMetadataBar() {
    const { project } = this;
    
    const startDateElement = document.getElementById('startDate');
    const endDateElement = document.getElementById('endDate');
    const budgetElement = document.getElementById('budget');
    const fundingSourceElement = document.getElementById('fundingSource');
    const progressElement = document.getElementById('overallProgress');
    const progressPercentageElement = document.getElementById('progressPercentage');
    
    if (startDateElement) {
      startDateElement.textContent = project.start_date 
        ? formatDate(project.start_date) 
        : '-';
    }
    
    if (endDateElement) {
      endDateElement.textContent = project.end_date 
        ? formatDate(project.end_date) 
        : '-';
    }
    
    if (budgetElement) {
      budgetElement.textContent = project.budget 
        ? `€${project.budget.toLocaleString()}` 
        : '-';
    }
    
    if (fundingSourceElement) {
      fundingSourceElement.textContent = project.funding_source || '-';
    }
    
    // Update progress bar (support both field naming conventions)
    const progress = project.progress_percentage ?? project.progress ?? 0;
    if (progressElement) {
      progressElement.style.width = `${progress}%`;
      progressElement.setAttribute('aria-valuenow', progress);
    }
    
    if (progressPercentageElement) {
      progressPercentageElement.textContent = `${progress}%`;
    }
  }

  updateBreadcrumb() {
    const breadcrumbElement = document.getElementById('breadcrumbTitle');
    if (breadcrumbElement && this.project) {
      breadcrumbElement.textContent = this.project.title;
    }
  }

  /**
   * Format status text for display
   * @param {string} status - Raw status value
   * @returns {string} Formatted status
   */
  formatStatus(status) {
    const statusMap = {
      'planning': 'Planning',
      'active': 'Active',
      'completed': 'Completed',
      'paused': 'Paused',
      'archived': 'Archived'
    };
    return statusMap[status] || status;
  }

  /**
   * Get Bootstrap badge class for status
   * @param {string} status - Project status
   * @returns {string} Bootstrap class
   */
  getStatusBadgeClass(status) {
    const classMap = {
      'planning': 'bg-secondary',
      'active': 'bg-primary',
      'completed': 'bg-success',
      'paused': 'bg-warning',
      'archived': 'bg-dark'
    };
    return classMap[status] || 'bg-secondary';
  }

  /**
   * Update project data
   * @param {Object} updates - Updated project data
   */
  updateProject(updates) {
    this.project = { ...this.project, ...updates };
    this.updateHeader(this.project);
  }
}