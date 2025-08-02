<script lang="ts">
  import { FileText, Search, Filter, Download, Eye, AlertTriangle, User, Activity, Shield, Database, Calendar } from 'lucide-svelte';
  import Navigation from '$lib/components/Navigation.svelte';

  interface AdminLog {
    id: string;
    timestamp: Date;
    user: string;
    action: string;
    category: 'user' | 'security' | 'system' | 'data' | 'configuration';
    target?: string;
    details: string;
    ipAddress: string;
    userAgent: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    success: boolean;
  }

  // Mock admin logs data
  const mockLogs: AdminLog[] = [
    {
      id: '1',
      timestamp: new Date('2024-01-15T14:30:00'),
      user: 'admin@company.com',
      action: 'User Creation',
      category: 'user',
      target: 'john.doe@company.com',
      details: 'Created new user account with Manager role',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      severity: 'low',
      success: true
    },
    {
      id: '2',
      timestamp: new Date('2024-01-15T14:25:00'),
      user: 'admin@company.com',
      action: 'Password Policy Update',
      category: 'security',
      details: 'Updated password minimum length requirement from 6 to 8 characters',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      severity: 'medium',
      success: true
    },
    {
      id: '3',
      timestamp: new Date('2024-01-15T14:20:00'),
      user: 'system',
      action: 'Database Backup',
      category: 'system',
      details: 'Automated daily backup completed successfully',
      ipAddress: '127.0.0.1',
      userAgent: 'System/1.0',
      severity: 'low',
      success: true
    },
    {
      id: '4',
      timestamp: new Date('2024-01-15T14:15:00'),
      user: 'manager@company.com',
      action: 'User Role Change',
      category: 'user',
      target: 'jane.smith@company.com',
      details: 'Changed user role from Support to Supervisor',
      ipAddress: '192.168.1.150',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      severity: 'medium',
      success: true
    },
    {
      id: '5',
      timestamp: new Date('2024-01-15T14:10:00'),
      user: 'admin@company.com',
      action: 'Failed Login Attempt',
      category: 'security',
      target: 'unknown_user@company.com',
      details: 'Multiple failed login attempts detected from same IP',
      ipAddress: '203.0.113.42',
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      severity: 'high',
      success: false
    },
    {
      id: '6',
      timestamp: new Date('2024-01-15T14:05:00'),
      user: 'admin@company.com',
      action: 'Broadcast Deletion',
      category: 'data',
      target: 'Weekly Team Update #47',
      details: 'Deleted archived broadcast message',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      severity: 'low',
      success: true
    },
    {
      id: '7',
      timestamp: new Date('2024-01-15T14:00:00'),
      user: 'system',
      action: 'Configuration Change',
      category: 'configuration',
      details: 'Session timeout changed from 8 hours to 6 hours',
      ipAddress: '127.0.0.1',
      userAgent: 'System/1.0',
      severity: 'medium',
      success: true
    },
    {
      id: '8',
      timestamp: new Date('2024-01-15T13:55:00'),
      user: 'admin@company.com',
      action: 'User Suspension',
      category: 'user',
      target: 'temp.contractor@company.com',
      details: 'Suspended user account due to policy violation',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      severity: 'high',
      success: true
    }
  ];

  let logs = $state(mockLogs);
  let filteredLogs = $state(mockLogs);
  let searchTerm = $state('');
  let selectedCategory = $state('all');
  let selectedSeverity = $state('all');
  let selectedUser = $state('all');
  let selectedDateRange = $state('all');
  let showSuccessOnly = $state(false);
  let selectedLog = $state<AdminLog | null>(null);
  let showLogDetails = $state(false);

  // Filter logs based on search and filters
  $effect(() => {
    let filtered = logs;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.target && log.target.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(log => log.category === selectedCategory);
    }

    // Severity filter
    if (selectedSeverity !== 'all') {
      filtered = filtered.filter(log => log.severity === selectedSeverity);
    }

    // User filter
    if (selectedUser !== 'all') {
      filtered = filtered.filter(log => log.user === selectedUser);
    }

    // Success filter
    if (showSuccessOnly) {
      filtered = filtered.filter(log => log.success);
    }

    // Date range filter
    const now = new Date();
    if (selectedDateRange !== 'all') {
      const daysAgo = {
        '24h': 1,
        '7d': 7,
        '30d': 30,
        '90d': 90
      }[selectedDateRange] || 0;
      
      const cutoffDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
      filtered = filtered.filter(log => log.timestamp >= cutoffDate);
    }

    filteredLogs = filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  });

  const formatTimestamp = (date: Date) => {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'user': return User;
      case 'security': return Shield;
      case 'system': return Activity;
      case 'data': return Database;
      case 'configuration': return FileText;
      default: return Activity;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'user': return 'text-blue-600 bg-blue-50';
      case 'security': return 'text-red-600 bg-red-50';
      case 'system': return 'text-green-600 bg-green-50';
      case 'data': return 'text-purple-600 bg-purple-50';
      case 'configuration': return 'text-indigo-600 bg-indigo-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getUniqueUsers = () => {
    const users = new Set(logs.map(log => log.user));
    return Array.from(users).sort();
  };

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'User', 'Action', 'Category', 'Target', 'Details', 'IP Address', 'Severity', 'Success'].join(','),
      ...filteredLogs.map(log => [
        formatTimestamp(log.timestamp),
        log.user,
        log.action,
        log.category,
        log.target || '',
        `"${log.details}"`,
        log.ipAddress,
        log.severity,
        log.success ? 'Yes' : 'No'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const viewLogDetails = (log: AdminLog) => {
    selectedLog = log;
    showLogDetails = true;
  };

  const clearFilters = () => {
    searchTerm = '';
    selectedCategory = 'all';
    selectedSeverity = 'all';
    selectedUser = 'all';
    selectedDateRange = 'all';
    showSuccessOnly = false;
  };
</script>

<svelte:head>
  <title>Admin Logs - Admin Controls</title>
</svelte:head>

<div class="h-screen flex flex-col bg-gray-50">
  <Navigation />
  
  <div class="flex-1 overflow-auto">
    <div class="p-6 space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between fade-in">
    <div>
      <h1 class="text-3xl font-bold text-gray-800 mb-2">Admin Logs</h1>
      <p class="text-gray-600">Monitor administrative activities and system events</p>
    </div>
    <button
      onclick={exportLogs}
      class="primary-button flex items-center space-x-2"
    >
      <Download class="w-4 h-4" />
      <span>Export Logs</span>
    </button>
  </div>

  <!-- Filters -->
  <div class="collaboration-card p-6 fade-in">
    <div class="flex items-center space-x-3 mb-4">
      <Filter class="w-5 h-5 text-[#01c0a4]" />
      <h2 class="text-lg font-semibold text-gray-800">Filters</h2>
      <button
        onclick={clearFilters}
        class="text-sm text-[#01c0a4] hover:text-[#00a08a] ml-auto"
      >
        Clear All
      </button>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
      <!-- Search -->
      <div class="md:col-span-2">
        <label for="search" class="block text-sm font-medium text-gray-700 mb-2">Search</label>
        <div class="relative">
          <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            id="search"
            bind:value={searchTerm}
            class="input-field pl-10"
            placeholder="Search actions, users, details..."
          />
        </div>
      </div>
      
      <!-- Category Filter -->
      <div>
        <label for="category" class="block text-sm font-medium text-gray-700 mb-2">Category</label>
        <select id="category" bind:value={selectedCategory} class="input-field">
          <option value="all">All Categories</option>
          <option value="user">User Management</option>
          <option value="security">Security</option>
          <option value="system">System</option>
          <option value="data">Data</option>
          <option value="configuration">Configuration</option>
        </select>
      </div>
      
      <!-- Severity Filter -->
      <div>
        <label for="severity" class="block text-sm font-medium text-gray-700 mb-2">Severity</label>
        <select id="severity" bind:value={selectedSeverity} class="input-field">
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <!-- User Filter -->
      <div>
        <label for="user" class="block text-sm font-medium text-gray-700 mb-2">User</label>
        <select id="user" bind:value={selectedUser} class="input-field">
          <option value="all">All Users</option>
          {#each getUniqueUsers() as user}
            <option value={user}>{user}</option>
          {/each}
        </select>
      </div>
      
      <!-- Date Range Filter -->
      <div>
        <label for="dateRange" class="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
        <select id="dateRange" bind:value={selectedDateRange} class="input-field">
          <option value="all">All Time</option>
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
        </select>
      </div>
      
      <!-- Success Filter -->
      <div class="flex items-end">
        <label class="flex items-center space-x-2">
          <input
            type="checkbox"
            bind:checked={showSuccessOnly}
            class="rounded border-gray-300 text-[#01c0a4] focus:ring-[#01c0a4]"
          />
          <span class="text-sm">Show successful actions only</span>
        </label>
      </div>
    </div>
  </div>

  <!-- Summary Stats -->
  <div class="grid grid-cols-1 md:grid-cols-4 gap-4 fade-in">
    <div class="collaboration-card p-4">
      <div class="flex items-center space-x-3">
        <Activity class="w-8 h-8 text-[#01c0a4]" />
        <div>
          <p class="text-2xl font-bold text-gray-800">{filteredLogs.length}</p>
          <p class="text-sm text-gray-600">Total Logs</p>
        </div>
      </div>
    </div>
    
    <div class="collaboration-card p-4">
      <div class="flex items-center space-x-3">
        <AlertTriangle class="w-8 h-8 text-red-500" />
        <div>
          <p class="text-2xl font-bold text-gray-800">{filteredLogs.filter(log => !log.success).length}</p>
          <p class="text-sm text-gray-600">Failed Actions</p>
        </div>
      </div>
    </div>
    
    <div class="collaboration-card p-4">
      <div class="flex items-center space-x-3">
        <Shield class="w-8 h-8 text-orange-500" />
        <div>
          <p class="text-2xl font-bold text-gray-800">{filteredLogs.filter(log => log.category === 'security').length}</p>
          <p class="text-sm text-gray-600">Security Events</p>
        </div>
      </div>
    </div>
    
    <div class="collaboration-card p-4">
      <div class="flex items-center space-x-3">
        <User class="w-8 h-8 text-blue-500" />
        <div>
          <p class="text-2xl font-bold text-gray-800">{getUniqueUsers().length}</p>
          <p class="text-sm text-gray-600">Active Users</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Logs Table -->
  <div class="collaboration-card fade-in">
    <div class="p-6 border-b">
      <h2 class="text-lg font-semibold text-gray-800">Activity Logs</h2>
    </div>
    
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead class="bg-gray-50 border-b">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          {#each filteredLogs as log}
            <tr class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center space-x-2">
                  <Calendar class="w-4 h-4 text-gray-400" />
                  <span class="text-sm text-gray-600">{formatTimestamp(log.timestamp)}</span>
                </div>
              </td>
              
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">{log.user}</div>
                <div class="text-sm text-gray-500">{log.ipAddress}</div>
              </td>
              
              <td class="px-6 py-4">
                <div class="text-sm font-medium text-gray-900">{log.action}</div>
                {#if log.target}
                  <div class="text-sm text-gray-500">Target: {log.target}</div>
                {/if}
              </td>
              
              <td class="px-6 py-4 whitespace-nowrap">
                {#each [log] as logItem (logItem.id)}
                  {@const CategoryIcon = getCategoryIcon(logItem.category)}
                  <span class="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium {getCategoryColor(logItem.category)}">
                    <CategoryIcon class="w-3 h-3" />
                    <span class="capitalize">{logItem.category}</span>
                  </span>
                {/each}
              </td>
              
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getSeverityColor(log.severity)}">
                  {log.severity.toUpperCase()}
                </span>
              </td>
              
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {log.success ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}">
                  {log.success ? 'Success' : 'Failed'}
                </span>
              </td>
              
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  onclick={() => viewLogDetails(log)}
                  class="text-[#01c0a4] hover:text-[#00a08a] flex items-center space-x-1"
                >
                  <Eye class="w-4 h-4" />
                  <span>View</span>
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
      
      {#if filteredLogs.length === 0}
        <div class="text-center py-12">
          <FileText class="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p class="text-gray-600">No logs found matching your criteria.</p>
        </div>
      {/if}
    </div>
  </div>
</div>

<!-- Log Details Modal -->
{#if showLogDetails && selectedLog}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <div class="p-6 border-b">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold text-gray-800">Log Details</h2>
          <button
            onclick={() => showLogDetails = false}
            class="text-gray-400 hover:text-gray-600"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>
      
      <div class="p-6 space-y-6">
        <!-- Basic Info -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Timestamp</label>
            <p class="text-sm text-gray-900">{formatTimestamp(selectedLog.timestamp)}</p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">User</label>
            <p class="text-sm text-gray-900">{selectedLog.user}</p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Action</label>
            <p class="text-sm text-gray-900">{selectedLog.action}</p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Category</label>
            {#if selectedLog}
              {@const CategoryIcon = getCategoryIcon(selectedLog.category)}
              <span class="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium {getCategoryColor(selectedLog.category)}">
                <CategoryIcon class="w-3 h-3" />
                <span class="capitalize">{selectedLog.category}</span>
              </span>
            {/if}
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Severity</label>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getSeverityColor(selectedLog.severity)}">
              {selectedLog.severity.toUpperCase()}
            </span>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {selectedLog.success ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}">
              {selectedLog.success ? 'Success' : 'Failed'}
            </span>
          </div>
        </div>
        
        {#if selectedLog.target}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Target</label>
            <p class="text-sm text-gray-900">{selectedLog.target}</p>
          </div>
        {/if}
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Details</label>
          <p class="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedLog.details}</p>
        </div>
        
        <!-- Technical Info -->
        <div class="border-t pt-6">
          <h3 class="text-lg font-medium text-gray-800 mb-4">Technical Information</h3>
          <div class="grid grid-cols-1 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">IP Address</label>
              <p class="text-sm text-gray-900 font-mono">{selectedLog.ipAddress}</p>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">User Agent</label>
              <p class="text-sm text-gray-900 font-mono break-all">{selectedLog.userAgent}</p>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Log ID</label>
              <p class="text-sm text-gray-900 font-mono">{selectedLog.id}</p>
            </div>
          </div>
        </div>
      </div>
      
      <div class="p-6 border-t bg-gray-50 flex justify-end">
        <button
          onclick={() => showLogDetails = false}
          class="secondary-button"
        >
          Close
        </button>
      </div>
    </div>
  </div>
{/if}
