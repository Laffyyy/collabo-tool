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
    AlertTriangle,
    CheckCircle,
    Clock,
    Download,
    FileText,
    Search,
    Filter,
    ChevronDown
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
    // Add any additional fields specific to received broadcasts if needed
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
  let showFilterDropdown = $state(false);
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

    const loadMyBroadcasts = async () => {
    console.log('🔄 Loading user broadcasts from API...');
    isLoading = true;
    error = null;

    try {
      const searchFilters = {
        search: searchQuery.trim() || undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
        limit: 50,
        page: 1,
        includeDeleted: false
      };

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

      console.log('✅ Broadcasts loaded successfully:', broadcasts.length);

    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load broadcasts';
      console.error('❌ Error loading broadcasts:', err);
      broadcasts = [];
    } finally {
      isLoading = false;
    }
  };

  onMount(() => {
  console.log('🔄 Component mounted, activeTab:', activeTab);
  loadMyBroadcasts();
  loadReceivedBroadcasts();
});

  // FIXED: Effect for tab switching (separate from mount)
  $effect(() => {
    console.log('🔄 Tab switched to:', activeTab);
    // Only load if we switched TO "My Broadcasts" and don't have data yet
    if (activeTab === 'My Broadcasts' && broadcasts.length === 0 && !isLoading) {
      loadMyBroadcasts();
    }
  });

  // FIXED: Effect for filter changes (only reload if we have data and filters change)
  $effect(() => {
    console.log('🔄 Filters changed - search:', searchQuery, 'priority:', priorityFilter);
    // Only reload if we're on "My Broadcasts", have existing data, and filters changed
    if (activeTab === 'My Broadcasts' && broadcasts.length > 0 && (searchQuery.trim() || priorityFilter !== 'all')) {
      loadMyBroadcasts();
    }
  });

  // Load user responses when switching to Received Broadcasts tab
  const loadReceivedBroadcasts = async () => {
    isLoadingReceived = true;
    try {
      const response = await receivedBroadcastAPI.getReceivedBroadcasts({
        search: searchQuery.trim() || undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
        limit: 50,
        page: 1
      });

      const userRole = currentUser?.role || '';

      receivedBroadcasts = response.broadcasts
        .map(b => ({
          ...b,
          createdAt: new Date(b.createdAt),
          scheduledFor: b.scheduledFor ? new Date(b.scheduledFor) : undefined,
          eventDate: b.eventDate ? new Date(b.eventDate) : undefined,
          targets: b.targets ?? []
        }));

      // Load responses for all received broadcasts
      for (const broadcast of receivedBroadcasts) {
        await checkExistingResponse(broadcast.id);
      }

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

  // Reload when filters change
  $effect(() => {
    console.log('🔍 Filter effect - search:', searchQuery, 'priority:', priorityFilter);
    if (activeTab === 'My Broadcasts') {
      loadMyBroadcasts();
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

const exportCSV = (broadcast: Broadcast) => {
    alert('CSV export functionality would be implemented here.');
  };

  const viewReport = (broadcast: Broadcast) => {
    alert('View detailed report functionality would be implemented here.');
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
        // Add the new broadcast to the local state with scheduling info
        const createdBroadcast = response.broadcast;
        broadcasts = [
          {
            id: response.broadcast?.id || Date.now().toString(),
            title: newBroadcast.title.trim(),
            content: newBroadcast.content.trim(),
            priority: newBroadcast.priority,
            targetRoles: newBroadcast.targetRoles,
            targetOUs: newBroadcast.targetOUs,
            createdBy: currentUser.id,
            createdAt: new Date(),
            scheduledFor: newBroadcast.scheduleType === 'pick' ? new Date(newBroadcast.scheduledFor) : undefined,
            requiresAcknowledgment: newBroadcast.acknowledgmentType !== 'none',
            responseType: newBroadcast.acknowledgmentType,
            acknowledgments: [],
            isActive: true,
            endDate: newBroadcast.endDate ? new Date(newBroadcast.endDate) : undefined
          },
          ...broadcasts
        ];
        
        closeCreateModal();
        console.log('Creating toast with store:', $toastStore);
        $toastStore.success('Broadcast created successfully!');
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
  
  // Test toast functionality after component is mounted
  setTimeout(() => {
    console.log('Testing toast system...');
    $toastStore.success('Component loaded successfully');
  }, 1000);
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
                    <div class="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-auto">
                      {#if isLoadingOUs}
                        <div class="p-3 text-center text-gray-500">Loading organizational units...</div>
                      {:else if availableOUs.length === 0}
                        <div class="p-3 text-center text-gray-500">No organizational units found</div>
                      {:else}
                        {#each availableOUs as ou}
                          <div class="p-2 hover:bg-gray-100">
                            <label class="flex items-center space-x-2 cursor-pointer w-full">
                              <input
                                type="checkbox"
                                checked={newBroadcast.targetOUs.includes(ou.id)}
                                onclick={() => {
                                  const index = newBroadcast.targetOUs.indexOf(ou.id);
                                  if (index === -1) {
                                    if (newBroadcast.targetOUs.length < 3) {
                                      newBroadcast.targetOUs = [...newBroadcast.targetOUs, ou.id];
                                    }
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
                    </div>
                  {/if}
                </div>
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
                      class="relative cursor-pointer"
                      role="button"
                      tabindex="0"
                      onclick={() => document.getElementById('scheduledFor')?.focus()}
                      onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); document.getElementById('scheduledFor')?.focus(); } }}
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
                  <div 
                    class="relative cursor-pointer"
                    role="button"
                    tabindex="0"
                    onclick={() => document.getElementById('endDate')?.focus()}
                    onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); document.getElementById('endDate')?.focus(); } }}
                  >
                    <input
                      id="endDate"
                      type="datetime-local"
                      bind:value={newBroadcast.endDate}
                      class="input-field cursor-pointer"
                      placeholder="Select end date..."
                    />
                  </div>
                </div>
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
                <div class="space-y-2">
                  <button 
                    onclick={(e) => { e.stopPropagation(); exportCSV(broadcast); }}
                    class="text-sm text-[#01c0a4] hover:text-[#00a085] flex items-center space-x-1 whitespace-nowrap"
                  >
                    <Download class="w-4 h-4" />
                    <span>Export CSV</span>
                  </button>
                  <button 
                    onclick={(e) => { e.stopPropagation(); viewReport(broadcast); }}
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
  
  <div 
    class="collaboration-card p-4 fade-in cursor-pointer hover:shadow-lg transition-all relative {broadcast.priority === 'high' ? 'border-l-4 border-red-500' : ''} {!broadcast.isActive ? 'opacity-60 bg-gray-50' : ''} {hasResponded ? 'bg-green-50 border-green-200' : ''}"
    role="button"
    tabindex="0"
    onclick={() => openBroadcastDetails(broadcast)}
    onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openBroadcastDetails(broadcast); } }}
  >
    {#if hasResponded}
      <div class="absolute top-2 right-2">
        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          RESPONDED
        </span>
      </div>
    {/if}
    
    <div class="flex items-start justify-between">
      <div class="flex-1 min-w-0">
        <div class="flex items-center space-x-3 mb-2">
          <h3 class="text-lg font-bold {hasResponded ? 'text-gray-600' : 'text-gray-800'} truncate">{broadcast.title}</h3>
        </div>
        <div class="flex items-center space-x-3 mb-3">
          <span class="px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap {getPriorityStyle(broadcast.priority)}">
            {broadcast.priority.toUpperCase()}
          </span>
          <div class="w-2 h-2 rounded-full flex-shrink-0 {broadcast.priority === 'high' ? 'bg-red-500' : broadcast.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}"></div>
        </div>
        <div class="mb-3">
          <p class="text-gray-600 text-sm line-clamp-2 break-words {hasResponded ? 'opacity-75' : ''}">
            {#if broadcast.content.length > 120}
              {broadcast.content.substring(0, 120)}... <span class="text-xs text-gray-400 italic">Click to read more</span>
            {:else}
              {broadcast.content}
            {/if}
          </p>
        </div>
        
        <!-- Show user's response if they have responded -->
        {#if hasResponded}
          <div class="bg-white rounded border border-green-200 p-3 mb-3">
            <div class="flex items-center space-x-2 mb-1">
              <CheckCircle class="w-4 h-4 text-green-600 flex-shrink-0" />
              <span class="text-sm font-medium text-green-800">Your Response:</span>
            </div>
            <p class="text-sm text-gray-700 break-words">
              {formatResponseDisplay(userResponse)}
            </p>
          </div>
        {/if}
        
        <div class="flex items-center space-x-4 text-sm {hasResponded ? 'text-gray-400' : 'text-gray-500'} flex-wrap">
          <div class="flex items-center space-x-1">
            <Calendar class="w-4 h-4 flex-shrink-0" />
            <span class="whitespace-nowrap">{formatDate(broadcast.createdAt)}</span>
          </div>
          <div class="flex items-center space-x-1">
            <Users class="w-4 h-4 flex-shrink-0" />
            <span class="truncate">{broadcast.targetRoles?.join(', ') || ''} | {broadcast.targetOUs?.join(', ') || ''}</span>
          </div>
          {#if broadcast.eventDate}
            <div class="flex items-center space-x-1">
              <Clock class="w-4 h-4 flex-shrink-0" />
              <span class="whitespace-nowrap">Event: {formatDate(broadcast.eventDate)}</span>
            </div>
          {/if}
        </div>
      </div>
      {#if broadcast.requiresAcknowledgment && !hasResponded}
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

          <!-- In the broadcast details modal, replace the "Mark as Done" button section -->
          <!-- Update the response section in the broadcast details modal around line 1690 -->
<div class="flex justify-end pt-4 border-t border-gray-200">
  {#if activeTab === 'Received Broadcasts'}
    {@const userResponse = getUserResponseForBroadcast(selectedBroadcast.id)}
    {@const hasResponded = !!userResponse}
    
    <!-- Response options based on responseType -->
    {#if selectedBroadcast.responseType === 'none'}
      <div class="text-sm text-gray-500 italic">No response required</div>
    {:else if selectedBroadcast.responseType === 'required'}
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
            onclick={() => handleAcknowledgment(selectedBroadcast.id)}
            class="primary-button"
            disabled={isAcknowledged}
          >
            {isAcknowledged ? 'Acknowledged' : 'Acknowledge'}
          </button>
        {/if}
      </div>
    {:else if selectedBroadcast.responseType === 'preferred-date'}
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
          />
          <button
            onclick={() => handlePreferredDateResponse(selectedBroadcast.id, preferredDate)}
            class="primary-button"
            disabled={hasResponded ? !hasPreferredDateChanged || !preferredDate : !preferredDate}
          >
            {hasResponded ? 'Update Date' : 'Submit Date'}
          </button>
        </div>
        {#if hasResponded && !hasPreferredDateChanged}
          <p class="text-xs text-gray-500 italic">Select a different date to update your response</p>
        {/if}
      </div>
    {:else if selectedBroadcast.responseType === 'choices' && selectedBroadcast.choices}
      <!-- Multiple choice options -->
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
          {hasResponded ? 'Update your selection:' : 'Select an option:'}
        </label>
        <div class="space-y-2">
          {#each selectedBroadcast.choices as choice, index}
            <label class="flex items-center space-x-3">
              <input
                type="radio"
                bind:group={selectedChoice}
                value={choice}
                class="rounded border-gray-300 text-[#01c0a4] focus:ring-[#01c0a4]"
              />
              <span class="text-sm text-gray-700">{choice}</span>
            </label>
          {/each}
        </div>
        <button
          onclick={() => handleChoiceResponse(selectedBroadcast.id, selectedChoice)}
          class="primary-button self-end"
          disabled={hasResponded ? !hasChoiceChanged || !selectedChoice : !selectedChoice}
        >
          {hasResponded ? 'Update Response' : 'Submit Response'}
        </button>
        {#if hasResponded && !hasChoiceChanged}
          <p class="text-xs text-gray-500 italic">Select a different option to update your response</p>
        {/if}
      </div>
    {:else if selectedBroadcast.responseType === 'textbox'}
      <!-- Text response -->
      <div class="flex flex-col space-y-3 w-full">
        {#if hasResponded}
          <div class="bg-green-50 border border-green-200 rounded p-3 mb-3">
            <div class="flex items-center space-x-2 mb-2">
              <CheckCircle class="w-4 h-4 text-green-600" />
              <span class="text-sm font-medium text-green-800">Current Response:</span>
            </div>
            <p class="text-sm text-gray-700 break-words">{userResponse.responseData.textResponse}</p>
            <p class="text-xs text-gray-500 mt-1">Submitted on {new Date(userResponse.acknowledgedAt).toLocaleString()}</p>
          </div>
        {/if}
        
        <label for="text-response" class="text-sm font-medium text-gray-700">
          {hasResponded ? 'Update your response:' : 'Your response:'}
        </label>
        <div class="space-y-3">
          <textarea
            id="text-response"
            bind:value={textResponse}
            placeholder="Enter your response..."
            rows="3"
            class="input-field w-full resize-none"
          ></textarea>
          <button
            onclick={() => handleTextResponse(selectedBroadcast.id, textResponse)}
            class="primary-button self-end"
            disabled={hasResponded ? !hasTextChanged || !textResponse.trim() : !textResponse.trim()}
          >
            {hasResponded ? 'Update Response' : 'Submit Response'}
          </button>
          {#if hasResponded && !hasTextChanged}
            <p class="text-xs text-gray-500 italic">Modify your text to update your response</p>
          {/if}
        </div>
      </div>
    {/if}
  {:else if selectedBroadcast.isActive}
    <!-- Keep existing "Mark as Done" for My Broadcasts tab -->
    <div class="flex space-x-3">
      <button onclick={() => markBroadcastAsDone(selectedBroadcast.id)} class="primary-button">
        Mark as Done
      </button>
    </div>
  {:else}
    <button onclick={() => selectedBroadcast = null} class="secondary-button">
      Close
    </button>
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


</div>

<ToastContainer />
