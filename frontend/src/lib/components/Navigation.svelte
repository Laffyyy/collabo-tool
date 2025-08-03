<script lang="ts">
	import { Users, Bell, Search, User, Megaphone, Clock, AlertTriangle, ChevronDown, Settings, UserCog, Building2, MessageSquare, Radio, Globe, FileText } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { broadcastStore } from '$lib/stores/broadcast.svelte';
	import { authStore } from '$lib/stores/auth.svelte';

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
</script>

<header class="bg-gray-100 border-b border-gray-300 px-6 py-3 flex items-center justify-between shadow-sm">
	<!-- Logo -->
	<div class="flex items-center space-x-4">
		<div class="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-r from-[#01c0a4] to-[#00a085] rounded-xl shadow-lg shadow-[#01c0a4]/25">
			<Users class="w-5 h-5 text-white" />
		</div>
		<h1 class="text-xl font-bold text-gray-800">Workspace</h1>
	</div>

	<!-- Navigation -->
	<nav class="hidden md:flex items-center space-x-8">
		<button 
			onclick={() => goto('/chat')}
			class="text-gray-600 hover:text-[#01c0a4] font-medium transition-colors"
		>
			Messages
		</button>
		<button 
			onclick={() => goto('/broadcast')}
			class="text-gray-600 hover:text-[#01c0a4] font-medium transition-colors"
		>
			Broadcast
		</button>
		
		<!-- Admin Controls Dropdown -->
		<div class="relative">
			<button 
				onclick={() => showAdminDropdown = !showAdminDropdown}
				class="flex items-center space-x-1 text-gray-600 hover:text-[#01c0a4] font-medium transition-colors"
			>
				<span>Admin Controls</span>
				<ChevronDown class="w-4 h-4" />
			</button>

			<!-- Admin Dropdown -->
			{#if showAdminDropdown}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div 
					class="fixed inset-0 z-40" 
					onclick={() => showAdminDropdown = false}
				></div>
				
				<div class="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-50 py-2">
					<button 
						onclick={() => navigateToAdminPage('user-management')}
						class="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center space-x-3 transition-colors"
					>
						<UserCog class="w-4 h-4" />
						<span>User Management</span>
					</button>
					
					<button 
						onclick={() => navigateToAdminPage('ou-management')}
						class="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center space-x-3 transition-colors"
					>
						<Building2 class="w-4 h-4" />
						<span>OU Management</span>
					</button>
					
					<button 
						onclick={() => navigateToAdminPage('chat-management')}
						class="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center space-x-3 transition-colors"
					>
						<MessageSquare class="w-4 h-4" />
						<span>Chat Management</span>
					</button>
					
					<button 
						onclick={() => navigateToAdminPage('broadcast-management')}
						class="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center space-x-3 transition-colors"
					>
						<Radio class="w-4 h-4" />
						<span>Broadcast Management</span>
					</button>
					
					<button 
						onclick={() => navigateToAdminPage('global-configuration')}
						class="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center space-x-3 transition-colors"
					>
						<Globe class="w-4 h-4" />
						<span>Global Configuration</span>
					</button>
					
					<button 
						onclick={() => navigateToAdminPage('admin-logs')}
						class="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center space-x-3 transition-colors"
					>
						<FileText class="w-4 h-4" />
						<span>Admin Logs</span>
					</button>
				</div>
			{/if}
		</div>
	</nav>

	<!-- Right side actions -->
	<div class="flex items-center space-x-4">
		<!-- Search -->
		<button class="p-2 text-gray-600 hover:text-[#01c0a4] hover:bg-gray-200 rounded-lg transition-colors">
			<Search class="w-5 h-5" />
		</button>

		<!-- Notifications -->
		<div class="relative">
			<button 
				onclick={() => showNotifications = !showNotifications}
				class="p-2 text-gray-600 hover:text-[#01c0a4] hover:bg-gray-200 rounded-lg transition-colors relative"
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
				
				<div class="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden">
					<!-- Header -->
					<div class="px-4 py-3 border-b border-gray-100 bg-gray-50">
						<div class="flex items-center justify-between">
							<h3 class="font-semibold text-gray-800">Notifications</h3>
							{#if hasUnreadBroadcasts}
								<span class="text-xs text-gray-500">{broadcasts.length} new</span>
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
									class="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 transition-colors"
									onclick={navigateToBroadcast}
								>
									<div class="flex items-start space-x-3">
										<!-- Icon -->
										<div class="flex-shrink-0 mt-1">
											{#if broadcast.priority === 'high'}
												<div class="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
													<AlertTriangle class="w-4 h-4 text-red-600" />
												</div>
											{:else}
												<div class="w-8 h-8 bg-[#01c0a4]/10 rounded-full flex items-center justify-center">
													<Megaphone class="w-4 h-4 text-[#01c0a4]" />
												</div>
											{/if}
										</div>

										<!-- Content -->
										<div class="flex-1 min-w-0">
											<div class="flex items-start justify-between">
												<p class="text-sm font-medium text-gray-900 truncate">
													{broadcast.title}
												</p>
												<span class="text-xs text-gray-500 flex-shrink-0 ml-2">
													{formatTimeAgo(broadcast.createdAt)}
												</span>
											</div>
											<p class="text-sm text-gray-600 mt-1 line-clamp-2">
												{broadcast.content}
											</p>
											
											<!-- Priority Badge -->
											<div class="flex items-center mt-2">
												<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border {getPriorityColor(broadcast.priority)}">
													{broadcast.priority.toUpperCase()}
												</span>
												{#if broadcast.requiresAcknowledgment}
													<span class="ml-2 text-xs text-gray-500 flex items-center">
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
							<div class="px-4 py-3 bg-gray-50 border-t border-gray-100">
								<button 
									onclick={navigateToBroadcast}
									class="w-full text-center text-sm font-medium text-[#01c0a4] hover:text-[#00a085] transition-colors"
								>
									View all broadcasts
								</button>
							</div>
						{:else}
							<div class="px-4 py-8 text-center">
								<Megaphone class="w-8 h-8 text-gray-300 mx-auto mb-3" />
								<p class="text-sm text-gray-500">No new broadcasts</p>
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
				class="flex items-center space-x-2 p-2 hover:bg-gray-200 rounded-lg transition-colors"
			>
				<div class="relative">
					{#if user?.profilePhoto}
						<img 
							src={user.profilePhoto}
							alt="Profile" 
							class="w-8 h-8 rounded-full"
						/>
					{:else}
						<div class="w-8 h-8 rounded-full bg-[#01c0a4] flex items-center justify-center text-white text-sm font-medium">
							{userInitials}
						</div>
					{/if}
					<!-- Online Status Indicator -->
					<div class="absolute -bottom-1 -right-1 w-3 h-3 {onlineStatusColor} rounded-full border-2 border-white"></div>
				</div>
			</button>

			{#if showProfile}
				<div class="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
					<div class="px-4 py-3 border-b border-gray-200">
						<div class="flex items-center space-x-3">
							<div class="relative">
								{#if user?.profilePhoto}
									<img 
										src={user.profilePhoto}
										alt="Profile" 
										class="w-10 h-10 rounded-full"
									/>
								{:else}
									<div class="w-10 h-10 rounded-full bg-[#01c0a4] flex items-center justify-center text-white text-lg font-medium">
										{userInitials}
									</div>
								{/if}
								<!-- Online Status Indicator -->
								<div class="absolute -bottom-1 -right-1 w-4 h-4 {onlineStatusColor} rounded-full border-2 border-white"></div>
							</div>
							<div>
								<p class="text-sm font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
								<p class="text-xs text-gray-500 capitalize">{user?.role}</p>
								<p class="text-xs text-gray-400 capitalize">{user?.onlineStatus}</p>
							</div>
						</div>
					</div>
					
					<!-- Online Status Controls -->
					<div class="px-4 py-2 border-b border-gray-200">
						<p class="text-xs font-medium text-gray-700 mb-2">Set Status</p>
						<div class="space-y-1">
							<button 
								onclick={() => $authStore.updateOnlineStatus('online')}
								class="w-full flex items-center space-x-2 px-2 py-1 text-left hover:bg-gray-50 rounded transition-colors {user?.onlineStatus === 'online' ? 'bg-green-50' : ''}"
							>
								<div class="w-2 h-2 bg-green-500 rounded-full"></div>
								<span class="text-sm">Online</span>
							</button>
							<button 
								onclick={() => $authStore.updateOnlineStatus('away')}
								class="w-full flex items-center space-x-2 px-2 py-1 text-left hover:bg-gray-50 rounded transition-colors {user?.onlineStatus === 'away' ? 'bg-yellow-50' : ''}"
							>
								<div class="w-2 h-2 bg-yellow-500 rounded-full"></div>
								<span class="text-sm">Away</span>
							</button>
							<button 
								onclick={() => $authStore.updateOnlineStatus('idle')}
								class="w-full flex items-center space-x-2 px-2 py-1 text-left hover:bg-gray-50 rounded transition-colors {user?.onlineStatus === 'idle' ? 'bg-orange-50' : ''}"
							>
								<div class="w-2 h-2 bg-orange-500 rounded-full"></div>
								<span class="text-sm">Idle</span>
							</button>
							<button 
								onclick={() => $authStore.updateOnlineStatus('offline')}
								class="w-full flex items-center space-x-2 px-2 py-1 text-left hover:bg-gray-50 rounded transition-colors {user?.onlineStatus === 'offline' ? 'bg-gray-50' : ''}"
							>
								<div class="w-2 h-2 bg-gray-500 rounded-full"></div>
								<span class="text-sm">Offline</span>
							</button>
						</div>
					</div>
					
					<button 
						onclick={() => { showProfile = false; goto('/profile'); }}
						class="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center space-x-3 transition-colors"
					>
						<User class="w-4 h-4" />
						<span>View Profile</span>
					</button>
					
					<button 
						onclick={() => { showProfile = false; goto('/dashboard'); }}
						class="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center space-x-3 transition-colors"
					>
						<Settings class="w-4 h-4" />
						<span>Settings</span>
					</button>
					
					<div class="border-t border-gray-200 mt-2 pt-2">
						<button 
							onclick={() => { showProfile = false; goto('/login'); }}
							class="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center space-x-3 transition-colors"
						>
							<Users class="w-4 h-4" />
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
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
