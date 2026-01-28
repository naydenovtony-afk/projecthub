# Naming Conventions

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

## 📁 Files & Folders

### HTML Files
**Format:** `kebab-case.html`

✅ **Good Examples:**
```
dashboard.html
project-details.html
user-settings.html
team-chat.html
```

❌ **Avoid:**
```
ProjectDetails.html     (PascalCase)
project_details.html    (snake_case)
projectdetails.html     (no separator)
Dashboard.HTML          (wrong extension case)
```

### JavaScript Files
**Format:** `camelCase.js`

✅ **Good Examples:**
```
projectDetails.js
userAuth.js
demoMode.js
teamChat.js
globalSearch.js
```

❌ **Avoid:**
```
project-details.js      (kebab-case)
UserAuth.js             (PascalCase)
demo_mode.js            (snake_case)
pd.js                   (unclear abbreviation)
```

### CSS Files
**Format:** `kebab-case.css`

✅ **Good Examples:**
```
main.css
project-card.css
dark-mode.css
team-chat.css
animations.css
```

❌ **Avoid:**
```
mainStyles.css          (camelCase)
project_card.css        (snake_case)
ProjectCard.css         (PascalCase)
```

### Folders
**Format:** `lowercase` or `kebab-case`

✅ **Good Examples:**
```
pages/
scripts/
utils/
services/
team-chat/
```

❌ **Avoid:**
```
Pages/                  (PascalCase)
Scripts/                (capitalized)
Utils/                  (capitalized)
team_chat/              (snake_case)
```

## 💻 JavaScript

### Variables
**Format:** `camelCase`

✅ **Good Examples:**
```javascript
const userName = 'John';
const projectList = [];
let isLoading = false;
let currentUser = null;
const searchQuery = '';
```

**Constants (immutable values):**
**Format:** `UPPER_SNAKE_CASE`

```javascript
const API_KEY = 'key';
const MAX_RETRIES = 3;
const DEFAULT_TIMEOUT = 5000;
const BASE_URL = 'https://api.example.com';
```

❌ **Avoid:**
```javascript
const UserName = 'John';        // PascalCase for variables
const project_list = [];        // snake_case
const ISLOADING = false;        // All caps for non-constants
const api_key = 'key';          // snake_case for constants
```

### Functions
**Format:** `camelCase`, verb + noun

✅ **Good Examples:**
```javascript
function getUser() {}
function createProject() {}
function deleteTask() {}
function validateEmail() {}
function handleSubmit() {}
function loadProjects() {}
function saveChanges() {}
function updateStatus() {}
```

**Boolean-returning functions:**
**Format:** `is/has/can/should` + adjective/noun

```javascript
function isValid() {}
function hasPermission() {}
function canEdit() {}
function shouldUpdate() {}
function isAuthenticated() {}
function hasAccess() {}
```

**Event handlers:**
**Format:** `handle` + event + element

```javascript
function handleButtonClick() {}
function handleFormSubmit() {}
function handleInputChange() {}
function handleModalClose() {}
```

❌ **Avoid:**
```javascript
function User() {}              // Looks like class
function project() {}           // Not descriptive
function do_something() {}      // snake_case
function get() {}               // Too vague
function btnClick() {}          // Unclear abbreviation
```

### Classes (if used)
**Format:** `PascalCase`

✅ **Good Examples:**
```javascript
class ProjectManager {}
class UserAuth {}
class DataService {}
class TaskValidator {}
```

❌ **Avoid:**
```javascript
class projectManager {}         // camelCase
class user_auth {}              // snake_case
class dataservice {}            // no separator
```

### Booleans
**Format:** `is/has/can/should` + adjective/noun

✅ **Good Examples:**
```javascript
const isActive = true;
const hasAccess = false;
const canEdit = true;
const shouldUpdate = false;
const isLoading = true;
const hasError = false;
const isAuthenticated = true;
const canDelete = false;
```

❌ **Avoid:**
```javascript
const active = true;            // Ambiguous
const access = false;           // Not clear it's boolean
const edit = true;              // Confusing
const loading = true;           // Could be anything
```

### Arrays & Collections
**Format:** Plural nouns or `entityList/entityArray`

✅ **Good Examples:**
```javascript
const projects = [];
const users = [];
const tasks = [];
const projectList = [];
const taskQueue = [];
const userMap = new Map();
const projectIds = [];
```

❌ **Avoid:**
```javascript
const project = [];             // Singular for array
const data = [];                // Too generic
const arr = [];                 // Abbreviation
const list = [];                // What kind of list?
```

