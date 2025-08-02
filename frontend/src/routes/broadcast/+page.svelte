<script lang="ts">
  import { 
    Megaphone, 
    Plus, 
    Calendar, 
    Users, 
    AlertTriangle,
    CheckCircle,
    Clock,
    Download
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
    eventDate?: Date;
    acknowledgments: Acknowledgment[];
    isActive: boolean;
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
      targetOUs: ['All'],
      createdBy: '1',
      createdAt: new Date(Date.now() - 86400000), // 1 day ago
      requiresAcknowledgment: true,
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
      targetOUs: ['All'],
      createdBy: '1',
      createdAt: new Date(Date.now() - 172800000), // 2 days ago
      requiresAcknowledgment: false,
      acknowledgments: [],
      isActive: true
    },
    {
      id: '3',
      title: 'New Policy Update',
      content: 'Please review the updated remote work policy document. All team members must acknowledge receipt and understanding.',
      priority: 'low' as const,
      targetRoles: ['admin', 'manager', 'supervisor', 'support', 'frontline'],
      targetOUs: ['All'],
      createdBy: '1',
      createdAt: new Date(Date.now() - 259200000), // 3 days ago
      requiresAcknowledgment: true,
      eventDate: undefined,
      acknowledgments: [
        { userId: '2', acknowledgedAt: new Date(Date.now() - 172800000), attending: undefined },
        { userId: '3', acknowledgedAt: new Date(Date.now() - 86400000), attending: undefined },
        { userId: '4', acknowledgedAt: new Date(Date.now() - 43200000), attending: undefined }
      ],
      isActive: true
    }
  ]);

  let showCreateBroadcast = $state(false);
  let newBroadcast = $state({
    title: '',
    content: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    targetRoles: [] as string[],
    requiresAcknowledgment: false,
    eventDate: '',
    scheduledFor: ''
  });

  const roles = ['admin', 'manager', 'supervisor', 'support', 'frontline'];
  const priorities = [
    { value: 'low', label: 'Low', color: 'text-green-600 bg-green-100' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-600 bg-yellow-100' },
    { value: 'high', label: 'High', color: 'text-red-600 bg-red-100' }
  ];

  // Computed values
  let sortedBroadcasts = $derived(
    [...broadcasts]
      .filter(b => b.isActive)
      .sort((a, b) => {
        // Sort by priority first (high > medium > low)
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        
        // Then by creation date (newest first)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
  );

  let canSendBroadcasts = $derived(currentUser.role === 'admin' || currentUser.role === 'manager');
  let canAccessAdmin = $derived(currentUser.role === 'admin');

  const createBroadcast = () => {
    if (newBroadcast.title.trim() && newBroadcast.content.trim()) {
      const broadcast: Broadcast = {
        id: Date.now().toString(),
        title: newBroadcast.title.trim(),
        content: newBroadcast.content.trim(),
        priority: newBroadcast.priority,
        targetRoles: newBroadcast.targetRoles,
        targetOUs: ['All'],
        createdBy: currentUser.id,
        createdAt: new Date(),
        scheduledFor: newBroadcast.scheduledFor ? new Date(newBroadcast.scheduledFor) : undefined,
        requiresAcknowledgment: newBroadcast.requiresAcknowledgment,
        eventDate: newBroadcast.eventDate ? new Date(newBroadcast.eventDate) : undefined,
        acknowledgments: [],
        isActive: true
      };

      broadcasts = [broadcast, ...broadcasts];
      
      // Reset form
      newBroadcast = {
        title: '',
        content: '',
        priority: 'medium',
        targetRoles: [],
        requiresAcknowledgment: false,
        eventDate: '',
        scheduledFor: ''
      };
      showCreateBroadcast = false;
      
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
    <div class="collaboration-card p-6 fade-in">
      <h2 class="text-xl font-bold text-gray-800 mb-4">Create New Broadcast</h2>
      
      <form onsubmit={(e) => { e.preventDefault(); createBroadcast(); }} class="space-y-4">
        <!-- Title -->
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

        <!-- Content -->
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

        <!-- Priority -->
        <div>
          <label for="priority" class="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
          <select id="priority" bind:value={newBroadcast.priority} class="input-field">
            {#each priorities as priority}
              <option value={priority.value}>{priority.label}</option>
            {/each}
          </select>
        </div>

        <!-- Target Roles -->
        <div>
          <span class="block text-sm font-semibold text-gray-700 mb-2">Target Roles</span>
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
        </div>

        <!-- Options -->
        <div class="space-y-3">
          <label class="flex items-center space-x-2">
            <input
              type="checkbox"
              bind:checked={newBroadcast.requiresAcknowledgment}
              class="rounded border-gray-300 text-[#01c0a4] focus:ring-[#01c0a4]"
            />
            <span class="text-sm">Requires acknowledgment</span>
          </label>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="scheduledFor" class="block text-sm font-medium text-gray-700 mb-1">Schedule for</label>
              <input
                id="scheduledFor"
                type="datetime-local"
                bind:value={newBroadcast.scheduledFor}
                class="input-field text-sm"
              />
            </div>
            <div>
              <label for="eventDate" class="block text-sm font-medium text-gray-700 mb-1">Event date</label>
              <input
                id="eventDate"
                type="datetime-local"
                bind:value={newBroadcast.eventDate}
                class="input-field text-sm"
              />
            </div>
          </div>
        </div>

        <!-- Actions -->
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

  <!-- Broadcasts List -->
  <div class="space-y-4">
    {#each sortedBroadcasts as broadcast}
      <div class="collaboration-card p-6 fade-in {broadcast.priority === 'high' ? 'border-l-4 border-red-500' : ''}">
        <div class="flex items-start justify-between mb-4">
          <div class="flex-1">
            <div class="flex items-center space-x-3 mb-2">
              <h3 class="text-xl font-bold text-gray-800">{broadcast.title}</h3>
              <span class="px-2 py-1 rounded-full text-xs font-medium {getPriorityStyle(broadcast.priority)}">
                {broadcast.priority.toUpperCase()}
              </span>
              {#if broadcast.priority === 'high'}
                <AlertTriangle class="w-5 h-5 text-red-500" />
              {/if}
            </div>
            <p class="text-gray-600 mb-3">{broadcast.content}</p>
            
            <!-- Metadata -->
            <div class="flex items-center space-x-4 text-sm text-gray-500">
              <div class="flex items-center space-x-1">
                <Calendar class="w-4 h-4" />
                <span>{formatDate(broadcast.createdAt)}</span>
              </div>
              <div class="flex items-center space-x-1">
                <Users class="w-4 h-4" />
                <span>{broadcast.targetRoles.join(', ')}</span>
              </div>
              {#if broadcast.eventDate}
                <div class="flex items-center space-x-1">
                  <Clock class="w-4 h-4" />
                  <span>Event: {formatDate(broadcast.eventDate)}</span>
                </div>
              {/if}
            </div>
          </div>

          <!-- Acknowledgment Status -->
          {#if broadcast.requiresAcknowledgment}
            <div class="text-right">
              <div class="text-sm text-gray-500 mb-2">
                {broadcast.acknowledgments.length} acknowledgments
              </div>
              {#if canAccessAdmin}
                <button 
                  onclick={() => exportCSV(broadcast)}
                  class="text-sm text-[#01c0a4] hover:text-[#00a085] flex items-center space-x-1"
                >
                  <Download class="w-4 h-4" />
                  <span>Export CSV</span>
                </button>
              {/if}
            </div>
          {/if}
        </div>

        <!-- Acknowledgment Actions -->
        {#if broadcast.requiresAcknowledgment}
          {@const userAck = broadcast.acknowledgments.find((a: Acknowledgment) => a.userId === currentUser.id)}
          {#if !userAck}
            <div class="flex items-center space-x-3">
              <button
                onclick={() => acknowledgeBroadcast(broadcast.id)}
                class="primary-button text-sm py-2 px-4 flex items-center space-x-2"
              >
                <CheckCircle class="w-4 h-4" />
                <span>Acknowledge</span>
              </button>
              {#if broadcast.eventDate}
                <button
                  onclick={() => acknowledgeBroadcast(broadcast.id, true)}
                  class="secondary-button text-sm py-2 px-4"
                >
                  Attending
                </button>
                <button
                  onclick={() => acknowledgeBroadcast(broadcast.id, false)}
                  class="bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-xl hover:bg-gray-300 transition-colors text-sm"
                >
                  Not Attending
                </button>
              {/if}
            </div>
          {:else}
            <div class="flex items-center space-x-2 text-green-600">
              <CheckCircle class="w-5 h-5" />
              <span class="text-sm font-medium">
                Acknowledged {formatDate(userAck.acknowledgedAt)}
                {#if userAck.attending !== undefined}
                  • {userAck.attending ? 'Attending' : 'Not Attending'}
                {/if}
              </span>
            </div>
          {/if}
        {/if}
      </div>
    {/each}

    {#if sortedBroadcasts.length === 0}
      <div class="collaboration-card p-12 text-center">
        <Megaphone class="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 class="text-xl font-semibold text-gray-600 mb-2">No broadcasts yet</h3>
        <p class="text-gray-500 mb-4">
          {#if canSendBroadcasts}
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
</div>
