# Apex LMS - Project Overview & Technical Documentation

Welcome to **Apex LMS**, a premium, feature-rich Learning Management System (LMS) built with a modern stack designed for high performance, visual excellence, and instant responsiveness.

---

## 1. Tech Stack (Technical Architecture)

The project uses a split architecture (decoupled frontend and backend) managed under a unified Docker orchestration system.

| Layer | Technology | Details / Purpose |
| :--- | :--- | :--- |
| **Frontend Core** | **React 19** & **TypeScript** | Structured and typed frontend application. |
| **Frontend Tooling** | **Vite** & **Oxlint** | High-performance bundler and extremely fast linting. |
| **State Management** | **Redux Toolkit** & **React Query** | Global client state management (Redux) and server cache sync (React Query). |
| **Styling & Animation** | **Tailwind CSS** & **Framer Motion** | Utility-first styling with smooth, hardware-accelerated animations. |
| **Backend Core** | **Python** & **Django 5.x** | Enterprise-grade backend framework. |
| **API Framework** | **Django REST Framework (DRF)** | RESTful API design. |
| **Authentication** | **SimpleJWT** (Custom Auth Backend) | JWT Token authentication with custom roles (`SUPER_ADMIN`, `STAFF`, `STUDENT`). |
| **Database** | **Supabase PostgreSQL** | Cloud-hosted relational database connected via Supavisor Connection Pooler (Port 5432) for IPv4 support. |
| **Task Queue** | **Celery** & **Redis** | Background jobs (e.g. daily cron tasks) and task caching. |
| **Realtime** | **Django Channels** & **Channels Redis** | WebSocket support for notifications or live updates. |
| **Storage & Video** | **Cloudflare R2** & **Cloudflare Stream** | S3-compatible cloud storage for attachments/certificates, and secure video streaming. |
| **Orchestration** | **Docker** & **Nginx** | Docker-compose for service management and Nginx as a reverse proxy. |

---

## 2. Directory Structure

```text
LLM/
├── backend/                  # Django Backend Application
│   ├── apps/                 # Custom Django apps implementing LMS features
│   │   ├── core/             # Project settings, URL routing, Celery config, Audit logs
│   │   ├── authentication/   # JWT authentication backends and token logic
│   │   ├── users/            # Custom user models, Student Profiles, Attendance, Login logs
│   │   ├── categories/       # Course categorization
│   │   ├── courses/          # Course definition and Live Classes
│   │   ├── modules/          # Course modules
│   │   ├── lessons/          # Lessons (Markdown, PDFs, links) and Progress tracking
│   │   ├── videos/           # Cloudflare Stream integration details
│   │   ├── quizzes/          # Quizzes, Questions, and Student quiz attempts
│   │   ├── assignments/      # Assignments and Homework submissions
│   │   ├── certificates/     # PDF Certificate generation and issuance
│   │   ├── notifications/    # User in-app notifications
│   │   └── analytics/        # Role-based dashboard performance analytics
│   ├── db.sqlite3            # SQLite DB (fallback/local testing)
│   ├── seed.py               # Seed script to prepopulate database
│   ├── Dockerfile            # Container definition for Backend
│   └── requirements.txt      # Python dependencies
│
├── frontend/                 # React Frontend Application
│   ├── src/
│   │   ├── components/       # Reusable components (Student profile, Managers, etc.)
│   │   ├── features/         # Feature-specific components and UI blocks
│   │   ├── layouts/          # Page layouts (e.g., DashboardLayout)
│   │   ├── pages/            # View pages (Login, Dashboard, Admin, Staff, Student)
│   │   ├── routes/           # Routing and Protected Routes (Role guards)
│   │   ├── services/         # API HTTP services (Axios configuration)
│   │   ├── store/            # Redux store and slices (auth, UI)
│   │   ├── index.css         # Custom core CSS
│   │   └── App.tsx           # Entry React Component
│   ├── tailwind.config.js    # Tailwind styling config
│   ├── vite.config.ts        # Vite configuration
│   └── package.json          # Node dependencies and scripts
│
├── docker-compose.yml        # Orchestration file (db, redis, web, worker, beat, nginx)
└── nginx.conf                # Nginx proxy routing frontend and backend
```

---

## 3. Core Features by User Role

The platform employs **Role-Based Access Control (RBAC)** across three distinct profiles:

### 👑 A. Super Admin (Owner / Administrator)
*   **Mentor Management**: Create, view, update, and toggle active status of Mentors (Staff).
*   **Audit Logging**: Monitor all administrative and staff actions chronologically to ensure operational compliance.
*   **Global Dashboard Stats**: Monitor total courses, total active/inactive students, active mentors, and recent system actions.