### Objects
**Format:** Singular nouns, camelCase

✅ **Good Examples:**
```javascript
const project = { id: 1, title: 'Project' };
const user = { name: 'John' };
const config = { timeout: 5000 };
const options = { limit: 10 };
```

### Async Functions
**Format:** Same as regular functions, but consider `fetch/load/get` prefixes

✅ **Good Examples:**
```javascript
async function fetchProjects() {}
async function loadUserData() {}
async function saveProject() {}
async function deleteTask() {}
```

## 🎨 CSS

### Classes
**Format:** `kebab-case`, BEM-inspired

✅ **Good Examples:**
```css
/* Component */
.card {}
.btn {}
.navbar {}

/* Element (part of component) */
.card-header {}
.card-body {}
.card-footer {}
.btn-icon {}

/* Modifier (variation) */
.card--highlighted {}
.btn--large {}
.navbar--dark {}

/* Bootstrap utilities */
.text-primary {}
.bg-light {}
.mb-3 {}
.d-flex {}

/* State classes */
.is-active {}
.is-loading {}
.has-error {}
.is-hidden {}
```

❌ **Avoid:**
```css
.Card {}                        /* PascalCase */
.card_header {}                 /* snake_case */
.cardHeader {}                  /* camelCase */
.c1 {}                          /* Cryptic abbreviation */
.myButton {}                    /* Unclear */
```

### IDs
**Format:** `camelCase` (use sparingly)

✅ **Good Examples:**
```html
<div id="userDropdown"></div>
<nav id="mainNavigation"></nav>
<form id="projectForm"></form>
```

**Note:** Prefer classes for styling. Use IDs for:
- JavaScript hooks
- Form labels (`for` attribute)
- Anchor links

❌ **Avoid using IDs for styling:**
```css
/* ❌ Don't style with IDs */
#userDropdown { color: red; }

/* ✅ Use classes instead */
.user-dropdown { color: red; }
```

### CSS Custom Properties (Variables)
**Format:** `--kebab-case`

✅ **Good Examples:**
```css
:root {
  --primary-color: #20b2aa;
  --text-primary: #111827;
  --spacing-md: 1rem;
  --border-radius: 6px;
  --transition-speed: 0.3s;
}
```

## 🏗️ Component Naming

### Page Files
**Pattern:** `feature-name.html`

✅ **Examples:**
```
dashboard.html
projects.html
project-details.html
project-form.html
user-settings.html
team-chat.html
```

### Page Scripts
**Pattern:** `featureName.js` (matches page name in camelCase)

✅ **Examples:**
```
dashboard.js           → dashboard.html
projects.js            → projects.html
projectDetails.js      → project-details.html
projectForm.js         → project-form.html
userSettings.js        → user-settings.html
```

### Service Files
**Pattern:** `entityService.js`

✅ **Examples:**
```
projectService.js      (CRUD for projects)
authService.js         (Authentication)
storageService.js      (File storage)
taskService.js         (Task operations)
notificationService.js (Notifications)
```

❌ **Avoid:**
```
projects.js            (too vague)
auth.js                (could be anything)
storage.js             (generic)
tasks.js               (unclear purpose)
```

### Utility Files
**Pattern:** `descriptiveNoun.js` (plural or category)

✅ **Examples:**
```
validators.js          (validation functions)
helpers.js             (general helpers)
formatters.js          (formatting functions)
constants.js           (constant values)
animations.js          (animation utilities)
notifications.js       (notification system)
```

❌ **Avoid:**
```
utils.js               (too generic)
misc.js                (unclear purpose)
stuff.js               (meaningless)
functions.js           (too vague)
```

## 🗂️ Data & API

### API Endpoints
**Format:** `kebab-case`, RESTful

✅ **Good Examples:**
```
GET    /api/projects
GET    /api/projects/:id
POST   /api/projects
PUT    /api/projects/:id
DELETE /api/projects/:id

GET    /api/project-tasks
GET    /api/user-settings
POST   /api/file-uploads
```

❌ **Avoid:**
```
/api/getProjects       (verb in URL)
/api/ProjectTasks      (PascalCase)
/api/project_tasks     (snake_case)
/api/createNewProject  (too verbose)
```

### Database Tables/Collections
**Format:** `snake_case`, plural

✅ **Good Examples:**
```sql
projects
users
project_tasks
user_profiles
activity_logs
file_attachments
```

