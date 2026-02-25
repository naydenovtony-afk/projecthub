/**
 * Navigation Component
 * Reusable navigation bar with dynamic menu items and user state
 */
import { getCurrentUser } from '../auth.js';
import { showError } from '../../utils/uiModular.js';
import { toggleTheme, getCurrentTheme } from '../theme.js';

export class NavBar {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.options = {
      brand: options.brand || { text: 'ProjectHub', href: '../index.html', icon: 'bi-kanban-fill' },
      theme: options.theme || 'light', // 'light', 'dark', 'gradient'
      fixed: options.fixed || false,
      showSearch: options.showSearch !== false, // true by default
      showNotifications: options.showNotifications !== false,
      showThemeToggle: options.showThemeToggle !== false,
      showUserMenu: options.showUserMenu !== false,
      menuItems: options.menuItems || this.getDefaultMenuItems()
    };
    
    this.currentUser = null;
    this.init();
  }

  getDefaultMenuItems() {
    return [
      { text: 'Dashboard', href: './dashboard.html', icon: 'bi-speedometer2', active: false },
      { text: 'Projects', href: './projects.html', icon: 'bi-folder', active: false },
      { text: 'Tasks', href: './tasks.html', icon: 'bi-check-square', active: false },
      { text: 'Files', href: './files.html', icon: 'bi-file-earmark', active: false }
    ];
  }

  async init() {
    try {
      // Use user passed in from options (already resolved by dashboard controller),
      // otherwise fall back to getCurrentUser()
      this.currentUser = this.options.user || await getCurrentUser();
      
      // Render navbar
      this.render();
      
      // Initialize event listeners
      this.initEventListeners();
      
    } catch (error) {
      console.error('Error initializing navbar:', error);
    }
  }

  render() {
    if (!this.container) return;
    
    const { brand, theme, fixed, menuItems } = this.options;
    
    const navbarClasses = [
      'navbar',
      'navbar-expand-lg',
      fixed ? (theme === 'light' ? 'fixed-top' : 'sticky-top') : 'sticky-top',
      this.getThemeClasses()
    ].join(' ');
    
    this.container.innerHTML = `
      <nav class="${navbarClasses}">
        <div class="container-fluid">
          ${this.renderBrand()}
          ${this.renderToggler()}
          
          <div class="collapse navbar-collapse" id="navbarNav">
            ${this.renderMenuItems()}
            ${this.renderRightSection()}
          </div>
        </div>
      </nav>
    `;
  }

  renderBrand() {
    const { brand } = this.options;
    return `
      <a class="navbar-brand d-flex align-items-center" href="${brand.href}">
        <i class="bi ${brand.icon} text-primary me-2 fs-4"></i>
        <span class="fw-bold">${brand.text}</span>
      </a>
    `;
  }

  renderToggler() {
    return `
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
        <span class="navbar-toggler-icon"></span>
      </button>
    `;
  }

  renderMenuItems() {
    const { menuItems } = this.options;
    
    const menuHtml = menuItems.map(item => `
      <li class="nav-item">
        <a class="nav-link ${item.active ? 'active' : ''}" href="${item.href}">
          <i class="bi ${item.icon} me-1"></i>${item.text}
        </a>
      </li>
    `).join('');
    
    return `<ul class="navbar-nav me-auto">${menuHtml}</ul>`;
  }

  renderRightSection() {
    const sections = [];
    
    if (this.options.showSearch) {
      sections.push(this.renderSearch());
    }
    
    if (this.options.showThemeToggle) {
      sections.push(this.renderThemeToggle());
    }
    
    if (this.options.showNotifications) {
      sections.push(this.renderNotifications());
    }
    
    if (this.options.showUserMenu) {
      sections.push(this.renderUserMenu());
    }
    
    return sections.join('');
  }

  renderSearch() {
    return `
      <form class="navbar-search-form me-3" role="search">
        <div class="input-group navbar-search-group">
          <span class="input-group-text navbar-search-icon">
            <i class="bi bi-search"></i>
          </span>
          <input class="form-control border-start-0 navbar-search-input" type="search" placeholder="Search projects, tasks, files..." id="globalSearch" aria-label="Global search" autocomplete="off">
        </div>
      </form>
    `;
  }

  renderThemeToggle() {
    return `
      <button class="btn btn-ghost" data-theme-toggle title="Toggle theme">
        <i class="bi bi-moon-fill"></i>
      </button>
    `;
  }

  renderNotifications() {
    return `
      <div class="dropdown ms-2">
        <button class="btn btn-ghost position-relative" data-bs-toggle="dropdown" id="notificationsBtn">
          <i class="bi bi-bell"></i>
          <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" id="notificationCount">3</span>
        </button>
        <ul class="dropdown-menu dropdown-menu-end">
          <li><h6 class="dropdown-header">Notifications</h6></li>
          <li><a class="dropdown-item" href="#" id="noNotifications">No new notifications</a></li>
        </ul>
      </div>
    `;
  }

  renderUserMenu() {
    const user = this.currentUser || { name: 'User', email: 'user@example.com', avatar: null };
    
    return `
      <div class="dropdown ms-2">
        <button class="btn btn-ghost d-flex align-items-center" data-bs-toggle="dropdown">
          <div class="avatar-circle me-2" id="userAvatar">
            ${user.avatar ? `<img src="${user.avatar}" alt="User Avatar" class="avatar-img">` : '<i class="bi bi-person-fill"></i>'}
          </div>
          <div class="d-none d-lg-block text-start">
            <div class="small fw-medium" id="userName">${user.name}</div>
            <div class="text-muted" style="font-size: 0.75rem;" id="userEmail">${user.email}</div>
          </div>
        </button>
        <ul class="dropdown-menu dropdown-menu-end">
          <li><a class="dropdown-item" href="./profile.html"><i class="bi bi-person me-2"></i>Profile</a></li>
          <li><a class="dropdown-item" href="./settings.html"><i class="bi bi-gear me-2"></i>Settings</a></li>
          <li><hr class="dropdown-divider"></li>
          <li><a class="dropdown-item text-danger" href="#" id="logoutBtn"><i class="bi bi-box-arrow-right me-2"></i>Logout</a></li>
        </ul>
      </div>
    `;
  }

  getThemeClasses() {
    const { theme } = this.options;
    
    switch (theme) {
      case 'dark':
        return 'navbar-dark bg-dark border-bottom';
      case 'gradient':
        return 'navbar-dark';
      case 'light':
      default:
        return 'navbar-light bg-white border-bottom';
    }
  }

  initEventListeners() {
    // Theme toggle
    const themeToggle = document.querySelector('[data-theme-toggle]');
    if (themeToggle) {
      themeToggle.addEventListener('click', this.toggleTheme.bind(this));
    }
    
    // Global search
    const searchInput = document.getElementById('globalSearch');
    if (searchInput) {
      searchInput.addEventListener('input', this.handleSearch.bind(this));
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', this.handleLogout.bind(this));
    }
    
    // Notifications
    const notificationsBtn = document.getElementById('notificationsBtn');
    if (notificationsBtn) {
      notificationsBtn.addEventListener('click', this.handleNotifications.bind(this));
    }
  }

  toggleTheme() {
    toggleTheme();
    
    // Update icon
    const isDark = document.body.classList.contains('dark-mode') || document.documentElement.classList.contains('dark-mode');
    const themeIcon = document.querySelector('[data-theme-toggle] i');
    if (themeIcon) {
      themeIcon.className = isDark ? 'bi bi-sun-fill' : 'bi bi-moon-fill';
    }
  }

  handleSearch(event) {
    const query = event.target.value.trim();
    if (query.length > 2) {
      // Dispatch custom search event
      window.dispatchEvent(new CustomEvent('globalSearch', {
        detail: { query }
      }));
    }
  }

  async handleLogout() {
    try {
      // Import logout function dynamically to avoid circular imports
      const { logout } = await import('../auth.js');
      await logout();
    } catch (error) {
      showError('Failed to logout');
    }
  }

  handleNotifications() {
    // Load notifications if needed
    console.log('Loading notifications...');
  }

  /**
   * Update active menu item
   * @param {string} href - Menu item href to make active
   */
  setActiveMenuItem(href) {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === href) {
        link.classList.add('active');
      }
    });
  }

  /**
   * Update notification count
   * @param {number} count - Number of unread notifications
   */
  updateNotificationCount(count) {
    const badge = document.getElementById('notificationCount');
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline' : 'none';
    }
  }

  /**
   * Update user information
   * @param {Object} user - User data
   */
  updateUser(user) {
    this.currentUser = user;
    
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');
    const userAvatar = document.getElementById('userAvatar');
    
    if (userName) userName.textContent = user.name || 'User';
    if (userEmail) userEmail.textContent = user.email || 'user@example.com';
    
    if (userAvatar) {
      userAvatar.innerHTML = user.avatar 
        ? `<img src="${user.avatar}" alt="User Avatar" class="avatar-img">`
        : '<i class="bi bi-person-fill"></i>';
    }
  }

  /**
   * Apply gradient style for special pages
   */
  applyGradientStyle() {
    const nav = this.container.querySelector('nav');
    if (nav) {
      nav.style.background = 'linear-gradient(135deg, #20b2aa 0%, #4169e1 100%)';
      nav.style.boxShadow = '0 2px 12px rgba(0,0,0,0.1)';
      nav.classList.add('navbar-dark');
      nav.classList.remove('navbar-light', 'bg-white');
    }
  }
}