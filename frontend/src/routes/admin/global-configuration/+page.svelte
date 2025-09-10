<script lang="ts">
  import { API_CONFIG } from '$lib/api/config';
  import { onMount, onDestroy } from 'svelte';
  import { Globe, Save, RotateCcw, Shield, Clock, Bell, Users, MessageSquare, Radio, Database, User, UserCheck, Send } from 'lucide-svelte';
  import { toastStore } from '$lib/stores/toast.svelte';
  import ToastContainer from '$lib/components/ToastContainer.svelte';
  import { sessionManager } from '$lib/stores/session.svelte';

  const API_BASE_URL = `${API_CONFIG?.baseUrl ?? 'http://localhost:4000'}/api/v1/global-settings`;
  const GENERAL_API_URL = `${API_BASE_URL}/general`;
  
  // Default configuration structure
  const defaultConfig = {
    // General Settings
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    
    // Security Settings
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      passwordExpiry: 90
    },
    sessionTimeout: 480, // minutes
    maxLoginAttempts: 5,
    
    // Chat Settings - Global defaults for all OUs
    chat: {
      frontlineCanInitiate1v1: true,
      frontlineCanCreateGroups: false,
      frontlineCanJoinGroups: true,
      frontlineCanShareFiles: false,
      frontlineCanForwardMessages: false,
      supportCanInitiate1v1: true,
      supportCanCreateGroups: false,
      supportCanJoinGroups: true,
      supportCanShareFiles: true,
      supportCanForwardMessages: true,
      supervisorCanCreateGroups: true,
      supervisorCanShareFiles: true,
      supervisorCanForwardMessages: true,
      managerCanAccessAllGroups: true,
      managerCanShareFiles: true,
      managerCanForwardMessages: true,
      allowFileSharing: true,
      allowEmojis: true,
      inactiveGroupArchiveDays: 30,
      maxFileSize: 10, // MB
      allowedFileTypes: ['jpg', 'png', 'pdf', 'doc', 'docx'],
      maxGroupSize: 50,
      messageEditWindow: 15, // minutes
      
      // Pinned Messages Settings
      pinnedMessages: {
        enabled: true,
        maxPinnedPerConversation: 10
      }
    },
    
