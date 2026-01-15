# ProjectHub

Multi-stakeholder project management application

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Screenshots](#screenshots)
- [Getting Started](#getting-started)
- [Installation](#installation)

## Overview

ProjectHub is a project management application for tracking academic, corporate, and EU-funded projects. Built with Vite, Bootstrap 5, and Supabase.

**Target Users:**
- Academic researchers
- Corporate teams
- EU-funded project organizations
- Public sector teams

## Features

### Core Functionality
- **Project Management:** Create, edit, delete projects with multiple types (Academic, Corporate, EU-Funded, Public, Personal)
- **Task Management:** Organize by status (Todo, In Progress, Done) with priorities and due dates
- **File Management:** Upload documents and images with categories
- **Activity Timeline:** Track updates and milestones
- **Dashboard:** Personal stats and recent projects
- **Admin Panel:** User management, system monitoring, charts

### Technical Features
- Responsive design (mobile, tablet, desktop)
- Modern UI with Bootstrap 5
- Secure authentication with RLS
- Real-time updates
- Search and filter
- Form validation
- Offline detection and operation queuing
- Automatic retry with exponential backoff
- Comprehensive error handling

## Tech Stack

**Frontend:** HTML5, CSS3, JavaScript ES6+, Bootstrap 5.3, Bootstrap Icons, Chart.js, Vite

**Backend:** Supabase (PostgreSQL, Auth, Storage, RLS)

**Tools:** Git, GitHub, GitHub Copilot, VS Code, npm

**Deployment:** Netlify

## Screenshots

(To be added after deployment)

## Getting Started

### Prerequisites
- Node.js v18+
- npm v8+
- Supabase account
- Git

### Quick Start
```bash
git clone https://github.com/yourusername/projecthub.git
cd projecthub
npm install
cp .env.example .env
# Edit .env with Supabase credentials
npm run dev
```

## Installation

1. Clone repository
2. Install dependencies: `npm install`
3. Set up Supabase project at [supabase.com](https://supabase.com)
4. Configure `.env` file with Supabase URL and anon key
5. Run dev server: `npm run dev`

## Configuration

Create `.env` file:
```env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

**Important:** Never commit `.env` to Git!

## Database Setup

1. Open Supabase Dashboard → SQL Editor
2. Copy contents from `database/schema.sql`
3. Execute SQL

Creates 5 tables: `profiles`, `projects`, `tasks`, `project_files`, `project_updates`

## Project Structure

```
projecthub/
├── pages/          # HTML pages
├── scripts/        # JavaScript logic
├── services/       # API services
├── styles/         # CSS files
├── utils/          # Helpers
├── database/       # SQL schema
└── index.html      # Landing page
```

## Features in Detail

### Authentication
- Email/password registration and login
- Session management with Supabase Auth
- Secure password requirements
- User profile creation

### Project Management
- Multiple project types supported
- Cover image upload
- Budget tracking
- Start and end date management
- Project status tracking (Planning, Active, Completed, Paused, Archived)
- Public/private visibility settings

### Task Management
- Create tasks with descriptions
- Assign priority levels (1-5)
- Set due dates
- Track task status
- Associate tasks with projects
- Task assignment to team members

### File Management
- Upload project-related files
- Categorize files (Image, Document, Deliverable, Report, Other)
- File type validation
- Size limits (5MB for images, 50MB for documents)
- Secure file storage with Supabase Storage

### Admin Panel
- User management
- Project overview and statistics
- Activity monitoring
- System settings
- Charts and analytics

## Security

- Row Level Security (RLS) enabled on all tables
- Secure authentication with Supabase Auth
- Input validation and sanitization
- XSS protection
- HTTPS enforcement in production
- Environment variables for sensitive data

## Error Handling

- Comprehensive error handling with retry logic
- User-friendly error messages
- Offline detection with operation queuing
- Automatic retry with exponential backoff
- Error logging for debugging

## Usage

**Creating Project:**
1. Login → Dashboard → "+ New Project"
2. Fill details and click "Create Project"

**Managing Tasks:**
1. Open project → Tasks tab → "+ Add Task"
2. Drag between columns to change status

**Admin Panel:**
1. Login with admin account
2. Navigate to Admin Panel
3. Manage users and projects

## Demo Credentials

**User:** demo@projecthub.com / demo123456  
**Admin:** admin@projecthub.com / admin123456

## Development
```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run preview  # Preview production
```

## Deployment

### Deploy to Netlify
1. Connect GitHub repository
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Add environment variables
5. Deploy!

Continuous deployment on every push to main.

## Contributing

1. Fork repository
2. Create feature branch
3. Commit changes
4. Push and create Pull Request

## License

MIT License

## Contact

**Tony Petrov**
- GitHub: @yourusername
- Email: naydenovtony@gmail.com

## Acknowledgments

Built with Supabase, Bootstrap, Chart.js, GitHub Copilot, deployed on Netlify.

---

Made with ❤️ and AI assistance
