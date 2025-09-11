<script lang="ts">
  import { Clock, LogOut, RotateCcw } from 'lucide-svelte';
  import { sessionManager } from '$lib/stores/session.svelte';
  
  let { show }: { show: boolean } = $props();
  
  const handleExtend = async () => {
    const success = await sessionManager.extendSession();
    if (!success) {
      // Handle extension failure if needed
      console.error('Failed to extend session');
    }
  };
  
  const handleLogout = () => {
    sessionManager.stopMonitoring();
    // The logout will be handled by session expiry
  };
  
  const handleDismiss = () => {
    sessionManager.dismissWarning();
  };
</script>

{#if show}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
      <!-- Header -->
      <div class="flex items-center space-x-3 mb-4">
        <div class="flex-shrink-0">
          <Clock class="w-8 h-8 text-orange-500" />
        </div>
        <div>
          <h3 class="text-lg font-semibold text-gray-900">Session Expiring Soon</h3>
          <p class="text-sm text-gray-600">Your session will expire due to inactivity</p>
        </div>
      </div>
      
      <!-- Content -->
      <div class="mb-6">
        <div class="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-orange-800">Time remaining:</span>
            <span class="text-lg font-bold text-orange-600 tabular-nums">
              {sessionManager.formattedTime}
            </span>
          </div>
        </div>
        
        <p class="text-sm text-gray-700">
          You will be automatically logged out when the timer reaches zero. 
          Would you like to extend your session?
        </p>
      </div>
      
      <!-- Actions -->
      <div class="flex space-x-3">
        <button
          onclick={handleExtend}
          class="flex-1 flex items-center justify-center space-x-2 bg-[#01c0a4] text-white font-semibold py-2.5 px-4 rounded-lg hover:bg-[#00a085] transition-colors"
        >
          <RotateCcw class="w-4 h-4" />
          <span>Extend Session</span>
        </button>
        
        <button
          onclick={handleLogout}
          class="flex items-center justify-center space-x-2 bg-gray-500 text-white font-semibold py-2.5 px-4 rounded-lg hover:bg-gray-600 transition-colors"
        >
          <LogOut class="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
      
      <!-- Dismiss link -->
      <div class="mt-3 text-center">
        <button
          onclick={handleDismiss}
          class="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Dismiss (continue monitoring)
        </button>
      </div>
    </div>
  </div>
{/if}