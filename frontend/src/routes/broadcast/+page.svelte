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
    Filter
  } from 'lucide-svelte';

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

  // Mock user data
  const currentUser = {
    id: '1',
    name: 'Admin User',
    role: 'admin',
    email: 'admin@company.com'
  };

  // Mock broadcasts data
  let broadcasts = $state<Broadcast[]>([
    {
      id: '1',
      title: 'Quarterly Team Meeting',
      content: 'Join us for our quarterly team meeting to discuss Q3 progress and Q4 planning. We\'ll cover project updates, team achievements, and upcoming initiatives.',
      priority: 'high' as const,
      targetRoles: ['admin', 'manager', 'supervisor'],
      targetOUs: ['HR', 'Team Lead'],
      createdBy: '1',
      createdAt: new Date(Date.now() - 86400000), // 1 day ago
      requiresAcknowledgment: true,
      responseType: 'preferred-date',
      eventDate: new Date(Date.now() + 604800000), // 1 week from now
      acknowledgments: [
        { userId: '2', acknowledgedAt: new Date(Date.now() - 43200000), attending: true },
        { userId: '3', acknowledgedAt: new Date(Date.now() - 21600000), attending: false }
      ],
      isActive: true
    },
    {
      id: '2',
      title: 'System Maintenance Notice',
      content: 'Scheduled system maintenance will occur this weekend from 2 AM to 6 AM. All systems will be temporarily unavailable during this time.',
      priority: 'medium' as const,
      targetRoles: ['admin', 'manager', 'supervisor', 'support', 'frontline'],
      targetOUs: ['Team Lead'],
      createdBy: '1',
      createdAt: new Date(Date.now() - 172800000), // 2 days ago
      requiresAcknowledgment: false,
      responseType: 'none',
      acknowledgments: [],
      isActive: true
    },
    {
      id: '3',
      title: 'New Policy Update',
      content: 'Please review the updated remote work policy document. All team members must acknowledge receipt and understanding.',
      priority: 'low' as const,
      targetRoles: ['admin', 'manager', 'supervisor', 'support', 'frontline'],
      targetOUs: ['HR'],
      createdBy: '1',
      createdAt: new Date(Date.now() - 259200000), // 3 days ago
      requiresAcknowledgment: true,
      responseType: 'required',
      eventDate: undefined,
      acknowledgments: [
        { userId: '2', acknowledgedAt: new Date(Date.now() - 172800000), attending: undefined },
        { userId: '3', acknowledgedAt: new Date(Date.now() - 86400000), attending: undefined },
        { userId: '4', acknowledgedAt: new Date(Date.now() - 43200000), attending: undefined }
      ],
      isActive: true
    },
    {
      id: '4',
      title: 'Security Protocol Update',
      content: 'New security measures are being implemented across all clusters. Please ensure compliance with the updated protocols.',
      priority: 'high' as const,
      targetRoles: ['admin', 'manager', 'supervisor'],
      targetOUs: ['Cluster'],
      createdBy: '1',
      createdAt: new Date(Date.now() - 345600000), // 4 days ago
      requiresAcknowledgment: true,
      responseType: 'choices',
      choices: ['I understand and will comply', 'I need more information', 'I have concerns about implementation'],
      eventDate: undefined,
      acknowledgments: [
        { userId: '2', acknowledgedAt: new Date(Date.now() - 172800000), attending: undefined }
      ],
      isActive: true
    },
    {
      id: '5',
      title: 'Site-Wide Emergency Drill',
      content: 'Emergency evacuation drill scheduled for next Friday. All personnel must participate.',
      priority: 'high' as const,
      targetRoles: ['admin', 'manager', 'supervisor', 'support', 'frontline'],
      targetOUs: ['Site Broadcast', 'HR', 'Cluster'],
      createdBy: '1',
      createdAt: new Date(Date.now() - 432000000), // 5 days ago
      requiresAcknowledgment: true,
      responseType: 'textbox',
      eventDate: new Date(Date.now() + 432000000), // 5 days from now
      acknowledgments: [
        { userId: '2', acknowledgedAt: new Date(Date.now() - 172800000), attending: true },
        { userId: '3', acknowledgedAt: new Date(Date.now() - 86400000), attending: true },
        { userId: '4', acknowledgedAt: new Date(Date.now() - 43200000), attending: false }
      ],
      isActive: true
    }
  ]);

  // Mock templates data
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
    },
    {
      id: '3',
      name: 'Policy Update',
      title: 'Important Policy Update',
      content: 'Please review the updated policy document. All team members must acknowledge receipt and understanding of the new guidelines.',
      priority: 'medium',
      targetRoles: ['admin', 'manager', 'supervisor', 'support', 'frontline'],
      acknowledgmentType: 'required',
      createdBy: '1',
      createdAt: new Date(Date.now() - 259200000)
    }
  ]);

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
    choices: [''] as string[]
  });

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
        if (!b.isActive) return false;
        
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
        // Sort by priority first (high > medium > low)
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        
        // Then by creation date (newest first)
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
        acknowledgments: [],
        isActive: true
      };

      broadcasts = [broadcast, ...broadcasts];
      
      closeCreateModal();
      
      alert('Broadcast created successfully!');
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
      choices: ['']
    };
    // Reset template state
    selectedTemplate = '';
    templateName = '';
    showSaveTemplate = false;
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
                    <select 
                      id="templateSelect" 
                      bind:value={selectedTemplate}
                      onchange={() => {
                        if (selectedTemplate) {
                          loadTemplate(selectedTemplate);
                        }
                      }}
                      class="input-field flex-1"
                    >
                      <option value="">Select a template...</option>
                      {#each templates as template}
                        <option value={template.id}>{template.name}</option>
                      {/each}
                    </select>
                    {#if selectedTemplate}
                      <button
                        type="button"
                        onclick={() => { selectedTemplate = ''; }}
                        class="secondary-button whitespace-nowrap"
                      >
                        Clear
                      </button>
                    {/if}
                  </div>
                </div>
                
                <div class="sm:border-l sm:border-gray-300 sm:pl-4">
                  <span class="block text-sm font-medium text-gray-700 mb-2">Save Current as Template</span>
                  {#if !showSaveTemplate}
                    <button
                      type="button"
                      onclick={() => showSaveTemplate = true}
                      class="secondary-button whitespace-nowrap"
                      disabled={!newBroadcast.title.trim() || !newBroadcast.content.trim()}
                    >
                      Save Template
                    </button>
                  {:else}
                    <div class="flex space-x-2">
                      <input
                        type="text"
                        bind:value={templateName}
                        placeholder="Template name..."
                        class="input-field flex-1 min-w-32"
                      />
                      <button
                        type="button"
                        onclick={saveAsTemplate}
                        disabled={!templateName.trim()}
                        class="primary-button whitespace-nowrap text-sm px-3 py-2 disabled:opacity-50"
                      >
                        Save
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
              
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Organizational Units *</label>
                  <div class="relative">
                    <button
                      type="button"
                      onclick={() => showOUDropdown = !showOUDropdown}
                      class="input-field w-full text-left flex items-center justify-between"
                    >
                      <span class="truncate">
                        {#if newBroadcast.targetOUs.length === 0}
                          <span class="text-gray-400">Select organizational units...</span>
                        {:else if newBroadcast.targetOUs.length === 1}
                          {newBroadcast.targetOUs[0]}
                        {:else}
                          {newBroadcast.targetOUs.length} units selected
                        {/if}
                      </span>
                      <svg class="w-4 h-4 text-gray-400 transform transition-transform {showOUDropdown ? 'rotate-180' : ''}" 
                           fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                      </svg>
                    </button>
                    
                    {#if showOUDropdown}
                      <div class="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                        {#each targetOUs as ou}
                          <label class="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer {newBroadcast.targetOUs.length >= 3 && !newBroadcast.targetOUs.includes(ou) ? 'opacity-50 cursor-not-allowed' : ''}">
                            <input
                              type="checkbox"
                              bind:group={newBroadcast.targetOUs}
                              value={ou}
                              disabled={newBroadcast.targetOUs.length >= 3 && !newBroadcast.targetOUs.includes(ou)}
                              class="rounded border-gray-300 text-[#01c0a4] focus:ring-[#01c0a4] mr-3"
                            />
                            <span class="text-sm">{ou}</span>
                          </label>
                        {/each}
                      </div>
                    {/if}
                  </div>
                  {#if newBroadcast.targetOUs.length === 0}
                    <p class="text-xs text-red-500 mt-2">Please select at least one organizational unit</p>
                  {:else if newBroadcast.targetOUs.length >= 3}
                    <p class="text-xs text-orange-500 mt-2">Maximum of 3 organizational units allowed</p>
                  {:else}
                    <p class="text-xs text-gray-500 mt-2">You can select up to 3 organizational units ({3 - newBroadcast.targetOUs.length} remaining)</p>
                  {/if}
                </div>

                <div>
                  <span class="block text-sm font-medium text-gray-700 mb-3">Target Roles *</span>
                  <div class="mb-3 p-3 bg-white rounded border border-gray-200">
                    <label class="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={newBroadcast.targetRoles.length === roles.length}
                        onchange={(e) => {
                          const target = e.target as HTMLInputElement;
                          if (target.checked) {
                            newBroadcast.targetRoles = [...roles];
                          } else {
                            newBroadcast.targetRoles = [];
                          }
                        }}
                        class="rounded border-gray-300 text-[#01c0a4] focus:ring-[#01c0a4]"
                      />
                      <span class="text-sm font-medium text-gray-700">Select All Roles</span>
                    </label>
                  </div>
                  <div class="grid grid-cols-2 gap-3">
                    {#each roles as role}
                      <label class="flex items-center space-x-2 p-2 bg-white rounded border border-gray-200 hover:bg-gray-50">
                        <input
                          type="checkbox"
                          bind:group={newBroadcast.targetRoles}
                          value={role}
                          class="rounded border-gray-300 text-[#01c0a4] focus:ring-[#01c0a4]"
                        />
                        <span class="text-sm capitalize font-medium">{role}</span>
                      </label>
                    {/each}
                  </div>
                  {#if newBroadcast.targetRoles.length === 0}
                    <p class="text-xs text-red-500 mt-2">Please select at least one role</p>
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
              </div>
            </div>

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
                disabled={!newBroadcast.title.trim() || !newBroadcast.content.trim() || newBroadcast.targetRoles.length === 0 || newBroadcast.targetOUs.length === 0}
              >
                {newBroadcast.scheduleType === 'now' ? 'Send Broadcast' : 'Schedule Broadcast'}
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
    {#each sortedBroadcasts as broadcast}
      {@const isNewBroadcast = (Date.now() - new Date(broadcast.createdAt).getTime()) < 86400000 && !viewedBroadcasts.has(broadcast.id)}
      <div 
        class="collaboration-card p-4 fade-in cursor-pointer hover:shadow-lg transition-all relative {broadcast.priority === 'high' ? 'border-l-4 border-red-500' : ''} {isNewBroadcast ? 'ring-2 ring-blue-200 bg-blue-50' : ''}"
        role="button"
        tabindex="0"
        onclick={() => openBroadcastDetails(broadcast)}
        onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openBroadcastDetails(broadcast); } }}
      >
        {#if isNewBroadcast}
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
            {#if selectedBroadcast.requiresAcknowledgment}
              {@const userAck = selectedBroadcast.acknowledgments.find((a: Acknowledgment) => a.userId === currentUser.id)}
              {#if !userAck}
                <button
                  onclick={closeBroadcastDetails}
                  class="text-gray-400 hover:text-gray-600 text-2xl font-bold flex-shrink-0 ml-2"
                >
                  ×
                </button>
              {/if}
            {:else}
              <button
                onclick={closeBroadcastDetails}
                class="text-gray-400 hover:text-gray-600 text-2xl font-bold flex-shrink-0 ml-2"
              >
                ×
              </button>
            {/if}
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
              {#if selectedBroadcast.requiresAcknowledgment}
                <div class="flex items-center space-x-2 text-sm text-gray-600">
                  <CheckCircle class="w-4 h-4 flex-shrink-0" />
                  <span class="break-words">{selectedBroadcast.acknowledgments.length} acknowledgments</span>
                </div>
              {/if}
            </div>
          </div>

          <!-- Acknowledgment Actions -->
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

          <!-- Confirm Button -->
          <div class="flex justify-end pt-4 border-t border-gray-200">
            {#if selectedBroadcast.requiresAcknowledgment}
              {@const userAck = selectedBroadcast.acknowledgments.find((a: Acknowledgment) => a.userId === currentUser.id)}
              {#if userAck}
                <button
                  onclick={closeBroadcastDetails}
                  class="primary-button"
                >
                  Close
                </button>
              {:else}
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
            {:else}
              <button
                onclick={closeBroadcastDetails}
                class="primary-button"
              >
                Close
              </button>
            {/if}
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>
