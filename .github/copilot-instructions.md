# ProjectHub - Copilot Instructions

## Project Overview

Multi-stakeholder project tracker for academic, corporate, and EU-funded projects. Helps teams manage projects with tasks, files, and collaboration.

## Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+), Bootstrap 5.3, Vite
- **Backend:** Supabase (PostgreSQL, Auth, Storage)
- **Deployment:** Netlify
- **Version Control:** Git/GitHub

## Architecture Guidelines

- Multi-page application (separate HTML files, NOT single-page app)
- Modular structure:
  - `/pages` - HTML page files
  - `/styles` - CSS files
  - `/scripts` - JavaScript modules
  - `/services` - API/Supabase interaction
  - `/utils` - Helper functions
  - `/assets` - Images, icons, media
  - `/database` - SQL migration files
- Keep business logic separate from UI
- Use ES6 modules with import/export

## Coding Standards

### JavaScript

- Use ES6+ features: `const`/`let`, arrow functions, `async`/`await`, template literals, destructuring
- Async operations: always use `async`/`await` with try-catch
- Naming: camelCase for variables/functions, PascalCase for classes
- Add JSDoc comments for all functions
- No jQuery - use vanilla JavaScript

### HTML

- Semantic HTML5 tags (`header`, `nav`, `main`, `section`, `article`, `footer`)
- Accessible markup with ARIA labels where needed
- Use Bootstrap 5 classes for layout and components
- Keep HTML files clean - logic in JavaScript files

### CSS

- Use Bootstrap 5 utilities first
- Custom CSS in `/styles/main.css`
- Class naming: kebab-case
- Mobile-first responsive design
- Use CSS custom properties for theming

## Supabase Integration

- Client initialization: `/services/supabase.js`
- Import from environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- Row Level Security (RLS) enabled on all tables
- Async/await for all database operations
- Proper error handling with user-friendly messages
- Never expose API keys in code

## UI/UX Requirements

- Mobile-first responsive design
- Loading states for all async operations
- Error messages with Bootstrap alerts
- Success notifications with toasts
- Form validation with clear feedback
- Accessible forms with proper labels
- Bootstrap 5 components: navbar, cards, modals, buttons, badges, progress bars

## Security Best Practices

- Use environment variables for sensitive data
- Validate all user inputs (client and server side)
- Sanitize data before displaying (prevent XSS)
- Implement proper authentication checks
- Use HTTPS for all requests
- Follow Supabase RLS policies

## Code Generation Guidelines

When generating code, always:

1. Include comprehensive error handling (try-catch)
2. Add loading indicators for async operations
3. Create reusable, modular components
4. Follow Bootstrap 5 patterns and conventions
5. Write clean, readable code with comments
6. Include form validation
7. Handle edge cases
8. Add success/error feedback
9. Use semantic HTML
10. Make it mobile-responsive

## Example Code Patterns

### Supabase Query

```javascript
/**
 * Fetch user projects from database
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of projects
 */
async function getUserProjects(userId) {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching projects:', error);
    showError('Failed to load projects');
    return [];
  }
}
```

### Bootstrap Form with Validation

```html
<form id="projectForm" class="needs-validation" novalidate>
  <div class="mb-3">
    <label for="title" class="form-label">Project Title</label>
    <input type="text" class="form-control" id="title" required>
    <div class="invalid-feedback">Please provide a project title.</div>
  </div>
  <button type="submit" class="btn btn-primary">Save Project</button>
</form>
```

### Loading State

```javascript
async function saveProject(data) {
  const button = document.getElementById('saveBtn');
  button.disabled = true;
  button.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Saving...';
  
  try {
    // Save logic
    showSuccess('Project saved successfully!');
  } catch (error) {
    showError('Failed to save project');
  } finally {
    button.disabled = false;
    button.innerHTML = 'Save Project';
  }
}
```

## File Naming Conventions

- **HTML:** lowercase-with-hyphens.html (e.g., `project-details.html`)
- **CSS:** lowercase-with-hyphens.css (e.g., `main.css`)
- **JS:** camelCase.js (e.g., `projectService.js`, `authHelpers.js`)
- Keep names descriptive and purposeful

## Project-Specific Notes

- **Project types:** Academic & Research, Corporate/Business, EU-Funded Project, Public Initiative, Personal/Other
- **User roles:** user (default), admin
- **Task statuses:** todo, in_progress, done
- **Project statuses:** planning, active, completed, paused, archived
- **File categories:** image, document, deliverable, report, other

---

Generate clean, production-ready code following these guidelines.
