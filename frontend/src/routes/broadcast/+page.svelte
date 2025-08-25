<script lang="ts">
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

  let currentUser = $derived($authStore?.user || { id: '', role: '' });
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

  // Computed values
  let sortedBroadcasts = $derived(
    [...broadcasts]
      .filter(b => {
        // Search filter (applies globally across all tabs)
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const matchesTitle = b.title.toLowerCase().includes(query);
          const matchesContent = b.content.toLowerCase().includes(query);
          if (!matchesTitle && !matchesContent) return false;
        }
        
        // Priority filter (applies globally across all tabs)
        if (priorityFilter !== 'all' && b.priority !== priorityFilter) return false;
        
        // If search or filter is active, show matching broadcasts from all tabs
        if (searchQuery.trim() || priorityFilter !== 'all') {
          return true; // Already filtered above, show all matching broadcasts
        }
        
        // Otherwise, apply tab filtering only when no search/filter is active
        // Special handling for "My Broadcasts" tab
        if (activeTab === 'My Broadcasts') {
          return b.createdBy === currentUser.id;
        }
        
        // Regular filtering by targetOUs for other tabs
        return b.targetOUs.some(ou => ou === activeTab);
      })
      .sort((a, b) => {
        // First, sort by active status (active broadcasts first)
        if (a.isActive !== b.isActive) {
          return a.isActive ? -1 : 1; // Active broadcasts come first
        }
        
        // Then sort by priority (high > medium > low)
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        
        // Finally by creation date (newest first)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
  );

  let tabCounts = $derived(
    tabs.reduce((counts, tab) => {
      if (tab.id === 'My Broadcasts') {
        counts[tab.id] = broadcasts.filter(b => b.isActive && b.createdBy === currentUser.id).length;
      } else {
        counts[tab.id] = broadcasts.filter(b => b.isActive && b.targetOUs.some(ou => ou === tab.id)).length;
      }
      return counts;
    }, {} as Record<string, number>)
  );

  let tabsWithNewBroadcasts = $derived(
    tabs.reduce((result, tab) => {
      const tabBroadcasts = broadcasts.filter(b => {
        if (!b.isActive) return false;
        
        if (tab.id === 'My Broadcasts') {
          return b.createdBy === currentUser.id;
        }
        
        return b.targetOUs.some(ou => ou === tab.id);
      });
      
      // Check for broadcasts created in the last 24 hours that haven't been viewed
      const hasNewBroadcasts = tabBroadcasts.some(broadcast => {
        const isRecent = (Date.now() - new Date(broadcast.createdAt).getTime()) < 86400000; // 24 hours
        const isUnviewed = !viewedBroadcasts.has(broadcast.id);
        return isRecent && isUnviewed;
      });
      
      result[tab.id] = hasNewBroadcasts;
      return result;
    }, {} as Record<string, boolean>)
  );

  let canSendBroadcasts = $derived(currentUser.role === 'admin' || currentUser.role === 'manager');
  let canAccessAdmin = $derived(currentUser.role === 'admin');

  const loadTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      newBroadcast.title = template.title;
      newBroadcast.content = template.content;
      newBroadcast.priority = template.priority;
      
      // Convert OU names to OU IDs by matching against available OUs
      newBroadcast.targetOUs = template.targetOUs
        .map(ouName => {
          const foundOU = availableOUs.find(ou => ou.name === ouName);
          return foundOU?.id;
        })
        .filter(id => id !== undefined) as string[];
        
      // Convert role names to role IDs by matching against available roles
      newBroadcast.targetRoles = template.targetRoles
        .map(roleName => {
          const foundRole = availableRoles.find(role => role.name === roleName);
          return foundRole?.id;
        })
        .filter(id => id !== undefined) as string[];
      
      newBroadcast.acknowledgmentType = template.acknowledgmentType;
      newBroadcast.choices = template.choices ? [...template.choices] : [''];
      
      console.log('Template loaded with:', {
        title: newBroadcast.title,
        targetOUs: newBroadcast.targetOUs,
        targetRoles: newBroadcast.targetRoles,
        acknowledgmentType: newBroadcast.acknowledgmentType
      });
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
    
    if (confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      try {
        const response = await BroadcastAPI.deleteTemplate(selectedTemplate);
        
        if (response.ok) {
          // Remove template from local state
          templates = templates.filter(t => t.id !== selectedTemplate);
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
      }
    }
  };

  // Load OUs and roles when the component is mounted
  onMount(async () => {
    try {
      isLoadingOUs = true;
      isLoadingRoles = true;
      isLoadingTemplates = true;
      
      // Remove the getBroadcasts() call for now as it will be implemented later
      const [ousResponse, rolesResponse, templatesResponse] = await Promise.all([
        BroadcastAPI.getOrganizationalUnits(),
        BroadcastAPI.getRoles(),
        BroadcastAPI.getTemplates()
      ]);
      
      // Use only the API data
      availableOUs = ousResponse.organizationalUnits || [];
      availableRoles = rolesResponse.roles || [];
      templates = templatesResponse.templates || [];
      
      // Initialize broadcasts as an empty array for now
      broadcasts = [];
      
      console.log('Loaded OUs:', availableOUs);
      console.log('Loaded Roles:', availableRoles);
      console.log('Loaded Templates:', templates);
    } catch (error: any) {
      console.error('Failed to load broadcast data:', error);
      
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

  const createBroadcast = async () => {
  if (newBroadcast.title.trim() && newBroadcast.content.trim()) {
    try {
      isCreatingBroadcast = true;
      apiError = '';
      
      const broadcastData: CreateBroadcastRequest = {
        title: newBroadcast.title.trim(),
        content: newBroadcast.content.trim(),
        priority: newBroadcast.priority,
        targetRoles: newBroadcast.targetRoles,
        targetOUs: newBroadcast.targetOUs,
        responseType: newBroadcast.acknowledgmentType,
        requiresAcknowledgment: newBroadcast.acknowledgmentType !== 'none',
        // Add scheduling parameters
        scheduledFor: newBroadcast.scheduleType === 'pick' ? newBroadcast.scheduledFor : null,
        endDate: newBroadcast.endDate || null,
        // Add choices if response type is 'choices'
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
        broadcasts = [...broadcasts]; // Trigger reactivity
        // Replace alert with toast notification
        $toastStore.success('Broadcast acknowledged!');
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
    $toastStore.success('Broadcast marked as done!');
  };

  const openBroadcastDetails = (broadcast: Broadcast) => {
    selectedBroadcast = broadcast;
    isAcknowledged = false; // Reset checkbox state
    preferredDate = '';
    selectedChoice = '';
    textResponse = '';
    
    // Mark this broadcast as viewed
    viewedBroadcasts.add(broadcast.id);
    viewedBroadcasts = new Set(viewedBroadcasts); // Trigger reactivity
  };

  const closeBroadcastDetails = () => {
    selectedBroadcast = null;
    isAcknowledged = false; // Reset checkbox state
    preferredDate = '';
    selectedChoice = '';
    textResponse = '';
  };

  const confirmModal = () => {
    if (selectedBroadcast && selectedBroadcast.requiresAcknowledgment) {
      const existingAck = selectedBroadcast.acknowledgments.find(a => a.userId === currentUser.id);
      if (!existingAck) {
        let canSubmit = false;
        let toastMessage = '';

        switch (selectedBroadcast.responseType) {
          case 'required':
            canSubmit = isAcknowledged;
            toastMessage = 'Broadcast acknowledged!';
            break;
          case 'preferred-date':
            canSubmit = preferredDate.trim() !== '';
            toastMessage = `Preferred date selected: ${preferredDate}`;
            break;
          case 'choices':
            canSubmit = selectedChoice.trim() !== '';
            toastMessage = `Response submitted: ${selectedChoice}`;
            break;
          case 'textbox':
            canSubmit = textResponse.trim() !== '';
            toastMessage = 'Response submitted successfully!';
            break;
        }

        if (canSubmit) {
          acknowledgeBroadcast(selectedBroadcast.id);
          // Replace alert with toast notification
          $toastStore.success(toastMessage);
        }
      }
    }
    closeBroadcastDetails();
  };

  const closeCreateModal = () => {
    showCreateBroadcast = false;
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
    // Reset template state
    selectedTemplate = '';
    templateName = '';
    showSaveTemplate = false;
  };
</script>

<ToastContainer />

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
              {tabCounts[tab.id] || 0}
            </span>
            
            <!-- New Broadcast Indicator -->
            {#if tabsWithNewBroadcasts[tab.id]}
              <span class="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>
            {/if}
          </button>
        {/each}
      </nav>
      
      <!-- Search and Filters -->
      <div class="flex items-center space-x-3 -mb-px">
        <!-- Search -->
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
        
        <!-- Priority Filter -->
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
    {#each sortedBroadcasts as broadcast, index}
      {@const isNewBroadcast = (Date.now() - new Date(broadcast.createdAt).getTime()) < 86400000 && !viewedBroadcasts.has(broadcast.id)}
      {@const prevBroadcast = index > 0 ? sortedBroadcasts[index - 1] : null}
      {@const needsSeparator = prevBroadcast && prevBroadcast.isActive && !broadcast.isActive}
      
      <!-- Separator between active and done broadcasts -->
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
              <!-- Priority Dot -->
              <div class="w-2 h-2 rounded-full flex-shrink-0 {broadcast.priority === 'high' ? 'bg-red-500' : broadcast.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}"></div>
            </div>
            
            <!-- Content Preview -->
            <div class="mb-3">
              <p class="text-gray-600 text-sm line-clamp-2 break-words">
                {#if broadcast.content.length > 120}
                  {broadcast.content.substring(0, 120)}... <span class="text-xs text-gray-400 italic">Click to read more</span>
                {:else}
                  {broadcast.content}
                {/if}
              </p>
            </div>
            
            <!-- Metadata -->
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

          <!-- Acknowledgment Count -->
          {#if broadcast.requiresAcknowledgment}
            <div class="text-right flex-shrink-0 ml-4">
              <div class="text-sm text-gray-500 mb-3 whitespace-nowrap">
                {broadcast.acknowledgments.length} acknowledgments
              </div>
              {#if canAccessAdmin && broadcast.acknowledgments.length > 0}
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
              {/if}
            </div>
          {/if}
        </div>
      </div>
    {/each}

    {#if sortedBroadcasts.length === 0}
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
</div>
