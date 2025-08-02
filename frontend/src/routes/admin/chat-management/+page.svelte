<script lang="ts">
  import { MessageSquare, Users, Eye, Ban, Archive, Search, Clock, AlertTriangle } from 'lucide-svelte';
  import Navigation from '$lib/components/Navigation.svelte';

  // TypeScript interfaces
  interface ChatSession {
    id: string;
    type: 'direct' | 'group';
    name?: string;
    participants: string[];
    lastActivity: Date;
    messageCount: number;
    status: 'active' | 'archived' | 'moderated';
    flagged: boolean;
    reportCount: number;
  }

  // Mock chat data
  let chatSessions = $state<ChatSession[]>([
    {
      id: '1',
      type: 'direct',
      participants: ['John Doe', 'Sarah Wilson'],
      lastActivity: new Date(Date.now() - 300000), // 5 min ago
      messageCount: 45,
      status: 'active',
      flagged: false,
      reportCount: 0
    },
    {
      id: '2',
      type: 'group',
      name: 'Project Alpha Team',
      participants: ['Mike Davis', 'Lisa Johnson', 'Bob Smith', 'Carol White'],
      lastActivity: new Date(Date.now() - 1800000), // 30 min ago
      messageCount: 156,
      status: 'active',
      flagged: true,
      reportCount: 2
    },
    {
      id: '3',
      type: 'direct',
      participants: ['Alice Brown', 'David Wilson'],
      lastActivity: new Date(Date.now() - 86400000), // 1 day ago
      messageCount: 23,
      status: 'archived',
      flagged: false,
      reportCount: 0
    },
    {
      id: '4',
      type: 'group',
      name: 'Sales Team Q3',
      participants: ['Emma Taylor', 'James Miller', 'Rachel Green'],
      lastActivity: new Date(Date.now() - 43200000), // 12 hours ago
      messageCount: 89,
      status: 'moderated',
      flagged: true,
      reportCount: 1
    }
  ]);

  let searchQuery = $state<string>('');
  let filterStatus = $state<string>('all');
  let selectedChat = $state<ChatSession | null>(null);
  let showChatDetails = $state<boolean>(false);

  // Mock recent reports
  let reports = $state([
    {
      id: '1',
      chatId: '2',
      chatName: 'Project Alpha Team',
      reportedBy: 'John Admin',
      reason: 'Inappropriate content',
      timestamp: new Date(Date.now() - 3600000),
      status: 'pending'
    },
    {
      id: '2',
      chatId: '4',
      chatName: 'Sales Team Q3',
      reportedBy: 'Sarah Manager',
      reason: 'Harassment',
      timestamp: new Date(Date.now() - 7200000),
      status: 'reviewed'
    }
  ]);

  // Computed values
  let filteredChats = $derived(
    chatSessions.filter(chat => {
      const matchesSearch = 
        (chat.name && chat.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        chat.participants.some(p => p.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesFilter = filterStatus === 'all' || chat.status === filterStatus;
      
      return matchesSearch && matchesFilter;
    })
  );

  const viewChatDetails = (chat: any) => {
    selectedChat = chat;
    showChatDetails = true;
  };

  const moderateChat = (chatId: string, action: string) => {
    const chat = chatSessions.find(c => c.id === chatId);
    if (chat) {
      if (action === 'archive') {
        chat.status = 'archived';
        alert('Chat session archived successfully!');
      } else if (action === 'moderate') {
        chat.status = 'moderated';
        alert('Chat session moderated successfully!');
      } else if (action === 'flag') {
        chat.flagged = !chat.flagged;
        alert(`Chat ${chat.flagged ? 'flagged' : 'unflagged'} successfully!`);
      }
      chatSessions = [...chatSessions];
    }
  };

  const resolveReport = (reportId: string) => {
    const report = reports.find(r => r.id === reportId);
    if (report) {
      report.status = 'resolved';
      reports = [...reports];
      alert('Report resolved successfully!');
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${diffInDays}d ago`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'archived': return 'text-gray-600 bg-gray-100';
      case 'moderated': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getReportStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-red-600 bg-red-100';
      case 'reviewed': return 'text-yellow-600 bg-yellow-100';
      case 'resolved': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };
</script>

<svelte:head>
  <title>Chat Management - Admin Controls</title>
</svelte:head>

<div class="h-screen flex flex-col bg-gray-50">
  <Navigation />
  
  <div class="flex-1 overflow-auto">
    <div class="p-6 space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between fade-in">
    <div>
      <h1 class="text-3xl font-bold text-gray-800 mb-2">Chat Management</h1>
      <p class="text-gray-600">Monitor and moderate chat sessions across the platform</p>
    </div>
  </div>

  <!-- Stats Cards -->
  <div class="grid grid-cols-1 md:grid-cols-4 gap-6 fade-in">
    <div class="collaboration-card p-6">
      <div class="flex items-center">
        <div class="p-3 rounded-full bg-blue-100">
          <MessageSquare class="w-6 h-6 text-blue-600" />
        </div>
        <div class="ml-4">
          <p class="text-sm font-medium text-gray-500">Total Chats</p>
          <p class="text-2xl font-semibold text-gray-900">{chatSessions.length}</p>
        </div>
      </div>
    </div>

    <div class="collaboration-card p-6">
      <div class="flex items-center">
        <div class="p-3 rounded-full bg-green-100">
          <Users class="w-6 h-6 text-green-600" />
        </div>
        <div class="ml-4">
          <p class="text-sm font-medium text-gray-500">Active Sessions</p>
          <p class="text-2xl font-semibold text-gray-900">{chatSessions.filter(c => c.status === 'active').length}</p>
        </div>
      </div>
    </div>

    <div class="collaboration-card p-6">
      <div class="flex items-center">
        <div class="p-3 rounded-full bg-red-100">
          <AlertTriangle class="w-6 h-6 text-red-600" />
        </div>
        <div class="ml-4">
          <p class="text-sm font-medium text-gray-500">Flagged Chats</p>
          <p class="text-2xl font-semibold text-gray-900">{chatSessions.filter(c => c.flagged).length}</p>
        </div>
      </div>
    </div>

    <div class="collaboration-card p-6">
      <div class="flex items-center">
        <div class="p-3 rounded-full bg-yellow-100">
          <Clock class="w-6 h-6 text-yellow-600" />
        </div>
        <div class="ml-4">
          <p class="text-sm font-medium text-gray-500">Pending Reports</p>
          <p class="text-2xl font-semibold text-gray-900">{reports.filter(r => r.status === 'pending').length}</p>
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
          placeholder="Search chats by name or participants..."
          class="input-field pl-10"
        />
      </div>
      <select bind:value={filterStatus} class="input-field w-40">
        <option value="all">All Status</option>
        <option value="active">Active</option>
        <option value="archived">Archived</option>
        <option value="moderated">Moderated</option>
      </select>
      <div class="text-sm text-gray-500">
        {filteredChats.length} of {chatSessions.length} chats
      </div>
    </div>
  </div>

  <!-- Recent Reports -->
  {#if reports.filter(r => r.status === 'pending').length > 0}
    <div class="collaboration-card p-6 fade-in border-l-4 border-red-500">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-gray-800">Pending Reports</h2>
        <span class="text-sm text-red-600 font-medium">Requires attention</span>
      </div>
      
      <div class="space-y-3">
        {#each reports.filter(r => r.status === 'pending') as report}
          <div class="flex items-center justify-between p-3 bg-red-50 rounded-lg">
            <div>
              <div class="font-medium text-gray-900">{report.chatName}</div>
              <div class="text-sm text-gray-600">Reported by {report.reportedBy} • {report.reason}</div>
              <div class="text-xs text-gray-500">{formatTimeAgo(report.timestamp)}</div>
            </div>
            <div class="flex space-x-2">
              <button
                onclick={() => resolveReport(report.id)}
                class="primary-button text-sm py-1 px-3"
              >
                Resolve
              </button>
              <button
                onclick={() => viewChatDetails(chatSessions.find(c => c.id === report.chatId))}
                class="secondary-button text-sm py-1 px-3"
              >
                View Chat
              </button>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Chat Sessions Table -->
  <div class="collaboration-card fade-in">
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chat</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Participants</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Activity</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Messages</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          {#each filteredChats as chat}
            <tr class="hover:bg-gray-50 transition-colors">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="flex-shrink-0 h-10 w-10">
                    <div class="h-10 w-10 rounded-full bg-gradient-to-r from-[#01c0a4] to-[#00a085] flex items-center justify-center">
                      {#if chat.type === 'group'}
                        <Users class="w-5 h-5 text-white" />
                      {:else}
                        <MessageSquare class="w-5 h-5 text-white" />
                      {/if}
                    </div>
                  </div>
                  <div class="ml-4">
                    <div class="flex items-center">
                      <div class="text-sm font-medium text-gray-900">
                        {chat.name || chat.participants.join(' • ')}
                      </div>
                      {#if chat.flagged}
                        <AlertTriangle class="w-4 h-4 text-red-500 ml-2" />
                      {/if}
                    </div>
                    <div class="text-sm text-gray-500">
                      {chat.type === 'group' ? 'Group Chat' : 'Direct Message'}
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="text-sm text-gray-900">
                  {chat.participants.slice(0, 2).join(', ')}
                  {#if chat.participants.length > 2}
                    <span class="text-gray-500">+{chat.participants.length - 2} more</span>
                  {/if}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatTimeAgo(chat.lastActivity)}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {chat.messageCount}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getStatusColor(chat.status)}">
                  {chat.status.charAt(0).toUpperCase() + chat.status.slice(1)}
                </span>
                {#if chat.reportCount > 0}
                  <span class="ml-2 text-xs text-red-600 font-medium">{chat.reportCount} reports</span>
                {/if}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <button
                  onclick={() => viewChatDetails(chat)}
                  class="text-[#01c0a4] hover:text-[#00a085] transition-colors"
                  title="View Details"
                >
                  <Eye class="w-4 h-4" />
                </button>
                <button
                  onclick={() => moderateChat(chat.id, 'flag')}
                  class="text-yellow-600 hover:text-yellow-800 transition-colors"
                  title={chat.flagged ? 'Unflag' : 'Flag'}
                >
                  <AlertTriangle class="w-4 h-4" />
                </button>
                <button
                  onclick={() => moderateChat(chat.id, 'moderate')}
                  class="text-orange-600 hover:text-orange-800 transition-colors"
                  title="Moderate"
                >
                  <Ban class="w-4 h-4" />
                </button>
                <button
                  onclick={() => moderateChat(chat.id, 'archive')}
                  class="text-gray-600 hover:text-gray-800 transition-colors"
                  title="Archive"
                >
                  <Archive class="w-4 h-4" />
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    {#if filteredChats.length === 0}
      <div class="text-center py-12">
        <MessageSquare class="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 class="text-xl font-semibold text-gray-600 mb-2">No chat sessions found</h3>
        <p class="text-gray-500">
          {searchQuery ? 'Try adjusting your search criteria.' : 'Chat sessions will appear here as they are created.'}
        </p>
      </div>
    {/if}
  </div>
    </div>
  </div>
</div>

<!-- Chat Details Modal -->
{#if showChatDetails && selectedChat}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onclick={() => showChatDetails = false}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4" onclick={(e) => e.stopPropagation()}>
      <div class="p-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">Chat Session Details</h2>
        
        <div class="space-y-4">
          <div class="flex items-center space-x-4">
            <div class="h-16 w-16 rounded-full bg-gradient-to-r from-[#01c0a4] to-[#00a085] flex items-center justify-center">
              {#if selectedChat.type === 'group'}
                <Users class="w-8 h-8 text-white" />
              {:else}
                <MessageSquare class="w-8 h-8 text-white" />
              {/if}
            </div>
            <div>
              <div class="text-lg font-medium text-gray-900">
                {selectedChat.name || selectedChat.participants.join(' • ')}
              </div>
              <div class="text-sm text-gray-500">
                {selectedChat.type === 'group' ? 'Group Chat' : 'Direct Message'}
              </div>
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-gray-500">Status:</span>
              <div class="font-medium">{selectedChat.status.charAt(0).toUpperCase() + selectedChat.status.slice(1)}</div>
            </div>
            <div>
              <span class="text-gray-500">Messages:</span>
              <div class="font-medium">{selectedChat.messageCount}</div>
            </div>
            <div>
              <span class="text-gray-500">Participants:</span>
              <div class="font-medium">{selectedChat.participants.length}</div>
            </div>
            <div>
              <span class="text-gray-500">Reports:</span>
              <div class="font-medium {selectedChat.reportCount > 0 ? 'text-red-600' : ''}">{selectedChat.reportCount}</div>
            </div>
            <div>
              <span class="text-gray-500">Flagged:</span>
              <div class="font-medium {selectedChat.flagged ? 'text-red-600' : 'text-green-600'}">{selectedChat.flagged ? 'Yes' : 'No'}</div>
            </div>
            <div>
              <span class="text-gray-500">Last Activity:</span>
              <div class="font-medium">{formatTimeAgo(selectedChat.lastActivity)}</div>
            </div>
          </div>

          <div>
            <span class="text-gray-500">Participants:</span>
            <div class="mt-2 space-y-1">
              {#each selectedChat.participants as participant}
                <div class="text-sm font-medium">{participant}</div>
              {/each}
            </div>
          </div>
        </div>

        <div class="flex space-x-3 mt-6">
          <button
            onclick={() => showChatDetails = false}
            class="flex-1 secondary-button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
