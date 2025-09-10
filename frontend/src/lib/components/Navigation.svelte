<script lang="ts">
	import { Users, Bell, Search, User, Megaphone, Clock, AlertTriangle, ChevronDown, Settings, UserCog, Building2, MessageSquare, Radio, Globe, FileText } from 'lucide-svelte';
	import { LogOut } from 'lucide-svelte';
  	import { apiClient } from '$lib/api/client';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { broadcastStore } from '$lib/stores/broadcast.svelte';
	import { authStore } from '$lib/stores/auth.svelte';
	import { themeStore } from '$lib/stores/theme';
	import ProfileAvatar from '$lib/components/ProfileAvatar.svelte';

	let showNotifications = $state(false);
	let showProfile = $state(false);
	let showAdminDropdown = $state(false);
	
	// Subscribe to broadcast store with proper reactive pattern
	let broadcasts = $derived($broadcastStore?.unreadBroadcasts || []);
	let hasUnreadBroadcasts = $derived(broadcasts.length > 0);

	// Get user info from auth store
	let user = $derived($authStore?.user);
	let userInitials = $derived($authStore?.userInitials || 'U.U');
	let onlineStatusColor = $derived($authStore?.onlineStatusColor || 'bg-gray-500');
	
	// Role-based access control
	let canAccessAdmin = $derived($authStore?.canAccessAdmin || false);

	// Get theme info
	let isDarkMode = $derived(themeStore.isDarkMode);

	// Get current page for navigation indicators
	let currentPath = $derived($page.url.pathname);
	
	// Helper function to determine if a page is active
	const isActivePage = (pagePath: string) => {
		if (pagePath === '/chat') {
			return currentPath === '/chat' || currentPath === '/';
		}
		return currentPath.startsWith(pagePath);
	};

	const formatTimeAgo = (date: Date) => {
		const now = new Date();
		const diffInMs = now.getTime() - date.getTime();
		const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
		const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
		
		if (diffInMinutes < 1) return 'Just now';
		if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
		if (diffInHours < 24) return `${diffInHours}h ago`;
		return date.toLocaleDateString();
	};

	const getPriorityColor = (priority: string) => {
		switch (priority) {
			case 'high': return 'text-red-600 bg-red-50 border-red-200';
			case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
			case 'low': return 'text-green-600 bg-green-50 border-green-200';
			default: return 'text-gray-600 bg-gray-50 border-gray-200';
		}
	};

	const navigateToBroadcast = () => {
		showNotifications = false;
		goto('/broadcast');
	};

	const navigateToAdminPage = (page: string) => {
		showAdminDropdown = false;
		// Force page reload to ensure fresh content
		goto(`/admin/${page}`, { invalidateAll: true });
	};

	// Add logout function
	const handleLogout = async () => {
		try {
			await apiClient.logout();
			showProfile = false;
		} catch (error) {
			console.error('Logout error:', error);
		} finally {
			// Always logout on frontend side regardless of API success/failure
			$authStore.logout();
			goto('/login');
		}
	};
</script>

