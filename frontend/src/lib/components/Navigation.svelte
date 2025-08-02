<script lang="ts">
	import { Users, Bell, Search, User, Megaphone, Clock, AlertTriangle } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { broadcastStore } from '$lib/stores/broadcast.svelte.ts';

	let showNotifications = $state(false);
	let showProfile = $state(false);
	
	// Subscribe to broadcast store with proper reactive pattern
	let broadcasts = $derived($broadcastStore?.unreadBroadcasts || []);
	let hasUnreadBroadcasts = $derived(broadcasts.length > 0);

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
		<button class="text-gray-600 hover:text-[#01c0a4] font-medium transition-colors">
			Files
		</button>
		<button class="text-gray-600 hover:text-[#01c0a4] font-medium transition-colors">
			Calendar
		</button>
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
				<img 
					src="/placeholder.svg?height=32&width=32" 
					alt="Profile" 
					class="w-8 h-8 rounded-full"
				/>
			</button>
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
