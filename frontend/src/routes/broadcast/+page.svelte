<script lang="ts">
  import { broadcastAPI } from '$lib/api/retrieve-broadcasts';
  import { receivedBroadcastAPI } from '$lib/api/received-broadcasts';
  import { receivedBroadcastsStore } from '$lib/stores/received-broadcasts.svelte';
  import { responseBroadcastAPI } from '$lib/api/response-broadcast';
  import { 
    Megaphone, 
    Plus, 
    Calendar, 
    Users,
    User, 
    AlertTriangle,
    CheckCircle,
    Clock,
    Download,
    FileText,
    Search,
    Filter,
    ChevronDown,
    X
  } from 'lucide-svelte';
  import { onMount } from 'svelte';
  import { apiClient } from '$lib/api/client';
  import * as BroadcastAPI from '$lib/api/broadcast';
  import type { 
    OrganizationalUnit, 
    Role, 
    CreateBroadcastRequest,
    SaveTemplateRequest,
  } from '$lib/api/types';
  import { API_CONFIG } from '$lib/api/config';
  import { authStore } from '$lib/stores/auth.svelte';
  import { toastStore } from '$lib/stores/toast.svelte';
  import ToastContainer from '$lib/components/ToastContainer.svelte';
  import ConfirmationModal from '$lib/components/ConfirmationModal.svelte';

  // Type definitions
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

  interface BroadcastTemplate {
    id: string;
    name: string;
    title: string;
    content: string;
    priority: 'low' | 'medium' | 'high';
    targetRoles: string[];
    targetOUs: string[];
    acknowledgmentType: 'none' | 'required' | 'preferred-date' | 'choices' | 'textbox';
    choices?: string[];
    createdBy: string;
    createdAt: Date;
  }

  interface BroadcastTarget {
    dtargettype: 'role' | 'ou' | 'user';
    dtargetid?: string | null;
    dtargetname: string;
  }

  interface ReceivedBroadcast {
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
    status?: string; // allow any string status
    targets?: BroadcastTarget[]; // <-- use the correct type here
    creatorFirstName?: string;
    creatorLastName?: string;
  }


  // Get current user from auth store
  let currentUser = $derived($authStore?.user || { id: '', role: '' });

  // State for broadcasts - will be loaded from API for "My Broadcasts" tab
  let isLoading = $state(false);
  let error = $state<string | null>(null);

  let receivedBroadcasts = $state<ReceivedBroadcast[]>([]);
  let isLoadingReceived = $state(false);
  let showCreateBroadcast = $state(false);
  let selectedBroadcast = $state<Broadcast | null>(null);
  let isAcknowledged = $state(false);
  let preferredDate = $state('');
  let selectedChoice = $state('');
  let textResponse = $state('');
  let activeTab = $state('My Broadcasts');
  let selectedTemplate = $state('');
  let templateName = $state('');
  let showSaveTemplate = $state(false);
  let showOUDropdown = $state(false);
  let viewedBroadcasts = $state<Set<string>>(new Set());
  let searchQuery = $state('');
  let priorityFilter = $state('all');
  let responseStatusFilter = $state('all');
  let showFilterDropdown = $state(false);
  let showResponseStatusDropdown = $state(false);
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

  let availableOUs = $state<OrganizationalUnit[]>([]);
  let availableRoles = $state<Role[]>([]);
  let isLoadingOUs = $state(false);
  let isLoadingRoles = $state(false);
  let isCreatingBroadcast = $state(false);
  let apiError = $state('');

  let isLoadingTemplates = $state(false);
  let isSavingTemplate = $state(false);

  let broadcasts = $state<Broadcast[]>([]);
  let templates = $state<BroadcastTemplate[]>([]);

  let showDeleteTemplateModal = $state(false);
  let templateToDelete = $state<string | null>(null);

  // Add state for tracking user responses
  let userResponses = $state<Map<string, any>>(new Map());
  let hasUserResponded = $derived((broadcastId: string) => userResponses.has(broadcastId));

    // Add state to track original response values
  let originalPreferredDate = $state('');
  let originalSelectedChoice = $state('');
  let originalTextResponse = $state('');

  // Add derived state to check if response has changed
  let hasPreferredDateChanged = $derived(preferredDate !== originalPreferredDate);
  let hasChoiceChanged = $derived(selectedChoice !== originalSelectedChoice);
  let hasTextChanged = $derived(textResponse.trim() !== originalTextResponse);

  // Track previous filter states to detect changes
  let prevSearchQuery = $state('');
  let prevPriorityFilter = $state('all');

  let hasLoadedEmptyBroadcasts = $state(false);
  let loadingFailed = $state(false);

  // Add these new state variables
  let showReportModal = $state(false);
  let reportBroadcast = $state<Broadcast | null>(null);
  let reportResponses = $state<any[]>([]);
  let isLoadingReport = $state(false);
  //Broadcast Modal OU Search
  let ouSearchQuery = $state('');

    const loadMyBroadcasts = async () => {
      console.log('🔄 Loading user broadcasts from API...');
      isLoading = true;
      error = null;

      try {
        // Prepare filters - only send non-default values to API
        const searchFilters: any = {
          limit: 50,
          page: 1,
          includeDeleted: false,
          includeTargets: true // Add this flag to ensure we get target names
        };

        // Only add search filter if there's actually a search term
        if (searchQuery.trim() !== '') {
          searchFilters.search = searchQuery.trim();
        }

        // Only add priority filter if it's not 'all'
        if (priorityFilter !== 'all') {
          searchFilters.priority = priorityFilter;
        }

        console.log('📤 API Request filters:', searchFilters);
        const response = await broadcastAPI.getMyBroadcasts(searchFilters);
        console.log('📥 API Response:', response);

        if (!response.success) {
          throw new Error('Failed to load broadcasts');
        }

        // Transform API response to match frontend format
        broadcasts = response.broadcasts.map(broadcast => {
          return {
            id: broadcast.id,
            title: broadcast.title,
            content: broadcast.content,
            priority: broadcast.priority as 'low' | 'medium' | 'high',
            // Use the names that are returned from the API instead of the IDs
            targetRoles: Array.isArray(broadcast.targetRoles) ? broadcast.targetRoles : [],
            targetOUs: Array.isArray(broadcast.targetOUs) ? broadcast.targetOUs : [],
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

        // Load acknowledgment counts for each broadcast
        for (const broadcast of broadcasts) {
          try {
            if (broadcast.requiresAcknowledgment) {
              const statsResponse = await responseBroadcastAPI.getResponseStats(broadcast.id);
              if (statsResponse.success && statsResponse.statistics) {
                // Update acknowledgments array with actual count data
                const count = statsResponse.statistics.totalResponses || 0;
                broadcast.acknowledgments = Array(count).fill({ userId: '', acknowledgedAt: new Date() });
              }
            }
          } catch (err) {
            console.error(`Failed to load stats for broadcast ${broadcast.id}:`, err);
          }
        }

        // Set this flag when we've successfully loaded broadcasts (even if empty)
        hasLoadedEmptyBroadcasts = broadcasts.length === 0;

        // Reset failed flag on success
        loadingFailed = false;
        console.log('✅ Broadcasts loaded successfully:', broadcasts.length);

      } catch (err) {
        // Set failed loading flag to prevent infinite loop
        loadingFailed = true;
        error = err instanceof Error ? err.message : 'Failed to load broadcasts';
        console.error('❌ Error loading broadcasts:', err);
        broadcasts = [];
      } finally {
        isLoading = false;
      }
    };

  onMount(() => {
    console.log('🔄 Component mounted, activeTab:', activeTab);
    
    // Initialize previous filter states
    prevSearchQuery = searchQuery.trim();
    prevPriorityFilter = priorityFilter;
    
    loadMyBroadcasts();
    loadReceivedBroadcasts();
});

  // FIXED: Effect for tab switching (separate from mount)
  $effect(() => {
    console.log('🔄 Tab switched to:', activeTab);
    // Only load if we switched TO "My Broadcasts" and don't have data yet
    if (activeTab === 'My Broadcasts' && broadcasts.length === 0 && !isLoading && !hasLoadedEmptyBroadcasts) {
        loadMyBroadcasts();
      }
  });

  // FIXED: Effect for filter changes (only reload if we have data and filters change)
  $effect(() => {
    console.log('🔍 Filter effect - search:', searchQuery, 'priority:', priorityFilter, 'responseStatus:', responseStatusFilter);
    
    // Check if filters actually changed
    const searchChanged = searchQuery.trim() !== prevSearchQuery.trim();
    const priorityChanged = priorityFilter !== prevPriorityFilter;
    
    if (activeTab === 'Received Broadcasts' && (searchChanged || priorityChanged)) {
      console.log('🔄 Reloading received broadcasts due to filter change');
      loadReceivedBroadcasts();
      
      // Update previous values
      prevSearchQuery = searchQuery.trim();
      prevPriorityFilter = priorityFilter;
    } else if (activeTab === 'My Broadcasts' && (searchChanged || priorityChanged)) {
      console.log('🔄 Reloading my broadcasts due to filter change');
      loadMyBroadcasts();
      
      // Update previous values
      prevSearchQuery = searchQuery.trim();
      prevPriorityFilter = priorityFilter;
    }
  });

  // Load user responses when switching to Received Broadcasts tab
  const loadReceivedBroadcasts = async () => {
  isLoadingReceived = true;
  try {
    // Prepare filters - only send non-default values to API
    const filters: any = {
      limit: 50,
      page: 1,
      includeTargets: true // Always include targets
    };

    // Only add search filter if there's actually a search term
    if (searchQuery.trim() !== '') {
      filters.search = searchQuery.trim();
    }

    // Only add priority filter if it's not 'all'
    if (priorityFilter !== 'all') {
      filters.priority = priorityFilter;
    }

    console.log('📤 Loading received broadcasts with filters:', filters);
    
    const response = await receivedBroadcastAPI.getReceivedBroadcasts(filters);
    console.log('📥 Received broadcast response:', response);

    // Process the broadcasts with improved target handling
    receivedBroadcasts = response.broadcasts.map(b => {
      console.log(`Processing broadcast ${b.id}:`, b);
      
       // Debug: Log the raw broadcast object
      console.log(`[DEBUG] Raw received broadcast:`, b);
      // Extract target information from the broadcast
      let targetRoles: string[] = [];
      let targetOUs: string[] = [];

      console.log(`[DEBUG] b.targetRoles:`, b.targetRoles);
      console.log(`[DEBUG] b.targetOUs:`, b.targetOUs);
      
      // First check if targetRoles and targetOUs are already provided directly
      if (Array.isArray(b.targetRoles) && b.targetRoles.length > 0) {
        targetRoles = [...b.targetRoles];
      }
      
      if (Array.isArray(b.targetOUs) && b.targetOUs.length > 0) {
        targetOUs = [...b.targetOUs];
      }
      
      // If the above didn't work, try to extract from targets array as fallback
      if ((targetRoles.length === 0 || targetOUs.length === 0) && b.targets && Array.isArray(b.targets)) {
        console.log(`[DEBUG] Extracting from targets array for broadcast ${b.id}:`, b.targets);
        
        b.targets.forEach((target: BroadcastTarget) => {
          if (target && target.dtargettype === 'role' && target.dtargetname) {
            targetRoles.push(target.dtargetname);
          } else if (target && target.dtargettype === 'ou' && target.dtargetname) {
            targetOUs.push(target.dtargetname);
          }
        });
      }

      console.log(`[DEBUG] Final targets for broadcast ${b.id}:`, { targetRoles, targetOUs });
      
      return {
        ...b,
        targetRoles, // Use the extracted target roles
        targetOUs,   // Use the extracted target OUs
        createdAt: new Date(b.createdAt),
        scheduledFor: b.scheduledFor ? new Date(b.scheduledFor) : undefined,
        eventDate: b.eventDate ? new Date(b.eventDate) : undefined
      };
    });

    // Load responses for all received broadcasts
    for (const broadcast of receivedBroadcasts) {
      await checkExistingResponse(broadcast.id);
    }

    console.log('✅ Received broadcasts loaded:', receivedBroadcasts);

  } catch (err) {
    console.error('Error loading received broadcasts:', err);
  } finally {
    isLoadingReceived = false;
  }
};

  const roles = ['admin', 'manager', 'supervisor', 'support', 'frontline'];
  const priorities = [
    { value: 'low', label: 'Low', color: 'text-green-600 bg-green-100' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-600 bg-yellow-100' },
    { value: 'high', label: 'High', color: 'text-red-600 bg-red-100' }
  ];

  const tabs = [
    { id: 'My Broadcasts', label: 'My Broadcasts' },
    { id: 'Received Broadcasts', label: 'Received Broadcasts' }
  ];


$effect(() => {
  console.log('🔍 Filter effect - search:', searchQuery, 'priority:', priorityFilter, 'responseStatus:', responseStatusFilter);
  if (activeTab === 'Received Broadcasts') {
    // Only reload from API if there are actual search or priority filters applied
    // Don't reload for default states (empty search + 'all' priority)
    if (searchQuery.trim() !== '' || priorityFilter !== 'all') {
      loadReceivedBroadcasts();
    }
    // Note: responseStatusFilter is client-side only, no API reload needed
  } else if (activeTab === 'My Broadcasts') {
    // Only reload for My Broadcasts if there are filters applied
    if (searchQuery.trim() !== '' || priorityFilter !== 'all') {
      loadMyBroadcasts();
    }
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
      // Only show completed if status is exactly 'done'
      if (!b.isActive && b.status !== 'done') return false;
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

let sortedReceivedBroadcasts = $derived(
  isLoadingReceived
    ? []
    : [...receivedBroadcasts]
        .filter(b => {
          // Apply search filter - only filter if search query exists
          if (searchQuery.trim() !== '') {
            const query = searchQuery.toLowerCase();
            const matchesTitle = b.title.toLowerCase().includes(query);
            const matchesContent = b.content.toLowerCase().includes(query);
            if (!matchesTitle && !matchesContent) return false;
          }
          
          // Apply priority filter - only filter if not 'all'
          if (priorityFilter !== 'all' && b.priority !== priorityFilter) return false;
          
          // Apply response status filter - only filter if not 'all'
          if (responseStatusFilter !== 'all') {
            const hasResponded = userResponses.has(b.id);
            if (responseStatusFilter === 'responded' && !hasResponded) return false;
            if (responseStatusFilter === 'unresponded' && hasResponded) return false;
            if (responseStatusFilter === 'done' && b.isActive) return false;
          }
          
          // Always show broadcasts regardless of isActive status (include done broadcasts)
          return true;
        })
        .sort((a, b) => {
          // Active first
          if (a.isActive !== b.isActive) {
            return a.isActive ? -1 : 1;
          }
          // Then by priority (high > medium > low)
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
          if (priorityDiff !== 0) return priorityDiff;
          // Then by creation date (newest first)
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        })
);

  let tabCounts = $derived((): { [key: string]: number } => {
  const myCount = broadcasts.filter(b => b.isActive).length;
  const receivedCount = receivedBroadcasts.filter(b => b.isActive).length;
  return {
    'My Broadcasts': myCount,
    'Received Broadcasts': receivedCount
  };
});

  let canSendBroadcasts = $derived(
    currentUser && ['admin', 'manager', 'supervisor'].includes(currentUser.role)
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

  const openBroadcastDetails = async (broadcast: Broadcast | ReceivedBroadcast) => {
    selectedBroadcast = broadcast;
    // Reset response states
    isAcknowledged = false;
    preferredDate = '';
    selectedChoice = '';
    textResponse = '';
    // Reset original values
    originalPreferredDate = '';
    originalSelectedChoice = '';
    originalTextResponse = '';
    
    // Check if user has already responded (for received broadcasts)
    if (activeTab === 'Received Broadcasts') {
      await checkExistingResponse(broadcast.id);
    }
  };

  const closeBroadcastDetails = () => {
    selectedBroadcast = null;
  };

  // Update the markBroadcastAsDone function
  const markBroadcastAsDone = async (broadcastId: string) => {
    try {
      // Call the API to update the backend
      const response = await broadcastAPI.markBroadcastAsDone(broadcastId);
      
      if (response.success) {
        // Update the local state
        const broadcastIndex = broadcasts.findIndex(b => b.id === broadcastId);
        if (broadcastIndex !== -1) {
          broadcasts[broadcastIndex].isActive = false;
          broadcasts[broadcastIndex].status = 'done';
          broadcasts = [...broadcasts]; // Trigger reactivity
        }
        
        // Close the modal
        selectedBroadcast = null;
        
        // Optional: Show success message
        console.log('✅ Broadcast marked as done successfully');
      }
    } catch (err) {
      console.error('❌ Error marking broadcast as done:', err);
      error = err instanceof Error ? err.message : 'Failed to mark broadcast as done';
      // Handle error - could show a toast notification
    }
  };

// svelte-ignore state_referenced_locally
let prevTab = $state(activeTab);

 $effect(() => {
  if (
    activeTab === 'Received Broadcasts' &&
    prevTab !== 'Received Broadcasts'
  ) {
    loadReceivedBroadcasts();
  }
  prevTab = activeTab;
});

 $effect(() => {
    const handleClickOutside = (event: Event) => {
      // Close OU dropdown if clicking outside
      if (showOUDropdown) {
        const target = event.target as Element;
        if (!target.closest('#ou-selector') && !target.closest('.absolute')) {
          showOUDropdown = false;
          ouSearchQuery = ''; // Reset search when closing
        }
      }
      
      // Close response status dropdown if clicking outside
      if (showResponseStatusDropdown) {
        const target = event.target as Element;
        if (!target.closest('.relative')) {
          showResponseStatusDropdown = false;
        }
      }
    };

    if (typeof window !== 'undefined') {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  });

// Update the CSV export function to work with your data structure
const exportCSV = (broadcast: Broadcast) => {
  console.log('Starting CSV export for broadcast:', broadcast.id);
  
  // If we don't have the report data loaded, load it first
  if (reportResponses.length === 0) {
    loadReportData(broadcast).then(() => {
      performCSVExport(broadcast);
    });
  } else {
    performCSVExport(broadcast);
  }
};

const performCSVExport = (broadcast: Broadcast) => {
  console.log('Performing CSV export with responses:', reportResponses);
  
  // Prepare CSV headers
  const headers = [
    'User Name',
    'Username',
    'Email',
    'Response Type',
    'Response Details',
    'Response Time',
    'Status'
  ];

  // Prepare CSV data rows
  const csvData = [];
  
  // Add broadcast details header section
  csvData.push([`Broadcast Response Report: ${broadcast.title}`]);
  csvData.push([`Generated on: ${new Date().toLocaleString()}`]);
  csvData.push(['']); // Empty row for spacing
  
  // Add detailed broadcast information
  csvData.push(['BROADCAST DETAILS']);
  csvData.push(['Title:', broadcast.title]);
  csvData.push(['Content:', broadcast.content]);
  csvData.push(['Priority:', broadcast.priority.toUpperCase()]);
  csvData.push(['Created By:', broadcast.createdBy]);
  csvData.push(['Created Date:', broadcast.createdAt ? new Date(broadcast.createdAt).toLocaleString() : 'N/A']);
  csvData.push(['Response Type:', getResponseTypeDisplay(broadcast.responseType)]);
  csvData.push(['Status:', broadcast.status.toUpperCase()]);
  
  // Add target information
  if (broadcast.targetRoles && broadcast.targetRoles.length > 0) {
    csvData.push(['Target Roles:', broadcast.targetRoles.join(', ')]);
  }
  if (broadcast.targetOUs && broadcast.targetOUs.length > 0) {
    csvData.push(['Target Organization Units:', broadcast.targetOUs.join(', ')]);
  }
  
  // Add scheduling information if applicable
  if (broadcast.scheduledFor) {
    csvData.push(['Scheduled For:', new Date(broadcast.scheduledFor).toLocaleString()]);
  }
  if (broadcast.sentAt) {
    csvData.push(['Sent At:', new Date(broadcast.sentAt).toLocaleString()]);
  }
  if (broadcast.eventDate) {
    csvData.push(['Event Date:', new Date(broadcast.eventDate).toLocaleString()]);
  }
  if (broadcast.endDate) {
    csvData.push(['End Date:', new Date(broadcast.endDate).toLocaleString()]);
  }
  
  // Add choices if it's a multiple choice broadcast
  if (broadcast.responseType === 'choices' && broadcast.choices && broadcast.choices.length > 0) {
    csvData.push(['Available Choices:', broadcast.choices.join(', ')]);
  }
  
  csvData.push(['']); // Empty row for spacing
  
  // Add column headers for response data
  csvData.push(['RESPONSE DATA']);
  csvData.push(headers);

  // Add response data
  if (reportResponses.length > 0) {
    reportResponses.forEach(response => {
      // Extract user information based on your backend structure
      const user = response.user || {};
      const userName = user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : (user.username || 'Unknown User');
      
      // Parse response data if it's a string
      let responseData = response.responseData;
      if (typeof responseData === 'string') {
        try {
          responseData = JSON.parse(responseData);
        } catch (e) {
          console.warn('Failed to parse response data:', responseData);
          responseData = {};
        }
      }
      
      const row = [
        userName,
        user.username || 'N/A',
        user.email || 'N/A',
        getResponseTypeDisplay(responseData?.responseType || broadcast.responseType),
        getResponseDetailsForExport(responseData, broadcast.responseType),
        response.acknowledgedAt ? new Date(response.acknowledgedAt).toLocaleString() : 'N/A',
        'Responded'
      ];
      csvData.push(row);
    });
  } else {
    // If no responses, add a row indicating this
    csvData.push(['No responses recorded', '', '', '', '', '', '']);
  }

  // Add simplified summary section (without total recipients and response rate)
  csvData.push(['']); // Empty row
  csvData.push(['SUMMARY']);
  csvData.push(['Total Responses:', reportResponses.length.toString()]);

  // Convert to CSV string
  const csvContent = csvData.map(row => 
    row.map(cell => {
      // Escape quotes and wrap in quotes if contains comma, newline, or quote
      const cellStr = String(cell || '');
      if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(',')
  ).join('\n');

  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `broadcast-responses-${broadcast.title.replace(/[^a-z0-9]/gi, '_')}-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  // Show success toast after successful export
  $toastStore.success(`CSV export completed! File: broadcast-responses-${broadcast.title.replace(/[^a-z0-9]/gi, '_')}-${new Date().toISOString().split('T')[0]}.csv`);
  
  console.log('CSV export completed');
};

// Update the loadReportData function to use the correct API and data structure
const loadReportData = async (broadcast: Broadcast) => {
  try {
    isLoadingReport = true;
    
    // Use the actual API call to get responses
    const response = await responseBroadcastAPI.getBroadcastResponses(broadcast.id);
    
    if (response.success) {
      reportResponses = response.responses || [];
      console.log('Loaded report responses:', reportResponses);
    } else {
      console.error('Failed to load report data:', response.message);
      reportResponses = [];
    }
  } catch (error) {
    console.error('Error loading report data:', error);
    reportResponses = [];
  } finally {
    isLoadingReport = false;
  }
};

// Helper function to display response type in a user-friendly way
const getResponseTypeDisplay = (responseType: string) => {
  switch (responseType) {
    case 'none':
      return 'No response required';
    case 'required':
      return 'Acknowledgment required';
    case 'preferred-date':
      return 'Preferred date selection';
    case 'choices':
      return 'Multiple choice';
    case 'textbox':
      return 'Text response';
    default:
      return responseType || 'Unknown';
  }
};

// Update the getResponseDetails function to handle both display and export
const getResponseDetailsForExport = (responseData: any, broadcastResponseType: string) => {
  if (!responseData) {
    return broadcastResponseType === 'none' ? 'No response required' : 'No response';
  }
  
  switch (responseData.responseType) {
    case 'required':
      return 'Acknowledged';
    case 'preferred-date':
      return `Preferred date: ${responseData.preferredDate ? new Date(responseData.preferredDate).toLocaleDateString() : 'Not specified'}`;
    case 'choices':
      return `Selected: ${responseData.selectedChoice || 'Not specified'}`;
    case 'textbox':
      return `Response: ${responseData.textResponse || 'No text provided'}`;
    default:
      return 'Response recorded';
  }
};

  const viewReport = async (broadcast: Broadcast, e: MouseEvent) => {
    e.stopPropagation(); // Prevent opening the broadcast details modal
    reportBroadcast = broadcast;
    showReportModal = true;
    await loadBroadcastResponses(broadcast.id);
  };

  // Also update the loadBroadcastResponses function to ensure it's working correctly
const loadBroadcastResponses = async (broadcastId: string) => {
  try {
    isLoadingReport = true;
    const response = await responseBroadcastAPI.getBroadcastResponses(broadcastId);
    if (response.success) {
      // Process the responses with proper date handling
      reportResponses = response.responses.map((resp: any) => ({
        ...resp,
        acknowledgedAt: resp.acknowledgedAt ? new Date(resp.acknowledgedAt) : null
      }));
      console.log('Loaded broadcast responses:', reportResponses);
    } else {
      console.error('Failed to load responses:', response);
      reportResponses = [];
    }
  } catch (error) {
    console.error('Error loading broadcast responses:', error);
    $toastStore.error('Failed to load response data');
    reportResponses = [];
  } finally {
    isLoadingReport = false;
  }
};
  
  // Add this helper function for formatting
  const formatResponse = (responseData: any) => {
    if (!responseData) return 'Acknowledged';
    
    switch (responseData.responseType) {
      case 'preferred-date':
        return `${new Date(responseData.preferredDate).toLocaleString()}`;
      case 'choices':
        return responseData.selectedChoice;
      case 'textbox':
        return responseData.textResponse;
      default:
        return 'Acknowledged';
    }
  };

const createBroadcast = async () => {
  if (newBroadcast.title.trim() && newBroadcast.content.trim()) {
    try {
      isCreatingBroadcast = true;
      apiError = '';
      
      const broadcastData: CreateBroadcastRequest = {
        title: newBroadcast.title.trim(),
        content: newBroadcast.content.trim(),
        priority: newBroadcast.priority,
        // Ensure all role IDs are strings
        targetRoles: newBroadcast.targetRoles.map(role => String(role)),
        // Ensure all OU IDs are strings too
        targetOUs: newBroadcast.targetOUs.map(ou => String(ou)),
        responseType: newBroadcast.acknowledgmentType,
        requiresAcknowledgment: newBroadcast.acknowledgmentType !== 'none',
        scheduledFor: newBroadcast.scheduleType === 'pick' ? newBroadcast.scheduledFor : null,
        endDate: newBroadcast.endDate || null,
        choices: newBroadcast.acknowledgmentType === 'choices' 
          ? newBroadcast.choices.filter(choice => choice.trim() !== '')
          : null
      };
          
      console.log('Sending broadcast data to API:', broadcastData);
      
      const response = await BroadcastAPI.createBroadcast(broadcastData);
      
      if (response.ok) {
        // Close the modal first
        closeCreateModal();
        
        // Display success message
        $toastStore.success('Broadcast created successfully!');
        
        // Reload broadcasts from API to ensure we get the correct role/OU names
        await loadMyBroadcasts();
      } else {
        throw new Error(response.message || 'Failed to create broadcast');
      }
    } catch (error: any) {
      console.error('Error creating broadcast:', error);
      apiError = error.message || 'An error occurred while creating the broadcast';
      $toastStore.error(apiError);
    } finally {
      isCreatingBroadcast = false;
    }
  }
};

// Add this function to close the modal and reset the form
const closeCreateModal = () => {
  showCreateBroadcast = false;
  apiError = '';
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
  showSaveTemplate = false;
  templateName = '';
};

// Add missing template functions
const loadTemplate = (templateId: string) => {
  const template = templates.find(t => t.id === templateId);
  if (template) {
    newBroadcast = {
      title: template.title,
      content: template.content,
      priority: template.priority,
      targetRoles: template.targetRoles || [],
      targetOUs: template.targetOUs || [],
      acknowledgmentType: template.acknowledgmentType,
      scheduleType: 'now',
      eventDate: '',
      scheduledFor: '',
      endDate: '',
      choices: template.choices || ['']
    };
  }
};

const saveAsTemplate = async () => {
    if (templateName.trim() && newBroadcast.title.trim() && newBroadcast.content.trim()) {
      try {
        isSavingTemplate = true;
        
        // Properly filter and clean up choices
        let processedChoices = null;
        if (newBroadcast.acknowledgmentType === 'choices') {
          processedChoices = newBroadcast.choices
            .filter(choice => typeof choice === 'string' && choice.trim() !== '')
            .map(choice => choice.trim());
          
          // Don't send an empty array
          if (processedChoices.length === 0) {
            processedChoices = null;
          }
        }
        
        const templateData: SaveTemplateRequest = {
          name: templateName.trim(),
          title: newBroadcast.title.trim(),
          content: newBroadcast.content.trim(),
          priority: newBroadcast.priority,
          acknowledgmentType: newBroadcast.acknowledgmentType,
          choices: processedChoices,
          targetOUs: newBroadcast.targetOUs,
          targetRoles: newBroadcast.targetRoles
        };
        
        console.log('Saving template with data:', templateData);
        const response = await BroadcastAPI.saveTemplate(templateData);
        
        if (response.ok) {
          templates = [response.template, ...templates];
          templateName = '';
          showSaveTemplate = false;
          
          // Reset the form after saving template
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
          
          $toastStore.success('Template saved successfully!');
        } else {
          throw new Error(response.message || 'Failed to save template');
        }
      } catch (error: any) {
        console.error('Error saving template:', error);
        $toastStore.error(error.message || 'An error occurred while saving the template');
      } finally {
        isSavingTemplate = false;
      }
    }
  };

  const deleteTemplate = async () => {
    if (!selectedTemplate) return;
    
    // Show the confirmation modal instead of using confirm()
    templateToDelete = selectedTemplate;
    showDeleteTemplateModal = true;
  };

  const confirmDeleteTemplate = async () => {
    try {
      if (!templateToDelete) return;
      
      const response = await BroadcastAPI.deleteTemplate(templateToDelete);
      
      if (response.ok) {
        // Remove template from local state
        templates = templates.filter(t => t.id !== templateToDelete);
        // Clear selection
        selectedTemplate = '';
        // Reset form
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
        $toastStore.success('Template deleted successfully!');
      } else {
        throw new Error(response.message || 'Failed to delete template');
      }
    } catch (error: any) {
      console.error('Error deleting template:', error);
      $toastStore.error(error.message || 'An error occurred while deleting the template');
    } finally {
      // Close the modal
      showDeleteTemplateModal = false;
      templateToDelete = null;
    }
  };

// Load templates and available roles/OUs on mount
onMount(async () => {
  console.log('🔄 Component mounted, activeTab:', activeTab);
  loadMyBroadcasts();
  loadReceivedBroadcasts();
  
  try {
    isLoadingOUs = true;
    isLoadingRoles = true;
    isLoadingTemplates = true;
    
    // Load all data in parallel for better performance
    const [ousResponse, rolesResponse, templatesResponse] = await Promise.all([
      BroadcastAPI.getOrganizationalUnits(),
      BroadcastAPI.getRoles(),
      BroadcastAPI.getTemplates()
    ]);
    
    // Use only the API data
    availableOUs = ousResponse.organizationalUnits || [];
    availableRoles = rolesResponse.roles || [];
    templates = templatesResponse.templates || [];
    
    console.log('Loaded OUs:', availableOUs);
    console.log('Loaded Roles:', availableRoles);
    console.log('Loaded Templates:', templates);
  } catch (error: any) {
    console.error('Failed to load broadcast data:', error);
    
    // Initialize with empty arrays if loading fails
    availableOUs = [];
    availableRoles = [];
    templates = [];
    
    apiError = 'Failed to load data. Please try again later.';
  } finally {
    isLoadingOUs = false;
    isLoadingRoles = false;
    isLoadingTemplates = false;
  }
});

 // Update response handlers to store responses locally
  const handleAcknowledgment = async (broadcastId: string) => {
    try {
      const response = await responseBroadcastAPI.submitAcknowledgment(broadcastId);
      
      // Store the response locally
      userResponses.set(broadcastId, response.response);
      isAcknowledged = true;
      
      $toastStore.success('Broadcast acknowledged successfully!');
    } catch (error) {
      console.error('Error acknowledging broadcast:', error);
      $toastStore.error('Failed to acknowledge broadcast');
    }
  };

  const handlePreferredDateResponse = async (broadcastId: string, date: string) => {
    try {
      const response = await responseBroadcastAPI.submitPreferredDate(broadcastId, date);
      
      // Store the response locally
      userResponses.set(broadcastId, response.response);
      
      $toastStore.success(`Preferred date submitted: ${new Date(date).toLocaleString()}`);
    } catch (error) {
      console.error('Error submitting preferred date:', error);
      $toastStore.error('Failed to submit preferred date');
    }
  };

  const handleChoiceResponse = async (broadcastId: string, choice: string) => {
    try {
      const response = await responseBroadcastAPI.submitChoice(broadcastId, choice);
      
      // Store the response locally
      userResponses.set(broadcastId, response.response);
      
      $toastStore.success(`Response submitted: ${choice}`);
    } catch (error) {
      console.error('Error submitting choice:', error);
      $toastStore.error('Failed to submit response');
    }
  };

  const handleTextResponse = async (broadcastId: string, response: string) => {
    try {
      const apiResponse = await responseBroadcastAPI.submitTextResponse(broadcastId, response);
      
      // Store the response locally
      userResponses.set(broadcastId, apiResponse.response);
      
      $toastStore.success('Text response submitted successfully!');
    } catch (error) {
      console.error('Error submitting text response:', error);
      $toastStore.error('Failed to submit response');
    }
  };

  // Function to check if user has already responded
  const checkExistingResponse = async (broadcastId: string) => {
    try {
      const response = await responseBroadcastAPI.getUserResponse(broadcastId);
      if (response.response) {
        // Store the response in our map
        userResponses.set(broadcastId, response.response);
        
        // User has already responded - check the responseType from responseData
        const responseData = response.response.responseData;
        isAcknowledged = responseData.responseType === 'required';
        
        if (responseData.responseType === 'preferred-date') {
          preferredDate = responseData.preferredDate || '';
          originalPreferredDate = responseData.preferredDate || '';
        }
        if (responseData.responseType === 'choices') {
          selectedChoice = responseData.selectedChoice || '';
          originalSelectedChoice = responseData.selectedChoice || '';
        }
        if (responseData.responseType === 'textbox') {
          textResponse = responseData.textResponse || '';
          originalTextResponse = responseData.textResponse || '';
        }
      } else {
        // No response found, remove from map if it exists
        userResponses.delete(broadcastId);
        // Reset original values
        originalPreferredDate = '';
        originalSelectedChoice = '';
        originalTextResponse = '';
      }
    } catch (error) {
      console.error('Error checking existing response:', error);
    }
  };

    // Function to get user's response for display
  const getUserResponseForBroadcast = (broadcastId: string) => {
    return userResponses.get(broadcastId);
  };

  // Function to format response for display
  const formatResponseDisplay = (response: any) => {
    if (!response || !response.responseData) return '';
    
    const data = response.responseData;
    
    switch (data.responseType) {
      case 'required':
        return 'Acknowledged';
      case 'preferred-date':
        return `Preferred date: ${new Date(data.preferredDate).toLocaleString()}`;
      case 'choices':
        return `Selected: ${data.selectedChoice}`;
      case 'textbox':
        return `Response: ${data.textResponse}`;
      default:
        return '';
    }
  };

  // Filter OUs based on search query
  let filteredOUs = $derived(
    availableOUs.filter(ou => 
      ou.name.toLowerCase().includes(ouSearchQuery.toLowerCase())
    )
  );

  // Function to toggle all OUs
  const toggleAllOUs = () => {
    if (newBroadcast.targetOUs.length === availableOUs.length) {
      // Deselect all
      newBroadcast.targetOUs = [];
    } else {
      // Select all
      newBroadcast.targetOUs = availableOUs.map(ou => ou.id);
    }
  };

  // Check if all OUs are selected
  let allOUsSelected = $derived(
    availableOUs.length > 0 && newBroadcast.targetOUs.length === availableOUs.length
  );



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

  <!-- Create Broadcast Modal -->
  {#if showCreateBroadcast}
    <div class="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200">
        <!-- Modal Header -->
        <div class="border-b border-gray-200 p-6">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-2xl font-bold text-gray-800">Create New Broadcast</h2>
              <p class="text-sm text-gray-600 mt-1">Send an announcement to your organization</p>
            </div>
            <button
              onclick={closeCreateModal}
              class="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>
        
        <div class="p-6">
          <form onsubmit={(e) => { e.preventDefault(); createBroadcast(); }} class="space-y-8">
            
            <!-- Template Section -->
            <div class="bg-blue-50 rounded-lg p-5 border border-blue-200">
              <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <span class="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">📋</span>
                Templates
              </h3>
              
              <div class="flex flex-col sm:flex-row gap-4">
                <div class="flex-1">
                  <label for="templateSelect" class="block text-sm font-medium text-gray-700 mb-2">Load from Template</label>
                    <div class="flex space-x-3">
                      {#if isLoadingTemplates}
                      <div class="input-field flex-1 flex items-center justify-center">
                        <span class="text-gray-500">Loading templates...</span>
                      </div>
                    {:else}
                      <select 
                      id="templateSelect" 
                      bind:value={selectedTemplate}
                      onchange={() => {
                        if (selectedTemplate) {
                          loadTemplate(selectedTemplate);
                        } else {
                          // Reset the form to default values when "No Template" is selected
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
                        }
                      }}
                      class="input-field flex-1"
                    >
                      <option value="">No Template</option>
                      {#each templates as template}
                        <option value={template.id}>{template.name}</option>
                      {/each}
                    </select>
                      {#if selectedTemplate}
                        <button
                          type="button"
                          onclick={() => { 
                            selectedTemplate = ''; 
                            // Reset the form to default values
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
                          }}
                          class="secondary-button whitespace-nowrap"
                        >
                          Clear
                        </button>
                      {/if}
                    {/if}
                  </div>
                </div>
                
                <div class="sm:border-l sm:border-gray-300 sm:pl-4">
                  <span class="block text-sm font-medium text-gray-700 mb-2">Save Current as Template</span>
                  {#if !showSaveTemplate}
                    <!-- This button SHOWS the template name input -->
                    <button
                      type="button"
                      onclick={() => showSaveTemplate = true}
                      disabled={!newBroadcast.title.trim() || !newBroadcast.content.trim()}
                      class="primary-button whitespace-nowrap text-sm px-3 py-2 disabled:opacity-50"
                    >
                      Save as Template
                    </button>
                  {:else}
                    <div class="flex space-x-2">
                      <input
                        type="text"
                        bind:value={templateName}
                        placeholder="Template name..."
                        class="input-field flex-1 min-w-32"
                      />
                      <!-- This button PERFORMS the save operation -->
                      <button
                        type="button"
                        onclick={saveAsTemplate}
                        disabled={!templateName.trim() || isSavingTemplate}
                        class="primary-button whitespace-nowrap text-sm px-3 py-2 disabled:opacity-50"
                      >
                        {isSavingTemplate ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onclick={() => { showSaveTemplate = false; templateName = ''; }}
                        class="secondary-button text-sm px-3 py-2"
                      >
                        Cancel
                      </button>
                    </div>
                  {/if}
                  {#if selectedTemplate}
                    <div class="mt-2">
                      <button
                        type="button"
                        onclick={deleteTemplate}
                        class="text-red-600 hover:text-red-700 text-sm flex items-center space-x-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2">
                          <path d="M3 6h18"></path>
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                          <line x1="10" x2="10" y1="11" y2="17"></line>
                          <line x1="14" x2="14" y1="11" y2="17"></line>
                        </svg>
                        <span>Delete Template</span>
                      </button>
                    </div>
                  {/if}
                </div>
              </div>
              
              <p class="text-xs text-gray-500 mt-3">
                Templates help you quickly create broadcasts with predefined content and settings. Load a template to auto-fill the form, or save your current broadcast as a template for future use.
              </p>
            </div>

            <!-- Section 1: Basic Information -->
            <div class="bg-gray-50 rounded-lg p-5">
              <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <span class="w-6 h-6 bg-[#01c0a4] text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">1</span>
                Basic Information
              </h3>
              
              <div class="space-y-4">
                <div>
                  <label for="title" class="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                  <input
                    id="title"
                    bind:value={newBroadcast.title}
                    placeholder="Enter a clear, descriptive title"
                    required
                    class="input-field"
                  />
                </div>

                <div>
                  <label for="content" class="block text-sm font-medium text-gray-700 mb-2">Message Content *</label>
                  <textarea
                    id="content"
                    bind:value={newBroadcast.content}
                    placeholder="Write your broadcast message here..."
                    required
                    rows="4"
                    class="input-field resize-none"
                  ></textarea>
                </div>

                <div>
                  <label for="priority" class="block text-sm font-medium text-gray-700 mb-2">Priority Level</label>
                  <select id="priority" bind:value={newBroadcast.priority} class="input-field">
                    {#each priorities as priority}
                      <option value={priority.value}>{priority.label}</option>
                    {/each}
                  </select>
                  <p class="text-xs text-gray-500 mt-1">High priority broadcasts will be highlighted with a red border</p>
                </div>
              </div>
            </div>

            <!-- Section 2: Target Audience -->
            <div class="bg-gray-50 rounded-lg p-5">
              <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <span class="w-6 h-6 bg-[#01c0a4] text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">2</span>
                Target Audience
              </h3>

              <!-- Organizational Unit Selector -->
              <div class="space-y-4">
              <div>
                <label for="ou-selector" class="block text-sm font-medium text-gray-700 mb-2">Organizational Units *</label>
                <div class="relative">
                  <button
                    id="ou-selector"
                    type="button"
                    onclick={() => showOUDropdown = !showOUDropdown}
                    class="input-field w-full text-left flex items-center justify-between"
                  >
                    {#if newBroadcast.targetOUs.length === 0}
                      <span class="text-gray-400">Select Organizational Units</span>
                    {:else}
                      <span>
                        {newBroadcast.targetOUs.length} unit{newBroadcast.targetOUs.length !== 1 ? 's' : ''} selected
                      </span>
                    {/if}
                    <ChevronDown class="w-4 h-4 text-gray-400" />
                  </button>
                  
                  {#if showOUDropdown}
                    <div class="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-hidden">
                      <!-- Search input -->
                      <div class="p-2 border-b border-gray-200">
                        <input
                          type="text"
                          bind:value={ouSearchQuery}
                          placeholder="Search organizational units..."
                          class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#01c0a4] focus:border-[#01c0a4]"
                          onclick={(e) => e.stopPropagation()}
                        />
                      </div>
                      
                      <div class="max-h-48 overflow-y-auto">
                        {#if isLoadingOUs}
                          <div class="p-3 text-center text-gray-500">Loading organizational units...</div>
                        {:else if availableOUs.length === 0}
                          <div class="p-3 text-center text-gray-500">No organizational units found</div>
                        {:else}
                          <!-- Select All option -->
                          <div class="p-2 hover:bg-gray-100 border-b border-gray-100">
                            <label class="flex items-center space-x-2 cursor-pointer w-full font-medium">
                              <input
                                type="checkbox"
                                checked={allOUsSelected}
                                onclick={(e) => {
                                  e.stopPropagation();
                                  toggleAllOUs();
                                }}
                                class="rounded border-gray-300 text-[#01c0a4] focus:ring-[#01c0a4]"
                              />
                              <span class="text-[#01c0a4]">
                                {allOUsSelected ? 'Deselect All' : 'Select All'} ({availableOUs.length})
                              </span>
                            </label>
                          </div>
                          
                          {#if filteredOUs.length === 0}
                            <div class="p-3 text-center text-gray-500">
                              No units match "{ouSearchQuery}"
                            </div>
                          {:else}
                            {#each filteredOUs as ou}
                              <div class="p-2 hover:bg-gray-100">
                                <label class="flex items-center space-x-2 cursor-pointer w-full">
                                  <input
                                    type="checkbox"
                                    checked={newBroadcast.targetOUs.includes(ou.id)}
                                    onclick={(e) => {
                                      e.stopPropagation();
                                      const index = newBroadcast.targetOUs.indexOf(ou.id);
                                      if (index === -1) {
                                        newBroadcast.targetOUs = [...newBroadcast.targetOUs, ou.id];
                                      } else {
                                        newBroadcast.targetOUs = newBroadcast.targetOUs.filter(id => id !== ou.id);
                                      }
                                    }}
                                    class="rounded border-gray-300 text-[#01c0a4] focus:ring-[#01c0a4]"
                                  />
                                  <span>{ou.name}</span>
                                </label>
                              </div>
                            {/each}
                          {/if}
                        {/if}
                      </div>
                    </div>
                  {/if}
                </div>

                <!-- Show selected OUs count and names -->
                {#if newBroadcast.targetOUs.length > 0}
                  <div class="mt-2 text-xs text-gray-600">
                    <span class="font-medium">Selected:</span>
                    {#if newBroadcast.targetOUs.length <= 5}
                      {newBroadcast.targetOUs.map(id => availableOUs.find(ou => ou.id === id)?.name).filter(Boolean).join(', ')}
                    {:else}
                      {newBroadcast.targetOUs.slice(0, 3).map(id => availableOUs.find(ou => ou.id === id)?.name).filter(Boolean).join(', ')} 
                      and {newBroadcast.targetOUs.length - 3} more
                    {/if}
                  </div>
                {/if}
              </div>

                <!-- Target Roles selection -->
                <div>
                  <span class="block text-sm font-medium text-gray-700 mb-3">Target Roles *</span>
                  <div class="grid grid-cols-2 gap-3">
                    {#if isLoadingRoles}
                      <div class="col-span-2 p-3 text-center text-gray-500">Loading roles...</div>
                    {:else}
                      {#each availableRoles as role}
                        <div class="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="role-{role.id}"
                            checked={newBroadcast.targetRoles.includes(role.id)}
                            onclick={() => {
                              const index = newBroadcast.targetRoles.indexOf(role.id);
                              if (index === -1) {
                                newBroadcast.targetRoles = [...newBroadcast.targetRoles, role.id];
                              } else {
                                newBroadcast.targetRoles = newBroadcast.targetRoles.filter(id => id !== role.id);
                              }
                            }}
                            class="rounded border-gray-300 text-[#01c0a4] focus:ring-[#01c0a4]"
                          />
                          <label for="role-{role.id}" class="text-sm text-gray-700 cursor-pointer">
                            {role.name}
                          </label>
                        </div>
                      {/each}
                    {/if}
                  </div>
                </div>
              </div>

            <!-- Section 3: Response Settings -->
            <div class="bg-gray-50 rounded-lg p-5">
              <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <span class="w-6 h-6 bg-[#01c0a4] text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">3</span>
                Response Settings
              </h3>
              
              <div class="space-y-4">
                <div>
                  <label for="acknowledgmentType" class="block text-sm font-medium text-gray-700 mb-2">Response Type</label>
                  <select id="acknowledgmentType" bind:value={newBroadcast.acknowledgmentType} class="input-field">
                    <option value="none">No Response Required</option>
                    <option value="required">Requires Acknowledgment</option>
                    <option value="preferred-date">Preferred Date Selection</option>
                    <option value="choices">Multiple Choice Options</option>
                    <option value="textbox">Text Response</option>
                  </select>
                  <p class="text-xs text-gray-500 mt-1">
                    {#if newBroadcast.acknowledgmentType === 'none'}
                      Recipients will receive the broadcast without needing to respond
                    {:else if newBroadcast.acknowledgmentType === 'required'}
                      Recipients must acknowledge they have read the broadcast
                    {:else if newBroadcast.acknowledgmentType === 'preferred-date'}
                      Recipients can select their preferred date/time
                    {:else if newBroadcast.acknowledgmentType === 'choices'}
                      Recipients can choose from predefined options
                    {:else if newBroadcast.acknowledgmentType === 'textbox'}
                      Recipients can provide a written response
                    {/if}
                  </p>
                </div>

                <!-- Dynamic Choices Section -->
                {#if newBroadcast.acknowledgmentType === 'choices'}
                  <div class="bg-white rounded border border-gray-200 p-4">
                    <span class="block text-sm font-medium text-gray-700 mb-3">Choice Options</span>
                    <div class="space-y-3">
                      {#each newBroadcast.choices as choice, index}
                        <div class="flex space-x-2">
                          <input
                            type="text"
                            bind:value={newBroadcast.choices[index]}
                            placeholder="Option {index + 1}"
                            class="input-field flex-1"
                          />
                          {#if newBroadcast.choices.length > 1}
                            <button
                              type="button"
                              onclick={() => newBroadcast.choices.splice(index, 1)}
                              class="px-3 py-2 text-red-600 hover:text-red-800 text-sm font-medium"
                            >
                              Remove
                            </button>
                          {/if}
                        </div>
                      {/each}
                      {#if newBroadcast.choices.length < 8}
                        <button
                          type="button"
                          onclick={() => newBroadcast.choices.push('')}
                          class="text-sm text-[#01c0a4] hover:text-[#00a085] font-medium"
                        >
                          + Add Another Option
                        </button>
                      {:else}
                        <p class="text-xs text-gray-500 italic">Maximum of 8 options allowed</p>
                      {/if}
                    </div>
                  </div>
                {/if}
              </div>
            </div>

            <!-- Section 4: Scheduling -->
            <div class="bg-gray-50 rounded-lg p-5">
              <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <span class="w-6 h-6 bg-[#01c0a4] text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">4</span>
                Scheduling
              </h3>
              
              <div class="space-y-4">
                <div>
                  <span class="block text-sm font-medium text-gray-700 mb-3">When to send this broadcast?</span>
                  <div class="space-y-3">
                    <label class="flex items-start space-x-3 p-3 bg-white rounded border border-gray-200 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        bind:group={newBroadcast.scheduleType}
                        value="now"
                        class="mt-1 rounded border-gray-300 text-[#01c0a4] focus:ring-[#01c0a4]"
                      />
                      <div>
                        <span class="text-sm font-medium">Send Immediately</span>
                        <p class="text-xs text-gray-500">The broadcast will be sent as soon as you create it</p>
                      </div>
                    </label>
                    <label class="flex items-start space-x-3 p-3 bg-white rounded border border-gray-200 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        bind:group={newBroadcast.scheduleType}
                        value="pick"
                        class="mt-1 rounded border-gray-300 text-[#01c0a4] focus:ring-[#01c0a4]"
                      />
                      <div>
                        <span class="text-sm font-medium">Schedule for Later</span>
                        <p class="text-xs text-gray-500">Choose a specific date and time to send the broadcast</p>
                      </div>
                    </label>
                  </div>
                </div>

                <!-- Schedule Details (conditional) -->
                {#if newBroadcast.scheduleType === 'pick'}
                  <div class="bg-white rounded border border-gray-200 p-4">
                    <label for="scheduledFor" class="block text-sm font-medium text-gray-700 mb-2">Schedule Date & Time</label>
                      <div 
                        class="relative w-full cursor-pointer"
                        onclick={() => document.getElementById('scheduledFor')?.showPicker?.()}
                      >
                      <input
                        id="scheduledFor"
                        type="datetime-local"
                        bind:value={newBroadcast.scheduledFor}
                        class="input-field cursor-pointer"
                      />
                    </div>
                  </div>
                {/if}
                
                <!-- End Date -->
                <div class="bg-white rounded border border-gray-200 p-4">
                  <label for="endDate" class="block text-sm font-medium text-gray-700 mb-2">End Date (Optional)</label>
                  <p class="text-xs text-gray-500 mb-3">Set when this broadcast should expire and be marked as "Done"</p>
                  <input
                    id="endDate"
                    type="datetime-local"
                    bind:value={newBroadcast.endDate}
                    onclick={(e) => (e.target as HTMLInputElement).showPicker()}
                    class="input-field w-full cursor-pointer"
                    placeholder="Select end date..."
                  />
                </div>
              </div>

            <!-- Show API error if any -->
            {#if apiError}
              <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
                <strong class="font-bold">Error:</strong>
                <span class="block sm:inline">{apiError}</span>
              </div>
            {/if}

            <!-- Actions -->
            <div class="flex justify-between pt-6 border-t border-gray-200">
              <button
                type="button"
                onclick={closeCreateModal}
                class="secondary-button"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                class="primary-button disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!newBroadcast.title.trim() || !newBroadcast.content.trim() || newBroadcast.targetRoles.length === 0 || newBroadcast.targetOUs.length === 0 || isCreatingBroadcast}
              >
                {#if isCreatingBroadcast}
                  <span class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                  {newBroadcast.scheduleType === 'now' ? 'Sending...' : 'Scheduling...'}
                {:else}
                  {newBroadcast.scheduleType === 'now' ? 'Send Broadcast' : 'Schedule Broadcast'}
                {/if}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  {/if}

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
      
      <!-- Priority Filter Dropdown -->
<div class="relative">
  <button
    onclick={() => showFilterDropdown = !showFilterDropdown}
    class="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-[#01c0a4] focus:border-[#01c0a4]"
  >
    <Filter class="h-4 w-4 mr-2" />
    {priorityFilter === 'all' ? 'All Priorities' : priorityFilter.charAt(0).toUpperCase() + priorityFilter.slice(1) + ' Priority'}
    <ChevronDown class="h-4 w-4 ml-2 {showFilterDropdown ? 'rotate-180' : ''} transition-transform" />
  </button>
  
  {#if showFilterDropdown}
    <!-- Add backdrop to close dropdown when clicking outside -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div 
      class="fixed inset-0 z-10" 
      onclick={() => showFilterDropdown = false}
    ></div>
    
    <div class="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
      <div class="py-1">
        <button
          onclick={(e) => { 
            e.stopPropagation(); 
            priorityFilter = 'all'; 
            showFilterDropdown = false; 
          }}
          class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left transition-colors {priorityFilter === 'all' ? 'bg-gray-100 font-medium' : ''}"
        >
          <div class="flex items-center space-x-2">
            <div class="w-3 h-3 bg-gray-400 rounded-full"></div>
            <span>All Priorities</span>
            {#if priorityFilter === 'all'}
              <CheckCircle class="w-4 h-4 ml-auto text-[#01c0a4]" />
            {/if}
          </div>
        </button>
        <button
          onclick={(e) => { 
            e.stopPropagation(); 
            priorityFilter = 'high'; 
            showFilterDropdown = false; 
          }}
          class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left transition-colors {priorityFilter === 'high' ? 'bg-red-50 font-medium' : ''}"
        >
          <div class="flex items-center space-x-2">
            <div class="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>High Priority</span>
            {#if priorityFilter === 'high'}
              <CheckCircle class="w-4 h-4 ml-auto text-[#01c0a4]" />
            {/if}
          </div>
        </button>
        <button
          onclick={(e) => { 
            e.stopPropagation(); 
            priorityFilter = 'medium'; 
            showFilterDropdown = false; 
          }}
          class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left transition-colors {priorityFilter === 'medium' ? 'bg-yellow-50 font-medium' : ''}"
        >
          <div class="flex items-center space-x-2">
            <div class="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span>Medium Priority</span>
            {#if priorityFilter === 'medium'}
              <CheckCircle class="w-4 h-4 ml-auto text-[#01c0a4]" />
            {/if}
          </div>
        </button>
        <button
          onclick={(e) => { 
            e.stopPropagation(); 
            priorityFilter = 'low'; 
            showFilterDropdown = false; 
          }}
          class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left transition-colors {priorityFilter === 'low' ? 'bg-green-50 font-medium' : ''}"
        >
          <div class="flex items-center space-x-2">
            <div class="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Low Priority</span>
            {#if priorityFilter === 'low'}
              <CheckCircle class="w-4 h-4 ml-auto text-[#01c0a4]" />
            {/if}
          </div>
        </button>
      </div>
    </div>
  {/if}
</div>

      <!-- Response Status Filter Dropdown (only show for Received Broadcasts tab) -->
      {#if activeTab === 'Received Broadcasts'}
        <div class="relative">
          <button
            onclick={() => showResponseStatusDropdown = !showResponseStatusDropdown}
            class="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-[#01c0a4] focus:border-[#01c0a4]"
          >
            <CheckCircle class="h-4 w-4 mr-2" />
            {#if responseStatusFilter === 'all'}
              All Status
            {:else if responseStatusFilter === 'responded'}
              Responded
            {:else if responseStatusFilter === 'unresponded'}
              Unresponded
            {:else if responseStatusFilter === 'done'}
              Completed
            {/if}
          </button>
          
          {#if showResponseStatusDropdown}
            <div class="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
              <div class="py-1">
                <button
                  onclick={() => { responseStatusFilter = 'all'; showResponseStatusDropdown = false; }}
                  class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left {responseStatusFilter === 'all' ? 'bg-gray-100' : ''}"
                >
                  <div class="flex items-center space-x-2">
                    <div class="w-3 h-3 bg-gray-400 rounded-full"></div>
                    <span>All Status</span>
                  </div>
                </button>
                <button
                  onclick={() => { responseStatusFilter = 'responded'; showResponseStatusDropdown = false; }}
                  class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left {responseStatusFilter === 'responded' ? 'bg-gray-100' : ''}"
                >
                  <div class="flex items-center space-x-2">
                    <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>Responded</span>
                  </div>
                </button>
                <button
                  onclick={() => { responseStatusFilter = 'unresponded'; showResponseStatusDropdown = false; }}
                  class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left {responseStatusFilter === 'unresponded' ? 'bg-gray-100' : ''}"
                >
                  <div class="flex items-center space-x-2">
                    <div class="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <span>Unresponded</span>
                  </div>
                </button>
                <button
                  onclick={() => { responseStatusFilter = 'done'; showResponseStatusDropdown = false; }}
                  class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left {responseStatusFilter === 'done' ? 'bg-gray-100' : ''}"
                >
                  <div class="flex items-center space-x-2">
                    <div class="w-3 h-3 bg-gray-500 rounded-full"></div>
                    <span>Completed</span>
                  </div>
                </button>
              </div>
            </div>
          {/if}
        </div>
      {/if}
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
              onclick={() => loadMyBroadcasts()}
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
          {@const isBroadcastDone = !broadcast.isActive}
          
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
                
                <div class="flex items-center space-x-4 text-sm {isBroadcastDone ? 'text-gray-400' : 'text-gray-500'} flex-wrap">
                  <div class="flex items-center space-x-1">
                    <Calendar class="w-4 h-4 flex-shrink-0" />
                    <span class="whitespace-nowrap">{formatDate(broadcast.createdAt)}</span>
                  </div>
                  <div class="flex items-center space-x-1">
                    <Users class="w-4 h-4 flex-shrink-0" />
                    <span class="truncate">{Array.isArray(broadcast.targetRoles) && broadcast.targetRoles.length > 0 ? broadcast.targetRoles.join(', ') : 'All'}</span>
                  </div>
                  <div class="flex items-center space-x-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 flex-shrink-0"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
                    <span class="truncate">{Array.isArray(broadcast.targetOUs) && broadcast.targetOUs.length > 0 ? broadcast.targetOUs.join(', ') : 'All'}</span>
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
                  <div class="flex items-center space-x-2 text-sm text-gray-600">
                    <CheckCircle class="w-4 h-4 flex-shrink-0" />
                    <span class="break-words">{broadcast.acknowledgments.length} acknowledgments</span>
                  </div>
                <div class="space-y-2">
                  <button 
                    onclick={(e) => { e.stopPropagation(); exportCSV(broadcast); }}
                    class="text-sm text-[#01c0a4] hover:text-[#00a085] flex items-center space-x-1 whitespace-nowrap"
                  >
                    <Download class="w-4 h-4" />
                    <span>Export to CSV</span>
                  </button>
                  <button 
                    onclick={(e) => viewReport(broadcast, e)}
                    class="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1 whitespace-nowrap"
                  >
                    <FileText class="w-4 h-4" />
                    <span>View Report</span>
                  </button>
                </div>
              </div>
            {/if}
            </div>
          </div>
        {/each}
      {/if}
    
    
    {:else if activeTab === 'Received Broadcasts'}
  {#if isLoadingReceived}
    <div class="collaboration-card p-12 text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-[#01c0a4] mx-auto mb-4"></div>
      <h3 class="text-xl font-semibold text-gray-600 mb-2">Loading received broadcasts...</h3>
      <p class="text-gray-500">Fetching broadcasts from the server</p>
    </div>
  {:else if receivedBroadcasts.length === 0}
    <div class="collaboration-card p-12 text-center">
      <Megaphone class="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 class="text-xl font-semibold text-gray-600 mb-2">
        {searchQuery || priorityFilter !== 'all' 
          ? 'No received broadcasts match your filters' 
          : 'No received broadcasts yet'}
      </h3>
      <p class="text-gray-500 mb-4">
        {#if searchQuery || priorityFilter !== 'all'}
          Try adjusting your search or filter criteria
        {:else}
          You haven't received any broadcasts yet.
        {/if}
      </p>
    </div>
  {:else}
    <!-- Replace the existing received broadcasts section around line 1555 -->
    {#each sortedReceivedBroadcasts as broadcast}
      {@const userResponse = getUserResponseForBroadcast(broadcast.id)}
      {@const hasResponded = !!userResponse}
      {@const isBroadcastDone = !broadcast.isActive}
      
      <div 
        class="collaboration-card p-4 fade-in cursor-pointer hover:shadow-lg transition-all relative {broadcast.priority === 'high' ? 'border-l-4 border-red-500' : ''} {isBroadcastDone ? 'opacity-60 bg-gray-50' : ''}"
        role="button"
        tabindex="0"
        onclick={() => openBroadcastDetails(broadcast)}
        onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openBroadcastDetails(broadcast); } }}
      >
        {#if isBroadcastDone}
          <div class="absolute top-2 right-2">
            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              DONE
            </span>
          </div>
        {:else if hasResponded}
          <div class="absolute top-2 right-2">
            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              RESPONDED
            </span>
          </div>
        {/if}
        
        <div class="flex items-start justify-between">
          <div class="flex-1 min-w-0">
            <div class="flex items-center space-x-3 mb-2">
              <h3 class="text-lg font-bold {isBroadcastDone ? 'text-gray-500' : 'text-gray-800'} truncate">{broadcast.title}</h3>
            </div>
            <div class="flex items-center space-x-3 mb-3">
              <span class="px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap {getPriorityStyle(broadcast.priority)} {isBroadcastDone ? 'opacity-75' : ''}">
                {broadcast.priority.toUpperCase()}
              </span>
              <div class="w-2 h-2 rounded-full flex-shrink-0 {broadcast.priority === 'high' ? 'bg-red-500' : broadcast.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'} {isBroadcastDone ? 'opacity-60' : ''}"></div>
            </div>
            <div class="mb-3">
              <p class="text-gray-600 text-sm line-clamp-2 break-words {isBroadcastDone ? 'opacity-60' : ''}">
                {#if broadcast.content.length > 120}
                  {broadcast.content.substring(0, 120)}... <span class="text-xs text-gray-400 italic">Click to read more</span>
                {:else}
                  {broadcast.content}
                {/if}
              </p>
            </div>
            
            <!-- Show user's response if they have responded -->
            {#if hasResponded && !isBroadcastDone}
              <div class="bg-green-50 rounded border border-green-200 p-3 mb-3 shadow-sm">
                <div class="flex items-center space-x-2 mb-1">
                  <CheckCircle class="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span class="text-sm font-medium text-green-700">Your Response:</span>
                </div>
                <p class="text-sm text-gray-600 break-words">
                  {formatResponseDisplay(userResponse)}
                </p>
              </div>
            {:else if hasResponded && isBroadcastDone}
              <div class="bg-gray-100 rounded border border-gray-300 p-3 mb-3 shadow-sm">
                <div class="flex items-center space-x-2 mb-1">
                  <CheckCircle class="w-4 h-4 text-gray-600 flex-shrink-0" />
                  <span class="text-sm font-medium text-gray-700">Your Response:</span>
                </div>
                <p class="text-sm text-gray-500 break-words">
                  {formatResponseDisplay(userResponse)}
                </p>
              </div>
            {/if}

            <!-- Display broadcast metadata -->
            <div class="flex items-center space-x-4 text-sm {isBroadcastDone ? 'text-gray-400' : 'text-gray-500'} flex-wrap">
              <div class="flex items-center space-x-1">
                <User class="w-4 h-4 flex-shrink-0" />
                  <span class="truncate">Created By: <b>
                    {broadcast.creatorFirstName && broadcast.creatorLastName
                      ? `${broadcast.creatorFirstName} ${broadcast.creatorLastName}`
                      : broadcast.createdBy} </b>
                  </span>
                </div>
                <div class="flex items-center space-x-1">
                  <Calendar class="w-4 h-4 flex-shrink-0" />
                  <span class="whitespace-nowrap">{formatDate(broadcast.createdAt)}</span>
                </div>
              <div class="flex items-center space-x-1">
                <Users class="w-4 h-4 flex-shrink-0" />
                <span class="truncate">{Array.isArray(broadcast.targetRoles) && broadcast.targetRoles.length > 0 ? broadcast.targetRoles.join(', ') : 'All'}</span>
              </div>
              <div class="flex items-center space-x-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 flex-shrink-0"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
                <span class="truncate">{Array.isArray(broadcast.targetOUs) && broadcast.targetOUs.length > 0 ? broadcast.targetOUs.join(', ') : 'All'}</span>
              </div>
              {#if broadcast.eventDate}
                <div class="flex items-center space-x-1">
                  <Clock class="w-4 h-4 flex-shrink-0" />
                  <span class="whitespace-nowrap">Event: {formatDate(broadcast.eventDate)}</span>
                </div>
              {/if}
            </div>
          </div>
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
                <span class="break-words">Roles: {selectedBroadcast.targetRoles.join(', ')}</span>
              </div>
              <div class="flex items-center space-x-2 text-sm text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 flex-shrink-0"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
                <span class="break-words">Units: {selectedBroadcast.targetOUs.join(', ')}</span>
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

          <!-- In the broadcast details modal, replace the "Mark as Done" button section -->
          <!-- Update the response section in the broadcast details modal around line 1690 -->
<div class="flex justify-end pt-4 border-t border-gray-200">
  {#if activeTab === 'Received Broadcasts'}
    {@const userResponse = getUserResponseForBroadcast(selectedBroadcast.id)}
    {@const hasResponded = !!userResponse}
    {@const isBroadcastDone = !selectedBroadcast.isActive}
    
    <!-- Show completion notice if broadcast is done -->
    {#if isBroadcastDone}
      <div class="w-full bg-gray-100 border border-gray-300 rounded p-4">
        <div class="flex items-center space-x-2 mb-2">
          <CheckCircle class="w-5 h-5 text-gray-500" />
          <span class="text-sm font-medium text-gray-700">Broadcast Completed</span>
        </div>
        <p class="text-sm text-gray-600 mb-3">This broadcast has been marked as completed. No further responses can be submitted.</p>
        
        {#if hasResponded}
          <div class="bg-white border border-gray-200 rounded p-3">
            <div class="flex items-center space-x-2 mb-1">
              <CheckCircle class="w-4 h-4 text-gray-500" />
              <span class="text-sm font-medium text-gray-600">Your Final Response:</span>
            </div>
            <p class="text-sm text-gray-700">{formatResponseDisplay(userResponse)}</p>
            <p class="text-xs text-gray-500 mt-1">Submitted on {new Date(userResponse.acknowledgedAt).toLocaleString()}</p>
          </div>
        {:else}
          <p class="text-sm text-gray-500 italic">You did not respond to this broadcast before it was completed.</p>
        {/if}
      </div>
    {:else}
      {#if selectedBroadcast}
        {@const broadcast = selectedBroadcast as Broadcast}
        <!-- Original response options (only show when broadcast is active) -->
        {#if broadcast.responseType === 'none'}
          <div class="text-sm text-gray-500 italic">No response required</div>
        {:else if broadcast.responseType === 'required'}
          <!-- Acknowledgment required -->
          <div class="flex items-center space-x-3 w-full">
            {#if hasResponded}
              <div class="flex-1 bg-green-50 border border-green-200 rounded p-3">
                <div class="flex items-center space-x-2 mb-2">
                  <CheckCircle class="w-4 h-4 text-green-600" />
                  <span class="text-sm font-medium text-green-800">Response Status:</span>
                </div>
                <p class="text-sm text-gray-700">Acknowledged on {new Date(userResponse.acknowledgedAt).toLocaleString()}</p>
              </div>
            {:else}
              <button
                onclick={() => handleAcknowledgment(broadcast.id)}
                class="primary-button"
                disabled={isAcknowledged}
              >
                {isAcknowledged ? 'Acknowledged' : 'Acknowledge'}
              </button>
            {/if}
          </div>
        {:else if broadcast.responseType === 'preferred-date'}
          <!-- Preferred date selection -->
          <div class="flex flex-col space-y-3 w-full">
            {#if hasResponded}
              <div class="bg-green-50 border border-green-200 rounded p-3 mb-3">
                <div class="flex items-center space-x-2 mb-2">
                  <CheckCircle class="w-4 h-4 text-green-600" />
                  <span class="text-sm font-medium text-green-800">Current Response:</span>
                </div>
                <p class="text-sm text-gray-700">{formatResponseDisplay(userResponse)}</p>
                <p class="text-xs text-gray-500 mt-1">Submitted on {new Date(userResponse.acknowledgedAt).toLocaleString()}</p>
              </div>
            {/if}
            
            <label for="preferred-date" class="text-sm font-medium text-gray-700">
              {hasResponded ? 'Update your preferred date:' : 'Select your preferred date:'}
            </label>
            <div class="flex items-center space-x-3">
              <input
                id="preferred-date"
                type="datetime-local"
                bind:value={preferredDate}
                class="input-field flex-1"
                disabled={isBroadcastDone}
              />
              <button
                onclick={() => handlePreferredDateResponse(broadcast.id, preferredDate)}
                class="primary-button disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isBroadcastDone || (hasResponded ? !hasPreferredDateChanged || !preferredDate : !preferredDate)}
              >
                {hasResponded ? 'Update Date' : 'Submit Date'}
              </button>
            </div>
          </div>
          {:else if broadcast.responseType === 'choices'}
            <!-- Multiple choice selection -->
            <div class="flex flex-col space-y-3 w-full">
              {#if hasResponded}
                <div class="bg-green-50 border border-green-200 rounded p-3 mb-3">
                  <div class="flex items-center space-x-2 mb-2">
                    <CheckCircle class="w-4 h-4 text-green-600" />
                    <span class="text-sm font-medium text-green-800">Current Response:</span>
                  </div>
                  <p class="text-sm text-gray-700">{formatResponseDisplay(userResponse)}</p>
                  <p class="text-xs text-gray-500 mt-1">Submitted on {new Date(userResponse.acknowledgedAt).toLocaleString()}</p>
                </div>
              {/if}
              
              <label class="text-sm font-medium text-gray-700">
                {hasResponded ? 'Update your choice:' : 'Select your choice:'}
              </label>
              <div class="space-y-2">
                {#each broadcast.choices || [] as choice}
                  <label class="flex items-center space-x-2 p-2 rounded hover:bg-gray-50 {isBroadcastDone ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}">
                    <input
                      type="radio"
                      bind:group={selectedChoice}
                      value={choice}
                      disabled={isBroadcastDone}
                      class="text-[#01c0a4] focus:ring-[#01c0a4] disabled:opacity-50"
                    />
                    <span class="text-sm {isBroadcastDone ? 'text-gray-400' : 'text-gray-700'}">{choice}</span>
                  </label>
                {/each}
              </div>
              <div class="flex justify-end">
                <button
                  onclick={() => handleChoiceResponse(broadcast.id, selectedChoice)}
                  class="primary-button disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isBroadcastDone || (hasResponded ? !hasChoiceChanged || !selectedChoice : !selectedChoice)}
                >
                  {hasResponded ? 'Update Choice' : 'Submit Choice'}
                </button>
              </div>
            </div>
        {:else if broadcast.responseType === 'textbox'}
          <!-- Text response -->
          <div class="flex flex-col space-y-3 w-full">
            {#if hasResponded}
              <div class="bg-green-50 border border-green-200 rounded p-3 mb-3">
                <div class="flex items-center space-x-2 mb-2">
                  <CheckCircle class="w-4 h-4 text-green-600" />
                  <span class="text-sm font-medium text-green-800">Current Response:</span>
                </div>
                <p class="text-sm text-gray-700">{formatResponseDisplay(userResponse)}</p>
                <p class="text-xs text-gray-500 mt-1">Submitted on {new Date(userResponse.acknowledgedAt).toLocaleString()}</p>
              </div>
            {/if}
            
            <label for="text-response" class="text-sm font-medium text-gray-700">
              {hasResponded ? 'Update your response:' : 'Enter your response:'}
            </label>
            <textarea
              id="text-response"
              bind:value={textResponse}
              placeholder="Type your response here..."
              rows="3"
              disabled={isBroadcastDone}
              class="input-field resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            ></textarea>
            <div class="flex justify-end">
              <button
                onclick={() => handleTextResponse(broadcast.id, textResponse)}
                class="primary-button disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isBroadcastDone || (hasResponded ? !hasTextChanged : !textResponse.trim())}
              >
                {hasResponded ? 'Update Response' : 'Submit Response'}
              </button>
            </div>
          </div>
        {/if}
      {/if}
    {/if}
  {:else}
  {#if selectedBroadcast}
    {@const broadcast = selectedBroadcast as Broadcast}
    <!-- My Broadcasts - Mark as Done functionality -->
      {#if broadcast.isActive && canSendBroadcasts}
        <button
          onclick={() => markBroadcastAsDone(broadcast.id)}
          class="secondary-button"
        >
          Mark as Done
        </button>
      {:else if !broadcast.isActive}
        <div class="text-sm text-gray-500 italic">This broadcast has been completed</div>
      {/if}
    {/if}
  {/if}
</div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Template Delete Confirmation Modal -->
  {#if showDeleteTemplateModal}
    <ConfirmationModal
      show={showDeleteTemplateModal}
      title="Delete Template"
      message="Are you sure you want to delete this template? This action cannot be undone."
      confirmText="Delete"
      confirmStyle="danger"
      onConfirm={confirmDeleteTemplate}
      onCancel={() => {
        showDeleteTemplateModal = false;
        templateToDelete = null;
      }}
    />
  {/if}

  <!-- Broadcast Report Modal -->
{#if showReportModal && reportBroadcast}
  <div class="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200">
      <!-- Modal Header -->
      <div class="border-b border-gray-200 p-6">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-bold text-gray-800">Broadcast Response Report</h2>
          <button
            onclick={() => showReportModal = false}
            class="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>
      </div>
      
      <div class="p-6">
        <!-- Broadcast Info Section -->
        <div class="bg-gray-50 rounded-lg p-5 mb-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">Broadcast Details</h3>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span class="block text-sm font-medium text-gray-500 mb-1">Title</span>
              <div class="text-gray-800 font-medium">{reportBroadcast.title}</div>
            </div>
            <div>
              <span class="block text-sm font-medium text-gray-500 mb-1">Priority</span>
              <div class="flex items-center">
                <span class="px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap {getPriorityStyle(reportBroadcast.priority)}">
                  {reportBroadcast.priority.toUpperCase()}
                </span>
              </div>
            </div>
            <div>
              <span class="block text-sm font-medium text-gray-500 mb-1">Date Sent</span>
              <div class="text-gray-800">{formatDate(reportBroadcast.createdAt)}</div>
            </div>
            <div>
              <span class="block text-sm font-medium text-gray-500 mb-1">Response Type</span>
              <div class="text-gray-800">
                {#if reportBroadcast.responseType === 'none'}
                  No response required
                {:else if reportBroadcast.responseType === 'required'}
                  Acknowledgment required
                {:else if reportBroadcast.responseType === 'preferred-date'}
                  Preferred date selection
                {:else if reportBroadcast.responseType === 'choices'}
                  Multiple choice
                {:else if reportBroadcast.responseType === 'textbox'}
                  Text response
                {/if}
              </div>
            </div>
            <div>
              <span class="block text-sm font-medium text-gray-500 mb-1">Target Roles</span>
              <div class="flex flex-wrap gap-1">
                {#each reportBroadcast.targetRoles as role}
                  <span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                    {role}
                  </span>
                {/each}
              </div>
            </div>
            <div>
              <span class="block text-sm font-medium text-gray-500 mb-1">Target Units</span>
              <div class="flex flex-wrap gap-1">
                {#each reportBroadcast.targetOUs as ou}
                  <span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                    {ou}
                  </span>
                {/each}
              </div>
            </div>
            <div class="sm:col-span-2">
              <span class="block text-sm font-medium text-gray-500 mb-1">Response Statistics</span>
              <div class="flex items-center space-x-2 text-gray-800">
                <CheckCircle class="w-4 h-4 text-green-600" />
                <span>{reportBroadcast.acknowledgments.length} responses</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Responses Section -->
        <div>
          <h3 class="text-lg font-semibold text-gray-800 mb-4">User Responses</h3>
          
          {#if isLoadingReport}
            <div class="text-center py-8">
              <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-[#01c0a4] mx-auto mb-4"></div>
              <p class="text-gray-500">Loading responses...</p>
            </div>
          {:else if reportResponses.length === 0}
            <div class="text-center py-8 bg-gray-50 rounded-lg">
              <User class="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p class="text-gray-600 font-medium">No responses yet</p>
              <p class="text-sm text-gray-500 mt-1">No users have responded to this broadcast.</p>
            </div>
          {:else}
            <div class="overflow-x-auto border border-gray-200 rounded-lg">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Response</th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  {#each reportResponses as response}
                    <tr class="hover:bg-gray-50">
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                          <div class="flex-shrink-0 h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 font-semibold uppercase">
                            {response.user ? (response.user.firstName?.[0] || '') + (response.user.lastName?.[0] || '') : '?'}
                          </div>
                          <div class="ml-3">
                            <div class="text-sm font-medium text-gray-900">
                              {response.user ? `${response.user.firstName} ${response.user.lastName}` : 'Unknown User'}
                            </div>
                            <div class="text-sm text-gray-500">
                              {response.user?.email || ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td class="px-6 py-4">
                        <div class="text-sm text-gray-900">
                          {formatResponse(response.responseData)}
                        </div>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(response.acknowledgedAt)}
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
            
            <div class="mt-4 flex justify-between items-center">
              <div class="text-sm text-gray-500">
                Showing {reportResponses.length} response{reportResponses.length !== 1 ? 's' : ''}
              </div>
              <button 
                onclick={() => reportBroadcast && exportCSV(reportBroadcast)}
                class="text-sm text-[#01c0a4] hover:text-[#00a085] flex items-center space-x-1 whitespace-nowrap"
              >
                <Download class="w-4 h-4" />
                <span>Export to CSV</span>
              </button>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}


</div>

<ToastContainer />
