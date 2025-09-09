<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { authStore } from '$lib/stores/auth.svelte';
  import { sessionManager } from '$lib/stores/session.svelte';
  import SessionWarningModal from '$lib/components/SessionWarningModal.svelte';
  import SessionTimeoutModal from '$lib/components/SessionTimeoutModal.svelte'; // Add this import
  import Navigation from '$lib/components/Navigation.svelte';
  import Toast from '$lib/components/Toast.svelte';
  import { toastStore } from '$lib/stores/toast.svelte';
  import '../app.css';
  
  let { children } = $props();

  // Use derived state from sessionManager instead of local state
  let showSessionWarning = $derived(sessionManager.isWarningShown);
  let showTimeoutModal = $derived(sessionManager.isTimeoutModalShown); 
  
  onMount(() => {
    // Start session monitoring when user is authenticated
    if ($authStore.isAuthenticated) {
      sessionManager.startMonitoring();
    }
    
    // Watch for authentication changes
    $effect(() => {
      if ($authStore.isAuthenticated) {
        sessionManager.startMonitoring();
      } else {
        sessionManager.stopMonitoring();
      }
    });
  });
  
  onDestroy(() => {
    sessionManager.stopMonitoring();
  });
  
  // Pages that should not show navigation
  const noNavPages = ['/login', '/forgot-password', '/otp', '/security-question', '/change-password', '/first-time', '/chat'];
  // Profile and settings pages handle their own navigation to avoid double navigation
  const isProfilePage = $derived($page.url.pathname === '/profile');
  const isSettingsPage = $derived($page.url.pathname === '/settings');
  let showNavigation = $derived(!noNavPages.includes($page.url.pathname) && !isProfilePage && !isSettingsPage);
</script>

{#if showNavigation}
    <Navigation />
{/if}

<main class="min-h-screen {showNavigation ? 'bg-gray-50 pt-0' : ''}">
    {@render children()}
</main>

<!-- Session Warning Modal -->
<SessionWarningModal show={showSessionWarning} />

<!-- Session Timeout Modal -->
<SessionTimeoutModal show={showTimeoutModal} />

