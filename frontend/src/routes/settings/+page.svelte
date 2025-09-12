<script lang="ts">
	import Navigation from '$lib/components/Navigation.svelte';
	import { Bell, Shield, HelpCircle, Palette } from 'lucide-svelte';
	import { themeStore } from '$lib/stores/theme.svelte';

	// Notification preferences
	let pushNotifications = $state(true);
	let broadcastNotifications = $state(true);
	let chatNotifications = $state(true);

	// Theme settings - Initialize from theme store
	let selectedTheme = $state(themeStore.theme); // 'system', 'light', 'dark'
	
	// Get the current effective theme (for UI display)
	let appliedTheme = $derived(themeStore.isDarkMode ? 'dark' : 'light');

	// Privacy settings
	let onlineStatus = $state(true);
	let readReceipts = $state(true);
	let profileVisibility = $state('team'); // 'everyone', 'team', 'managers'

	const handleSaveSettings = () => {
		// Apply the selected theme using the theme store
		themeStore.setTheme(selectedTheme);
		
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
</script>

<svelte:head>
	<title>Settings - Collaboration Tool</title>
</svelte:head>

<Navigation />

<div class="min-h-screen transition-colors duration-300 {appliedTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}">
	<div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="text-2xl font-bold transition-colors duration-300 {appliedTheme === 'dark' ? 'text-white' : 'text-gray-900'}">Settings</h1>
			<p class="mt-1 transition-colors duration-300 {appliedTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'}">Manage your account preferences and application settings</p>
		</div>

		<div class="space-y-6">
			<!-- Appearance Settings -->
			<div class="rounded-xl shadow-sm border transition-colors duration-300 {appliedTheme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}">
				<div class="p-6 border-b transition-colors duration-300 {appliedTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}">
					<h2 class="text-lg font-semibold flex items-center space-x-2 transition-colors duration-300 {appliedTheme === 'dark' ? 'text-white' : 'text-gray-900'}">
						<Palette class="w-5 h-5" />
						<span>Appearance</span>
					</h2>
					<p class="text-sm mt-1 transition-colors duration-300 {appliedTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'}">Choose your preferred theme for the application</p>
				</div>
				<div class="p-6">
					<div class="space-y-4">
						<div class="text-sm font-medium mb-3 transition-colors duration-300 {appliedTheme === 'dark' ? 'text-gray-200' : 'text-gray-700'}">Theme</div>
						<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
							<!-- System Default -->
							<label class="relative cursor-pointer">
								<input 
									type="radio" 
									name="theme" 
									value="system" 
									bind:group={selectedTheme} 
									class="sr-only peer" 
								/>
								<div class="p-4 border-2 rounded-lg transition-all peer-checked:border-[#01c0a4] peer-checked:bg-[#01c0a4]/5 {appliedTheme === 'dark' ? 'border-gray-600 hover:border-gray-500' : 'border-gray-200 hover:border-gray-300'}">
									<div class="flex items-center space-x-3">
										<div class="flex-shrink-0">
											<div class="w-6 h-6 rounded-full border-2 transition-all {selectedTheme === 'system' ? 'border-[#01c0a4] bg-[#01c0a4]' : (appliedTheme === 'dark' ? 'border-gray-500 bg-gray-700' : 'border-gray-300 bg-white')} flex items-center justify-center">
												{#if selectedTheme === 'system'}
													<div class="w-3 h-3 bg-white rounded-full"></div>
												{/if}
											</div>
										</div>
										<div>
											<div class="font-medium transition-colors duration-300 {appliedTheme === 'dark' ? 'text-white' : 'text-gray-900'}">System Default</div>
											<div class="text-sm transition-colors duration-300 {appliedTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}">Follow system preferences</div>
										</div>
									</div>
								</div>
							</label>

							<!-- Light Mode -->
							<label class="relative cursor-pointer">
								<input 
									type="radio" 
									name="theme" 
									value="light" 
									bind:group={selectedTheme} 
									class="sr-only peer" 
								/>
								<div class="p-4 border-2 rounded-lg transition-all peer-checked:border-[#01c0a4] peer-checked:bg-[#01c0a4]/5 {appliedTheme === 'dark' ? 'border-gray-600 hover:border-gray-500' : 'border-gray-200 hover:border-gray-300'}">
									<div class="flex items-center space-x-3">
										<div class="flex-shrink-0">
											<div class="w-6 h-6 rounded-full border-2 transition-all {selectedTheme === 'light' ? 'border-[#01c0a4] bg-[#01c0a4]' : (appliedTheme === 'dark' ? 'border-gray-500 bg-gray-700' : 'border-gray-300 bg-white')} flex items-center justify-center">
												{#if selectedTheme === 'light'}
													<div class="w-3 h-3 bg-white rounded-full"></div>
												{/if}
											</div>
										</div>
										<div>
											<div class="font-medium transition-colors duration-300 {appliedTheme === 'dark' ? 'text-white' : 'text-gray-900'}">Light Mode</div>
											<div class="text-sm transition-colors duration-300 {appliedTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}">Clean and bright interface</div>
										</div>
									</div>
								</div>
							</label>

							<!-- Dark Mode -->
							<label class="relative cursor-pointer">
								<input 
									type="radio" 
									name="theme" 
									value="dark" 
									bind:group={selectedTheme} 
									class="sr-only peer" 
								/>
								<div class="p-4 border-2 rounded-lg transition-all peer-checked:border-[#01c0a4] peer-checked:bg-[#01c0a4]/5 {appliedTheme === 'dark' ? 'border-gray-600 hover:border-gray-500' : 'border-gray-200 hover:border-gray-300'}">
									<div class="flex items-center space-x-3">
										<div class="flex-shrink-0">
											<div class="w-6 h-6 rounded-full border-2 transition-all {selectedTheme === 'dark' ? 'border-[#01c0a4] bg-[#01c0a4]' : (appliedTheme === 'dark' ? 'border-gray-500 bg-gray-700' : 'border-gray-300 bg-white')} flex items-center justify-center">
												{#if selectedTheme === 'dark'}
													<div class="w-3 h-3 bg-white rounded-full"></div>
												{/if}
											</div>
										</div>
										<div>
											<div class="font-medium transition-colors duration-300 {appliedTheme === 'dark' ? 'text-white' : 'text-gray-900'}">Dark Mode</div>
											<div class="text-sm transition-colors duration-300 {appliedTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}">Easy on the eyes</div>
										</div>
									</div>
								</div>
							</label>
						</div>
					</div>
				</div>
			</div>

			<!-- Notification Settings -->
			<div class="rounded-xl shadow-sm border transition-colors duration-300 {appliedTheme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}">
				<div class="p-6 border-b transition-colors duration-300 {appliedTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}">
					<h2 class="text-lg font-semibold flex items-center space-x-2 transition-colors duration-300 {appliedTheme === 'dark' ? 'text-white' : 'text-gray-900'}">
						<Bell class="w-5 h-5 transition-colors duration-300 {appliedTheme === 'dark' ? 'text-gray-400' : 'text-gray-700'}" />
						<span>Notifications</span>
					</h2>
					<p class="text-sm mt-1 transition-colors duration-300 {appliedTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}">Choose which notifications you want to receive</p>
				</div>
				<div class="p-6 space-y-4">
					<div class="flex items-center justify-between">
						<div>
							<div class="text-sm font-medium transition-colors duration-300 {appliedTheme === 'dark' ? 'text-white' : 'text-gray-700'}">Push Notifications</div>
							<p class="text-xs transition-colors duration-300 {appliedTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}">Receive push notifications on this device</p>
						</div>
						<label class="relative inline-flex items-center cursor-pointer">
							<input type="checkbox" bind:checked={pushNotifications} class="sr-only peer" aria-label="Push Notifications" />
							<div class="w-11 h-6 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#01c0a4]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#01c0a4] transition-colors duration-300 {appliedTheme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'}"></div>
						</label>
					</div>
					<div class="flex items-center justify-between">
						<div>
							<div class="text-sm font-medium transition-colors duration-300 {appliedTheme === 'dark' ? 'text-white' : 'text-gray-700'}">Broadcast Notifications</div>
							<p class="text-xs transition-colors duration-300 {appliedTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}">Get notified about company announcements</p>
						</div>
						<label class="relative inline-flex items-center cursor-pointer">
							<input type="checkbox" bind:checked={broadcastNotifications} class="sr-only peer" aria-label="Broadcast Notifications" />
							<div class="w-11 h-6 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#01c0a4]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#01c0a4] transition-colors duration-300 {appliedTheme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'}"></div>
						</label>
					</div>
					<div class="flex items-center justify-between">
						<div>
							<div class="text-sm font-medium transition-colors duration-300 {appliedTheme === 'dark' ? 'text-white' : 'text-gray-700'}">Chat Notifications</div>
							<p class="text-xs transition-colors duration-300 {appliedTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}">Get notified about new messages</p>
						</div>
						<label class="relative inline-flex items-center cursor-pointer">
							<input type="checkbox" bind:checked={chatNotifications} class="sr-only peer" aria-label="Chat Notifications" />
							<div class="w-11 h-6 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#01c0a4]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#01c0a4] transition-colors duration-300 {appliedTheme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'}"></div>
						</label>
					</div>
				</div>
			</div>

			<!-- Privacy Settings -->
			<div class="rounded-xl shadow-sm border transition-colors duration-300 {appliedTheme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}">
				<div class="p-6 border-b transition-colors duration-300 {appliedTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}">
					<h2 class="text-lg font-semibold flex items-center space-x-2 transition-colors duration-300 {appliedTheme === 'dark' ? 'text-white' : 'text-gray-900'}">
						<Shield class="w-5 h-5 transition-colors duration-300 {appliedTheme === 'dark' ? 'text-gray-400' : 'text-gray-700'}" />
						<span>Privacy</span>
					</h2>
					<p class="text-sm mt-1 transition-colors duration-300 {appliedTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}">Control your privacy and visibility settings</p>
				</div>
				<div class="p-6 space-y-4">
					<div class="flex items-center justify-between">
						<div>
							<div class="text-sm font-medium transition-colors duration-300 {appliedTheme === 'dark' ? 'text-white' : 'text-gray-700'}">Show Online Status</div>
							<p class="text-xs transition-colors duration-300 {appliedTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}">Let others see when you're online</p>
						</div>
						<label class="relative inline-flex items-center cursor-pointer">
							<input type="checkbox" bind:checked={onlineStatus} class="sr-only peer" aria-label="Show Online Status" />
							<div class="w-11 h-6 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#01c0a4]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#01c0a4] transition-colors duration-300 {appliedTheme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'}"></div>
						</label>
					</div>
					<div class="flex items-center justify-between">
						<div>
							<div class="text-sm font-medium transition-colors duration-300 {appliedTheme === 'dark' ? 'text-white' : 'text-gray-700'}">Read Receipts</div>
							<p class="text-xs transition-colors duration-300 {appliedTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}">Show when you've read messages</p>
						</div>
						<label class="relative inline-flex items-center cursor-pointer">
							<input type="checkbox" bind:checked={readReceipts} class="sr-only peer" aria-label="Read Receipts" />
							<div class="w-11 h-6 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#01c0a4]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#01c0a4] transition-colors duration-300 {appliedTheme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'}"></div>
						</label>
					</div>
					<div>
						<label for="profileVisibility" class="block text-sm font-medium mb-2 transition-colors duration-300 {appliedTheme === 'dark' ? 'text-white' : 'text-gray-700'}">Profile Visibility</label>
						<select id="profileVisibility" bind:value={profileVisibility} class="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent transition-colors duration-300 {appliedTheme === 'dark' ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'}">
							<option value="everyone">Everyone</option>
							<option value="team">Team Members Only</option>
							<option value="managers">Managers Only</option>
						</select>
						<p class="text-xs mt-1 transition-colors duration-300 {appliedTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}">Choose who can view your full profile</p>
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