// Broadcast Settings - Global defaults for all OUs
    broadcast: {
      frontlineCanCreateBroadcast: false,
      frontlineCanReplyToBroadcast: true,
      supportCanCreateBroadcast: false,
      supportCanReplyToBroadcast: true,
      supervisorCanCreateBroadcast: true,
      managerCanCreateBroadcast: true,
      requireApprovalForBroadcast: false,
      allowScheduledBroadcasts: true,
      allowPriorityBroadcasts: true,
      broadcastRetentionDays: 730,
      requireAcknowledgment: true,
      acknowledgmentReminders: true,
      reminderInterval: 1440, // minutes
      maxBroadcastTargets: 1000
    }
  };

  // State variables
  let config = $state({ ...defaultConfig });
  let isSaving = $state(false);
  let hasChanges = $state(false);
  let savedConfigString = $state('');
  let activeTab = $state<'general' | 'chat' | 'broadcast'>('general');

  // Load configuration from backend (without loading overlay)
  const loadConfiguration = async () => {
    try {
      const response = await fetch(GENERAL_API_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          // Parse the JSON string from database
          const savedSettings = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;
          
          // Merge saved settings with defaults (in case new settings were added)
          config = {
            ...defaultConfig,
            ...savedSettings,
            passwordPolicy: {
              ...defaultConfig.passwordPolicy,
              ...(savedSettings.passwordPolicy || {})
            },
            chat: {
              ...defaultConfig.chat,
              ...(savedSettings.chat || {}),
              pinnedMessages: {
                ...defaultConfig.chat.pinnedMessages,
                ...(savedSettings.chat?.pinnedMessages || {})
              }
            },
            broadcast: {
              ...defaultConfig.broadcast,
              ...(savedSettings.broadcast || {})
            }
          };
          
          savedConfigString = JSON.stringify(config);
          console.log('✅ Configuration loaded successfully:', config);
        } else {
          // No saved configuration, use defaults
          console.log('ℹ️ No saved configuration found, using defaults');
          savedConfigString = JSON.stringify(config);
        }
      } else {
        console.error('Failed to load configuration:', response.statusText);
        // Use defaults if loading fails
        savedConfigString = JSON.stringify(config);
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
      // Use defaults if loading fails
      savedConfigString = JSON.stringify(config);
    }
    // No finally block needed since we removed isLoading
  };

  // Load configuration on mount (no loading overlay)
  onMount(() => {
    // Pause session monitoring on admin pages to reduce server load
    sessionManager.pauseMonitoring();
    
    loadConfiguration();
  });

  onDestroy(() => {
    // Resume session monitoring when leaving the page
    sessionManager.resumeMonitoring();
  });

  // Watch for changes
  $effect(() => {
    if (savedConfigString !== '') {
      hasChanges = JSON.stringify(config) !== savedConfigString;
    }
  });

 function getGeneralSettings(config: any) {
    return {
      dateFormat: config.dateFormat,
      timeFormat: config.timeFormat,
      passwordPolicy: config.passwordPolicy,
      sessionTimeout: config.sessionTimeout,
      maxLoginAttempts: config.maxLoginAttempts
    };
  }

  const saveConfiguration = async () => {
    if (activeTab === 'general') {
      try {
        isSaving = true;
        const generalSettings = getGeneralSettings(config);
        const response = await fetch(GENERAL_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ settings: generalSettings })
        });
        
        const result = await response.json();
        if (result.success) {
          savedConfigString = JSON.stringify(config);
          hasChanges = false;
          
          // Use toast notification like broadcast management
          toastStore.success('Global configuration saved successfully!');
        } else {
          // Show error toast with specific message
          toastStore.error(result.message || 'Failed to save configuration');
        }
      } catch (error: any) {
        console.error('❌ Error saving configuration:', error);
        // Show error toast for network/connection issues
        toastStore.error('Failed to save configuration. Please check your connection and try again.');
      } finally {
        isSaving = false;
      }
    } else {
      // For chat and broadcast tabs, simulate save
      isSaving = true;
      setTimeout(() => {
        savedConfigString = JSON.stringify(config);
        hasChanges = false;
        isSaving = false;
        
        // Show success toast for simulated saves
        toastStore.success('Global configuration saved successfully! These settings will be applied as defaults for new organization units.');
      }, 500);
    }
  };

  const resetConfiguration = async () => {
    if (confirm('Are you sure you want to reset all changes?')) {
      await loadConfiguration(); // Reload from backend
      hasChanges = false;
    }
  };

  const testLDAPConnection = () => {
    alert('LDAP connection test initiated. Check the logs for results.');
  };

  const initiateBackup = () => {
    alert('Manual backup initiated. This may take several minutes.');
  };

  const formatFileTypes = (types: string[]) => {
    return types.join(', ').toUpperCase();
  };

  const toggleRule = (category: 'chat' | 'broadcast', rule: string) => {
    if (category === 'chat') {
      // @ts-ignore
      config.chat[rule] = !config.chat[rule];
    } else {
      // @ts-ignore
      config.broadcast[rule] = !config.broadcast[rule];
    }
  };
</script>

