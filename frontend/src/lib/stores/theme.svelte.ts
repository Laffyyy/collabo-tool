import { browser } from '$app/environment';

/**
 * Theme store for managing application settings (dark mode removed for stability)
 */
class ThemeStore {
	// Simple theme store without dark mode functionality
	constructor() {
		if (browser) {
			// Remove any existing dark mode classes
			document.documentElement.classList.remove('dark');
			localStorage.removeItem('theme');
		}
	}

	get isDarkMode() {
		return false; // Always light mode
	}

	get theme() {
		return 'light';
	}

	get currentTheme() {
		return 'light' as const;
	}

	// Disabled methods for compatibility
	toggle() {
		// No-op
	}

	setTheme(theme: 'light' | 'dark' | 'auto') {
		// No-op
	}
}

export const themeStore = new ThemeStore();
