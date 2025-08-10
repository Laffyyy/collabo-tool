<script lang="ts">
  import { Globe, Save, RotateCcw, Shield, Clock, Bell, Users, MessageSquare, Radio, Database, User, UserCheck, Send } from 'lucide-svelte';

  // Mock global configuration data
  let config = $state({
    // General Settings
    organizationName: 'CollabHub Enterprise',
    timezone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    language: 'en',
    
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
    twoFactorAuth: false,
    
    // Chat Settings - Global defaults for all OUs
    chat: {
      frontlineCanInitiate1v1: true,
      frontlineCanReply1v1: false,
      frontlineCanCreateGroups: false,
      frontlineCanJoinGroups: true,
      supervisorCanCreateGroups: true,
      managerCanAccessAllGroups: true,
      allowFileSharing: true,
      allowEmojis: true,
      messageRetentionDays: 365,
      maxFileSize: 10, // MB
      allowedFileTypes: ['jpg', 'png', 'pdf', 'doc', 'docx'],
      maxGroupSize: 50,
      messageEditWindow: 15, // minutes
      
      // Advanced File Sharing Permissions
      filePermissions: {
        global: {
          allowFileSharing: true,
          requirePermission: false,
          maxFileSize: 10
        },
        perPerson: {
          enabled: false,
          canDownload: true,
          canForward: true
        },
        perRole: {
          enabled: false,
          roles: {
            admin: true,
            manager: true,
            supervisor: true,
            support: true,
            frontline: false
          }
        },
        perOU: {
          enabled: false,
          allowCrossOU: false,
          inheritParent: true
        },
        dynamic: {
          enabled: false,
          roleOfOU: false,
          hierarchical: false
        }
      },
      
      // Message Forwarding Settings
      forwardingSettings: {
        enabled: false
      },
      
      // Pinned Messages Settings
      pinnedMessages: {
        enabled: true,
        maxPinnedPerConversation: 10,
        requirePermission: false
      }
    },
    
    // Broadcast Settings - Global defaults for all OUs
    broadcast: {
      frontlineCanCreateBroadcast: false,
      frontlineCanReplyToBroadcast: true,
      supervisorCanCreateBroadcast: true,
      managerCanCreateBroadcast: true,
      requireApprovalForBroadcast: false,
      allowScheduledBroadcasts: true,
      allowPriorityBroadcasts: true,
      broadcastRetentionDays: 730,
      requireAcknowledgment: true,
      acknowledgmentReminders: true,
      reminderInterval: 24, // hours
      maxBroadcastTargets: 1000
    },
    
    // Integration Settings
    ldapEnabled: false,
    ldapServer: '',
    ldapBaseDN: '',
    ssoEnabled: false,
    ssoProvider: 'none',
    
    // Backup Settings
    autoBackup: true,
    backupFrequency: 'daily',
    backupRetention: 30, // days
    backupLocation: '/backup/collabhub'
  });

  let hasChanges = $state(false);
  let savedConfigString = $state('');
  let activeTab = $state<'general' | 'chat' | 'broadcast'>('general');

  // Initialize saved config on mount
  $effect(() => {
    if (savedConfigString === '') {
      savedConfigString = JSON.stringify(config);
    }
  });

  // Watch for changes
  $effect(() => {
    if (savedConfigString !== '') {
      hasChanges = JSON.stringify(config) !== savedConfigString;
    }
  });

  const saveConfiguration = () => {
    // Simulate API call
    setTimeout(() => {
      savedConfigString = JSON.stringify(config);
      hasChanges = false;
      alert('Global configuration saved successfully! These settings will be applied as defaults for new organization units.');
    }, 500);
  };

  const resetConfiguration = () => {
    if (confirm('Are you sure you want to reset all changes?')) {
      config = JSON.parse(savedConfigString);
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
            >
              <RotateCcw class="w-4 h-4" />
              <span>Reset</span>
            </button>
          {/if}
          <button
            onclick={saveConfiguration}
            disabled={!hasChanges}
            class="primary-button flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save class="w-4 h-4" />
            <span>Save Changes</span>
          </button>
        </div>
      </div>
    </div>

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
                      <label for="orgName" class="block text-sm font-medium text-gray-700 mb-2">Organization Name</label>
                      <input
                        id="orgName"
                        bind:value={config.organizationName}
                        class="input-field"
                        placeholder="Enter organization name"
                      />
                    </div>
                    
                    <div>
                      <label for="timezone" class="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                      <select id="timezone" bind:value={config.timezone} class="input-field">
                        <option value="America/New_York">Eastern Time (EST/EDT)</option>
                        <option value="America/Chicago">Central Time (CST/CDT)</option>
                        <option value="America/Denver">Mountain Time (MST/MDT)</option>
                        <option value="America/Los_Angeles">Pacific Time (PST/PDT)</option>
                        <option value="UTC">UTC</option>
                      </select>
                    </div>
                    
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
                  
                  <div class="space-y-3">
                    <label class="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        bind:checked={config.twoFactorAuth}
                        class="rounded border-gray-300 text-[#01c0a4] focus:ring-[#01c0a4]"
                      />
                      <span class="text-sm font-medium">Enable Two-Factor Authentication</span>
                    </label>
                  </div>
                </div>

                <!-- Backup Settings -->
                <div class="space-y-6">
                  <div class="flex items-center justify-between">
                    <h3 class="text-xl font-semibold text-gray-900 flex items-center">
                      <Database class="w-6 h-6 text-[#01c0a4] mr-3" />
                      Backup Settings
                    </h3>
                    <button
                      onclick={initiateBackup}
                      class="secondary-button text-sm"
                    >
                      Initiate Manual Backup
                    </button>
                  </div>
                  
                  <div class="space-y-4">
                    <div class="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        bind:checked={config.autoBackup}
                        class="rounded border-gray-300 text-[#01c0a4] focus:ring-[#01c0a4]"
                      />
                      <span class="text-sm font-medium">Enable Automatic Backups</span>
                    </div>
                    
                    {#if config.autoBackup}
                      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label for="backupFrequency" class="block text-sm font-medium text-gray-700 mb-2">Backup Frequency</label>
                          <select id="backupFrequency" bind:value={config.backupFrequency} class="input-field">
                            <option value="hourly">Hourly</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                          </select>
                        </div>
                        
                        <div>
                          <label for="backupRetention" class="block text-sm font-medium text-gray-700 mb-2">Retention (Days)</label>
                          <input
                            id="backupRetention"
                            type="number"
                            bind:value={config.backupRetention}
                            min="7"
                            max="365"
                            class="input-field"
                          />
                        </div>
                        
                        <div>
                          <label for="backupLocation" class="block text-sm font-medium text-gray-700 mb-2">Backup Location</label>
                          <input
                            id="backupLocation"
                            bind:value={config.backupLocation}
                            class="input-field"
                            placeholder="/backup/collabhub"
                          />
                        </div>
                      </div>
                    {/if}
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
                      <span class="text-sm text-gray-700">Can reply in 1:1 conversations</span>
                      <button
                        type="button"
                        onclick={() => toggleRule('chat', 'frontlineCanReply1v1')}
                        aria-label="Toggle frontline can reply in 1v1 chats"
                        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {config.chat.frontlineCanReply1v1 ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                      >
                        <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {config.chat.frontlineCanReply1v1 ? 'translate-x-6' : 'translate-x-1'}"></span>
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
                  </div>
                </div>

                <div class="bg-white p-4 rounded-lg border">
                  <h4 class="font-semibold text-gray-900 mb-4">General Chat Settings</h4>
                  <div class="space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label class="flex items-center justify-between">
                        <span class="text-sm text-gray-700">Allow file sharing</span>
                        <button
                          type="button"
                          onclick={() => toggleRule('chat', 'allowFileSharing')}
                          aria-label="Toggle allow file sharing"
                          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {config.chat.allowFileSharing ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                        >
                          <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {config.chat.allowFileSharing ? 'translate-x-6' : 'translate-x-1'}"></span>
                        </button>
                      </label>
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
                        <label for="messageRetentionDays" class="block text-sm font-medium text-gray-700 mb-2">Message retention (days)</label>
                        <input
                          id="messageRetentionDays"
                          type="number"
                          bind:value={config.chat.messageRetentionDays}
                          min="1"
                          max="3650"
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
                    
                    <div>
                      <label for="messageEditWindow" class="block text-sm font-medium text-gray-700 mb-2">Message edit window (minutes)</label>
                      <input
                        id="messageEditWindow"
                        type="number"
                        bind:value={config.chat.messageEditWindow}
                        min="0"
                        max="60"
                        class="input-field w-32"
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

                <!-- Advanced File Sharing Permissions -->
                <div class="bg-white p-4 rounded-lg border">
                  <h4 class="font-semibold text-gray-900 mb-4">File Sharing Permissions</h4>
                  <div class="space-y-6">
                    <!-- Global File Settings -->
                    <div class="space-y-4">
                      <h5 class="text-md font-medium text-gray-900">Global Settings</h5>
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label class="flex items-center justify-between">
                          <span class="text-sm text-gray-700">Enable file sharing</span>
                          <button
                            type="button"
                            onclick={() => config.chat.filePermissions.global.allowFileSharing = !config.chat.filePermissions.global.allowFileSharing}
                            aria-label="Toggle file sharing"
                            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {config.chat.filePermissions.global.allowFileSharing ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                          >
                            <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {config.chat.filePermissions.global.allowFileSharing ? 'translate-x-6' : 'translate-x-1'}"></span>
                          </button>
                        </label>
                        <label class="flex items-center justify-between">
                          <span class="text-sm text-gray-700">Require permission for file access</span>
                          <button
                            type="button"
                            onclick={() => config.chat.filePermissions.global.requirePermission = !config.chat.filePermissions.global.requirePermission}
                            aria-label="Toggle require permission"
                            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {config.chat.filePermissions.global.requirePermission ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                          >
                            <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {config.chat.filePermissions.global.requirePermission ? 'translate-x-6' : 'translate-x-1'}"></span>
                          </button>
                        </label>
                      </div>
                    </div>

                    <!-- Per Person Permissions -->
                    <div class="space-y-4">
                      <div class="flex items-center justify-between">
                        <h5 class="text-md font-medium text-gray-900">Per Person Permissions</h5>
                        <button
                          type="button"
                          onclick={() => config.chat.filePermissions.perPerson.enabled = !config.chat.filePermissions.perPerson.enabled}
                          aria-label="Toggle per person permissions"
                          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {config.chat.filePermissions.perPerson.enabled ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                        >
                          <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {config.chat.filePermissions.perPerson.enabled ? 'translate-x-6' : 'translate-x-1'}"></span>
                        </button>
                      </div>
                      {#if config.chat.filePermissions.perPerson.enabled}
                        <div class="ml-4 space-y-3 p-3 bg-gray-50 rounded-lg">
                          <label class="flex items-center justify-between">
                            <span class="text-sm text-gray-700">Allow download</span>
                            <button
                              type="button"
                              onclick={() => config.chat.filePermissions.perPerson.canDownload = !config.chat.filePermissions.perPerson.canDownload}
                              aria-label="Toggle download permission"
                              class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors {config.chat.filePermissions.perPerson.canDownload ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                            >
                              <span class="inline-block h-3 w-3 transform rounded-full bg-white transition-transform {config.chat.filePermissions.perPerson.canDownload ? 'translate-x-5' : 'translate-x-1'}"></span>
                            </button>
                          </label>
                          <label class="flex items-center justify-between">
                            <span class="text-sm text-gray-700">Allow forwarding</span>
                            <button
                              type="button"
                              onclick={() => config.chat.filePermissions.perPerson.canForward = !config.chat.filePermissions.perPerson.canForward}
                              aria-label="Toggle forward permission"
                              class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors {config.chat.filePermissions.perPerson.canForward ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                            >
                              <span class="inline-block h-3 w-3 transform rounded-full bg-white transition-transform {config.chat.filePermissions.perPerson.canForward ? 'translate-x-5' : 'translate-x-1'}"></span>
                            </button>
                          </label>
                        </div>
                      {/if}
                    </div>

                    <!-- Per Role Permissions -->
                    <div class="space-y-4">
                      <div class="flex items-center justify-between">
                        <h5 class="text-md font-medium text-gray-900">Per Role Permissions</h5>
                        <button
                          type="button"
                          onclick={() => config.chat.filePermissions.perRole.enabled = !config.chat.filePermissions.perRole.enabled}
                          aria-label="Toggle per role permissions"
                          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {config.chat.filePermissions.perRole.enabled ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                        >
                          <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {config.chat.filePermissions.perRole.enabled ? 'translate-x-6' : 'translate-x-1'}"></span>
                        </button>
                      </div>
                      {#if config.chat.filePermissions.perRole.enabled}
                        <div class="ml-4 space-y-3 p-3 bg-gray-50 rounded-lg">
                          {#each Object.entries(config.chat.filePermissions.perRole.roles) as [role, enabled]}
                            <label class="flex items-center justify-between">
                              <span class="text-sm text-gray-700 capitalize">{role}</span>
                              <button
                                type="button"
                                onclick={() => {
                                  const roleKey = role as keyof typeof config.chat.filePermissions.perRole.roles;
                                  config.chat.filePermissions.perRole.roles[roleKey] = !config.chat.filePermissions.perRole.roles[roleKey];
                                }}
                                aria-label="Toggle {role} permission"
                                class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors {enabled ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                              >
                                <span class="inline-block h-3 w-3 transform rounded-full bg-white transition-transform {enabled ? 'translate-x-5' : 'translate-x-1'}"></span>
                              </button>
                            </label>
                          {/each}
                        </div>
                      {/if}
                    </div>

                    <!-- Per OU Permissions -->
                    <div class="space-y-4">
                      <div class="flex items-center justify-between">
                        <h5 class="text-md font-medium text-gray-900">Per Organization Unit Permissions</h5>
                        <button
                          type="button"
                          onclick={() => config.chat.filePermissions.perOU.enabled = !config.chat.filePermissions.perOU.enabled}
                          aria-label="Toggle per OU permissions"
                          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {config.chat.filePermissions.perOU.enabled ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                        >
                          <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {config.chat.filePermissions.perOU.enabled ? 'translate-x-6' : 'translate-x-1'}"></span>
                        </button>
                      </div>
                      {#if config.chat.filePermissions.perOU.enabled}
                        <div class="ml-4 space-y-3 p-3 bg-gray-50 rounded-lg">
                          <label class="flex items-center justify-between">
                            <span class="text-sm text-gray-700">Allow cross-OU sharing</span>
                            <button
                              type="button"
                              onclick={() => config.chat.filePermissions.perOU.allowCrossOU = !config.chat.filePermissions.perOU.allowCrossOU}
                              aria-label="Toggle cross-OU sharing"
                              class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors {config.chat.filePermissions.perOU.allowCrossOU ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                            >
                              <span class="inline-block h-3 w-3 transform rounded-full bg-white transition-transform {config.chat.filePermissions.perOU.allowCrossOU ? 'translate-x-5' : 'translate-x-1'}"></span>
                            </button>
                          </label>
                          <label class="flex items-center justify-between">
                            <span class="text-sm text-gray-700">Inherit parent OU permissions</span>
                            <button
                              type="button"
                              onclick={() => config.chat.filePermissions.perOU.inheritParent = !config.chat.filePermissions.perOU.inheritParent}
                              aria-label="Toggle inherit parent OU"
                              class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors {config.chat.filePermissions.perOU.inheritParent ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                            >
                              <span class="inline-block h-3 w-3 transform rounded-full bg-white transition-transform {config.chat.filePermissions.perOU.inheritParent ? 'translate-x-5' : 'translate-x-1'}"></span>
                            </button>
                          </label>
                        </div>
                      {/if}
                    </div>

                    <!-- Dynamic Combinations -->
                    <div class="space-y-4">
                      <div class="flex items-center justify-between">
                        <h5 class="text-md font-medium text-gray-900">Dynamic Combinations</h5>
                        <button
                          type="button"
                          onclick={() => config.chat.filePermissions.dynamic.enabled = !config.chat.filePermissions.dynamic.enabled}
                          aria-label="Toggle dynamic combinations"
                          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {config.chat.filePermissions.dynamic.enabled ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                        >
                          <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {config.chat.filePermissions.dynamic.enabled ? 'translate-x-6' : 'translate-x-1'}"></span>
                        </button>
                      </div>
                      {#if config.chat.filePermissions.dynamic.enabled}
                        <div class="ml-4 space-y-3 p-3 bg-gray-50 rounded-lg">
                          <label class="flex items-center justify-between">
                            <span class="text-sm text-gray-700">Per role of specific OU</span>
                            <button
                              type="button"
                              onclick={() => config.chat.filePermissions.dynamic.roleOfOU = !config.chat.filePermissions.dynamic.roleOfOU}
                              aria-label="Toggle role of OU"
                              class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors {config.chat.filePermissions.dynamic.roleOfOU ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                            >
                              <span class="inline-block h-3 w-3 transform rounded-full bg-white transition-transform {config.chat.filePermissions.dynamic.roleOfOU ? 'translate-x-5' : 'translate-x-1'}"></span>
                            </button>
                          </label>
                          <label class="flex items-center justify-between">
                            <span class="text-sm text-gray-700">Hierarchical permissions</span>
                            <button
                              type="button"
                              onclick={() => config.chat.filePermissions.dynamic.hierarchical = !config.chat.filePermissions.dynamic.hierarchical}
                              aria-label="Toggle hierarchical permissions"
                              class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors {config.chat.filePermissions.dynamic.hierarchical ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                            >
                              <span class="inline-block h-3 w-3 transform rounded-full bg-white transition-transform {config.chat.filePermissions.dynamic.hierarchical ? 'translate-x-5' : 'translate-x-1'}"></span>
                            </button>
                          </label>
                        </div>
                      {/if}
                    </div>
                  </div>
                </div>

                <!-- Message Forwarding Settings -->
                <div class="bg-white p-4 rounded-lg border">
                  <h4 class="font-semibold text-gray-900 mb-4">Message Forwarding Settings</h4>
                  <div class="space-y-4">
                    <label class="flex items-center justify-between">
                      <span class="text-sm text-gray-700">Enable message forwarding</span>
                      <button
                        type="button"
                        onclick={() => config.chat.forwardingSettings.enabled = !config.chat.forwardingSettings.enabled}
                        aria-label="Toggle message forwarding"
                        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {config.chat.forwardingSettings.enabled ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                      >
                        <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {config.chat.forwardingSettings.enabled ? 'translate-x-6' : 'translate-x-1'}"></span>
                      </button>
                    </label>
                    <p class="text-xs text-gray-500">When enabled, users can forward messages between conversations.</p>
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
                      <label class="flex items-center justify-between">
                        <span class="text-sm text-gray-700">Require permission to pin</span>
                        <button
                          type="button"
                          onclick={() => config.chat.pinnedMessages.requirePermission = !config.chat.pinnedMessages.requirePermission}
                          aria-label="Toggle pin permission requirement"
                          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {config.chat.pinnedMessages.requirePermission ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                        >
                          <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {config.chat.pinnedMessages.requirePermission ? 'translate-x-6' : 'translate-x-1'}"></span>
                        </button>
                      </label>
                    </div>
                    <div>
                      <label for="maxPinnedPerConversation" class="block text-sm font-medium text-gray-700 mb-2">Max pinned messages per conversation</label>
                      <input
                        id="maxPinnedPerConversation"
                        type="number"
                        bind:value={config.chat.pinnedMessages.maxPinnedPerConversation}
                        min="1"
                        max="50"
                        class="input-field w-32"
                      />
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
                        <label for="broadcastRetentionDays" class="block text-sm font-medium text-gray-700 mb-2">Broadcast retention (days)</label>
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
                        <label for="reminderInterval" class="block text-sm font-medium text-gray-700 mb-2">Reminder interval (hours)</label>
                        <input
                          id="reminderInterval"
                          type="number"
                          bind:value={config.broadcast.reminderInterval}
                          min="1"
                          max="168"
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
