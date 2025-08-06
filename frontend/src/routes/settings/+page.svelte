<script lang="ts">
	import Navigation from '$lib/components/Navigation.svelte';
	import { Bell, Shield, HelpCircle, Palette } from 'lucide-svelte';

	// Notification preferences
	let pushNotifications = $state(true);
	let broadcastNotifications = $state(true);
	let chatNotifications = $state(true);

	// Privacy settings
	let onlineStatus = $state(true);
	let readReceipts = $state(true);
	let profileVisibility = $state('team'); // 'everyone', 'team', 'managers'

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
</script>

<svelte:head>
	<title>Settings - Collaboration Tool</title>
</svelte:head>

<Navigation />

<div class="min-h-screen bg-gray-50">
	<div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="text-2xl font-bold text-gray-900">Settings</h1>
			<p class="text-gray-600 mt-1">Manage your account preferences and application settings</p>
		</div>

		<div class="space-y-6">
			<!-- Appearance Settings -->
			<div class="bg-white rounded-xl shadow-sm border border-gray-200">
				<div class="p-6 border-b border-gray-200">
					<h2 class="text-lg font-semibold text-gray-900 flex items-center space-x-2">
						<Palette class="w-5 h-5" />
						<span>Appearance</span>
					</h2>
					<p class="text-sm text-gray-600 mt-1">Application appearance is set to light mode for stability</p>
				</div>
				<div class="p-6">
					<div class="flex items-center justify-center py-8 text-gray-500">
						<div class="text-center">
							<Palette class="w-12 h-12 mx-auto mb-4 text-gray-400" />
							<p class="text-sm">Light mode is enabled for optimal performance</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Notification Settings -->
			<div class="bg-white rounded-xl shadow-sm border border-gray-200">
				<div class="p-6 border-b border-gray-200">
					<h2 class="text-lg font-semibold text-gray-900 flex items-center space-x-2">
						<Bell class="w-5 h-5" />
						<span>Notifications</span>
					</h2>
					<p class="text-sm text-gray-600 mt-1">Choose which notifications you want to receive</p>
				</div>
				<div class="p-6 space-y-4">
					<div class="flex items-center justify-between">
						<div>
							<div class="text-sm font-medium text-gray-700">Push Notifications</div>
							<p class="text-xs text-gray-500">Receive push notifications on this device</p>
						</div>
						<label class="relative inline-flex items-center cursor-pointer">
							<input type="checkbox" bind:checked={pushNotifications} class="sr-only peer" aria-label="Push Notifications" />
							<div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#01c0a4]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#01c0a4]"></div>
						</label>
					</div>
					<div class="flex items-center justify-between">
						<div>
							<div class="text-sm font-medium text-gray-700">Broadcast Notifications</div>
							<p class="text-xs text-gray-500">Get notified about company announcements</p>
						</div>
						<label class="relative inline-flex items-center cursor-pointer">
							<input type="checkbox" bind:checked={broadcastNotifications} class="sr-only peer" aria-label="Broadcast Notifications" />
							<div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#01c0a4]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#01c0a4]"></div>
						</label>
					</div>
					<div class="flex items-center justify-between">
						<div>
							<div class="text-sm font-medium text-gray-700">Chat Notifications</div>
							<p class="text-xs text-gray-500">Get notified about new messages</p>
						</div>
						<label class="relative inline-flex items-center cursor-pointer">
							<input type="checkbox" bind:checked={chatNotifications} class="sr-only peer" aria-label="Chat Notifications" />
							<div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#01c0a4]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#01c0a4]"></div>
						</label>
					</div>
				</div>
			</div>

			<!-- Privacy Settings -->
			<div class="bg-white rounded-xl shadow-sm border border-gray-200">
				<div class="p-6 border-b border-gray-200">
					<h2 class="text-lg font-semibold text-gray-900 flex items-center space-x-2">
						<Shield class="w-5 h-5" />
						<span>Privacy</span>
					</h2>
					<p class="text-sm text-gray-600 mt-1">Control your privacy and visibility settings</p>
				</div>
				<div class="p-6 space-y-4">
					<div class="flex items-center justify-between">
						<div>
							<div class="text-sm font-medium text-gray-700">Show Online Status</div>
							<p class="text-xs text-gray-500">Let others see when you're online</p>
						</div>
						<label class="relative inline-flex items-center cursor-pointer">
							<input type="checkbox" bind:checked={onlineStatus} class="sr-only peer" aria-label="Show Online Status" />
							<div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#01c0a4]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#01c0a4]"></div>
						</label>
					</div>
					<div class="flex items-center justify-between">
						<div>
							<div class="text-sm font-medium text-gray-700">Read Receipts</div>
							<p class="text-xs text-gray-500">Show when you've read messages</p>
						</div>
						<label class="relative inline-flex items-center cursor-pointer">
							<input type="checkbox" bind:checked={readReceipts} class="sr-only peer" aria-label="Read Receipts" />
							<div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#01c0a4]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#01c0a4]"></div>
						</label>
					</div>
					<div>
						<label for="profileVisibility" class="block text-sm font-medium text-gray-700 mb-2">Profile Visibility</label>
						<select id="profileVisibility" bind:value={profileVisibility} class="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent">
							<option value="everyone">Everyone</option>
							<option value="team">Team Members Only</option>
							<option value="managers">Managers Only</option>
						</select>
						<p class="text-xs text-gray-500 mt-1">Choose who can view your full profile</p>
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
