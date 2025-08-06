import { browser } from '$app/environment';

/**
 * Theme store for managing dark/light mode
 */
class ThemeStore {
	private _isDarkMode = $state(false);

	constructor() {
		if (browser) {
			// Initialize from localStorage or system preference
			const stored = localStorage.getItem('theme');
			if (stored) {
				this._isDarkMode = stored === 'dark';
			} else {
				// Check system preference
				this._isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
			}
			
			// Apply theme on initialization
			this.applyTheme();
			
			// Listen for system theme changes
			window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
				if (!localStorage.getItem('theme')) {
					this._isDarkMode = e.matches;
					this.applyTheme();
				}
			});
		}
	}

	get isDarkMode() {
		return this._isDarkMode;
	}

	get theme() {
		return this._isDarkMode ? 'dark' : 'light';
	}

	toggle() {
		this._isDarkMode = !this._isDarkMode;
		this.saveAndApply();
	}

	setTheme(theme: 'light' | 'dark' | 'auto') {
		if (theme === 'auto') {
			localStorage.removeItem('theme');
			if (browser) {
				this._isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
			}
		} else {
			this._isDarkMode = theme === 'dark';
		}
		this.saveAndApply();
	}

	private saveAndApply() {
		if (browser) {
			localStorage.setItem('theme', this._isDarkMode ? 'dark' : 'light');
			this.applyTheme();
		}
	}

	private applyTheme() {
		if (browser) {
			const html = document.documentElement;
			if (this._isDarkMode) {
				html.classList.add('dark');
			} else {
				html.classList.remove('dark');
			}
		}
	}
}

export const themeStore = new ThemeStore();
