<script lang="ts">
	import Navigation from '$lib/components/Navigation.svelte';
	import { Bell, Shield, HelpCircle, Palette, Monitor, Sun, Moon, Check } from 'lucide-svelte';
	import { themeStore } from '$lib/stores/theme';
	import { browser } from '$app/environment';

	// Theme preferences
	type ThemeMode = 'system' | 'light' | 'dark';
	let selectedTheme = $state<ThemeMode>('system');

	// Initialize theme from localStorage or default to system
	if (browser) {
		selectedTheme = themeStore.currentTheme;
	}

	// Notification preferences
	let pushNotifications = $state(true);
	let broadcastNotifications = $state(true);
	let chatNotifications = $state(true);

	// Privacy settings
	let onlineStatus = $state(true);
	let readReceipts = $state(true);
	let profileVisibility = $state('team'); // 'everyone', 'team', 'managers'

	const handleThemeChange = (theme: ThemeMode) => {
		selectedTheme = theme;
		
		if (browser) {
			// Apply theme using the theme store
			themeStore.setTheme(theme);
		}
	};

	const handleSaveSettings = () => {
		// Here you would typically save to a backend
		console.log('Settings saved:', {
			theme: selectedTheme,
			notifications: {
				push: pushNotifications,
				broadcast: broadcastNotifications,
				chat: chatNotifications
			},
			privacy: {
				onlineStatus,
				readReceipts,
				profileVisibility
			}
		});
		
		// Show success message (you could add a toast notification here)
		alert('Settings saved successfully!');
	};

	// Get current system theme preference for display
	const getSystemTheme = () => {
		if (browser) {
			return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
		}
		return 'light';
	};
</script>

<svelte:head>
	<title>Settings - Collaboration Tool</title>
</svelte:head>

<style>
	.theme-panel {
		position: relative;
		overflow: hidden;
	}
	
	.theme-panel::before {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(135deg, transparent 0%, rgba(1, 192, 164, 0.02) 100%);
		opacity: 0;
		transition: opacity 0.3s ease;
	}
	
	.theme-panel:hover::before {
		opacity: 1;
	}
	
	.theme-panel.selected {
		background: linear-gradient(135deg, rgba(1, 192, 164, 0.05) 0%, rgba(1, 192, 164, 0.02) 100%);
		border-color: #01c0a4;
		box-shadow: 0 0 0 1px rgba(1, 192, 164, 0.1);
	}
	
	.theme-preview-animate {
		transition: all 0.3s ease;
	}
</style>

<Navigation />

