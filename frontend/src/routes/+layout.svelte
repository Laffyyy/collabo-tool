<script lang="ts">
	import '../app.css';
	import Navigation from '$lib/components/Navigation.svelte';
	import { page } from '$app/stores';
	import { authStore } from '$lib/stores/auth.svelte';
  	import ToastContainer from '$lib/components/ToastContainer.svelte';
	import { onMount } from 'svelte';
	
	let { children } = $props();
	
	// Try to restore session on app load
	onMount(() => {
		$authStore.restoreSession();
	});
	
	// Pages that should not show navigation
	const noNavPages = ['/login', '/forgot-password', '/otp', '/security-question', '/change-password', '/first-time', '/chat'];
	// Profile and settings pages handle their own navigation to avoid double navigation
	const isProfilePage = $derived($page.url.pathname === '/profile');
	const isSettingsPage = $derived($page.url.pathname === '/settings');
	let showNavigation = $derived(!noNavPages.includes($page.url.pathname) && !isProfilePage && !isSettingsPage);
</script>

<ToastContainer />

{#if showNavigation}
	<Navigation />
{/if}

<main class="min-h-screen {showNavigation ? 'bg-gray-50 pt-0' : ''}">
	{@render children()}
</main>
