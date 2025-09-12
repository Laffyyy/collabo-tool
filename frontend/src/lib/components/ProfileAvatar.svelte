<script lang="ts">
	// Props using Svelte 5 runes
	let {
		user = null,
		size = 'md',
		showOnlineStatus = false,
		onlineStatus = 'offline',
		altText = '',
		isCurrentUser = false
	}: {
		user?: {
			profilePhoto?: string;
			firstName?: string;
			lastName?: string;
			name?: string;
		} | null;
		size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
		showOnlineStatus?: boolean;
		onlineStatus?: 'online' | 'away' | 'idle' | 'offline';
		altText?: string;
		isCurrentUser?: boolean;
	} = $props();

	// Calculate initials from user data
	let initials = $derived.by(() => {
		if (isCurrentUser) {
			return 'Me';
		}
		
		if (!user) return 'U';
		
		if (user.firstName && user.lastName) {
			return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
		}
		
		if (user.name) {
			const nameParts = user.name.split(' ');
			if (nameParts.length >= 2) {
				return `${nameParts[0].charAt(0)}${nameParts[nameParts.length - 1].charAt(0)}`.toUpperCase();
			}
			return user.name.charAt(0).toUpperCase();
		}
		
		return 'U';
	});

	// Size classes mapping - adjusted for "Me" text
	const sizeClasses = {
		sm: 'w-8 h-8 text-xs',
		md: 'w-10 h-10 text-sm',
		lg: 'w-12 h-12 text-base',
		xl: 'w-16 h-16 text-xl',
		'2xl': 'w-24 h-24 text-2xl'
	};

	// Online status indicator sizes
	const statusSizes = {
		sm: 'w-2 h-2',
		md: 'w-3 h-3',
		lg: 'w-4 h-4',
		xl: 'w-5 h-5',
		'2xl': 'w-6 h-6'
	};

	// Online status colors
	const statusColors = {
		online: 'bg-green-500',
		away: 'bg-yellow-500',
		idle: 'bg-orange-500',
		offline: 'bg-gray-500'
	};

	let avatarClass = $derived(sizeClasses[size] || sizeClasses.md);
	let statusClass = $derived(statusSizes[size] || statusSizes.md);
	let statusColorClass = $derived(statusColors[onlineStatus] || statusColors.offline);
</script>

<div class="relative {size === '2xl' ? 'block' : 'inline-block'} flex-shrink-0">
	<!-- Always show initials instead of profile photos -->
	<div class="{avatarClass} rounded-full bg-[#01c0a4] flex items-center justify-center text-white font-medium flex-shrink-0">
		{initials}
	</div>
	
	{#if showOnlineStatus}
		<div class="absolute -bottom-1 -right-1 {statusClass} {statusColorClass} rounded-full"></div>
	{/if}
</div>
