/**
 * Project Card Component
 * Reusable project card display with actions and status indicators
 */
import { formatDate, getRelativeTime } from '../../utils/helpers.js';
import { showError, showSuccess } from '../../utils/uiModular.js';

export class ProjectCard {
  constructor(project, options = {}) {
    this.project = project;
    this.options = {
      showActions: options.showActions !== false, // true by default
      showProgress: options.showProgress !== false,
      showTeam: options.showTeam !== false,
      showDates: options.showDates !== false,
      cardSize: options.cardSize || 'normal', // 'small', 'normal', 'large'
      onClick: options.onClick || null,
      onEdit: options.onEdit || null,
      onDelete: options.onDelete || null,
      onShare: options.onShare || null
    };
  }

  /**
   * Render the project card HTML
   * @returns {HTMLElement} Card element
   */
  render() {
    const card = document.createElement('div');
    card.className = this.getCardClasses();
    card.dataset.projectId = this.project.id;
    
    card.innerHTML = `
      <div class="card h-100 project-card ${this.getStatusClass()}" data-project-type="${this.project.type}">
        ${this.renderCardHeader()}
        <div class="card-body">
          ${this.renderTitle()}
          ${this.renderDescription()}
          ${this.renderMetadata()}
          ${this.renderProgress()}
          ${this.renderTeam()}
        </div>
        ${this.renderCardFooter()}
      </div>
    `;
    
    this.initCardEventListeners(card);
    return card;
  }

  getCardClasses() {
    const { cardSize } = this.options;
    
    switch (cardSize) {
      case 'small':
        return 'col-md-6 col-xl-4 mb-3';
      case 'large':
        return 'col-12 mb-4';
      case 'normal':
      default:
        return 'col-md-6 col-lg-4 mb-4';
    }
  }

  renderCardHeader() {
    if (!this.project.cover_image) {
      return '';
    }

    return `
      <div class="card-header-custom position-relative">
        ${this.project.cover_image ? this.renderCoverImage() : ''}
        ${this.renderStatusBadge()}
      </div>
    `;
  }

  renderCoverImage() {
    return `
      <div class="project-cover" style="background-image: url('${this.project.cover_image}'); height: 120px; background-size: cover; background-position: center;">
        <div class="cover-overlay"></div>
      </div>
    `;
  }

  renderStatusBadge() {
    const status = this.project.status || 'planning';
    return `
      <span class="badge ${this.getStatusBadgeClass(status)} position-absolute top-0 end-0 m-2">
        ${this.formatStatus(status)}
      </span>
    `;
  }

  renderTitle() {
    const title = this.project.title || 'Untitled Project';
    const maxLength = this.options.cardSize === 'small' ? 30 : 50;
    const truncatedTitle = title.length > maxLength ? title.substring(0, maxLength) + '...' : title;
    
    return `
      <h5 class="card-title mb-2">
        <a href="./project-details.html?id=${this.project.id}" class="text-decoration-none project-title-link">
          ${truncatedTitle}
        </a>
      </h5>
    `;
  }

  renderDescription() {
    if (!this.project.description) return '';
    
    const maxLength = this.options.cardSize === 'large' ? 200 : 100;
    const description = this.project.description.length > maxLength 
      ? this.project.description.substring(0, maxLength) + '...' 
      : this.project.description;
    
    return `<p class="card-text text-muted mb-3">${description}</p>`;
  }

  renderMetadata() {
    const metadata = [];
    
    // Project type
    metadata.push(`
      <span class="badge bg-secondary me-2 mb-2">
        <i class="bi ${this.getTypeIcon(this.project.type)} me-1"></i>
        ${this.formatProjectType(this.project.type)}
      </span>
    `);
    
    // Budget (if available)
    if (this.project.budget) {
      metadata.push(`
        <span class="badge bg-success me-2 mb-2">
          <i class="bi bi-currency-euro me-1"></i>
          ${this.formatBudget(this.project.budget)}
        </span>
      `);
    }
    
    // Dates
    if (this.options.showDates) {
      if (this.project.start_date) {
        metadata.push(`
          <small class="text-muted d-block mb-1">
            <i class="bi bi-calendar-event me-1"></i>
            Started: ${formatDate(this.project.start_date)}
          </small>
        `);
      }
      
      if (this.project.end_date) {
        const isOverdue = new Date(this.project.end_date) < new Date() && this.project.status !== 'completed';
        metadata.push(`
          <small class="text-muted d-block mb-1 ${isOverdue ? 'text-danger' : ''}">
            <i class="bi bi-calendar-x me-1"></i>
            Due: ${formatDate(this.project.end_date)}
          </small>
        `);
      }
    }
    
    return metadata.length > 0 ? `<div class="project-metadata mb-3">${metadata.join('')}</div>` : '';
  }

  renderProgress() {
    if (!this.options.showProgress) return '';
    
    const progress = this.project.progress || 0;
    const progressColor = this.getProgressColor(progress);
    
    return `
      <div class="progress mb-3" style="height: 6px;">
        <div class="progress-bar bg-${progressColor}" style="width: ${progress}%"></div>
      </div>
      <div class="d-flex justify-content-between align-items-center mb-2">
        <small class="text-muted">Progress</small>
        <small class="fw-medium">${progress}%</small>
      </div>
    `;
  }