<header class="sticky top-0 z-50 bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600 px-6 py-3 flex items-center justify-between shadow-sm transition-colors duration-200">
	<!-- Logo -->
	<div class="flex items-center space-x-4">
		<img 
			src="/logo.png" 
			alt="Collaby Logo" 
			class="w-10 h-10 object-contain"
		/>
		<h1 class="text-xl font-bold text-gray-800 dark:text-gray-100">Collaby</h1>
	</div>

	<!-- Navigation -->
	<nav class="hidden md:flex items-center space-x-8">
		<button 
			onclick={() => goto('/chat')}
			class="relative text-gray-600 dark:text-gray-300 hover:text-[#01c0a4] font-medium transition-colors {isActivePage('/chat') ? 'text-[#01c0a4]' : ''}"
		>
			Messages
			{#if isActivePage('/chat')}
				<div class="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-[#01c0a4] rounded-full"></div>
			{/if}
		</button>
		<button 
			onclick={() => goto('/broadcast')}
			class="relative text-gray-600 dark:text-gray-300 hover:text-[#01c0a4] font-medium transition-colors {isActivePage('/broadcast') ? 'text-[#01c0a4]' : ''}"
		>
			Broadcast
			{#if isActivePage('/broadcast')}
				<div class="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-[#01c0a4] rounded-full"></div>
			{/if}
		</button>
		
		<!-- Admin Controls Dropdown - Only show for admin users -->
		{#if canAccessAdmin}
			<div class="relative">
				<button 
					onclick={() => showAdminDropdown = !showAdminDropdown}
					class="flex items-center space-x-1 text-gray-600 hover:text-[#01c0a4] font-medium transition-colors {isActivePage('/admin') ? 'text-[#01c0a4]' : ''}"
				>
					<span>Admin Controls</span>
					<ChevronDown class="w-4 h-4 transition-transform {showAdminDropdown ? 'rotate-180' : ''}" />
					{#if isActivePage('/admin')}
						<div class="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-[#01c0a4] rounded-full"></div>
					{/if}
				</button>

				<!-- Admin Dropdown -->
			{#if showAdminDropdown}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div 
					class="fixed inset-0 z-40" 
					onclick={() => showAdminDropdown = false}
				></div>
				
				<div class="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 z-50 py-2">
					<div class="px-3 py-2 border-b border-gray-100 dark:border-gray-600">
						<p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Administration</p>
					</div>
					
					<button 
						onclick={() => navigateToAdminPage('user-management')}
						class="w-full px-4 py-3 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3 transition-colors {currentPath.includes('user-management') ? 'bg-[#01c0a4]/5 text-[#01c0a4]' : ''}"
					>
						<UserCog class="w-4 h-4" />
						<div>
							<div class="font-medium">User Management</div>
							<div class="text-xs text-gray-500 dark:text-gray-400">Manage user accounts and roles</div>
						</div>
					</button>
					
					<button 
						onclick={() => navigateToAdminPage('ou-management')}
						class="w-full px-4 py-3 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3 transition-colors {currentPath.includes('ou-management') ? 'bg-[#01c0a4]/5 text-[#01c0a4]' : ''}"
					>
						<Building2 class="w-4 h-4" />
						<div>
							<div class="font-medium">OU Management</div>
							<div class="text-xs text-gray-500 dark:text-gray-400">Organizational unit management</div>
						</div>
					</button>
					
					<button 
						onclick={() => navigateToAdminPage('chat-management')}
						class="w-full px-4 py-3 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3 transition-colors {currentPath.includes('chat-management') ? 'bg-[#01c0a4]/5 text-[#01c0a4]' : ''}"
					>
						<MessageSquare class="w-4 h-4" />
						<div>
							<div class="font-medium">Chat Management</div>
							<div class="text-xs text-gray-500 dark:text-gray-400">Monitor chat communications</div>
						</div>
					</button>
					
					<button 
						onclick={() => navigateToAdminPage('broadcast-management')}
						class="w-full px-4 py-3 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3 transition-colors {currentPath.includes('broadcast-management') ? 'bg-[#01c0a4]/5 text-[#01c0a4]' : ''}"
					>
						<Radio class="w-4 h-4" />
						<div>
							<div class="font-medium">Broadcast Management</div>
							<div class="text-xs text-gray-500 dark:text-gray-400">Monitor broadcasts</div>
						</div>
					</button>
					
					<button 
						onclick={() => navigateToAdminPage('global-configuration')}
						class="w-full px-4 py-3 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3 transition-colors {currentPath.includes('global-configuration') ? 'bg-[#01c0a4]/5 text-[#01c0a4]' : ''}"
					>
						<Globe class="w-4 h-4" />
						<div>
							<div class="font-medium">Global Configuration</div>
							<div class="text-xs text-gray-500 dark:text-gray-400">System-wide settings</div>
						</div>
					</button>
					
					<button 
						onclick={() => navigateToAdminPage('admin-logs')}
						class="w-full px-4 py-3 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3 transition-colors {currentPath.includes('admin-logs') ? 'bg-[#01c0a4]/5 text-[#01c0a4]' : ''}"
					>
						<FileText class="w-4 h-4" />
						<div>
							<div class="font-medium">Admin Logs</div>
							<div class="text-xs text-gray-500 dark:text-gray-400">View administrative actions</div>
						</div>
					</button>
				</div>
			{/if}
		</div>
		{/if}
	</nav>

	<!-- Right side actions -->
	<div class="flex items-center space-x-4">
		<!-- Search -->
		<button class="p-2 text-gray-600 dark:text-gray-300 hover:text-[#01c0a4] hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
			<Search class="w-5 h-5" />
		</button>

		<!-- Notifications -->
		<div class="relative">
			<button 
				onclick={() => showNotifications = !showNotifications}
				class="p-2 text-gray-600 dark:text-gray-300 hover:text-[#01c0a4] hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors relative"
			>
				<Bell class="w-5 h-5" />
				{#if hasUnreadBroadcasts}
					<span class="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
				{/if}
			</button>

			<!-- Notification Dropdown -->
			{#if showNotifications}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div 
					class="fixed inset-0 z-40" 
					onclick={() => showNotifications = false}
				></div>
				
				<div class="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 z-50 max-h-96 overflow-hidden">
					<!-- Header -->
					<div class="px-4 py-3 border-b border-gray-100 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
						<div class="flex items-center justify-between">
							<h3 class="font-semibold text-gray-800 dark:text-gray-100">Notifications</h3>
							{#if hasUnreadBroadcasts}
								<span class="text-xs text-gray-500 dark:text-gray-400">{broadcasts.length} new</span>
							{/if}
						</div>
					</div>

					<!-- Notifications List -->
					<div class="overflow-y-auto max-h-80">
						{#if broadcasts.length > 0}
							{#each broadcasts as broadcast}
								<!-- svelte-ignore a11y_click_events_have_key_events -->
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<div 
									class="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-600 transition-colors"
									onclick={navigateToBroadcast}
								>
									<div class="flex items-start space-x-3">
										<!-- Icon -->
										<div class="flex-shrink-0 mt-1">
											{#if broadcast.priority === 'high'}
												<div class="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
													<AlertTriangle class="w-4 h-4 text-red-600 dark:text-red-400" />
												</div>
											{:else}
												<div class="w-8 h-8 bg-[#01c0a4]/10 dark:bg-[#01c0a4]/20 rounded-full flex items-center justify-center">
													<Megaphone class="w-4 h-4 text-[#01c0a4]" />
												</div>
											{/if}
										</div>

										<!-- Content -->
										<div class="flex-1 min-w-0">
											<div class="flex items-start justify-between">
												<p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
													{broadcast.title}
												</p>
												<span class="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
													{formatTimeAgo(broadcast.createdAt)}
												</span>
											</div>
											<p class="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
												{broadcast.content}
											</p>
											
											<!-- Priority Badge -->
											<div class="flex items-center mt-2">
												<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border {getPriorityColor(broadcast.priority)}">
													{broadcast.priority.toUpperCase()}
												</span>
												{#if broadcast.requiresAcknowledgment}
													<span class="ml-2 text-xs text-gray-500 dark:text-gray-400 flex items-center">
														<Clock class="w-3 h-3 mr-1" />
														Acknowledgment required
													</span>
												{/if}
											</div>
										</div>
									</div>
								</div>
							{/each}
							
							<!-- View All Button -->
							<div class="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-100 dark:border-gray-600">
								<button 
									onclick={navigateToBroadcast}
									class="w-full text-center text-sm font-medium text-[#01c0a4] hover:text-[#00a085] transition-colors"
								>
									View all broadcasts
								</button>
							</div>
						{:else}
							<div class="px-4 py-8 text-center">
								<Megaphone class="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
								<p class="text-sm text-gray-500 dark:text-gray-400">No new broadcasts</p>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</div>

		<!-- Profile -->
		<div class="relative">
			<button 
				onclick={() => showProfile = !showProfile}
				class="flex items-center space-x-2 p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
			>
				<ProfileAvatar 
					user={user} 
					size="md" 
					showOnlineStatus={true} 
					onlineStatus={user?.onlineStatus || 'offline'} 
				/>
			</button>

			{#if showProfile}
				<div class="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 py-2 z-50">
					<div class="px-4 py-3 border-b border-gray-200 dark:border-gray-600">
						<div class="flex items-center space-x-3">
							<ProfileAvatar 
								user={user} 
								size="lg" 
								showOnlineStatus={true} 
								onlineStatus={user?.onlineStatus || 'offline'} 
							/>
							<div>
								<p class="text-sm font-medium text-gray-900">
									{user?.firstName && user?.lastName 
									? `${user.firstName} ${user.lastName}` 
									: user?.username || 'Loading...'}
								</p>
								<p class="text-xs text-gray-500 capitalize">{user?.role || 'Loading...'}</p>
								<p class="text-xs text-gray-400 capitalize">{user?.onlineStatus || 'offline'}</p>
							</div>
						</div>
					</div>
					
					<!-- Online Status Controls -->
					<div class="px-4 py-2 border-b border-gray-200 dark:border-gray-600">
						<p class="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Set Status</p>
						<div class="space-y-1">
							<button 
								onclick={() => $authStore.updateOnlineStatus('online')}
								class="w-full flex items-center space-x-2 px-2 py-1 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors {user?.onlineStatus === 'online' ? 'bg-green-50 dark:bg-green-900/20' : ''}"
							>
								<div class="w-2 h-2 bg-green-500 rounded-full"></div>
								<span class="text-sm text-gray-700 dark:text-gray-300">Online</span>
							</button>
							<button 
								onclick={() => $authStore.updateOnlineStatus('away')}
								class="w-full flex items-center space-x-2 px-2 py-1 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors {user?.onlineStatus === 'away' ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}"
							>
								<div class="w-2 h-2 bg-yellow-500 rounded-full"></div>
								<span class="text-sm text-gray-700 dark:text-gray-300">Away</span>
							</button>
							<button 
								onclick={() => $authStore.updateOnlineStatus('idle')}
								class="w-full flex items-center space-x-2 px-2 py-1 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors {user?.onlineStatus === 'idle' ? 'bg-orange-50 dark:bg-orange-900/20' : ''}"
							>
								<div class="w-2 h-2 bg-orange-500 rounded-full"></div>
								<span class="text-sm text-gray-700 dark:text-gray-300">Idle</span>
							</button>
							<button 
								onclick={() => $authStore.updateOnlineStatus('offline')}
								class="w-full flex items-center space-x-2 px-2 py-1 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors {user?.onlineStatus === 'offline' ? 'bg-gray-50 dark:bg-gray-700' : ''}"
							>
								<div class="w-2 h-2 bg-gray-500 rounded-full"></div>
								<span class="text-sm text-gray-700 dark:text-gray-300">Offline</span>
							</button>
						</div>
					</div>
					
					<button 
						onclick={() => { showProfile = false; goto('/profile'); }}
						class="w-full px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3 transition-colors"
					>
						<User class="w-4 h-4" />
						<span>View Profile</span>
					</button>
					
					<button 
						onclick={() => { showProfile = false; goto('/settings'); }}
						class="w-full px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3 transition-colors"
					>
						<Settings class="w-4 h-4" />
						<span>Settings</span>
					</button>
					
					<div class="border-t border-gray-200 dark:border-gray-600 mt-2 pt-2">
						<button 
							onclick={handleLogout}
							class="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center space-x-3 transition-colors"
						>
							<LogOut class="w-4 h-4" />
							<span>Sign Out</span>
						</button>
					</div>
				</div>
			{/if}
		</div>
	</div>
</header>

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
