# Copilot Instructions for Collabo-Tool

## Project Overview
Frontend-only hackathon collaboration tool built with SvelteKit 5, TypeScript, and Tailwind CSS 4. Currently implements authentication UI flows with modern component architecture.

## Development Workflow

### Quick Start
```bash
cd frontend
npm run dev -- --open  # Opens localhost:5173, exposes to network via 0.0.0.0
```

### Key Commands
```bash
npm run lint     # ESLint + Prettier check
npm run format   # Auto-format with Prettier  
npm run check    # Svelte type checking
npm run test:unit # Vitest in watch mode
npm test        # Single test run
```

## Architecture Patterns

### Svelte 5 Component Structure
- **Props**: Use `$props()` runes with TypeScript interfaces
- **State**: Use `$state()` for reactive variables, `$bindable()` for two-way binding
- **Children**: Render with `{@render children()}` pattern
- **Example**: See `LoginForm.svelte` for props interface and binding patterns

### Route-Based Components
Components live alongside routes (e.g., `routes/login/LoginForm.svelte`). Each major page has:
- `+page.svelte` - Main route component
- `ComponentName.svelte` - Specialized sub-components
- Optional: route-specific CSS files (like `login/login.css`)

### Navigation & Demo Behavior
- Use `goto()` from `$app/navigation` for routing
- All form submissions show `alert()` dialogs (frontend-only, no backend)
- Example pattern: `handleLoginSubmit` in `login/+page.svelte`

## Styling Architecture

### Tailwind CSS 4 Setup
- Import in `app.css`: `@import 'tailwindcss'` with forms/typography plugins
- **Critical**: Use regular CSS in `<style>` blocks, NOT `@apply` directives
- Custom colors: `#01c0a4` (primary teal), gradients for backgrounds
- Component-specific styles: See `login.css` for @layer components pattern

### Visual Design System
- Glass morphism: `backdrop-blur-sm` with `rgba(255,255,255,0.8)` backgrounds
- Gradients: `linear-gradient(to bottom right, #f8fafc, #ffffff, #f0fdfa)`
- Icons: Use `lucide-svelte` package consistently
- Shadows: Custom teal-tinted shadows with `rgba(20, 184, 166, 0.15)`

## Testing Configuration

### Dual Environment Setup (Vitest)
- **Client tests**: `.svelte.test.ts` files run in browser (Playwright)
- **Server tests**: `.test.ts/.spec.ts` files run in Node.js
- Setup: `vitest-browser-svelte` with `render()` function
- Pattern: `page.getByRole('heading', { level: 1 })` for element selection

### Vite Configuration
- Server config: `host: '0.0.0.0'`, `port: 5173`, allows ngrok tunneling
- Plugins: `tailwindcss()` and `sveltekit()` 
- Test projects split by environment in `vite.config.ts`

## Current Implementation Status

### Completed Features
- **Authentication Flow**: Login → OTP → Dashboard navigation
- **Login Components**: Form validation, password toggle, responsive design
- **Routing**: File-based routing with nested auth flows (`login/otp/`, `login/first-time/`)

### Key Files to Study
- `routes/login/+page.svelte` - Component composition and state management
- `routes/login/LoginForm.svelte` - Props interface and form binding patterns  
- `app.css` - Tailwind 4 import structure
- `vite.config.ts` - Multi-environment test configuration

### Development Notes
- Empty `lib/` structure ready for shared utilities
- ESLint configured with Svelte-specific rules and TypeScript strict mode
- All auth flows are UI-only demonstrations
- All variable names should start with their respective component name (e.g., `loginUsername`, `otpCode`)