❌ **Avoid:**
```sql
project                (singular)
UserProfiles           (PascalCase)
projectTasks           (camelCase)
Projects               (capitalized)
```

### Database Columns
**Format:** `snake_case`

✅ **Good Examples:**
```sql
user_id
project_id
created_at
updated_at
full_name
email_address
is_active
```

❌ **Avoid:**
```sql
userId                 (camelCase)
ProjectId              (PascalCase)
createdAt              (camelCase)
FULL_NAME              (all caps)
```

### Object Properties (from API)
**Format:** `snake_case` (from database) or `camelCase` (in JavaScript)

✅ **From Database (snake_case):**
```javascript
const project = {
  project_id: '123',
  created_at: '2026-01-01',
  user_id: 'abc',
  full_name: 'John Doe'
};
```

✅ **In JavaScript (camelCase):**
```javascript
const project = {
  projectId: '123',
  createdAt: '2026-01-01',
  userId: 'abc',
  fullName: 'John Doe'
};
```

**Convert between formats:**
```javascript
// snake_case to camelCase
function toCamelCase(obj) {
  return Object.keys(obj).reduce((acc, key) => {
    const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    acc[camelKey] = obj[key];
    return acc;
  }, {});
}

// camelCase to snake_case
function toSnakeCase(obj) {
  return Object.keys(obj).reduce((acc, key) => {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    acc[snakeKey] = obj[key];
    return acc;
  }, {});
}
```

## 📝 Comments & Documentation

### File Headers
```javascript
/**
 * Project Details Page
 * 
 * Handles the display and management of individual project information
 * including tasks, files, and activity timeline.
 * 
 * @module scripts/projectDetails
 * @requires scripts/auth
 * @requires services/projectService
 */
```

### Function Documentation
```javascript
/**
 * Get project by ID from database or demo mode
 * 
 * @param {string} projectId - The unique project identifier
 * @returns {Promise<Object|null>} Project object or null if not found
 * @throws {Error} If projectId is invalid
 * 
 * @example
 * const project = await getProject('proj-123');
 * if (project) {
 *   console.log(project.title);
 * }
 */
async function getProject(projectId) {
  // Implementation
}
```

## 🎯 Quick Reference

| Context | Format | Example |
|---------|--------|---------|
| HTML files | kebab-case.html | `project-details.html` |
| JavaScript files | camelCase.js | `projectDetails.js` |
| CSS files | kebab-case.css | `dark-mode.css` |
| Folders | lowercase/kebab-case | `utils/`, `team-chat/` |
| Variables | camelCase | `userName`, `isLoading` |
| Constants | UPPER_SNAKE_CASE | `API_KEY`, `MAX_RETRIES` |
| Functions | camelCase | `getUser()`, `handleClick()` |
| Classes | PascalCase | `ProjectManager` |
| Booleans | is/has/can + noun | `isActive`, `hasAccess` |
| Arrays | plural/list | `projects`, `taskList` |
| CSS classes | kebab-case | `.card-header`, `.is-active` |
| CSS IDs | camelCase | `#userDropdown` |
| CSS variables | --kebab-case | `--primary-color` |
| API endpoints | /kebab-case | `/api/projects` |
| DB tables | snake_case plural | `projects`, `user_profiles` |
| DB columns | snake_case | `user_id`, `created_at` |

## 🚫 Common Mistakes to Avoid

❌ **Mixing conventions:**
```javascript
const user_name = 'John';      // snake_case (wrong)
const userName = 'Jane';       // camelCase (correct)
```

❌ **Unclear abbreviations:**
```javascript
function getPrj() {}            // What's Prj?
function getProject() {}        // Clear!
```

❌ **Generic names:**
```javascript
const data = [];                // What data?
const projects = [];            // Clear!
```

❌ **Hungarian notation:**
```javascript
const strName = 'John';         // Don't prefix types
const name = 'John';            // Clean!
```

❌ **Inconsistent pluralization:**
```javascript
const projectList = [];         // Be consistent
const project = [];             // Confusing
const projects = [];            // Clear!
```

## ✅ Best Practices

1. **Be Descriptive**: `getUserProjects()` > `get()`
2. **Be Consistent**: Choose one pattern and stick to it
3. **Be Clear**: `isAuthenticated` > `auth`
4. **Use Full Words**: `button` > `btn` (except standard abbreviations)
5. **Follow Conventions**: Use established patterns in the codebase
6. **Think About Readers**: Code is read more than written

---

**Remember**: Good names make code self-documenting. Spend time choosing the right name!
