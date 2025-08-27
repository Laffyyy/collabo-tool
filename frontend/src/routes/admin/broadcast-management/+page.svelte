<script lang="ts">
  import { Radio, Search, Eye, Trash2, Clock, Users, BarChart3, Calendar, Send, CheckCircle, Archive, TrendingUp, AlertTriangle, Ban, Flag, Undo2, X } from 'lucide-svelte';
  import ConfirmationModal from '$lib/components/ConfirmationModal.svelte';
  import { API_CONFIG } from '$lib/api/config';
  import { onMount } from 'svelte';

  interface Broadcast {
    id: string;
    title: string;
    content: string;
    priority: 'low' | 'medium' | 'high';
    targetRoles: string[];
    targetOUs: string[];
    createdByEmail: string;
    createdAt: Date;
    scheduledFor?: Date;
    sentAt?: Date;
    status: 'draft' | 'scheduled' | 'sent' | 'archived' | 'deleted' | 'done';
    acknowledgmentRequired: boolean;
    acknowledgmentCount: number;
    totalRecipients: number;
    eventDate?: Date;
    isReported?: boolean;
    reportReason?: string;
    reportedBy?: string;
    reportedAt?: Date;
    broadcastStatus?: 'active' | 'done';
  }

  let activeTab = $state<'sent' | 'scheduled' | 'archived' | 'reported'>('sent');
  let searchQuery = $state('');
  let selectedPriority = $state<'all' | 'low' | 'medium' | 'high'>('all');
  let selectedStatus = $state<'all' | 'draft' | 'scheduled' | 'sent' | 'archived' | 'deleted'>('all');
  let selectedBroadcast = $state<Broadcast | null>(null);
  let showBroadcastDetails = $state(false);
  let showConfirmModal = $state(false);
  let confirmAction = $state<{
    title: string;
    message: string;
    confirmText: string;
    style: 'danger' | 'warning' | 'primary';
    action: () => void;
  } | null>(null);



  let broadcasts = $state<Broadcast[]>([]);
  let isLoading = $state(true);
  let error = $state<string | null>(null);

  let currentPage = $state(1);
  const rowsPerPage = 6;

async function fetchAllBroadcasts() {
  isLoading = true;
  try {
    const res = await fetch(`${API_CONFIG.baseUrl}/api/v1/broadcasts/all`, { credentials: 'include' });
    const data = await res.json();
    if (!data.success) throw new Error('Failed to load broadcasts');
    broadcasts = data.broadcasts.map((b: any) => ({
      id: b.id,
      title: b.title,
      content: b.content,
      priority: b.priority,
      targetRoles: b.targetRoles || [],
      targetOUs: b.targetOUs || [],
      createdByEmail: b.createdByEmail || b.createdByEmail,
      createdAt: new Date(b.createdAt),
      scheduledFor: b.scheduledFor ? new Date(b.scheduledFor) : undefined,
      sentAt: b.sentAt ? new Date(b.sentAt) : undefined,
      status: b.status,
      acknowledgmentRequired: b.requiresAcknowledgment,
      acknowledgmentCount: b.acknowledgmentCount, 
      totalRecipients: b.totalRecipients,
      eventDate: b.eventDate ? new Date(b.eventDate) : undefined,
      isReported: b.isReported,
      reportReason: b.reportReason,
      reportedBy: b.reportedBy,
      reportedAt: b.reportedAt ? new Date(b.reportedAt) : undefined,
      broadcastStatus: b.isActive ? 'active' : 'done'
    }));
    error = null;
  } catch (e: any) {
    error = e.message;
    broadcasts = [];
  } finally {
    isLoading = false;
  }
}

// Call fetchAllBroadcasts when the page loads
onMount(() => {
  fetchAllBroadcasts();
});

const allowedStatuses = ['sent', 'scheduled', 'archived'];

