<script lang="ts">
  import { FileText, Search, Filter, Download, Eye, AlertTriangle, User, Activity, Shield, Database, Calendar, MessageSquare, Radio, Users, Building2, Settings } from 'lucide-svelte';
  import { AuditLogAPI, type AuditLog, type AuditLogsData } from '$lib/api/auditlog';
  import { onMount } from 'svelte';

  let activeTab = $state<'all' | 'chat' | 'broadcast' | 'user-management' | 'ou-management' | 'global-config'>('all');
  let searchQuery = $state('');
  let currentPage = $state(1);
  let pageLimit = $state(50);
  
  // Data state
  let logsData = $state<AuditLogsData | null>(null);
  let loading = $state(false);
  let error = $state<string | null>(null);
  let selectedLog = $state<AuditLog | null>(null);
  let showLogDetails = $state(false);

  // Load audit logs from API
  const loadLogs = async () => {
    loading = true;
    error = null;
    
    try {
      const params = {
        page: currentPage,
        limit: pageLimit,
        category: activeTab === 'all' ? undefined : activeTab,
        search: searchQuery.trim() || undefined
      };
      
      logsData = await AuditLogAPI.getLogs(params);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load audit logs';
      console.error('Error loading logs:', err);
    } finally {
      loading = false;
    }
  };

  // Reactive loading when filters change
  $effect(() => {
    // Reset to first page when filters change
    if (activeTab || searchQuery) {
      currentPage = 1;
    }
    loadLogs();
  });

  // Load logs on component mount
  onMount(() => {
    loadLogs();
  });

  // Computed values
  const logs = $derived(logsData?.logs || []);
  const tabCounts = $derived(logsData?.categoryCounts || {
    all: 0,
    chat: 0,
    broadcast: 0,
    'user-management': 0,
    'ou-management': 0,
    'global-config': 0
  });
  const pagination = $derived(logsData?.pagination);

  // Handle search with debouncing
  let searchTimeout: number;
  const handleSearch = (event: Event) => {
    const target = event.target as HTMLInputElement;
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      searchQuery = target.value;
    }, 300);
  };

  // Handle tab change
  const handleTabChange = (tab: typeof activeTab) => {
    activeTab = tab;
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    currentPage = page;
    loadLogs();
  };

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
      case 'chat': return MessageSquare;
      case 'broadcast': return Radio;
      case 'user-management': return Users;
      case 'ou-management': return Building2;
      case 'global-config': return Settings;
      case 'security': return Shield;
      case 'system': return Activity;
      default: return Activity;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'chat': return 'text-blue-600 bg-blue-50';
      case 'broadcast': return 'text-purple-600 bg-purple-50';
      case 'user-management': return 'text-green-600 bg-green-50';
      case 'ou-management': return 'text-orange-600 bg-orange-50';
      case 'global-config': return 'text-gray-600 bg-gray-50';
      case 'security': return 'text-red-600 bg-red-50';
      case 'system': return 'text-indigo-600 bg-indigo-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getPriorityColor = (priority: string | undefined) => {
    if (!priority) return 'text-gray-600 bg-gray-50';
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const exportLogs = async () => {
    try {
      loading = true;
      const params = {
        format: 'csv' as const,
        category: activeTab === 'all' ? undefined : activeTab,
        search: searchQuery.trim() || undefined
      };
      
      const blob = await AuditLogAPI.exportLogs(params);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to export logs';
      console.error('Error exporting logs:', err);
    } finally {
      loading = false;
    }
  };

  const viewLogDetails = async (log: AuditLog) => {
    try {
      // Fetch full log details if needed
      const fullLog = await AuditLogAPI.getLogById(log.id);
      selectedLog = fullLog;
      showLogDetails = true;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load log details';
      console.error('Error loading log details:', err);
    }
  };
</script>

<svelte:head>
  <title>Admin Logs - Admin Controls</title>
</svelte:head>

