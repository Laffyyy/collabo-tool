<script lang="ts">
  import { Radio, Search, Eye, Trash2, Clock, Users, BarChart3, Calendar, Send, CheckCircle, Archive, TrendingUp, AlertTriangle, Ban, Flag } from 'lucide-svelte';

  interface Broadcast {
    id: string;
    title: string;
    content: string;
    priority: 'low' | 'medium' | 'high';
    targetRoles: string[];
    targetOUs: string[];
    createdBy: string;
    createdAt: Date;
    scheduledFor?: Date;
    sentAt?: Date;
    status: 'draft' | 'scheduled' | 'sent' | 'archived' | 'deleted';
    acknowledgmentRequired: boolean;
    acknowledgmentCount: number;
    totalRecipients: number;
    eventDate?: Date;
    isReported?: boolean;
    reportReason?: string;
    reportedBy?: string;
    reportedAt?: Date;
  }

  let activeTab = $state<'sent' | 'scheduled' | 'drafts' | 'archived' | 'deleted' | 'reported' | 'analytics'>('sent');
  let searchQuery = $state('');
  let selectedPriority = $state<'all' | 'low' | 'medium' | 'high'>('all');
  let selectedStatus = $state<'all' | 'draft' | 'scheduled' | 'sent' | 'archived' | 'deleted'>('all');
  let selectedBroadcast = $state<Broadcast | null>(null);
  let showBroadcastDetails = $state(false);

  // Mock broadcast data
  const mockBroadcasts: Broadcast[] = [
    {
      id: '1',
      title: 'Emergency Maintenance Notice',
      content: 'System maintenance will be performed tonight from 11 PM to 3 AM. Please save your work.',
      priority: 'high',
      targetRoles: ['all'],
      targetOUs: ['all'],
      createdBy: 'admin@company.com',
      createdAt: new Date('2024-01-15T14:30:00'),
      sentAt: new Date('2024-01-15T14:35:00'),
      status: 'sent',
      acknowledgmentRequired: true,
      acknowledgmentCount: 145,
      totalRecipients: 200,
    },
    {
      id: '2',
      title: 'Q1 Team Meeting',
      content: 'All hands meeting scheduled for next Friday at 2 PM in the main conference room.',
      priority: 'medium',
      targetRoles: ['manager', 'supervisor'],
      targetOUs: ['Engineering', 'Sales'],
      createdBy: 'manager@company.com',
      createdAt: new Date('2024-01-15T10:00:00'),
      scheduledFor: new Date('2024-01-20T14:00:00'),
      status: 'scheduled',
      acknowledgmentRequired: true,
      acknowledgmentCount: 0,
      totalRecipients: 45,
      eventDate: new Date('2024-01-26T14:00:00'),
    },
    {
      id: '3',
      title: 'New HR Policy Update',
      content: 'Please review the updated HR policies in the employee handbook.',
      priority: 'low',
      targetRoles: ['all'],
      targetOUs: ['all'],
      createdBy: 'hr@company.com',
      createdAt: new Date('2024-01-14T09:00:00'),
      status: 'draft',
      acknowledgmentRequired: false,
      acknowledgmentCount: 0,
      totalRecipients: 0,
    },
    {
      id: '4',
      title: 'Inappropriate Content Broadcast',
      content: 'This broadcast contains inappropriate content that violates company policy.',
      priority: 'medium',
      targetRoles: ['all'],
      targetOUs: ['all'],
      createdBy: 'user@company.com',
      createdAt: new Date('2024-01-10T16:00:00'),
      sentAt: new Date('2024-01-10T16:05:00'),
      status: 'sent',
      acknowledgmentRequired: false,
      acknowledgmentCount: 15,
      totalRecipients: 200,
      isReported: true,
      reportReason: 'Inappropriate content',
      reportedBy: 'supervisor@company.com',
      reportedAt: new Date('2024-01-10T17:00:00'),
    },
    {
      id: '5',
      title: 'Old Company Announcement',
      content: 'This is an old announcement that has been archived.',
      priority: 'low',
      targetRoles: ['all'],
      targetOUs: ['all'],
      createdBy: 'admin@company.com',
      createdAt: new Date('2023-12-01T12:00:00'),
      sentAt: new Date('2023-12-01T12:05:00'),
      status: 'archived',
      acknowledgmentRequired: false,
      acknowledgmentCount: 180,
      totalRecipients: 200,
    },
    {
      id: '6',
      title: 'Deleted Broadcast',
      content: 'This broadcast was deleted by admin.',
      priority: 'medium',
      targetRoles: ['frontline'],
      targetOUs: ['Support'],
      createdBy: 'support@company.com',
      createdAt: new Date('2024-01-12T11:00:00'),
      status: 'deleted',
      acknowledgmentRequired: false,
      acknowledgmentCount: 0,
      totalRecipients: 25,
    }
  ];

  // Computed values
  const filteredBroadcasts = $derived(() => {
    return mockBroadcasts.filter(broadcast => {
      const matchesTab = activeTab === 'analytics' || broadcast.status === activeTab || 
        (activeTab === 'sent' && broadcast.status === 'sent') ||
        (activeTab === 'scheduled' && broadcast.status === 'scheduled') ||
        (activeTab === 'drafts' && broadcast.status === 'draft') ||
        (activeTab === 'archived' && broadcast.status === 'archived') ||
        (activeTab === 'deleted' && broadcast.status === 'deleted') ||
        (activeTab === 'reported' && broadcast.isReported === true);
      
      const matchesSearch = searchQuery === '' || 
        broadcast.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        broadcast.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        broadcast.createdBy.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesPriority = selectedPriority === 'all' || broadcast.priority === selectedPriority;
      const matchesStatus = selectedStatus === 'all' || broadcast.status === selectedStatus;
      
      return matchesTab && matchesSearch && matchesPriority && matchesStatus;
    });
  });

  const tabCounts = $derived(() => {
    return {
      sent: mockBroadcasts.filter(b => b.status === 'sent').length,
      scheduled: mockBroadcasts.filter(b => b.status === 'scheduled').length,
      drafts: mockBroadcasts.filter(b => b.status === 'draft').length,
      archived: mockBroadcasts.filter(b => b.status === 'archived').length,
      deleted: mockBroadcasts.filter(b => b.status === 'deleted').length,
      reported: mockBroadcasts.filter(b => b.isReported === true).length,
      analytics: mockBroadcasts.length
    };
  });

  const analytics = $derived(() => {
    const sent = mockBroadcasts.filter(b => b.status === 'sent');
    const totalSent = sent.length;
    const totalRecipients = sent.reduce((sum, b) => sum + b.totalRecipients, 0);
    const totalAcknowledgments = sent.reduce((sum, b) => sum + b.acknowledgmentCount, 0);
    const averageAckRate = totalRecipients > 0 ? (totalAcknowledgments / totalRecipients * 100) : 0;
    
    return {
      totalSent,
      totalRecipients,
      totalAcknowledgments,
      averageAckRate: Math.round(averageAckRate),
      highPriority: sent.filter(b => b.priority === 'high').length,
    };
  });

  const formatTimestamp = (date: Date) => {
    return date.toLocaleString();
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-green-100 text-green-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'archived': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAcknowledgmentRate = (broadcast: Broadcast) => {
    if (!broadcast.acknowledgmentRequired || broadcast.totalRecipients === 0) return 'N/A';
    return `${Math.round((broadcast.acknowledgmentCount / broadcast.totalRecipients) * 100)}%`;
  };

  const viewBroadcast = (broadcast: Broadcast) => {
    alert(`Broadcast Details:\n\nTitle: ${broadcast.title}\nContent: ${broadcast.content}\nCreated By: ${broadcast.createdBy}\nRecipients: ${broadcast.totalRecipients}`);
  };

  const duplicateBroadcast = (broadcast: Broadcast) => {
    alert(`Creating duplicate of "${broadcast.title}"`);
  };

  const archiveBroadcast = (broadcast: Broadcast) => {
    if (confirm(`Archive broadcast "${broadcast.title}"?`)) {
      alert('Broadcast archived successfully');
    }
  };

  const deleteBroadcast = (broadcast: Broadcast) => {
    if (confirm(`Delete broadcast "${broadcast.title}"? This action cannot be undone.`)) {
      alert('Broadcast deleted successfully');
    }
  };

  const restoreBroadcast = (broadcast: Broadcast) => {
    if (confirm(`Restore broadcast "${broadcast.title}"?`)) {
      alert('Broadcast restored successfully');
    }
  };

  const permanentlyDeleteBroadcast = (broadcast: Broadcast) => {
    if (confirm(`Permanently delete broadcast "${broadcast.title}"? This action cannot be undone.`)) {
      alert('Broadcast permanently deleted');
    }
  };

  const dismissReport = (broadcast: Broadcast) => {
    if (confirm(`Dismiss report for "${broadcast.title}"?`)) {
      alert('Report dismissed');
    }
  };

  const takeActionOnReport = (broadcast: Broadcast) => {
    if (confirm(`Take action on reported broadcast "${broadcast.title}"? This will delete the broadcast.`)) {
      alert('Action taken - broadcast removed');
    }
  };

  const viewBroadcastDetails = (broadcast: Broadcast) => {
    selectedBroadcast = broadcast;
    showBroadcastDetails = true;
  };

  const exportAnalytics = () => {
    alert('Exporting analytics data...');
  };
</script>

<svelte:head>
  <title>Broadcast Management - Admin Controls</title>
</svelte:head>

<div class="p-6 bg-gray-50 min-h-screen space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between fade-in">
        <div>
          <h1 class="text-3xl font-bold text-gray-800 mb-2">Broadcast Management</h1>
          <p class="text-gray-600">Monitor and manage broadcast messages and announcements</p>
        </div>
        <button
          onclick={exportAnalytics}
          class="primary-button flex items-center space-x-2"
        >
          <BarChart3 class="w-4 h-4" />
          <span>Export Analytics</span>
        </button>
      </div>

      <!-- Main Panel -->
      <div class="collaboration-card fade-in">
        <!-- Search and Filters -->
        <div class="p-6 border-b border-gray-200">
          <div class="flex flex-col lg:flex-row gap-4">
            <!-- Search -->
            <div class="flex-1">
              <div class="relative">
                <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  bind:value={searchQuery}
                  type="text"
                  placeholder="Search broadcasts by title, content, or creator..."
                  class="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent text-sm"
                />
              </div>
            </div>

            <!-- Priority Filter -->
            <div class="w-full lg:w-48">
              <select
                bind:value={selectedPriority}
                class="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent text-sm"
              >
                <option value="all">All Priorities</option>
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>

            <!-- Status Filter -->
            <div class="w-full lg:w-48">
              <select
                bind:value={selectedStatus}
                class="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="sent">Sent</option>
                <option value="scheduled">Scheduled</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Tabs -->
        <div class="border-b border-gray-200">
          <nav class="flex space-x-6 px-6">
            <button
              onclick={() => activeTab = 'sent'}
              class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'sent' ? 'border-[#01c0a4] text-[#01c0a4]' : 'border-transparent text-gray-500 hover:text-gray-700'}"
            >
              <div class="flex items-center space-x-2">
                <Send class="w-4 h-4" />
                <span>Sent</span>
                <span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{tabCounts().sent}</span>
              </div>
            </button>

            <button
              onclick={() => activeTab = 'scheduled'}
              class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'scheduled' ? 'border-[#01c0a4] text-[#01c0a4]' : 'border-transparent text-gray-500 hover:text-gray-700'}"
            >
              <div class="flex items-center space-x-2">
                <Clock class="w-4 h-4" />
                <span>Scheduled</span>
                <span class="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-xs">{tabCounts().scheduled}</span>
              </div>
            </button>

            <button
              onclick={() => activeTab = 'drafts'}
              class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'drafts' ? 'border-[#01c0a4] text-[#01c0a4]' : 'border-transparent text-gray-500 hover:text-gray-700'}"
            >
              <div class="flex items-center space-x-2">
                <Archive class="w-4 h-4" />
                <span>Drafts</span>
                <span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{tabCounts().drafts}</span>
              </div>
            </button>

            <button
              onclick={() => activeTab = 'archived'}
              class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'archived' ? 'border-[#01c0a4] text-[#01c0a4]' : 'border-transparent text-gray-500 hover:text-gray-700'}"
            >
              <div class="flex items-center space-x-2">
                <Archive class="w-4 h-4" />
                <span>Archived</span>
                <span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{tabCounts().archived}</span>
              </div>
            </button>

            <button
              onclick={() => activeTab = 'deleted'}
              class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'deleted' ? 'border-[#01c0a4] text-[#01c0a4]' : 'border-transparent text-gray-500 hover:text-gray-700'}"
            >
              <div class="flex items-center space-x-2">
                <Trash2 class="w-4 h-4" />
                <span>Deleted</span>
                <span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{tabCounts().deleted}</span>
              </div>
            </button>

            <button
              onclick={() => activeTab = 'reported'}
              class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'reported' ? 'border-[#01c0a4] text-[#01c0a4]' : 'border-transparent text-gray-500 hover:text-gray-700'}"
            >
              <div class="flex items-center space-x-2">
                <Flag class="w-4 h-4" />
                <span>Reported</span>
                <span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{tabCounts().reported}</span>
              </div>
            </button>

            <button
              onclick={() => activeTab = 'analytics'}
              class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'analytics' ? 'border-[#01c0a4] text-[#01c0a4]' : 'border-transparent text-gray-500 hover:text-gray-700'}"
            >
              <div class="flex items-center space-x-2">
                <TrendingUp class="w-4 h-4" />
                <span>Analytics</span>
              </div>
            </button>
          </nav>
        </div>

        <!-- Content -->
        {#if activeTab === 'analytics'}
          <!-- Analytics Dashboard -->
          <div class="p-6">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div class="bg-white p-6 rounded-lg border border-gray-200">
                <div class="flex items-center">
                  <div class="p-2 bg-blue-100 rounded-lg">
                    <Send class="w-6 h-6 text-blue-600" />
                  </div>
                  <div class="ml-4">
                    <p class="text-2xl font-bold text-gray-900">{analytics().totalSent}</p>
                    <p class="text-sm text-gray-500">Total Sent</p>
                  </div>
                </div>
              </div>

              <div class="bg-white p-6 rounded-lg border border-gray-200">
                <div class="flex items-center">
                  <div class="p-2 bg-green-100 rounded-lg">
                    <Users class="w-6 h-6 text-green-600" />
                  </div>
                  <div class="ml-4">
                    <p class="text-2xl font-bold text-gray-900">{analytics().totalRecipients}</p>
                    <p class="text-sm text-gray-500">Total Recipients</p>
                  </div>
                </div>
              </div>

              <div class="bg-white p-6 rounded-lg border border-gray-200">
                <div class="flex items-center">
                  <div class="p-2 bg-purple-100 rounded-lg">
                    <CheckCircle class="w-6 h-6 text-purple-600" />
                  </div>
                  <div class="ml-4">
                    <p class="text-2xl font-bold text-gray-900">{analytics().averageAckRate}%</p>
                    <p class="text-sm text-gray-500">Avg. Acknowledgment</p>
                  </div>
                </div>
              </div>

              <div class="bg-white p-6 rounded-lg border border-gray-200">
                <div class="flex items-center">
                  <div class="p-2 bg-red-100 rounded-lg">
                    <Radio class="w-6 h-6 text-red-600" />
                  </div>
                  <div class="ml-4">
                    <p class="text-2xl font-bold text-gray-900">{analytics().highPriority}</p>
                    <p class="text-sm text-gray-500">High Priority</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Recent Activity -->
            <div class="bg-white rounded-lg border border-gray-200">
              <div class="p-6 border-b border-gray-200">
                <h3 class="text-lg font-medium text-gray-900">Recent Broadcast Activity</h3>
              </div>
              <div class="p-6">
                <div class="space-y-4">
                  {#each mockBroadcasts.filter(b => b.status === 'sent').slice(0, 5) as broadcast}
                    <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div class="flex items-center space-x-3">
                        <div class="p-2 bg-blue-100 rounded-lg">
                          <Radio class="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p class="font-medium text-gray-900">{broadcast.title}</p>
                          <p class="text-sm text-gray-500">Sent to {broadcast.totalRecipients} recipients</p>
                        </div>
                      </div>
                      <div class="text-right">
                        <p class="text-sm font-medium text-gray-900">{getAcknowledgmentRate(broadcast)}</p>
                        <p class="text-xs text-gray-500">Acknowledgment Rate</p>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            </div>
          </div>
        {:else}
          <!-- Broadcast Table -->
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipients</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ack Rate</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                {#each filteredBroadcasts() as broadcast (broadcast.id)}
                  <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div class="text-sm font-medium text-gray-900">{broadcast.title}</div>
                        <div class="text-sm text-gray-500 truncate max-w-xs">{broadcast.content}</div>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full border {getPriorityColor(broadcast.priority)}">
                        {broadcast.priority}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {getStatusColor(broadcast.status)}">
                        {broadcast.status}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {broadcast.totalRecipients}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getAcknowledgmentRate(broadcast)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {#if broadcast.status === 'sent' && broadcast.sentAt}
                        {formatTimestamp(broadcast.sentAt)}
                      {:else if broadcast.status === 'scheduled' && broadcast.scheduledFor}
                        {formatTimestamp(broadcast.scheduledFor)}
                      {:else}
                        {formatTimestamp(broadcast.createdAt)}
                      {/if}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div class="flex items-center space-x-2">
                        <button
                          onclick={() => viewBroadcast(broadcast)}
                          class="text-[#01c0a4] hover:text-[#00a08a] flex items-center space-x-1"
                        >
                          <Eye class="w-4 h-4" />
                          <span>View</span>
                        </button>
                        {#if broadcast.status === 'draft'}
                          <button
                            onclick={() => duplicateBroadcast(broadcast)}
                            class="text-blue-600 hover:text-blue-500 flex items-center space-x-1"
                          >
                            <Radio class="w-4 h-4" />
                            <span>Duplicate</span>
                          </button>
                        {/if}
                        {#if broadcast.status === 'sent'}
                          <button
                            onclick={() => archiveBroadcast(broadcast)}
                            class="text-orange-600 hover:text-orange-500 flex items-center space-x-1"
                          >
                            <Archive class="w-4 h-4" />
                            <span>Archive</span>
                          </button>
                        {/if}
                        {#if broadcast.status === 'draft'}
                          <button
                            onclick={() => deleteBroadcast(broadcast)}
                            class="text-red-600 hover:text-red-500 flex items-center space-x-1"
                          >
                            <Trash2 class="w-4 h-4" />
                            <span>Delete</span>
                          </button>
                        {/if}
                      </div>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}

        <!-- Empty State -->
        {#if activeTab !== 'analytics' && filteredBroadcasts().length === 0}
          <div class="text-center py-12">
            <Radio class="mx-auto h-12 w-12 text-gray-400" />
            <h3 class="mt-2 text-sm font-medium text-gray-900">No broadcasts found</h3>
            <p class="mt-1 text-sm text-gray-500">Try adjusting your search criteria or filters.</p>
          </div>
        {/if}
      </div>
</div>