const filteredBroadcasts = $derived(() => {
  return broadcasts.filter(broadcast => {
    const isReported = broadcast.isReported === true;

    if (activeTab === 'reported') {
      return isReported;
    }
    if (activeTab === 'sent') {
      return (broadcast.status === 'sent' || broadcast.status === 'done') && !isReported;
    }
    if (activeTab === 'archived') {
      return broadcast.status === 'archived';
    }
    if (activeTab === 'scheduled') {
      return broadcast.status === 'scheduled';
    }
    return false;
  }).filter(broadcast => {
    // Search and filter logic
    const matchesSearch = searchQuery === '' ||
      broadcast.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      broadcast.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      broadcast.createdByEmail.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPriority = selectedPriority === 'all' || broadcast.priority === selectedPriority;
    const matchesStatus = selectedStatus === 'all' || broadcast.status === selectedStatus;

    return matchesSearch && matchesPriority && matchesStatus;
  });
});

  const tabCounts = $derived(() => {
    const allFilteredBroadcasts = broadcasts.filter(broadcast => {
      const matchesSearch = searchQuery === '' || 
        broadcast.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        broadcast.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        broadcast.createdByEmail.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesPriority = selectedPriority === 'all' || broadcast.priority === selectedPriority;
      const matchesStatus = selectedStatus === 'all' || broadcast.status === selectedStatus;
      
      return matchesSearch && matchesPriority && matchesStatus;
    });

    return {
      sent: allFilteredBroadcasts.filter(b => b.status === 'sent' && !b.isReported).length,
      scheduled: allFilteredBroadcasts.filter(b => b.status === 'scheduled').length,
      archived: allFilteredBroadcasts.filter(b => b.status === 'archived').length,
      reported: allFilteredBroadcasts.filter(b => b.isReported === true).length
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

  const getBroadcastStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'done': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAnsweredCount = (broadcast: Broadcast) => {
    if (!broadcast.acknowledgmentRequired) return `${broadcast.acknowledgmentCount ?? 0}`;
    return `${broadcast.acknowledgmentCount}`;
  };

  const getAcknowledgmentRate = (broadcast: Broadcast) => {
    if (!broadcast.acknowledgmentRequired || broadcast.totalRecipients === 0) return 'N/A';
    return `${Math.round((broadcast.acknowledgmentCount / broadcast.totalRecipients) * 100)}%`;
  };

  const viewBroadcast = (broadcast: Broadcast) => {
    selectedBroadcast = broadcast;
    showBroadcastDetails = true;
  };

  const closeBroadcastDetails = () => {
    selectedBroadcast = null;
    showBroadcastDetails = false;
  };

  const confirmArchiveBroadcast = (broadcast: Broadcast) => {
    confirmAction = {
      title: 'Archive Broadcast',
      message: `Are you sure you want to archive "${broadcast.title}"? This will move it to the archived broadcasts list.`,
      confirmText: 'Archive',
      style: 'warning',
      action: () => archiveBroadcast(broadcast)
    };
    showConfirmModal = true;
  };

const archiveBroadcast = async (broadcast: Broadcast) => {
    try {
      // Use the correct API path
      const response = await fetch(`${API_CONFIG.baseUrl}/api/v1/admin/broadcasts/${broadcast.id}/archive`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to archive broadcast');
      }

      // Update local state
      const index = broadcasts.findIndex(b => b.id === broadcast.id);
      if (index !== -1) {
        broadcasts[index].status = 'archived';
        broadcasts = [...broadcasts]; // Trigger reactivity
      }

      showConfirmModal = false;
      alert('Broadcast archived successfully');

    } catch (error: any) {
      console.error('Error archiving broadcast:', error);
      showConfirmModal = false;
      alert(error.message || 'Failed to archive broadcast');
    }
  };

  const confirmDeleteBroadcast = (broadcast: Broadcast) => {
    confirmAction = {
      title: 'Delete Broadcast',
      message: `Are you sure you want to delete "${broadcast.title}"? This action cannot be undone.`,
      confirmText: 'Delete',
      style: 'danger',
      action: () => deleteBroadcast(broadcast)
    };
    showConfirmModal = true;
  };

 const deleteBroadcast = async (broadcast: Broadcast) => {
    try {
      const response = await fetch(`${API_CONFIG.baseUrl}/api/v1/admin/broadcasts/${broadcast.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to delete broadcast');
      }

      // Remove from local state
      const index = broadcasts.findIndex(b => b.id === broadcast.id);
      if (index !== -1) {
        broadcasts.splice(index, 1);
        broadcasts = [...broadcasts]; // Trigger reactivity
      }

      showConfirmModal = false;
      alert('Broadcast deleted successfully');

    } catch (error: any) {
      console.error('Error deleting broadcast:', error);
      showConfirmModal = false;
      alert(error.message || 'Failed to delete broadcast');
    }
  };

  const confirmRestoreBroadcast = (broadcast: Broadcast) => {
    confirmAction = {
      title: 'Restore Broadcast',
      message: `Are you sure you want to restore "${broadcast.title}"? This will move it back to active broadcasts.`,
      confirmText: 'Restore',
      style: 'primary',
      action: () => restoreBroadcast(broadcast)
    };
    showConfirmModal = true;
  };

  const restoreBroadcast = async (broadcast: Broadcast) => {
    try {
      const response = await fetch(`${API_CONFIG.baseUrl}/api/v1/admin/broadcasts/${broadcast.id}/restore`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to restore broadcast');
      }

      // Update local state
      const index = broadcasts.findIndex(b => b.id === broadcast.id);
      if (index !== -1) {
        if (broadcast.isReported) {
          broadcasts[index].isReported = false;
          broadcasts[index].reportReason = undefined;
          broadcasts[index].reportedBy = undefined;
          broadcasts[index].reportedAt = undefined;
        } else {
          broadcasts[index].status = 'sent';
        }
        broadcasts = [...broadcasts]; // Trigger reactivity
      }

      showConfirmModal = false;
      alert('Broadcast restored successfully');

    } catch (error: any) {
      console.error('Error restoring broadcast:', error);
      showConfirmModal = false;
      alert(error.message || 'Failed to restore broadcast');
    }
  };

  const confirmPermanentlyDeleteBroadcast = (broadcast: Broadcast) => {
    confirmAction = {
      title: 'Permanently Delete Broadcast',
      message: `Are you sure you want to permanently delete "${broadcast.title}"? This action cannot be undone and the broadcast will be completely removed.`,
      confirmText: 'Permanently Delete',
      style: 'danger',
      action: () => permanentlyDeleteBroadcast(broadcast)
    };
    showConfirmModal = true;
  };

  const permanentlyDeleteBroadcast = (broadcast: Broadcast) => {
    // In a real app, this would make an API call
    const index = broadcasts.findIndex(b => b.id === broadcast.id);
    if (index !== -1) {
      broadcasts.splice(index, 1);
    }
    showConfirmModal = false;
    alert('Broadcast permanently deleted');
  };

  const dismissReport = (broadcast: Broadcast) => {
    // This is handled by confirmRestoreBroadcast
    confirmRestoreBroadcast(broadcast);
  };

  const takeActionOnReport = (broadcast: Broadcast) => {
    // This is handled by confirmDeleteBroadcast
    confirmDeleteBroadcast(broadcast);
  };

  const exportAnalytics = () => {
    alert('Exporting analytics data...');
  };



  const paginatedBroadcasts = $derived(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredBroadcasts().slice(start, start + rowsPerPage);
  });

  const totalPages = $derived(() => Math.ceil(filteredBroadcasts().length / rowsPerPage));

  function goToPage(page: number) {
    if (page >= 1 && page <= totalPages()) {
      currentPage = page;
    }
  }

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
                <span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{tabCounts().scheduled}</span>
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
              onclick={() => activeTab = 'reported'}
              class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'reported' ? 'border-[#01c0a4] text-[#01c0a4]' : 'border-transparent text-gray-500 hover:text-gray-700'}"
            >
              <div class="flex items-center space-x-2">
                <Flag class="w-4 h-4" />
                <span>Reported</span>
                <span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{tabCounts().reported}</span>
              </div>
            </button>
          </nav>
        </div>

        <!-- Content -->
        {#if activeTab === 'sent'}
          <!-- Sent Tab -->
          <div class="overflow-x-auto">
            <table class="w-full table-fixed">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 w-48 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th class="px-6 py-3 w-40 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Who Sent It</th>
                <th class="px-6 py-3 w-28 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                <th class="px-6 py-3 w-28 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3 w-28 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipients</th>
                <th class="px-6 py-3 w-28 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Answered</th>
                <th class="px-6 py-3 w-36 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sent Date</th>
                <th class="px-6 py-3 w-32 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                {#each paginatedBroadcasts() as broadcast (broadcast.id)}
                  <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div class="text-sm font-medium text-gray-900">{broadcast.title}</div>
                        <div class="text-sm text-gray-500 truncate max-w-xs">{broadcast.content}</div>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {broadcast.createdByEmail}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full border {getPriorityColor(broadcast.priority)}">
                        {broadcast.priority}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {getBroadcastStatusColor(broadcast.broadcastStatus || 'active')}">
                        {broadcast.status}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {broadcast.totalRecipients}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getAnsweredCount(broadcast)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {broadcast.sentAt ? formatTimestamp(broadcast.sentAt) : formatTimestamp(broadcast.createdAt)}
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
                        <button
                          onclick={() => confirmArchiveBroadcast(broadcast)}
                          class="text-orange-600 hover:text-orange-500 flex items-center space-x-1"
                        >
                          <Archive class="w-4 h-4" />
                          <span>Archive</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>

          {#if totalPages() > 1}
  <div class="flex items-center justify-between mt-4 mb-6 px-6">
    <div class="text-xs text-gray-600">
      Page {currentPage} of {totalPages()}
    </div>
    <div class="flex space-x-1">
      <button
        class="secondary-button px-2 py-1 text-xs rounded disabled:opacity-50 disabled:cursor-not-allowed"
        onclick={() => goToPage(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
      >
        Previous
      </button>
      {#each Array(totalPages()) as _, i}
        <button
          class="secondary-button px-2 py-1 text-xs rounded
            {currentPage === i + 1
              ? 'bg-[#01c0a4] text-white ring-2 ring-[#01c0a4]'
              : 'hover:bg-gray-100'}"
          onclick={() => goToPage(i + 1)}
          aria-current={currentPage === i + 1 ? 'page' : undefined}
        >
          {i + 1}
        </button>
      {/each}
      <button
        class="secondary-button px-2 py-1 text-xs rounded disabled:opacity-50 disabled:cursor-not-allowed"
        onclick={() => goToPage(currentPage + 1)}
        disabled={currentPage === totalPages()}
        aria-label="Next page"
      >
        Next
      </button>
    </div>
  </div>
{/if}
          </div>
        {:else if activeTab === 'scheduled'}
          <!-- Scheduled Tab -->
          <div class="overflow-x-auto">
            <table class="w-full table-fixed">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 w-48 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th class="px-6 py-3 w-40 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Who Sent It</th>
                <th class="px-6 py-3 w-28 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                <th class="px-6 py-3 w-28 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3 w-28 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipients</th>
                <th class="px-6 py-3 w-28 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Answered</th>
                <th class="px-6 py-3 w-36 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sent Date</th>
                <th class="px-6 py-3 w-32 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                {#each paginatedBroadcasts() as broadcast (broadcast.id)}
                  <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div class="text-sm font-medium text-gray-900">{broadcast.title}</div>
                        <div class="text-sm text-gray-500 truncate max-w-xs">{broadcast.content}</div>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {broadcast.createdByEmail}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full border {getPriorityColor(broadcast.priority)}">
                        {broadcast.priority}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {getBroadcastStatusColor(broadcast.broadcastStatus || 'active')}">
                        {broadcast.status}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {broadcast.totalRecipients}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getAnsweredCount(broadcast)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {broadcast.scheduledFor ? formatTimestamp(broadcast.scheduledFor) : formatTimestamp(broadcast.createdAt)}
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
                        <button
                          onclick={() => confirmArchiveBroadcast(broadcast)}
                          class="text-orange-600 hover:text-orange-500 flex items-center space-x-1"
                        >
                          <Archive class="w-4 h-4" />
                          <span>Archive</span>
                        </button>
                        <button
                          onclick={() => confirmDeleteBroadcast(broadcast)}
                          class="text-red-600 hover:text-red-500 flex items-center space-x-1"
                        >
                          <Trash2 class="w-4 h-4" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
            {#if totalPages() > 1}
  <div class="flex items-center justify-between mt-4 mb-6 px-6">
    <div class="text-xs text-gray-600">
      Page {currentPage} of {totalPages()}
    </div>
    <div class="flex space-x-1">
      <button
        class="secondary-button px-2 py-1 text-xs rounded disabled:opacity-50 disabled:cursor-not-allowed"
        onclick={() => goToPage(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
      >
        Previous
      </button>
      {#each Array(totalPages()) as _, i}
        <button
          class="secondary-button px-2 py-1 text-xs rounded
            {currentPage === i + 1
              ? 'bg-[#01c0a4] text-white ring-2 ring-[#01c0a4]'
              : 'hover:bg-gray-100'}"
          onclick={() => goToPage(i + 1)}
          aria-current={currentPage === i + 1 ? 'page' : undefined}
        >
          {i + 1}
        </button>
      {/each}
      <button
        class="secondary-button px-2 py-1 text-xs rounded disabled:opacity-50 disabled:cursor-not-allowed"
        onclick={() => goToPage(currentPage + 1)}
        disabled={currentPage === totalPages()}
        aria-label="Next page"
      >
        Next
      </button>
    </div>
  </div>
{/if}
          </div>
        {:else if activeTab === 'archived'}
          <!-- Archived Tab -->
          <div class="overflow-x-auto">
            <table class="w-full table-fixed">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 w-48 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th class="px-6 py-3 w-40 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Who Sent It</th>
                <th class="px-6 py-3 w-28 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                <th class="px-6 py-3 w-28 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3 w-28 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipients</th>
                <th class="px-6 py-3 w-28 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Answered</th>
                <th class="px-6 py-3 w-36 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sent Date</th>
                <th class="px-6 py-3 w-32 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                {#each paginatedBroadcasts() as broadcast (broadcast.id)}
                  <tr class="hover:bg-gray-50 bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div class="text-sm font-medium text-gray-700">{broadcast.title}</div>
                        <div class="text-sm text-gray-500 truncate max-w-xs">{broadcast.content}</div>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {broadcast.createdByEmail}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full border {getPriorityColor(broadcast.priority)}">
                        {broadcast.priority}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {getBroadcastStatusColor(broadcast.broadcastStatus || 'done')}">
                        {broadcast.status}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {broadcast.totalRecipients}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {getAnsweredCount(broadcast)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {broadcast.sentAt ? formatTimestamp(broadcast.sentAt) : formatTimestamp(broadcast.createdAt)}
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
                        <button
                          onclick={() => confirmRestoreBroadcast(broadcast)}
                          class="text-blue-600 hover:text-blue-500 flex items-center space-x-1"
                        >
                          <Undo2 class="w-4 h-4" />
                          <span>Restore</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
            {#if totalPages() > 1}
  <div class="flex items-center justify-between mt-4 mb-6 px-6">
    <div class="text-xs text-gray-600">
      Page {currentPage} of {totalPages()}
    </div>
    <div class="flex space-x-1">
      <button
        class="secondary-button px-2 py-1 text-xs rounded disabled:opacity-50 disabled:cursor-not-allowed"
        onclick={() => goToPage(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
      >
        Previous
      </button>
      {#each Array(totalPages()) as _, i}
        <button
          class="secondary-button px-2 py-1 text-xs rounded
            {currentPage === i + 1
              ? 'bg-[#01c0a4] text-white ring-2 ring-[#01c0a4]'
              : 'hover:bg-gray-100'}"
          onclick={() => goToPage(i + 1)}
          aria-current={currentPage === i + 1 ? 'page' : undefined}
        >
          {i + 1}
        </button>
      {/each}
      <button
        class="secondary-button px-2 py-1 text-xs rounded disabled:opacity-50 disabled:cursor-not-allowed"
        onclick={() => goToPage(currentPage + 1)}
        disabled={currentPage === totalPages()}
        aria-label="Next page"
      >
        Next
      </button>
    </div>
  </div>
{/if}
          </div>
        {:else if activeTab === 'reported'}
          <!-- Reported Tab -->
          <div class="overflow-x-auto">
            <table class="w-full table-fixed">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 w-48 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th class="px-6 py-3 w-40 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Who Sent It</th>
                <th class="px-6 py-3 w-28 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                <th class="px-6 py-3 w-28 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3 w-28 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipients</th>
                <th class="px-6 py-3 w-28 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Answered</th>
                <th class="px-6 py-3 w-36 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sent Date</th>
                <th class="px-6 py-3 w-32 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                {#each paginatedBroadcasts() as broadcast (broadcast.id)}
                  <tr class="hover:bg-gray-50 bg-red-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div class="text-sm font-medium text-gray-900">{broadcast.title}</div>
                        <div class="text-sm text-gray-500 truncate max-w-xs">{broadcast.content}</div>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {broadcast.createdByEmail}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full border {getPriorityColor(broadcast.priority)}">
                        {broadcast.priority}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {getBroadcastStatusColor(broadcast.broadcastStatus || 'active')}">
                        {broadcast.status}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {broadcast.totalRecipients}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getAnsweredCount(broadcast)}
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      <div class="flex items-center">
                        <Flag class="w-4 h-4 text-red-500 mr-2" />
                        {broadcast.reportReason || 'No reason provided'}
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {broadcast.sentAt ? formatTimestamp(broadcast.sentAt) : formatTimestamp(broadcast.createdAt)}
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
                        <button
                          onclick={() => confirmRestoreBroadcast(broadcast)}
                          class="text-blue-600 hover:text-blue-500 flex items-center space-x-1"
                        >
                          <Undo2 class="w-4 h-4" />
                          <span>Restore</span>
                        </button>
                        <button
                          onclick={() => confirmDeleteBroadcast(broadcast)}
                          class="text-red-600 hover:text-red-500 flex items-center space-x-1"
                        >
                          <Trash2 class="w-4 h-4" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
            {#if totalPages() > 1}
  <div class="flex items-center justify-between mt-4 mb-6 px-6">
    <div class="text-xs text-gray-600">
      Page {currentPage} of {totalPages()}
    </div>
    <div class="flex space-x-1">
      <button
        class="secondary-button px-2 py-1 text-xs rounded disabled:opacity-50 disabled:cursor-not-allowed"
        onclick={() => goToPage(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
      >
        Previous
      </button>
      {#each Array(totalPages()) as _, i}
        <button
          class="secondary-button px-2 py-1 text-xs rounded
            {currentPage === i + 1
              ? 'bg-[#01c0a4] text-white ring-2 ring-[#01c0a4]'
              : 'hover:bg-gray-100'}"
          onclick={() => goToPage(i + 1)}
          aria-current={currentPage === i + 1 ? 'page' : undefined}
        >
          {i + 1}
        </button>
      {/each}
      <button
        class="secondary-button px-2 py-1 text-xs rounded disabled:opacity-50 disabled:cursor-not-allowed"
        onclick={() => goToPage(currentPage + 1)}
        disabled={currentPage === totalPages()}
        aria-label="Next page"
      >
        Next
      </button>
    </div>
  </div>
{/if}
          </div>
        {/if}

        <!-- Empty State -->
        {#if paginatedBroadcasts().length === 0}
          <div class="text-center py-12">
            <Radio class="mx-auto h-12 w-12 text-gray-400" />
            <h3 class="mt-2 text-sm font-medium text-gray-900">No broadcasts found</h3>
            <p class="mt-1 text-sm text-gray-500">Try adjusting your search criteria or filters.</p>
          </div>
        {/if}
      </div>
</div>

<!-- Broadcast Details Modal -->
{#if showBroadcastDetails && selectedBroadcast}
  <div 
    class="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    tabindex="0"
    onclick={closeBroadcastDetails}
    onkeydown={(e) => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { closeBroadcastDetails(); } }}
  >
    <div 
      class="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      role="document"
    >
      <!-- Modal Header -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200">
        <div class="flex items-center space-x-3">
          <Radio class="w-5 h-5 text-[#01c0a4]" />
          <h2 class="text-lg font-semibold text-gray-900">Broadcast Details</h2>
        </div>
        <button
          onclick={closeBroadcastDetails}
          class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Modal Content -->
      <div class="p-6 space-y-6">
        <!-- Title and Basic Info -->
        <div class="space-y-4">
          <div>
            <label for="broadcast-title" class="block text-sm font-medium text-gray-700 mb-2">Title</label>
            <input
              id="broadcast-title"
              type="text"
              class="text-lg font-semibold text-gray-900 bg-transparent border-none p-0 m-0 focus:ring-0 focus:outline-none"
              value={selectedBroadcast.title}
              readonly
              tabindex="-1"
              aria-readonly="true"
            />
          </div>
          <div>
            <span class="block text-sm font-medium text-gray-700 mb-2">Content</span>
            <div class="bg-gray-50 rounded-lg p-4 text-gray-900 leading-relaxed">
              {selectedBroadcast.content}
            </div>
          </div>
        </div>

        <!-- Broadcast Info Grid -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <span class="block text-sm font-medium text-gray-700 mb-1">Created By</span>
            <div class="text-gray-900">{selectedBroadcast.createdByEmail}</div>
          </div>
          <div>
            <span class="block text-sm font-medium text-gray-700 mb-1">Priority</span>
            <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full border {getPriorityColor(selectedBroadcast.priority)}">
              {selectedBroadcast.priority}
            </span>
          </div>
          <div>
            <span class="block text-sm font-medium text-gray-700 mb-1">Status</span>
            <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {getBroadcastStatusColor(selectedBroadcast.broadcastStatus || 'active')}">
              {selectedBroadcast.broadcastStatus || 'Active'}
            </span>
          </div>
          <div>
            <span class="block text-sm font-medium text-gray-700 mb-1">Recipients</span>
            <div class="text-gray-900">{selectedBroadcast.totalRecipients}</div>
          </div>
          <div>
            <span class="block text-sm font-medium text-gray-700 mb-1">Acknowledgment Required</span>
            <div class="text-gray-900">{selectedBroadcast.acknowledgmentRequired ? 'Yes' : 'No'}</div>
          </div>
          <div>
            <span class="block text-sm font-medium text-gray-700 mb-1">Responses</span>
            <div class="text-gray-900">{getAnsweredCount(selectedBroadcast)}</div>
          </div>
          <div>
            <span class="block text-sm font-medium text-gray-700 mb-1">Created Date</span>
            <div class="text-gray-900">{formatTimestamp(selectedBroadcast.createdAt)}</div>
          </div>
          <div>
            <span class="block text-sm font-medium text-gray-700 mb-1">
              {selectedBroadcast.status === 'sent' ? 'Sent Date' : 
               selectedBroadcast.status === 'scheduled' ? 'Scheduled Date' : 'Status Date'}
            </span>
            <div class="text-gray-900">
              {selectedBroadcast.sentAt ? formatTimestamp(selectedBroadcast.sentAt) :
               selectedBroadcast.scheduledFor ? formatTimestamp(selectedBroadcast.scheduledFor) :
               formatTimestamp(selectedBroadcast.createdAt)}
            </div>
          </div>
        </div>

        <!-- Target Information -->
        <div class="space-y-4">
          <div>
            <span class="block text-sm font-medium text-gray-700 mb-2">Target Roles</span>
            <div class="flex flex-wrap gap-2">
              {#each selectedBroadcast.targetRoles as role}
                <span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                  {role}
                </span>
              {/each}
            </div>
          </div>
          <div>
            <span class="block text-sm font-medium text-gray-700 mb-2">Target Organization Units</span>
            <div class="flex flex-wrap gap-2">
              {#each selectedBroadcast.targetOUs as ou}
                <span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                  {ou}
                </span>
              {/each}
            </div>
          </div>
        </div>

        <!-- Report Information (for reported broadcasts) -->
        {#if selectedBroadcast.isReported && activeTab === 'reported'}
          <div class="space-y-4 border-t pt-6">
            <h3 class="text-lg font-semibold text-red-600 flex items-center">
              <Flag class="w-5 h-5 mr-2" />
              Report Information
            </h3>
            
            <div class="bg-red-50 border border-red-200 rounded-lg p-4">
              <div class="grid grid-cols-1 gap-3">
                <div>
                  <span class="block text-sm font-medium text-red-700 mb-1">Reported By</span>
                  <div class="text-red-900">{selectedBroadcast.reportedBy}</div>
                </div>
                <div>
                  <span class="block text-sm font-medium text-red-700 mb-1">Report Date</span>
                  <div class="text-red-900">{selectedBroadcast.reportedAt ? formatTimestamp(selectedBroadcast.reportedAt) : 'N/A'}</div>
                </div>
                <div>
                  <span class="block text-sm font-medium text-red-700 mb-1">Report Reason</span>
                  <div class="text-red-900 bg-red-100 rounded-lg p-3 leading-relaxed">
                    {selectedBroadcast.reportReason || 'No reason provided'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
<!-- Confirmation Modal -->
{#if confirmAction}
  <ConfirmationModal
    show={showConfirmModal}
    title={confirmAction.title}
    message={confirmAction.message}
    confirmText={confirmAction.confirmText}
    confirmStyle={confirmAction.style}
    onConfirm={() => {
      confirmAction?.action();
      showConfirmModal = false;
    }}
    onCancel={() => {
      showConfirmModal = false;
      confirmAction = null;
    }}
  />
{/if}
