<script lang="ts">
  import { AlertTriangle, X } from 'lucide-svelte';

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
        return 'bg-red-600 hover:bg-red-700 text-white';
      case 'warning':
        return 'bg-orange-600 hover:bg-orange-700 text-white';
      case 'primary':
        return 'bg-[#01c0a4] hover:bg-[#00a085] text-white';
      default:
        return 'bg-red-600 hover:bg-red-700 text-white';
    }
  };

  const getIconColor = () => {
    switch (confirmStyle) {
      case 'danger':
        return 'text-red-600';
      case 'warning':
        return 'text-orange-600';
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
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-20 backdrop-blur-sm"
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
      class="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 transform transition-all"
      role="document"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200">
        <div class="flex items-center space-x-3">
          <div class="flex-shrink-0">
            <AlertTriangle class="w-6 h-6 {getIconColor()}" />
          </div>
          <h2 id="modal-title" class="text-lg font-semibold text-gray-900">
            {title}
          </h2>
        </div>
        <button
          onclick={onCancel}
          class="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
          aria-label="Close modal"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Content -->
      <div class="p-6">
        <p id="modal-description" class="text-gray-600 leading-relaxed">
          {message}
        </p>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
        <button
          onclick={onCancel}
          class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-200"
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
