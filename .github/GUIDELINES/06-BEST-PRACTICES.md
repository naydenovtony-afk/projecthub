# Best Practices

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

## 🔐 Security Best Practices

### Authentication & Authorization

**✅ DO:**
```javascript
// Check authentication before loading protected pages
async function checkAuth() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    window.location.href = '/pages/login.html';
    return null;
  }
  
  return user;
}

// Use on every protected page
const user = await checkAuth();
if (!user) return;
```

**✅ Use Row Level Security (RLS):**
```sql
-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Users can only see their own projects
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only update their own projects
CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);
```

❌ **DON'T:**
```javascript
// Don't trust client-side checks alone
if (localStorage.getItem('isAdmin')) {  // ❌ Easily bypassed
  showAdminPanel();
}

// Don't expose sensitive data
console.log('User:', user);  // ❌ May contain sensitive info
```

### Input Validation & Sanitization

**✅ DO:**
```javascript
// Validate all user inputs
function validateProjectData(data) {
  const errors = [];
  
  // Required fields
  if (!data.title || data.title.trim().length === 0) {
    errors.push('Title is required');
  }
  
  // Length limits
  if (data.title && data.title.length > 200) {
    errors.push('Title must be less than 200 characters');
  }
  
  // Format validation
  if (data.email && !isValidEmail(data.email)) {
    errors.push('Invalid email format');
  }
  
  return errors;
}

// Sanitize HTML to prevent XSS
function sanitizeHTML(str) {
  const temp = document.createElement('div');
  temp.textContent = str;
  return temp.innerHTML;
}

// Use it before displaying user content
element.textContent = sanitizeHTML(userInput);  // ✅ Safe
```

❌ **DON'T:**
```javascript
// Don't use innerHTML with user input
element.innerHTML = userInput;  // ❌ XSS vulnerability

// Don't skip validation
await supabase.from('projects').insert(formData);  // ❌ No validation
```

### Environment Variables

**✅ DO:**
```javascript
// Use environment variables for sensitive data
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if required variables exist
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing required environment variables');
}
```

**.env file:**
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**.gitignore:**
```
.env
.env.local
.env.production
```

❌ **DON'T:**
```javascript
// Never hardcode credentials
const apiKey = 'sk-1234567890abcdef';  // ❌ NEVER!

// Never commit .env files
git add .env  // ❌ NEVER!
```

### SQL Injection Prevention

**✅ DO:**
```javascript
// Use Supabase query builder (parameterized)
const { data } = await supabase
  .from('projects')
  .select('*')
  .eq('id', projectId);  // ✅ Safe

// Or use prepared statements
const { data } = await supabase.rpc('get_project', { 
  project_id: projectId  // ✅ Safe
});
```

❌ **DON'T:**
```javascript
// Don't build SQL queries with string concatenation
const query = `SELECT * FROM projects WHERE id = '${projectId}'`;  // ❌ SQL injection!
```

## ⚡ Performance Best Practices

### Database Queries

**✅ DO:**
```javascript
// Select only needed columns
const { data } = await supabase
  .from('projects')
  .select('id, title, status')  // ✅ Only what you need
  .limit(20);

// Use pagination
const { data } = await supabase
  .from('projects')
  .select('*')
  .range(0, 19);  // Get first 20 items

// Use indexes for frequently queried columns
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);
```

❌ **DON'T:**
```javascript
// Don't fetch all data
const { data } = await supabase
  .from('projects')
  .select('*');  // ❌ Fetches everything

// Don't make queries in loops
for (const project of projects) {
  const tasks = await getTasks(project.id);  // ❌ N+1 query problem
}

// ✅ Better: Use joins or fetch all at once
const { data } = await supabase
  .from('projects')
  .select('*, tasks(*)');
```

### DOM Manipulation

**✅ DO:**
```javascript
// Batch DOM updates
const fragment = document.createDocumentFragment();
projects.forEach(project => {
  const card = createProjectCard(project);
  fragment.appendChild(card);
});
container.appendChild(fragment);  // ✅ Single reflow

// Cache DOM queries
const container = document.getElementById('projects');
const button = document.getElementById('submitBtn');

// Debounce expensive operations
import { debounce } from '../utils/helpers.js';

searchInput.addEventListener('input', debounce((e) => {
  performSearch(e.target.value);
}, 300));  // ✅ Wait 300ms after typing stops
```

❌ **DON'T:**
```javascript
// Don't update DOM in loops
projects.forEach(project => {
  container.innerHTML += createCard(project);  // ❌ Multiple reflows
});

// Don't query DOM repeatedly
for (let i = 0; i < 100; i++) {
  document.getElementById('item-' + i).textContent = i;  // ❌ Slow
}
```