### 🧑‍🏫 B. Mentor (Instructors & Domain Coordinators)
*   **Role Identification**: Formerly referred to as "Operations Staff", now unified as **Mentor**. The UI dynamically displays the mentor's specific domain/category name (e.g. *Mentor - Data Analytics*).
*   **Student Manager**: Create student accounts, edit profiles, attach category tags, set course duration/expiration dates (30, 60, 90, 180, 365 days, or custom durations).
*   **Course Builder**: Design courses, modules, lessons, and drag-and-drop ordering.
*   **Category management**: Create and map tags (e.g., *Data Analytics*, *Python*, *AI*) to group courses and filter student access.
*   **Video Manager**: Securely stream and organize lectures using Cloudflare Stream.
*   **Live Class Scheduler**: Create scheduled Google Meet/Zoom/Teams classes mapped to specific courses.
*   **Assignment Grading**: Review student homework files (stored in R2), write rich feedback, input grades, and view automated plagiarism scores.
*   **Certificate Issuer**: Manually generate and issue official completion PDF certificates.
*   **Operational Insights**: Tracks pending submissions, upcoming expiring students (within 7 days), and today's live classes.

### 🎓 C. Student
*   **Interactive Learning Dashboard**: Lists course progress, completed lessons, assignments submitted/graded, and achievements.
*   **Category-Based Course Access**: Students only see courses belonging to the categories assigned to them by Staff.
*   **Rich Lessons**: Interact with markdown course content, download supporting files (PDF, PPT, ZIP source code), and view FAQs.
*   **Custom Video Player (Cloudflare Stream)**: Play lecture videos with features like:
    *   *Resume Playback*: Automatically saves video playback position so students can resume from where they left off.
    *   *Progress Tracking*: Tracks percentage of video watched to determine overall lesson completion.
*   **In-Video Notes & Bookmarks**: Add notes and bookmark specific seconds of the video to quickly jump back to that timestamp later.
*   **Quiz Engine**: Attempt module-level quizzes. Features:
    *   Timers (automatically submits on expiration).
    *   Question types (MCQ, True/False, Multiple Select).
    *   Sequence randomization.
    *   Defined passing scores & retries limits.
*   **Homework Submissions**: Upload homework solutions (stored in Cloudflare R2) and monitor grading status.
*   **Live Class Finder**: Directly find and join live streams/meetings.
*   **Achievements, Leaderboard & Attendance**: Check daily attendance, check achievements, and view leaderboard position.
*   **Digital Certificates**: Download verification PDFs when course requirements are satisfied.

---

## 4. Key Workflows & Backend Functionality

### 🔐 1. Authentication Flow
Authentication is handled via JWT. The custom authenticator:
1.  Verifies the bearer token.
2.  Ensures that the token user is currently active (`is_active=True`).
3.  Injects the user's role into the request context.
On the frontend, **React Router guards** block unauthorised routes:
*   `/admin/*` -> Requires `SUPER_ADMIN`
*   `/staff/*` -> Requires `STAFF` or `SUPER_ADMIN`
*   `/student/*` -> Requires `STUDENT`

### ⏰ 2. Subscription Expiry Automation (Celery + Redis)
In `backend/apps/core/tasks.py`, a scheduled Celery Beat task runs daily:
```python
# deactivate-expired-students-daily
@shared_task
def deactivate_expired_students():
    today = timezone.now().date()
    expired_profiles = StudentProfile.objects.filter(end_date__lt=today, user__is_active=True)
    for profile in expired_profiles:
        profile.user.is_active = False
        profile.user.save()
        # Log action under System AuditLog
```
If a student's end date is older than today, they are automatically set to inactive, blocking them from logging in.

### 📂 3. File & Video Management
*   **Documents & PDFs**: Uploaded directly to a secure **Cloudflare R2 Bucket** via signed URLs or back-end orchestration.
*   **Videos**: Integrated with **Cloudflare Stream** API. Videos are processed and transcoded into adaptive-bitrate streams, providing robust copy protection and smooth playback on all devices.

---

## 5. Recent Enhancements & Performance Optimizations

### ⚡ 1. Instant CRUD Operations (Optimistic UI)
*   **Cache Mutation Hijacking**: The application uses TanStack React Query to implement optimistic updates.
*   **Zero Page Freezes & Spinner Removal**: When creating, modifying, toggling status, or deleting records (for Students, Mentors, and Live Sessions), the cache is modified immediately on user action. If the backend fails, React Query triggers a **graceful rollback** to restore the previous state.
*   **NoIntrusive Loaders**: Spinners are hidden during CRUD operations, leaving only seamless inline transitions.

### 🔗 2. Simplified Certificate Enrollment
*   **Direct File Upload**: The "Select Course Track" step in Student Creation/Modification is removed. Certificate code input and PDF file upload are shown directly.
*   **Auto Course Selection**: The frontend automatically binds the student certificate to the first available course track via React `useEffect` in the background.

### 🌐 3. IPv4 database connection compatibility
*   **Supavisor Pooler Integration**: Configured Django's database client to connect to `aws-0-ap-northeast-1.pooler.supabase.com` on port `5432` with regional tenant prefix `postgres.scltqowxstewytlvixtw`. This resolves connection refusal / name translation issues on IPv4-only networks.

---

## 6. Seed Users (For Verification)

If you are running the project locally or setting up the database for the first time, you can run `python seed.py` inside the `backend/` folder to create the following default credentials:

*   **Super Admin**:
    *   Email: `admin@apex.com`
    *   Password: `admin123`
*   **Staff / Mentor**:
    *   Email: `staff@apex.com`
    *   Password: `staff123`
*   **Student**:
    *   Email: `student@apex.com`
    *   Password: `student123`
