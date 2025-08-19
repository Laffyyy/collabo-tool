<script lang="ts">
	// Props using Svelte 5 runes
	let {
		members = [],
		groupName = '',
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
		groupName?: string;
		size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
		showOnlineStatus?: boolean;
	} = $props();

	// Calculate initials from group name
	let groupInitials = $derived.by(() => {
		if (!groupName) return 'G';
		
		const words = groupName.trim().split(' ').filter(word => word.length > 0);
		if (words.length >= 2) {
			return `${words[0].charAt(0)}${words[words.length - 1].charAt(0)}`.toUpperCase();
		}
		return groupName.charAt(0).toUpperCase();
	});

	// Size classes mapping for container
	const containerSizeClasses = {
		sm: 'w-8 h-8 text-xs',
		md: 'w-10 h-10 text-sm', 
		lg: 'w-12 h-12 text-lg',
		xl: 'w-16 h-16 text-xl',
		'2xl': 'w-24 h-24 text-2xl'
	};

	let containerClass = $derived(containerSizeClasses[size] || containerSizeClasses.md);
</script>

<div class="relative {containerClass} flex-shrink-0">
	<!-- Always show group name initials -->
	<div class="{containerClass} rounded-full bg-[#01c0a4] flex items-center justify-center text-white font-medium flex-shrink-0">
		{groupInitials}
	</div>
</div>
