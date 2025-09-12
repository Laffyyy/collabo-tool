<script lang="ts">
    // Props using Svelte 5 runes
    let {
        user = null,
        size = 'md',
        showOnlineStatus = false,
        onlineStatus = 'offline',
        altText = ''
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
    } = $props();

    // Calculate initials from user data
    let initials = $derived.by(() => {
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

    // Size classes mapping
    const sizeClasses = {
        sm: 'w-6 h-6 text-xs',
        md: 'w-8 h-8 text-sm',
        lg: 'w-10 h-10 text-lg',
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

    // Check if we have a profile photo
    let hasProfilePhoto = $derived(user?.profilePhoto && user.profilePhoto.trim() !== '');
</script>

<div class="relative {size === '2xl' ? 'block' : 'inline-block'} flex-shrink-0">
    {#if hasProfilePhoto}
        <!-- Show profile photo -->
        <img 
            src={user.profilePhoto} 
            alt={altText || (user.name ? `${user.name}'s profile photo` : 'Profile photo')}
            class="{avatarClass} rounded-full object-cover border-2 border-gray-200"
            onerror={(e) => {
                // Fallback to initials if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                    const fallback = document.createElement('div');
                    fallback.className = `${avatarClass} rounded-full bg-[#01c0a4] flex items-center justify-center text-white font-medium flex-shrink-0`;
                    fallback.textContent = initials;
                    parent.appendChild(fallback);
                }
            }}
        />
    {:else}
        <!-- Show initials fallback -->
        <div class="{avatarClass} rounded-full bg-[#01c0a4] flex items-center justify-center text-white font-medium flex-shrink-0">
            {initials}
        </div>
    {/if}
    
    {#if showOnlineStatus}
        <div class="absolute -bottom-1 -right-1 {statusClass} {statusColorClass} rounded-full border-2 border-white"></div>
    {/if}
</div>