<script lang="ts">
  import { fly } from 'svelte/transition';
  import { CheckCircle, XCircle, Info, X } from 'lucide-svelte';
  import { onMount, onDestroy } from 'svelte';
  
  // Props
  let { 
    id, 
    type = 'success', 
    message, 
    duration = 5000,
    onDismiss 
  } = $props<{ 
    id: string; 
    type?: 'success' | 'error' | 'info'; 
    message: string; 
    duration?: number;
    onDismiss: (id: string) => void;
  }>();

  // Simple timeout approach instead of animation frames
  let timer: ReturnType<typeof setTimeout>;
  
  onMount(() => {
    // Set a single timer for the dismissal
    timer = setTimeout(() => {
      if (onDismiss && id) onDismiss(id);
    }, duration);
  });
  
  onDestroy(() => {
    if (timer) clearTimeout(timer);
  });
  
  function handleDismiss() {
    if (timer) clearTimeout(timer);
    if (onDismiss && id) onDismiss(id);
  }
  
  // Simple helper functions for styling
  function getToastClasses() {
    if (type === 'success') return 'bg-green-50 border-green-200 text-green-800';
    if (type === 'error') return 'bg-red-50 border-red-200 text-red-800';
    return 'bg-blue-50 border-blue-200 text-blue-800';
  }
  
  function getIconColor() {
    if (type === 'success') return 'text-green-500';
    if (type === 'error') return 'text-red-500';
    return 'text-blue-500';
  }
  
  function getProgressColor() {
    if (type === 'success') return 'bg-green-500';
    if (type === 'error') return 'bg-red-500';
    return 'bg-blue-500';
  }
</script>

<div 
  transition:fly={{ y: -20, duration: 300 }}
  class="w-full shadow-lg rounded-lg border {getToastClasses()} p-4 relative overflow-hidden"
>
  <div class="flex">
    <div class="flex-shrink-0">
      {#if type === 'success'}
        <CheckCircle class="w-5 h-5 {getIconColor()}" />
      {:else if type === 'error'}
        <XCircle class="w-5 h-5 {getIconColor()}" />
      {:else}
        <Info class="w-5 h-5 {getIconColor()}" />
      {/if}
    </div>
    
    <div class="ml-3 flex-1">
      <p class="text-sm font-medium">
        {message}
      </p>
    </div>
    
    <div class="ml-4 flex-shrink-0 flex">
      <button
        onclick={handleDismiss}
        class="inline-flex text-gray-400 hover:text-gray-500"
      >
        <X class="w-5 h-5" />
      </button>
    </div>
  </div>
  
  <!-- CSS-only progress bar animation -->
  <div class="absolute bottom-0 left-0 h-1 {getProgressColor()} toast-progress-bar"></div>
</div>

<style>
  .toast-progress-bar {
    width: 100%;
    animation: shrink-bar linear forwards;
    animation-duration: var(--duration, 5000ms);
  }
  
  @keyframes shrink-bar {
    from { width: 100%; }
    to { width: 0%; }
  }
  
  :global(.toast-progress-bar) {
    --duration: 5000ms;
  }
</style>