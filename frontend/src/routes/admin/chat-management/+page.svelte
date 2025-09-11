<script lang="ts">
  import { MessageSquare, Search, Eye, Trash2, AlertTriangle, Users, Calendar, Clock, Check, X, Archive, Undo2, Paperclip, Smile } from 'lucide-svelte';
  import ConfirmationModal from '$lib/components/ConfirmationModal.svelte';
  import ProfileAvatar from '$lib/components/ProfileAvatar.svelte';
  import { themeStore } from '$lib/stores/theme.svelte';

  let isDarkMode = $derived(themeStore.isDarkMode);

  interface ChatMessage {
    id: string;
    conversationId: string;
    conversationName: string;
    sender: string;
    content: string;
    timestamp: Date;
    type: '1v1' | 'group';
    flagged: boolean;
    flagReason?: string;
    flagType?: string;
    participants: string[];
    status: 'active' | 'deleted';
  }

  interface ChatConversation {
    id: string;
    name: string;
    type: '1v1' | 'group';
    participants: string[];
    messageCount: number;
    lastActivity: Date;
    archived: boolean;
    messages: ChatMessage[];
  }

  let activeTab = $state<'conversations' | 'flagged' | 'archived' | 'messages'>('messages');
  let searchQuery = $state('');
  let selectedType = $state<'all' | '1v1' | 'group'>('all');
  
  // Modal states
  let showConversationModal = $state(false);
  let selectedConversation = $state<ChatConversation | null>(null);
  let showConfirmModal = $state(false);
  let showRestoreModal = $state(false);
  let confirmAction = $state<{
    title: string;
    message: string;
    confirmText: string;
    style: 'danger' | 'warning' | 'primary';
    action: () => void;
  } | null>(null);
  let showMessageModal = $state(false);
  let selectedMessage = $state<ChatMessage | null>(null);
  
  // Chat modal state
  let messageInput = $state('');

  // Input filtering function
  const filterSearchInput = (value: string) => {
    // Allow only alphanumeric characters, spaces, and specific symbols: &, _, -, (, )
    const allowedPattern = /^[a-zA-Z0-9\s&_\-()]*$/;
    const filtered = value.replace(/[^a-zA-Z0-9\s&_\-()]/g, '');
    return filtered.slice(0, 50); // Limit to 50 characters
  };

  const handleSearchInput = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const filteredValue = filterSearchInput(target.value);
    searchQuery = filteredValue;
    if (target.value !== filteredValue) {
      target.value = filteredValue;
    }
  };

  const handleSearchPaste = (event: ClipboardEvent) => {
    event.preventDefault();
    const clipboardData = event.clipboardData?.getData('text') || '';
    const filteredValue = filterSearchInput(clipboardData);
    const currentValue = searchQuery;
    const newValue = filterSearchInput(currentValue + filteredValue);
    searchQuery = newValue;
  };

  // Mock data
  const mockConversations: ChatConversation[] = [
    {
      id: '1',
      name: 'Marketing Team',
      type: 'group',
      participants: ['john.doe@company.com', 'jane.smith@company.com', 'bob.wilson@company.com'],
      messageCount: 156,
      lastActivity: new Date('2024-01-15T15:30:00'),
      archived: false,
      messages: [
        {
          id: '1',
          conversationId: '1',
          conversationName: 'Marketing Team',
          sender: 'john.doe@company.com',
          content: 'Hey team, let\'s discuss the new campaign strategy.',
          timestamp: new Date('2024-01-15T15:30:00'),
          type: 'group',
          flagged: false,
          participants: ['john.doe@company.com', 'jane.smith@company.com', 'bob.wilson@company.com'],
          status: 'active'
        },
        {
          id: '2',
          conversationId: '1',
          conversationName: 'Marketing Team',
          sender: 'jane.smith@company.com',
          content: 'Great idea! I have some preliminary designs ready.',
          timestamp: new Date('2024-01-15T15:25:00'),
          type: 'group',
          flagged: false,
          participants: ['john.doe@company.com', 'jane.smith@company.com', 'bob.wilson@company.com'],
          status: 'active'
        },
        {
          id: '3',
          conversationId: '1',
          conversationName: 'Marketing Team',
          sender: 'bob.wilson@company.com',
          content: 'Perfect timing! Can we schedule a meeting for tomorrow?',
          timestamp: new Date('2024-01-15T15:20:00'),
          type: 'group',
          flagged: false,
          participants: ['john.doe@company.com', 'jane.smith@company.com', 'bob.wilson@company.com'],
          status: 'active'
        }
      ]
    },
    {
      id: '2',
      name: 'John and Jane',
      type: '1v1',
      participants: ['john.doe@company.com', 'jane.smith@company.com'],
      messageCount: 45,
      lastActivity: new Date('2024-01-15T14:20:00'),
      archived: false,
      messages: [
        {
          id: '4',
          conversationId: '2',
          conversationName: 'John and Jane',
          sender: 'jane.smith@company.com',
          content: 'Can we review the budget proposal together?',
          timestamp: new Date('2024-01-15T14:20:00'),
          type: '1v1',
          flagged: false,
          participants: ['john.doe@company.com', 'jane.smith@company.com'],
          status: 'active'
        },
        {
          id: '5',
          conversationId: '2',
          conversationName: 'John and Jane',
          sender: 'john.doe@company.com',
          content: 'Sure, I\'m available after 3 PM today.',
          timestamp: new Date('2024-01-15T14:15:00'),
          type: '1v1',
          flagged: false,
          participants: ['john.doe@company.com', 'jane.smith@company.com'],
          status: 'active'
        }
      ]
    },
    {
      id: '3',
      name: 'Support Team',
      type: 'group',
      participants: ['support1@company.com', 'support2@company.com', 'manager@company.com'],
      messageCount: 89,
      lastActivity: new Date('2024-01-15T13:45:00'),
      archived: false,
      messages: [
        {
          id: '6',
          conversationId: '3',
          conversationName: 'Support Team',
          sender: 'support1@company.com',
          content: 'Customer ticket #1234 needs urgent attention.',
          timestamp: new Date('2024-01-15T13:45:00'),
          type: 'group',
          flagged: false,
          participants: ['support1@company.com', 'support2@company.com', 'manager@company.com'],
          status: 'active'
        }
      ]
    }
  ];

  const mockArchivedConversations: ChatConversation[] = [
    {
      id: '4',
      name: 'Old Project Team',
      type: 'group',
      participants: ['former1@company.com', 'former2@company.com', 'former3@company.com'],
      messageCount: 245,
      lastActivity: new Date('2024-01-10T10:30:00'),
      archived: true,
      messages: [
        {
          id: '7',
          conversationId: '4',
          conversationName: 'Old Project Team',
          sender: 'former1@company.com',
          content: 'Project completed successfully! Great work everyone.',
          timestamp: new Date('2024-01-10T10:30:00'),
          type: 'group',
          flagged: false,
          participants: ['former1@company.com', 'former2@company.com', 'former3@company.com'],
          status: 'active'
        }
      ]
    },
    {
      id: '5',
      name: 'Archived Sales Chat',
      type: 'group',
      participants: ['sales1@company.com', 'sales2@company.com'],
      messageCount: 67,
      lastActivity: new Date('2024-01-08T16:20:00'),
      archived: true,
      messages: [
        {
          id: '8',
          conversationId: '5',
          conversationName: 'Archived Sales Chat',
          sender: 'sales1@company.com',
          content: 'Quarter targets achieved!',
          timestamp: new Date('2024-01-08T16:20:00'),
          type: 'group',
          flagged: false,
          participants: ['sales1@company.com', 'sales2@company.com'],
          status: 'active'
        }
      ]
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
      participants: ['john.doe@company.com', 'jane.smith@company.com', 'bob.wilson@company.com'],
      status: 'active'
    },
    {
      id: '2',
      conversationId: '2',
      conversationName: 'John and Jane',
      sender: 'jane.smith@company.com',
      content: 'Can we review the budget proposal together?',
      timestamp: new Date('2024-01-15T14:20:00'),
      type: '1v1',
      flagged: false,
      participants: ['john.doe@company.com', 'jane.smith@company.com'],
      status: 'active'
    },
    {
      id: '3',
      conversationId: '3',
      conversationName: 'Support Team',
      sender: 'support1@company.com',
      content: 'You are ugly! I hate working with people like you.',
      timestamp: new Date('2024-01-15T13:45:00'),
      type: 'group',
      flagged: true,
      flagReason: 'Contains harassment and abusive language towards team members',
      flagType: 'Harassment',
      participants: ['support1@company.com', 'support2@company.com', 'manager@company.com'],
      status: 'active'
    },
    {
      id: '9',
      conversationId: '1',
      conversationName: 'Marketing Team',
      sender: 'jane.smith@company.com',
      content: 'Great idea! I have some preliminary designs ready.',
      timestamp: new Date('2024-01-15T12:30:00'),
      type: 'group',
      flagged: false,
      participants: ['john.doe@company.com', 'jane.smith@company.com', 'bob.wilson@company.com'],
      status: 'deleted'
    },
    {
      id: '10',
      conversationId: '2',
      conversationName: 'John and Jane',
      sender: 'john.doe@company.com',
      content: 'This is complete garbage work! Fire whoever did this!',
      timestamp: new Date('2024-01-15T11:45:00'),
      type: '1v1',
      flagged: true,
      flagReason: 'Inappropriate language and unprofessional behavior in workplace communication',
      flagType: 'Inappropriate Language',
      participants: ['john.doe@company.com', 'jane.smith@company.com'],
      status: 'active'
    }
  ];

  // Computed values
  const filteredConversations = $derived(() => {
    return mockConversations.filter(conv => {
      const matchesSearch = searchQuery === '' || 
        conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.participants.some(p => p.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesType = selectedType === 'all' || conv.type === selectedType;
      
      return matchesSearch && matchesType && !conv.archived;
    });
  });

  const filteredArchivedConversations = $derived(() => {
    return mockArchivedConversations.filter(conv => {
      const matchesSearch = searchQuery === '' || 
        conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.participants.some(p => p.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesType = selectedType === 'all' || conv.type === selectedType;
      
      return matchesSearch && matchesType;
    });
  });

  const flaggedMessages = $derived(() => {
    return mockMessages.filter(msg => {
      const matchesFlag = msg.flagged;
      const matchesSearch = searchQuery === '' || 
        msg.conversationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = selectedType === 'all' || msg.type === selectedType;
      
      return matchesFlag && matchesSearch && matchesType;
    });
  });

  const allMessages = $derived(() => {
    return mockMessages.filter(msg => {
      const notFlagged = !msg.flagged;
      const matchesSearch = searchQuery === '' || 
        msg.conversationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = selectedType === 'all' || msg.type === selectedType;
      
      return notFlagged && matchesSearch && matchesType;
    });
  });

  const tabCounts = $derived(() => {
    return {
      conversations: filteredConversations().length,
      flagged: flaggedMessages().length,
      archived: filteredArchivedConversations().length,
      messages: allMessages().length
    };
  });

  const formatTimestamp = (date: Date) => {
    return date.toLocaleString();
  };

  const openConversationModal = (conversation: ChatConversation) => {
    selectedConversation = conversation;
    showConversationModal = true;
  };

  const closeConversationModal = () => {
    selectedConversation = null;
    showConversationModal = false;
    messageInput = '';
  };

  const confirmArchiveConversation = (conversation: ChatConversation) => {
    confirmAction = {
      title: 'Archive Conversation',
      message: `Are you sure you want to archive "${conversation.name}"? This will move it to the archived conversations list.`,
      confirmText: 'Archive',
      style: 'warning',
      action: () => archiveConversation(conversation)
    };
    showConfirmModal = true;
  };

  const archiveConversation = (conversation: ChatConversation) => {
    conversation.archived = true;
    mockArchivedConversations.push(conversation);
    const index = mockConversations.findIndex(c => c.id === conversation.id);
    if (index !== -1) {
      mockConversations.splice(index, 1);
    }
    showConfirmModal = false;
    alert('Conversation archived successfully');
  };

  const confirmUnarchiveConversation = (conversation: ChatConversation) => {
    selectedConversation = conversation;
    showRestoreModal = true;
  };

  const unarchiveConversation = (conversation: ChatConversation) => {
    conversation.archived = false;
    mockConversations.push(conversation);
    const index = mockArchivedConversations.findIndex(c => c.id === conversation.id);
    if (index !== -1) {
      mockArchivedConversations.splice(index, 1);
    }
    showRestoreModal = false;
    selectedConversation = null;
    alert('Conversation restored successfully');
  };

  const openMessageModal = (message: ChatMessage) => {
    selectedMessage = message;
    showMessageModal = true;
  };

  const closeMessageModal = () => {
    selectedMessage = null;
    showMessageModal = false;
  };

  const confirmDeleteMessage = (message: ChatMessage) => {
    confirmAction = {
      title: 'Delete Message',
      message: 'Are you sure you want to delete this message? This action cannot be undone.',
      confirmText: 'Delete',
      style: 'danger',
      action: () => deleteMessage(message)
    };
    showConfirmModal = true;
  };

  const deleteMessage = (message: ChatMessage) => {
    message.status = 'deleted';
    showConfirmModal = false;
    if (showMessageModal) {
      closeMessageModal();
    }
    alert('Message deleted successfully');
  };

  const confirmUnflagMessage = (message: ChatMessage) => {
    confirmAction = {
      title: 'Remove Flag',
      message: 'Are you sure you want to remove the flag from this message?',
      confirmText: 'Unflag',
      style: 'primary',
      action: () => unflagMessage(message)
    };
    showConfirmModal = true;
  };

  const unflagMessage = (message: ChatMessage) => {
    message.flagged = false;
    showConfirmModal = false;
    if (showMessageModal) {
      closeMessageModal();
    }
    alert('Message unflagged successfully');
  };

  const sendMessageInModal = () => {
    if (!messageInput.trim() || !selectedConversation) return;
    
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      conversationId: selectedConversation.id,
      conversationName: selectedConversation.name,
      sender: 'admin@company.com',
      content: messageInput,
      timestamp: new Date(),
      type: selectedConversation.type,
      flagged: false,
      participants: selectedConversation.participants,
      status: 'active'
    };
    
    selectedConversation.messages.push(newMessage);
    messageInput = '';
  };

  const handleKeyPress = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessageInModal();
    }
  };
