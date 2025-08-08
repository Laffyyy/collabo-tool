<script lang="ts">
  import { FileText, Search, Filter, Download, Eye, AlertTriangle, User, Activity, Shield, Database, Calendar, MessageSquare, Radio, Users, Building2, Settings } from 'lucide-svelte';

  interface AdminLog {
    id: string;
    timestamp: Date;
    user: string;
    action: string;
    category: 'chat' | 'broadcast' | 'user-management' | 'ou-management' | 'global-config' | 'security' | 'system';
    target?: string;
    details: string;
    ipAddress: string;
    userAgent: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    success: boolean;
  }

  let activeTab = $state<'all' | 'chat' | 'broadcast' | 'user-management' | 'ou-management' | 'global-config'>('all');
  let searchQuery = $state('');
  let selectedSeverity = $state<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');

  // Mock admin logs data
  const mockLogs: AdminLog[] = [
    // Chat logs
    {
      id: '1',
      timestamp: new Date('2024-01-15T14:30:00'),
      user: 'admin@company.com',
      action: 'Group Chat Created',
      category: 'chat',
      target: 'Marketing Team Chat',
      details: 'Created new group chat for Marketing department with 15 members',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      severity: 'low',
      success: true
    },
    {
      id: '2',
      timestamp: new Date('2024-01-15T14:25:00'),
      user: 'manager@company.com',
      action: 'Message Deleted',
      category: 'chat',
      target: 'General Chat',
      details: 'Deleted inappropriate message from user john.doe@company.com',
      ipAddress: '192.168.1.105',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      severity: 'medium',
      success: true
    },
    // Broadcast logs
    {
      id: '3',
      timestamp: new Date('2024-01-15T14:20:00'),
      user: 'admin@company.com',
      action: 'Broadcast Sent',
      category: 'broadcast',
      target: 'All Employees',
      details: 'Emergency maintenance notice sent to all users',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      severity: 'high',
      success: true
    },
    {
      id: '4',
      timestamp: new Date('2024-01-15T14:15:00'),
      user: 'manager@company.com',
      action: 'Broadcast Approved',
      category: 'broadcast',
      target: 'Department Update',
      details: 'Approved broadcast message for HR department',
      ipAddress: '192.168.1.105',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      severity: 'low',
      success: true
    },
    // User Management logs
    {
      id: '5',
      timestamp: new Date('2024-01-15T14:10:00'),
      user: 'admin@company.com',
      action: 'User Created',
      category: 'user-management',
      target: 'john.doe@company.com',
      details: 'Created new user account with Supervisor role',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      severity: 'low',
      success: true
    },
    {
      id: '6',
      timestamp: new Date('2024-01-15T14:05:00'),
      user: 'admin@company.com',
      action: 'User Role Changed',
      category: 'user-management',
      target: 'jane.smith@company.com',
      details: 'Changed user role from Support to Supervisor',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      severity: 'medium',
      success: true
    },
    // OU Management logs
    {
      id: '7',
      timestamp: new Date('2024-01-15T14:00:00'),
      user: 'admin@company.com',
      action: 'OU Created',
      category: 'ou-management',
      target: 'Marketing West',
      details: 'Created new organizational unit for West Coast Marketing',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      severity: 'low',
      success: true
    },
    {
      id: '8',
      timestamp: new Date('2024-01-15T13:55:00'),
      user: 'admin@company.com',
      action: 'OU Rules Updated',
      category: 'ou-management',
      target: 'Sales Department',
      details: 'Updated chat permissions for frontline users',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      severity: 'medium',
      success: true
    },
    // Global Config logs
    {
      id: '9',
      timestamp: new Date('2024-01-15T13:50:00'),
      user: 'admin@company.com',
      action: 'Global Config Updated',
      category: 'global-config',
      details: 'Updated default chat retention policy to 365 days',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      severity: 'medium',
      success: true
    },
    {
      id: '10',
      timestamp: new Date('2024-01-15T13:45:00'),
      user: 'admin@company.com',
      action: 'Security Policy Updated',
      category: 'global-config',
      details: 'Updated password policy requirements',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      severity: 'high',
      success: true
    }
  ];

  // Computed values
  const filteredLogs = $derived(() => {
    let filtered = logs;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(log =>
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.target && log.target.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Tab filter
    if (activeTab !== 'all') {
      filtered = filtered.filter(log => log.category === activeTab);
    }

    // Severity filter
    if (selectedSeverity !== 'all') {
      filtered = filtered.filter(log => log.severity === selectedSeverity);
    }

    // Create a copy before sorting to avoid mutating the original array
    return [...filtered].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  });

  const tabCounts = $derived(() => {
    return {
      all: logs.length,
      chat: logs.filter(log => log.category === 'chat').length,
      broadcast: logs.filter(log => log.category === 'broadcast').length,
      'user-management': logs.filter(log => log.category === 'user-management').length,
      'ou-management': logs.filter(log => log.category === 'ou-management').length,
      'global-config': logs.filter(log => log.category === 'global-config').length,
    };
  });

  // Additional mock data for demonstration
  const additionalMockData = [
    {
      id: '100',
      timestamp: new Date('2024-01-15T13:30:00'),
      user: 'system',
      action: 'Daily Backup',
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
  let selectedLog = $state<AdminLog | null>(null);
  let showLogDetails = $state(false);
  
  // Filter logs based on search and filters (moved to derived above)

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

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'User', 'Action', 'Category', 'Target', 'Details', 'IP Address', 'Severity', 'Success'].join(','),
      ...filteredLogs().map(log => [
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
</script>

<svelte:head>
  <title>Admin Logs - Admin Controls</title>
</svelte:head>

<div class="h-screen bg-gray-50 flex flex-col">
	<div class="w-full max-w-[98%] mx-auto flex-1 flex flex-col p-6 min-h-0">
		<!-- Header -->
		<div class="mb-4">
			<h1 class="text-3xl font-bold text-gray-800 mb-2">Admin Logs</h1>
			<p class="text-gray-600">Monitor administrative activities and system events</p>
		</div>

		<!-- Main Panel -->
		<div class="bg-white rounded-xl shadow-sm border border-gray-200 mb-4 flex-shrink-0 flex-1 flex flex-col min-h-0">
			<!-- Controls Section -->
			<div class="p-4 border-b border-gray-200">
				<div class="flex flex-col lg:flex-row gap-3">
					<!-- Search -->
					<div class="flex-1 lg:flex-initial lg:min-w-[400px] lg:max-w-[500px]">
						<div class="relative">
							<Search class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
							<input
								bind:value={searchQuery}
								type="text"
								placeholder="Search logs by action, user, or details..."
								class="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent text-sm"
							/>
						</div>
					</div>

					<!-- Controls -->
					<div class="flex flex-col sm:flex-row gap-2 flex-1">
						<!-- Severity Filter -->
						<div class="w-full sm:w-48">
							<select
								bind:value={selectedSeverity}
								class="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent text-sm"
							>
								<option value="all">All Severities</option>
								<option value="low">Low</option>
								<option value="medium">Medium</option>
								<option value="high">High</option>
								<option value="critical">Critical</option>
							</select>
						</div>

						<!-- Export Button -->
						<button
							onclick={exportLogs}
							class="px-4 py-2.5 bg-[#01c0a4] text-white rounded-lg hover:bg-[#00a085] transition-colors font-medium text-sm flex items-center space-x-2 whitespace-nowrap"
						>
							<Download class="w-4 h-4" />
							<span>Export</span>
						</button>
					</div>
				</div>
			</div>

			<!-- Tabs -->
			<div class="border-b border-gray-200">
				<nav class="flex space-x-6 px-4">
					<button
						onclick={() => activeTab = 'all'}
						class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'all' ? 'border-[#01c0a4] text-[#01c0a4]' : 'border-transparent text-gray-500 hover:text-gray-700'}"
					>
						<div class="flex items-center space-x-2">
							<Activity class="w-4 h-4" />
							<span>All Logs</span>
							<span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{tabCounts().all}</span>
						</div>
					</button>

					<button
						onclick={() => activeTab = 'chat'}
						class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'chat' ? 'border-[#01c0a4] text-[#01c0a4]' : 'border-transparent text-gray-500 hover:text-gray-700'}"
					>
						<div class="flex items-center space-x-2">
							<MessageSquare class="w-4 h-4" />
							<span>Chat</span>
							<span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{tabCounts().chat}</span>
						</div>
					</button>

					<button
						onclick={() => activeTab = 'broadcast'}
						class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'broadcast' ? 'border-[#01c0a4] text-[#01c0a4]' : 'border-transparent text-gray-500 hover:text-gray-700'}"
					>
						<div class="flex items-center space-x-2">
							<Radio class="w-4 h-4" />
							<span>Broadcast</span>
							<span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{tabCounts().broadcast}</span>
						</div>
					</button>

					<button
						onclick={() => activeTab = 'user-management'}
						class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'user-management' ? 'border-[#01c0a4] text-[#01c0a4]' : 'border-transparent text-gray-500 hover:text-gray-700'}"
					>
						<div class="flex items-center space-x-2">
							<Users class="w-4 h-4" />
							<span>Users</span>
							<span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{tabCounts()['user-management']}</span>
						</div>
					</button>

					<button
						onclick={() => activeTab = 'ou-management'}
						class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'ou-management' ? 'border-[#01c0a4] text-[#01c0a4]' : 'border-transparent text-gray-500 hover:text-gray-700'}"
					>
						<div class="flex items-center space-x-2">
							<Building2 class="w-4 h-4" />
							<span>OU</span>
							<span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{tabCounts()['ou-management']}</span>
						</div>
					</button>

					<button
						onclick={() => activeTab = 'global-config'}
						class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'global-config' ? 'border-[#01c0a4] text-[#01c0a4]' : 'border-transparent text-gray-500 hover:text-gray-700'}"
					>
						<div class="flex items-center space-x-2">
							<Settings class="w-4 h-4" />
							<span>Config</span>
							<span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{tabCounts()['global-config']}</span>
						</div>
					</button>
				</nav>
			</div>

			<!-- Table Container -->
			<div class="flex-1 min-h-0 overflow-hidden flex flex-col">
				<div class="flex-1 overflow-auto">
					<table class="w-full">
						<thead class="bg-gray-50 sticky top-0">
							<tr>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
							</tr>
						</thead>
						<tbody class="bg-white divide-y divide-gray-200">
							{#each filteredLogs() as log (log.id)}
								<tr class="hover:bg-gray-50">
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
										{formatTimestamp(log.timestamp)}
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
										{log.user}
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										<div class="flex items-center">
											{#if log.category === 'chat'}
												<MessageSquare class="w-4 h-4 text-gray-400 mr-2" />
											{:else if log.category === 'broadcast'}
												<Radio class="w-4 h-4 text-gray-400 mr-2" />
											{:else if log.category === 'user-management'}
												<Users class="w-4 h-4 text-gray-400 mr-2" />
											{:else if log.category === 'ou-management'}
												<Building2 class="w-4 h-4 text-gray-400 mr-2" />
											{:else if log.category === 'global-config'}
												<Settings class="w-4 h-4 text-gray-400 mr-2" />
											{:else if log.category === 'security'}
												<Shield class="w-4 h-4 text-gray-400 mr-2" />
											{:else if log.category === 'system'}
												<Database class="w-4 h-4 text-gray-400 mr-2" />
											{:else}
												<Activity class="w-4 h-4 text-gray-400 mr-2" />
											{/if}
											<span class="text-sm text-gray-900">{log.action}</span>
										</div>
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
										{log.target || '-'}
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full border {getSeverityColor(log.severity)}">
											{log.severity}
										</span>
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {log.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
											{log.success ? 'Success' : 'Failed'}
										</span>
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
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

					<!-- Empty State -->
					{#if filteredLogs().length === 0}
						<div class="text-center py-12">
							<FileText class="mx-auto h-12 w-12 text-gray-400" />
							<h3 class="mt-2 text-sm font-medium text-gray-900">No logs found</h3>
							<p class="mt-1 text-sm text-gray-500">Try adjusting your search criteria or filters.</p>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>

<!-- Log Details Modal -->
{#if showLogDetails && selectedLog}
  <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" 
       role="dialog" 
       aria-modal="true"
       tabindex="-1"
       onclick={() => showLogDetails = false}
       onkeydown={(e) => e.key === 'Escape' && (showLogDetails = false)}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto" 
         onclick={(e) => e.stopPropagation()}
         onkeydown={(e) => e.stopPropagation()}>
      <div class="p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900">Log Details</h3>
          <button onclick={() => showLogDetails = false} 
                  class="text-gray-400 hover:text-gray-600"
                  aria-label="Close modal">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <div class="block text-sm font-medium text-gray-700">Timestamp</div>
              <p class="text-sm text-gray-900">{formatTimestamp(selectedLog.timestamp)}</p>
            </div>
            <div>
              <div class="block text-sm font-medium text-gray-700">User</div>
              <p class="text-sm text-gray-900">{selectedLog.user}</p>
            </div>
            <div>
              <div class="block text-sm font-medium text-gray-700">Action</div>
              <p class="text-sm text-gray-900">{selectedLog.action}</p>
            </div>
            <div>
              <div class="block text-sm font-medium text-gray-700">Category</div>
              <p class="text-sm text-gray-900 capitalize">{selectedLog.category}</p>
            </div>
            <div>
              <div class="block text-sm font-medium text-gray-700">Severity</div>
              <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {getSeverityColor(selectedLog.severity)}">
                {selectedLog.severity}
              </span>
            </div>
            <div>
              <div class="block text-sm font-medium text-gray-700">Status</div>
              <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {selectedLog.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                {selectedLog.success ? 'Success' : 'Failed'}
              </span>
            </div>
          </div>
          
          {#if selectedLog.target}
            <div>
              <div class="block text-sm font-medium text-gray-700">Target</div>
              <p class="text-sm text-gray-900">{selectedLog.target}</p>
            </div>
          {/if}
          
          <div>
            <div class="block text-sm font-medium text-gray-700">Details</div>
            <p class="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedLog.details}</p>
          </div>
          
          <div class="grid grid-cols-1 gap-4">
            <div>
              <div class="block text-sm font-medium text-gray-700">IP Address</div>
              <p class="text-sm text-gray-900 font-mono">{selectedLog.ipAddress}</p>
            </div>
            <div>
              <div class="block text-sm font-medium text-gray-700">User Agent</div>
              <p class="text-sm text-gray-900 break-all">{selectedLog.userAgent}</p>
            </div>
          </div>
        </div>
        
        <div class="mt-6 flex justify-end">
          <button 
            onclick={() => showLogDetails = false}
            class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}