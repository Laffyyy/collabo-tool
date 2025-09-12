<script lang="ts">
  import { FileText, Search, Filter, Download, Eye, AlertTriangle, User, Activity, Shield, Database, Calendar, MessageSquare, Radio, Users, Building2, Settings } from 'lucide-svelte';
  import { themeStore } from '$lib/stores/theme.svelte';

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
    priority?: 'low' | 'medium' | 'high'; // For broadcast logs
  }

  let activeTab = $state<'all' | 'chat' | 'broadcast' | 'user-management' | 'ou-management' | 'global-config'>('all');
  let searchQuery = $state('');
  
  // Theme reactive variable
  const isDarkMode = $derived(themeStore.isDarkMode);

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
      success: true,
      priority: 'high'
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
      success: true,
      priority: 'medium'
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
      case 'user': return isDarkMode ? 'text-blue-300 bg-blue-900' : 'text-blue-600 bg-blue-50';
      case 'security': return isDarkMode ? 'text-red-300 bg-red-900' : 'text-red-600 bg-red-50';
      case 'system': return isDarkMode ? 'text-green-300 bg-green-900' : 'text-green-600 bg-green-50';
      case 'data': return isDarkMode ? 'text-purple-300 bg-purple-900' : 'text-purple-600 bg-purple-50';
      case 'configuration': return isDarkMode ? 'text-indigo-300 bg-indigo-900' : 'text-indigo-600 bg-indigo-50';
      default: return isDarkMode ? 'text-gray-300 bg-gray-700' : 'text-gray-600 bg-gray-50';
    }
  };

  const getPriorityColor = (priority: string | undefined) => {
    if (!priority) return isDarkMode ? 'text-gray-300 bg-gray-700' : 'text-gray-600 bg-gray-50';
    switch (priority) {
      case 'high': return isDarkMode ? 'text-red-300 bg-red-900' : 'text-red-600 bg-red-50';
      case 'medium': return isDarkMode ? 'text-yellow-300 bg-yellow-900' : 'text-yellow-600 bg-yellow-50';
      case 'low': return isDarkMode ? 'text-green-300 bg-green-900' : 'text-green-600 bg-green-50';
      default: return isDarkMode ? 'text-gray-300 bg-gray-700' : 'text-gray-600 bg-gray-50';
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

<div class="{isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} h-screen flex flex-col transition-colors duration-300">
	<div class="w-full max-w-[98%] mx-auto flex-1 flex flex-col p-6 min-h-0">
		<!-- Header -->
		<div class="mb-4 fade-in">
			<h1 class="{isDarkMode ? 'text-white' : 'text-gray-800'} text-3xl font-bold mb-2 transition-colors duration-300">Admin Logs</h1>
			<p class="{isDarkMode ? 'text-gray-400' : 'text-gray-600'} transition-colors duration-300">Monitor administrative activities and system events</p>
		</div>

		<!-- Main Panel -->
		<div class="{isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'} rounded-xl shadow-sm border mb-4 flex-shrink-0 flex-1 flex flex-col min-h-0 fade-in transition-colors duration-300">
			<!-- Controls Section -->
			<div class="{isDarkMode ? 'border-gray-600' : 'border-gray-200'} p-4 border-b transition-colors duration-300">
				<div class="flex flex-col lg:flex-row gap-3">
					<!-- Search -->
					<div class="flex-1 lg:flex-initial lg:min-w-[400px] lg:max-w-[500px]">
						<div class="relative">
							<Search class="{isDarkMode ? 'text-gray-500' : 'text-gray-400'} absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 transition-colors duration-300" />
							<input
								bind:value={searchQuery}
								type="text"
								placeholder="Search logs by action, user, or details..."
								class="{isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500'} w-full pl-9 pr-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent text-sm transition-colors duration-300"
							/>
						</div>
					</div>

					<!-- Controls -->
					<div class="flex flex-col sm:flex-row gap-2 flex-1">
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
			<div class="{isDarkMode ? 'border-gray-600' : 'border-gray-200'} border-b transition-colors duration-300">
				<nav class="flex space-x-6 px-4">
					<button
						onclick={() => activeTab = 'all'}
						class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'all' ? 'border-[#01c0a4] text-[#01c0a4]' : isDarkMode ? 'border-transparent text-gray-400 hover:text-gray-300' : 'border-transparent text-gray-500 hover:text-gray-700'}"
					>
						<div class="flex items-center space-x-2">
							<Activity class="w-4 h-4" />
							<span>All Logs</span>
							<span class="{isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'} px-2 py-0.5 rounded-full text-xs transition-colors duration-300">{tabCounts().all}</span>
						</div>
					</button>

					<button
						onclick={() => activeTab = 'chat'}
						class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'chat' ? 'border-[#01c0a4] text-[#01c0a4]' : isDarkMode ? 'border-transparent text-gray-400 hover:text-gray-300' : 'border-transparent text-gray-500 hover:text-gray-700'}"
					>
						<div class="flex items-center space-x-2">
							<MessageSquare class="w-4 h-4" />
							<span>Chat</span>
							<span class="{isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'} px-2 py-0.5 rounded-full text-xs transition-colors duration-300">{tabCounts().chat}</span>
						</div>
					</button>

					<button
						onclick={() => activeTab = 'broadcast'}
						class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'broadcast' ? 'border-[#01c0a4] text-[#01c0a4]' : isDarkMode ? 'border-transparent text-gray-400 hover:text-gray-300' : 'border-transparent text-gray-500 hover:text-gray-700'}"
					>
						<div class="flex items-center space-x-2">
							<Radio class="w-4 h-4" />
							<span>Broadcast</span>
							<span class="{isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'} transition-colors duration-300 px-2 py-0.5 rounded-full text-xs">{tabCounts().broadcast}</span>
						</div>
					</button>

					<button
						onclick={() => activeTab = 'user-management'}
						class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'user-management' ? 'border-[#01c0a4] text-[#01c0a4]' : isDarkMode ? 'border-transparent text-gray-400 hover:text-gray-300' : 'border-transparent text-gray-500 hover:text-gray-700'}"
					>
						<div class="flex items-center space-x-2">
							<Users class="w-4 h-4" />
							<span>Users</span>
							<span class="{isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'} transition-colors duration-300 px-2 py-0.5 rounded-full text-xs">{tabCounts()['user-management']}</span>
						</div>
					</button>

					<button
						onclick={() => activeTab = 'ou-management'}
						class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'ou-management' ? 'border-[#01c0a4] text-[#01c0a4]' : isDarkMode ? 'border-transparent text-gray-400 hover:text-gray-300' : 'border-transparent text-gray-500 hover:text-gray-700'}"
					>
						<div class="flex items-center space-x-2">
							<Building2 class="w-4 h-4" />
							<span>OU</span>
							<span class="{isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'} transition-colors duration-300 px-2 py-0.5 rounded-full text-xs">{tabCounts()['ou-management']}</span>
						</div>
					</button>

					<button
						onclick={() => activeTab = 'global-config'}
						class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'global-config' ? 'border-[#01c0a4] text-[#01c0a4]' : isDarkMode ? 'border-transparent text-gray-400 hover:text-gray-300' : 'border-transparent text-gray-500 hover:text-gray-700'}"
					>
						<div class="flex items-center space-x-2">
							<Settings class="w-4 h-4" />
							<span>Config</span>
							<span class="{isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'} transition-colors duration-300 px-2 py-0.5 rounded-full text-xs">{tabCounts()['global-config']}</span>
						</div>
					</button>
				</nav>
			</div>

			<!-- Table Container -->
			<div class="flex-1 min-h-0 overflow-hidden flex flex-col">
				<div class="flex-1 overflow-auto">
					<table class="w-full">
						<thead class="{isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} sticky top-0 transition-colors duration-300">
							<tr>
								<th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Timestamp</th>
								<th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">User</th>
								<th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Action</th>
								<th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Target</th>
								{#if activeTab === 'broadcast'}
									<th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Priority</th>
								{/if}
								<th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Actions</th>
							</tr>
						</thead>
						<tbody class="{isDarkMode ? 'bg-gray-800 divide-gray-600' : 'bg-white divide-gray-200'} divide-y transition-colors duration-300">
							{#each filteredLogs() as log (log.id)}
								<tr class="{isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} transition-colors duration-300">
									<td class="{isDarkMode ? 'text-gray-200' : 'text-gray-900'} px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300">
										{formatTimestamp(log.timestamp)}
									</td>
									<td class="{isDarkMode ? 'text-gray-200' : 'text-gray-900'} px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300">
										{log.user}
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										<div class="flex items-center">
											{#if log.category === 'chat'}
												<MessageSquare class="{isDarkMode ? 'text-gray-500' : 'text-gray-400'} w-4 h-4 mr-2 transition-colors duration-300" />
											{:else if log.category === 'broadcast'}
												<Radio class="{isDarkMode ? 'text-gray-500' : 'text-gray-400'} w-4 h-4 mr-2 transition-colors duration-300" />
											{:else if log.category === 'user-management'}
												<Users class="{isDarkMode ? 'text-gray-500' : 'text-gray-400'} w-4 h-4 mr-2 transition-colors duration-300" />
											{:else if log.category === 'ou-management'}
												<Building2 class="{isDarkMode ? 'text-gray-500' : 'text-gray-400'} w-4 h-4 mr-2 transition-colors duration-300" />
											{:else if log.category === 'global-config'}
												<Settings class="{isDarkMode ? 'text-gray-500' : 'text-gray-400'} w-4 h-4 mr-2 transition-colors duration-300" />
											{:else if log.category === 'security'}
												<Shield class="{isDarkMode ? 'text-gray-500' : 'text-gray-400'} w-4 h-4 mr-2 transition-colors duration-300" />
											{:else if log.category === 'system'}
												<Database class="{isDarkMode ? 'text-gray-500' : 'text-gray-400'} w-4 h-4 mr-2 transition-colors duration-300" />
											{:else}
												<Activity class="{isDarkMode ? 'text-gray-500' : 'text-gray-400'} w-4 h-4 mr-2 transition-colors duration-300" />
											{/if}
											<span class="{isDarkMode ? 'text-gray-200' : 'text-gray-900'} text-sm transition-colors duration-300">{log.action}</span>
										</div>
									</td>
									<td class="{isDarkMode ? 'text-gray-400' : 'text-gray-500'} px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300">
										{log.target || '-'}
									</td>
									{#if activeTab === 'broadcast'}
										<td class="px-6 py-4 whitespace-nowrap">
											{#if log.priority}
												<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {getPriorityColor(log.priority)}">
													{log.priority}
												</span>
											{:else}
												<span class="{isDarkMode ? 'text-gray-500' : 'text-gray-400'} text-sm transition-colors duration-300">-</span>
											{/if}
										</td>
									{/if}
									<td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
										<button
											onclick={() => viewLogDetails(log)}
											class="text-[#01c0a4] hover:text-[#00a08a] flex items-center space-x-1 transition-colors duration-300"
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
							<FileText class="{isDarkMode ? 'text-gray-500' : 'text-gray-400'} mx-auto h-12 w-12 transition-colors duration-300" />
							<h3 class="{isDarkMode ? 'text-white' : 'text-gray-900'} mt-2 text-sm font-medium transition-colors duration-300">No logs found</h3>
							<p class="{isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1 text-sm transition-colors duration-300">Try adjusting your search criteria or filters.</p>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>

<!-- Log Details Modal -->
{#if showLogDetails && selectedLog}
  <div class="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50" 
       role="dialog" 
       aria-modal="true"
       tabindex="-1"
       onclick={() => showLogDetails = false}
       onkeydown={(e) => e.key === 'Escape' && (showLogDetails = false)}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="{isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto transition-colors duration-300" 
         onclick={(e) => e.stopPropagation()}
         onkeydown={(e) => e.stopPropagation()}>
      <div class="p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="{isDarkMode ? 'text-white' : 'text-gray-900'} text-lg font-semibold transition-colors duration-300">Log Details</h3>
          <button onclick={() => showLogDetails = false} 
                  class="{isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'} transition-colors duration-300"
                  aria-label="Close modal">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <div class="{isDarkMode ? 'text-gray-300' : 'text-gray-700'} block text-sm font-medium transition-colors duration-300">Timestamp</div>
              <p class="{isDarkMode ? 'text-gray-200' : 'text-gray-900'} text-sm transition-colors duration-300">{formatTimestamp(selectedLog.timestamp)}</p>
            </div>
            <div>
              <div class="{isDarkMode ? 'text-gray-300' : 'text-gray-700'} block text-sm font-medium transition-colors duration-300">User</div>
              <p class="{isDarkMode ? 'text-gray-200' : 'text-gray-900'} text-sm transition-colors duration-300">{selectedLog.user}</p>
            </div>
            <div>
              <div class="{isDarkMode ? 'text-gray-300' : 'text-gray-700'} block text-sm font-medium transition-colors duration-300">Action</div>
              <p class="{isDarkMode ? 'text-gray-200' : 'text-gray-900'} text-sm transition-colors duration-300">{selectedLog.action}</p>
            </div>
            <div>
              <div class="{isDarkMode ? 'text-gray-300' : 'text-gray-700'} block text-sm font-medium transition-colors duration-300">Category</div>
              <p class="{isDarkMode ? 'text-gray-200' : 'text-gray-900'} text-sm capitalize transition-colors duration-300">{selectedLog.category}</p>
            </div>
            <div>
              <div class="{isDarkMode ? 'text-gray-300' : 'text-gray-700'} block text-sm font-medium transition-colors duration-300">Status</div>
              <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {selectedLog.success ? isDarkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800' : isDarkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-800'} transition-colors duration-300">
                {selectedLog.success ? 'Success' : 'Failed'}
              </span>
            </div>
          </div>
          
          {#if selectedLog.target}
            <div>
              <div class="{isDarkMode ? 'text-gray-300' : 'text-gray-700'} block text-sm font-medium transition-colors duration-300">Target</div>
              <p class="{isDarkMode ? 'text-gray-200' : 'text-gray-900'} text-sm transition-colors duration-300">{selectedLog.target}</p>
            </div>
          {/if}
          
          <div>
            <div class="{isDarkMode ? 'text-gray-300' : 'text-gray-700'} block text-sm font-medium transition-colors duration-300">Details</div>
            <p class="{isDarkMode ? 'text-gray-200 bg-gray-700' : 'text-gray-900 bg-gray-50'} text-sm p-3 rounded-lg transition-colors duration-300">{selectedLog.details}</p>
          </div>
          
          <div class="grid grid-cols-1 gap-4">
            <div>
              <div class="{isDarkMode ? 'text-gray-300' : 'text-gray-700'} block text-sm font-medium transition-colors duration-300">IP Address</div>
              <p class="{isDarkMode ? 'text-gray-200' : 'text-gray-900'} text-sm font-mono transition-colors duration-300">{selectedLog.ipAddress}</p>
            </div>
            <div>
              <div class="{isDarkMode ? 'text-gray-300' : 'text-gray-700'} block text-sm font-medium transition-colors duration-300">User Agent</div>
              <p class="{isDarkMode ? 'text-gray-200' : 'text-gray-900'} text-sm break-all transition-colors duration-300">{selectedLog.userAgent}</p>
            </div>
          </div>
        </div>
        
        <div class="mt-6 flex justify-end">
          <button 
            onclick={() => showLogDetails = false}
            class="{isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} px-4 py-2 rounded-lg transition-colors duration-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