</script>

<svelte:head>
  <title>Chat Management - Admin Controls</title>
</svelte:head>

<div class="{isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} min-h-screen space-y-6 p-6 transition-colors duration-300">
      <!-- Header -->
      <div class="flex items-center justify-between fade-in">
        <div>
          <h1 class="{isDarkMode ? 'text-white' : 'text-gray-800'} text-3xl font-bold mb-2 transition-colors duration-300">Chat Management</h1>
          <p class="{isDarkMode ? 'text-gray-300' : 'text-gray-600'} transition-colors duration-300">Monitor and manage chat conversations and messages</p>
        </div>
      </div>

      <!-- Main Panel -->
      <div class="{isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-400'} rounded-2xl shadow-lg border fade-in transition-colors duration-300">
        <!-- Search and Filters -->
        <div class="{isDarkMode ? 'border-gray-700' : 'border-gray-400'} p-6 border-b transition-colors duration-300">
          <div class="flex flex-col lg:flex-row gap-4">
            <!-- Search -->
            <div class="flex-1">
              <div class="relative">
                <Search class="{isDarkMode ? 'text-gray-500' : 'text-gray-400'} absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 transition-colors duration-300" />
                <input
                  bind:value={searchQuery}
                  oninput={handleSearchInput}
                  onpaste={handleSearchPaste}
                  type="text"
                  maxlength="50"
                  placeholder="Search conversation name or sender..."
                  class="{isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500'} w-full pl-9 pr-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent text-sm transition-colors duration-300"
                />
              </div>
            </div>
            
            <!-- Type Filter -->
            <div class="w-full lg:w-48">
              <select
                bind:value={selectedType}
                class="{isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} w-full px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent text-sm transition-colors duration-300"
              >
                <option value="all">All Types</option>
                <option value="1v1">1:1 Chats</option>
                <option value="group">Group Chats</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Tabs -->
        <div class="{isDarkMode ? 'border-gray-700' : 'border-gray-400'} border-b transition-colors duration-300">
          <nav class="flex space-x-6 px-6">
            <button
              onclick={() => activeTab = 'messages'}
              class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'messages' ? 'border-[#01c0a4] text-[#01c0a4]' : isDarkMode ? 'border-transparent text-gray-400 hover:text-gray-200' : 'border-transparent text-gray-500 hover:text-gray-700'}"
            >
              <div class="flex items-center space-x-2">
                <MessageSquare class="w-4 h-4" />
                <span>All Messages</span>
                <span class="{isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'} px-2 py-0.5 rounded-full text-xs transition-colors duration-300">{tabCounts().messages}</span>
              </div>
            </button>

            <button
              onclick={() => activeTab = 'conversations'}
              class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'conversations' ? 'border-[#01c0a4] text-[#01c0a4]' : isDarkMode ? 'border-transparent text-gray-400 hover:text-gray-200' : 'border-transparent text-gray-500 hover:text-gray-700'}"
            >
              <div class="flex items-center space-x-2">
                <MessageSquare class="w-4 h-4" />
                <span>Conversations</span>
                <span class="{isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'} px-2 py-0.5 rounded-full text-xs transition-colors duration-300">{tabCounts().conversations}</span>
              </div>
            </button>
            
            <button
              onclick={() => activeTab = 'flagged'}
              class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'flagged' ? 'border-[#01c0a4] text-[#01c0a4]' : isDarkMode ? 'border-transparent text-gray-400 hover:text-gray-200' : 'border-transparent text-gray-500 hover:text-gray-700'}"
            >
              <div class="flex items-center space-x-2">
                <AlertTriangle class="w-4 h-4" />
                <span>Flagged</span>
                <span class="{isDarkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-600'} px-2 py-0.5 rounded-full text-xs transition-colors duration-300">{tabCounts().flagged}</span>
              </div>
            </button>

            <button
              onclick={() => activeTab = 'archived'}
              class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'archived' ? 'border-[#01c0a4] text-[#01c0a4]' : isDarkMode ? 'border-transparent text-gray-400 hover:text-gray-200' : 'border-transparent text-gray-500 hover:text-gray-700'}"
            >
              <div class="flex items-center space-x-2">
                <Archive class="w-4 h-4" />
                <span>Archived</span>
                <span class="{isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'} px-2 py-0.5 rounded-full text-xs transition-colors duration-300">{tabCounts().archived}</span>
              </div>
            </button>
          </nav>
        </div>

        <!-- Content -->
        {#if activeTab === 'messages'}
          <!-- All Messages Table -->
          <div class="overflow-hidden rounded-b-2xl">
            <div class="overflow-x-auto">
              <table class="w-full">
              <thead class="{isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} transition-colors duration-300">
                <tr>
                  <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Timestamp</th>
                  <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Email</th>
                  <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Type</th>
                  <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Conversation</th>
                  <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Message</th>
                  <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Status</th>
                  <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Actions</th>
                </tr>
              </thead>
              <tbody class="{isDarkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'} divide-y transition-colors duration-300">
                {#each allMessages() as message (message.id)}
                  <tr class="{isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} {message.flagged ? (isDarkMode ? 'bg-red-900/30' : 'bg-red-50') : message.status === 'deleted' ? (isDarkMode ? 'bg-gray-700' : 'bg-gray-50') : ''} transition-colors duration-300">
                    <td class="{isDarkMode ? 'text-gray-400' : 'text-gray-500'} px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300">
                      {formatTimestamp(message.timestamp)}
                    </td>
                    <td class="{isDarkMode ? 'text-gray-200' : 'text-gray-900'} px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300">
                      {message.sender}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {message.type === 'group' ? (isDarkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-800') : (isDarkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800')} transition-colors duration-300">
                        {message.type === 'group' ? 'Group' : '1:1'}
                      </span>
                    </td>
                    <td class="{isDarkMode ? 'text-gray-400' : 'text-gray-500'} px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300">
                      {message.conversationName}
                    </td>
                    <td class="{isDarkMode ? 'text-gray-200' : 'text-gray-900'} px-6 py-4 text-sm max-w-xs truncate transition-colors duration-300">
                      <div class="flex items-center">
                        {#if message.flagged}
                          <AlertTriangle class="w-4 h-4 text-red-500 mr-2" />
                        {/if}
                        <span>{message.content}</span>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                      <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {message.status === 'active' ? (isDarkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800') : (isDarkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-800')} transition-colors duration-300">
                        {message.status === 'active' ? 'Active' : 'Deleted'}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div class="flex items-center space-x-2">
                        <button
                          onclick={() => openMessageModal(message)}
                          class="text-[#01c0a4] hover:text-[#00a08a] flex items-center space-x-1 transition-colors duration-300"
                        >
                          <Eye class="w-4 h-4" />
                          <span>View</span>
                        </button>
                        {#if message.status === 'deleted'}
                          <button
                            onclick={() => confirmDeleteMessage(message)}
                            class="{isDarkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-500'} flex items-center space-x-1 transition-colors duration-300"
                          >
                            <Trash2 class="w-4 h-4" />
                            <span>Delete</span>
                          </button>
                        {/if}
                      </div>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
            </div>
          </div>
        {:else if activeTab === 'conversations'}
          <!-- Conversations Table -->
          <div class="overflow-hidden rounded-b-2xl">
            <div class="overflow-x-auto">
              <table class="w-full">
              <thead class="{isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} transition-colors duration-300">
                <tr>
                  <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Name</th>
                  <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Type</th>
                  <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Participants</th>
                  <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Messages</th>
                  <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Last Activity</th>
                  <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Actions</th>
                </tr>
              </thead>
              <tbody class="{isDarkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'} divide-y transition-colors duration-300">
                {#each filteredConversations() as conversation (conversation.id)}
                  <tr class="{isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} transition-colors duration-300">
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center">
                        <MessageSquare class="{isDarkMode ? 'text-gray-500' : 'text-gray-400'} w-4 h-4 mr-2 transition-colors duration-300" />
                        <span class="{isDarkMode ? 'text-gray-200' : 'text-gray-900'} text-sm font-medium transition-colors duration-300">{conversation.name}</span>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {conversation.type === 'group' ? (isDarkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-800') : (isDarkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800')} transition-colors duration-300">
                        {conversation.type === 'group' ? 'Group' : '1:1'}
                      </span>
                    </td>
                    <td class="{isDarkMode ? 'text-gray-400' : 'text-gray-500'} px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300">
                      <div class="flex items-center">
                        <Users class="w-4 h-4 mr-1" />
                        {conversation.participants.length}
                      </div>
                    </td>
                    <td class="{isDarkMode ? 'text-gray-200' : 'text-gray-900'} px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300">
                      {conversation.messageCount}
                    </td>
                    <td class="{isDarkMode ? 'text-gray-400' : 'text-gray-500'} px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300">
                      {formatTimestamp(conversation.lastActivity)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div class="flex items-center space-x-2">
                        <button
                          onclick={() => openConversationModal(conversation)}
                          class="text-[#01c0a4] hover:text-[#00a08a] flex items-center space-x-1 transition-colors duration-300"
                        >
                          <Eye class="w-4 h-4" />
                          <span>View</span>
                        </button>
                        {#if conversation.type === 'group'}
                          <button
                            onclick={() => confirmArchiveConversation(conversation)}
                            class="{isDarkMode ? 'text-orange-400 hover:text-orange-300' : 'text-orange-600 hover:text-orange-500'} flex items-center space-x-1 transition-colors duration-300"
                          >
                            <Archive class="w-4 h-4" />
                            <span>Archive</span>
                          </button>
                        {/if}
                      </div>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
            </div>
          </div>
        {:else if activeTab === 'flagged'}
          <!-- Flagged Messages Table -->
          <div class="overflow-hidden rounded-b-2xl">
            <div class="overflow-x-auto">
              <table class="w-full">
              <thead class="{isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} transition-colors duration-300">
                <tr>
                  <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Timestamp</th>
                  <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Sender</th>
                  <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Type</th>
                  <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Conversation</th>
                  <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Content</th>
                  <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Actions</th>
                </tr>
              </thead>
              <tbody class="{isDarkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'} divide-y transition-colors duration-300">
                {#each flaggedMessages() as message (message.id)}
                  <tr class="{isDarkMode ? 'hover:bg-gray-700 bg-red-900/30' : 'hover:bg-gray-50 bg-red-50'} transition-colors duration-300">
                    <td class="{isDarkMode ? 'text-gray-400' : 'text-gray-500'} px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300">
                      {formatTimestamp(message.timestamp)}
                    </td>
                    <td class="{isDarkMode ? 'text-gray-200' : 'text-gray-900'} px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300">
                      {message.sender}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {message.type === 'group' ? (isDarkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-800') : (isDarkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800')} transition-colors duration-300">
                        {message.type === 'group' ? 'Group' : '1:1'}
                      </span>
                    </td>
                    <td class="{isDarkMode ? 'text-gray-400' : 'text-gray-500'} px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300">
                      {message.conversationName}
                    </td>
                    <td class="{isDarkMode ? 'text-gray-200' : 'text-gray-900'} px-6 py-4 text-sm max-w-xs truncate transition-colors duration-300">
                      <div class="flex items-center">
                        <AlertTriangle class="w-4 h-4 text-red-500 mr-2" />
                        {message.content}
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div class="flex items-center space-x-2">
                        <button
                          onclick={() => openMessageModal(message)}
                          class="text-[#01c0a4] hover:text-[#00a08a] flex items-center space-x-1 transition-colors duration-300"
                        >
                          <Eye class="w-4 h-4" />
                          <span>View</span>
                        </button>
                        <button
                          onclick={() => confirmUnflagMessage(message)}
                          class="{isDarkMode ? 'text-green-400 hover:text-green-300' : 'text-green-600 hover:text-green-500'} flex items-center space-x-1 transition-colors duration-300"
                        >
                          <Check class="w-4 h-4" />
                          <span>Unflag</span>
                        </button>
                        <button
                          onclick={() => confirmDeleteMessage(message)}
                          class="{isDarkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-500'} flex items-center space-x-1 transition-colors duration-300"
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
          </div>
        {:else if activeTab === 'archived'}
          <!-- Archived Conversations Table -->
          <div class="overflow-hidden rounded-b-2xl">
            <div class="overflow-x-auto">
              <table class="w-full">
              <thead class="{isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} transition-colors duration-300">
                <tr>
                  <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Name</th>
                  <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Type</th>
                  <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Participants</th>
                  <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Messages</th>
                  <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Last Activity</th>
                  <th class="{isDarkMode ? 'text-gray-300' : 'text-gray-500'} px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300">Actions</th>
                </tr>
              </thead>
              <tbody class="{isDarkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'} divide-y transition-colors duration-300">
                {#each filteredArchivedConversations() as conversation (conversation.id)}
                  <tr class="{isDarkMode ? 'hover:bg-gray-700 bg-gray-700' : 'hover:bg-gray-50 bg-gray-50'} transition-colors duration-300">
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center">
                        <Archive class="{isDarkMode ? 'text-gray-500' : 'text-gray-400'} w-4 h-4 mr-2 transition-colors duration-300" />
                        <span class="{isDarkMode ? 'text-gray-300' : 'text-gray-700'} text-sm font-medium transition-colors duration-300">{conversation.name}</span>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600'} transition-colors duration-300">
                        {conversation.type === 'group' ? 'Group' : '1:1'}
                      </span>
                    </td>
                    <td class="{isDarkMode ? 'text-gray-400' : 'text-gray-500'} px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300">
                      <div class="flex items-center">
                        <Users class="w-4 h-4 mr-1" />
                        {conversation.participants.length}
                      </div>
                    </td>
                    <td class="{isDarkMode ? 'text-gray-300' : 'text-gray-700'} px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300">
                      {conversation.messageCount}
                    </td>
                    <td class="{isDarkMode ? 'text-gray-400' : 'text-gray-500'} px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300">
                      {formatTimestamp(conversation.lastActivity)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div class="flex items-center space-x-2">
                        <button
                          onclick={() => openConversationModal(conversation)}
                          class="text-[#01c0a4] hover:text-[#00a08a] flex items-center space-x-1 transition-colors duration-300"
                        >
                          <Eye class="w-4 h-4" />
                          <span>View</span>
                        </button>
                        <button
                          onclick={() => confirmUnarchiveConversation(conversation)}
                          class="{isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'} flex items-center space-x-1 transition-colors duration-300"
                        >
                          <Undo2 class="w-4 h-4" />
                          <span>Restore</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
            </div>
          </div>
        {/if}

        <!-- Empty State -->
        {#if (activeTab === 'conversations' && filteredConversations().length === 0) || 
             (activeTab === 'flagged' && flaggedMessages().length === 0) ||
             (activeTab === 'archived' && filteredArchivedConversations().length === 0) ||
             (activeTab === 'messages' && allMessages().length === 0)}
          <div class="text-center py-12">
            <MessageSquare class="{isDarkMode ? 'text-gray-500' : 'text-gray-400'} mx-auto h-12 w-12 transition-colors duration-300" />
            <h3 class="{isDarkMode ? 'text-gray-200' : 'text-gray-900'} mt-2 text-sm font-medium transition-colors duration-300">No {activeTab} found</h3>
            <p class="{isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1 text-sm transition-colors duration-300">Try adjusting your search criteria or filters.</p>
          </div>
        {/if}
      </div>
</div>

<!-- Conversation Modal -->
{#if showConversationModal && selectedConversation}
  <div 
    class="{isDarkMode ? 'bg-black/70' : 'bg-gray-900/50'} fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-colors duration-300"
    onclick={closeConversationModal}
  >
    <div 
      class="{isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col border transition-colors duration-300"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Modal Header -->
      <div class="{isDarkMode ? 'border-gray-700' : 'border-gray-200'} flex items-center justify-between p-4 border-b transition-colors duration-300">
        <div class="flex items-center space-x-3">
          <div class="flex items-center space-x-2">
            <MessageSquare class="w-5 h-5 text-[#01c0a4]" />
            <h2 class="{isDarkMode ? 'text-white' : 'text-gray-900'} text-lg font-semibold transition-colors duration-300">{selectedConversation.name}</h2>
          </div>
          <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {selectedConversation.type === 'group' ? (isDarkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-800') : (isDarkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800')} transition-colors duration-300">
            {selectedConversation.type === 'group' ? 'Group Chat' : '1:1 Chat'}
          </span>
        </div>
        <button
          onclick={closeConversationModal}
          class="{isDarkMode ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'} p-2 rounded-lg transition-colors duration-300"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Conversation Info -->
      <div class="{isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} p-4 border-b transition-colors duration-300">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <div class="flex items-center space-x-2">
              <Users class="{isDarkMode ? 'text-gray-400' : 'text-gray-500'} w-4 h-4 transition-colors duration-300" />
              <span class="{isDarkMode ? 'text-gray-300' : 'text-gray-600'} text-sm transition-colors duration-300">Participants: {selectedConversation.participants.join(', ')}</span>
            </div>
            <div class="flex items-center space-x-2">
              <MessageSquare class="{isDarkMode ? 'text-gray-400' : 'text-gray-500'} w-4 h-4 transition-colors duration-300" />
              <span class="{isDarkMode ? 'text-gray-300' : 'text-gray-600'} text-sm transition-colors duration-300">{selectedConversation.messageCount} messages</span>
            </div>
          </div>
          <div class="{isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-sm transition-colors duration-300">
            Last activity: {formatTimestamp(selectedConversation.lastActivity)}
          </div>
        </div>
      </div>

      <!-- Messages Area -->
      <div class="{isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} flex-1 overflow-y-auto p-4 space-y-3 transition-colors duration-300">
        {#each selectedConversation.messages as message (message.id)}
          <div class="flex items-start space-x-3">
            <ProfileAvatar 
              user={{ name: message.sender.split('@')[0], profilePhoto: '/placeholder.svg' }} 
              size="sm" 
            />
            <div class="flex-1">
              <div class="flex items-center space-x-2 mb-1">
                <span class="{isDarkMode ? 'text-gray-200' : 'text-gray-900'} font-medium text-sm transition-colors duration-300">{message.sender}</span>
                <span class="{isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-xs transition-colors duration-300">{formatTimestamp(message.timestamp)}</span>
                {#if message.flagged}
                  <AlertTriangle class="w-3 h-3 text-red-500" />
                {/if}
                {#if message.status === 'deleted'}
                  <span class="text-xs text-red-500">(Deleted)</span>
                {/if}
              </div>
              <div class="{isDarkMode ? 'bg-gray-600 border-gray-500' : 'bg-white border-gray-200'} rounded-lg p-3 shadow-sm border transition-colors duration-300">
                <p class="{isDarkMode ? 'text-gray-200' : 'text-gray-900'} text-sm transition-colors duration-300">{message.content}</p>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
{/if}

<!-- Message Detail Modal -->
{#if showMessageModal && selectedMessage}
  <div 
    class="{isDarkMode ? 'bg-black/70' : 'bg-gray-900/50'} fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-colors duration-300"
    onclick={closeMessageModal}
  >
    <div 
      class="{isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-2xl w-full max-w-2xl border transition-colors duration-300"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Modal Header -->
      <div class="{isDarkMode ? 'border-gray-700' : 'border-gray-200'} flex items-center justify-between p-6 border-b transition-colors duration-300">
        <div class="flex items-center space-x-3">
          <MessageSquare class="w-5 h-5 text-[#01c0a4]" />
          <h2 class="{isDarkMode ? 'text-white' : 'text-gray-900'} text-lg font-semibold transition-colors duration-300">Message Details</h2>
          {#if selectedMessage.flagged}
            <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {isDarkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-800'} transition-colors duration-300">
              Flagged
            </span>
          {/if}
        </div>
        <button
          onclick={closeMessageModal}
          class="{isDarkMode ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'} p-2 rounded-lg transition-colors duration-300"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Message Content -->
      <div class="p-6 space-y-4">
        <!-- Message Info -->
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <label class="{isDarkMode ? 'text-gray-300' : 'text-gray-700'} font-medium transition-colors duration-300">From:</label>
            <p class="{isDarkMode ? 'text-gray-200' : 'text-gray-900'} transition-colors duration-300">{selectedMessage.sender}</p>
          </div>
          <div>
            <label class="{isDarkMode ? 'text-gray-300' : 'text-gray-700'} font-medium transition-colors duration-300">Conversation:</label>
            <p class="{isDarkMode ? 'text-gray-200' : 'text-gray-900'} transition-colors duration-300">{selectedMessage.conversationName}</p>
          </div>
          <div>
            <label class="{isDarkMode ? 'text-gray-300' : 'text-gray-700'} font-medium transition-colors duration-300">Type:</label>
            <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {selectedMessage.type === 'group' ? (isDarkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-800') : (isDarkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800')} transition-colors duration-300">
              {selectedMessage.type === 'group' ? 'Group Chat' : '1:1 Chat'}
            </span>
          </div>
          <div>
            <label class="{isDarkMode ? 'text-gray-300' : 'text-gray-700'} font-medium transition-colors duration-300">Timestamp:</label>
            <p class="{isDarkMode ? 'text-gray-200' : 'text-gray-900'} transition-colors duration-300">{formatTimestamp(selectedMessage.timestamp)}</p>
          </div>
          <div>
            <label class="{isDarkMode ? 'text-gray-300' : 'text-gray-700'} font-medium transition-colors duration-300">Status:</label>
            <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {selectedMessage.status === 'active' ? (isDarkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800') : (isDarkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-800')} transition-colors duration-300">
              {selectedMessage.status === 'active' ? 'Active' : 'Deleted'}
            </span>
          </div>
          <div>
            <label class="{isDarkMode ? 'text-gray-300' : 'text-gray-700'} font-medium transition-colors duration-300">Participants:</label>
            <p class="{isDarkMode ? 'text-gray-200' : 'text-gray-900'} text-xs transition-colors duration-300">{selectedMessage.participants.join(', ')}</p>
          </div>
        </div>

        <!-- Flag Information (if flagged) -->
        {#if selectedMessage.flagged}
          <div class="space-y-2">
            <label class="{isDarkMode ? 'text-gray-300' : 'text-gray-700'} font-medium block transition-colors duration-300">Flag Information:</label>
            <div class="{isDarkMode ? 'bg-red-900/30 border-red-800' : 'bg-red-50 border-red-200'} border rounded-lg p-3 transition-colors duration-300">
              <div class="flex items-center space-x-2 mb-2">
                <AlertTriangle class="w-4 h-4 text-red-500" />
                <span class="{isDarkMode ? 'text-red-300' : 'text-red-800'} font-medium transition-colors duration-300">Flagged for Review</span>
              </div>
              {#if selectedMessage.flagType}
                <div class="mb-2">
                  <span class="{isDarkMode ? 'text-red-300' : 'text-red-700'} text-sm font-medium transition-colors duration-300">Type: </span>
                  <span class="{isDarkMode ? 'text-red-300' : 'text-red-600'} text-sm transition-colors duration-300">{selectedMessage.flagType}</span>
                </div>
              {/if}
              {#if selectedMessage.flagReason}
                <div>
                  <span class="{isDarkMode ? 'text-red-300' : 'text-red-700'} text-sm font-medium transition-colors duration-300">Reason: </span>
                  <span class="{isDarkMode ? 'text-red-300' : 'text-red-600'} text-sm transition-colors duration-300">{selectedMessage.flagReason}</span>
                </div>
              {/if}
            </div>
          </div>
        {/if}

        <!-- Message Content -->
        <div>
          <label class="{isDarkMode ? 'text-gray-300' : 'text-gray-700'} font-medium block mb-2 transition-colors duration-300">Message Content:</label>
          <div class="{isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} rounded-lg p-4 border transition-colors duration-300">
            <p class="{isDarkMode ? 'text-gray-200' : 'text-gray-900'} transition-colors duration-300">{selectedMessage.content}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Restore Modal -->
{#if showRestoreModal && selectedConversation}
  <div 
    class="{isDarkMode ? 'bg-black/70' : 'bg-gray-900/50'} fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-colors duration-300"
    onclick={() => {
      showRestoreModal = false;
      selectedConversation = null;
    }}
  >
    <div 
      class="{isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-2xl w-full max-w-md mx-4 transform transition-all border"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Header -->
      <div class="{isDarkMode ? 'border-gray-700' : 'border-gray-200'} flex items-center justify-between p-6 border-b transition-colors duration-300">
        <div class="flex items-center space-x-3">
          <div class="flex-shrink-0">
            <Undo2 class="{isDarkMode ? 'text-blue-400' : 'text-blue-600'} w-6 h-6 transition-colors duration-300" />
          </div>
          <h2 class="{isDarkMode ? 'text-white' : 'text-gray-900'} text-lg font-semibold transition-colors duration-300">
            Restore Conversation
          </h2>
        </div>
      </div>

      <!-- Content -->
      <div class="p-6">
        <p class="{isDarkMode ? 'text-gray-300' : 'text-gray-600'} leading-relaxed transition-colors duration-300">
          Are you sure you want to restore "{selectedConversation.name}"? This will move it back to active conversations.
        </p>
      </div>

      <!-- Footer -->
      <div class="{isDarkMode ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-50'} flex items-center justify-end space-x-3 p-6 border-t rounded-b-xl transition-colors duration-300">
        <button
          onclick={() => {
            showRestoreModal = false;
            selectedConversation = null;
          }}
          class="{isDarkMode ? 'text-gray-300 bg-gray-600 border-gray-500 hover:bg-gray-500 focus:ring-gray-400' : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50 focus:ring-gray-200'} px-4 py-2 border rounded-lg transition-colors focus:outline-none focus:ring-2 duration-300"
        >
          Cancel
        </button>
        <button
          onclick={() => unarchiveConversation(selectedConversation)}
          class="{isDarkMode ? 'bg-blue-700 hover:bg-blue-800 focus:ring-blue-500' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-600'} px-4 py-2 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 duration-300"
        >
          Restore
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Confirmation Modal -->
{#if confirmAction}
  <ConfirmationModal
    show={showConfirmModal}
    title={confirmAction.title}
    message={confirmAction.message}
    confirmText={confirmAction.confirmText}
    confirmStyle={confirmAction.style}
    onConfirm={() => {
      confirmAction?.action();
      showConfirmModal = false;
    }}
    onCancel={() => {
      showConfirmModal = false;
      confirmAction = null;
    }}
  />
{/if}