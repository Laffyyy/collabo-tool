<script lang="ts">
  import { Radio, Plus, Search, Edit, Trash2, Calendar, Users, AlertTriangle, CheckCircle, Clock, Archive, Download } from 'lucide-svelte';
  import Navigation from '$lib/components/Navigation.svelte';

  // TypeScript interfaces
  interface BroadcastData {
    id: string;
    title: string;
    content: string;
    priority: 'low' | 'medium' | 'high';
    status: 'active' | 'scheduled' | 'delivered' | 'archived';
    targetRoles: string[];
    targetOUs: string[];
    createdBy: string;
    createdAt: Date;
    scheduledFor?: Date;
    requiresAcknowledgment: boolean;
    eventDate?: Date;
    acknowledgmentCount: number;
    totalTargets: number;
    isArchived: boolean;
  }

  // Mock broadcast management data
  let broadcasts = $state<BroadcastData[]>([
    {
      id: '1',
      title: 'Quarterly Team Meeting',
      content: 'Join us for our quarterly team meeting to discuss Q3 progress and Q4 planning.',
      priority: 'high',
      status: 'active',
      targetRoles: ['admin', 'manager', 'supervisor'],
      targetOUs: ['Engineering', 'Sales'],
      createdBy: 'John Admin',
      createdAt: new Date(Date.now() - 86400000),
      scheduledFor: new Date(Date.now() + 604800000),
      requiresAcknowledgment: true,
      eventDate: new Date(Date.now() + 604800000),
      acknowledgmentCount: 12,
      totalTargets: 25,
      isArchived: false
    },
    {
      id: '2',
      title: 'System Maintenance Notice',
      content: 'Scheduled system maintenance will occur this weekend from 2 AM to 6 AM.',
      priority: 'medium',
      status: 'scheduled',
      targetRoles: ['admin', 'manager', 'supervisor', 'support', 'frontline'],
      targetOUs: ['All'],
      createdBy: 'Sarah Manager',
      createdAt: new Date(Date.now() - 172800000),
      scheduledFor: new Date(Date.now() + 86400000),
      requiresAcknowledgment: false,
      acknowledgmentCount: 0,
      totalTargets: 150,
      isArchived: false
    },
    {
      id: '3',
      title: 'Policy Update - Remote Work',
      content: 'Important updates to our remote work policy. Please review the attached document.',
      priority: 'low',
      status: 'delivered',
      targetRoles: ['admin', 'manager', 'supervisor', 'support', 'frontline'],
      targetOUs: ['All'],
      createdBy: 'Mike HR',
      createdAt: new Date(Date.now() - 259200000),
      scheduledFor: new Date(Date.now() - 86400000),
      requiresAcknowledgment: true,
      acknowledgmentCount: 89,
      totalTargets: 150,
      isArchived: false
    }
  ]);

  let searchQuery = $state<string>('');
  let filterStatus = $state<string>('all');
  let filterPriority = $state<string>('all');
  let selectedBroadcast = $state<BroadcastData | null>(null);
  let showBroadcastDetails = $state<boolean>(false);
  let showCreateBroadcast = $state<boolean>(false);

  let newBroadcast = $state({
    title: '',
    content: '',
    priority: 'medium',
    targetRoles: [],
    targetOUs: [],
    requiresAcknowledgment: false,
    eventDate: '',
    scheduledFor: ''
  });

  const roles = ['admin', 'manager', 'supervisor', 'support', 'frontline'];
  const organizationUnits = ['Engineering', 'Sales', 'HR', 'Marketing', 'Support', 'All'];
  const priorities = ['low', 'medium', 'high'];

  // Computed values
  let filteredBroadcasts = $derived(
    broadcasts.filter(broadcast => {
      const matchesSearch = 
        broadcast.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        broadcast.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        broadcast.createdBy.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || broadcast.status === filterStatus;
      const matchesPriority = filterPriority === 'all' || broadcast.priority === filterPriority;
      
      return matchesSearch && matchesStatus && matchesPriority && !broadcast.isArchived;
    })
  );

  const createBroadcast = () => {
    if (newBroadcast.title.trim() && newBroadcast.content.trim()) {
      const broadcast: BroadcastData = {
        id: Date.now().toString(),
        title: newBroadcast.title.trim(),
        content: newBroadcast.content.trim(),
        priority: newBroadcast.priority as 'low' | 'medium' | 'high',
        status: (newBroadcast.scheduledFor ? 'scheduled' : 'active') as 'active' | 'scheduled' | 'delivered' | 'archived',
        targetRoles: newBroadcast.targetRoles,
        targetOUs: newBroadcast.targetOUs,
        createdBy: 'Current Admin',
        createdAt: new Date(),
        scheduledFor: newBroadcast.scheduledFor ? new Date(newBroadcast.scheduledFor) : new Date(),
        requiresAcknowledgment: newBroadcast.requiresAcknowledgment,
        eventDate: newBroadcast.eventDate ? new Date(newBroadcast.eventDate) : undefined,
        acknowledgmentCount: 0,
        totalTargets: 100, // Mock calculation
        isArchived: false
      };

      broadcasts = [broadcast, ...broadcasts];
      
      // Reset form
      newBroadcast = {
        title: '',
        content: '',
        priority: 'medium',
        targetRoles: [],
        targetOUs: [],
        requiresAcknowledgment: false,
        eventDate: '',
        scheduledFor: ''
      };
      showCreateBroadcast = false;
      
      alert('Broadcast created successfully!');
    }
  };

  const archiveBroadcast = (broadcastId: string) => {
    const broadcast = broadcasts.find(b => b.id === broadcastId);
    if (broadcast && confirm('Are you sure you want to archive this broadcast?')) {
      broadcast.isArchived = true;
      broadcasts = [...broadcasts];
      alert('Broadcast archived successfully!');
    }
  };

  const deleteBroadcast = (broadcastId: string) => {
    if (confirm('Are you sure you want to permanently delete this broadcast?')) {
      broadcasts = broadcasts.filter(b => b.id !== broadcastId);
      alert('Broadcast deleted successfully!');
    }
  };

  const viewBroadcastDetails = (broadcast: any) => {
    selectedBroadcast = broadcast;
    showBroadcastDetails = true;
  };

  const exportAcknowledgments = (broadcastId: string) => {
    alert('Acknowledgment data exported to CSV!');
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'scheduled': return 'text-blue-600 bg-blue-100';
      case 'delivered': return 'text-gray-600 bg-gray-100';
      case 'archived': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getAcknowledgmentProgress = (acknowledged: number, total: number) => {
    return total > 0 ? Math.round((acknowledged / total) * 100) : 0;
  };
</script>

<svelte:head>
  <title>Broadcast Management - Admin Controls</title>
</svelte:head>

<div class="h-screen flex flex-col bg-gray-50">
  <Navigation />
  
  <div class="flex-1 overflow-auto">
    <div class="p-6 space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between fade-in">
    <div>
      <h1 class="text-3xl font-bold text-gray-800 mb-2">Broadcast Management</h1>
      <p class="text-gray-600">Create, manage, and monitor organizational broadcasts</p>
    </div>
    <button
      onclick={() => showCreateBroadcast = !showCreateBroadcast}
      class="primary-button flex items-center space-x-2"
    >
      <Plus class="w-5 h-5" />
      <span>Create Broadcast</span>
    </button>
  </div>

  <!-- Stats Cards -->
  <div class="grid grid-cols-1 md:grid-cols-4 gap-6 fade-in">
    <div class="collaboration-card p-6">
      <div class="flex items-center">
        <div class="p-3 rounded-full bg-blue-100">
          <Radio class="w-6 h-6 text-blue-600" />
        </div>
        <div class="ml-4">
          <p class="text-sm font-medium text-gray-500">Total Broadcasts</p>
          <p class="text-2xl font-semibold text-gray-900">{broadcasts.filter(b => !b.isArchived).length}</p>
        </div>
      </div>
    </div>

    <div class="collaboration-card p-6">
      <div class="flex items-center">
        <div class="p-3 rounded-full bg-green-100">
          <CheckCircle class="w-6 h-6 text-green-600" />
        </div>
        <div class="ml-4">
          <p class="text-sm font-medium text-gray-500">Active</p>
          <p class="text-2xl font-semibold text-gray-900">{broadcasts.filter(b => b.status === 'active' && !b.isArchived).length}</p>
        </div>
      </div>
    </div>

    <div class="collaboration-card p-6">
      <div class="flex items-center">
        <div class="p-3 rounded-full bg-yellow-100">
          <Clock class="w-6 h-6 text-yellow-600" />
        </div>
        <div class="ml-4">
          <p class="text-sm font-medium text-gray-500">Scheduled</p>
          <p class="text-2xl font-semibold text-gray-900">{broadcasts.filter(b => b.status === 'scheduled' && !b.isArchived).length}</p>
        </div>
      </div>
    </div>

    <div class="collaboration-card p-6">
      <div class="flex items-center">
        <div class="p-3 rounded-full bg-red-100">
          <AlertTriangle class="w-6 h-6 text-red-600" />
        </div>
        <div class="ml-4">
          <p class="text-sm font-medium text-gray-500">High Priority</p>
          <p class="text-2xl font-semibold text-gray-900">{broadcasts.filter(b => b.priority === 'high' && !b.isArchived).length}</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Search and Filters -->
  <div class="collaboration-card p-4 fade-in">
    <div class="flex items-center space-x-4">
      <div class="relative flex-1">
        <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          bind:value={searchQuery}
          type="text"
          placeholder="Search broadcasts by title, content, or creator..."
          class="input-field pl-10"
        />
      </div>
      <select bind:value={filterStatus} class="input-field w-32">
        <option value="all">All Status</option>
        <option value="active">Active</option>
        <option value="scheduled">Scheduled</option>
        <option value="delivered">Delivered</option>
      </select>
      <select bind:value={filterPriority} class="input-field w-32">
        <option value="all">All Priority</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
      <div class="text-sm text-gray-500">
        {filteredBroadcasts.length} broadcasts
      </div>
    </div>
  </div>

  <!-- Create Broadcast Modal -->
  {#if showCreateBroadcast}
    <div class="collaboration-card p-6 fade-in">
      <h2 class="text-xl font-bold text-gray-800 mb-4">Create New Broadcast</h2>
      
      <form onsubmit={(e) => { e.preventDefault(); createBroadcast(); }} class="space-y-4">
        <div>
          <label for="title" class="block text-sm font-semibold text-gray-700 mb-2">Title</label>
          <input
            id="title"
            bind:value={newBroadcast.title}
            placeholder="Broadcast title"
            required
            class="input-field"
          />
        </div>

        <div>
          <label for="content" class="block text-sm font-semibold text-gray-700 mb-2">Content</label>
          <textarea
            id="content"
            bind:value={newBroadcast.content}
            placeholder="Broadcast message"
            required
            rows="4"
            class="input-field resize-none"
          ></textarea>
        </div>

        <div class="grid grid-cols-3 gap-4">
          <div>
            <label for="priority" class="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
            <select id="priority" bind:value={newBroadcast.priority} class="input-field">
              {#each priorities as priority}
                <option value={priority}>{priority.charAt(0).toUpperCase() + priority.slice(1)}</option>
              {/each}
            </select>
          </div>
          <div>
            <label for="scheduledFor" class="block text-sm font-semibold text-gray-700 mb-2">Schedule For</label>
            <input
              id="scheduledFor"
              type="datetime-local"
              bind:value={newBroadcast.scheduledFor}
              class="input-field"
            />
          </div>
          <div>
            <label for="eventDate" class="block text-sm font-semibold text-gray-700 mb-2">Event Date</label>
            <input
              id="eventDate"
              type="datetime-local"
              bind:value={newBroadcast.eventDate}
              class="input-field"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <fieldset>
              <legend class="block text-sm font-semibold text-gray-700 mb-2">Target Roles</legend>
              <div class="grid grid-cols-2 gap-2">
                {#each roles as role}
                  <label class="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      bind:group={newBroadcast.targetRoles}
                      value={role}
                      class="rounded border-gray-300 text-[#01c0a4] focus:ring-[#01c0a4]"
                    />
                    <span class="text-sm capitalize">{role}</span>
                  </label>
                {/each}
              </div>
            </fieldset>
          </div>
          <div>
            <fieldset>
              <legend class="block text-sm font-semibold text-gray-700 mb-2">Target Organization Units</legend>
              <div class="grid grid-cols-2 gap-2">
              {#each organizationUnits as ou}
                <label class="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    bind:group={newBroadcast.targetOUs}
                    value={ou}
                    class="rounded border-gray-300 text-[#01c0a4] focus:ring-[#01c0a4]"
                  />
                  <span class="text-sm">{ou}</span>
                </label>
              {/each}
              </div>
            </fieldset>
          </div>
        </div>

        <div>
          <label class="flex items-center space-x-2">
            <input
              type="checkbox"
              bind:checked={newBroadcast.requiresAcknowledgment}
              class="rounded border-gray-300 text-[#01c0a4] focus:ring-[#01c0a4]"
            />
            <span class="text-sm">Requires acknowledgment</span>
          </label>
        </div>

        <div class="flex space-x-3 pt-4">
          <button type="submit" class="primary-button">
            Create Broadcast
          </button>
          <button
            type="button"
            onclick={() => showCreateBroadcast = false}
            class="secondary-button"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  {/if}

  <!-- Broadcasts Table -->
  <div class="collaboration-card fade-in">
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Broadcast</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acknowledgments</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          {#each filteredBroadcasts as broadcast}
            <tr class="hover:bg-gray-50 transition-colors">
              <td class="px-6 py-4">
                <div class="flex items-center">
                  <div class="flex-shrink-0 h-10 w-10">
                    <div class="h-10 w-10 rounded-full bg-gradient-to-r from-[#01c0a4] to-[#00a085] flex items-center justify-center">
                      <Radio class="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div class="ml-4">
                    <div class="text-sm font-medium text-gray-900">{broadcast.title}</div>
                    <div class="text-sm text-gray-500">by {broadcast.createdBy}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getPriorityColor(broadcast.priority)}">
                  {broadcast.priority.toUpperCase()}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getStatusColor(broadcast.status)}">
                  {broadcast.status.charAt(0).toUpperCase() + broadcast.status.slice(1)}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                {#if broadcast.requiresAcknowledgment}
                  <div class="flex items-center">
                    <div class="flex-1">
                      <div class="text-sm text-gray-900">{broadcast.acknowledgmentCount}/{broadcast.totalTargets}</div>
                      <div class="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          class="bg-[#01c0a4] h-2 rounded-full" 
                          style="width: {getAcknowledgmentProgress(broadcast.acknowledgmentCount, broadcast.totalTargets)}%"
                        ></div>
                      </div>
                    </div>
                  </div>
                {:else}
                  <span class="text-sm text-gray-500">Not required</span>
                {/if}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDate(broadcast.createdAt)}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <button
                  onclick={() => viewBroadcastDetails(broadcast)}
                  class="text-[#01c0a4] hover:text-[#00a085] transition-colors"
                  title="View Details"
                >
                  <Calendar class="w-4 h-4" />
                </button>
                {#if broadcast.requiresAcknowledgment}
                  <button
                    onclick={() => exportAcknowledgments(broadcast.id)}
                    class="text-green-600 hover:text-green-800 transition-colors"
                    title="Export Acknowledgments"
                  >
                    <Download class="w-4 h-4" />
                  </button>
                {/if}
                <button
                  onclick={() => alert('Edit functionality would be implemented here')}
                  class="text-gray-600 hover:text-gray-800 transition-colors"
                  title="Edit"
                >
                  <Edit class="w-4 h-4" />
                </button>
                <button
                  onclick={() => archiveBroadcast(broadcast.id)}
                  class="text-orange-600 hover:text-orange-800 transition-colors"
                  title="Archive"
                >
                  <Archive class="w-4 h-4" />
                </button>
                <button
                  onclick={() => deleteBroadcast(broadcast.id)}
                  class="text-red-600 hover:text-red-800 transition-colors"
                  title="Delete"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    {#if filteredBroadcasts.length === 0}
      <div class="text-center py-12">
        <Radio class="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 class="text-xl font-semibold text-gray-600 mb-2">No broadcasts found</h3>
        <p class="text-gray-500">
          {searchQuery ? 'Try adjusting your search criteria.' : 'Create your first broadcast to get started.'}
        </p>
      </div>
    {/if}
  </div>
</div>

<!-- Broadcast Details Modal -->
{#if showBroadcastDetails && selectedBroadcast}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onclick={() => showBroadcastDetails = false}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4" onclick={(e) => e.stopPropagation()}>
      <div class="p-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">Broadcast Details</h2>
        
        <div class="space-y-4">
          <div>
            <h3 class="text-lg font-medium text-gray-900">{selectedBroadcast.title}</h3>
            <p class="text-gray-600 mt-2">{selectedBroadcast.content}</p>
          </div>
          
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-gray-500">Priority:</span>
              <div class="font-medium">{selectedBroadcast.priority.charAt(0).toUpperCase() + selectedBroadcast.priority.slice(1)}</div>
            </div>
            <div>
              <span class="text-gray-500">Status:</span>
              <div class="font-medium">{selectedBroadcast.status.charAt(0).toUpperCase() + selectedBroadcast.status.slice(1)}</div>
            </div>
            <div>
              <span class="text-gray-500">Created by:</span>
              <div class="font-medium">{selectedBroadcast.createdBy}</div>
            </div>
            <div>
              <span class="text-gray-500">Created:</span>
              <div class="font-medium">{formatDate(selectedBroadcast.createdAt)}</div>
            </div>
            <div>
              <span class="text-gray-500">Target Roles:</span>
              <div class="font-medium">{selectedBroadcast.targetRoles.join(', ')}</div>
            </div>
            <div>
              <span class="text-gray-500">Target OUs:</span>
              <div class="font-medium">{selectedBroadcast.targetOUs.join(', ')}</div>
            </div>
            {#if selectedBroadcast.requiresAcknowledgment}
              <div>
                <span class="text-gray-500">Acknowledgments:</span>
                <div class="font-medium">{selectedBroadcast.acknowledgmentCount}/{selectedBroadcast.totalTargets} ({getAcknowledgmentProgress(selectedBroadcast.acknowledgmentCount, selectedBroadcast.totalTargets)}%)</div>
              </div>
            {/if}
          </div>
        </div>

        <div class="flex space-x-3 mt-6">
          <button
            onclick={() => showBroadcastDetails = false}
            class="flex-1 secondary-button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