<div class="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
	<div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
			<p class="text-gray-600 dark:text-gray-400 mt-1">Manage your account preferences and application settings</p>
		</div>

		<div class="space-y-6">
			<!-- Appearance Settings -->
			<div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-200">
				<div class="p-6 border-b border-gray-200 dark:border-gray-700">
					<div class="flex items-center justify-between">
						<div class="flex items-center space-x-2">
							<Palette class="w-5 h-5 text-gray-700 dark:text-gray-300" />
							<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Appearance</h2>
						</div>
						<div class="text-sm text-gray-500 dark:text-gray-400 font-medium">
							{#if selectedTheme === 'system'}
								<span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
									🔄 Following System
								</span>
							{:else if selectedTheme === 'light'}
								<span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
									☀️ Always Light
								</span>
							{:else}
								<span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300">
									🌙 Always Dark
								</span>
							{/if}
						</div>
					</div>
					<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Choose how the application looks and feels</p>
				</div>
				<div class="p-6">
					<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
						<!-- System Theme Panel -->
						<div class="relative">
							<button
								onclick={() => handleThemeChange('system')}
								class="theme-panel w-full p-4 border-2 rounded-xl transition-all duration-200 hover:shadow-md {selectedTheme === 'system' ? 'selected border-[#01c0a4] bg-[#01c0a4]/5' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'}"
							>
								<div class="flex flex-col items-center space-y-3">
									<div class="relative">
										<Monitor class="w-8 h-8 text-gray-700 dark:text-gray-300" />
										{#if selectedTheme === 'system'}
											<div class="absolute -top-1 -right-1 w-4 h-4 bg-[#01c0a4] rounded-full flex items-center justify-center animate-pulse">
												<Check class="w-2.5 h-2.5 text-white" />
											</div>
										{/if}
									</div>
									<div class="text-center">
										<div class="font-medium text-gray-900 dark:text-gray-100 text-sm">System</div>
										<div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
											Follow system theme
											{#if browser}
												<br /><span class="font-medium">Currently: {getSystemTheme() === 'dark' ? 'Dark' : 'Light'}</span>
											{/if}
										</div>
									</div>
								</div>
							</button>
						</div>

						<!-- Light Mode Panel -->
						<div class="relative">
							<button
								onclick={() => handleThemeChange('light')}
								class="theme-panel w-full p-4 border-2 rounded-xl transition-all duration-200 hover:shadow-md {selectedTheme === 'light' ? 'selected border-[#01c0a4] bg-[#01c0a4]/5' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'}"
							>
								<div class="flex flex-col items-center space-y-3">
									<div class="relative">
										<Sun class="w-8 h-8 text-yellow-500 {selectedTheme === 'light' ? 'animate-pulse' : ''}" />
										{#if selectedTheme === 'light'}
											<div class="absolute -top-1 -right-1 w-4 h-4 bg-[#01c0a4] rounded-full flex items-center justify-center animate-pulse">
												<Check class="w-2.5 h-2.5 text-white" />
											</div>
										{/if}
									</div>
									<div class="text-center">
										<div class="font-medium text-gray-900 dark:text-gray-100 text-sm">Light Mode</div>
										<div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
											Clean and bright interface<br />
											<span class="font-medium">Optimal for daytime use</span>
										</div>
									</div>
								</div>
							</button>
						</div>

						<!-- Dark Mode Panel -->
						<div class="relative">
							<button
								onclick={() => handleThemeChange('dark')}
								class="theme-panel w-full p-4 border-2 rounded-xl transition-all duration-200 hover:shadow-md {selectedTheme === 'dark' ? 'selected border-[#01c0a4] bg-[#01c0a4]/5' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'}"
							>
								<div class="flex flex-col items-center space-y-3">
									<div class="relative">
										<Moon class="w-8 h-8 text-indigo-500 {selectedTheme === 'dark' ? 'animate-pulse' : ''}" />
										{#if selectedTheme === 'dark'}
											<div class="absolute -top-1 -right-1 w-4 h-4 bg-[#01c0a4] rounded-full flex items-center justify-center animate-pulse">
												<Check class="w-2.5 h-2.5 text-white" />
											</div>
										{/if}
									</div>
									<div class="text-center">
										<div class="font-medium text-gray-900 dark:text-gray-100 text-sm">Dark Mode</div>
										<div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
											Easy on the eyes<br />
											<span class="font-medium">Perfect for low-light environments</span>
										</div>
									</div>
								</div>
							</button>
						</div>
					</div>

					<!-- Theme Preview -->
					<div class="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 theme-preview-animate transition-colors duration-200">
						<div class="flex items-center justify-between mb-3">
							<div class="text-sm font-medium text-gray-700 dark:text-gray-300">Theme Preview</div>
							<div class="text-xs text-[#01c0a4] font-medium">
								{selectedTheme === 'system' ? '🔄 Auto' : selectedTheme === 'light' ? '☀️ Light' : '🌙 Dark'}
							</div>
						</div>
						<div class="flex items-center space-x-6">
							<div class="flex items-center space-x-2">
								<div class="w-4 h-4 bg-[#01c0a4] rounded shadow-sm"></div>
								<span class="text-xs text-gray-600 dark:text-gray-400">Primary</span>
							</div>
							<div class="flex items-center space-x-2">
								<div class="w-4 h-4 {selectedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} border-2 border-gray-300 dark:border-gray-600 rounded shadow-sm transition-colors"></div>
								<span class="text-xs text-gray-600 dark:text-gray-400">Background</span>
							</div>
							<div class="flex items-center space-x-2">
								<div class="w-4 h-4 {selectedTheme === 'dark' ? 'bg-white' : 'bg-gray-900'} rounded shadow-sm transition-colors"></div>
								<span class="text-xs text-gray-600 dark:text-gray-400">Text</span>
							</div>
							<div class="flex items-center space-x-2">
								<div class="w-4 h-4 {selectedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'} rounded shadow-sm transition-colors"></div>
								<span class="text-xs text-gray-600 dark:text-gray-400">Surface</span>
							</div>
						</div>
						<div class="mt-3 p-3 {selectedTheme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded border border-gray-200 dark:border-gray-600 transition-all shadow-sm">
							<div class="text-xs font-medium mb-1">Theme Experience</div>
							<div class="text-xs opacity-75">
								{#if selectedTheme === 'system'}
									Automatically adapts to your system settings. Changes between light and dark modes based on your device's preferences or time of day settings.
								{:else if selectedTheme === 'light'}
									Clean, bright interface perfect for well-lit environments. Optimizes readability and reduces battery usage on OLED displays.
								{:else}
									Dark interface reduces eye strain in low-light conditions. Perfect for late-night work sessions and extends battery life on OLED screens.
								{/if}
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Notification Settings -->
			<div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-200">
				<div class="p-6 border-b border-gray-200 dark:border-gray-700">
					<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
						<Bell class="w-5 h-5 text-gray-700 dark:text-gray-300" />
						<span>Notifications</span>
					</h2>
					<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Choose which notifications you want to receive</p>
				</div>
				<div class="p-6 space-y-4">
					<div class="flex items-center justify-between">
						<div>
							<div class="text-sm font-medium text-gray-700 dark:text-gray-300">Push Notifications</div>
							<p class="text-xs text-gray-500 dark:text-gray-400">Receive push notifications on this device</p>
						</div>
						<label class="relative inline-flex items-center cursor-pointer">
							<input type="checkbox" bind:checked={pushNotifications} class="sr-only peer" aria-label="Push Notifications" />
							<div class="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#01c0a4]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#01c0a4]"></div>
						</label>
					</div>
					<div class="flex items-center justify-between">
						<div>
							<div class="text-sm font-medium text-gray-700 dark:text-gray-300">Broadcast Notifications</div>
							<p class="text-xs text-gray-500 dark:text-gray-400">Get notified about company announcements</p>
						</div>
						<label class="relative inline-flex items-center cursor-pointer">
							<input type="checkbox" bind:checked={broadcastNotifications} class="sr-only peer" aria-label="Broadcast Notifications" />
							<div class="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#01c0a4]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#01c0a4]"></div>
						</label>
					</div>
					<div class="flex items-center justify-between">
						<div>
							<div class="text-sm font-medium text-gray-700 dark:text-gray-300">Chat Notifications</div>
							<p class="text-xs text-gray-500 dark:text-gray-400">Get notified about new messages</p>
						</div>
						<label class="relative inline-flex items-center cursor-pointer">
							<input type="checkbox" bind:checked={chatNotifications} class="sr-only peer" aria-label="Chat Notifications" />
							<div class="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#01c0a4]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#01c0a4]"></div>
						</label>
					</div>
				</div>
			</div>

			<!-- Privacy Settings -->
			<div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-200">
				<div class="p-6 border-b border-gray-200 dark:border-gray-700">
					<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
						<Shield class="w-5 h-5 text-gray-700 dark:text-gray-300" />
						<span>Privacy</span>
					</h2>
					<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Control your privacy and visibility settings</p>
				</div>
				<div class="p-6 space-y-4">
					<div class="flex items-center justify-between">
						<div>
							<div class="text-sm font-medium text-gray-700 dark:text-gray-300">Show Online Status</div>
							<p class="text-xs text-gray-500 dark:text-gray-400">Let others see when you're online</p>
						</div>
						<label class="relative inline-flex items-center cursor-pointer">
							<input type="checkbox" bind:checked={onlineStatus} class="sr-only peer" aria-label="Show Online Status" />
							<div class="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#01c0a4]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#01c0a4]"></div>
						</label>
					</div>
					<div class="flex items-center justify-between">
						<div>
							<div class="text-sm font-medium text-gray-700 dark:text-gray-300">Read Receipts</div>
							<p class="text-xs text-gray-500 dark:text-gray-400">Show when you've read messages</p>
						</div>
						<label class="relative inline-flex items-center cursor-pointer">
							<input type="checkbox" bind:checked={readReceipts} class="sr-only peer" aria-label="Read Receipts" />
							<div class="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#01c0a4]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#01c0a4]"></div>
						</label>
					</div>
					<div>
						<label for="profileVisibility" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Profile Visibility</label>
						<select id="profileVisibility" bind:value={profileVisibility} class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent transition-colors duration-200">
							<option value="everyone">Everyone</option>
							<option value="team">Team Members Only</option>
							<option value="managers">Managers Only</option>
						</select>
						<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Choose who can view your full profile</p>
					</div>
				</div>
			</div>

			<!-- Save Button -->
			<div class="flex justify-end">
				<button
					onclick={handleSaveSettings}
					class="px-6 py-2 bg-gradient-to-r from-[#01c0a4] to-[#00a085] text-white font-medium rounded-lg hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5"
				>
					Save Settings
				</button>
			</div>
		</div>
	</div>
</div>
