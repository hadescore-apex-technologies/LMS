# Apex LMS - Project Overview & Technical Documentation

Welcome to **Apex LMS**, a premium, feature-rich Learning Management System (LMS) built with a modern stack designed for high performance, visual excellence, instant responsiveness, and AI-powered learning.

---

## 1. Tech Stack (Technical Architecture)

The project uses a split architecture (decoupled frontend and backend) managed under a unified Docker orchestration system.

| Layer | Technology | Details / Purpose |
| :--- | :--- | :--- |
| **Frontend Core** | **React 19** & **TypeScript** | Highly typed, structured, and performant frontend client. |
| **Frontend Tooling** | **Vite** & **Oxlint** | High-performance build tooling, fast HMR, and ultra-fast linting. |
| **State Management** | **Redux Toolkit** & **React Query** | Redux Toolkit for global/theme state; TanStack React Query for server cache sync & instant Optimistic UI updates. |
| **Styling & Aesthetics**| **Tailwind CSS** & **Framer Motion** | Utility-first styling with sleek dark/light mode glassmorphism and smooth, hardware-accelerated animations. |
| **AI Assistant** | **Apex AI Tutor Core** | Built-in LLM learning assistant drawer with context-aware Q&A, voice input (Web Speech API), and rich code formatting. |
| **Backend Core** | **Python** & **Django 5.x** | Enterprise-grade backend framework. |
| **API Framework** | **Django REST Framework (DRF)** | RESTful API architecture with typed serializers and custom permissions. |
| **Authentication** | **SimpleJWT** & **OTP Reset** | JWT Bearer authentication with custom role guards (`SUPER_ADMIN`, `STAFF`/`MENTOR`, `STUDENT`) and OTP-based password resets. |
| **Database** | **Supabase PostgreSQL** | Cloud-hosted relational database connected via Supavisor Connection Pooler (Port 5432) for IPv4 network compatibility. |
| **Task Queue & Cron** | **Celery** & **Redis** | Background task processing (e.g. daily subscription deactivations, heavy tasks) and Redis caching. |
| **Email Engine** | **Async SMTP Deliverability Engine** | Non-blocking background thread plain-text email delivery optimized for 100% inbox placement (spam avoidance). |
| **Storage & Video** | **Cloudflare R2** & **Cloudflare Stream** | Cloudflare R2 for S3-compatible file/PDF/homework storage; Cloudflare Stream for secure adaptive HLS/DASH video playback. |
| **PDF Generation** | **ReportLab** | Dynamic backend generation of verified course completion certificates. |
| **Orchestration** | **Docker** & **Nginx** | Docker Compose orchestration for Web, Redis, Worker, Beat, and Nginx reverse proxy. |

---

## 2. Directory Structure

