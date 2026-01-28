# Coding Standards

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

## 🎨 Code Style

### JavaScript (ES6+)

**✅ DO:**
```javascript
// Use const/let, never var
const API_KEY = 'value';
let counter = 0;

// Arrow functions for callbacks
items.map(item => item.id);

// Template literals
const message = `Hello ${name}!`;

// Destructuring
const { id, title } = project;

// Async/await over promises
async function fetchData() {
  const data = await api.get();
  return data;
}

// Named exports
export function myFunction() {}
export const myConstant = 'value';

// JSDoc comments
/**
 * Get project by ID
 * @param {string} projectId - The project ID
 * @returns {Promise<Object>} Project object
 */
async function getProject(projectId) {}
```

**❌ DON'T:**
```javascript
// No var
var x = 5; // ❌

// No concatenation when template literals work
const msg = 'Hello ' + name; // ❌

// No callback hell
getData(function(result) {
  getMore(result, function(more) { // ❌
    // ...
  });
});

// No default exports (use named)
export default myFunction; // ❌

// No undocumented complex functions
function complexLogic() { // ❌ Missing docs
  // 100 lines of code
}
```

### HTML

**✅ DO:**
```html
<!-- Semantic HTML -->
<main class="container">
  <section class="hero-section">
    <article class="card">
      <header class="card-header">
        <h2 class="card-title">Title</h2>
      </header>
      <div class="card-body">
        <p>Content</p>
      </div>
    </article>
  </section>
</main>

<!-- Accessibility -->
<button aria-label="Close" title="Close dialog">
  <i class="bi bi-x" aria-hidden="true"></i>
</button>

<img src="image.jpg" alt="Descriptive text">

<!-- Data attributes for JS hooks -->
<button data-action="delete" data-id="123">Delete</button>
```

**❌ DON'T:**
```html
<!-- No divitis -->
<div>
  <div>
    <div>Content</div> <!-- ❌ Use semantic tags -->
  </div>
</div>

<!-- No inline styles -->
<p style="color: red;">Text</p> <!-- ❌ Use CSS classes -->

<!-- No missing alt text -->
<img src="image.jpg"> <!-- ❌ Add alt attribute -->

<!-- No onclick handlers -->
<button onclick="doSomething()">Click</button> <!-- ❌ Use addEventListener -->
```

### CSS

**✅ DO:**
```css
/* CSS Variables */
:root {
  --primary-color: #20b2aa;
  --text-primary: #111827;
  --spacing-md: 1rem;
}

/* BEM-like naming */
.card-header__title--highlighted {
  color: var(--primary-color);
}

/* Mobile first */
.element {
  width: 100%;
}

@media (min-width: 768px) {
  .element {
    width: 50%;
  }
}

/* Logical grouping */
.button {
  /* Positioning */
  position: relative;
  
  /* Box model */
  display: inline-flex;
  padding: 0.5rem 1rem;
  
  /* Typography */
  font-size: 1rem;
  font-weight: 600;
  
  /* Visual */
  background: var(--primary-color);
  border-radius: 6px;
  
  /* Misc */
  transition: all 0.3s ease;
}
```

**❌ DON'T:**
```css
/* No !important (unless absolutely necessary) */
.text { color: red !important; } /* ❌ */

/* No magic numbers */
.element { margin-top: 23px; } /* ❌ Use variables */

/* No overly specific selectors */
div.container > ul.list > li.item > a { } /* ❌ */

/* No duplicate properties */
.element {
  color: red;
  color: blue; /* ❌ Which one? */
}
```

## 📝 Comments

### When to Comment

**✅ DO Comment:**
- Complex algorithms
- Business logic
- Workarounds and hacks
- TODO items
- Public APIs and exports
- Non-obvious code

**❌ DON'T Comment:**
- Obvious code
- What code does (code should be self-explanatory)
- Commented-out code (delete it)

### Comment Style
```javascript
// ✅ Good comments
/**
 * Calculate project completion percentage based on task status
 * Accounts for task priority weighting
 */
function calculateProgress(tasks) {
  // Filter out deleted tasks
  const activeTasks = tasks.filter(t => !t.deleted);
  
  // TODO: Add priority weighting in next iteration
  return (completedTasks / totalTasks) * 100;
}

// ❌ Bad comments
// This function gets the user
function getUser() { } // ❌ Obvious

// let x = 5; // ❌ Don't comment out code
```

## 🔧 Error Handling

**✅ DO:**
```javascript
async function saveProject(data) {
  try {
    // Validate input
    if (!data.title) {
      throw new Error('Project title is required');
    }
    
    const result = await api.save(data);
    showSuccess('Project saved!');
    return result;
    
  } catch (error) {
    console.error('Save project failed:', error);
    showError('Failed to save project: ' + error.message);
    throw error; // Re-throw if caller needs to handle
  }
}
```

**❌ DON'T:**
```javascript
// No silent failures
async function saveProject(data) {
  try {
    await api.save(data);
  } catch (error) {
    // ❌ Error swallowed, user has no idea what happened
  }
}

// No generic error messages
catch (error) {
  alert('Error'); // ❌ Not helpful
}
```