### Images & Assets

**✅ DO:**
```html
<!-- Use appropriate image formats -->
<img src="logo.svg" alt="Logo">  <!-- ✅ SVG for logos/icons -->
<img src="photo.webp" alt="Photo">  <!-- ✅ WebP for photos -->

<!-- Lazy load images -->
<img src="image.jpg" alt="Description" loading="lazy">

<!-- Responsive images -->
<img 
  srcset="small.jpg 480w, medium.jpg 800w, large.jpg 1200w"
  sizes="(max-width: 600px) 480px, (max-width: 1200px) 800px, 1200px"
  src="medium.jpg" 
  alt="Description">

<!-- Optimize images before uploading -->
<!-- Use tools like TinyPNG, ImageOptim, or Squoosh -->
```

❌ **DON'T:**
```html
<!-- Don't use huge images -->
<img src="10mb-photo.jpg" alt="Photo">  <!-- ❌ Too large -->

<!-- Don't skip alt text -->
<img src="important.jpg">  <!-- ❌ Not accessible -->
```

### Code Splitting

**✅ DO:**
```javascript
// Lazy load heavy libraries
async function loadAI() {
  if (!window.Anthropic) {
    const module = await import('@anthropic-ai/sdk');
    window.Anthropic = module.default;
  }
  return new window.Anthropic();
}

// Load feature code only when needed
document.getElementById('showChat').addEventListener('click', async () => {
  const { initChat } = await import('./team-chat.js');
  initChat();
});
```

## ♿ Accessibility Best Practices

### Semantic HTML

**✅ DO:**
```html
<!-- Use semantic tags -->
<header>
  <nav>
    <ul>
      <li><a href="/">Home</a></li>
    </ul>
  </nav>
</header>

<main>
  <article>
    <h1>Page Title</h1>
    <section>
      <h2>Section Heading</h2>
      <p>Content</p>
    </section>
  </article>
</main>

<footer>
  <p>&copy; 2026 Company</p>
</footer>
```

❌ **DON'T:**
```html
<!-- Don't use divs for everything -->
<div class="header">
  <div class="nav">
    <div class="link"><a href="/">Home</a></div>
  </div>
</div>
```

### ARIA & Labels

**✅ DO:**
```html
<!-- Label all inputs -->
<label for="email">Email</label>
<input type="email" id="email" name="email">

<!-- ARIA labels for icons -->
<button aria-label="Close" title="Close">
  <i class="bi bi-x" aria-hidden="true"></i>
</button>

<!-- ARIA live regions for dynamic content -->
<div role="status" aria-live="polite">
  <span class="visually-hidden">Loading...</span>
</div>

<!-- Landmark roles -->
<div role="search">
  <input type="search" aria-label="Search projects">
</div>
```

### Keyboard Navigation

**✅ DO:**
```javascript
// Support Enter and Space for custom buttons
element.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    handleClick();
  }
});

// Trap focus in modals
modal.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    const focusable = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
});

// ESC to close modals
modal.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
  }
});
```

**✅ Visible Focus Indicators:**
```css
/* Always show focus indicators */
:focus {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}

/* Never remove outlines globally */
/* *:focus { outline: none; }  ❌ BAD! */
```

## 🧪 Testing Best Practices

### Manual Testing Checklist

**Before Deploying:**
- [ ] Test on Chrome, Firefox, Safari, Edge
- [ ] Test on mobile devices (iOS, Android)
- [ ] Test with keyboard only (no mouse)
- [ ] Test with screen reader (NVDA, JAWS, VoiceOver)
- [ ] Test in dark mode
- [ ] Test with slow network (throttle to 3G)
- [ ] Test form validation (valid & invalid inputs)
- [ ] Test error states
- [ ] Test loading states
- [ ] Test empty states
- [ ] Check browser console for errors
- [ ] Verify no 404s in Network tab

### Error Handling

**✅ DO:**
```javascript
async function saveProject(data) {
  try {
    // Show loading state
    showLoading();
    
    // Validate
    const errors = validateProjectData(data);
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }
    
    // Save
    const { data: project, error } = await supabase
      .from('projects')
      .insert(data)
      .select()
      .single();
    
    if (error) throw error;
    
    // Success
    showSuccess('Project saved successfully!');
    return project;
    
  } catch (error) {
    console.error('Save failed:', error);
    showError(`Failed to save project: ${error.message}`);
    throw error;  // Re-throw if caller needs to handle
    
  } finally {
    hideLoading();
  }
}
```

