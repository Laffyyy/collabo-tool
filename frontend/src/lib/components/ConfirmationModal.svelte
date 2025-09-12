<script lang="ts">
  import { AlertTriangle, X } from 'lucide-svelte';
  import { themeStore } from '$lib/stores/theme.svelte';

  let isDarkMode = $derived(themeStore.isDarkMode);

  interface Props {
    show: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmStyle?: 'danger' | 'warning' | 'primary';
    onConfirm: () => void;
    onCancel: () => void;
  }

  let { 
    show = false, 
    title = 'Confirm Action', 
    message = 'Are you sure you want to proceed?', 
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmStyle = 'danger',
    onConfirm,
    onCancel
  }: Props = $props();

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      onConfirm();
    }
  };

  const getConfirmButtonClasses = () => {
    switch (confirmStyle) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-600';
      case 'warning':
        return 'bg-orange-500 hover:bg-orange-600 text-white focus:ring-orange-500';
      case 'primary':
        return 'bg-[#01c0a4] hover:bg-[#00a085] text-white focus:ring-[#01c0a4]';
      default:
        return 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-600';
    }
  };

  const getIconColor = () => {
    switch (confirmStyle) {
      case 'danger':
        return 'text-red-600';
      case 'warning':
        return 'text-orange-500';
      case 'primary':
        return 'text-[#01c0a4]';
      default:
        return 'text-red-600';
    }
  };
</script>

{#if show}
  <!-- Modal Backdrop -->
  <div 
    class="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-[2px] {isDarkMode ? 'bg-black/50' : 'bg-black/20'}"
    onclick={onCancel}
    onkeydown={handleKeydown}
    role="dialog"
    tabindex="-1"
    aria-modal="true"
    aria-labelledby="modal-title"
    aria-describedby="modal-description"
  >
    <!-- Modal Content -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
      class="{isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-2xl w-full max-w-md mx-4 transform transition-all"
      role="document"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Header -->
      <div class="{isDarkMode ? 'border-gray-700' : 'border-gray-200'} flex items-center justify-between p-6 border-b transition-colors duration-300">
        <div class="flex items-center space-x-3">
          <div class="flex-shrink-0">
            <AlertTriangle class="w-6 h-6 {getIconColor()}" />
          </div>
          <h2 id="modal-title" class="{isDarkMode ? 'text-white' : 'text-gray-900'} text-lg font-semibold transition-colors duration-300">
            {title}
          </h2>
        </div>
      </div>

      <!-- Content -->
      <div class="p-6">
        <p id="modal-description" class="{isDarkMode ? 'text-gray-300' : 'text-gray-600'} leading-relaxed transition-colors duration-300">
          {message}
        </p>
      </div>

      <!-- Footer -->
      <div class="{isDarkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'} flex items-center justify-end space-x-3 p-6 border-t rounded-b-xl transition-colors duration-300">
        <button
          onclick={onCancel}
          class="{isDarkMode ? 'text-gray-300 bg-gray-700 border-gray-600 hover:bg-gray-600 focus:ring-gray-600' : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50 focus:ring-gray-200'} px-4 py-2 border rounded-lg transition-colors focus:outline-none focus:ring-2"
        >
          {cancelText}
        </button>
        <button
          onclick={onConfirm}
          class="px-4 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 {getConfirmButtonClasses()}"
        >
          {confirmText}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Ensure modal appears above all other content */
  :global(body:has(.fixed.inset-0.z-50)) {
    overflow: hidden;
  }
</style>
