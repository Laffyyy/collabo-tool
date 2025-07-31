# Copilot Instructions for Collabo-Tool

## Project Overview
This is a hackathon collaboration tool built with SvelteKit 5, TypeScript, and Tailwind CSS 4. The project follows a frontend-only architecture currently, with a structured approach to component organization.

## Architecture & Project Structure

### Core Framework Stack
- **SvelteKit 5** with TypeScript and Vite
- **Tailwind CSS 4** with forms and typography plugins (`@import 'tailwindcss'` in `app.css`)
- **Vitest** for testing with browser-based testing using Playwright
- **ESLint + Prettier** with Svelte-specific configurations

### Directory Structure Pattern
```
frontend/src/
├── lib/           # Shared library code ($lib alias)
│   ├── api/       # API layer (currently empty)
│   ├── components/ # Reusable components (currently empty)
│   ├── context/   # Svelte context/stores (currently empty)
│   └── utils/     # Utility functions (currently empty)
└── routes/        # SvelteKit file-based routing
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
- Use `$props()` runes syntax in components (see `+layout.svelte`)
- Render children with `{@render children()}` pattern
- Import styles in layout: `import '../app.css'` in `+layout.svelte`

### Testing Patterns
- Svelte component tests use `vitest-browser-svelte` with `render()` function
- Browser tests use `page.getByRole()` for element selection
- Example: `render(Page); page.getByRole('heading', { level: 1 })`

### File Naming
- Route files: `+page.svelte`, `+layout.svelte` (SvelteKit convention)
- Component tests: `ComponentName.svelte.test.ts`
- Other tests: `filename.spec.ts` or `filename.test.ts`

## Configuration Notes

### Tailwind CSS 4
- Uses new `@import 'tailwindcss'` syntax in `app.css`
- Includes `@plugin '@tailwindcss/forms'` and `@plugin '@tailwindcss/typography'`
- Configured through Vite plugin: `tailwindcss()` in `vite.config.ts`

### TypeScript Configuration
- Extends `.svelte-kit/tsconfig.json`
- Path aliases handled by SvelteKit (`$lib` for `src/lib/`)
- Strict mode enabled with module resolution: "bundler"

### Vitest Multi-Project Setup
- **Client tests**: Browser environment with Playwright for `.svelte.test.ts` files
- **Server tests**: Node environment for `.test.ts/.spec.ts` files
- Setup file: `vitest-setup-client.ts` for browser environment

## Current State
This is an early-stage hackathon project with foundational structure in place. The project includes:

### Implemented Features
- **Login Page** (`/login`): Complete UI-only login form with modern design
  - Components: `LoginForm.svelte`, `LoginHeader.svelte`, `LoginBackground.svelte`
  - Features: Username/password fields, password visibility toggle, responsive design
  - No backend integration - displays demo alerts when submitted
  - Uses lucide-svelte icons and custom CSS (not Tailwind @apply due to setup issues)

### Development Notes
- **CSS Approach**: Use regular CSS instead of `@apply` directives in component `<style>` blocks
- **Icons**: Use `lucide-svelte` package for consistent iconography
- **Demo Behavior**: All form submissions and navigation show alert dialogs since this is frontend-only
- **Missing Directories**: `api/`, `components/`, `context/`, `utils/` are structured but empty

When adding features, follow the established patterns and maintain the separation between client and server test environments. For new pages, follow the component-based architecture seen in the login implementation.