## 📊 Code Quality

### Code Review Checklist

**Before Committing:**
- [ ] Code follows naming conventions
- [ ] Functions are documented with JSDoc
- [ ] Error handling is comprehensive
- [ ] No console.log in production
- [ ] No commented-out code
- [ ] No hardcoded values (use constants)
- [ ] Responsive on all screen sizes
- [ ] Accessible (ARIA, keyboard, semantic HTML)
- [ ] No linting errors
- [ ] Git commit message is descriptive

### Git Commit Messages

**✅ Good commit messages:**
```bash
git commit -m "Add project search functionality"
git commit -m "Fix task deletion not updating UI"
git commit -m "Refactor authentication flow for better UX"
git commit -m "Update README with deployment instructions"
```

**Format:**
```
<type>: <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, missing semi colons, etc.
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding tests
- `chore`: Updating build tasks, package manager configs, etc.

❌ **Bad commit messages:**
```bash
git commit -m "fix"
git commit -m "changes"
git commit -m "update"
git commit -m "asdf"
```

## 🚀 Deployment Best Practices

### Pre-Deployment Checklist

- [ ] All features tested locally
- [ ] No console errors in browser
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] RLS policies enabled
- [ ] Images optimized
- [ ] Meta tags updated (title, description, OG)
- [ ] Favicon added
- [ ] 404 and 500 pages created
- [ ] Redirects configured (Netlify `_redirects`)
- [ ] Analytics configured (if applicable)

### Environment Configuration

**.env (local):**
```bash
VITE_SUPABASE_URL=https://your-dev-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-dev-key
```

**Netlify Environment Variables (production):**
```bash
VITE_SUPABASE_URL=https://your-prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-prod-key
```

### Netlify Configuration

**netlify.toml:**
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**public/_redirects:**
```
/dashboard   /pages/dashboard.html   200
/projects    /pages/projects.html    200
/login       /pages/login.html       200
/*           /pages/404.html         404
```

## 🔄 Maintenance Best Practices

### Regular Tasks

**Weekly:**
- [ ] Check for dependency updates
- [ ] Review error logs
- [ ] Test critical user flows

**Monthly:**
- [ ] Update dependencies (`npm update`)
- [ ] Review and close old issues
- [ ] Audit accessibility
- [ ] Performance audit (Lighthouse)

**Quarterly:**
- [ ] Security audit
- [ ] Database cleanup (remove old data)
- [ ] Review and update documentation

### Documentation

**Keep Updated:**
- README.md - Installation & setup
- GUIDELINES/ - Development guidelines
- API documentation
- Database schema documentation
- Deployment guide

**Code Comments:**
```javascript
/**
 * Calculate project completion percentage
 * 
 * @param {Array<Object>} tasks - Array of task objects
 * @returns {number} Completion percentage (0-100)
 * 
 * @example
 * const progress = calculateProgress(tasks);
 * console.log(`${progress}% complete`);
 */
function calculateProgress(tasks) {
  if (!tasks || tasks.length === 0) return 0;
  
  const completed = tasks.filter(t => t.status === 'done').length;
  return Math.round((completed / tasks.length) * 100);
}
```

## 📈 Monitoring & Analytics

### Error Tracking

**✅ DO:**
```javascript
// Log errors with context
window.addEventListener('error', (event) => {
  console.error('Global error:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });
  
  // Send to error tracking service (e.g., Sentry)
  // trackError(event.error);
});

// Log unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // trackError(event.reason);
});
```

### Performance Monitoring

**✅ Use Lighthouse:**
```bash
# Run Lighthouse audit
npm install -g lighthouse
lighthouse https://yoursite.com --view
```

**✅ Monitor Core Web Vitals:**
- Largest Contentful Paint (LCP) < 2.5s
- First Input Delay (FID) < 100ms
- Cumulative Layout Shift (CLS) < 0.1

## 🎯 Summary Checklist

**Every Feature Should:**
- [ ] Be accessible (WCAG 2.1 AA)
- [ ] Be responsive (mobile-first)
- [ ] Handle errors gracefully
- [ ] Show loading states
- [ ] Show empty states
- [ ] Have proper validation
- [ ] Be secure (input sanitization, RLS)
- [ ] Be performant (lazy loading, pagination)
- [ ] Be documented (JSDoc comments)
- [ ] Be tested (manual testing minimum)

---

**Remember**: Best practices aren't optional—they're the foundation of professional, maintainable software. Follow them consistently!
