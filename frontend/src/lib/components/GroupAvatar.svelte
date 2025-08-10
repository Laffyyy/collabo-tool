<script lang="ts">
	import ProfileAvatar from './ProfileAvatar.svelte';

	// Props using Svelte 5 runes
	let {
		members = [],
		size = 'md',
		showOnlineStatus = false
	}: {
		members?: Array<{
			id: string;
			name: string;
			firstName?: string;
			lastName?: string;
			profilePhoto?: string;
		}>;
		size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
		showOnlineStatus?: boolean;
	} = $props();

	// Size classes mapping for container
	const containerSizeClasses = {
		sm: 'w-8 h-8',
		md: 'w-10 h-10',
		lg: 'w-12 h-12',
		xl: 'w-16 h-16',
		'2xl': 'w-24 h-24'
	};

	// Individual avatar sizes for composite view (smaller for overlapping)
	const avatarSizes = {
		sm: { size: 'sm', scale: '0.7' },
		md: { size: 'sm', scale: '0.8' },
		lg: { size: 'md', scale: '0.8' },
		xl: { size: 'lg', scale: '0.85' },
		'2xl': { size: 'xl', scale: '0.9' }
	};

	// Get display members (first 4, excluding current user if present)
	let displayMembers = $derived.by(() => {
		// Filter out current user (id: '1') and take first 4
		const filteredMembers = members.filter(m => m.id !== '1');
		return filteredMembers.slice(0, 4);
	});

	let containerClass = $derived(containerSizeClasses[size] || containerSizeClasses.md);
	let avatarConfig = $derived(avatarSizes[size] || avatarSizes.md);
</script>

<div class="relative {containerClass} flex-shrink-0">
	{#if displayMembers.length === 1}
		<!-- Single member - just show their avatar -->
		<ProfileAvatar 
			user={displayMembers[0]} 
			{size} 
			{showOnlineStatus}
		/>
	{:else if displayMembers.length >= 2}
		<!-- Two circles side by side for all group sizes (2+) -->
		<div class="w-full h-full relative flex">
			<!-- Left circle -->
			<div class="w-1/2 h-full relative overflow-hidden rounded-l-full">
				<div class="absolute inset-0 transform scale-110 -translate-x-1">
					<ProfileAvatar 
						user={displayMembers[0]} 
						size={avatarConfig.size as 'sm' | 'md' | 'lg' | 'xl' | '2xl'} 
						showOnlineStatus={false}
					/>
				</div>
			</div>
			<!-- Right circle -->
			<div class="w-1/2 h-full relative overflow-hidden rounded-r-full">
				<div class="absolute inset-0 transform scale-110 translate-x-1">
					<ProfileAvatar 
						user={displayMembers[1] || displayMembers[0]} 
						size={avatarConfig.size as 'sm' | 'md' | 'lg' | 'xl' | '2xl'} 
						showOnlineStatus={false}
					/>
				</div>
			</div>
		</div>
	{:else}
		<!-- No members - fallback to default group icon -->
		<div class="{containerClass} rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
			<svg class="w-1/2 h-1/2" fill="currentColor" viewBox="0 0 20 20">
				<path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
			</svg>
		</div>
	{/if}
</div>
