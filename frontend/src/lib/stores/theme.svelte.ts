import { browser } from '$app/environment';
import { writable } from 'svelte/store';

/**
 * Theme store for managing application theme settings
 */
class ThemeStore {
	currentTheme = $state<'light' | 'dark' | 'system'>('system');
	
	constructor() {
		if (browser) {
			this.initializeTheme();
			this.setupSystemThemeListener();
		}
	}

	private initializeTheme() {
		// Check localStorage for saved theme preference
		const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
		if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
			this.currentTheme = savedTheme;
		} else {
			this.currentTheme = 'system';
		}
		this.applyTheme();
	}

	private setupSystemThemeListener() {
		if (!browser || !window.matchMedia) return;
		
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		mediaQuery.addEventListener('change', () => {
			if (this.currentTheme === 'system') {
				this.applyTheme();
			}
		});
	}

	private getSystemTheme(): 'light' | 'dark' {
		if (browser && window.matchMedia) {
			return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
		}
		return 'light';
	}

	private applyTheme() {
		if (!browser) return;

		const effectiveTheme = this.currentTheme === 'system' ? this.getSystemTheme() : this.currentTheme;
		
		if (effectiveTheme === 'dark') {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}
	}

	get isDarkMode() {
		const effectiveTheme = this.currentTheme === 'system' ? this.getSystemTheme() : this.currentTheme;
		return effectiveTheme === 'dark';
	}

	get theme() {
		return this.currentTheme;
	}

	setTheme(theme: 'light' | 'dark' | 'system') {
		this.currentTheme = theme;
		if (browser) {
			localStorage.setItem('theme', theme);
			this.applyTheme();
		}
	}

	toggle() {
		const newTheme = this.isDarkMode ? 'light' : 'dark';
		this.setTheme(newTheme);
	}
}

export const themeStore = new ThemeStore();
