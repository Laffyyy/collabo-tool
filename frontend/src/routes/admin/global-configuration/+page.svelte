<script lang="ts">
  import { Globe, Save, RotateCcw, Shield, Clock, Bell, Users, MessageSquare, FileText, Database } from 'lucide-svelte';
  import Navigation from '$lib/components/Navigation.svelte';

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
    
    // Chat Settings
    chatRetentionDays: 365,
    maxFileSize: 10, // MB
    allowedFileTypes: ['jpg', 'png', 'pdf', 'doc', 'docx'],
    maxGroupSize: 50,
    messageEditWindow: 15, // minutes
    
    // Broadcast Settings
    broadcastRetentionDays: 730,
    requireAcknowledgment: true,
    acknowledgmentReminders: true,
    reminderInterval: 24, // hours
    maxBroadcastTargets: 1000,
    
    // Email Settings
    smtpServer: 'smtp.company.com',
    smtpPort: 587,
    smtpUsername: 'notifications@company.com',
    smtpPassword: '••••••••',
    emailFromName: 'CollabHub Notifications',
    enableEmailNotifications: true,
    
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
      alert('Configuration saved successfully!');
    }, 500);
  };

  const resetConfiguration = () => {
    if (confirm('Are you sure you want to reset all changes?')) {
      config = JSON.parse(savedConfigString);
      hasChanges = false;
    }
  };

  const testEmailConfiguration = () => {
    alert('Test email sent! Please check your inbox.');
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
</script>

<svelte:head>
  <title>Global Configuration - Admin Controls</title>
</svelte:head>

<div class="h-screen flex flex-col bg-gray-50">
  <Navigation />
  
  <div class="flex-1 overflow-auto">
    <div class="p-6 space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between fade-in">
    <div>
      <h1 class="text-3xl font-bold text-gray-800 mb-2">Global Configuration</h1>
      <p class="text-gray-600">Manage system-wide settings and configurations</p>
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

  <!-- General Settings -->
  <div class="collaboration-card p-6 fade-in">
    <div class="flex items-center space-x-3 mb-6">
      <Globe class="w-6 h-6 text-[#01c0a4]" />
      <h2 class="text-xl font-semibold text-gray-800">General Settings</h2>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
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
  <div class="collaboration-card p-6 fade-in">
    <div class="flex items-center space-x-3 mb-6">
      <Shield class="w-6 h-6 text-[#01c0a4]" />
      <h2 class="text-xl font-semibold text-gray-800">Security Settings</h2>
    </div>
    
    <div class="space-y-6">
      <!-- Password Policy -->
      <div>
        <h3 class="text-lg font-medium text-gray-800 mb-4">Password Policy</h3>
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
        </div>
        
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <label class="flex items-center space-x-2">
            <input
              type="checkbox"
              bind:checked={config.passwordPolicy.requireUppercase}
              class="rounded border-gray-300 text-[#01c0a4] focus:ring-[#01c0a4]"
            />
            <span class="text-sm">Uppercase</span>
          </label>
          
          <label class="flex items-center space-x-2">
            <input
              type="checkbox"
              bind:checked={config.passwordPolicy.requireLowercase}
              class="rounded border-gray-300 text-[#01c0a4] focus:ring-[#01c0a4]"
            />
            <span class="text-sm">Lowercase</span>
          </label>
          
          <label class="flex items-center space-x-2">
            <input
              type="checkbox"
              bind:checked={config.passwordPolicy.requireNumbers}
              class="rounded border-gray-300 text-[#01c0a4] focus:ring-[#01c0a4]"
            />
            <span class="text-sm">Numbers</span>
          </label>
          
          <label class="flex items-center space-x-2">
            <input
              type="checkbox"
              bind:checked={config.passwordPolicy.requireSpecialChars}
              class="rounded border-gray-300 text-[#01c0a4] focus:ring-[#01c0a4]"
            />
            <span class="text-sm">Special Characters</span>
          </label>
        </div>
      </div>
      
      <!-- Session & Authentication -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        
        <div class="flex items-end">
          <label class="flex items-center space-x-2">
            <input
              type="checkbox"
              bind:checked={config.twoFactorAuth}
              class="rounded border-gray-300 text-[#01c0a4] focus:ring-[#01c0a4]"
            />
            <span class="text-sm">Two-Factor Authentication</span>
          </label>
        </div>
      </div>
    </div>
  </div>

  <!-- Chat Settings -->
  <div class="collaboration-card p-6 fade-in">
    <div class="flex items-center space-x-3 mb-6">
      <MessageSquare class="w-6 h-6 text-[#01c0a4]" />
      <h2 class="text-xl font-semibold text-gray-800">Chat Settings</h2>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label for="chatRetention" class="block text-sm font-medium text-gray-700 mb-2">Message Retention (Days)</label>
        <input
          id="chatRetention"
          type="number"
          bind:value={config.chatRetentionDays}
          min="30"
          max="2555"
          class="input-field"
        />
      </div>
      
      <div>
        <label for="maxFileSize" class="block text-sm font-medium text-gray-700 mb-2">Max File Size (MB)</label>
        <input
          id="maxFileSize"
          type="number"
          bind:value={config.maxFileSize}
          min="1"
          max="100"
          class="input-field"
        />
      </div>
      
      <div>
        <label for="maxGroupSize" class="block text-sm font-medium text-gray-700 mb-2">Max Group Size</label>
        <input
          id="maxGroupSize"
          type="number"
          bind:value={config.maxGroupSize}
          min="5"
          max="500"
          class="input-field"
        />
      </div>
      
      <div>
        <label for="messageEditWindow" class="block text-sm font-medium text-gray-700 mb-2">Message Edit Window (Minutes)</label>
        <input
          id="messageEditWindow"
          type="number"
          bind:value={config.messageEditWindow}
          min="0"
          max="60"
          class="input-field"
        />
      </div>
    </div>
    
    <div class="mt-4">
      <fieldset>
        <legend class="block text-sm font-medium text-gray-700 mb-2">Allowed File Types</legend>
        <div class="p-3 bg-gray-50 rounded-lg">
          <span class="text-sm text-gray-600">{formatFileTypes(config.allowedFileTypes)}</span>
        </div>
      </fieldset>
    </div>
  </div>

  <!-- Broadcast Settings -->
  <div class="collaboration-card p-6 fade-in">
    <div class="flex items-center space-x-3 mb-6">
      <Bell class="w-6 h-6 text-[#01c0a4]" />
      <h2 class="text-xl font-semibold text-gray-800">Broadcast Settings</h2>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label for="broadcastRetention" class="block text-sm font-medium text-gray-700 mb-2">Broadcast Retention (Days)</label>
        <input
          id="broadcastRetention"
          type="number"
          bind:value={config.broadcastRetentionDays}
          min="90"
          max="2555"
          class="input-field"
        />
      </div>
      
      <div>
        <label for="reminderInterval" class="block text-sm font-medium text-gray-700 mb-2">Reminder Interval (Hours)</label>
        <input
          id="reminderInterval"
          type="number"
          bind:value={config.reminderInterval}
          min="1"
          max="168"
          class="input-field"
        />
      </div>
      
      <div>
        <label for="maxBroadcastTargets" class="block text-sm font-medium text-gray-700 mb-2">Max Broadcast Targets</label>
        <input
          id="maxBroadcastTargets"
          type="number"
          bind:value={config.maxBroadcastTargets}
          min="10"
          max="10000"
          class="input-field"
        />
      </div>
      
      <div class="space-y-3">
        <label class="flex items-center space-x-2">
          <input
            type="checkbox"
            bind:checked={config.requireAcknowledgment}
            class="rounded border-gray-300 text-[#01c0a4] focus:ring-[#01c0a4]"
          />
          <span class="text-sm">Require Acknowledgment by Default</span>
        </label>
        
        <label class="flex items-center space-x-2">
          <input
            type="checkbox"
            bind:checked={config.acknowledgmentReminders}
            class="rounded border-gray-300 text-[#01c0a4] focus:ring-[#01c0a4]"
          />
          <span class="text-sm">Send Acknowledgment Reminders</span>
        </label>
      </div>
    </div>
  </div>

  <!-- Email Settings -->
  <div class="collaboration-card p-6 fade-in">
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center space-x-3">
        <FileText class="w-6 h-6 text-[#01c0a4]" />
        <h2 class="text-xl font-semibold text-gray-800">Email Settings</h2>
      </div>
      <button
        onclick={testEmailConfiguration}
        class="secondary-button text-sm"
      >
        Test Configuration
      </button>
    </div>
    
    <div class="space-y-4">
      <div class="flex items-center space-x-2 mb-4">
        <input
          type="checkbox"
          bind:checked={config.enableEmailNotifications}
          class="rounded border-gray-300 text-[#01c0a4] focus:ring-[#01c0a4]"
        />
        <span class="text-sm font-medium">Enable Email Notifications</span>
      </div>
      
      {#if config.enableEmailNotifications}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label for="smtpServer" class="block text-sm font-medium text-gray-700 mb-2">SMTP Server</label>
            <input
              id="smtpServer"
              bind:value={config.smtpServer}
              class="input-field"
              placeholder="smtp.company.com"
            />
          </div>
          
          <div>
            <label for="smtpPort" class="block text-sm font-medium text-gray-700 mb-2">SMTP Port</label>
            <input
              id="smtpPort"
              type="number"
              bind:value={config.smtpPort}
              class="input-field"
              placeholder="587"
            />
          </div>
          
          <div>
            <label for="smtpUsername" class="block text-sm font-medium text-gray-700 mb-2">SMTP Username</label>
            <input
              id="smtpUsername"
              bind:value={config.smtpUsername}
              class="input-field"
              placeholder="notifications@company.com"
            />
          </div>
          
          <div>
            <label for="smtpPassword" class="block text-sm font-medium text-gray-700 mb-2">SMTP Password</label>
            <input
              id="smtpPassword"
              type="password"
              bind:value={config.smtpPassword}
              class="input-field"
              placeholder="••••••••"
            />
          </div>
          
          <div class="md:col-span-2">
            <label for="emailFromName" class="block text-sm font-medium text-gray-700 mb-2">From Name</label>
            <input
              id="emailFromName"
              bind:value={config.emailFromName}
              class="input-field"
              placeholder="CollabHub Notifications"
            />
          </div>
        </div>
      {/if}
    </div>
  </div>

  <!-- Backup Settings -->
  <div class="collaboration-card p-6 fade-in">
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center space-x-3">
        <Database class="w-6 h-6 text-[#01c0a4]" />
        <h2 class="text-xl font-semibold text-gray-800">Backup Settings</h2>
      </div>
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

  <!-- Change Warning -->
  {#if hasChanges}
    <div class="collaboration-card p-4 border-l-4 border-yellow-500 bg-yellow-50 fade-in">
      <div class="flex items-center">
        <Clock class="w-5 h-5 text-yellow-600 mr-3" />
        <div>
          <p class="text-sm font-medium text-yellow-800">Unsaved Changes</p>
          <p class="text-sm text-yellow-700">You have unsaved configuration changes. Don't forget to save your changes.</p>
        </div>
      </div>
    </div>
  {/if}
    </div>
  </div>
</div>
