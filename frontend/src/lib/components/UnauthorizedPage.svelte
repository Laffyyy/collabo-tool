<script lang="ts">
  import { goto } from '$app/navigation';
  import { Shield, ArrowLeft } from 'lucide-svelte';
  import { authStore } from '$lib/stores/auth.svelte';

  const goBack = () => {
    history.back();
  };

  const goToDashboard = () => {
    goto('/chat');
  };
</script>

<svelte:head>
  <title>Access Denied</title>
</svelte:head>

<div class="flex items-center justify-center min-h-screen bg-gray-50 p-4">
  <div class="max-w-md w-full text-center p-8 bg-white rounded-lg shadow-lg">
    <div class="flex justify-center">
      <div class="bg-red-100 p-3 rounded-full">
        <Shield class="w-10 h-10 text-red-500" />
      </div>
    </div>
    
    <h1 class="mt-5 text-2xl font-bold text-gray-900">Access Denied</h1>
    
    <p class="mt-3 text-gray-600">
      You don't have permission to access this resource.
      {#if $authStore.user}
        Your role ({$authStore.user.role}) doesn't have the required permissions.
      {:else}
        Please log in first.
      {/if}
    </p>
    
    <div class="mt-6 flex flex-col space-y-3">
      <button
        onclick={goBack}
        class="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2"
      >
        <ArrowLeft class="w-4 h-4" />
        <span>Go Back</span>
      </button>
      
      <button
        onclick={goToDashboard}
        class="bg-gradient-to-r from-[#01c0a4] to-[#00a085] text-white px-4 py-2 rounded-md hover:shadow-lg hover:shadow-[#01c0a4]/25 transition-all duration-200"
      >
        Go to Dashboard
      </button>
    </div>
  </div>
</div>