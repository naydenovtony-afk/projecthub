# UI/UX Guidelines

## 🤖 Instructions for AI Agents

**Before generating code:**
1. ✅ Read this entire document
2. ✅ Check existing code for patterns
3. ✅ Follow ALL rules and conventions
4. ✅ Ask if anything is unclear

**When making changes:**
- Follow the established patterns exactly
- Don't deviate without explicit permission
- Update related documentation
- Test on multiple devices/browsers

**Remember:**
- Consistency > Cleverness
- Readable > Compact
- Documented > Assumed

---

## 🎨 Design System

### Color Palette
```css
/* Primary Colors */
--primary-color: #20b2aa;      /* Teal - Main brand */
--secondary-color: #4169e1;    /* Royal Blue - Accent */

/* Status Colors */
--success-color: #059669;      /* Green */
--warning-color: #f59e0b;      /* Amber */
--danger-color: #dc2626;       /* Red */
--info-color: #3b82f6;         /* Blue */

/* Neutral Colors */
--text-primary: #111827;       /* Dark - Headings */
--text-secondary: #4b5563;     /* Medium - Body */
--text-tertiary: #6b7280;      /* Light - Muted */

--bg-primary: #ffffff;         /* White */
--bg-secondary: #f9fafb;       /* Light gray */
--bg-tertiary: #f3f4f6;        /* Lighter gray */

--border-color: #e5e7eb;       /* Border */
```

### Typography
```css
/* Font Family */
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, 
             "Helvetica Neue", Arial, sans-serif;

/* Font Sizes */
--fs-xs: 0.75rem;    /* 12px */
--fs-sm: 0.875rem;   /* 14px */
--fs-base: 1rem;     /* 16px */
--fs-lg: 1.125rem;   /* 18px */
--fs-xl: 1.25rem;    /* 20px */
--fs-2xl: 1.5rem;    /* 24px */
--fs-3xl: 1.875rem;  /* 30px */
--fs-4xl: 2.25rem;   /* 36px */

/* Font Weights */
--fw-normal: 400;
--fw-medium: 500;
--fw-semibold: 600;
--fw-bold: 700;
```

### Spacing
```css
/* Spacing Scale (4px base) */
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
```

### Border Radius
```css
--radius-sm: 4px;
--radius-md: 6px;
--radius-lg: 8px;
--radius-xl: 12px;
--radius-full: 9999px;
```

### Shadows
```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
```

## 🧩 Component Guidelines

### Buttons

**Primary Button** - Main actions
```html
<button class="btn btn-primary">
  <i class="bi bi-plus me-2"></i>
  Create Project
</button>
```

**Secondary Button** - Less important actions
```html
<button class="btn btn-outline-primary">
  Cancel
</button>
```

**Danger Button** - Destructive actions
```html
<button class="btn btn-danger">
  <i class="bi bi-trash me-2"></i>
  Delete
</button>
```

**Icon Button** - Icon-only actions
```html
<button class="btn btn-icon" aria-label="Delete" title="Delete">
  <i class="bi bi-trash"></i>
</button>
```

**Button States:**
```html
<!-- Loading -->
<button class="btn btn-primary" disabled>
  <span class="spinner-border spinner-border-sm me-2"></span>
  Saving...
</button>

<!-- Disabled -->
<button class="btn btn-primary" disabled>
  Disabled
</button>
```

**Rules:**
- ✅ Always use descriptive text or aria-label
- ✅ Icons before text (icon + text)
- ✅ Minimum 44px touch target
- ✅ Show loading state for async actions
- ❌ Never use buttons for navigation (use `<a>`)
- ❌ Never disable without explanation

### Cards
```html
<div class="card">
  <div class="card-header">
    <h5 class="card-title mb-0">Project Title</h5>
    <div class="card-actions">
      <button class="btn btn-sm btn-icon" aria-label="Edit">
        <i class="bi bi-pencil"></i>
      </button>
    </div>
  </div>
  <div class="card-body">
    <p class="card-text text-secondary">Description goes here</p>
    <div class="d-flex gap-2 mt-3">
      <span class="badge bg-primary">Active</span>
      <span class="badge bg-secondary">5 tasks</span>
    </div>
  </div>
  <div class="card-footer text-muted">
    <small>Updated 2 hours ago</small>
  </div>
</div>
```

**Card Variants:**
```html
<!-- Hover effect -->
<div class="card card-hover">...</div>

<!-- With border accent -->
<div class="card border-start border-primary border-4">...</div>

<!-- Clickable card -->
<a href="#" class="card card-link text-decoration-none">...</a>
```

**Rules:**
- ✅ Use semantic sections (header, body, footer)
- ✅ Include hover states for interactive cards
- ✅ Shadow for depth: `0 2px 8px rgba(0,0,0,0.1)`
- ✅ Consistent padding: 1rem (16px)
- ❌ Don't nest cards > 2 levels deep
- ❌ Don't make cards too wide (max 600px for readability)

