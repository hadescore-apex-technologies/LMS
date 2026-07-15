# Website Performance & User Experience Rules

The website must be highly optimized for speed, performance, and reliability. All development must adhere to the following principles:

## 1. Instant CRUD Operations & UX
- **No Manual Page Reloads**: Implement seamless Create, Read, Update, and Delete (CRUD) operations using AJAX/Fetch/Axios.
- **Optimistic UI Updates**: Update the UI immediately after user actions (e.g., adding, editing, or deleting records) while the backend request processes in the background. Roll back the UI state gracefully if the API fails.
- **Immediate Data Updates**: Ensure all data updates are reflected instantly across components.
- **Zero Page Freezes**: Editing and saving records must happen instantly in the background without blocking the main thread or freezing the UI.
- **No Laggy Transitions**: Navigation and interactions must be smooth, utilizing hardware-accelerated animations (e.g., Framer Motion) without stuttering.

## 2. API & Database Performance
- **Minimize Response Times**: Keep API responses fast. Optimize database queries in the backend (e.g., solve N+1 query problems, use `.select_related()` and `.prefetch_related()` in Django).
- **Graceful Error Handling**: Handle API failures gracefully with user-friendly alerts/toasts instead of breaking the page or showing raw errors.
- **Prevent Duplicate Requests**: Debounce search inputs, disable submit buttons during transit, and prevent double-clicks/duplicate API calls.
- **Optimized Caching & Fetching**: Implement caching where appropriate, reuse data, and split/lazy-load code or components.

## 3. UI/UX Polishing
- **No Loading Screens/Flicker**: Avoid intrusive full-screen loaders or UI flickering. Use subtle inline skeleton screens or spinners only when necessary.
- **Instant Validation**: Provide real-time form validation and immediate visual feedback.
- **Fast Navigation**: Transition smoothly between pages without heavy page reloads.
