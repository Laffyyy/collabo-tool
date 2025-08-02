<script lang="ts">
	import '../app.css';
	import Navigation from '$lib/components/Navigation.svelte';
	import { page } from '$app/stores';
	
	let { children } = $props();
	
	// Pages that should not show navigation
	const noNavPages = ['/login', '/forgot-password', '/otp', '/security-question', '/change-password', '/first-time', '/chat'];
	let showNavigation = $derived(!noNavPages.includes($page.url.pathname));
</script>

{#if showNavigation}
	<Navigation />
{/if}

<main class="min-h-screen {showNavigation ? 'bg-gray-50' : ''}">
	{@render children()}
</main>
