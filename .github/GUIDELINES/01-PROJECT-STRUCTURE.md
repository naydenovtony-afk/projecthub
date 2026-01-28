# Project Structure Guidelines

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

## 📁 Directory Structure

```
projecthub/
├── .github/                    # GitHub configuration
│   ├── copilot-instructions.md # AI agent instructions
│   └── GUIDELINES/             # Development guidelines
├── assets/                     # Static assets
│   ├── images/                 # Images, logos, icons
│   └── screenshots/            # App screenshots
├── components/                 # Reusable HTML components
│   └── search-bar.html         # Global search component
├── database/                   # Database schemas and migrations
│   ├── schema.sql              # Main database schema
│   ├── contacts-schema.sql     # Contacts table schema
│   └── seed-demo-data.sql      # Demo data for testing
├── pages/                      # HTML page files
│   ├── dashboard.html          # Main dashboard
│   ├── projects.html           # Projects list
│   ├── project-details.html    # Project details view
│   ├── project-form.html       # Create/edit project
│   ├── profile.html            # User profile
│   ├── settings.html           # User settings
│   ├── login.html              # Login page
│   ├── register.html           # Registration page
│   ├── admin.html              # Admin panel
│   ├── demo.html               # Landing/demo page
│   ├── 404.html                # 404 error page
│   └── 500.html                # 500 error page
├── public/                     # Public assets (copied to dist)
│   ├── _redirects              # Netlify redirects
│   ├── favicon.svg             # Site favicon
│   └── apple-touch-icon.png    # iOS home screen icon
├── scripts/                    # JavaScript modules
│   ├── auth.js                 # Authentication logic
│   ├── dashboard.js            # Dashboard functionality
│   ├── projects.js             # Projects page logic
│   ├── project-details.js      # Project details logic
│   ├── project-form.js         # Project form logic
│   ├── profile.js              # Profile page logic
│   ├── settings.js             # Settings page logic
│   ├── admin.js                # Admin panel logic
│   ├── ai-assistant.js         # AI assistant feature
│   ├── team-chat.js            # Real-time team chat
│   ├── globalSearch.js         # Global search functionality
│   ├── theme.js                # Theme switching
│   └── main.js                 # Global app initialization
├── services/                   # API and service modules
│   ├── supabase.js             # Supabase client initialization
│   ├── projectService.js       # Project CRUD operations
│   ├── taskService.js          # Task CRUD operations
│   └── storageService.js       # File storage operations
├── styles/                     # CSS stylesheets
│   ├── main.css                # Main stylesheet
│   ├── landing.css             # Landing page styles
│   ├── demo.css                # Demo page styles
│   ├── themes.css              # Theme variables and switching
│   ├── animations.css          # Animation utilities
│   ├── ai-assistant.css        # AI assistant styles
│   ├── team-chat.css           # Team chat styles
│   └── search.css              # Search component styles
├── utils/                      # Utility functions
│   ├── helpers.js              # General helper functions
│   ├── validators.js           # Input validation functions
│   ├── errorHandler.js         # Error handling utilities
│   ├── notifications.js        # Toast notifications
│   ├── ui.js                   # UI helper functions
│   ├── animations.js           # Animation utilities
│   ├── demoMode.js             # Demo mode functionality
│   └── generatePlaceholders.js # Placeholder generation
├── index.html                  # Main entry point (landing page)
├── package.json                # NPM dependencies
├── vite.config.js              # Vite configuration
├── netlify.toml                # Netlify deployment config
└── README.md                   # Project documentation
```

## 📂 Folder Purposes

### `/pages/` - HTML Pages
- **Purpose**: All HTML page files
- **Pattern**: One file per page/route
- **Naming**: `lowercase-with-hyphens.html`
- **Rules**:
  - Keep HTML semantic and clean
  - Business logic goes in `/scripts/`
  - Styles go in `/styles/`
  - Include proper `<title>` and meta tags
  - Load scripts as ES6 modules

**Example**:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard - ProjectHub</title>
  <link rel="stylesheet" href="/styles/main.css">
</head>
<body>
  <!-- Content -->
  <script type="module" src="/scripts/dashboard.js"></script>
</body>
</html>
```

### `/scripts/` - JavaScript Modules
- **Purpose**: Page-specific logic and functionality
- **Pattern**: One file per page or major feature
- **Naming**: `camelCase.js`
- **Rules**:
  - Use ES6 modules (`import`/`export`)
  - One main function per file (e.g., `initDashboard()`)
  - Import services from `/services/`
  - Import utilities from `/utils/`
  - Handle page-specific DOM manipulation

**Example**:
```javascript
import { supabase } from '../services/supabase.js';
import { showError, showSuccess } from '../utils/notifications.js';

/**
 * Initialize dashboard page
 */
async function initDashboard() {
  try {
    // Page logic
  } catch (error) {
    showError('Failed to load dashboard');
  }
}

