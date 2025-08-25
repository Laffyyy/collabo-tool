<script lang="ts">
  import { onMount } from 'svelte';
  import { broadcastAPI } from '$lib/api/retrieve-broadcasts';
  import { authStore } from '$lib/stores/auth.svelte';
  import { 
    Megaphone, 
    Plus, 
    Calendar, 
    Users, 
    AlertTriangle,
    CheckCircle,
    Clock,
    Download,
    FileText,
    Search,
    Filter
  } from 'lucide-svelte';

  // Type definitions (keep existing)
  interface Acknowledgment {
    userId: string;
    acknowledgedAt: Date;
    attending?: boolean;
  }

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
    requiresAcknowledgment: boolean;
    responseType: 'none' | 'required' | 'preferred-date' | 'choices' | 'textbox';
    choices?: string[];
    eventDate?: Date;
    endDate?: Date;
    acknowledgments: Acknowledgment[];
    isActive: boolean;
    status?: string;
  }

  // Get current user from auth store
  const currentUser = $authStore.user;

  // State for broadcasts - now loaded from API
  let broadcasts = $state<Broadcast[]>([]);
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  let statistics = $state({
    total: 0,
    active: 0,
    acknowledged: 0,
    byPriority: { high: 0, medium: 0, low: 0 },
    byStatus: { sent: 0, scheduled: 0, draft: 0, archived: 0, deleted: 0 }
  });

  // Keep existing state variables...
  let showCreateBroadcast = $state(false);
  let selectedBroadcast = $state<Broadcast | null>(null);
  let activeTab = $state('My Broadcasts');
  let searchQuery = $state('');
  let priorityFilter = $state('all');
  let showFilterDropdown = $state(false);
  let viewedBroadcasts = $state<Set<string>>(new Set());

  // Keep existing template and form state...
  let templates = $state([
    {
      id: '1',
      name: 'Team Meeting',
      title: 'Team Meeting - [Insert Date]',
      content: 'Join us for our team meeting to discuss recent progress and upcoming initiatives. Please confirm your attendance.',
      priority: 'medium',
      targetRoles: ['admin', 'manager', 'supervisor'],
      acknowledgmentType: 'preferred-date',
      createdBy: '1',
      createdAt: new Date(Date.now() - 86400000)
    }
    // ... other templates
  ]);

  const roles = ['admin', 'manager', 'supervisor', 'support', 'frontline'];
  const priorities = [
    { value: 'low', label: 'Low', color: 'text-green-600 bg-green-100' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-600 bg-yellow-100' },
    { value: 'high', label: 'High', color: 'text-red-600 bg-red-100' }
  ];

  const tabs = [
    { id: 'My Broadcasts', label: 'My Broadcasts' },
    { id: 'HR', label: 'HR' },
    { id: 'Team Lead', label: 'Team Lead' },
    { id: 'Cluster', label: 'Cluster' },
    { id: 'Site Broadcast', label: 'Site Broadcast' }
  ];

  // Load broadcasts from API
  const loadBroadcasts = async (filters = {}) => {
    if (activeTab !== 'My Broadcasts') {
      return; // Only load for My Broadcasts tab
    }

    console.log('🔄 Loading user broadcasts from API...');
    isLoading = true;
    error = null;

    try {
      const searchFilters = {
        ...filters,
        search: searchQuery.trim() || undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
        limit: 50,
        page: 1,
        includeDeleted: false // Only show active broadcasts
      };

      console.log('📤 API Request filters:', searchFilters);
      const response = await broadcastAPI.getMyBroadcasts(searchFilters);
      console.log('📥 API Response:', response);

      if (!response.success) {
        throw new Error('Failed to load broadcasts');
      }

      // Transform API response to match frontend format
      broadcasts = response.broadcasts.map(broadcast => {
        console.log('🔄 Processing broadcast:', broadcast);
        return {
          id: broadcast.id,
          title: broadcast.title,
          content: broadcast.content,
          priority: broadcast.priority as 'low' | 'medium' | 'high',
          targetRoles: broadcast.targetRoles || ['admin'],
          targetOUs: broadcast.targetOUs || ['HR'],
          createdBy: broadcast.createdBy,
          createdAt: new Date(broadcast.createdAt),
          scheduledFor: broadcast.scheduledFor ? new Date(broadcast.scheduledFor) : undefined,
          requiresAcknowledgment: broadcast.requiresAcknowledgment || false,
          responseType: broadcast.responseType as 'none' | 'required' | 'preferred-date' | 'choices' | 'textbox',
          choices: broadcast.choices,
          eventDate: broadcast.eventDate ? new Date(broadcast.eventDate) : undefined,
          endDate: broadcast.endDate ? new Date(broadcast.endDate) : undefined,
          acknowledgments: broadcast.acknowledgments || [],
          isActive: broadcast.isActive !== false,
          status: broadcast.status
        };
      });

      // Update statistics
      statistics = response.statistics || statistics;

      console.log('✅ Broadcasts loaded successfully:', broadcasts.length);

    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load broadcasts';
      console.error('❌ Error loading broadcasts:', err);
      broadcasts = [];
    } finally {
      isLoading = false;
    }
  };

  // Load broadcasts when component mounts or tab changes
  $effect(() => {
    console.log('👀 Effect triggered - activeTab:', activeTab);
    if (activeTab === 'My Broadcasts') {
      loadBroadcasts();
    }
  });

  // Reload when filters change
  $effect(() => {
    console.log('🔍 Filter effect - search:', searchQuery, 'priority:', priorityFilter);
    if (activeTab === 'My Broadcasts') {
      loadBroadcasts();
    }
  });

  // Computed values
  let sortedBroadcasts = $derived(
    isLoading ? [] : [...broadcasts]
      .filter(b => {
        // Apply search filter
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const matchesTitle = b.title.toLowerCase().includes(query);
          const matchesContent = b.content.toLowerCase().includes(query);
          if (!matchesTitle && !matchesContent) return false;
        }
        
        // Apply priority filter
        if (priorityFilter !== 'all' && b.priority !== priorityFilter) return false;
        
        return true;
      })
      .sort((a, b) => {
        // Sort by active status first
        if (a.isActive !== b.isActive) {
          return a.isActive ? -1 : 1;
        }
        
        // Then by priority
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        
        // Finally by creation date
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
  );

  let tabCounts = $derived((): { [key: string]: number } => {
    if (activeTab === 'My Broadcasts') {
      return { 'My Broadcasts': statistics.active ?? 0 };
    }
    // Ensure all keys have number values (not undefined)
    return { 'My Broadcasts': 0 };
  });

  let canSendBroadcasts = $derived(
    currentUser && ['admin', 'manager'].includes(currentUser.role)
  );

  // Keep existing utility functions...
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getPriorityStyle = (priority: string) => {
    const p = priorities.find(p => p.value === priority);
    return p?.color || 'text-gray-600 bg-gray-100';
  };

  const openBroadcastDetails = (broadcast: Broadcast) => {
    selectedBroadcast = broadcast;
    viewedBroadcasts.add(broadcast.id);
    viewedBroadcasts = new Set(viewedBroadcasts);
  };

  const closeBroadcastDetails = () => {
    selectedBroadcast = null;
  };

  // Keep all existing functions (createBroadcast, acknowledgeBroadcast, etc.)...
</script>

<svelte:head>
  <title>Broadcast - CollabHub</title>
</svelte:head>

<div class="p-6 space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between fade-in">
    <div>
      <h1 class="text-3xl font-bold text-gray-800 mb-2">Broadcast Center</h1>
      <p class="text-gray-600">Send announcements and track acknowledgments</p>
    </div>
    {#if canSendBroadcasts}
      <button
        onclick={() => showCreateBroadcast = !showCreateBroadcast}
        class="primary-button flex items-center space-x-2"
      >
        <Plus class="w-5 h-5" />
        <span>New Broadcast</span>
      </button>
    {/if}
  </div>

  <!-- Tabs -->
  <div class="border-b border-gray-200 mb-6">
    <div class="flex items-center justify-between">
      <nav class="-mb-px flex space-x-8">
        {#each tabs as tab}
          <button
            onclick={() => activeTab = tab.id}
            class="whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors relative {activeTab === tab.id
              ? 'border-[#01c0a4] text-[#01c0a4]'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }"
          >
            {tab.label}
            <span class="ml-2 py-0.5 px-2 rounded-full text-xs font-medium {activeTab === tab.id
              ? 'bg-[#01c0a4] text-white'
              : 'bg-gray-100 text-gray-600'
            }">
              {tabCounts()[tab.id] || 0}
            </span>
          </button>
        {/each}
      </nav>
      
      <!-- Search and Filters -->
      <div class="flex items-center space-x-3 -mb-px">
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search class="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            bind:value={searchQuery}
            placeholder="Search broadcasts..."
            class="block w-64 pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-[#01c0a4] focus:border-[#01c0a4] text-sm"
          />
        </div>
        
        <div class="relative">
          <button
            onclick={() => showFilterDropdown = !showFilterDropdown}
            class="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-[#01c0a4] focus:border-[#01c0a4]"
          >
            <Filter class="h-4 w-4 mr-2" />
            {priorityFilter === 'all' ? 'All Priorities' : priorityFilter.charAt(0).toUpperCase() + priorityFilter.slice(1)}
          </button>
          
          {#if showFilterDropdown}
            <div class="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
              <div class="py-1">
                <button
                  onclick={() => { priorityFilter = 'all'; showFilterDropdown = false; }}
                  class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left {priorityFilter === 'all' ? 'bg-gray-100' : ''}"
                >
                  All Priorities
                </button>
                <button
                  onclick={() => { priorityFilter = 'high'; showFilterDropdown = false; }}
                  class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left {priorityFilter === 'high' ? 'bg-gray-100' : ''}"
                >
                  High Priority
                </button>
                <button
                  onclick={() => { priorityFilter = 'medium'; showFilterDropdown = false; }}
                  class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left {priorityFilter === 'medium' ? 'bg-gray-100' : ''}"
                >
                  Medium Priority
                </button>
                <button
                  onclick={() => { priorityFilter = 'low'; showFilterDropdown = false; }}
                  class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left {priorityFilter === 'low' ? 'bg-gray-100' : ''}"
                >
                  Low Priority
                </button>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>

  <!-- Broadcasts List -->
  <div class="space-y-4">
    {#if activeTab === 'My Broadcasts'}
      {#if isLoading}
        <div class="collaboration-card p-12 text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-[#01c0a4] mx-auto mb-4"></div>
          <h3 class="text-xl font-semibold text-gray-600 mb-2">Loading your broadcasts...</h3>
          <p class="text-gray-500">Fetching broadcasts from the server</p>
        </div>
      {:else if error}
        <div class="collaboration-card p-12 text-center">
          <AlertTriangle class="w-16 h-16 text-red-300 mx-auto mb-4" />
          <h3 class="text-xl font-semibold text-gray-600 mb-2">Unable to load broadcasts</h3>
          <p class="text-gray-500 mb-4">{error}</p>
          <div class="space-y-3">
            <button
              onclick={() => loadBroadcasts()}
              class="primary-button"
            >
              Try Again
            </button>
            <p class="text-sm text-gray-400">
              Check your internet connection or contact support if the problem persists
            </p>
          </div>
        </div>
      {:else if sortedBroadcasts.length === 0}
        <div class="collaboration-card p-12 text-center">
          <Megaphone class="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 class="text-xl font-semibold text-gray-600 mb-2">
            {searchQuery || priorityFilter !== 'all' 
              ? 'No broadcasts match your filters' 
              : 'No broadcasts created yet'}
          </h3>
          <p class="text-gray-500 mb-4">
            {#if searchQuery || priorityFilter !== 'all'}
              Try adjusting your search or filter criteria
            {:else}
              You haven't created any broadcasts yet. Create your first broadcast to get started.
            {/if}
          </p>
          {#if canSendBroadcasts && !searchQuery && priorityFilter === 'all'}
            <button
              onclick={() => showCreateBroadcast = true}
              class="primary-button"
            >
              Create Broadcast
            </button>
          {/if}
        </div>
      {:else}
        <!-- Broadcast Cards -->
        {#each sortedBroadcasts as broadcast, index}
          {@const isNewBroadcast = (Date.now() - new Date(broadcast.createdAt).getTime()) < 86400000 && !viewedBroadcasts.has(broadcast.id)}
          {@const prevBroadcast = index > 0 ? sortedBroadcasts[index - 1] : null}
          {@const needsSeparator = prevBroadcast && prevBroadcast.isActive && !broadcast.isActive}
          
          {#if needsSeparator}
            <div class="flex items-center my-8">
              <div class="flex-1 border-t border-gray-300"></div>
              <div class="mx-4 px-3 py-1 bg-gray-100 rounded-full">
                <span class="text-sm font-medium text-gray-600">Completed Broadcasts</span>
              </div>
              <div class="flex-1 border-t border-gray-300"></div>
            </div>
          {/if}
          
          <div 
            class="collaboration-card p-4 fade-in cursor-pointer hover:shadow-lg transition-all relative {broadcast.priority === 'high' ? 'border-l-4 border-red-500' : ''} {isNewBroadcast ? 'ring-2 ring-blue-200 bg-blue-50' : ''} {!broadcast.isActive ? 'opacity-60 bg-gray-50' : ''}"
            role="button"
            tabindex="0"
            onclick={() => openBroadcastDetails(broadcast)}
            onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openBroadcastDetails(broadcast); } }}
          >
            {#if !broadcast.isActive}
              <div class="absolute top-2 right-2">
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  DONE
                </span>
              </div>
            {:else if isNewBroadcast}
              <div class="absolute top-2 right-2">
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  NEW
                </span>
              </div>
            {/if}
            
            <div class="flex items-start justify-between">
              <div class="flex-1 min-w-0">
                <div class="flex items-center space-x-3 mb-2">
                  <h3 class="text-lg font-bold text-gray-800 truncate">{broadcast.title}</h3>
                  <span class="px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap {getPriorityStyle(broadcast.priority)}">
                    {broadcast.priority.toUpperCase()}
                  </span>
                  <div class="w-2 h-2 rounded-full flex-shrink-0 {broadcast.priority === 'high' ? 'bg-red-500' : broadcast.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}"></div>
                </div>
                
                <div class="mb-3">
                  <p class="text-gray-600 text-sm line-clamp-2 break-words">
                    {#if broadcast.content.length > 120}
                      {broadcast.content.substring(0, 120)}... <span class="text-xs text-gray-400 italic">Click to read more</span>
                    {:else}
                      {broadcast.content}
                    {/if}
                  </p>
                </div>
                
                <div class="flex items-center space-x-4 text-sm text-gray-500 flex-wrap">
                  <div class="flex items-center space-x-1">
                    <Calendar class="w-4 h-4 flex-shrink-0" />
                    <span class="whitespace-nowrap">{formatDate(broadcast.createdAt)}</span>
                  </div>
                  <div class="flex items-center space-x-1">
                    <Users class="w-4 h-4 flex-shrink-0" />
                    <span class="truncate">{broadcast.targetRoles.join(', ')} | {broadcast.targetOUs.join(', ')}</span>
                  </div>
                  {#if broadcast.eventDate}
                    <div class="flex items-center space-x-1">
                      <Clock class="w-4 h-4 flex-shrink-0" />
                      <span class="whitespace-nowrap">Event: {formatDate(broadcast.eventDate)}</span>
                    </div>
                  {/if}
                </div>
              </div>

              {#if broadcast.requiresAcknowledgment}
                <div class="text-right flex-shrink-0 ml-4">
                  <div class="text-sm text-gray-500 mb-3 whitespace-nowrap">
                    {broadcast.acknowledgments.length} acknowledgments
                  </div>
                </div>
              {/if}
            </div>
          </div>
        {/each}
      {/if}
    {:else}
      <!-- Other tabs placeholder -->
      <div class="collaboration-card p-12 text-center">
        <Megaphone class="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 class="text-xl font-semibold text-gray-600 mb-2">Coming Soon</h3>
        <p class="text-gray-500">
          Broadcasts for {activeTab} will be available here.
        </p>
      </div>
    {/if}
  </div>

  <!-- Broadcast Details Modal -->
  {#if selectedBroadcast}
    <div class="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200">
        <div class="p-6">
          <div class="flex items-start justify-between mb-4">
            <div class="flex items-start space-x-3 min-w-0 flex-1">
              <div class="min-w-0 flex-1">
                <h2 class="text-2xl font-bold text-gray-800 break-words pr-4">{selectedBroadcast.title}</h2>
                <div class="flex items-center space-x-2 mt-2">
                  <span class="px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap {getPriorityStyle(selectedBroadcast.priority)}">
                    {selectedBroadcast.priority.toUpperCase()}
                  </span>
                  <div class="w-2 h-2 rounded-full flex-shrink-0 {selectedBroadcast.priority === 'high' ? 'bg-red-500' : selectedBroadcast.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}"></div>
                </div>
              </div>
            </div>
            <button
              onclick={closeBroadcastDetails}
              class="text-gray-400 hover:text-gray-600 text-2xl font-bold flex-shrink-0 ml-2"
            >
              ×
            </button>
          </div>

          <div class="mb-6">
            <p class="text-gray-700 text-lg leading-relaxed break-words">{selectedBroadcast.content}</p>
          </div>

          <div class="mb-6 p-4 bg-gray-50 rounded-lg">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="flex items-center space-x-2 text-sm text-gray-600">
                <Calendar class="w-4 h-4 flex-shrink-0" />
                <span class="break-words">Created: {formatDate(selectedBroadcast.createdAt)}</span>
              </div>
              <div class="flex items-center space-x-2 text-sm text-gray-600">
                <Users class="w-4 h-4 flex-shrink-0" />
                <span class="break-words">Target: {selectedBroadcast.targetRoles.join(', ')} | Units: {selectedBroadcast.targetOUs.join(', ')}</span>
              </div>
              {#if selectedBroadcast.eventDate}
                <div class="flex items-center space-x-2 text-sm text-gray-600">
                  <Clock class="w-4 h-4 flex-shrink-0" />
                  <span class="break-words">Event: {formatDate(selectedBroadcast.eventDate)}</span>
                </div>
              {/if}
              {#if selectedBroadcast.requiresAcknowledgment}
                <div class="flex items-center space-x-2 text-sm text-gray-600">
                  <CheckCircle class="w-4 h-4 flex-shrink-0" />
                  <span class="break-words">{selectedBroadcast.acknowledgments.length} acknowledgments</span>
                </div>
              {/if}
            </div>
          </div>

          <div class="flex justify-end pt-4 border-t border-gray-200">
            <button
              onclick={closeBroadcastDetails}
              class="secondary-button"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>
