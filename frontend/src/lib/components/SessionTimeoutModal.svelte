<script lang="ts">
  import { Clock } from 'lucide-svelte';
  import { sessionManager } from '$lib/stores/session.svelte';
  
  let { show }: { show: boolean } = $props();
  
  const handleOk = () => {
    sessionManager.dismissTimeoutModal();
  };
  
  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      handleOk();
    }
  };
</script>

{#if show}
  <div 
    class="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50"
    role="dialog"
    aria-modal="true"
    aria-labelledby="timeout-modal-title"
    onkeydown={handleKeydown}
    tabindex="-1"
  >
    <div class="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 transform transition-all">
      <!-- Header -->
      <div class="flex items-center space-x-3 mb-6">
        <div class="flex-shrink-0">
          <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <Clock class="w-6 h-6 text-red-600" />
          </div>
        </div>
        <div>
          <h3 id="timeout-modal-title" class="text-lg font-semibold text-gray-900">
            Session Expired
          </h3>
          <p class="text-sm text-gray-600">
            Your session has timed out due to inactivity
          </p>
        </div>
      </div>
      
      <!-- Content -->
      <div class="mb-6">
        <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p class="text-sm font-medium text-red-800">
            Your session has expired for security reasons.
          </p>
          <p class="text-xs text-red-600 mt-1">
            Session timeout: {sessionManager.timeoutMinutes} minutes
          </p>
        </div>
        
        <p class="text-sm text-gray-700">
          You will be redirected to the login page. Please sign in again to continue using the application.
        </p>
      </div>
      
      <!-- Action -->
      <div class="flex justify-center">
        <button
          onclick={handleOk}
          class="flex items-center justify-center space-x-2 bg-[#01c0a4] text-white font-semibold py-3 px-6 rounded-lg hover:bg-[#00a085] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#01c0a4] min-w-[120px]"
          autofocus
        >
          <span>OK</span>
        </button>
      </div>
    </div>
  </div>
{/if}