### Forms

**Text Input:**
```html
<div class="mb-3">
  <label for="title" class="form-label">
    Project Title <span class="text-danger">*</span>
  </label>
  <input 
    type="text" 
    class="form-control" 
    id="title"
    placeholder="Enter project title"
    required
    aria-describedby="titleHelp">
  <div class="form-text" id="titleHelp">
    Choose a clear, descriptive name
  </div>
  <div class="invalid-feedback">
    Title is required
  </div>
</div>
```

**Select Dropdown:**
```html
<div class="mb-3">
  <label for="status" class="form-label">Project Status</label>
  <select class="form-select" id="status" required>
    <option value="">Choose...</option>
    <option value="planning">Planning</option>
    <option value="active">Active</option>
    <option value="completed">Completed</option>
  </select>
</div>
```

**Textarea:**
```html
<div class="mb-3">
  <label for="description" class="form-label">Description</label>
  <textarea 
    class="form-control" 
    id="description" 
    rows="4"
    placeholder="Describe your project..."></textarea>
</div>
```

**Checkbox:**
```html
<div class="form-check">
  <input class="form-check-input" type="checkbox" id="isPublic">
  <label class="form-check-label" for="isPublic">
    Make this project public
  </label>
</div>
```

**Form Validation:**
```javascript
// Bootstrap validation
const form = document.querySelector('.needs-validation');
form.addEventListener('submit', (e) => {
  if (!form.checkValidity()) {
    e.preventDefault();
    e.stopPropagation();
  }
  form.classList.add('was-validated');
});
```

**Rules:**
- ✅ Always use `<label>` with `for` attribute
- ✅ Mark required fields with asterisk (*)
- ✅ Provide helpful placeholder text
- ✅ Show validation errors inline
- ✅ Use `form-text` for hints
- ✅ Disable submit during async operations
- ❌ Never use placeholder as label
- ❌ Don't hide validation until submit
- ❌ Don't use generic error messages

### Badges

```html
<!-- Status badges -->
<span class="badge bg-success">Active</span>
<span class="badge bg-warning text-dark">Pending</span>
<span class="badge bg-danger">Overdue</span>
<span class="badge bg-secondary">Archived</span>

<!-- Pill badges -->
<span class="badge rounded-pill bg-primary">12 Tasks</span>

<!-- Badge in button -->
<button class="btn btn-primary position-relative">
  Notifications
  <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
    3
    <span class="visually-hidden">unread messages</span>
  </span>
</button>
```

### Modals

```html
<div class="modal fade" id="confirmModal" tabindex="-1">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Confirm Action</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <p>Are you sure you want to delete this project?</p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
        <button type="button" class="btn btn-danger">Delete</button>
      </div>
    </div>
  </div>
</div>
```

**Rules:**
- ✅ Include close button (X)
- ✅ Provide keyboard navigation (ESC to close)
- ✅ Focus management (return focus after close)
- ✅ Destructive actions on the right
- ❌ Don't nest modals
- ❌ Don't auto-open on page load

### Toasts / Notifications

```javascript
import { showSuccess, showError, showWarning, showInfo } from '../utils/notifications.js';

// Success notification
showSuccess('Project saved successfully!');

// Error notification
showError('Failed to save project');

// Warning notification
showWarning('Some tasks are overdue');

// Info notification
showInfo('New features available');
```

**Rules:**
- ✅ Auto-dismiss after 5 seconds (adjustable)
- ✅ Stack multiple toasts
- ✅ Include close button
- ✅ Use appropriate colors for type
- ❌ Don't use for critical errors (use modal)
- ❌ Don't show too many at once

## 📱 Responsive Design

### Breakpoints
```css
/* Mobile First Approach */

/* Extra Small (default): < 576px */
.element { width: 100%; }

/* Small: ≥ 576px */
@media (min-width: 576px) {
  .element { width: 540px; }
}

/* Medium: ≥ 768px */
@media (min-width: 768px) {
  .element { width: 720px; }
}

/* Large: ≥ 992px */
@media (min-width: 992px) {
  .element { width: 960px; }
}

/* Extra Large: ≥ 1200px */
@media (min-width: 1200px) {
  .element { width: 1140px; }
}

/* XXL: ≥ 1400px */
@media (min-width: 1400px) {
  .element { width: 1320px; }
}
```

### Bootstrap Grid
```html
<!-- Mobile: 1 column, Tablet: 2 columns, Desktop: 3 columns -->
<div class="row">
  <div class="col-12 col-md-6 col-lg-4">
    <div class="card">...</div>
  </div>
  <div class="col-12 col-md-6 col-lg-4">
    <div class="card">...</div>
  </div>
  <div class="col-12 col-md-6 col-lg-4">
    <div class="card">...</div>
  </div>
</div>
```

### Mobile Guidelines

