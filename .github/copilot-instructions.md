# Copilot Instructions for Collabo-Tool

## Project Overview
This is a sophisticated hackathon collaboration tool built with **SvelteKit 5**, **TypeScript**, and **Tailwind CSS 4**. It's a fully-featured frontend-only application with role-based authentication, real-time chat, broadcast messaging, and comprehensive admin management interfaces.

**Critical: Frontend-Only Demo** - All authentication, data persistence, and API calls are simulated using in-memory stores and localStorage. No backend integration exists.

## Development Workflows

### Quick Start
```bash
cd frontend
npm run dev -- --open  # Auto-opens browser at localhost:5173
```

**Network Config**: Dev server exposes on `0.0.0.0:5173` with ngrok support (`allowedHosts: ['.ngrok-free.app']`)

### Testing Strategy
- **Svelte Components**: Use `.svelte.test.ts` suffix → browser environment with Playwright
- **Utilities/Logic**: Use `.test.ts` suffix → Node environment
- Commands: `npm run test:unit` (watch) | `npm test` (single run)
- Multi-project Vitest setup in `vite.config.ts` handles environment switching automatically

### Code Quality Pipeline
```bash
npm run check    # Svelte type checking
npm run lint     # ESLint + Prettier validation
npm run format   # Auto-format codebase
```

## Architecture Patterns

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
- **Mock Data**: All stores initialize with demo data for immediate functionality
- **Role-based UI**: Check permissions before showing admin features or sensitive operations  
- **Reactive Patterns**: Use `$derived()` for computed values, `$state()` for mutable state
- **Icon System**: Consistent use of Lucide Svelte icons throughout the application
- **Teams-like UI**: Professional grey navigation background with white content areas
- **Chat Features**: File sharing with granular permissions, forwarding controls, read status indicators, pinned messages, and media compilation
- **UI Text Standards**: Use "and" instead of "&" in all permission labels and chat management interfaces
- **Group Chat UX**: Extended creation modal with search and selected members panel displaying OU/role information

When working in this codebase, prioritize consistency with these established patterns and maintain the professional, Microsoft Teams-inspired aesthetic.
