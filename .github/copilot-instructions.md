# Copilot Instructions for Collabo-Tool

## Project Overview
This is a sophisticated hackathon collaboration tool built with SvelteKit 5, TypeScript, and Tailwind CSS 4. The project is a fully-featured frontend-only application with role-based authentication, real-time chat, broadcast messaging, and comprehensive admin management interfaces.

**Demo Nature**: This is a frontend-only demonstration with mock data - no backend integration. All authentication, data persistence, and API calls are simulated using in-memory stores and localStorage.

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
    ├── broadcast/  # Broadcast messaging interface (1400+ lines)
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

**PowerShell Users**: Use `npm run dev` ; `npm run dev -- --open` for auto-opening browser.

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
- **Derived Values**: Use `$derived()` for simple computations, `$derived.by()` for complex logic
- **Props**: Use `$props()` runes syntax with `$bindable()` for two-way binding
- **Event Handlers**: Use `onclick` attribute syntax instead of `on:click` for better TypeScript support
- **Children Rendering**: Use `{@render children()}` pattern in layout components
- **Store Integration**: Class-based stores with `$state()` inside, exported as writable stores
- **Reactive Patterns**: Use `$derived()` for computed values, `$state()` for mutable state

### Store Architecture
- **Class-based Stores**: Use classes with `$state()` runes for complex state management
- **Store Pattern**: Export as `writable()` stores from classes for reactivity
- **Role-based Access**: Implement permission systems using derived getters
- **Mock Data Integration**: Initialize stores with realistic demo data in constructors
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
- **Global Utility Classes**: Use predefined classes in `app.css` like `.primary-button`, `.secondary-button`, `.input-field`
- **Color Scheme**: Primary brand color `#01c0a4` (aqua green) with grey (#374151, #f9fafb) for neutral elements
- **Teams-like UI**: Grey navigation background, white content areas, professional styling

## Complex Feature Patterns

### Broadcast System Architecture
- **Lifecycle Management**: Broadcasts have `isActive` status for soft deletion (active → done)
- **Role-based Modals**: Creator view shows management controls, user view shows response forms
- **Status Separation**: Active broadcasts sorted first, done broadcasts separated visually with dividers
- **Global Search/Filter**: Search and filters work across all tabs, bypassing tab restrictions
- **Response Types**: Supports none, required acknowledgment, preferred dates, multiple choice, text responses
- **End Date Management**: Optional expiration dates for automatic broadcast completion
- **Visual Indicators**: "NEW", "DONE" badges with different opacity and background colors
- **Creator vs User Behavior**: 
  - **Creators**: See "Mark as Done" button and end date management in modal
  - **Users**: See response forms and acknowledge/answer options in modal
  - **Conditional Rendering**: Use `{#if selectedBroadcast.createdBy === currentUser.id}` pattern

### Broadcast Lifecycle Implementation Pattern
```typescript
// Sorting pattern for active/done separation
const sortedBroadcasts = $derived(() => {
  let filtered = [...broadcastStore.myBroadcasts];
  
  // Apply search and filters globally
  if (searchTerm) {
    filtered = filtered.filter(b => 
      b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }
  
  // Sort: active first, then by creation date
  return filtered.sort((a, b) => {
    if (a.isActive !== b.isActive) {
      return a.isActive ? -1 : 1; // Active broadcasts first
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
});

// Mark as Done functionality
function markAsDone(id: number) {
  broadcastStore.markAsDone(id);
  selectedBroadcast = null;
  showModal = false;
}
```

### Modal Architecture Patterns
- **Conditional Content**: Use `{#if createdBy === currentUser.id}` for role-specific modal content
- **Form Sectioning**: Multi-step forms with numbered sections (1-4) for complex data entry
- **Dynamic Fields**: Conditional form fields based on selection (e.g., choices array for multiple choice responses)
- **X-Icon Close**: Single close method via X icon, avoid redundant close buttons
- **Action Buttons**: Context-specific buttons (Mark as Done, Confirm, etc.) aligned with `justify-end`
- **Creator Modal Pattern**:
  ```svelte
  {#if selectedBroadcast.createdBy === currentUser.id}
    <!-- Creator view: Management controls -->
    <div class="flex justify-between items-center mb-4">
      <span class="text-sm text-gray-600">End Date:</span>
      <span class="font-medium">{formatDate(selectedBroadcast.endDate)}</span>
    </div>
    <div class="flex justify-end mt-6">
      <button onclick={() => markAsDone(selectedBroadcast.id)} 
              class="primary-button">
        Mark as Done
      </button>
    </div>
  {:else}
    <!-- User view: Response forms -->
    <form><!-- Response UI --></form>
  {/if}
  ```

### Search & Filter Implementation
- **Global Scope**: Searches across title and content fields regardless of active tab
- **Priority Filtering**: Dropdown filter with visual feedback for current selection
- **Combined Logic**: Search + filter work together, bypassing normal tab restrictions
- **Real-time**: Uses `$derived()` to reactively filter `sortedBroadcasts` array
- **Positioning**: Search/filter controls positioned with `ml-auto` on tab bar for right alignment
- **Visual Integration**: Search input with Search icon, filter dropdown with ChevronDown icon

### Visual Status Patterns
- **Active/Done Separation**: Use horizontal divider (`<hr class="my-4 border-gray-200">`) between sections
- **Status Badges**: 
  - NEW: `bg-green-100 text-green-800` with full opacity
  - DONE: `bg-gray-100 text-gray-600` with reduced opacity (`opacity-75`)
- **Card States**: Done broadcasts have `opacity-75` applied to entire card
- **Color Coordination**: Consistent color usage across related elements (e.g., Export CSV and View Report buttons)

### Admin Interface Patterns
- **Unified Navigation**: All admin pages use consistent layout navigation via `+layout.svelte`
- **Tab-based Views**: Multiple status tabs (sent, scheduled, archived, reported) with count badges
- **Bulk Operations**: CSV templates for bulk user imports with role-specific field requirements
- **Hierarchical Data**: User management displays supervisor/manager relationships in expandable team views
- **OU Rules Engine**: Complex permission systems via Organization Unit rules for chat/broadcast policies

### Authentication & Role System
- **Role Hierarchy**: admin > manager > supervisor > support > frontline
- **Permission Gates**: Use derived getters like `canAccessAdmin`, `canSendBroadcasts`
- **Demo Behavior**: All authentication is frontend-only with mock data
- **Route Protection**: Pages check authentication state and redirect accordingly
- **Navigation Hiding**: Layout uses `noNavPages` array to hide navigation on auth routes and chat
- **Mock User Initialization**: Auth store provides demo users with realistic hierarchical relationships

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
6. **Lifecycle Management**: Use `isActive` boolean for soft deletion rather than hard removal
7. **Visual Separation**: Use dividers and status badges to separate different states
8. **Global Search Integration**: Ensure new filterable content works with existing search patterns
9. **Creator/User Context**: Distinguish UI behavior based on content ownership using `createdBy` field
10. **Icon Consistency**: Use Lucide Svelte icons with established sizing and color patterns

### Broadcast Development Workflow
1. **Interface Updates**: Add new fields to Broadcast interface (e.g., `endDate?: string`)
2. **Store Integration**: Update broadcast store methods to handle new functionality
3. **Modal Behavior**: Implement conditional rendering based on `createdBy === currentUser.id`
4. **Visual States**: Apply consistent opacity and badge patterns for different states
5. **Search Integration**: Ensure new content fields are included in global search logic
6. **Sort Logic**: Maintain active/done separation in all broadcast lists
7. **Button Styling**: Use coordinated colors for related actions (e.g., Export CSV + View Report)

### UI Component Conventions
- **Button Variations**: `.primary-button` (brand color), `.secondary-button` (grey), coordinated blues for related actions
- **Icon + Text Pattern**: `<Icon class="w-4 h-4 mr-2" />Button Text` for consistent spacing
- **Search Components**: Search icon + input field, positioned with `ml-auto` for right alignment
- **Filter Dropdowns**: ChevronDown icon, show current selection, consistent styling with search
- **Status Badges**: Small rounded badges with appropriate color coding and opacity variations
- **Modal Headers**: X icon close in top-right, no redundant close buttons in content area

### Common Anti-patterns to Avoid
- Using `@apply` directives in component `<style>` blocks (use regular CSS)
- Mixing state management approaches (stick to class-based stores)
- Inconsistent color usage (use the established palette)
- Missing role-based permission checks on sensitive features
- Breaking the organizational hierarchy when creating users
- Using outdated Svelte 4 patterns (avoid `on:click`, use `onclick` instead)
- Hard deletion of data (use `isActive: false` for soft deletion)

### Large Component Management
- **File Size**: Broadcast page exceeds 1400 lines - acceptable for complex feature hubs
- **Interface Definitions**: Keep TypeScript interfaces at top of component files
- **Mock Data**: Embed realistic test data directly in components for demo purposes
- **Section Comments**: Use HTML comments to clearly delineate major sections
- **State Grouping**: Group related `$state()` variables together for clarity

When contributing to this codebase, prioritize consistency with existing patterns and maintain the professional, Teams-like aesthetic that has been established throughout the application.