```text
LLM/
├── backend/                  # Django Backend Application
│   ├── apps/                 # Custom Django feature modules
│   │   ├── core/             # Project settings, URL routing, Celery config, Audit logs, emails.py engine
│   │   ├── authentication/   # JWT auth backends, OTP password resets, login serializers
│   │   ├── users/            # Custom user models, Student Profiles, PasswordResetOTP, Attendance
│   │   ├── categories/       # Course categorization and tag mapping
│   │   ├── courses/          # Course definitions, Live Classes, and mentor assignments
│   │   ├── modules/          # Course modules
│   │   ├── lessons/          # Lessons (Markdown, PDFs, attachments, FAQs) and Progress tracking
│   │   ├── videos/           # Cloudflare Stream integration and playback position tracking
│   │   ├── quizzes/          # Quizzes, randomized questions, timers, and attempt tracking
│   │   ├── assignments/      # Homework assignments and submissions (Cloudflare R2)
│   │   ├── certificates/     # PDF Certificate generation (ReportLab) and verification logic
│   │   ├── notifications/    # User in-app notifications
│   │   ├── analytics/        # Role-based dashboard analytics and reporting
│   │   ├── staff/            # Mentor profile management
│   │   └── students/         # Student leaderboards, badges, attendance check-ins
│   ├── db.sqlite3            # SQLite DB (local testing fallback)
│   ├── seed.py               # Database seed script for default users & sample data
│   ├── Dockerfile            # Backend container specification
│   └── requirements.txt      # Python dependencies
│
├── frontend/                 # React Frontend Application
│   ├── src/
│   │   ├── components/       # Reusable components
│   │   │   ├── ApexAITutorCore.tsx  # Interactive AI Tutor with Voice & Code rendering
│   │   │   ├── shared/       # Sidebar, TopHeader navigation
│   │   │   └── student/      # StudentProfile, CalendarView, NotesManager, Leaderboard, Badges, Notifications
│   │   ├── features/         # Redux slices (themeSlice, authSlice)
│   │   ├── layouts/          # Layout wrappers (DashboardLayout)
│   │   ├── pages/            # Role-specific application views & tab panels
│   │   │   ├── admin/        # Admin Dashboard & tabs (StaffManagement, StudentManagement, MentorAssignments, SecurityCenter, etc.)
│   │   │   ├── staff/        # Staff/Mentor Dashboard & tabs (CourseBuilder, StudentManager, Quizzes, Assignments, LiveClasses, etc.)
│   │   │   ├── student/      # Student Dashboard & tabs (Courses, CoursePlayer, Assignments, Discussion, LiveClasses, Certificates, etc.)
│   │   │   └── auth/         # LoginPage, Password Reset
│   │   ├── routes/           # Protected routes & role-based access control guards
│   │   ├── services/         # Axios API instance with JWT interceptors
│   │   ├── store/            # Redux Toolkit store setup
│   │   ├── index.css         # Custom core styling & CSS variables
│   │   └── App.tsx           # Entry React Component
│   ├── tailwind.config.js    # Tailwind styling config
│   ├── vite.config.ts        # Vite build & dev server config
│   └── package.json          # Node dependencies
│
├── docker-compose.yml        # Orchestration (db, redis, web, worker, beat, nginx)
└── nginx.conf                # Nginx proxy routing frontend and backend
```

---

## 3. Core Features by User Role

The platform employs **Role-Based Access Control (RBAC)** across three distinct profiles:

### 👑 A. Super Admin (Owner / Administrator)
*   **Mentor Management & Mentor Assignments**: Create, edit, toggle active status, and assign Mentors/Staff to specific Student cohorts and Categories.
*   **Security Center & Audit Logging**: Track all administrative and staff actions chronologically to ensure operational compliance and system security.
*   **Email Templates & System Announcements**: Create and broadcast global announcements and customize transactional email communications.
*   **Global System Analytics**: Real-time stats on total active/inactive students, active mentors, course metrics, system health, and activity logs.
*   **System Settings**: Configure global application preferences, security policies, and maintenance toggles.

### 🧑‍🏫 B. Mentor (Instructors & Domain Coordinators)
*   **Domain Identification**: Displays the mentor's specific category domain (e.g. *Mentor - Data Analytics*).
*   **Student Manager**: Create student accounts, edit profiles, attach category tags, set course duration/expiration dates (30, 60, 90, 180, 365 days, or custom end dates), and bind certificate codes.
*   **Course Builder**: Design courses, modules, lessons, drag-and-drop order, add Markdown content, PDF attachments, source code files, and lesson FAQs.
*   **Quiz & Assignment Manager**: Build quizzes with randomized question ordering, timers, and attempt limits; review homework uploads, grade submissions, and provide rich written feedback.
*   **Live Class Scheduler**: Schedule Doubt Clearing / Live sessions (Google Meet, Zoom, Teams) mapped to specific courses/categories with automated email alerts to enrolled students.
*   **Forum & Discussion Moderation**: Moderate student Q&A discussions and answer course-related queries.
*   **Certificate Issuer**: Manually trigger or verify completion certificates for qualified students.
*   **Operational Insights**: Monitor pending homework submissions, expiring student accounts (within 7 days), and daily schedule.

### 🎓 C. Student
*   **Interactive Learning Dashboard**: Overview of enrolled courses, completion percentages, submitted assignments, live classes, and achievements.
*   **Apex AI Tutor Drawer**: Built-in AI learning assistant available directly inside the Course Player. Features include:
    *   *Voice Command Support*: Speech-to-text input using Web Speech API.
    *   *Rich Markdown & Syntax Highlighting*: Renders clean code blocks with one-click copy buttons and bold formatting.
    *   *Context-Aware Guidance*: Answers questions specific to the active lesson.