// Run on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDashboard);
} else {
  initDashboard();
}
```

### `/services/` - API Services
- **Purpose**: Backend API integration and data operations
- **Pattern**: One service per domain (projects, tasks, storage)
- **Naming**: `entityNameService.js`
- **Rules**:
  - Export async functions only
  - Handle Supabase operations
  - Include JSDoc documentation
  - Return consistent data structures
  - Throw errors for error handling

**Example**:
```javascript
import { supabase } from './supabase.js';

/**
 * Fetch all projects for the current user
 * @returns {Promise<Array>} Array of project objects
 */
export async function getUserProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}
```

### `/styles/` - CSS Stylesheets
- **Purpose**: Styling and visual design
- **Pattern**: Main stylesheet + feature-specific styles
- **Naming**: `lowercase-with-hyphens.css`
- **Rules**:
  - Use `main.css` as the base
  - Import Bootstrap 5 from CDN
  - Custom CSS for specific features
  - Use CSS custom properties for theming
  - Mobile-first responsive design

**Example**:
```css
/* Feature-specific styles */
.feature-container {
  padding: var(--spacing-md);
  border-radius: var(--border-radius);
}

/* Mobile first */
@media (min-width: 768px) {
  .feature-container {
    padding: var(--spacing-lg);
  }
}
```

### `/utils/` - Utility Functions
- **Purpose**: Reusable helper functions
- **Pattern**: Grouped by functionality
- **Naming**: `descriptiveName.js`
- **Rules**:
  - Pure functions when possible
  - No side effects
  - Well documented with JSDoc
  - Export multiple functions per file
  - Keep functions small and focused

**Example**:
```javascript
/**
 * Format date to local string
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}
```

### `/components/` - Reusable HTML Components
- **Purpose**: Reusable HTML snippets
- **Pattern**: Small, reusable UI components
- **Naming**: `component-name.html`
- **Rules**:
  - Self-contained HTML fragments
  - Load via JavaScript when needed
  - No inline JavaScript
  - Include necessary classes

### `/database/` - Database Schemas
- **Purpose**: SQL migration files and schemas
- **Pattern**: One file per schema/migration
- **Naming**: `descriptive-name.sql`
- **Rules**:
  - Include CREATE TABLE statements
  - Define RLS policies
  - Add comments for clarity
  - Version control all changes

### `/assets/` - Static Assets
- **Purpose**: Images, icons, media files
- **Pattern**: Organized by type
- **Naming**: `lowercase-with-hyphens.ext`
- **Rules**:
  - Optimize images before adding
  - Use SVG for icons when possible
  - Include alt text in HTML
  - Reference with absolute paths

### `/public/` - Public Files
- **Purpose**: Files copied directly to dist/root
- **Pattern**: Configuration and meta files
- **Rules**:
  - Netlify `_redirects` for SPA routing
  - Favicons and app icons
  - robots.txt, sitemap.xml
  - No processing by build tools

## 🚫 What NOT to Do

### ❌ Don't Mix Concerns
```javascript
// BAD - Business logic in HTML
<button onclick="saveProject()">Save</button>

// GOOD - Separation of concerns
<button id="saveBtn">Save</button>
```

```javascript
// In script file
document.getElementById('saveBtn').addEventListener('click', saveProject);
```

### ❌ Don't Use Global Variables
```javascript
// BAD
let currentUser = null;

// GOOD
import { getCurrentUser } from '../services/authService.js';
```

### ❌ Don't Duplicate Code
```javascript
// BAD - Duplicate fetch logic in multiple files

// GOOD - Create a service
import { getProjects } from '../services/projectService.js';
```

### ❌ Don't Skip Error Handling
```javascript
// BAD
const data = await supabase.from('projects').select();

// GOOD
const { data, error } = await supabase.from('projects').select();
if (error) throw error;
```

## ✅ File Organization Best Practices

1. **Keep Related Files Together**: Group by feature, not by type
2. **Single Responsibility**: One purpose per file
3. **Consistent Naming**: Follow conventions strictly
4. **Import Order**: External → Internal → Utils
5. **Export Pattern**: Named exports preferred

## 📝 Adding New Files

### Adding a New Page
1. Create HTML file in `/pages/`
2. Create JS file in `/scripts/`
3. Create CSS file in `/styles/` (if needed)
4. Update navigation in relevant pages
5. Add route to Netlify `_redirects` if needed

### Adding a New Service
1. Create file in `/services/`
2. Name it `entityService.js`
3. Export async functions
4. Add JSDoc documentation
5. Import and use in `/scripts/`

### Adding a New Utility
1. Create or update file in `/utils/`
2. Export multiple related functions
3. Add comprehensive JSDoc
4. Write pure functions
5. Import where needed

## 🔍 File Location Quick Reference

| Need to... | Look in... |
|------------|-----------|
| Add a new page | `/pages/` |
| Add page logic | `/scripts/` |
| Add database query | `/services/` |
| Add helper function | `/utils/` |
| Add styling | `/styles/` |
| Add image | `/assets/images/` |
| Add SQL schema | `/database/` |
| Add reusable HTML | `/components/` |

---

**Key Takeaway**: When in doubt, follow existing patterns. Consistency is more important than perfection.
