# Copilot Instructions for Collabo-Tool

## Project Overview
This is a sophisticated hackathon collaboration tool built with **SvelteKit 5**, **TypeScript**, and **Tailwind CSS 4** frontend, plus a **Node.js/Express** backend with **PostgreSQL** database integration. The frontend is currently a fully-featured demo with simulated data, while the backend provides production-ready API infrastructure.

**Project Structure**:
- **Frontend**: SvelteKit 5 app with role-based authentication, real-time chat, broadcast messaging, and comprehensive admin management interfaces
- **Backend**: Express.js API server with JWT authentication, PostgreSQL integration, comprehensive user management, and security features

**Development Mode**: Frontend uses simulated data (in-memory stores and localStorage) for immediate functionality. Backend provides production-ready API infrastructure that can be integrated when needed.

## Development Workflows

### Quick Start
**Frontend Development**:
```bash
cd frontend
npm run dev -- --open  # Auto-opens browser at localhost:5173
```

**Backend Development**:
```bash
cd backend
npm run dev  # Starts Express server at localhost:4000
```

**Network Config**: 
- Frontend dev server exposes on `0.0.0.0:5173` with ngrok support (`allowedHosts: ['.ngrok-free.app']`)
- Backend API server runs on `localhost:4000` with CORS enabled for frontend integration

### Testing Strategy
**Frontend Testing**:
- **Svelte Components**: Use `.svelte.test.ts` suffix → browser environment with Playwright
- **Utilities/Logic**: Use `.test.ts` suffix → Node environment
- Commands: `npm run test:unit` (watch) | `npm test` (single run)
- Multi-project Vitest setup in `vite.config.ts` handles environment switching automatically

**Backend Testing**:
- Health check available at `GET /health`
- API routes under `/api/auth/*` for authentication endpoints
- No test suite currently configured

### Code Quality Pipeline
```bash
npm run check    # Svelte type checking
npm run lint     # ESLint + Prettier validation
npm run format   # Auto-format codebase
```

## Architecture Patterns

### Backend Project Structure
**Project Architecture**: Clean layered architecture with separation of concerns

**Directory Structure & Responsibilities**:
```
backend/
├── models/          # Database interaction layer (PostgreSQL)
│   ├── user.model.js        # User CRUD operations, password hashing, formatting
│   ├── session.model.js     # JWT session management, token validation
│   ├── otp.model.js         # OTP generation, verification, cleanup
│   ├── role.model.js        # Role definitions and permissions
│   └── user-role.model.js   # User-role relationship management
├── services/        # Business logic layer
│   └── auth.service.js      # Authentication workflows, OTP generation, validation
├── controllers/     # HTTP request/response handling
│   └── auth.controller.js   # Route handlers, request validation, response formatting
├── routes/          # API endpoint definitions
│   └── v1/auth.routes.js    # Route definitions with validation middleware
├── auth/            # Authentication middleware
│   ├── requireAuth.js       # JWT token validation middleware
│   └── requireRole.js       # Role-based authorization middleware
├── config/          # Configuration management
│   ├── index.js             # Environment variables
│   ├── db.js                # PostgreSQL connection pool
│   └── api.js               # API endpoints and settings centralization
└── utils/           # Utility functions
    ├── errors.js            # Custom error classes (HttpError, BadRequestError, etc.)
    ├── otp.js               # OTP generation and verification utilities
    └── validate.js          # Express-validator error handling
```

**Data Flow Pattern**:
`Route → Controller → Service → Model → Database`
- **Routes**: Define endpoints + validation rules
- **Controllers**: Handle HTTP concerns, call services  
- **Services**: Business logic, coordinate multiple models
- **Models**: Database operations, data formatting
- **Config**: Centralized settings, database connections

### Frontend Project Structure  
**SvelteKit 5 Architecture**: File-based routing with role-based access control

**Directory Structure & Responsibilities**:
```
frontend/src/
├── routes/                  # Page components (SvelteKit file-based routing)
│   ├── +layout.svelte              # Global layout with conditional navigation
│   ├── +page.svelte                # Root page (redirects to /login)
│   ├── login/                      # Authentication pages
│   ├── chat/+page.svelte           # Main chat interface (landing page)
│   ├── admin/                      # Admin module pages
│   │   ├── user-management/        # User CRUD, bulk operations, role assignments
│   │   ├── ou-management/          # Organizational unit hierarchy management
│   │   ├── chat-management/        # Chat permissions, message moderation
│   │   ├── broadcast-management/   # System-wide messaging control
│   │   ├── global-configuration/   # System settings, security policies
│   │   └── admin-logs/             # Audit trail and activity monitoring
│   └── profile/                    # User profile management
├── lib/
│   ├── components/                 # Reusable UI components
│   │   ├── Navigation.svelte       # Main navigation with admin dropdown
│   │   ├── ProfileAvatar.svelte    # User avatar display
│   │   ├── GroupAvatar.svelte      # Group chat avatar
│   │   └── ConfirmationModal.svelte # Delete/action confirmations
│   ├── stores/                     # State management (Svelte 5 runes)
│   │   ├── auth.svelte.ts          # Authentication state, role permissions
│   │   ├── broadcast.svelte.ts     # Broadcast message management
│   │   └── theme.svelte.ts         # UI theme and preferences
│   └── utils/                      # Helper functions and utilities
└── app.css                         # Global styles with predefined component classes
```

**Store Architecture Pattern**:
- **Class-based stores** using Svelte 5 runes within class constructors
- **Permission getters** for role-based UI conditional rendering
- **Demo data initialization** for immediate frontend functionality without backend