*   **Course Player & Cloudflare Stream Video Player**:
    *   *Resume Playback*: Automatically saves video playback position so students resume right where they left off.
    *   *In-Video Notes & Timestamp Bookmarks*: Add notes at exact video timestamps to jump back anytime.
*   **Interactive Quizzes**: Complete timed quizzes with sequence randomization, immediate automated scoring, and retries limit enforcement.
*   **Homework Submissions**: Upload solution files to Cloudflare R2 and track review status and mentor feedback.
*   **Discussion Board & Live Class Finder**: Engage with peers/mentors in discussions and join live sessions with direct meeting links.
*   **Achievements, Leaderboard & Attendance**: Check daily attendance check-ins, earn badges, and view global student leaderboard standings.
*   **Digital Certificates**: Instant PDF certificate download upon fulfilling course requirements.

---

## 4. Key Workflows & Backend Functionality

### 🔐 1. Authentication & Security (JWT & OTP)
*   **JWT Token Backend**: Custom SimpleJWT implementation enforcing active user status (`is_active=True`) and role validation.
*   **OTP Password Reset Flow**: Secure 6-digit OTP generation and verification (`PasswordResetOTP` model) delivered directly via transactional email.
*   **Frontend Route Guards**: React Router guards dynamically restrict access based on authenticated user role (`SUPER_ADMIN`, `STAFF`, `STUDENT`).

### 📧 2. Email Deliverability Engine (`emails.py`)
To prevent outgoing emails from hitting spam filters:
*   **Plain-Text Deliverability**: Emails are generated in clean plain-text format (avoiding promotional HTML flags).
*   **Non-Blocking Async Execution**: Emails are dispatched in background threads using an in-memory cached SMTP connection (refreshed every 5 minutes), ensuring API responses remain sub-second.

### ⏰ 3. Subscription Expiry Automation (Celery + Redis)
In `backend/apps/core/tasks.py`, a scheduled Celery Beat task runs daily:
```python
@shared_task
def deactivate_expired_students():
    today = timezone.now().date()
    expired_profiles = StudentProfile.objects.filter(end_date__lt=today, user__is_active=True)
    for profile in expired_profiles:
        profile.user.is_active = False
        profile.user.save()
```
If a student's subscription end date passes, their account is set to inactive automatically, denying login until renewed.

### 📂 4. File & Video Management
*   **Cloudflare R2**: Secure object storage for homework uploads, downloadable attachments, and generated PDF certificates.
*   **Cloudflare Stream**: Transcodes lectures into adaptive-bitrate streams (HLS/DASH), providing secure video delivery and precise playback progress tracking.

---

## 5. Key Recent Enhancements & Performance Optimizations

### ⚡ 1. Instant CRUD Operations & Optimistic UI
*   **TanStack React Query Cache Mutation**: Creating, updating, toggling status, or deleting records (Students, Mentors, Courses, Live Classes, Quizzes) updates local UI state instantly.
*   **Zero-Freezes & Graceful Rollback**: Full background sync with automatic cache rollback if an API network call encounters an error. Intrusive full-screen loaders have been replaced with inline feedback.

### 🤖 2. Apex AI Tutor Core Integration
*   Integrated a full-featured AI Tutor drawer within the Student Course Player supporting real-time Q&A, voice recognition, and formatted code blocks.

### ✉️ 3. Optimized Transactional Email System
*   Re-architected `emails.py` with threaded non-blocking execution, cached SMTP credentials, clean header structure, and OTP password recovery.

### 🌐 4. Supavisor Connection Pooler Integration (IPv4 Support)
*   Configured Django's database client to connect via Supavisor pooler (`aws-0-ap-northeast-1.pooler.supabase.com:5432`), resolving IPv4 connection issues seamlessly.

---

## 6. Seed Credentials (For Verification)

To populate sample data and default test accounts, execute `python seed.py` inside the `backend/` directory:

*   **Root Super Admin**:
    *   Email: `hadescore.apex.technologies@gmail.com`
    *   Password: `@Hadescore.com`
.\venv\Scripts\Activate.ps1

python manage.py runserver 0.0.0.0:8000
