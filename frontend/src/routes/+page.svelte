<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth.svelte';

	onMount(() => {
		// Redirect based on authentication status
		if ($authStore.isAuthenticated) {
			// If authenticated, redirect to appropriate dashboard
			if ($authStore.canAccessAdmin) {
				goto('/chat');
			} else {
				goto('/chat');
			}
		} else {
			// If not authenticated, redirect to login
			goto('/login');
		}
	});
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50">
	<div class="text-center">
		<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
		<p class="mt-4 text-gray-600">Loading...</p>
	</div>
</div>