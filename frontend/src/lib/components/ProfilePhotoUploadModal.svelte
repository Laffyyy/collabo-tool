<script lang="ts">
  import { onMount } from 'svelte';
  import { X, Save } from 'lucide-svelte';
  
  // Props
  let {
    show = false,
    onClose = () => {},
    onSave = (blob: Blob) => {}
  } = $props<{
    show: boolean;
    onClose: () => void;
    onSave: (blob: Blob) => void;
  }>();

  // State
  let imageFile: File | null = $state(null);
  let imagePreviewUrl: string | null = $state(null);
  let isDragging = $state(false);
  let isSaving = $state(false);

  onMount(() => {
    return () => {
      // Clean up on destroy
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  });

  // Handle file selection
  const handleFileSelection = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFileChange(file);
      }
    };
    input.click();
  };

  // Handle file change
  const handleFileChange = (file: File) => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    
    imageFile = file;
    imagePreviewUrl = URL.createObjectURL(file);
  };

  // Handle drag events
  const handleDragOver = (event: DragEvent) => {
    event.preventDefault();
    isDragging = true;
  };

  const handleDragLeave = () => {
    isDragging = false;
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    isDragging = false;
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        handleFileChange(file);
      }
    }
  };

  // Save the image
  const saveImage = async () => {
    if (!imageFile) return;
    
    try {
      isSaving = true;
      
      // Convert the file to a blob and save
      const blob = await imageFile.arrayBuffer().then(buffer => new Blob([buffer], { type: imageFile.type }));
      onSave(blob);
    } catch (error) {
      console.error('Error saving image:', error);
      isSaving = false;
    }
  };
</script>

{#if show}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    onclick={onClose}
    role="dialog"
    aria-modal="true"
    aria-label="Upload profile photo"
  >
    <!-- Modal content -->
    <div 
      class="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Header -->
      <div class="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 class="text-lg font-semibold text-gray-900">Upload Profile Photo</h2>
        <button 
          onclick={onClose}
          class="p-1 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <X class="w-5 h-5 text-gray-500" />
        </button>
      </div>
      
      <!-- Main content -->
      <div class="flex-1 overflow-y-auto p-4">
        {#if !imagePreviewUrl}
          <!-- Upload area -->
            <div
              class={`rounded-lg p-8 text-center transition-colors h-64 flex flex-col items-center justify-center ${
                isDragging 
                  ? 'border-2 border-dashed border-[#01c0a4] bg-[#01c0a4]/5' 
                  : 'border-2 border-dashed border-gray-300'
              }`}
              ondragover={handleDragOver}
              ondragleave={handleDragLeave}
              ondrop={handleDrop}
            >
            <div class="w-16 h-16 rounded-full bg-[#01c0a4]/10 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-[#01c0a4]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h7"></path>
                <rect x="16" y="5" width="6" height="6" rx="1"></rect>
                <path d="M3 16l5-5 4 4"></path>
                <path d="M14 14l1-1 5 5"></path>
              </svg>
            </div>
            <p class="mb-2 text-sm text-gray-700 font-medium">
              {isDragging ? 'Drop to upload' : 'Drag and drop your image here'}
            </p>
            <p class="text-xs text-gray-500 mb-4">SVG, PNG, JPG or GIF (max. 10MB)</p>
            <button
              onclick={handleFileSelection}
              class="px-4 py-2 bg-[#01c0a4] text-white rounded-lg hover:bg-[#00a085] transition-colors text-sm font-medium"
            >
              Select File
            </button>
          </div>
        {:else}
          <!-- Image preview -->
          <div class="space-y-4">
            <!-- Preview container -->
            <div class="w-full flex justify-center">
              <img 
                src={imagePreviewUrl}
                alt="Profile photo preview"
                class="max-w-full max-h-[300px] rounded-lg object-contain border border-gray-200"
              />
            </div>
            
            <p class="text-xs text-gray-500 text-center">
              This is how your profile photo will appear.
            </p>
          </div>
        {/if}
      </div>
      
      <!-- Footer -->
      <div class="p-4 border-t border-gray-200 flex justify-end space-x-3">
        <button
          onclick={onClose}
          class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
          disabled={isSaving}
        >
          Cancel
        </button>
        {#if imagePreviewUrl}
          <button
            onclick={saveImage}
            class="px-4 py-2 bg-[#01c0a4] text-white rounded-lg hover:bg-[#00a085] transition-colors text-sm font-medium flex items-center space-x-2"
            disabled={isSaving}
          >
            {#if isSaving}
              <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Saving...</span>
            {:else}
              <Save class="w-4 h-4" />
              <span>Save Photo</span>
            {/if}
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}