<script lang="ts">
  import { toastStore } from '$lib/stores/toast.svelte';
  import Toast from '$lib/components/Toast.svelte';
  
  let currentToast = $derived($toastStore?.currentToast);
  
  function handleDismiss(id: string) {
    if ($toastStore) {
      $toastStore.dismiss(id);
    }
  }
</script>

<div class="fixed top-4 left-1/2 transform -translate-x-1/2 z-[100]" 
     role="alert" 
     aria-live="polite">
  {#if currentToast && currentToast.id}
    <Toast 
      id={currentToast.id} 
      type={currentToast.type} 
      message={currentToast.message}
      duration={currentToast.duration}
      onDismiss={handleDismiss}
    />
  {/if}
</div>