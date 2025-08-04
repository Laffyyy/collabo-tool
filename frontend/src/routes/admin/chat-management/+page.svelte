<script lang="ts">
  import { MessageSquare, Search, Eye, Trash2, AlertTriangle, Users, Calendar, Clock, Check } from 'lucide-svelte';

  interface ChatMessage {
    id: string;
    conversationId: string;
    conversationName: string;
    sender: string;
    content: string;
    timestamp: Date;
    type: '1v1' | 'group';
    flagged: boolean;
    participants: string[];
  }

  interface ChatConversation {
    id: string;
    name: string;
    type: '1v1' | 'group';
    participants: string[];
    messageCount: number;
    lastActivity: Date;
    archived: boolean;
  }

  let activeTab = $state<'conversations' | 'messages' | 'flagged'>('conversations');
  let searchQuery = $state('');
  let selectedType = $state<'all' | '1v1' | 'group'>('all');

  // Mock data
  const mockConversations: ChatConversation[] = [
    {
      id: '1',
      name: 'Marketing Team',
      type: 'group',
      participants: ['john.doe@company.com', 'jane.smith@company.com', 'bob.wilson@company.com'],
      messageCount: 156,
      lastActivity: new Date('2024-01-15T15:30:00'),
      archived: false
    },
    {
      id: '2',
      name: 'John & Jane',
      type: '1v1',
      participants: ['john.doe@company.com', 'jane.smith@company.com'],
      messageCount: 45,
      lastActivity: new Date('2024-01-15T14:20:00'),
      archived: false
    },
    {
      id: '3',
      name: 'Support Team',
      type: 'group',
      participants: ['support1@company.com', 'support2@company.com', 'manager@company.com'],
      messageCount: 89,
      lastActivity: new Date('2024-01-15T13:45:00'),
      archived: false
    }
  ];

  const mockMessages: ChatMessage[] = [
    {
      id: '1',
      conversationId: '1',
      conversationName: 'Marketing Team',
      sender: 'john.doe@company.com',
      content: 'Hey team, let\'s discuss the new campaign strategy.',
      timestamp: new Date('2024-01-15T15:30:00'),
      type: 'group',
      flagged: false,
      participants: ['john.doe@company.com', 'jane.smith@company.com', 'bob.wilson@company.com']
    },
    {
      id: '2',
      conversationId: '2',
      conversationName: 'John & Jane',
      sender: 'jane.smith@company.com',
      content: 'Can we review the budget proposal together?',
      timestamp: new Date('2024-01-15T14:20:00'),
      type: '1v1',
      flagged: false,
      participants: ['john.doe@company.com', 'jane.smith@company.com']
    },
    {
      id: '3',
      conversationId: '3',
      conversationName: 'Support Team',
      sender: 'support1@company.com',
      content: 'This message contains inappropriate content that was flagged.',
      timestamp: new Date('2024-01-15T13:45:00'),
      type: 'group',
      flagged: true,
      participants: ['support1@company.com', 'support2@company.com', 'manager@company.com']
    }
  ];

  // Computed values
  const filteredConversations = $derived(() => {
    return mockConversations.filter(conv => {
      const matchesSearch = searchQuery === '' || 
        conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.participants.some(p => p.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesType = selectedType === 'all' || conv.type === selectedType;
      
      return matchesSearch && matchesType;
    });
  });

  const filteredMessages = $derived(() => {
    return mockMessages.filter(msg => {
      const matchesSearch = searchQuery === '' || 
        msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.conversationName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = selectedType === 'all' || msg.type === selectedType;
      
      return matchesSearch && matchesType;
    });
  });

  const flaggedMessages = $derived(() => {
    return mockMessages.filter(msg => msg.flagged);
  });

  const tabCounts = $derived(() => {
    return {
      conversations: filteredConversations().length,
      messages: filteredMessages().length,
      flagged: flaggedMessages().length
    };
  });

  const formatTimestamp = (date: Date) => {
    return date.toLocaleString();
  };

  const viewConversation = (conversation: ChatConversation) => {
    alert(`Viewing conversation: ${conversation.name}\nParticipants: ${conversation.participants.join(', ')}`);
  };

  const archiveConversation = (conversation: ChatConversation) => {
    if (confirm(`Archive conversation "${conversation.name}"?`)) {
      alert('Conversation archived successfully');
    }
  };

  const viewMessage = (message: ChatMessage) => {
    alert(`Message Details:\n\nFrom: ${message.sender}\nConversation: ${message.conversationName}\nContent: ${message.content}\nTime: ${formatTimestamp(message.timestamp)}`);
  };

  const deleteMessage = (message: ChatMessage) => {
    if (confirm('Delete this message? This action cannot be undone.')) {
      alert('Message deleted successfully');
    }
  };

  const unflagMessage = (message: ChatMessage) => {
    if (confirm('Remove flag from this message?')) {
      alert('Message unflagged successfully');
    }
  };
</script>

<svelte:head>
  <title>Chat Management - Admin Controls</title>
</svelte:head>

<div class="p-6 bg-gray-50 min-h-screen space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between fade-in">
        <div>
          <h1 class="text-3xl font-bold text-gray-800 mb-2">Chat Management</h1>
          <p class="text-gray-600">Monitor and manage chat conversations and messages</p>
        </div>
      </div>

      <!-- Main Panel -->
      <div class="collaboration-card fade-in">
        <!-- Search and Filters -->
        <div class="p-6 border-b border-gray-200">
          <div class="flex flex-col lg:flex-row gap-4">
            <!-- Search -->
            <div class="flex-1">
              <div class="relative">
                <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  bind:value={searchQuery}
                  type="text"
                  placeholder="Search conversations, messages, or participants..."
                  class="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent text-sm"
                />
              </div>
            </div>
            
            <!-- Type Filter -->
            <div class="w-full lg:w-48">
              <select
                bind:value={selectedType}
                class="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent text-sm"
              >
                <option value="all">All Types</option>
                <option value="1v1">1:1 Chats</option>
                <option value="group">Group Chats</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Tabs -->
        <div class="border-b border-gray-200">
          <nav class="flex space-x-6 px-6">
            <button
              onclick={() => activeTab = 'conversations'}
              class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'conversations' ? 'border-[#01c0a4] text-[#01c0a4]' : 'border-transparent text-gray-500 hover:text-gray-700'}"
            >
              <div class="flex items-center space-x-2">
                <MessageSquare class="w-4 h-4" />
                <span>Conversations</span>
                <span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{tabCounts().conversations}</span>
              </div>
            </button>
            
            <button
              onclick={() => activeTab = 'messages'}
              class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'messages' ? 'border-[#01c0a4] text-[#01c0a4]' : 'border-transparent text-gray-500 hover:text-gray-700'}"
            >
              <div class="flex items-center space-x-2">
                <MessageSquare class="w-4 h-4" />
                <span>Messages</span>
                <span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{tabCounts().messages}</span>
              </div>
            </button>
            
            <button
              onclick={() => activeTab = 'flagged'}
              class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'flagged' ? 'border-[#01c0a4] text-[#01c0a4]' : 'border-transparent text-gray-500 hover:text-gray-700'}"
            >
              <div class="flex items-center space-x-2">
                <AlertTriangle class="w-4 h-4" />
                <span>Flagged</span>
                <span class="bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs">{tabCounts().flagged}</span>
              </div>
            </button>
          </nav>
        </div>

        <!-- Content -->
        {#if activeTab === 'conversations'}
          <!-- Conversations Table -->
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Participants</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Messages</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Activity</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                {#each filteredConversations() as conversation (conversation.id)}
                  <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center">
                        <MessageSquare class="w-4 h-4 text-gray-400 mr-2" />
                        <span class="text-sm font-medium text-gray-900">{conversation.name}</span>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {conversation.type === 'group' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}">
                        {conversation.type === 'group' ? 'Group' : '1:1'}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div class="flex items-center">
                        <Users class="w-4 h-4 mr-1" />
                        {conversation.participants.length}
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {conversation.messageCount}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatTimestamp(conversation.lastActivity)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div class="flex items-center space-x-2">
                        <button
                          onclick={() => viewConversation(conversation)}
                          class="text-[#01c0a4] hover:text-[#00a08a] flex items-center space-x-1"
                        >
                          <Eye class="w-4 h-4" />
                          <span>View</span>
                        </button>
                        <button
                          onclick={() => archiveConversation(conversation)}
                          class="text-orange-600 hover:text-orange-500 flex items-center space-x-1"
                        >
                          <Trash2 class="w-4 h-4" />
                          <span>Archive</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {:else if activeTab === 'messages'}
          <!-- Messages Table -->
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sender</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conversation</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Content</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                {#each filteredMessages() as message (message.id)}
                  <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatTimestamp(message.timestamp)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {message.sender}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {message.conversationName}
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {message.content}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {message.type === 'group' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}">
                        {message.type === 'group' ? 'Group' : '1:1'}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div class="flex items-center space-x-2">
                        <button
                          onclick={() => viewMessage(message)}
                          class="text-[#01c0a4] hover:text-[#00a08a] flex items-center space-x-1"
                        >
                          <Eye class="w-4 h-4" />
                          <span>View</span>
                        </button>
                        <button
                          onclick={() => deleteMessage(message)}
                          class="text-red-600 hover:text-red-500 flex items-center space-x-1"
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
          </div>
        {:else if activeTab === 'flagged'}
          <!-- Flagged Messages Table -->
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sender</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conversation</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Content</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                {#each flaggedMessages() as message (message.id)}
                  <tr class="hover:bg-gray-50 bg-red-50">
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatTimestamp(message.timestamp)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {message.sender}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {message.conversationName}
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      <div class="flex items-center">
                        <AlertTriangle class="w-4 h-4 text-red-500 mr-2" />
                        {message.content}
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div class="flex items-center space-x-2">
                        <button
                          onclick={() => viewMessage(message)}
                          class="text-[#01c0a4] hover:text-[#00a08a] flex items-center space-x-1"
                        >
                          <Eye class="w-4 h-4" />
                          <span>View</span>
                        </button>
                        <button
                          onclick={() => unflagMessage(message)}
                          class="text-green-600 hover:text-green-500 flex items-center space-x-1"
                        >
                          <Check class="w-4 h-4" />
                          <span>Unflag</span>
                        </button>
                        <button
                          onclick={() => deleteMessage(message)}
                          class="text-red-600 hover:text-red-500 flex items-center space-x-1"
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
          </div>
        {/if}

        <!-- Empty State -->
        {#if (activeTab === 'conversations' && filteredConversations().length === 0) || (activeTab === 'messages' && filteredMessages().length === 0) || (activeTab === 'flagged' && flaggedMessages().length === 0)}
          <div class="text-center py-12">
            <MessageSquare class="mx-auto h-12 w-12 text-gray-400" />
            <h3 class="mt-2 text-sm font-medium text-gray-900">No {activeTab} found</h3>
            <p class="mt-1 text-sm text-gray-500">Try adjusting your search criteria or filters.</p>
          </div>
        {/if}
      </div>
</div>