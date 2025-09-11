<script lang="ts">
  import '../app.css';
  import Navigation from '$lib/components/Navigation.svelte';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { goto, afterNavigate } from '$app/navigation';
  import { authStore } from '$lib/stores/auth.svelte';
  import { isAuthenticated, hasRole } from '$lib/guards/authGuard';
  import { apiClient } from '$lib/api/client';
  import UnauthorizedPage from '$lib/components/UnauthorizedPage.svelte';

  let { children } = $props();

  // Public routes that don't require authentication
  const publicRoutes = [
    '/login',
    '/otp',
    '/forgot-password',
    '/security-question',
    '/reset-password',
    '/unauthorized'
  ];

  // Routes that require specific roles
  const roleRestrictedRoutes = {
    '/admin': ['admin'],
    '/admin/user-management': ['admin'],
    '/admin/ou-management': ['admin'],
    '/admin/chat-management': ['admin'],
    '/admin/broadcast-management': ['admin'],
    '/admin/global-config': ['admin'],
    '/admin/admin-logs': ['admin'],
    '/broadcast': ['admin', 'manager', 'supervisor', 'support']
  };

  // Don't show navigation on these pages
  const noNavPages = [
    '/login',
    '/otp',
    '/forgot-password',
    '/security-question',
    '/reset-password',
    '/unauthorized'
  ];

  // Profile and settings pages handle their own navigation to avoid double navigation
  const isProfilePage = $derived($page.url.pathname === '/profile');
  const isSettingsPage = $derived($page.url.pathname === '/settings');
  let showNavigation = $derived(!publicRoutes.includes($page.url.pathname) && !isProfilePage && !isSettingsPage);

  let sessionValid = $state(true);
  let checkingSession = $state(true);

  async function validateSession() {
    // Only validate for protected routes
    const path = $page.url.pathname;
    
    // Don't validate for public routes
    if (publicRoutes.includes(path)) {
      sessionValid = true;
      checkingSession = false;
      return;
    }

    // For protected routes, validate the session
    checkingSession = true;
    
    // First check locally if we have auth data
    const hasLocalAuth = $authStore.isAuthenticated && !!$authStore.sessionToken;
    
    // If no local auth data, session is invalid
    if (!hasLocalAuth) {
      sessionValid = false;
      checkingSession = false;
      return;
    }
    
    // Verify with the server
    try {
      sessionValid = await apiClient.validateSession();
    } catch (error) {
      sessionValid = false;
    } finally {
      checkingSession = false;
    }
    
    // If session is invalid, logout
    if (!sessionValid) {
      $authStore.logout();
    }
  }
  
  onMount(() => {
    // Try to restore session from localStorage
    const restored = $authStore.restoreSession();
    
    // Check if current route requires authentication or specific roles
    checkRouteAccess();
  });
  
  // Check route permissions after navigation
  afterNavigate(() => {
    checkRouteAccess();
  });
  
  function checkRouteAccess() {
    const path = $page.url.pathname;
    
    // Always allow access to public routes
    if (publicRoutes.includes(path)) {
      return;
    }
    
    // Redirect to login if not authenticated
    if (!isAuthenticated()) {
      goto('/login');
      return;
    }
    
    // Check role restrictions
    for (const [route, roles] of Object.entries(roleRestrictedRoutes)) {
      if (path.startsWith(route)) {
        if (!hasRole(roles)) {
          goto('/unauthorized');
          return;
        }
      }
    }
  }
</script>

{#if checkingSession}
  <!-- Optional loading indicator -->
  <div class="min-h-screen flex items-center justify-center">
    <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#01c0a4]"></div>
  </div>
{:else if !sessionValid && !publicRoutes.includes($page.url.pathname)}
  <UnauthorizedPage />
{:else if showNavigation}
  <Navigation />
  <main class="min-h-screen bg-gray-50 pt-0">
    {@render children()}
  </main>
{:else}
  <main class="min-h-screen">
    {@render children()}
  </main>
{/if}

<main class="min-h-screen {showNavigation ? 'bg-gray-50 pt-0' : ''}">
  {@render children()}
</main>