<div class="h-screen bg-gray-50 flex flex-col">
	<div class="w-full max-w-[98%] mx-auto flex-1 flex flex-col p-6 min-h-0">
		<!-- Header -->
		<div class="mb-4 fade-in">
			<h1 class="text-3xl font-bold text-gray-800 mb-2">Admin Logs</h1>
			<p class="text-gray-600">Monitor administrative activities and system events</p>
		</div>

		<!-- Main Panel -->
		<div class="bg-white rounded-xl shadow-sm border border-gray-200 mb-4 flex-shrink-0 flex-1 flex flex-col min-h-0 fade-in">
			<!-- Controls Section -->
			<div class="p-4 border-b border-gray-200">
				<div class="flex flex-col lg:flex-row gap-3">
					<!-- Search -->
					<div class="flex-1 lg:flex-initial lg:min-w-[400px] lg:max-w-[500px]">
						<div class="relative">
							<Search class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
							<input
								oninput={handleSearch}
								type="text"
								placeholder="Search logs by action, user, or details..."
								class="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent text-sm"
								disabled={loading}
							/>
						</div>
					</div>

					<!-- Controls -->
					<div class="flex flex-col sm:flex-row gap-2 flex-1">
						<!-- Export Button -->
						<button
							onclick={exportLogs}
							disabled={loading}
							class="px-4 py-2.5 bg-[#01c0a4] text-white rounded-lg hover:bg-[#00a085] transition-colors font-medium text-sm flex items-center space-x-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<Download class="w-4 h-4" />
							<span>{loading ? 'Exporting...' : 'Export'}</span>
						</button>
					</div>
				</div>
			</div>

			<!-- Tabs -->
			<div class="border-b border-gray-200">
				<nav class="flex space-x-6 px-4">
					<button
						onclick={() => handleTabChange('all')}
						class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'all' ? 'border-[#01c0a4] text-[#01c0a4]' : 'border-transparent text-gray-500 hover:text-gray-700'}"
					>
						<div class="flex items-center space-x-2">
							<Activity class="w-4 h-4" />
							<span>All Logs</span>
							<span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{tabCounts.all}</span>
						</div>
					</button>

					<button
						onclick={() => handleTabChange('chat')}
						class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'chat' ? 'border-[#01c0a4] text-[#01c0a4]' : 'border-transparent text-gray-500 hover:text-gray-700'}"
					>
						<div class="flex items-center space-x-2">
							<MessageSquare class="w-4 h-4" />
							<span>Chat</span>
							<span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{tabCounts.chat}</span>
						</div>
					</button>

					<button
						onclick={() => handleTabChange('broadcast')}
						class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'broadcast' ? 'border-[#01c0a4] text-[#01c0a4]' : 'border-transparent text-gray-500 hover:text-gray-700'}"
					>
						<div class="flex items-center space-x-2">
							<Radio class="w-4 h-4" />
							<span>Broadcast</span>
							<span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{tabCounts.broadcast}</span>
						</div>
					</button>

					<button
						onclick={() => handleTabChange('user-management')}
						class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'user-management' ? 'border-[#01c0a4] text-[#01c0a4]' : 'border-transparent text-gray-500 hover:text-gray-700'}"
					>
						<div class="flex items-center space-x-2">
							<Users class="w-4 h-4" />
							<span>Users</span>
							<span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{tabCounts['user-management']}</span>
						</div>
					</button>

					<button
						onclick={() => handleTabChange('ou-management')}
						class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'ou-management' ? 'border-[#01c0a4] text-[#01c0a4]' : 'border-transparent text-gray-500 hover:text-gray-700'}"
					>
						<div class="flex items-center space-x-2">
							<Building2 class="w-4 h-4" />
							<span>OU</span>
							<span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{tabCounts['ou-management']}</span>
						</div>
					</button>

					<button
						onclick={() => handleTabChange('global-config')}
						class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'global-config' ? 'border-[#01c0a4] text-[#01c0a4]' : 'border-transparent text-gray-500 hover:text-gray-700'}"
					>
						<div class="flex items-center space-x-2">
							<Settings class="w-4 h-4" />
							<span>Config</span>
							<span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{tabCounts['global-config']}</span>
						</div>
					</button>
				</nav>
			</div>

			<!-- Error State -->
			{#if error}
				<div class="p-4 bg-red-50 border-l-4 border-red-400">
					<div class="flex">
						<AlertTriangle class="w-5 h-5 text-red-400" />
						<div class="ml-3">
							<p class="text-sm text-red-700">{error}</p>
							<button
								onclick={loadLogs}
								class="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
							>
								Try again
							</button>
						</div>
					</div>
				</div>
			{/if}

			<!-- Loading State -->
			{#if loading}
				<div class="flex-1 flex items-center justify-center p-8">
					<div class="flex items-center space-x-2">
						<div class="animate-spin rounded-full h-6 w-6 border-b-2 border-[#01c0a4]"></div>
						<span class="text-gray-600">Loading audit logs...</span>
					</div>
				</div>
			{:else}
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
									{#if activeTab === 'broadcast'}
										<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
									{/if}
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
							</tr>
						</thead>
						<tbody class="bg-white divide-y divide-gray-200">
							{#each logs as log (log.id)}
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
									{#if activeTab === 'broadcast'}
										<td class="px-6 py-4 whitespace-nowrap">
											{#if log.priority}
												<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {getPriorityColor(log.priority)}">
													{log.priority}
												</span>
											{:else}
												<span class="text-sm text-gray-400">-</span>
											{/if}
										</td>
									{/if}
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
					{#if logs.length === 0}
						<div class="text-center py-12">
							<FileText class="mx-auto h-12 w-12 text-gray-400" />
							<h3 class="mt-2 text-sm font-medium text-gray-900">No logs found</h3>
							<p class="mt-1 text-sm text-gray-500">Try adjusting your search criteria or filters.</p>
						</div>
					{/if}
				</div>

				<!-- Pagination -->
				{#if pagination && pagination.totalPages > 1}
					<div class="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
						<div class="flex-1 flex justify-between sm:hidden">
							<button
								onclick={() => handlePageChange(currentPage - 1)}
								disabled={!pagination.hasPrevPage}
								class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Previous
							</button>
							<button
								onclick={() => handlePageChange(currentPage + 1)}
								disabled={!pagination.hasNextPage}
								class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Next
							</button>
						</div>
						<div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
							<div>
								<p class="text-sm text-gray-700">
									Showing
									<span class="font-medium">{(currentPage - 1) * pageLimit + 1}</span>
									to
									<span class="font-medium">{Math.min(currentPage * pageLimit, pagination.totalCount)}</span>
									of
									<span class="font-medium">{pagination.totalCount}</span>
									results
								</p>
							</div>
							<div>
								<nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
									<button
										onclick={() => handlePageChange(currentPage - 1)}
										disabled={!pagination.hasPrevPage}
										class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										<span class="sr-only">Previous</span>
										<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
											<path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
										</svg>
									</button>
									
									{#each Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
										const start = Math.max(1, currentPage - 2);
										return start + i;
									}) as page}
										{#if page <= pagination.totalPages}
											<button
												onclick={() => handlePageChange(page)}
												class="relative inline-flex items-center px-4 py-2 border text-sm font-medium {page === currentPage ? 'z-10 bg-[#01c0a4] border-[#01c0a4] text-white' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}"
											>
												{page}
											</button>
										{/if}
									{/each}
									
									<button
										onclick={() => handlePageChange(currentPage + 1)}
										disabled={!pagination.hasNextPage}
										class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										<span class="sr-only">Next</span>
										<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
											<path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
										</svg>
									</button>
								</nav>
							</div>
						</div>
					</div>
				{/if}
			</div>
		{/if}
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