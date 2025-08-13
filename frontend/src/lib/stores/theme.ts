import { browser } from '$app/environment';
import { writable, derived } from 'svelte/store';

// Internal writable stores
const _isDarkMode = writable(false);
const _followsSystem = writable(false);

/**
 * Theme store for managing dark/light mode with system preference support
 */
class ThemeStore {
	constructor() {
		if (browser) {
			this.initialize();
		}
	}

	private initialize() {
		// Check if user has a theme preference
		const themePreference = localStorage.getItem('theme-preference');
		const storedTheme = localStorage.getItem('theme');
		
		if (themePreference === 'system' || (!themePreference && !storedTheme)) {
			// Follow system preference
			_followsSystem.set(true);
			_isDarkMode.set(window.matchMedia('(prefers-color-scheme: dark)').matches);
		} else if (storedTheme) {
			// Use stored theme
			_followsSystem.set(false);
			_isDarkMode.set(storedTheme === 'dark');
		} else {
			// Default to system
			_followsSystem.set(true);
			_isDarkMode.set(window.matchMedia('(prefers-color-scheme: dark)').matches);
		}
		
		// Apply theme on initialization
		this.applyTheme();
		
		// Listen for system theme changes
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		const handleSystemThemeChange = (e: MediaQueryListEvent) => {
			_followsSystem.subscribe(followsSystem => {
				if (followsSystem) {
					_isDarkMode.set(e.matches);
					this.applyTheme();
				}
			})();
		};
		
		if (mediaQuery.addEventListener) {
			mediaQuery.addEventListener('change', handleSystemThemeChange);
		} else {
			// Fallback for older browsers
			mediaQuery.addListener(handleSystemThemeChange);
		}

		// React to theme changes
		_isDarkMode.subscribe(() => {
			this.applyTheme();
		});
	}

	get isDarkMode() {
		let value = false;
		_isDarkMode.subscribe(v => { 
			value = v; 
			return () => {}; 
		})();
		return value;
	}

	get theme() {
		return this.isDarkMode ? 'dark' : 'light';
	}

	get currentTheme() {
		let followsSystem = false;
		_followsSystem.subscribe(v => { 
			followsSystem = v; 
			return () => {}; 
		})();
		if (followsSystem) {
			return 'system' as const;
		}
		return this.isDarkMode ? 'dark' as const : 'light' as const;
	}

	get followsSystem() {
		let value = false;
		_followsSystem.subscribe(v => { 
			value = v; 
			return () => {}; 
		})();
		return value;
	}

	toggle() {
		let currentValue = false;
		_isDarkMode.subscribe(v => { 
			currentValue = v; 
			return () => {}; 
		})();
		_isDarkMode.set(!currentValue);
		_followsSystem.set(false);
		this.saveAndApply();
	}

	setTheme(theme: 'light' | 'dark' | 'auto' | 'system') {
		if (theme === 'auto' || theme === 'system') {
			_followsSystem.set(true);
			localStorage.removeItem('theme');
			localStorage.setItem('theme-preference', 'system');
			if (browser) {
				_isDarkMode.set(window.matchMedia('(prefers-color-scheme: dark)').matches);
			}
		} else {
			_followsSystem.set(false);
			_isDarkMode.set(theme === 'dark');
			localStorage.setItem('theme-preference', theme);
		}
		this.saveAndApply();
	}

	private saveAndApply() {
		if (browser) {
			let followsSystem = false;
			let isDarkMode = false;
			_followsSystem.subscribe(v => { 
				followsSystem = v; 
				return () => {}; 
			})();
			_isDarkMode.subscribe(v => { 
				isDarkMode = v; 
				return () => {}; 
			})();
			
			if (!followsSystem) {
				localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
			}
			this.applyTheme();
		}
	}

	private applyTheme() {
		if (browser) {
			let isDarkMode = false;
			_isDarkMode.subscribe(v => { 
				isDarkMode = v; 
				return () => {}; 
			})();
			
			const html = document.documentElement;
			const body = document.body;
			
			if (isDarkMode) {
				html.classList.add('dark');
				body.classList.add('dark');
				// Add additional dark mode classes for better compatibility
				html.style.colorScheme = 'dark';
			} else {
				html.classList.remove('dark');
				body.classList.remove('dark');
				html.style.colorScheme = 'light';
			}

			// Dispatch a custom event for components that need to know about theme changes
			window.dispatchEvent(new CustomEvent('themeChange', { 
				detail: { 
					isDark: isDarkMode, 
					theme: isDarkMode ? 'dark' : 'light' 
				} 
			}));
		}
	}
}

const themeStoreInstance = new ThemeStore();

// Export readable stores for reactive access
export const isDarkModeStore = derived(_isDarkMode, ($isDarkMode) => $isDarkMode);
export const followsSystemStore = derived(_followsSystem, ($followsSystem) => $followsSystem);

export const themeStore = {
	// Getters for immediate access
	get isDarkMode() {
		return themeStoreInstance.isDarkMode;
	},
	get theme() {
		return themeStoreInstance.theme;
	},
	get currentTheme() {
		return themeStoreInstance.currentTheme;
	},
	get followsSystem() {
		return themeStoreInstance.followsSystem;
	},
	// Methods
	toggle() {
		themeStoreInstance.toggle();
	},
	setTheme(theme: 'light' | 'dark' | 'auto' | 'system') {
		themeStoreInstance.setTheme(theme);
	},
	// Reactive stores for Svelte components
	isDarkModeStore,
	followsSystemStore
};
