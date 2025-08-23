<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth.svelte';
	
	let { children } = $props();
	
	// Check if user has admin access
	let canAccessAdmin = $derived($authStore?.canAccessAdmin || false);
	let isAuthenticated = $derived($authStore?.isAuthenticated || false);
	
	onMount(() => {
		// Restore session if needed
		if (!isAuthenticated) {
			const sessionRestored = $authStore.restoreSession();
			if (!sessionRestored) {
				// No session found, redirect to login
				goto('/login');
				return;
			}
		}
		
		// Check admin access after potential session restore
		if (isAuthenticated && !canAccessAdmin) {
			// User is authenticated but not admin, redirect to chat
			goto('/chat');
			return;
		}
	});
	
	// Reactive check for admin access
	$effect(() => {
		if (isAuthenticated && !canAccessAdmin) {
			goto('/chat');
		}
	});
</script>

<!-- Only render admin content if user has access -->
{#if isAuthenticated && canAccessAdmin}
	{@render children()}
{:else}
	<!-- Loading state or redirect happening -->
	<div class="min-h-screen flex items-center justify-center bg-gray-50">
		<div class="text-center">
			<div class="w-8 h-8 border-4 border-[#01c0a4] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
			<p class="text-gray-600">Checking permissions...</p>
		</div>
	</div>
{/if}
