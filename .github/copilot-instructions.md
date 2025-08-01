# Copilot Instructions for Collabo-Tool

## Project Overview
Frontend-only hackathon collaboration tool built with **SvelteKit 5**, **TypeScript**, and **Tailwind CSS 4**. Features complete login flow with component-based architecture and comprehensive testing setup.

## Architecture & Key Patterns

### Core Stack
- **SvelteKit 5** with file-based routing (`frontend/src/routes/`)
- **Tailwind CSS 4** via `@import 'tailwindcss'` in `app.css` with forms/typography plugins
- **Vitest** dual-project setup: browser tests (`.svelte.test.ts`) and Node tests (`.test.ts/.spec.ts`)
- **lucide-svelte** for consistent iconography

### Component Architecture Pattern
Follow the login page example (`/routes/login/`):
- **Page components**: `+page.svelte` with state management and navigation
- **Sub-components**: Co-located with props interfaces and `$bindable()` for two-way binding
- **Styling**: Inline Tailwind classes with fallback to `<style>` blocks (avoid `@apply` directives)

Example from `LoginForm.svelte`:
```typescript
interface LoginFormProps {
  loginUsername: string;
  loginPassword: string;
  onSubmit: (event: Event) => void;
}

let { loginUsername = $bindable(), onSubmit }: LoginFormProps = $props();
```

### Svelte 5 Runes (Critical)
- Use `$state()` for reactive variables, `$props()` for component props
- Use `$bindable()` for two-way binding between parent/child components
- Render children with `{@render children()}` pattern in layouts

## Development Workflows

### Essential Commands
```bash
cd frontend
npm run dev -- --open    # Dev server with auto-open (port 5173, exposed to network)
npm run test:unit         # Watch mode testing
npm run lint             # ESLint + Prettier
npm run check            # Svelte type checking
```

### Testing Strategy
- **Browser tests**: `ComponentName.svelte.test.ts` using `vitest-browser-svelte`
- **Server/utility tests**: `filename.test.ts` in Node environment
- Use `render(Component)` and `page.getByRole()` for browser testing

### Navigation & State
- **Demo behavior**: All form submissions show `alert()` dialogs (no backend)
- **Navigation**: Use `goto('/path')` from `$app/navigation`
- **Routes**: Complete auth flow exists (`/login`, `/otp`, `/dashboard`, `/first-time`, etc.)

## Critical Configuration Details

### Vite Config Features
- **Network exposure**: `host: '0.0.0.0'` for local network access
- **Dual test projects**: Separate browser/Node environments in same config
- **Tailwind integration**: Via `tailwindcss()` Vite plugin

### Styling Approach
- **Primary**: Inline Tailwind classes with custom values (e.g., `focus:border-[#01c0a4]`)
- **Fallback**: Component `<style>` blocks for complex styling
- **Avoid**: `@apply` directives in component styles (setup issues noted)

### TypeScript Setup
- Extends `.svelte-kit/tsconfig.json` with `$lib` alias for `src/lib/`
- ESLint configured with `no-undef: 'off'` for TypeScript compatibility
- Module resolution: "bundler" mode

## Project State & Conventions
- **Empty directories**: `lib/{api,components,context,utils}` exist but unused
- **Component co-location**: Keep related components in route directories
- **Props patterns**: Always define TypeScript interfaces for component props
- **File naming**: Follow SvelteKit conventions (`+page.svelte`, `+layout.svelte`)

When implementing new features, follow the established component co-location pattern from `/login` and maintain the demo-only navigation behavior until backend integration.