### Svelte 5 Component Conventions
```svelte
<script lang="ts">
  // Use $state() for mutable state
  let users = $state<User[]>([]);
  
  // Use $props() for component props with destructuring
  let { user, size = 'md' }: { user?: User; size?: 'sm' | 'md' | 'lg' } = $props();
  
  // Use $derived() for computed values
  let initials = $derived(user ? `${user.firstName[0]}${user.lastName[0]}` : 'U');
  
  // Prefer onclick over on:click for TypeScript support
  <button onclick={handleClick}>Click</button>
</script>
```

### Store Architecture - Class-Based Pattern
```typescript
// src/lib/stores/auth.svelte.ts
class AuthStore {
  user = $state<User | null>(null);
  isAuthenticated = $state(false);
  
  // Permission getters for role-based access
  get canAccessAdmin() { return this.user?.role === 'admin'; }
  get canSendBroadcasts() { return ['admin', 'manager', 'supervisor', 'support'].includes(this.user?.role || ''); }
  
  // Initialize with demo data for frontend-only behavior
  constructor() {
    this.user = { id: '1', username: 'admin', role: 'admin', /* ... */ };
    this.isAuthenticated = true;
  }
}

export const authStore = writable(new AuthStore());
```

### CSS Hybrid Approach
- **Global Utilities**: Use predefined classes from `app.css` (`.primary-button`, `.secondary-button`, `.input-field`)
- **Component Styles**: Regular CSS in `<style>` blocks (never use `@apply` directives)
- **Tailwind Classes**: Utility classes for layout, spacing, colors in templates
- **Brand Colors**: Primary `#01c0a4` (aqua green), neutral greys (#374151, #f9fafb)

## Critical Architecture Knowledge

### Role Hierarchy & Permissions
**Hierarchy**: admin > manager > supervisor > support > frontline
```typescript
// Permission pattern used throughout admin interfaces
get canAccessAdmin() { return this.user?.role === 'admin'; }
get canManageUsers() { return ['admin', 'manager'].includes(this.user?.role || ''); }
```

### Navigation & Layout System
- `+layout.svelte` conditionally shows `Navigation.svelte` based on `noNavPages` array
- Hidden on: auth routes (`/login`, `/otp`, etc.) and `/chat` (main landing)
- Admin dropdown in navigation provides access to 6 admin modules
- Navigation uses `isActivePage()` helper for active state styling

### Testing Configuration Specifics
**Dual Environment Setup** in `vite.config.ts`:
- Client tests (`.svelte.test.ts`) → browser environment with Playwright
- Server tests (`.test.ts`) → Node environment  
- Use `render()` from `vitest-browser-svelte` for component testing
- Setup file: `vitest-setup-client.ts` for browser environment

### Admin Interface Architecture
**Modal Pattern**: Complex forms use split-panel modals (form left, rules/settings right)
**Bulk Operations**: CSV import with role-specific field validation  
**Hierarchical Views**: Team/supervisor relationships displayed in expandable tree views
**Unified Layout**: All admin pages share consistent navigation via admin `+layout.svelte`

### Chat System Architecture
**File Sharing Permissions**: Granular access control (per person, per role, per OU, and dynamic combinations like "per role of OU")
**Message Forwarding**: Disabled by default, configurable at global, OU, and role levels
**Read Status Indicators**: Messenger-like greyed text for read conversations in navigation
**Pinned Messages**: Disabled by default, configurable at group/global/OU/role levels with transparent panel UI
**Media Compilation**: Organized tabs for Files/Attachments, Media (Images/Videos), and Links in member panel area
**Group Creation**: Extended modal with search functionality and separate selected members panel showing OU and role

## Tailwind CSS 4 Configuration
- **Import Syntax**: `@import 'tailwindcss'` in `app.css` (not the old `@tailwind` directives)
- **Plugins**: Uses `@plugin '@tailwindcss/forms'` and `@plugin '@tailwindcss/typography'`
- **Vite Integration**: Configured via `tailwindcss()` plugin in `vite.config.ts`
- **Critical**: Never use `@apply` in component `<style>` blocks - use regular CSS properties

## Common Patterns & Anti-patterns

### ✅ Do This
```svelte
<!-- Use onclick with TypeScript support -->
<button onclick={handleClick}>Submit</button>

<!-- Mix utilities with component CSS -->
<div class="flex items-center space-x-4">
  <div class="avatar">Content</div>
</div>

<style>
  .avatar {
    border-radius: 9999px;  /* Regular CSS, not @apply */
    background: #01c0a4;
  }
</style>
```

### ❌ Avoid This
```svelte
<!-- Don't use on:click (Svelte 4 pattern) -->
<button on:click={handleClick}>Submit</button>

<!-- Don't use @apply in component styles -->
<style>
  .avatar {
    @apply rounded-full bg-primary;  /* WRONG */
  }
</style>
```

### Key Development Notes
- **Mock Data**: All frontend stores initialize with demo data for immediate functionality
- **Backend Integration**: Production-ready Express API available but frontend currently uses simulated data
- **API Structure**: RESTful endpoints under `/api/auth/*` with JWT authentication and validation middleware
- **Database Ready**: PostgreSQL user model with comprehensive field mapping and security features
- **Role-based UI**: Check permissions before showing admin features or sensitive operations  
- **Reactive Patterns**: Use `$derived()` for computed values, `$state()` for mutable state
- **Icon System**: Consistent use of Lucide Svelte icons throughout the application
- **Teams-like UI**: Professional grey navigation background with white content areas
- **Chat Features**: File sharing with granular permissions, forwarding controls, read status indicators, pinned messages, and media compilation
- **UI Text Standards**: Use "and" instead of "&" in all permission labels and chat management interfaces
- **Group Chat UX**: Extended creation modal with search and selected members panel displaying OU/role information

When working in this codebase, prioritize consistency with these established patterns and maintain the professional, Microsoft Teams-inspired aesthetic.