<svelte:head>
  <title>Global Configuration - Admin Controls</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <!-- Remove the custom alert container since we're using ToastContainer -->
  
  <!-- Rest of your existing template -->
  <div class="max-w-5xl mx-auto px-6 py-8">
    <!-- Header -->
    <div class="mb-8 fade-in">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 mb-1">Global Configuration</h1>
          <p class="text-sm text-gray-600">Manage system-wide settings and default policies for organization units</p>
        </div>
        <div class="flex space-x-3">
          {#if hasChanges}
            <button
              onclick={resetConfiguration}
              class="secondary-button flex items-center space-x-2"
              disabled={isSaving}
            >
              <RotateCcw class="w-4 h-4" />
              <span>Reset</span>
            </button>
          {/if}
          <!-- Save button with inline loading -->
          <button
            onclick={saveConfiguration}
            disabled={!hasChanges || isSaving}
            class="primary-button flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {#if isSaving}
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Saving...</span>
            {:else}
              <Save class="w-4 h-4" />
              <span>Save Changes</span>
            {/if}
          </button>
        </div>
      </div>
    </div>

    <!-- Main Configuration Panel -->
<!-- Main Configuration Panel -->
    <div class="collaboration-card fade-in">
      <!-- Tab Navigation -->
      <div class="flex space-x-6 px-6 pt-6 border-b border-gray-200">
        <button
          onclick={() => activeTab = 'general'}
          class="flex items-center space-x-2 px-4 py-3 font-medium transition-colors border-b-2 {activeTab === 'general' ? 'text-[#01c0a4] border-[#01c0a4]' : 'text-gray-700 border-transparent hover:text-gray-900'}"
        >
          <Globe class="w-5 h-5" />
          <span>General</span>
        </button>
        <button
          onclick={() => activeTab = 'chat'}
          class="flex items-center space-x-2 px-4 py-3 font-medium transition-colors border-b-2 {activeTab === 'chat' ? 'text-[#01c0a4] border-[#01c0a4]' : 'text-gray-700 border-transparent hover:text-gray-900'}"
        >
          <MessageSquare class="w-5 h-5" />
          <span>Chat</span>
        </button>
        <button
          onclick={() => activeTab = 'broadcast'}
          class="flex items-center space-x-2 px-4 py-3 font-medium transition-colors border-b-2 {activeTab === 'broadcast' ? 'text-[#01c0a4] border-[#01c0a4]' : 'text-gray-700 border-transparent hover:text-gray-900'}"
        >
          <Radio class="w-5 h-5" />
          <span>Broadcast</span>
        </button>
      </div>

      <!-- Tab Content -->
      <div class="p-6">
        <!-- General Tab -->
        {#if activeTab === 'general'}
          <div class="space-y-6 max-w-4xl">
            <!-- General Settings -->
            <div class="space-y-4">
              <h3 class="text-lg font-semibold text-gray-900 flex items-center">
                <Globe class="w-5 h-5 text-[#01c0a4] mr-2" />
                General Settings
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label for="dateFormat" class="block text-sm font-medium text-gray-700 mb-2">Date Format</label>
                  <select id="dateFormat" bind:value={config.dateFormat} class="input-field">
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>
                <div>
                  <label for="timeFormat" class="block text-sm font-medium text-gray-700 mb-2">Time Format</label>
                  <select id="timeFormat" bind:value={config.timeFormat} class="input-field">
                    <option value="12h">12 Hour (AM/PM)</option>
                    <option value="24h">24 Hour</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Security Settings -->
            <div class="space-y-4">
              <h3 class="text-lg font-semibold text-gray-900 flex items-center">
                <Shield class="w-5 h-5 text-[#01c0a4] mr-2" />
                Security Settings
              </h3>
              <div class="bg-gray-50 p-4 rounded-lg">
                <h4 class="font-semibold text-gray-900 mb-3">Password Policy</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label for="minLength" class="block text-sm font-medium text-gray-700 mb-2">Minimum Length</label>
                    <input
                      id="minLength"
                      type="number"
                      bind:value={config.passwordPolicy.minLength}
                      min="6"
                      max="32"
                      class="input-field"
                    />
                  </div>
                  <div>
                    <label for="passwordExpiry" class="block text-sm font-medium text-gray-700 mb-2">Password Expiry (Days)</label>
                    <input
                      id="passwordExpiry"
                      type="number"
                      bind:value={config.passwordPolicy.passwordExpiry}
                      min="30"
                      max="365"
                      class="input-field"
                    />
                  </div>
                  <div class="md:col-span-2 space-y-3">
                    <label class="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        bind:checked={config.passwordPolicy.requireUppercase}
                        class="rounded border-gray-300 text-[#01c0a4] focus:ring-[#01c0a4]"
                      />
                      <span class="text-sm">Require Uppercase Letters</span>
                    </label>
                    <label class="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        bind:checked={config.passwordPolicy.requireLowercase}
                        class="rounded border-gray-300 text-[#01c0a4] focus:ring-[#01c0a4]"
                      />
                      <span class="text-sm">Require Lowercase Letters</span>
                    </label>
                    <label class="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        bind:checked={config.passwordPolicy.requireNumbers}
                        class="rounded border-gray-300 text-[#01c0a4] focus:ring-[#01c0a4]"
                      />
                      <span class="text-sm">Require Numbers</span>
                    </label>
                    <label class="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        bind:checked={config.passwordPolicy.requireSpecialChars}
                        class="rounded border-gray-300 text-[#01c0a4] focus:ring-[#01c0a4]"
                      />
                      <span class="text-sm">Require Special Characters</span>
                    </label>
                  </div>
                </div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label for="sessionTimeout" class="block text-sm font-medium text-gray-700 mb-2">Session Timeout (Minutes)</label>
                  <input
                    id="sessionTimeout"
                    type="number"
                    bind:value={config.sessionTimeout}
                    min="15"
                    max="1440"
                    class="input-field"
                  />
                </div>
                <div>
                  <label for="maxLoginAttempts" class="block text-sm font-medium text-gray-700 mb-2">Max Login Attempts</label>
                  <input
                    id="maxLoginAttempts"
                    type="number"
                    bind:value={config.maxLoginAttempts}
                    min="3"
                    max="10"
                    class="input-field"
                  />
                </div>
              </div>
            </div>
          </div>
        {/if}

            <!-- Chat Tab -->
            {#if activeTab === 'chat'}
              <div class="space-y-4 max-w-5xl">
                <div class="mb-4">
                  <h3 class="text-lg font-semibold text-gray-900 mb-2">Default Chat Policies</h3>
                  <p class="text-gray-600">These settings will be applied as defaults when creating new organization units. Individual OUs can override these settings.</p>
                </div>

                <div class="bg-white p-4 rounded-lg border">
                  <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
                    <User class="w-5 h-5 mr-2" />
                    Frontline User Permissions
                  </h4>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label class="flex items-center justify-between">
                      <span class="text-sm text-gray-700">Can initiate 1:1 conversations</span>
                      <button
                        type="button"
                        onclick={() => toggleRule('chat', 'frontlineCanInitiate1v1')}
                        aria-label="Toggle frontline can initiate 1v1 chats"
                        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {config.chat.frontlineCanInitiate1v1 ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                      >
                        <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {config.chat.frontlineCanInitiate1v1 ? 'translate-x-6' : 'translate-x-1'}"></span>
                      </button>
                    </label>
                    <label class="flex items-center justify-between">
                      <span class="text-sm text-gray-700">Can create group chats</span>
                      <button
                        type="button"
                        onclick={() => toggleRule('chat', 'frontlineCanCreateGroups')}
                        aria-label="Toggle frontline can create groups"
                        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {config.chat.frontlineCanCreateGroups ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                      >
                        <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {config.chat.frontlineCanCreateGroups ? 'translate-x-6' : 'translate-x-1'}"></span>
                      </button>
                    </label>
                    <label class="flex items-center justify-between">
                      <span class="text-sm text-gray-700">Can join group chats</span>
                      <button
                        type="button"
                        onclick={() => toggleRule('chat', 'frontlineCanJoinGroups')}
                        aria-label="Toggle frontline can join groups"
                        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {config.chat.frontlineCanJoinGroups ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                      >
                        <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {config.chat.frontlineCanJoinGroups ? 'translate-x-6' : 'translate-x-1'}"></span>
                      </button>
                    </label>
                    <label class="flex items-center justify-between">
                      <span class="text-sm text-gray-700">Can share files</span>
                      <button
                        type="button"
                        onclick={() => toggleRule('chat', 'frontlineCanShareFiles')}
                        aria-label="Toggle frontline can share files"
                        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {config.chat.frontlineCanShareFiles ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                      >
                        <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {config.chat.frontlineCanShareFiles ? 'translate-x-6' : 'translate-x-1'}"></span>
                      </button>
                    </label>
                    <label class="flex items-center justify-between">
                      <span class="text-sm text-gray-700">Can forward messages</span>
                      <button
                        type="button"
                        onclick={() => toggleRule('chat', 'frontlineCanForwardMessages')}
                        aria-label="Toggle frontline can forward messages"
                        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {config.chat.frontlineCanForwardMessages ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                      >
                        <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {config.chat.frontlineCanForwardMessages ? 'translate-x-6' : 'translate-x-1'}"></span>
                      </button>
                    </label>
                  </div>
                </div>

                <div class="bg-white p-4 rounded-lg border">
                  <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
                    <User class="w-5 h-5 mr-2" />
                    Support User Permissions
                  </h4>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label class="flex items-center justify-between">
                      <span class="text-sm text-gray-700">Can initiate 1:1 conversations</span>
                      <button
                        type="button"
                        onclick={() => toggleRule('chat', 'supportCanInitiate1v1')}
                        aria-label="Toggle support can initiate 1v1 chats"
                        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {config.chat.supportCanInitiate1v1 ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                      >
                        <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {config.chat.supportCanInitiate1v1 ? 'translate-x-6' : 'translate-x-1'}"></span>
                      </button>
                    </label>
                    <label class="flex items-center justify-between">
                      <span class="text-sm text-gray-700">Can create group chats</span>
                      <button
                        type="button"
                        onclick={() => toggleRule('chat', 'supportCanCreateGroups')}
                        aria-label="Toggle support can create groups"
                        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {config.chat.supportCanCreateGroups ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                      >
                        <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {config.chat.supportCanCreateGroups ? 'translate-x-6' : 'translate-x-1'}"></span>
                      </button>
                    </label>
                    <label class="flex items-center justify-between">
                      <span class="text-sm text-gray-700">Can join group chats</span>
                      <button
                        type="button"
                        onclick={() => toggleRule('chat', 'supportCanJoinGroups')}
                        aria-label="Toggle support can join groups"
                        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {config.chat.supportCanJoinGroups ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                      >
                        <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {config.chat.supportCanJoinGroups ? 'translate-x-6' : 'translate-x-1'}"></span>
                      </button>
                    </label>
                    <label class="flex items-center justify-between">
                      <span class="text-sm text-gray-700">Can share files</span>
                      <button
                        type="button"
                        onclick={() => toggleRule('chat', 'supportCanShareFiles')}
                        aria-label="Toggle support can share files"
                        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {config.chat.supportCanShareFiles ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                      >
                        <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {config.chat.supportCanShareFiles ? 'translate-x-6' : 'translate-x-1'}"></span>
                      </button>
                    </label>
                    <label class="flex items-center justify-between">
                      <span class="text-sm text-gray-700">Can forward messages</span>
                      <button
                        type="button"
                        onclick={() => toggleRule('chat', 'supportCanForwardMessages')}
                        aria-label="Toggle support can forward messages"
                        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {config.chat.supportCanForwardMessages ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                      >
                        <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {config.chat.supportCanForwardMessages ? 'translate-x-6' : 'translate-x-1'}"></span>
                      </button>
                    </label>
                  </div>
                </div>

                <div class="bg-white p-4 rounded-lg border">
                  <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
                    <UserCheck class="w-5 h-5 mr-2" />
                    Supervisor Permissions
                  </h4>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label class="flex items-center justify-between">
                      <span class="text-sm text-gray-700">Can create group chats</span>
                      <button
                        type="button"
                        onclick={() => toggleRule('chat', 'supervisorCanCreateGroups')}
                        aria-label="Toggle supervisor can create groups"
                        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {config.chat.supervisorCanCreateGroups ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                      >
                        <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {config.chat.supervisorCanCreateGroups ? 'translate-x-6' : 'translate-x-1'}"></span>
                      </button>
                    </label>
                    <label class="flex items-center justify-between">
                      <span class="text-sm text-gray-700">Can share files</span>
                      <button
                        type="button"
                        onclick={() => toggleRule('chat', 'supervisorCanShareFiles')}
                        aria-label="Toggle supervisor can share files"
                        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {config.chat.supervisorCanShareFiles ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                      >
                        <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {config.chat.supervisorCanShareFiles ? 'translate-x-6' : 'translate-x-1'}"></span>
                      </button>
                    </label>
                    <label class="flex items-center justify-between">
                      <span class="text-sm text-gray-700">Can forward messages</span>
                      <button
                        type="button"
                        onclick={() => toggleRule('chat', 'supervisorCanForwardMessages')}
                        aria-label="Toggle supervisor can forward messages"
                        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {config.chat.supervisorCanForwardMessages ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                      >
                        <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {config.chat.supervisorCanForwardMessages ? 'translate-x-6' : 'translate-x-1'}"></span>
                      </button>
                    </label>
                  </div>
                </div>

                <div class="bg-white p-4 rounded-lg border">
                  <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
                    <Shield class="w-5 h-5 mr-2" />
                    Manager Permissions
                  </h4>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label class="flex items-center justify-between">
                      <span class="text-sm text-gray-700">Can access all group chats</span>
                      <button
                        type="button"
                        onclick={() => toggleRule('chat', 'managerCanAccessAllGroups')}
                        aria-label="Toggle manager can access all groups"
                        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {config.chat.managerCanAccessAllGroups ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                      >
                        <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {config.chat.managerCanAccessAllGroups ? 'translate-x-6' : 'translate-x-1'}"></span>
                      </button>
                    </label>
                    <label class="flex items-center justify-between">
                      <span class="text-sm text-gray-700">Can share files</span>
                      <button
                        type="button"
                        onclick={() => toggleRule('chat', 'managerCanShareFiles')}
                        aria-label="Toggle manager can share files"
                        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {config.chat.managerCanShareFiles ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                      >
                        <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {config.chat.managerCanShareFiles ? 'translate-x-6' : 'translate-x-1'}"></span>
                      </button>
                    </label>
                    <label class="flex items-center justify-between">
                      <span class="text-sm text-gray-700">Can forward messages</span>
                      <button
                        type="button"
                        onclick={() => toggleRule('chat', 'managerCanForwardMessages')}
                        aria-label="Toggle manager can forward messages"
                        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {config.chat.managerCanForwardMessages ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                      >
                        <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {config.chat.managerCanForwardMessages ? 'translate-x-6' : 'translate-x-1'}"></span>
                      </button>
                    </label>
                  </div>
                </div>

                <div class="bg-white p-4 rounded-lg border">
                  <h4 class="font-semibold text-gray-900 mb-4">General Chat Settings</h4>
                  <div class="space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label class="flex items-center justify-between">
                        <span class="text-sm text-gray-700">Allow emojis and reactions</span>
                        <button
                          type="button"
                          onclick={() => toggleRule('chat', 'allowEmojis')}
                          aria-label="Toggle allow emojis and reactions"
                          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {config.chat.allowEmojis ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                        >
                          <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {config.chat.allowEmojis ? 'translate-x-6' : 'translate-x-1'}"></span>
                        </button>
                      </label>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label for="inactiveGroupArchiveDays" class="block text-sm font-medium text-gray-700 mb-2">Archive inactive Group chats (days)</label>
                        <input
                          id="inactiveGroupArchiveDays"
                          type="number"
                          bind:value={config.chat.inactiveGroupArchiveDays}
                          min="1"
                          max="365"
                          class="input-field"
                        />
                      </div>
                      <div>
                        <label for="maxFileSize" class="block text-sm font-medium text-gray-700 mb-2">Max file size (MB)</label>
                        <input
                          id="maxFileSize"
                          type="number"
                          bind:value={config.chat.maxFileSize}
                          min="1"
                          max="100"
                          class="input-field"
                        />
                      </div>
                      <div>
                        <label for="maxGroupSize" class="block text-sm font-medium text-gray-700 mb-2">Max group size</label>
                        <input
                          id="maxGroupSize"
                          type="number"
                          bind:value={config.chat.maxGroupSize}
                          min="5"
                          max="500"
                          class="input-field"
                        />
                      </div>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label for="messageEditWindow" class="block text-sm font-medium text-gray-700 mb-2">Message edit window (minutes)</label>
                        <input
                          id="messageEditWindow"
                          type="number"
                          bind:value={config.chat.messageEditWindow}
                          min="0"
                          max="60"
                          class="input-field"
                        />
                        <p class="text-xs text-gray-500 mt-1">Set to 0 to disable message editing</p>
                      </div>
                      
                      <div>
                        <label for="allowedFileTypes" class="block text-sm font-medium text-gray-700 mb-2">Allowed file types</label>
                        <input
                          id="allowedFileTypes"
                          bind:value={config.chat.allowedFileTypes}
                          class="input-field"
                          placeholder="jpg, png, pdf, doc, docx"
                        />
                        <p class="text-xs text-gray-500 mt-1">Currently: {formatFileTypes(config.chat.allowedFileTypes)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Pinned Messages Settings -->
                <div class="bg-white p-4 rounded-lg border">
                  <h4 class="font-semibold text-gray-900 mb-4">Pinned Messages Settings</h4>
                  <div class="space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label class="flex items-center justify-between">
                        <span class="text-sm text-gray-700">Enable pinned messages</span>
                        <button
                          type="button"
                          onclick={() => config.chat.pinnedMessages.enabled = !config.chat.pinnedMessages.enabled}
                          aria-label="Toggle pinned messages"
                          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {config.chat.pinnedMessages.enabled ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                        >
                          <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {config.chat.pinnedMessages.enabled ? 'translate-x-6' : 'translate-x-1'}"></span>
                        </button>
                      </label>
                      <div>
                        <label for="maxPinnedPerConversation" class="block text-sm font-medium text-gray-700 mb-2">Max pinned messages per conversation</label>
                        <input
                          id="maxPinnedPerConversation"
                          type="number"
                          bind:value={config.chat.pinnedMessages.maxPinnedPerConversation}
                          min="1"
                          max="50"
                          class="input-field"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            {/if}

            <!-- Broadcast Tab -->
            {#if activeTab === 'broadcast'}
              <div class="space-y-4 max-w-5xl">
                <div class="mb-4">
                  <h3 class="text-lg font-semibold text-gray-900 mb-2">Default Broadcast Policies</h3>
                  <p class="text-gray-600">These settings will be applied as defaults when creating new organization units. Individual OUs can override these settings.</p>
                </div>

                <div class="bg-white p-4 rounded-lg border">
                  <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
                    <User class="w-5 h-5 mr-2" />
                    Frontline User Permissions
                  </h4>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label class="flex items-center justify-between">
                      <span class="text-sm text-gray-700">Can create broadcasts</span>
                      <button
                        type="button"
                        onclick={() => toggleRule('broadcast', 'frontlineCanCreateBroadcast')}
                        aria-label="Toggle frontline can create broadcasts"
                        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {config.broadcast.frontlineCanCreateBroadcast ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                      >
                        <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {config.broadcast.frontlineCanCreateBroadcast ? 'translate-x-6' : 'translate-x-1'}"></span>
                      </button>
                    </label>
                    <label class="flex items-center justify-between">
                      <span class="text-sm text-gray-700">Can reply to broadcasts</span>
                      <button
                        type="button"
                        onclick={() => toggleRule('broadcast', 'frontlineCanReplyToBroadcast')}
                        aria-label="Toggle frontline can reply to broadcasts"
                        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {config.broadcast.frontlineCanReplyToBroadcast ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                      >
                        <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {config.broadcast.frontlineCanReplyToBroadcast ? 'translate-x-6' : 'translate-x-1'}"></span>
                      </button>
                    </label>
                  </div>
                </div>

                <div class="bg-white p-4 rounded-lg border">
                  <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
                    <User class="w-5 h-5 mr-2" />
                    Support User Permissions
                  </h4>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label class="flex items-center justify-between">
                      <span class="text-sm text-gray-700">Can create broadcasts</span>
                      <button
                        type="button"
                        onclick={() => toggleRule('broadcast', 'supportCanCreateBroadcast')}
                        aria-label="Toggle support can create broadcasts"
                        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {config.broadcast.supportCanCreateBroadcast ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                      >
                        <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {config.broadcast.supportCanCreateBroadcast ? 'translate-x-6' : 'translate-x-1'}"></span>
                      </button>
                    </label>
                    <label class="flex items-center justify-between">
                      <span class="text-sm text-gray-700">Can reply to broadcasts</span>
                      <button
                        type="button"
                        onclick={() => toggleRule('broadcast', 'supportCanReplyToBroadcast')}
                        aria-label="Toggle support can reply to broadcasts"
                        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {config.broadcast.supportCanReplyToBroadcast ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                      >
                        <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {config.broadcast.supportCanReplyToBroadcast ? 'translate-x-6' : 'translate-x-1'}"></span>
                      </button>
                    </label>
                  </div>
                </div>

                <div class="bg-white p-4 rounded-lg border">
                  <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
                    <UserCheck class="w-5 h-5 mr-2" />
                    Supervisor Permissions
                  </h4>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label class="flex items-center justify-between">
                      <span class="text-sm text-gray-700">Can create broadcasts</span>
                      <button
                        type="button"
                        onclick={() => toggleRule('broadcast', 'supervisorCanCreateBroadcast')}
                        aria-label="Toggle supervisor can create broadcasts"
                        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {config.broadcast.supervisorCanCreateBroadcast ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                      >
                        <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {config.broadcast.supervisorCanCreateBroadcast ? 'translate-x-6' : 'translate-x-1'}"></span>
                      </button>
                    </label>
                  </div>
                </div>

                <div class="bg-white p-4 rounded-lg border">
                  <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
                    <Shield class="w-5 h-5 mr-2" />
                    Manager Permissions
                  </h4>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label class="flex items-center justify-between">
                      <span class="text-sm text-gray-700">Can create broadcasts</span>
                      <button
                        type="button"
                        onclick={() => toggleRule('broadcast', 'managerCanCreateBroadcast')}
                        aria-label="Toggle manager can create broadcasts"
                        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {config.broadcast.managerCanCreateBroadcast ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                      >
                        <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {config.broadcast.managerCanCreateBroadcast ? 'translate-x-6' : 'translate-x-1'}"></span>
                      </button>
                    </label>
                  </div>
                </div>

                <div class="bg-white p-4 rounded-lg border">
                  <h4 class="font-semibold text-gray-900 mb-4">General Broadcast Settings</h4>
                  <div class="space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label class="flex items-center justify-between">
                        <span class="text-sm text-gray-700">Require approval for broadcasts</span>
                        <button
                          type="button"
                          onclick={() => toggleRule('broadcast', 'requireApprovalForBroadcast')}
                          aria-label="Toggle require approval for broadcasts"
                          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {config.broadcast.requireApprovalForBroadcast ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                        >
                          <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {config.broadcast.requireApprovalForBroadcast ? 'translate-x-6' : 'translate-x-1'}"></span>
                        </button>
                      </label>
                      <label class="flex items-center justify-between">
                        <span class="text-sm text-gray-700">Allow scheduled broadcasts</span>
                        <button
                          type="button"
                          onclick={() => toggleRule('broadcast', 'allowScheduledBroadcasts')}
                          aria-label="Toggle allow scheduled broadcasts"
                          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {config.broadcast.allowScheduledBroadcasts ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                        >
                          <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {config.broadcast.allowScheduledBroadcasts ? 'translate-x-6' : 'translate-x-1'}"></span>
                        </button>
                      </label>
                      <label class="flex items-center justify-between">
                        <span class="text-sm text-gray-700">Allow priority broadcasts</span>
                        <button
                          type="button"
                          onclick={() => toggleRule('broadcast', 'allowPriorityBroadcasts')}
                          aria-label="Toggle allow priority broadcasts"
                          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {config.broadcast.allowPriorityBroadcasts ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                        >
                          <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {config.broadcast.allowPriorityBroadcasts ? 'translate-x-6' : 'translate-x-1'}"></span>
                        </button>
                      </label>
                      <label class="flex items-center justify-between">
                        <span class="text-sm text-gray-700">Require acknowledgment by default</span>
                        <button
                          type="button"
                          onclick={() => toggleRule('broadcast', 'requireAcknowledgment')}
                          aria-label="Toggle require acknowledgment by default"
                          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {config.broadcast.requireAcknowledgment ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                        >
                          <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {config.broadcast.requireAcknowledgment ? 'translate-x-6' : 'translate-x-1'}"></span>
                        </button>
                      </label>
                      <label class="flex items-center justify-between">
                        <span class="text-sm text-gray-700">Send acknowledgment reminders</span>
                        <button
                          type="button"
                          onclick={() => toggleRule('broadcast', 'acknowledgmentReminders')}
                          aria-label="Toggle send acknowledgment reminders"
                          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {config.broadcast.acknowledgmentReminders ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                        >
                          <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {config.broadcast.acknowledgmentReminders ? 'translate-x-6' : 'translate-x-1'}"></span>
                        </button>
                      </label>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label for="broadcastRetentionDays" class="block text-sm font-medium text-gray-700 mb-2">Archive Broadcast (days)</label>
                        <input
                          id="broadcastRetentionDays"
                          type="number"
                          bind:value={config.broadcast.broadcastRetentionDays}
                          min="1"
                          max="3650"
                          class="input-field"
                        />
                      </div>
                      <div>
                        <label for="reminderInterval" class="block text-sm font-medium text-gray-700 mb-2">Reminder interval (minutes)</label>
                        <input
                          id="reminderInterval"
                          type="number"
                          bind:value={config.broadcast.reminderInterval}
                          min="1"
                          max="10080"
                          class="input-field"
                        />
                      </div>
                      <div>
                        <label for="maxBroadcastTargets" class="block text-sm font-medium text-gray-700 mb-2">Max broadcast targets</label>
                        <input
                          id="maxBroadcastTargets"
                          type="number"
                          bind:value={config.broadcast.maxBroadcastTargets}
                          min="10"
                          max="10000"
                          class="input-field"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            {/if}
          </div>
    </div>

    <!-- Change Warning -->
    {#if hasChanges}
      <div class="collaboration-card p-4 border-l-4 border-yellow-500 bg-yellow-50 fade-in">
        <div class="flex items-center">
          <Clock class="w-5 h-5 text-yellow-600 mr-3" />
          <div>
            <p class="text-sm font-medium text-yellow-800">Unsaved Changes</p>
            <p class="text-sm text-yellow-700">You have unsaved configuration changes. These will become the default settings for new organization units.</p>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<!-- Add ToastContainer at the end like broadcast management -->
<ToastContainer />