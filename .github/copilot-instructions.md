# Copilot Instructions for Collabo-Tool

## Project Overview
This is a sophisticated hackathon collaboration tool built with SvelteKit 5, TypeScript, and Tailwind CSS 4. The project is a fully-featured frontend-only application with role-based authentication, real-time chat, broadcast messaging, and comprehensive admin management interfaces.

## Architecture & Project Structure

### Core Framework Stack
- **SvelteKit 5** with TypeScript and Vite
- **Tailwind CSS 4** with forms and typography plugins (`@import 'tailwindcss'` in `app.css`)
- **Vitest** for testing with browser-based testing using Playwright
- **ESLint + Prettier** with Svelte-specific configurations
- **Lucide Svelte** for consistent iconography throughout the application

### Key Files & Directories
```
frontend/src/
├── lib/             # Shared library code
│   ├── components/  # Reusable UI components
│   │   ├── ConfirmationModal.svelte  # Global confirmation dialogs
│   │   ├── Navigation.svelte         # Main app navigation
│   │   └── ProfileAvatar.svelte      # User avatar display
│   └── stores/     # State management
│       ├── auth.svelte.ts    # Authentication & roles
│       ├── broadcast.svelte.ts # Message broadcasting
│       └── theme.svelte.ts   # Theme management
└── routes/        # SvelteKit file-based routing
    ├── admin/      # Complete admin management suite
    │   ├── user-management/     # User CRUD, hierarchy, passwords
    │   ├── ou-management/       # Organization unit & policies
    │   ├── global-configuration/ # System-wide settings
    │   ├── admin-logs/          # Activity monitoring
    │   ├── chat-management/     # Chat moderation
    │   └── broadcast-management/ # Broadcast oversight
    ├── broadcast/  # Broadcast messaging interface
    ├── chat/       # Real-time chat application (main landing page)
    └── [auth routes]/ # login, forgot-password, otp, etc.
```

## Development Workflows

### Running the Project
```bash
cd frontend
npm run dev -- --open  # Development server with auto-open
```

**Network Configuration**: Dev server exposes on `0.0.0.0:5173` with ngrok support for external testing.

### Testing Strategy
- **Svelte Component Tests**: Use `.svelte.test.ts` suffix, run in browser environment
- **Server/Utility Tests**: Use `.test.ts` or `.spec.ts` suffix, run in Node environment
- Test commands: `npm run test:unit` (watch mode) or `npm test` (single run)

### Code Quality
```bash
npm run lint     # ESLint + Prettier check
npm run format   # Auto-format with Prettier
npm run check    # Svelte type checking
```

## Key Conventions

### Svelte Component Patterns
- Use `$state()` runes for component state
- Prefer `onclick` over `on:click` for TypeScript support
- Use regular CSS in `<style>` blocks (no `@apply`)
- Example from `ProfileAvatar.svelte`:
```svelte
<script lang="ts">
  const user = $state<User | null>(null);
  const size = $props<'sm' | 'md' | 'lg'>('md');
</script>

<div class="avatar {size}" onclick={handleClick}>
  {user?.initials ?? '??'}
</div>

<style>
  .avatar {
    border-radius: 9999px;
    background: #01c0a4;
    color: white;
  }
</style>
```

### Store Architecture
- **Class-based Stores**: Use classes with `$state()` runes for complex state management
- **Store Pattern**: Export as `writable()` stores from classes for reactivity
- **Role-based Access**: Implement permission systems using derived getters
- **Example Pattern**:
  ```typescript
  class AuthStore {
    user = $state<User | null>(null);
    get canAccessAdmin() { return this.user?.role === 'admin'; }
  }
  export const authStore = writable(new AuthStore());
  ```

### CSS and Styling Approach
- **Hybrid Approach**: Mix Tailwind utility classes with component-scoped CSS
- **Component Styles**: Use `<style>` blocks with regular CSS (not `@apply` directives)
- **Utility Classes**: Use Tailwind classes directly in templates for layout and spacing
- **Custom Classes**: Create semantic CSS classes for complex styling (e.g., `input-field`, `primary-button`)
- **Color Scheme**: Primary brand color `#01c0a4` (aqua green) with grey (#374151, #f9fafb) for neutral elements
- **Teams-like UI**: Grey navigation background, white content areas, professional styling

### Admin Interface Patterns
- **Unified Navigation**: All admin pages use consistent layout navigation via `+layout.svelte`
- **Modal Architecture**: Complex forms use split-panel modals (form left, settings/rules right)
- **Role-based UI**: Dynamic columns and buttons based on user roles and permissions
- **Hierarchical Data**: User management displays supervisor/manager relationships in expandable team views
- **Password Management**: Comprehensive password controls with validation, visibility toggles, and reset functionality
- **Bulk Operations**: CSV templates for bulk user imports with role-specific field requirements

### TypeScript Integration
- Strict TypeScript with full type checking enabled
- Interface definitions for complex objects (User, OrganizationUnit, OURules, etc.)
- Type-safe event handling with proper parameter typing
- Use `bind:value` for two-way data binding with proper type inference

### Authentication & Role System
- **Role Hierarchy**: admin > manager > supervisor > support > frontline
- **Permission Gates**: Use derived getters like `canAccessAdmin`, `canSendBroadcasts`
- **Demo Behavior**: All authentication is frontend-only with mock data
- **Route Protection**: Pages check authentication state and redirect accordingly
- **Navigation Hiding**: Layout uses `noNavPages` array to hide navigation on auth routes and chat

## Configuration Notes

### Tailwind CSS 4
- Uses new `@import 'tailwindcss'` syntax in `app.css`
- Includes `@plugin '@tailwindcss/forms'` and `@plugin '@tailwindcss/typography'`
- Configured through Vite plugin: `tailwindcss()` in `vite.config.ts`
- **No @apply Usage**: Use regular CSS properties instead of `@apply` directives in component styles

### Vitest Multi-Project Setup
- **Client tests**: Browser environment with Playwright for `.svelte.test.ts` files
- **Server tests**: Node environment for `.test.ts/.spec.ts` files
- Setup file: `vitest-setup-client.ts` for browser environment

## Critical Patterns & Anti-patterns

### When Adding New Features
1. **Follow Established Patterns**: Use existing component structures and store patterns
2. **Role-based Access**: Implement permission checks using auth store getters
3. **Consistent Styling**: Use established CSS classes and color schemes
4. **Mock Data**: Add appropriate demo data for frontend-only behavior
5. **Hierarchical Relationships**: Maintain user role relationships (manager > supervisor > frontline/support)

### Common Anti-patterns to Avoid
- Using `@apply` directives in component `<style>` blocks (use regular CSS)
- Mixing state management approaches (stick to class-based stores)
- Inconsistent color usage (use the established palette)
- Missing role-based permission checks on sensitive features
- Breaking the organizational hierarchy when creating users

### Admin Development Notes
- **User Management**: Supports bulk CSV import with role-specific templates
- **Team Views**: Complex hierarchical displays with drill-down navigation
- **Password Management**: Integrated into edit modals with security validation
- **OU Management**: Organization units control chat/broadcast policies via detailed rule systems
- **Mock Data Generation**: Dynamic generation of realistic hierarchical user data for testing

When contributing to this codebase, prioritize consistency with existing patterns and maintain the professional, Teams-like aesthetic that has been established throughout the application.