## 📦 Module Patterns

### File Structure
```javascript
// Imports first
import { supabase } from '../services/supabase.js';
import { showError, showSuccess } from '../utils/notifications.js';
import { getCurrentUser } from './auth.js';

// Constants
const MAX_RETRIES = 3;
const API_ENDPOINT = '/api/projects';

// Private helper functions
function validateInput(data) {
  // ...
}

// Public exported functions
/**
 * Create new project
 * @param {Object} projectData - Project data
 * @returns {Promise<Object>} Created project
 */
export async function createProject(projectData) {
  // ...
}

// Initialization code
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
```

## 🔐 Security Best Practices

### Input Validation
```javascript
// ✅ Always validate and sanitize
function validateEmail(email) {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(email);
}

function sanitizeInput(input) {
  return input.replace(/[<>'"]/g, '');
}

// ✅ Validate before using
async function saveProject(data) {
  if (!data.title || data.title.trim().length === 0) {
    throw new Error('Title required');
  }
  
  const sanitized = {
    title: sanitizeInput(data.title),
    description: sanitizeInput(data.description)
  };
  
  // Now safe to use
}
```

### Sensitive Data
```javascript
// ✅ Use environment variables
const apiKey = import.meta.env.VITE_API_KEY;

// ❌ Never hardcode
const apiKey = 'sk-1234567890'; // ❌ NEVER DO THIS

// ✅ Don't log sensitive data
console.log('User data:', { id: user.id }); // ✅ Safe
console.log('User data:', user); // ❌ May contain sensitive info
```

## ⚡ Performance Best Practices

### DOM Manipulation
```javascript
// ✅ Batch DOM updates
const fragment = document.createDocumentFragment();
items.forEach(item => {
  const li = document.createElement('li');
  li.textContent = item.title;
  fragment.appendChild(li);
});
list.appendChild(fragment);

// ❌ Individual DOM updates
items.forEach(item => {
  const li = document.createElement('li');
  li.textContent = item.title;
  list.appendChild(li); // ❌ Triggers reflow each time
});
```

### Event Listeners
```javascript
// ✅ Event delegation
document.querySelector('.task-list').addEventListener('click', (e) => {
  if (e.target.matches('.delete-btn')) {
    deleteTask(e.target.dataset.id);
  }
});

// ❌ Multiple listeners
tasks.forEach(task => {
  document.querySelector(`#delete-${task.id}`)
    .addEventListener('click', () => deleteTask(task.id));
});
```

### Debouncing
```javascript
// ✅ Debounce expensive operations
import { debounce } from '../utils/helpers.js';

const searchInput = document.getElementById('search');
searchInput.addEventListener('input', debounce((e) => {
  performSearch(e.target.value);
}, 300));
```

## 🧪 Testing Considerations

### Write Testable Code
```javascript
// ✅ Pure, testable function
export function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ❌ Hard to test
function updateUI() {
  const items = document.querySelectorAll('.item');
  const total = Array.from(items)
    .reduce((sum, el) => sum + parseFloat(el.dataset.price), 0);
  document.getElementById('total').textContent = total;
}
```

### Separation of Concerns
```javascript
// ✅ Separate logic and UI
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

function updateTotalDisplay(total) {
  document.getElementById('total').textContent = total;
}

// Easy to test calculateTotal separately
```

## 📚 Documentation Standards

### File Headers
```javascript
/**
 * Project Service
 * 
 * Handles all project-related CRUD operations with Supabase backend.
 * Supports both authenticated mode and demo mode for testing.
 * 
 * @module services/projectService
 * @requires services/supabase
 * @requires utils/demoMode
 */
```

### Function Documentation
```javascript
/**
 * Fetch all projects for current user
 * 
 * In demo mode, returns mock data. In authenticated mode,
 * queries Supabase with RLS policies applied.
 * 
 * @async
 * @param {Object} options - Query options
 * @param {string} [options.status] - Filter by project status
 * @param {number} [options.limit=50] - Maximum results
 * @returns {Promise<Array<Object>>} Array of project objects
 * @throws {Error} If database query fails
 * 
 * @example
 * const projects = await getProjects({ status: 'active', limit: 10 });
 * console.log(`Found ${projects.length} projects`);
 */
export async function getProjects(options = {}) {
  // Implementation
}
```

## 🎯 Code Review Checklist

Before submitting code, verify:

- [ ] Follows naming conventions
- [ ] Has proper error handling
- [ ] Includes JSDoc documentation
- [ ] Uses semantic HTML
- [ ] Accessible (ARIA, keyboard nav)
- [ ] Mobile responsive
- [ ] Works in demo mode
- [ ] No console.log in production
- [ ] No hardcoded values
- [ ] Consistent with existing code
- [ ] No linting errors

---

**Remember**: Clean code is not written by following rules. Clean code is written by caring about your craft and paying attention to details.
