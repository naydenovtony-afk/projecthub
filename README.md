# ProjectHub

A multi-stakeholder project management platform for academic, corporate, and EU-funded teams. Built with Vite, Bootstrap 5, and Supabase.

[![Netlify Status](https://api.netlify.com/api/v1/badges/your-badge-id/deploy-status)](https://tranquil-gumdrop-ec5603.netlify.app)
&nbsp;
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

**Live Demo:** [tranquil-gumdrop-ec5603.netlify.app](https://tranquil-gumdrop-ec5603.netlify.app)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Permission Model](#permission-model)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [Demo Credentials](#demo-credentials)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

---

## Overview

ProjectHub is a full-featured, role-based project tracker designed for teams that need structured collaboration across different organisation types.

**Target users:**
- 🎓 Academic researchers & university groups
- 🏢 Corporate / business teams
- 🇪🇺 EU-funded project organisations
- 🏛️ Public sector & community initiatives

---

## Features

### 🗂️ Project Management
- Create projects with type, status, budget, and timetable
- Project types: Academic & Research, Corporate/Business, EU-Funded, Public Initiative, Personal/Other
- Project statuses: Planning → Active → Completed / Paused / Archived
- Cover image upload, public/private visibility toggle
- Project stages (milestones) with sort ordering

### ✅ Task Management
- Full task board with status management
- Task statuses: `todo` → `in_progress` → `pending_review` → `done`
- Priority levels: Low, Medium, High
- Due dates, assignees, and descriptions
- Role-aware workflow — Team Members submit for review; PMs/PCs approve or reject
- Admin can view full task details and edit/delete any task across all projects

### 👥 Team & Role Management
- Invite members to projects with specific roles
- Role change & removal (respects hierarchy)
- Temporary PM delegation
- Full audit trail of membership events

### 📁 File Management
- Upload files per project (images, documents, deliverables, reports)
- File categories, captions, size display
- Secure storage via Supabase Storage
- Admin can view file metadata in a detail modal and edit/delete any file

### 🔔 Notifications
- In-app notification centre
- Events: task assigned, task review requested, task approved/rejected, member added/removed, role changed, project updated
- Real-time delivery via Supabase subscriptions
- Mark individual or all as read

### 💬 Team Chat
- Project-scoped chat rooms
- Real-time messaging with Supabase Realtime
- Unread message counts

### 🔍 Global Search
- Search across projects, tasks, and users from the navbar
- Keyboard shortcut (Ctrl/⌘ + K)

### 📊 Dashboard
- Personal stats: owned projects, tasks, completions
- Recent project cards
- Gantt-style timeline view
- Activity feed and audit log widgets
- Charts: project type distribution, status breakdown

### 🛡️ Admin Panel
- **Users tab** — view profiles, change roles, reset passwords, delete users
- **Projects tab** — edit title/status via modal, view on project page, delete with cascade
- **Stages tab** — edit title/status/sort order via modal, delete
- **Tasks tab** — View button opens full task detail modal (status, priority, due date, assignee, description); Edit and Delete with confirmation
- **Files tab** — View button opens file info modal (icon by type, size, upload date, caption, Open File link for real uploads); Edit metadata and Delete
- **Activity Log** — filterable audit trail with CSV export
- **Settings** — maintenance mode, allow registrations, max file size, site announcement
- Charts: project type pie, status bar chart

### 🎭 Demo Mode
- Fully functional offline demo with seeded data
- All CRUD operations work in-memory (not persisted)
- Auto-login as demo user or admin

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, JavaScript ES6+, Bootstrap 5.3, Bootstrap Icons |
| Charts | Chart.js 4 |
| Build tool | Vite |
| Backend / DB | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| Auth | Supabase Auth (email/password) |
| Deployment | Netlify (CI/CD from GitHub) |
| Version Control | Git / GitHub |
| AI Assistance | GitHub Copilot |

---

## Project Structure

```
projecthub/
├── index.html                  # Landing page
├── vite.config.js
├── package.json
│
├── pages/                      # HTML pages
│   ├── dashboard.html
│   ├── projects.html
│   ├── project-details.html
│   ├── project-form.html
│   ├── project-users.html
│   ├── tasks.html
│   ├── files.html
│   ├── chats.html
│   ├── notifications.html
│   ├── profile.html
│   ├── settings.html
│   ├── admin.html
│   ├── login.html
│   ├── register.html
│   ├── demo.html
│   ├── 404.html
│   └── 500.html
│
├── scripts/                    # Page controllers
│   ├── admin.js
│   ├── auth.js
│   ├── chats.js
│   ├── dashboard.js
│   ├── files.js
│   ├── notifications-page.js
│   ├── profile.js
│   ├── project-details.js
│   ├── project-form.js
│   ├── project-users.js
│   ├── projects.js
│   ├── settings.js
│   ├── tasks.js
│   ├── theme.js
│   ├── globalSearch.js
│   ├── gantt-timeline.js
│   └── components/             # Reusable UI widgets
│       ├── NavBar.js
│       ├── ProjectCard.js
│       ├── ProjectHeader.js
│       ├── TaskBoard.js
│       ├── FileManager.js
│       ├── StatsWidget.js
│       ├── ChartsWidget.js
│       ├── ActivityFeedWidget.js
│       ├── AuditLogWidget.js
│       └── RecentProjectsWidget.js
│
├── services/                   # Business logic / Supabase calls
│   ├── supabase.js             # Client initialisation
│   ├── projectService.js
│   ├── taskService.js
│   ├── memberService.js
│   ├── projectPermissions.js   # RBAC engine + task state machine
│   ├── notificationService.js
│   ├── chatService.js
│   ├── storageService.js
│   └── openaiService.js        # AI assistant integration
│
├── utils/                      # Pure helpers
│   ├── helpers.js
│   ├── validators.js
│   ├── ui.js
│   ├── errorHandler.js
│   ├── notifications.js
│   ├── animations.js
│   ├── demoMode.js             # Seeded in-memory demo data
│   └── generatePlaceholders.js
│
├── styles/
│   ├── main.css
│   ├── themes.css              # Light / dark theme variables
│   ├── landing.css
│   ├── project-details.css
│   ├── team-chat.css
│   ├── gantt-chart.css
│   ├── animations.css
│   └── search.css
│
├── database/                   # SQL files for reference
│   ├── schema.sql
│   └── seed-demo-data.sql
│
├── supabase/
│   ├── config.toml
│   └── migrations/             # Applied Supabase migrations (in order)
│       ├── 202602170001_core_schema.sql
│       ├── 202602170002_contacts_and_sharing.sql
│       ├── 202602170003_team_chat.sql
│       ├── 202602190001_project_members_and_member_access.sql
│       ├── 202602200001_project_stages.sql
│       ├── 202602200002_seed_demo_data.sql
│       ├── 202602200003_bootstrap_demo_users_and_seed.sql
│       └── 202602280001_project_roles.sql
│
└── public/
    └── _redirects              # Netlify SPA routing
```

---

## Database Schema

### Core Tables

| Table | Description |
|---|---|
| `profiles` | User accounts — extends Supabase auth.users |
| `projects` | Projects with type, status, budget, dates |
| `project_members` | Project membership with role (PM / PC / TM) |
| `project_stages` | Milestone stages linked to a project |
| `tasks` | Tasks with status workflow and priority |
| `project_files` | File metadata (url, type, size, category) |
| `project_audit_log` | Append-only activity log |
| `notifications` | Per-user in-app notifications |
| `chat_rooms` | Project-scoped chat rooms |
| `chat_messages` | Real-time messages inside rooms |

### ERD

Full ERD diagram: [assets/diagrams/database-erd.svg](assets/diagrams/database-erd.svg)

---

## Permission Model

### System roles (`profiles.role`)

| Role | Description |
|---|---|
| `user` | Default for all registered users |
| `admin` | Full platform admin access |

### Project roles (`project_members.role`)

| Role | Capabilities |
|---|---|
| `project_manager` | Full project control — edit, delete, archive, manage budget, manage all tasks & files, change member roles, delegate PM |
| `project_coordinator` | Create/edit tasks, approve reviews, invite TMs, remove TMs, upload & delete TM files |
| `team_member` | View project, move own tasks to `pending_review`, upload own files, add comments |

### Task status state machine

```
todo ──► in_progress ──► pending_review ──► done
              ▲                │               │
              └────────────────┘ (PM/PC reject) │
              ◄──────────────────────────────── ┘ (PM reopen)
```

---

## Getting Started

### Prerequisites

- Node.js v18+
- npm v8+
- A [Supabase](https://supabase.com) project
- Git

### Quick Start

```bash
git clone https://github.com/yourusername/projecthub.git
cd projecthub
npm install
cp .env.example .env
# Fill in your Supabase credentials in .env
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Configuration

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

> ⚠️ Never commit `.env` to Git. It is already in `.gitignore`.

---

## Database Setup

1. Open your **Supabase Dashboard** → SQL Editor
2. Run migrations in order from `supabase/migrations/`
3. (Optional) Run `database/seed-demo-data.sql` for test data

> **Or** use the Supabase CLI:
> ```bash
> supabase db push
> ```

---

## Demo Credentials

The live demo runs entirely in-memory — no real data is written.

| Role | Email | Password |
|---|---|---|
| User | `demo@projecthub.com` | `Demo12345!` |
| Admin | `admin@projecthub.com` | `Admin12345!` |

---

## Development

```bash
npm run dev       # Start Vite dev server (http://localhost:5173)
npm run build     # Production build → /dist
npm run preview   # Preview production build locally
```

---

## Deployment

### Netlify (recommended)

1. Connect your GitHub repository on [netlify.com](https://netlify.com)
2. Set build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
3. Add environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in Netlify → Site settings → Environment
4. Deploy — every push to `main` triggers a new deploy automatically

The `public/_redirects` file handles SPA routing (`/* /index.html 200`).

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## License

MIT License © 2026 Tony Petrov

---

## Contact

**Tony Petrov**
- GitHub: [@naydenovtony](https://github.com/naydenovtony)
- Email: naydenovtony@gmail.com

---

*Built with ❤️ using Supabase, Bootstrap 5, Vite, Chart.js, and GitHub Copilot.*
