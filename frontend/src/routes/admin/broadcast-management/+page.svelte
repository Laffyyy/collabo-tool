<script lang="ts">
  import { Radio, Search, Eye, Trash2, Clock, Users, BarChart3, Calendar, Send, CheckCircle, Archive, TrendingUp, AlertTriangle, Ban, Flag, Undo2, X } from 'lucide-svelte';
  import ConfirmationModal from '$lib/components/ConfirmationModal.svelte';
  import { API_CONFIG } from '$lib/api/config';
  import { onMount } from 'svelte';
  import { toastStore } from '$lib/stores/toast.svelte';
  import ToastContainer from '$lib/components/ToastContainer.svelte';
  import { authStore } from '$lib/stores/auth.svelte';
  import { themeStore } from '$lib/stores/theme.svelte';

  let isDarkMode = $derived(themeStore.isDarkMode);
  

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

  // Add global settings state
  let globalSettings = $state<{
    dateFormat: string;
    timeFormat: string;
  }>({
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h'
  });

  // let currentPage = $state(1);
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

// To this:
onMount(async () => {
  fetchAllBroadcasts();
  await loadGlobalSettings();  
  loadBroadcasts();
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

  // Load global settings from backend
  const loadGlobalSettings = async () => {
    try {
      const response = await fetch(`${API_CONFIG.baseUrl}/api/v1/global-settings/general`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const settings = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;
          globalSettings = {
            dateFormat: settings.dateFormat || 'MM/DD/YYYY',
            timeFormat: settings.timeFormat || '12h'
          };
          console.log('✅ Global settings loaded:', globalSettings);
        }
      } else {
        console.warn('Failed to load global settings, using defaults');
      }
    } catch (error) {
      console.error('Error loading global settings:', error);
    }
  };

  // Enhanced timestamp formatting using global settings
  const formatTimestamp = (date: Date) => {
    if (!date || isNaN(date.getTime())) {
      return 'Invalid date';
    }

    // For full timestamps, use appropriate locale for date formatting but 'en-US' for 12-hour time
    let locale = 'en-US';
    
    // Only change locale for 24-hour format
    if (globalSettings.timeFormat === '24h') {
      if (globalSettings.dateFormat === 'DD/MM/YYYY') {
        locale = 'en-GB';
      } else if (globalSettings.dateFormat === 'YYYY-MM-DD') {
        locale = 'sv-SE';
      }
    }

    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: globalSettings.timeFormat === '12h'
    };

    return new Intl.DateTimeFormat(locale, options).format(date);
  };

  // Enhanced date formatting for date-only display
  const formatDate = (date: Date) => {
    if (!date || isNaN(date.getTime())) {
      return 'Invalid date';
    }

    // Always use 'en-US' locale for consistent formatting
    let locale = 'en-US';
    
    // Use appropriate locale based on date format setting
    if (globalSettings.dateFormat === 'DD/MM/YYYY') {
      locale = 'en-GB';
    } else if (globalSettings.dateFormat === 'YYYY-MM-DD') {
      locale = 'sv-SE';
    }

    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    };

    return new Intl.DateTimeFormat(locale, options).format(date);
  };

  // Enhanced short date formatting for relative display
  const formatShortDate = (date: Date) => {
    if (!date || isNaN(date.getTime())) {
      return 'Invalid date';
    }

    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: globalSettings.timeFormat === '12h'
    };

    if (isToday) {
      // Always use 'en-US' for consistent AM/PM display
      return `Today ${new Intl.DateTimeFormat('en-US', timeOptions).format(date)}`;
    } else if (isYesterday) {
      const timeStr = new Intl.DateTimeFormat('en-US', timeOptions).format(date);
      return `Yesterday ${timeStr}`;
    } else {
      return formatDate(date);
    }
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
      $toastStore.success('Broadcast archived successfully');
  } catch (error: any) {
    console.error('Error archiving broadcast:', error);
    showConfirmModal = false;
    $toastStore.error(error.message || 'Failed to archive broadcast');
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
       $toastStore.success('Broadcast deleted successfully');
      } catch (error: any) {
        console.error('Error deleting broadcast:', error);
        showConfirmModal = false;
        $toastStore.error(error.message || 'Failed to delete broadcast');
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
       $toastStore.success('Broadcast restored successfully');
  } catch (error: any) {
    console.error('Error restoring broadcast:', error);
    showConfirmModal = false;
    $toastStore.error(error.message || 'Failed to restore broadcast');
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

let pageByTab = $state<{ [key: string]: number }>({
  sent: 1,
  scheduled: 1,
  archived: 1,
  reported: 1
});

// Helper to get/set current page for the active tab
const resetPageIfOutOfRange = $derived(() => {
  // Reset page to 1 if filteredBroadcasts length changes and current page is out of range
  const total = Math.ceil(filteredBroadcasts().length / rowsPerPage);
  if (pageByTab[activeTab] > total && total > 0) {
    pageByTab[activeTab] = 1;
  }
});

  // Reset page to 1 when switching tabs
$effect(() => {
  // If the tab is changed, ensure its page is at least 1
  if (!pageByTab[activeTab]) pageByTab[activeTab] = 1;
});

// Update paginatedBroadcasts and totalPages to use per-tab page
const paginatedBroadcasts = $derived(() => {
  const start = (pageByTab[activeTab] - 1) * rowsPerPage;
  return filteredBroadcasts().slice(start, start + rowsPerPage);
});

  const totalPages = $derived(() => Math.max(1, Math.ceil(filteredBroadcasts().length / rowsPerPage)));

  function goToPage(page: number) {
  const total = totalPages();
  if (page >= 1 && page <= total) {
    pageByTab[activeTab] = page;
  }
}

</script>

<svelte:head>
  <title>Broadcast Management - Admin Controls</title>
</svelte:head>

<div class="{isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} min-h-screen space-y-6 p-6 transition-colors duration-300">
      <!-- Header -->
      <div class="flex items-center justify-between fade-in">
        <div>
          <h1 class="{isDarkMode ? 'text-white' : 'text-gray-800'} text-3xl font-bold mb-2 transition-colors duration-300">Broadcast Management</h1>
          <p class="{isDarkMode ? 'text-gray-300' : 'text-gray-600'} transition-colors duration-300">Monitor and manage broadcast messages and announcements</p>
        </div>
      </div>

      <!-- Main Panel -->
      <div class="{isDarkMode ? 'bg-gray-800 border-gray-400' : 'bg-white border-gray-400'} rounded-2xl shadow-lg border fade-in transition-colors duration-300">
        <!-- Search and Filters -->
        <div class="{isDarkMode ? 'border-gray-700' : 'border-gray-400'} p-6 border-b transition-colors duration-300">
          <div class="flex flex-col lg:flex-row gap-4">
            <!-- Search -->
            <div class="flex-1">
              <div class="relative">
                <Search class="{isDarkMode ? 'text-gray-500' : 'text-gray-400'} absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 transition-colors duration-300" />
                <input
                  bind:value={searchQuery}
                  type="text"
                  placeholder="Search broadcasts by title, content, or creator..."
                  class="{isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500'} w-full pl-9 pr-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent text-sm transition-colors duration-300"
                />
              </div>
            </div>

            <!-- Priority Filter -->
            <div class="w-full lg:w-48">
              <select
                bind:value={selectedPriority}
                class="{isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} w-full px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent text-sm transition-colors duration-300"
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
                class="{isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} w-full px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent text-sm transition-colors duration-300"
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
        <div class="{isDarkMode ? 'border-gray-700' : 'border-gray-400'} border-b transition-colors duration-300">
          <nav class="flex space-x-6 px-6">
            <button
              onclick={() => activeTab = 'sent'}
              class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'sent' ? 'border-[#01c0a4] text-[#01c0a4]' : isDarkMode ? 'border-transparent text-gray-400 hover:text-gray-200' : 'border-transparent text-gray-500 hover:text-gray-700'}"
            >
              <div class="flex items-center space-x-2">
                <Send class="w-4 h-4" />
                <span>Sent</span>
                <span class="{isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'} px-2 py-0.5 rounded-full text-xs transition-colors duration-300">{tabCounts().sent}</span>
              </div>
            </button>

            <button
              onclick={() => activeTab = 'scheduled'}
              class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'scheduled' ? 'border-[#01c0a4] text-[#01c0a4]' : isDarkMode ? 'border-transparent text-gray-400 hover:text-gray-200' : 'border-transparent text-gray-500 hover:text-gray-700'}"
            >
              <div class="flex items-center space-x-2">
                <Clock class="w-4 h-4" />
                <span>Scheduled</span>
                <span class="{isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'} px-2 py-0.5 rounded-full text-xs transition-colors duration-300">{tabCounts().scheduled}</span>
              </div>
            </button>

            <button
              onclick={() => activeTab = 'archived'}
              class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'archived' ? 'border-[#01c0a4] text-[#01c0a4]' : isDarkMode ? 'border-transparent text-gray-400 hover:text-gray-200' : 'border-transparent text-gray-500 hover:text-gray-700'}"
            >
              <div class="flex items-center space-x-2">
                <Archive class="w-4 h-4" />
                <span>Archived</span>
                <span class="{isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'} px-2 py-0.5 rounded-full text-xs transition-colors duration-300">{tabCounts().archived}</span>
              </div>
            </button>

            <button
              onclick={() => activeTab = 'reported'}
              class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'reported' ? 'border-[#01c0a4] text-[#01c0a4]' : isDarkMode ? 'border-transparent text-gray-400 hover:text-gray-200' : 'border-transparent text-gray-500 hover:text-gray-700'}"
            >
              <div class="flex items-center space-x-2">
                <Flag class="w-4 h-4" />
                <span>Reported</span>
                <span class="{isDarkMode ? 'bg-red-900 text-red-300' : 'bg-gray-100 text-gray-600'} px-2 py-0.5 rounded-full text-xs transition-colors duration-300">{tabCounts().reported}</span>
              </div>
            </button>
          </nav>
        </div>

        <!-- Content -->
        {#if activeTab === 'sent'}
          <!-- Sent Tab -->
          <div class="overflow-hidden rounded-b-2xl">
            <div class="overflow-x-auto">
              <table class="w-full table-fixed">
              <thead class="{isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} transition-colors duration-300">
                <tr>
                  <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 w-48 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Title</th>
                  <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 w-40 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Who Sent It</th>
                  <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 w-28 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Priority</th>
                  <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 w-28 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Status</th>
                  <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 w-28 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Recipients</th>
                  <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 w-28 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Answered</th>
                  <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 w-36 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Sent Date</th>
                  <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 w-32 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Actions</th>
                  </tr>
                </thead>
                <tbody class="{isDarkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'} divide-y transition-colors duration-300">
                {#each paginatedBroadcasts() as broadcast (broadcast.id)}
                  <tr class="{isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} transition-colors duration-300">
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div class="{isDarkMode ? 'text-gray-200' : 'text-gray-900'} text-sm font-medium transition-colors duration-300">{broadcast.title}</div>
                        <div class="{isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-sm truncate max-w-xs transition-colors duration-300">{broadcast.content}</div>
                      </div>
                    </td>
                    <td class="{isDarkMode ? 'text-gray-200' : 'text-gray-900'} px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300">
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
                    <td class="{isDarkMode ? 'text-gray-200' : 'text-gray-900'} px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300">
                      {broadcast.totalRecipients}
                    </td>
                    <td class="{isDarkMode ? 'text-gray-200' : 'text-gray-900'} px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300">
                      {getAnsweredCount(broadcast)}
                    </td>
                    <td class="{isDarkMode ? 'text-gray-400' : 'text-gray-500'} px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300">
                      {broadcast.sentAt ? formatTimestamp(broadcast.sentAt) : formatTimestamp(broadcast.createdAt)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div class="flex items-center space-x-2">
                        <button
                          onclick={() => viewBroadcast(broadcast)}
                          class="text-[#01c0a4] hover:text-[#00a08a] flex items-center space-x-1 transition-colors duration-300"
                        >
                          <Eye class="w-4 h-4" />
                          <span>View</span>
                        </button>
                        <button
                          onclick={() => confirmArchiveBroadcast(broadcast)}
                          class="{isDarkMode ? 'text-orange-400 hover:text-orange-300' : 'text-orange-600 hover:text-orange-500'} flex items-center space-x-1 transition-colors duration-300"
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
    <div class="{isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-xs transition-colors duration-300">
      Page {pageByTab[activeTab]} of {totalPages()}
    </div>
    <div class="flex space-x-1">
      <button
        class="{isDarkMode ? 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600 disabled:bg-gray-800' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100 disabled:bg-gray-50'} border px-2 py-1 text-xs rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300"
        onclick={() => goToPage(pageByTab[activeTab] - 1)}
        disabled={pageByTab[activeTab] === 1}
        aria-label="Previous page"
      >
        Previous
      </button>
      {#each Array(totalPages()) as _, i}
        <button
          class="{isDarkMode ? 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'} border px-2 py-1 text-xs rounded
            {pageByTab[activeTab] === i + 1
              ? 'bg-[#01c0a4] text-white ring-2 ring-[#01c0a4]'
              : ''} transition-colors duration-300"
          onclick={() => goToPage(i + 1)}
          aria-current={pageByTab[activeTab] === i + 1 ? 'page' : undefined}
        >
          {i + 1}
        </button>
      {/each}
      <button
        class="{isDarkMode ? 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600 disabled:bg-gray-800' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100 disabled:bg-gray-50'} border px-2 py-1 text-xs rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300"
        onclick={() => goToPage(pageByTab[activeTab] + 1)}
        disabled={pageByTab[activeTab] === totalPages()}
        aria-label="Next page"
      >
        Next
      </button>
    </div>
  </div>
{/if}
            </div>
          </div>
        {:else if activeTab === 'scheduled'}
          <!-- Scheduled Tab -->
          <div class="overflow-hidden rounded-b-2xl">
            <div class="overflow-x-auto">
              <table class="w-full table-fixed">
              <thead class="{isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} transition-colors duration-300">
                <tr>
                  <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 w-48 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Title</th>
                  <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 w-40 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Who Sent It</th>
                  <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 w-28 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Priority</th>
                  <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 w-28 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Status</th>
                  <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 w-28 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Recipients</th>
                  <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 w-28 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Answered</th>
                  <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 w-36 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Sent Date</th>
                  <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 w-32 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Actions</th>
                  </tr>
                </thead>
                <tbody class="{isDarkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'} divide-y transition-colors duration-300">
                {#each paginatedBroadcasts() as broadcast (broadcast.id)}
                  <tr class="{isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} transition-colors duration-300">
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div class="{isDarkMode ? 'text-gray-200' : 'text-gray-900'} text-sm font-medium transition-colors duration-300">{broadcast.title}</div>
                        <div class="{isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-sm truncate max-w-xs transition-colors duration-300">{broadcast.content}</div>
                      </div>
                    </td>
                    <td class="{isDarkMode ? 'text-gray-200' : 'text-gray-900'} px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300">
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
                    <td class="{isDarkMode ? 'text-gray-200' : 'text-gray-900'} px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300">
                      {broadcast.totalRecipients}
                    </td>
                    <td class="{isDarkMode ? 'text-gray-200' : 'text-gray-900'} px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300">
                      {getAnsweredCount(broadcast)}
                    </td>
                    <td class="{isDarkMode ? 'text-gray-400' : 'text-gray-500'} px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300">
                      {broadcast.scheduledFor ? formatTimestamp(broadcast.scheduledFor) : formatTimestamp(broadcast.createdAt)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div class="flex justify-center items-center space-x-2">
                        <button
                          onclick={() => viewBroadcast(broadcast)}
                          class="text-[#01c0a4] hover:text-[#00a08a] flex items-center space-x-1 transition-colors duration-300"
                        >
                          <Eye class="w-4 h-4" />
                          <span>View</span>
                        </button>
                        <button
                          onclick={() => confirmArchiveBroadcast(broadcast)}
                          class="{isDarkMode ? 'text-orange-400 hover:text-orange-300' : 'text-orange-600 hover:text-orange-500'} flex items-center space-x-1 transition-colors duration-300"
                        >
                          <Archive class="w-4 h-4" />
                          <span>Archive</span>
                        </button>
                        <button
                          onclick={() => confirmDeleteBroadcast(broadcast)}
                          class="{isDarkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-500'} flex items-center space-x-1 transition-colors duration-300"
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
      Page {pageByTab[activeTab]} of {totalPages()}
    </div>
    <div class="flex space-x-1">
      <button
        class="secondary-button px-2 py-1 text-xs rounded disabled:opacity-50 disabled:cursor-not-allowed"
        onclick={() => goToPage(pageByTab[activeTab] - 1)}
        disabled={pageByTab[activeTab] === 1}
        aria-label="Previous page"
      >
        Previous
      </button>
      {#each Array(totalPages()) as _, i}
        <button
          class="secondary-button px-2 py-1 text-xs rounded
            {pageByTab[activeTab] === i + 1
              ? 'bg-[#01c0a4] text-white ring-2 ring-[#01c0a4]'
              : 'hover:bg-gray-100'}"
          onclick={() => goToPage(i + 1)}
          aria-current={pageByTab[activeTab] === i + 1 ? 'page' : undefined}
        >
          {i + 1}
        </button>
      {/each}
      <button
        class="secondary-button px-2 py-1 text-xs rounded disabled:opacity-50 disabled:cursor-not-allowed"
        onclick={() => goToPage(pageByTab[activeTab] + 1)}
        disabled={pageByTab[activeTab] === totalPages()}
        aria-label="Next page"
      >
        Next
      </button>
    </div>
  </div>
{/if}
            </div>
          </div>

        {:else if activeTab === 'archived'}
          <!-- Archived Tab -->
          <div class="overflow-x-auto">
            <table class="w-full table-fixed">
            <thead class="{isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} transition-colors duration-300">
              <tr>
                <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 w-48 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Title</th>
                <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 w-40 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Who Sent It</th>
                <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 w-28 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Priority</th>
                <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 w-28 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Status</th>
                <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 w-28 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Recipients</th>
                <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 w-28 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Answered</th>
                <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 w-36 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Sent Date</th>
                <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 w-32 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Actions</th>
                </tr>
              </thead>
              <tbody class="{isDarkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'} divide-y transition-colors duration-300">
                {#each paginatedBroadcasts() as broadcast (broadcast.id)}
                  <tr class="{isDarkMode ? 'hover:bg-gray-700 bg-gray-800' : 'hover:bg-gray-50 bg-gray-50'} transition-colors duration-300">
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div class="{isDarkMode ? 'text-gray-200' : 'text-gray-700'} text-sm font-medium transition-colors duration-300">{broadcast.title}</div>
                        <div class="{isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-sm truncate max-w-xs transition-colors duration-300">{broadcast.content}</div>
                      </div>
                    </td>
                    <td class="{isDarkMode ? 'text-gray-200' : 'text-gray-700'} px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300">
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
                    <td class="{isDarkMode ? 'text-gray-200' : 'text-gray-700'} px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300">
                      {broadcast.totalRecipients}
                    </td>
                    <td class="{isDarkMode ? 'text-gray-200' : 'text-gray-700'} px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300">
                      {getAnsweredCount(broadcast)}
                    </td>
                    <td class="{isDarkMode ? 'text-gray-400' : 'text-gray-500'} px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300">
                      {broadcast.sentAt ? formatTimestamp(broadcast.sentAt) : formatTimestamp(broadcast.createdAt)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div class="flex justify-center items-center space-x-2">
                        <button
                          onclick={() => viewBroadcast(broadcast)}
                          class="text-[#01c0a4] hover:text-[#00a08a] flex items-center space-x-1 transition-colors duration-300"
                        >
                          <Eye class="w-4 h-4" />
                          <span>View</span>
                        </button>
                        <button
                          onclick={() => confirmRestoreBroadcast(broadcast)}
                          class="{isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'} flex items-center space-x-1 transition-colors duration-300"
                        >
                          <Undo2 class="w-4 h-4" />
                          <span>Restore</span>
                        </button>
                        <button
                        onclick={() => confirmDeleteBroadcast(broadcast)}
                        class="{isDarkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-500'} flex items-center space-x-1 transition-colors duration-300"
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
      Page {pageByTab[activeTab]} of {totalPages()}
    </div>
    <div class="flex space-x-1">
      <button
        class="secondary-button px-2 py-1 text-xs rounded disabled:opacity-50 disabled:cursor-not-allowed"
        onclick={() => goToPage(pageByTab[activeTab] - 1)}
        disabled={pageByTab[activeTab] === 1}
        aria-label="Previous page"
      >
        Previous
      </button>
      {#each Array(totalPages()) as _, i}
        <button
          class="secondary-button px-2 py-1 text-xs rounded
            {pageByTab[activeTab] === i + 1
              ? 'bg-[#01c0a4] text-white ring-2 ring-[#01c0a4]'
              : 'hover:bg-gray-100'}"
          onclick={() => goToPage(i + 1)}
          aria-current={pageByTab[activeTab] === i + 1 ? 'page' : undefined}
        >
          {i + 1}
        </button>
      {/each}
      <button
        class="secondary-button px-2 py-1 text-xs rounded disabled:opacity-50 disabled:cursor-not-allowed"
        onclick={() => goToPage(pageByTab[activeTab] + 1)}
        disabled={pageByTab[activeTab] === totalPages()}
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
            <thead class="{isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} transition-colors duration-300">
              <tr>
                <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 w-48 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Title</th>
                <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 w-40 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Who Sent It</th>
                <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 w-28 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Priority</th>
                <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 w-28 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Status</th>
                <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 w-28 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Recipients</th>
                <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 w-28 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Answered</th>
                <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 w-36 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Report Reason</th>
                <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 w-32 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Actions</th>
                </tr>
              </thead>
              <tbody class="{isDarkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'} divide-y transition-colors duration-300">
                {#each paginatedBroadcasts() as broadcast (broadcast.id)}
                  <tr class="{isDarkMode ? 'hover:bg-gray-700 bg-red-900/20' : 'hover:bg-gray-50 bg-red-50'} transition-colors duration-300">
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div class="{isDarkMode ? 'text-gray-200' : 'text-gray-900'} text-sm font-medium transition-colors duration-300">{broadcast.title}</div>
                        <div class="{isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-sm truncate max-w-xs transition-colors duration-300">{broadcast.content}</div>
                      </div>
                    </td>
                    <td class="{isDarkMode ? 'text-gray-200' : 'text-gray-900'} px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300">
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
                    <td class="{isDarkMode ? 'text-gray-200' : 'text-gray-900'} px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300">
                      {broadcast.totalRecipients}
                    </td>
                    <td class="{isDarkMode ? 'text-gray-200' : 'text-gray-900'} px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300">
                      {getAnsweredCount(broadcast)}
                    </td>
                    <td class="{isDarkMode ? 'text-gray-200' : 'text-gray-900'} px-6 py-4 text-sm max-w-xs truncate transition-colors duration-300">
                      <div class="flex items-center">
                        <Flag class="{isDarkMode ? 'text-red-400' : 'text-red-500'} w-4 h-4 mr-2 transition-colors duration-300" />
                        {broadcast.reportReason || 'No reason provided'}
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div class="flex items-center space-x-2">
                        <button
                          onclick={() => viewBroadcast(broadcast)}
                          class="text-[#01c0a4] hover:text-[#00a08a] flex items-center space-x-1 transition-colors duration-300"
                        >
                          <Eye class="w-4 h-4" />
                          <span>View</span>
                        </button>
                        <button
                          onclick={() => confirmRestoreBroadcast(broadcast)}
                          class="{isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'} flex items-center space-x-1 transition-colors duration-300"
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
      Page {pageByTab[activeTab]} of {totalPages()}
    </div>
    <div class="flex space-x-1">
      <button
        class="secondary-button px-2 py-1 text-xs rounded disabled:opacity-50 disabled:cursor-not-allowed"
        onclick={() => goToPage(pageByTab[activeTab] - 1)}
        disabled={pageByTab[activeTab] === 1}
        aria-label="Previous page"
      >
        Previous
      </button>
      {#each Array(totalPages()) as _, i}
        <button
          class="secondary-button px-2 py-1 text-xs rounded
            {pageByTab[activeTab] === i + 1
              ? 'bg-[#01c0a4] text-white ring-2 ring-[#01c0a4]'
              : 'hover:bg-gray-100'}"
          onclick={() => goToPage(i + 1)}
          aria-current={pageByTab[activeTab] === i + 1 ? 'page' : undefined}
        >
          {i + 1}
        </button>
      {/each}
      <button
        class="secondary-button px-2 py-1 text-xs rounded disabled:opacity-50 disabled:cursor-not-allowed"
        onclick={() => goToPage(pageByTab[activeTab] + 1)}
        disabled={pageByTab[activeTab] === totalPages()}
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
            <Radio class="{isDarkMode ? 'text-gray-600' : 'text-gray-400'} mx-auto h-12 w-12 transition-colors duration-300" />
            <h3 class="{isDarkMode ? 'text-gray-200' : 'text-gray-900'} mt-2 text-sm font-medium transition-colors duration-300">No broadcasts found</h3>
            <p class="{isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1 text-sm transition-colors duration-300">Try adjusting your search criteria or filters.</p>
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
      class="{isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transition-colors duration-300"
      role="document"
    >
      <!-- Modal Header -->
      <div class="{isDarkMode ? 'border-gray-700' : 'border-gray-200'} flex items-center justify-between p-6 border-b transition-colors duration-300">
        <div class="flex items-center space-x-3">
          <Radio class="w-5 h-5 text-[#01c0a4]" />
          <h2 class="{isDarkMode ? 'text-gray-100' : 'text-gray-900'} text-lg font-semibold transition-colors duration-300">Broadcast Details</h2>
        </div>
        <button
          onclick={closeBroadcastDetails}
          class="{isDarkMode ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'} p-2 rounded-lg transition-colors duration-300"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Modal Content -->
      <div class="p-6 space-y-6">
        <!-- Title and Basic Info -->
        <div class="space-y-4">
          <div>
            <label for="broadcast-title" class="{isDarkMode ? 'text-gray-300' : 'text-gray-700'} block text-sm font-medium mb-2 transition-colors duration-300">Title</label>
            <input
              id="broadcast-title"
              type="text"
              class="{isDarkMode ? 'text-gray-100' : 'text-gray-900'} text-lg font-semibold bg-transparent border-none p-0 m-0 focus:ring-0 focus:outline-none transition-colors duration-300"
              value={selectedBroadcast.title}
              readonly
              tabindex="-1"
              aria-readonly="true"
            />
          </div>
          <div>
            <span class="{isDarkMode ? 'text-gray-300' : 'text-gray-700'} block text-sm font-medium mb-2 transition-colors duration-300">Content</span>
            <div class="{isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-50 text-gray-900'} rounded-lg p-4 leading-relaxed transition-colors duration-300">
              {selectedBroadcast.content}
            </div>
          </div>
        </div>

        <!-- Broadcast Info Grid -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <span class="{isDarkMode ? 'text-gray-300' : 'text-gray-700'} block text-sm font-medium mb-1 transition-colors duration-300">Created By</span>
            <div class="{isDarkMode ? 'text-gray-100' : 'text-gray-900'} transition-colors duration-300">{selectedBroadcast.createdByEmail}</div>
          </div>
          <div>
            <span class="{isDarkMode ? 'text-gray-300' : 'text-gray-700'} block text-sm font-medium mb-1 transition-colors duration-300">Priority</span>
            <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full border {getPriorityColor(selectedBroadcast.priority)}">
              {selectedBroadcast.priority}
            </span>
          </div>
          <div>
            <span class="{isDarkMode ? 'text-gray-300' : 'text-gray-700'} block text-sm font-medium mb-1 transition-colors duration-300">Status</span>
            <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {getBroadcastStatusColor(selectedBroadcast.broadcastStatus || 'active')}">
              {selectedBroadcast.broadcastStatus || 'Active'}
            </span>
          </div>
          <div>
            <span class="{isDarkMode ? 'text-gray-300' : 'text-gray-700'} block text-sm font-medium mb-1 transition-colors duration-300">Recipients</span>
            <div class="{isDarkMode ? 'text-gray-100' : 'text-gray-900'} transition-colors duration-300">{selectedBroadcast.totalRecipients}</div>
          </div>
          <div>
            <span class="{isDarkMode ? 'text-gray-300' : 'text-gray-700'} block text-sm font-medium mb-1 transition-colors duration-300">Acknowledgment Required</span>
            <div class="{isDarkMode ? 'text-gray-100' : 'text-gray-900'} transition-colors duration-300">{selectedBroadcast.acknowledgmentRequired ? 'Yes' : 'No'}</div>
          </div>
          <div>
            <span class="{isDarkMode ? 'text-gray-300' : 'text-gray-700'} block text-sm font-medium mb-1 transition-colors duration-300">Responses</span>
            <div class="{isDarkMode ? 'text-gray-100' : 'text-gray-900'} transition-colors duration-300">{getAnsweredCount(selectedBroadcast)}</div>
          </div>
          <div>
            <span class="{isDarkMode ? 'text-gray-300' : 'text-gray-700'} block text-sm font-medium mb-1 transition-colors duration-300">Created Date</span>
            <div class="{isDarkMode ? 'text-gray-100' : 'text-gray-900'} transition-colors duration-300">{formatTimestamp(selectedBroadcast.createdAt)}</div>
          </div>
          <div>
            <span class="{isDarkMode ? 'text-gray-300' : 'text-gray-700'} block text-sm font-medium mb-1 transition-colors duration-300">
              {selectedBroadcast.status === 'sent' ? 'Sent Date' : 
               selectedBroadcast.status === 'scheduled' ? 'Scheduled Date' : 'Status Date'}
            </span>
            <div class="{isDarkMode ? 'text-gray-100' : 'text-gray-900'} transition-colors duration-300">
              {selectedBroadcast.sentAt ? formatTimestamp(selectedBroadcast.sentAt) :
               selectedBroadcast.scheduledFor ? formatTimestamp(selectedBroadcast.scheduledFor) :
               formatTimestamp(selectedBroadcast.createdAt)}
            </div>
          </div>
        </div>

        <!-- Target Information -->
        <div class="space-y-4">
          <div>
            <span class="{isDarkMode ? 'text-gray-300' : 'text-gray-700'} block text-sm font-medium mb-2 transition-colors duration-300">Target Roles</span>
            <div class="flex flex-wrap gap-2">
              {#each selectedBroadcast.targetRoles as role}
                <span class="{isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'} inline-flex px-2 py-1 text-xs font-medium rounded-full transition-colors duration-300">
                  {role}
                </span>
              {/each}
            </div>
          </div>
          <div>
            <span class="{isDarkMode ? 'text-gray-300' : 'text-gray-700'} block text-sm font-medium mb-2 transition-colors duration-300">Target Organization Units</span>
            <div class="flex flex-wrap gap-2">
              {#each selectedBroadcast.targetOUs as ou}
                <span class="{isDarkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'} inline-flex px-2 py-1 text-xs font-medium rounded-full transition-colors duration-300">
                  {ou}
                </span>
              {/each}
            </div>
          </div>
        </div>

        <!-- Report Information (for reported broadcasts) -->
        {#if selectedBroadcast.isReported && activeTab === 'reported'}
          <div class="{isDarkMode ? 'border-gray-700' : 'border-gray-200'} space-y-4 border-t pt-6 transition-colors duration-300">
            <h3 class="{isDarkMode ? 'text-red-400' : 'text-red-600'} text-lg font-semibold flex items-center transition-colors duration-300">
              <Flag class="w-5 h-5 mr-2" />
              Report Information
            </h3>
            
            <div class="{isDarkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'} border rounded-lg p-4 transition-colors duration-300">
              <div class="grid grid-cols-1 gap-3">
                <div>
                  <span class="{isDarkMode ? 'text-red-300' : 'text-red-700'} block text-sm font-medium mb-1 transition-colors duration-300">Reported By</span>
                  <div class="{isDarkMode ? 'text-red-200' : 'text-red-900'} transition-colors duration-300">{selectedBroadcast.reportedBy}</div>
                </div>
                <div>
                  <span class="{isDarkMode ? 'text-red-300' : 'text-red-700'} block text-sm font-medium mb-1 transition-colors duration-300">Report Date</span>
                  <div class="{isDarkMode ? 'text-red-200' : 'text-red-900'} transition-colors duration-300">{selectedBroadcast.reportedAt ? formatTimestamp(selectedBroadcast.reportedAt) : 'N/A'}</div>
                </div>
                <div>
                  <span class="{isDarkMode ? 'text-red-300' : 'text-red-700'} block text-sm font-medium mb-1 transition-colors duration-300">Report Reason</span>
                  <div class="{isDarkMode ? 'text-red-200 bg-red-900/40' : 'text-red-900 bg-red-100'} rounded-lg p-3 leading-relaxed transition-colors duration-300">
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

<ToastContainer />
