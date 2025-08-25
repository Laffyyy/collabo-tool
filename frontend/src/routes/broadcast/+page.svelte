<script lang="ts">
  import { onMount } from 'svelte';
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
    Filter,
    Loader2,
    X,
    Send,
    Eye,
    Edit,
    Trash2
  } from 'lucide-svelte';
  import { broadcastAPI, type BroadcastFilters } from '$lib/api/retrieve-broadcasts';

  // Keep your existing type definitions unchanged
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
  }

  interface BroadcastTemplate {
    id: string;
    name: string;
    title: string;
    content: string;
    priority: 'low' | 'medium' | 'high';
    targetRoles: string[];
    acknowledgmentType: 'none' | 'required' | 'preferred-date' | 'choices' | 'textbox';
    choices?: string[];
    createdBy: string;
    createdAt: Date;
  }

  // Mock user data (following your existing pattern)
  const currentUser = {
    id: 'user-1',
    name: 'Admin User',
    role: 'admin',
    email: 'admin@company.com'
  };

  // Permission checks
  const canSendBroadcasts = ['admin', 'manager', 'supervisor', 'support'].includes(currentUser.role);
  const canAccessAdmin = currentUser.role === 'admin';

  // State for real data from API
  let broadcasts = $state<Broadcast[]>([]);
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  let statistics = $state<any>(null);
  let pagination = $state<any>(null);

  // UI State (keep existing)
  let activeTab = $state('My Broadcasts');
  let searchQuery = $state('');
  let priorityFilter = $state('all');
  let showCreateBroadcast = $state(false);
  let selectedBroadcast = $state<Broadcast | null>(null);
  let showFilterDropdown = $state(false);

  // Form and modal states (keep existing)
  let isAcknowledged = $state(false);
  let preferredDate = $state('');
  let selectedChoice = $state('');
  let textResponse = $state('');
  let selectedTemplate = $state('');
  let templateName = $state('');
  let showSaveTemplate = $state(false);
  let showOUDropdown = $state(false);
  let viewedBroadcasts = $state<Set<string>>(new Set());

  let newBroadcast = $state({
    title: '',
    content: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    targetRoles: [] as string[],
    targetOUs: [] as string[],
    acknowledgmentType: 'none' as 'none' | 'required' | 'preferred-date' | 'choices' | 'textbox',
    scheduleType: 'now' as 'now' | 'pick',
    eventDate: '',
    scheduledFor: '',
    endDate: '',
    choices: [''] as string[]
  });

  // Mock data for templates (until you implement template API)
  let templates = $state<BroadcastTemplate[]>([
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
    },
    {
      id: '2',
      name: 'System Maintenance',
      title: 'Scheduled System Maintenance',
      content: 'Scheduled system maintenance will occur this weekend. All systems will be temporarily unavailable during this time. Please plan accordingly.',
      priority: 'high',
      targetRoles: ['admin', 'manager', 'supervisor', 'support', 'frontline'],
      acknowledgmentType: 'required',
      createdBy: '1',
      createdAt: new Date(Date.now() - 172800000)
    }
  ]);

  // Mock data for other tabs (until you implement full targeting system)
  const mockBroadcasts: Broadcast[] = [
    {
      id: 'mock-1',
      title: 'HR Policy Update',
      content: 'Please review the updated remote work policy document.',
      priority: 'medium',
      targetRoles: ['admin', 'manager', 'supervisor', 'support', 'frontline'],
      targetOUs: ['HR'],
      createdBy: 'hr-admin',
      createdAt: new Date(Date.now() - 259200000),
      requiresAcknowledgment: true,
      responseType: 'required',
      acknowledgments: [],
      isActive: true
    }
  ];

  // Configuration (keep existing)
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

  const targetOUs = [
    'Human Resources',
    'Information Technology', 
    'Operations',
    'Finance',
    'Marketing',
    'Customer Service',
    'Quality Assurance',
    'Security'
  ];

  // Load broadcasts from API
  const loadBroadcasts = async (filters: BroadcastFilters = {}) => {
    if (activeTab !== 'My Broadcasts') {
      return;
    }

    console.log('🔄 Loading broadcasts...', { activeTab, filters }); // Debug log
    isLoading = true;
    error = null;

    try {
      const searchFilters: BroadcastFilters = {
        ...filters,
        search: searchQuery.trim() || undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
        limit: 50,
        page: 1
      };

      console.log('📤 Sending filters:', searchFilters); // Debug log
      const response = await broadcastAPI.getMyBroadcasts(searchFilters);
      console.log('📥 Received response:', response); // Debug log

      if (!response.success) {
        throw new Error(response.message || 'Failed to load broadcasts');
      }

      // Transform API response to match frontend interface
      broadcasts = response.broadcasts.map(broadcast => {
        console.log('🔄 Transforming broadcast:', broadcast); // Debug log
        return {
          id: broadcast.id,
          title: broadcast.title,
          content: broadcast.content,
          priority: broadcast.priority as 'low' | 'medium' | 'high',
          targetRoles: broadcast.targetRoles || [],
          targetOUs: broadcast.targetOUs || [],
          createdBy: broadcast.createdBy,
          createdAt: new Date(broadcast.createdAt),
          scheduledFor: broadcast.scheduledFor ? new Date(broadcast.scheduledFor) : undefined,
          requiresAcknowledgment: broadcast.requiresAcknowledgment,
          responseType: broadcast.responseType as 'none' | 'required' | 'preferred-date' | 'choices' | 'textbox',
          choices: broadcast.choices,
          eventDate: broadcast.eventDate ? new Date(broadcast.eventDate) : undefined,
          endDate: broadcast.endDate ? new Date(broadcast.endDate) : undefined,
          acknowledgments: broadcast.acknowledgments || [],
          isActive: broadcast.isActive
        };
      });

      statistics = response.statistics;
      pagination = response.pagination;
      
      console.log('✅ Broadcasts loaded:', broadcasts.length); // Debug log
      console.log('📊 Statistics:', statistics); // Debug log

    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load broadcasts';
      console.error('❌ Error loading broadcasts:', err);
    } finally {
      isLoading = false;
    }
  };

  // Handle tab changes
  const handleTabChange = (tabId: string) => {
    activeTab = tabId;
    if (tabId === 'My Broadcasts') {
      loadBroadcasts();
    }
  };

  // Update sortedBroadcasts to handle both API and mock data
  let sortedBroadcasts = $derived(
    activeTab === 'My Broadcasts' ? 
      // Use real API data for "My Broadcasts"
      [...broadcasts]
        .filter(b => {
          // Search filter
          if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            const matchesTitle = b.title.toLowerCase().includes(query);
            const matchesContent = b.content.toLowerCase().includes(query);
            if (!matchesTitle && !matchesContent) return false;
          }
          
          // Priority filter
          if (priorityFilter !== 'all' && b.priority !== priorityFilter) return false;
          
          return true;
        })
        .sort((a, b) => {
          // API data should already be sorted, but ensure consistency
          if (a.isActive !== b.isActive) {
            return a.isActive ? -1 : 1;
          }
          
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
          if (priorityDiff !== 0) return priorityDiff;
          
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }) :
      // Use mock data for other tabs
      [...mockBroadcasts]
        .filter(b => {
          // Search filter
          if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            const matchesTitle = b.title.toLowerCase().includes(query);
            const matchesContent = b.content.toLowerCase().includes(query);
            if (!matchesTitle && !matchesContent) return false;
          }
          
          // Priority filter
          if (priorityFilter !== 'all' && b.priority !== priorityFilter) return false;
          
          // If search or filter is active, show matching broadcasts from all tabs
          if (searchQuery.trim() || priorityFilter !== 'all') {
            return true;
          }
          
          // Regular filtering by targetOUs for other tabs
          return b.targetOUs.some(ou => ou === activeTab);
        })
        .sort((a, b) => {
          if (a.isActive !== b.isActive) {
            return a.isActive ? -1 : 1;
          }
          
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
          if (priorityDiff !== 0) return priorityDiff;
          
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        })
  );

  // Update tab counts to use real data for "My Broadcasts"
  let tabCounts = $derived(
    tabs.reduce((counts, tab) => {
      if (tab.id === 'My Broadcasts') {
        counts[tab.id] = statistics?.total || 0; // Use real data
      } else {
        // Use mock data count for other tabs
        const mockCount = mockBroadcasts.filter(b => 
          b.isActive && b.targetOUs.some(ou => ou === tab.id)
        ).length;
        counts[tab.id] = mockCount;
      }
      return counts;
    }, {} as Record<string, number>)
  );

  // Update new broadcast indicator
  let tabsWithNewBroadcasts = $derived(
    tabs.reduce((result, tab) => {
      if (tab.id === 'My Broadcasts') {
        // Use real data for "My Broadcasts"
        const hasNewBroadcasts = broadcasts.some(broadcast => {
          const isRecent = (Date.now() - new Date(broadcast.createdAt).getTime()) < 86400000;
          const isUnviewed = !viewedBroadcasts.has(broadcast.id);
          return isRecent && isUnviewed;
        });
        result[tab.id] = hasNewBroadcasts;
      } else {
        // Use mock data for other tabs
        const tabBroadcasts = mockBroadcasts.filter(b => 
          b.isActive && b.targetOUs.some(ou => ou === tab.id)
        );
        const hasNewBroadcasts = tabBroadcasts.some(broadcast => {
          const isRecent = (Date.now() - new Date(broadcast.createdAt).getTime()) < 86400000;
          const isUnviewed = !viewedBroadcasts.has(broadcast.id);
          return isRecent && isUnviewed;
        });
        result[tab.id] = hasNewBroadcasts;
      }
      return result;
    }, {} as Record<string, boolean>)
  );

  // Keep all your existing helper functions unchanged
  const loadTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      newBroadcast.title = template.title;
      newBroadcast.content = template.content;
      newBroadcast.priority = template.priority;
      newBroadcast.targetRoles = [...template.targetRoles];
      newBroadcast.acknowledgmentType = template.acknowledgmentType;
      newBroadcast.choices = template.choices ? [...template.choices] : [''];
    }
  };

  const saveAsTemplate = () => {
    if (templateName.trim() && newBroadcast.title.trim() && newBroadcast.content.trim()) {
      const template: BroadcastTemplate = {
        id: Date.now().toString(),
        name: templateName.trim(),
        title: newBroadcast.title.trim(),
        content: newBroadcast.content.trim(),
        priority: newBroadcast.priority,
        targetRoles: [...newBroadcast.targetRoles],
        acknowledgmentType: newBroadcast.acknowledgmentType,
        choices: newBroadcast.acknowledgmentType === 'choices' ? newBroadcast.choices.filter(choice => choice.trim()) : undefined,
        createdBy: currentUser.id,
        createdAt: new Date()
      };

      templates = [template, ...templates];
      templateName = '';
      showSaveTemplate = false;
      alert('Template saved successfully!');
    }
  };

  const createBroadcast = () => {
    if (newBroadcast.title.trim() && newBroadcast.content.trim()) {
      // For now, this still creates mock broadcasts
      // You'll implement the real API call later
      const broadcast: Broadcast = {
        id: Date.now().toString(),
        title: newBroadcast.title.trim(),
        content: newBroadcast.content.trim(),
        priority: newBroadcast.priority,
        targetRoles: newBroadcast.targetRoles,
        targetOUs: newBroadcast.targetOUs.length > 0 ? newBroadcast.targetOUs : [activeTab === 'My Broadcasts' ? 'HR' : activeTab],
        createdBy: currentUser.id,
        createdAt: new Date(),
        scheduledFor: newBroadcast.scheduleType === 'pick' && newBroadcast.scheduledFor ? new Date(newBroadcast.scheduledFor) : undefined,
        requiresAcknowledgment: newBroadcast.acknowledgmentType !== 'none',
        responseType: newBroadcast.acknowledgmentType,
        choices: newBroadcast.acknowledgmentType === 'choices' ? newBroadcast.choices.filter(choice => choice.trim()) : undefined,
        eventDate: newBroadcast.scheduleType === 'pick' && newBroadcast.eventDate ? new Date(newBroadcast.eventDate) : undefined,
        endDate: newBroadcast.endDate ? new Date(newBroadcast.endDate) : undefined,
        acknowledgments: [],
        isActive: true
      };

      broadcasts = [broadcast, ...broadcasts];
      closeCreateModal();
      alert('Broadcast created successfully!');
    }
  };

  // Keep all other existing functions unchanged (acknowledgeBroadcast, formatDate, etc.)
  const acknowledgeBroadcast = (broadcastId: string, attending?: boolean) => {
    const broadcast = broadcasts.find(b => b.id === broadcastId);
    if (broadcast) {
      const existingAck = broadcast.acknowledgments.find(a => a.userId === currentUser.id);
      if (!existingAck) {
        const acknowledgment: Acknowledgment = {
          userId: currentUser.id,
          acknowledgedAt: new Date(),
          attending
        };
        broadcast.acknowledgments.push(acknowledgment);
        broadcasts = [...broadcasts];
        alert('Broadcast acknowledged!');
      }
    }
  };

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

  const exportCSV = (broadcast: Broadcast) => {
    alert('CSV export functionality would be implemented here.');
  };

  const viewReport = (broadcast: Broadcast) => {
    alert('View detailed report functionality would be implemented here.');
  };

  const markAsDone = (broadcastId: string) => {
    broadcasts = broadcasts.map(b => 
      b.id === broadcastId ? { ...b, isActive: false } : b
    );
    closeBroadcastDetails();
    alert('Broadcast marked as done!');
  };

  const openBroadcastDetails = (broadcast: Broadcast) => {
    selectedBroadcast = broadcast;
    isAcknowledged = false;
    preferredDate = '';
    selectedChoice = '';
    textResponse = '';
    
    viewedBroadcasts.add(broadcast.id);
    viewedBroadcasts = new Set(viewedBroadcasts);
  };

  const closeBroadcastDetails = () => {
    selectedBroadcast = null;
    isAcknowledged = false;
    preferredDate = '';
    selectedChoice = '';
    textResponse = '';
  };

  const confirmModal = () => {
    if (selectedBroadcast && selectedBroadcast.requiresAcknowledgment) {
      const existingAck = selectedBroadcast.acknowledgments.find(a => a.userId === currentUser.id);
      if (!existingAck) {
        let canSubmit = false;
        let alertMessage = '';

        switch (selectedBroadcast.responseType) {
          case 'required':
            canSubmit = isAcknowledged;
            alertMessage = 'Broadcast acknowledged!';
            break;
          case 'preferred-date':
            canSubmit = preferredDate.trim() !== '';
            alertMessage = `Preferred date selected: ${preferredDate}`;
            break;
          case 'choices':
            canSubmit = selectedChoice.trim() !== '';
            alertMessage = `Response submitted: ${selectedChoice}`;
            break;
          case 'textbox':
            canSubmit = textResponse.trim() !== '';
            alertMessage = 'Response submitted successfully!';
            break;
        }

        if (canSubmit) {
          acknowledgeBroadcast(selectedBroadcast.id);
          alert(alertMessage);
        }
      }
    }
    closeBroadcastDetails();
  };

  const closeCreateModal = () => {
    showCreateBroadcast = false;
    newBroadcast = {
      title: '',
      content: '',
      priority: 'medium',
      targetRoles: [],
      targetOUs: [],
      acknowledgmentType: 'none',
      scheduleType: 'now',
      eventDate: '',
      scheduledFor: '',
      endDate: '',
      choices: ['']
    };
    selectedTemplate = '';
    templateName = '';
    showSaveTemplate = false;
  };

  // Load broadcasts when component mounts
  onMount(() => {
    loadBroadcasts();
  });

  // Watch for filter changes
  $effect(() => {
    if (activeTab === 'My Broadcasts') {
      loadBroadcasts();
    }
  });

  $effect(() => {
    if (searchQuery !== undefined || priorityFilter !== undefined) {
      if (activeTab === 'My Broadcasts') {
        loadBroadcasts();
      }
    }
  });
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
  </div>

  <!-- Error Display -->
  {#if error}
    <div class="bg-red-50 border border-red-200 rounded-lg p-4">
      <div class="flex items-center space-x-2 text-red-800">
        <AlertTriangle class="w-5 h-5" />
        <span class="font-medium">Error loading broadcasts</span>
      </div>
      <p class="text-red-700 mt-1">{error}</p>
      <button 
        onclick={() => loadBroadcasts()}
        class="mt-2 text-sm text-red-600 hover:text-red-800 underline"
      >
        Try again
      </button>
    </div>
  {/if}

  <!-- Keep all your existing modal and template code unchanged -->
  <!-- Create Broadcast Modal -->
  {#if showCreateBroadcast}
    <!-- Your existing create broadcast modal code goes here unchanged -->
  {/if}

  <!-- Tabs -->
  <div class="border-b border-gray-200 mb-6">
    <div class="flex items-center justify-between">
      <nav class="-mb-px flex space-x-8">
        {#each tabs as tab}
          <button
            onclick={() => handleTabChange(tab.id)}
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
              {tabCounts[tab.id] || 0}
            </span>
            
            <!-- New Broadcast Indicator -->
            {#if tabsWithNewBroadcasts[tab.id]}
              <span class="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>
            {/if}
          </button>
        {/each}
      </nav>
      
      <!-- Keep your existing search and filters code unchanged -->
    </div>
  </div>

  <!-- Loading State -->
  {#if isLoading && activeTab === 'My Broadcasts'}
    <div class="flex items-center justify-center py-12">
      <Loader2 class="w-8 h-8 animate-spin text-[#01c0a4]" />
      <span class="ml-2 text-gray-600">Loading broadcasts...</span>
    </div>
  {:else}
    <!-- Broadcasts List -->
    <div class="space-y-4">
      {#each sortedBroadcasts as broadcast, index}
        <!-- Keep your existing broadcast rendering code unchanged -->
      {/each}

      {#if sortedBroadcasts.length === 0 && !isLoading}
        <div class="collaboration-card p-12 text-center">
          <Megaphone class="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 class="text-xl font-semibold text-gray-600 mb-2">
            {activeTab === 'My Broadcasts' ? 'No broadcasts created yet' : 'No broadcasts yet'}
          </h3>
          <p class="text-gray-500 mb-4">
            {#if activeTab === 'My Broadcasts'}
              You haven't created any broadcasts yet. Create your first broadcast to get started.
            {:else if canSendBroadcasts}
              Create your first broadcast to start communicating with your team.
            {:else}
              Broadcasts from your organization will appear here.
            {/if}
          </p>
          {#if canSendBroadcasts}
            <button
              onclick={() => showCreateBroadcast = true}
              class="primary-button"
            >
              Create Broadcast
            </button>
          {/if}
        </div>
      {/if}
    </div>
  {/if}


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
                  <!-- Priority Dot -->
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

          <!-- Content -->
          <div class="mb-6">
            <p class="text-gray-700 text-lg leading-relaxed break-words">{selectedBroadcast.content}</p>
          </div>

          <!-- Metadata -->
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
              {#if selectedBroadcast.endDate}
                <div class="flex items-center space-x-2 text-sm text-gray-600">
                  <Clock class="w-4 h-4 flex-shrink-0" />
                  <span class="break-words">End Date: {formatDate(selectedBroadcast.endDate)}</span>
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

          <!-- Check if this is the creator's own broadcast (My Broadcasts tab) -->
          {#if selectedBroadcast.createdBy === currentUser.id}
            <!-- Creator View - Show end date and mark as done option -->
            <div class="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 class="text-lg font-semibold text-gray-800 mb-3">Broadcast Management</h3>
              {#if selectedBroadcast.endDate}
                <div class="mb-4">
                  <div class="flex items-center space-x-2 text-sm text-gray-700">
                    <Clock class="w-4 h-4 flex-shrink-0" />
                    <span class="font-medium">End Date: {formatDate(selectedBroadcast.endDate)}</span>
                  </div>
                  <p class="text-xs text-gray-500 mt-1">This broadcast will automatically expire on the end date</p>
                </div>
              {:else}
                <div class="mb-4 text-sm text-gray-600">
                  <p>No end date set for this broadcast</p>
                </div>
              {/if}
              
              <div class="flex items-center space-x-2 text-sm text-gray-700 mb-4">
                <CheckCircle class="w-4 h-4 flex-shrink-0" />
                <span>{selectedBroadcast.acknowledgments.length} people have acknowledged this broadcast</span>
              </div>
            </div>

            <!-- Actions for Creator -->
            <div class="flex justify-end pt-4 border-t border-gray-200">
              <button
                onclick={() => selectedBroadcast && markAsDone(selectedBroadcast.id)}
                class="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Mark as Done
              </button>
            </div>
          {:else}
            <!-- Regular User View - Show acknowledgment actions -->
            {#if selectedBroadcast.requiresAcknowledgment}
              {@const userAck = selectedBroadcast.acknowledgments.find((a: Acknowledgment) => a.userId === currentUser.id)}
              <div class="mb-6">
                {#if !userAck}
                  <div class="p-4 bg-gray-50 rounded-lg">
                    {#if selectedBroadcast.responseType === 'required'}
                      <!-- Simple Acknowledgment -->
                      <label class="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          bind:checked={isAcknowledged}
                          class="rounded border-gray-300 text-[#01c0a4] focus:ring-[#01c0a4] w-5 h-5"
                        />
                        <span class="text-gray-700 font-medium">I acknowledge receipt of this broadcast</span>
                      </label>
                    {:else if selectedBroadcast.responseType === 'preferred-date'}
                      <!-- Preferred Date Selection -->
                      <div>
                        <label for="preferredDate" class="block text-sm font-medium text-gray-700 mb-2">Select your preferred date/time</label>
                        <div 
                          class="relative cursor-pointer"
                          role="button"
                          tabindex="0"
                          onclick={() => document.getElementById('preferredDate')?.focus()}
                          onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); document.getElementById('preferredDate')?.focus(); } }}
                        >
                          <input
                            id="preferredDate"
                            type="datetime-local"
                            bind:value={preferredDate}
                            class="input-field cursor-pointer"
                          />
                        </div>
                      </div>
                    {:else if selectedBroadcast.responseType === 'choices' && selectedBroadcast.choices}
                      <!-- Multiple Choice Options -->
                      <div>
                        <span class="block text-sm font-medium text-gray-700 mb-3">Please select your response:</span>
                        <div class="space-y-2">
                          {#each selectedBroadcast.choices as choice}
                            <label class="flex items-start space-x-3 p-2 bg-white rounded border border-gray-200 hover:bg-gray-50 cursor-pointer">
                              <input
                                type="radio"
                                bind:group={selectedChoice}
                                value={choice}
                                class="rounded border-gray-300 text-[#01c0a4] focus:ring-[#01c0a4] mt-1 flex-shrink-0"
                              />
                              <span class="text-sm break-words">{choice}</span>
                            </label>
                          {/each}
                        </div>
                      </div>
                    {:else if selectedBroadcast.responseType === 'textbox'}
                      <!-- Text Response -->
                      <div>
                        <label for="textResponse" class="block text-sm font-medium text-gray-700 mb-2">Your response:</label>
                        <textarea
                          id="textResponse"
                          bind:value={textResponse}
                          placeholder="Enter your feedback or response here..."
                          rows="4"
                          class="input-field resize-none"
                        ></textarea>
                      </div>
                    {/if}
                  </div>
                {:else}
                  <div class="flex items-center space-x-2 text-green-600 p-4 bg-green-50 rounded-lg">
                    <CheckCircle class="w-5 h-5" />
                    <span class="font-medium">
                      Acknowledged {formatDate(userAck.acknowledgedAt)}
                      {#if userAck.attending !== undefined}
                        • {userAck.attending ? 'Attending' : 'Not Attending'}
                      {/if}
                    </span>
                  </div>
                {/if}
              </div>
            {/if}

            <!-- Confirm Button for Regular Users -->
            <div class="flex justify-end pt-4 border-t border-gray-200">
              {#if selectedBroadcast.requiresAcknowledgment}
                {@const userAck = selectedBroadcast.acknowledgments.find((a: Acknowledgment) => a.userId === currentUser.id)}
                {#if !userAck}
                  {@const canConfirm = (() => {
                    switch (selectedBroadcast.responseType) {
                      case 'required': return isAcknowledged;
                      case 'preferred-date': return preferredDate.trim() !== '';
                      case 'choices': return selectedChoice.trim() !== '';
                      case 'textbox': return textResponse.trim() !== '';
                      default: return false;
                    }
                  })()}
                  <button
                    onclick={confirmModal}
                    disabled={!canConfirm}
                    class="primary-button disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Confirm
                  </button>
                {/if}
              {/if}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