  renderTeam() {
    if (!this.options.showTeam || !this.project.team_members || this.project.team_members.length === 0) {
      return '';
    }
    
    const visibleMembers = this.project.team_members.slice(0, 3);
    const remainingCount = this.project.team_members.length - 3;
    
    const membersHtml = visibleMembers.map(member => `
      <div class="avatar-sm" title="${member.name}">
        ${member.avatar 
          ? `<img src="${member.avatar}" alt="${member.name}" class="avatar-img">` 
          : `<div class="avatar-placeholder">${member.name.charAt(0)}</div>`
        }
      </div>
    `).join('');
    
    const remainingHtml = remainingCount > 0 ? `
      <div class="avatar-sm avatar-more">
        <div class="avatar-placeholder">+${remainingCount}</div>
      </div>
    ` : '';
    
    return `
      <div class="project-team d-flex align-items-center">
        <small class="text-muted me-2">Team:</small>
        <div class="avatars-group">
          ${membersHtml}
          ${remainingHtml}
        </div>
      </div>
    `;
  }

  renderCardFooter() {
    const lastActivity = this.project.updated_at || this.project.created_at;
    
    return `
      <div class="card-footer bg-transparent border-top-0 pt-0">
        <div class="d-flex justify-content-between align-items-center">
          <small class="text-muted">
            <i class="bi bi-clock me-1"></i>
            ${getRelativeTime(lastActivity)}
          </small>
          ${this.renderQuickActions()}
        </div>
      </div>
    `;
  }

  renderQuickActions() {
    if (!this.options.showActions) {
      return `
        <div class="quick-actions">
          <button class="btn btn-sm btn-outline-primary" data-action="view" title="View Project">
            <i class="bi bi-eye"></i>
          </button>
        </div>
      `;
    }

    return `
      <div class="quick-actions d-flex gap-1">
        <button class="btn btn-sm btn-outline-primary" data-action="view" title="View Project">
          <i class="bi bi-eye"></i>
        </button>
        <button class="btn btn-sm btn-outline-primary" data-action="edit" title="Edit Project">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm btn-outline-primary" data-action="share" title="Share Project">
          <i class="bi bi-share"></i>
        </button>
        <button class="btn btn-sm btn-outline-primary" data-action="delete" title="Delete Project">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    `;
  }

  initCardEventListeners(card) {
    // Handle action clicks
    card.addEventListener('click', (e) => {
      const actionElement = e.target.closest('[data-action]');
      if (actionElement) {
        e.preventDefault();
        e.stopPropagation();
        
        const action = actionElement.dataset.action;
        this.handleAction(action);
      }
    });
    
    // Handle card click (if onClick callback provided)
    if (this.options.onClick) {
      card.addEventListener('click', (e) => {
        // Don't trigger if clicking on actions
        if (!e.target.closest('[data-action]')) {
          this.options.onClick(this.project);
        }
      });
    }
    
    // Add hover effects
    card.addEventListener('mouseenter', () => {
      card.classList.add('shadow-sm');
    });
    
    card.addEventListener('mouseleave', () => {
      card.classList.remove('shadow-sm');
    });
  }

  handleAction(action) {
    switch (action) {
      case 'view':
        if (this.options.onClick) {
          this.options.onClick(this.project);
        } else {
          window.location.href = `./project-details.html?id=${this.project.id}`;
        }
        break;
      case 'edit':
        if (this.options.onEdit) {
          this.options.onEdit(this.project);
        }
        break;
      case 'share':
        if (this.options.onShare) {
          this.options.onShare(this.project);
        }
        break;
      case 'delete':
        if (this.options.onDelete) {
          this.options.onDelete(this.project);
        }
        break;
      default:
        console.log(`Unhandled action: ${action}`);
    }
  }

  // Helper methods
  getStatusClass() {
    const status = this.project.status || 'planning';
    return `status-${status}`;
  }

  getStatusBadgeClass(status) {
    const classes = {
      planning: 'bg-secondary',
      active: 'bg-primary',
      completed: 'bg-success',
      paused: 'bg-warning text-dark',
      archived: 'bg-dark'
    };
    return classes[status] || 'bg-secondary';
  }

  formatStatus(status) {
    const labels = {
      planning: 'Planning',
      active: 'Active',
      completed: 'Completed',
      paused: 'Paused',
      archived: 'Archived'
    };
    return labels[status] || status;
  }

  getTypeIcon(type) {
    const icons = {
      'Academic & Research': 'bi-book',
      'Corporate/Business': 'bi-building',
      'EU-Funded Project': 'bi-flag',
      'Public Initiative': 'bi-people',
      'Personal/Other': 'bi-person'
    };
    return icons[type] || 'bi-folder';
  }

  formatProjectType(type) {
    return type || 'Other';
  }

  formatBudget(budget) {
    if (budget >= 1000000) {
      return `€${(budget / 1000000).toFixed(1)}M`;
    } else if (budget >= 1000) {
      return `€${(budget / 1000).toFixed(0)}K`;
    } else {
      return `€${budget}`;
    }
  }

  getProgressColor(progress) {
    if (progress >= 80) return 'success';
    if (progress >= 50) return 'primary';
    if (progress >= 25) return 'warning';
    return 'danger';
  }

  /**
   * Update project data and re-render if needed
   * @param {Object} updates - Updated project data
   */
  updateProject(updates) {
    this.project = { ...this.project, ...updates };
    // Could implement selective re-rendering here
  }
}