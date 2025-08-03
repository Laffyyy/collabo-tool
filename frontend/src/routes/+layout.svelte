<script lang="ts">
	import '../app.css';
	import Navigation from '$lib/components/Navigation.svelte';
	import { page } from '$app/stores';
	
	let { children } = $props();
	
	// Pages that should not show navigation
	const noNavPages = ['/login', '/forgot-password', '/otp', '/security-question', '/change-password', '/first-time', '/chat'];
	// Profile page handles its own navigation to avoid double navigation
	const isProfilePage = $derived($page.url.pathname === '/profile');
	// Admin pages handle their own navigation EXCEPT admin-logs which uses layout navigation
	const isAdminPageExceptLogs = $derived($page.url.pathname.startsWith('/admin/') && $page.url.pathname !== '/admin/admin-logs');
	let showNavigation = $derived(!noNavPages.includes($page.url.pathname) && !isProfilePage && !isAdminPageExceptLogs);
</script>

{#if showNavigation}
	<Navigation />
{/if}

<main class="min-h-screen {showNavigation ? 'bg-gray-50' : ''}">
	{@render children()}
</main>