**✅ DO:**
- Design mobile-first
- Use 44px minimum touch targets
- Stack elements vertically on small screens
- Hide non-essential elements on mobile
- Use hamburger menu for navigation
- Test on real devices
- Consider thumb zones for buttons
- Use larger font sizes (≥ 16px to prevent zoom)

**❌ DON'T:**
- Don't rely on hover states
- Don't use tiny fonts (< 14px)
- Don't make horizontal scrolling required
- Don't use complex gestures
- Don't hide critical actions
- Don't assume fast connections

## ♿ Accessibility (A11Y)

### WCAG 2.1 AA Requirements

**Keyboard Navigation:**
```javascript
// ✅ All interactive elements must be keyboard accessible
element.addEventListener('click', handleClick);
element.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    handleClick(e);
  }
});

// ✅ Focus indicators
.btn:focus {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}
```

**Color Contrast:**
- Normal text: 4.5:1 minimum
- Large text (18pt+ / 24px+): 3:1 minimum
- UI components: 3:1 minimum
- Test with browser DevTools or online tools

**ARIA Labels:**
```html
<!-- Icon buttons -->
<button aria-label="Close dialog" title="Close">
  <i class="bi bi-x" aria-hidden="true"></i>
</button>

<!-- Form inputs without visible label -->
<input 
  aria-label="Search projects" 
  type="search" 
  placeholder="Search...">

<!-- Live regions -->
<div role="status" aria-live="polite" aria-atomic="true">
  <span class="visually-hidden">Saving project...</span>
</div>

<!-- Expanded/collapsed state -->
<button 
  aria-expanded="false" 
  aria-controls="collapsePanel">
  Show More
</button>
```

**Screen Reader Text:**
```html
<span class="visually-hidden">Loading...</span>
```

**Skip Links:**
```html
<a href="#main-content" class="skip-link">Skip to main content</a>
```

**Focus Management:**
```javascript
// When opening modal, focus first input
modal.addEventListener('shown.bs.modal', () => {
  modal.querySelector('input').focus();
});

// When closing modal, return focus
modal.addEventListener('hidden.bs.modal', () => {
  triggerButton.focus();
});
```

**Rules:**
- ✅ Use semantic HTML (reduces ARIA need)
- ✅ Provide text alternatives for images
- ✅ Ensure keyboard navigation works
- ✅ Maintain visible focus indicators
- ✅ Use ARIA when semantic HTML insufficient
- ✅ Test with screen readers
- ❌ Don't rely on color alone to convey info
- ❌ Don't break native semantics with ARIA
- ❌ Don't remove focus outlines

## 🎭 Dark Mode

**Implementation:**
```css
/* Light mode (default) */
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f9fafb;
  --text-primary: #111827;
  --text-secondary: #4b5563;
  --border-color: #e5e7eb;
}

/* Dark mode */
body.dark-mode {
  --bg-primary: #1a1d29;
  --bg-secondary: #252837;
  --text-primary: #f9fafb;
  --text-secondary: #d1d5db;
  --border-color: #374151;
}

/* Use variables everywhere */
.card {
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}
```

**JavaScript Toggle:**
```javascript
import { initTheme, toggleTheme } from '../scripts/theme.js';

// Initialize on page load
initTheme();

// Toggle button
document.getElementById('themeToggle').addEventListener('click', toggleTheme);
```

**Rules:**
- ✅ Use CSS variables for all colors
- ✅ Test all components in both modes
- ✅ Maintain contrast ratios in both modes
- ✅ Save preference to localStorage
- ✅ Respect system preference initially
- ❌ Don't hardcode colors
- ❌ Don't forget borders/shadows
- ❌ Don't make dark mode unreadable

## 🎨 Loading States

**Spinner:**
```html
<div class="spinner-border text-primary" role="status">
  <span class="visually-hidden">Loading...</span>
</div>
```

**Skeleton Loader:**
```html
<div class="card">
  <div class="card-body">
    <div class="skeleton skeleton-text"></div>
    <div class="skeleton skeleton-text" style="width: 80%;"></div>
    <div class="skeleton skeleton-text" style="width: 60%;"></div>
  </div>
</div>
```

```css
.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}

.skeleton-text {
  height: 1rem;
  margin-bottom: 0.5rem;
  border-radius: 4px;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

## 📊 Empty States

```html
<div class="empty-state text-center py-5">
  <i class="bi bi-inbox fs-1 text-muted mb-3"></i>
  <h3 class="h5">No projects yet</h3>
  <p class="text-secondary mb-4">
    Get started by creating your first project
  </p>
  <button class="btn btn-primary">
    <i class="bi bi-plus me-2"></i>
    Create Project
  </button>
</div>
```

**Rules:**
- ✅ Include helpful illustration or icon
- ✅ Explain why it's empty
- ✅ Provide clear call-to-action
- ✅ Make it visually appealing
- ❌ Don't just say "No data"

---

**Key Principle**: Design with empathy. Consider all users, devices, and contexts.
