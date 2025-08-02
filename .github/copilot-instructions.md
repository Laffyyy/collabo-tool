# Copilot Instructions for Collabo-Tool

## Project Overview
This is a sophisticated hackathon collaboration tool built with SvelteKit 5, TypeScript, and Tailwind CSS 4. The project is a fully-featured frontend-only application with role-based authentication, real-time chat, broadcast messaging, and comprehensive UI components.

## Architecture & Project Structure

### Core Framework Stack
- **SvelteKit 5** with TypeScript and Vite
- **Tailwind CSS 4** with forms and typography plugins (`@import 'tailwindcss'` in `app.css`)
- **Vitest** for testing with browser-based testing using Playwright
- **ESLint + Prettier** with Svelte-specific configurations
- **Lucide Svelte** for consistent iconography throughout the application

### Directory Structure Pattern
```
frontend/src/
├── lib/           # Shared library code ($lib alias)
│   ├── components/ # Reusable UI components
│   │   └── Navigation.svelte # Main navigation header
│   └── stores/    # Svelte stores for state management
│       ├── auth.svelte.ts    # Authentication and role management
│       └── broadcast.svelte.ts # Broadcast messaging system
└── routes/        # SvelteKit file-based routing
    ├── broadcast/  # Broadcast messaging interface
    ├── chat/       # Real-time chat application
    ├── dashboard/  # Main dashboard
    ├── login/      # Authentication pages
    └── [other auth routes]/ # OTP, password reset, etc.
```

## Development Workflows

### Running the Project
```bash
cd frontend
npm run dev -- --open  # Development server with auto-open
```

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

### Svelte 5 Patterns
- **State Management**: Use `$state()` runes for local component state
- **Derived Values**: Use `$derived()` for simple computations, `$derived.by()` for complex logic with multiple dependencies
- **Props**: Use `$props()` runes syntax for component properties with `$bindable()` for two-way binding
- **Event Handlers**: Use `onclick` attribute syntax instead of `on:click` for better TypeScript support
- **Children Rendering**: Use `{@render children()}` pattern in layout components
- **Store Integration**: Class-based stores with `$state()` inside, exported as writable stores

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

### Component Naming and Organization
- **Navigation**: `Navigation.svelte` in `$lib/components/` for main app header
- **Page Components**: Use descriptive subcomponents for complex pages (e.g., `LoginForm.svelte`, `LoginBackground.svelte`)
- **Reusable Patterns**: Extract common UI patterns into `$lib/components/`

### TypeScript Integration
- Strict TypeScript with full type checking enabled
- Interface definitions for complex objects (User, Conversation, Broadcast, etc.)
- Type-safe event handling with proper parameter typing
- Use `bind:value` for two-way data binding with proper type inference

### Authentication & Role System
- **Role Hierarchy**: admin > manager > supervisor > support > frontline
- **Permission Gates**: Use derived getters like `canAccessAdmin`, `canSendBroadcasts`
- **Demo Behavior**: All authentication is frontend-only with mock data
- **Route Protection**: Pages check authentication state and redirect accordingly

## Configuration Notes

### Tailwind CSS 4
- Uses new `@import 'tailwindcss'` syntax in `app.css`
- Includes `@plugin '@tailwindcss/forms'` and `@plugin '@tailwindcss/typography'`
- Configured through Vite plugin: `tailwindcss()` in `vite.config.ts`
- **No @apply Usage**: Use regular CSS properties instead of `@apply` directives in component styles

### TypeScript Configuration
- Extends `.svelte-kit/tsconfig.json`
- Path aliases handled by SvelteKit (`$lib` for `src/lib/`)
- Strict mode enabled with module resolution: "bundler"

### Vitest Multi-Project Setup
- **Client tests**: Browser environment with Playwright for `.svelte.test.ts` files
- **Server tests**: Node environment for `.test.ts/.spec.ts` files
- Setup file: `vitest-setup-client.ts` for browser environment

### Prettier Configuration
- Uses `prettier-plugin-svelte` and `prettier-plugin-tailwindcss`
- Configured with `tailwindStylesheet: "./src/app.css"` for class sorting
- Single quotes, tabs, trailing commas settings optimized for Svelte

## Current State

### Implemented Features

#### Core Application Components
- **Navigation Component** (`$lib/components/Navigation.svelte`): Professional Teams-like header with aqua green branding
  - Search, notifications, profile dropdown functionality
  - Grey background (#6b7280) with hover states and transitions
  - Responsive design with lucide-svelte icons

#### Authentication System
- **Complete Auth Flow**: Login, password reset, OTP verification, security questions, first-time setup
- **Role-based Access Control**: Admin/manager/supervisor/support/frontline hierarchy
- **Auth Store**: Class-based store with user state and permission getters
- **Route Security**: Pages validate authentication and redirect appropriately

#### Chat Application (`/chat`)
- **Real-time UI**: Teams-like chat interface with temporary conversations
- **Advanced Features**: Group chats, member management, message reactions, file attachments
- **Search & Discovery**: Global user search with role-based filtering
- **Group Management**: Create groups, edit settings, manage members with role-based permissions
- **Message Features**: Reactions, file sharing, message search within conversations

#### Broadcast System (`/broadcast`)
- **Admin Broadcasting**: Create announcements with priority levels and role targeting
- **Acknowledgment Tracking**: Optional acknowledgments with attendance tracking for events
- **Rich Features**: Scheduled broadcasts, event dates, priority styling (high priority gets red border)
- **Export Functionality**: CSV export for acknowledgment data

#### Store Architecture
- **AuthStore**: User management, role permissions, login state
- **BroadcastStore**: Broadcast creation, acknowledgment tracking, admin features
- **Mock Data**: Comprehensive demo data for users, conversations, broadcasts

### UI Design System
- **Color Palette**: Primary `#01c0a4` (aqua green), secondary greys, red for priorities
- **Component Classes**: Consistent styling with `primary-button`, `secondary-button`, `input-field`, `collaboration-card`
- **Teams-like Aesthetic**: Professional grey backgrounds, white content cards, subtle shadows
- **Typography**: Font weights and sizes optimized for readability and hierarchy
- **Animations**: Subtle fade-in effects, hover states, and smooth transitions

### Development Notes
- **CSS Approach**: Hybrid Tailwind + component CSS (avoid `@apply` directives)
- **Icons**: Consistent use of `lucide-svelte` throughout the application
- **Demo Behavior**: All interactions use mock data and alert dialogs
- **State Management**: Svelte 5 runes with class-based stores for complex state
- **Type Safety**: Full TypeScript integration with proper interface definitions

## Code Patterns & Best Practices

### When Adding New Features
1. **Follow Established Patterns**: Use existing component structures and store patterns
2. **Role-based Access**: Implement permission checks using auth store getters
3. **Consistent Styling**: Use established CSS classes and color schemes
4. **Type Safety**: Define interfaces for new data structures
5. **Mock Data**: Add appropriate demo data for frontend-only behavior
6. **Testing**: Add component tests following established patterns

### Common Anti-patterns to Avoid
- Using `@apply` directives in component `<style>` blocks (use regular CSS)
- Mixing state management approaches (stick to class-based stores)
- Inconsistent color usage (use the established palette)
- Missing role-based permission checks on sensitive features
- Forgetting to add mock data for demo functionality

When contributing to this codebase, prioritize consistency with existing patterns and maintain the professional, Teams-like aesthetic that has been established throughout the application.
