<script lang="ts">
  import { MessageSquare, MessageCircle, Search, Eye, Trash2, AlertTriangle, Users, Calendar, Clock, Check, X, Archive, Undo2, Paperclip, Smile } from 'lucide-svelte';
  import ConfirmationModal from '$lib/components/ConfirmationModal.svelte';
  import ProfileAvatar from '$lib/components/ProfileAvatar.svelte';
  import { AdminChatAPI } from '$lib/api/admin-chat';
  import { onMount } from 'svelte';

  interface ChatMessage {
    id: string;
    conversationId: string;
    conversationName?: string;
    sender: string;
    senderName?: string;
    content: string;
    timestamp: string | Date;
    type: '1v1' | 'group';
    flagged: boolean;
    flagReason?: string;
    flagType?: string;
    participants?: string[];
    status: 'active' | 'deleted';
  }

  interface ChatConversation {
    id: string;
    name: string;
    type: '1v1' | 'group';
    participants: string[];
    participantNames?: string[];
    messageCount: number;
    lastActivity: string | Date;
    archived: boolean;
    messages?: ChatMessage[];
  }

  let activeTab = $state<'conversations' | 'flagged' | 'archived' | 'messages'>('messages');
  let searchQuery = $state('');
  let selectedType = $state<'all' | '1v1' | 'group'>('all');
  
  // Tab switching function
  const switchTab = (tab: 'conversations' | 'flagged' | 'archived' | 'messages') => {
    activeTab = tab;
  };

  // Generic load function for retry buttons
  const loadData = () => {
    loadAllData();
  };
  
  // Loading states
  let isLoading = $state(false);
  let loadingError = $state<string | null>(null);


  
  // Data state
  let conversations = $state<ChatConversation[]>([]);
  let archivedConversations = $state<ChatConversation[]>([]);
  let messages = $state<ChatMessage[]>([]);
  let flaggedMessages = $state<ChatMessage[]>([]);
  let chatStatistics = $state<any>(null);
  
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

  // Data loading functions - Load all data at once like user management
  const loadAllData = async () => {
    isLoading = true;
    loadingError = null;
    
    try {
      // Load all data simultaneously 
      await Promise.all([
        loadConversations(),
        loadArchivedConversations(), 
        loadMessages(),
        loadFlaggedMessages(),
        loadStatistics()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      loadingError = error instanceof Error ? error.message : 'Failed to load data';
    } finally {
      isLoading = false;
    }
  };

  const loadConversations = async () => {
    try {
      console.log('Loading conversations with params:', {
        type: selectedType === 'all' ? undefined : selectedType,
        search: searchQuery || undefined,
        status: 'active'
      });
      const response = await AdminChatAPI.getAllConversations({
        type: selectedType === 'all' ? undefined : selectedType,
        search: searchQuery || undefined,
        status: 'active'
      });
      console.log('Conversations API response:', response);
      conversations = response.data || [];
      console.log('Loaded conversations:', conversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
      throw error;
    }
  };

  const loadArchivedConversations = async () => {
    try {
      console.log('Loading archived conversations...');
      const response = await AdminChatAPI.getArchivedConversations({
        type: selectedType === 'all' ? undefined : selectedType,
        search: searchQuery || undefined
      });
      console.log('Archived conversations API response:', response);
      archivedConversations = response.data || [];
      console.log('Loaded archived conversations:', archivedConversations);
    } catch (error) {
      console.error('Error loading archived conversations:', error);
      throw error;
    }
  };

  const loadMessages = async () => {
    try {
      const response = await AdminChatAPI.getAllMessages({
        type: selectedType === 'all' ? undefined : selectedType,
        search: searchQuery || undefined,
        flagged: false
      });
      messages = response.data || [];
    } catch (error) {
      console.error('Error loading messages:', error);
      throw error;
    }
  };

  const loadFlaggedMessages = async () => {
    try {
      const response = await AdminChatAPI.getFlaggedMessages({
        type: selectedType === 'all' ? undefined : selectedType,
        search: searchQuery || undefined
      });
      flaggedMessages = response.data || [];
    } catch (error) {
      console.error('Error loading flagged messages:', error);
      throw error;
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await AdminChatAPI.getChatStatistics();
      chatStatistics = response.data || {};
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  // Initial load - load all data at once
  onMount(() => {
    loadAllData();
  });

  // Reload data when filters change
  $effect(() => {
    // Check if filters have actually changed (not initial load or tab switches)
    const searchChanged = searchQuery !== previousSearchQuery;
    const typeChanged = selectedType !== previousSelectedType;
    
    if (!isInitialLoad && (searchChanged || typeChanged)) {
      console.log('Filters changed - reloading data for tab:', activeTab, {
        searchChanged,
        typeChanged,
        searchQuery,
        selectedType
      });
      
      // Update previous values
      previousSearchQuery = searchQuery;
      previousSelectedType = selectedType;
      
      // Only reload the specific tab data when filters change, not all data
      switch (activeTab) {
        case 'conversations':
          loadConversations();
          break;
        case 'archived':
          loadArchivedConversations();
          break;
        case 'flagged':
          loadFlaggedMessages();
          break;
        case 'messages':
          loadMessages();
          break;
      }
    } else if (isInitialLoad) {
      // Mark that initial load is complete
      isInitialLoad = false;
      previousSearchQuery = searchQuery;
      previousSelectedType = selectedType;
    }
  });

  // Track previous filter values to detect actual changes
  let previousSearchQuery = $state('');
  let previousSelectedType = $state<'all' | '1v1' | 'group'>('all');
  let isInitialLoad = $state(true);

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



  // Computed values
  const tabCounts = $derived(() => {
    return {
      conversations: conversations.length,
      flagged: flaggedMessages.length,
      archived: archivedConversations.length,
      messages: messages.length
    };
  });

  const formatTimestamp = (date: string | Date | null | undefined) => {
    if (!date) return 'N/A';
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const openConversationModal = async (conversation: ChatConversation) => {
    try {
      // Load full conversation with messages from API
      const response = await AdminChatAPI.getConversationWithMessages(conversation.id);
      selectedConversation = { ...conversation, messages: response.data?.messages || [] };
      showConversationModal = true;
    } catch (error) {
      console.error('Error loading conversation details:', error);
      alert('Failed to load conversation details');
    }
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

  const archiveConversation = async (conversation: ChatConversation) => {
    try {
      await AdminChatAPI.archiveConversation(conversation.id);
      showConfirmModal = false;
      alert('Conversation archived successfully');
      // Reload data to reflect changes
      loadData();
    } catch (error) {
      console.error('Error archiving conversation:', error);
      alert('Failed to archive conversation');
    }
  };

  const confirmUnarchiveConversation = (conversation: ChatConversation) => {
    selectedConversation = conversation;
    showRestoreModal = true;
  };

  const unarchiveConversation = async (conversation: ChatConversation) => {
    try {
      await AdminChatAPI.unarchiveConversation(conversation.id);
      showRestoreModal = false;
      selectedConversation = null;
      alert('Conversation restored successfully');
      // Reload data to reflect changes
      loadData();
    } catch (error) {
      console.error('Error restoring conversation:', error);
      alert('Failed to restore conversation');
    }
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

  const deleteMessage = async (message: ChatMessage) => {
    try {
      await AdminChatAPI.deleteMessage(message.id);
      showConfirmModal = false;
      if (showMessageModal) {
        closeMessageModal();
      }
      alert('Message deleted successfully');
      // Reload data to reflect changes
      loadData();
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('Failed to delete message');
    }
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

  const unflagMessage = async (message: ChatMessage) => {
    try {
      await AdminChatAPI.unflagMessage(message.id);
      showConfirmModal = false;
      if (showMessageModal) {
        closeMessageModal();
      }
      alert('Message unflagged successfully');
      // Reload data to reflect changes
      loadData();
    } catch (error) {
      console.error('Error unflagging message:', error);
      alert('Failed to unflag message');
    }
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
                  oninput={handleSearchInput}
                  onpaste={handleSearchPaste}
                  type="text"
                  maxlength="50"
                  placeholder="Search conversation name or sender..."
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
              onclick={() => switchTab('messages')}
              class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'messages' ? 'border-[#01c0a4] text-[#01c0a4]' : 'border-transparent text-gray-500 hover:text-gray-700'}"
            >
              <div class="flex items-center space-x-2">
                <MessageCircle class="w-4 h-4" />
                <span>All Messages</span>
                <span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{tabCounts().messages}</span>
              </div>
            </button>

            <button
              onclick={() => switchTab('conversations')}
              class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'conversations' ? 'border-[#01c0a4] text-[#01c0a4]' : 'border-transparent text-gray-500 hover:text-gray-700'}"
            >
              <div class="flex items-center space-x-2">
                <MessageSquare class="w-4 h-4" />
                <span>Conversations</span>
                <span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{tabCounts().conversations}</span>
              </div>
            </button>
            
            <button
              onclick={() => switchTab('flagged')}
              class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'flagged' ? 'border-[#01c0a4] text-[#01c0a4]' : 'border-transparent text-gray-500 hover:text-gray-700'}"
            >
              <div class="flex items-center space-x-2">
                <AlertTriangle class="w-4 h-4" />
                <span>Flagged</span>
                <span class="bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs">{tabCounts().flagged}</span>
              </div>
            </button>

            <button
              onclick={() => switchTab('archived')}
              class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'archived' ? 'border-[#01c0a4] text-[#01c0a4]' : 'border-transparent text-gray-500 hover:text-gray-700'}"
            >
              <div class="flex items-center space-x-2">
                <Archive class="w-4 h-4" />
                <span>Archived</span>
                <span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{tabCounts().archived}</span>
              </div>
            </button>
          </nav>
        </div>

        <!-- Loading State -->
        {#if isLoading}
          <div class="flex items-center justify-center p-12">
            <div class="text-center">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#01c0a4] mx-auto mb-3"></div>
              <p class="text-gray-500">Loading chat data...</p>
            </div>
          </div>
        {:else if loadingError}
          <div class="p-6 bg-red-50 border border-red-200 rounded-lg m-6">
            <div class="flex items-center">
              <AlertTriangle class="w-5 h-5 text-red-500 mr-3" />
              <div>
                <h3 class="text-red-800 font-medium">Error Loading Data</h3>
                <p class="text-red-600 text-sm mt-1">{loadingError}</p>
                <button 
                  onclick={() => loadData()}
                  class="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        {/if}

        <!-- Tab Content (always rendered unless loading/error) -->
        {#if !isLoading && !loadingError}
          {#key activeTab}
          {#if activeTab === 'messages'}
          <!-- All Messages Table -->
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conversation</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                {#each messages as message (message.id)}
                  <tr class="hover:bg-gray-50 {message.flagged ? 'bg-red-50' : message.status === 'deleted' ? 'bg-gray-50' : ''}">
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatTimestamp(message.timestamp)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {message.sender}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {message.type === 'group' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}">
                        {message.type === 'group' ? 'Group' : '1:1'}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {message.conversationName || 'Unknown'}
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      <div class="flex items-center">
                        {#if message.flagged}
                          <AlertTriangle class="w-4 h-4 text-red-500 mr-2" />
                        {/if}
                        <span>{message.content}</span>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                      <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {message.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                        {message.status === 'active' ? 'Active' : 'Deleted'}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div class="flex items-center space-x-2">
                        <button
                          onclick={() => openMessageModal(message)}
                          class="text-[#01c0a4] hover:text-[#00a08a] flex items-center space-x-1"
                        >
                          <Eye class="w-4 h-4" />
                          <span>View</span>
                        </button>
                        {#if message.status === 'deleted'}
                          <button
                            onclick={() => confirmDeleteMessage(message)}
                            class="text-red-600 hover:text-red-500 flex items-center space-x-1"
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
        {:else if activeTab === 'conversations'}
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
                {#each conversations as conversation (conversation.id)}
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
                          onclick={() => openConversationModal(conversation)}
                          class="text-[#01c0a4] hover:text-[#00a08a] flex items-center space-x-1"
                        >
                          <Eye class="w-4 h-4" />
                          <span>View</span>
                        </button>
                        {#if conversation.type === 'group'}
                          <button
                            onclick={() => confirmArchiveConversation(conversation)}
                            class="text-orange-600 hover:text-orange-500 flex items-center space-x-1"
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
        {:else if activeTab === 'flagged'}
          <!-- Flagged Messages Table -->
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sender</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conversation</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Content</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                {#each flaggedMessages as message (message.id)}
                  <tr class="hover:bg-gray-50 bg-red-50">
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatTimestamp(message.timestamp)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {message.sender}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {message.type === 'group' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}">
                        {message.type === 'group' ? 'Group' : '1:1'}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {message.conversationName || 'Unknown'}
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
                          onclick={() => openMessageModal(message)}
                          class="text-[#01c0a4] hover:text-[#00a08a] flex items-center space-x-1"
                        >
                          <Eye class="w-4 h-4" />
                          <span>View</span>
                        </button>
                        <button
                          onclick={() => confirmUnflagMessage(message)}
                          class="text-green-600 hover:text-green-500 flex items-center space-x-1"
                        >
                          <Check class="w-4 h-4" />
                          <span>Unflag</span>
                        </button>
                        <button
                          onclick={() => confirmDeleteMessage(message)}
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
        {:else if activeTab === 'archived'}
          <!-- Archived Conversations Table -->
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
                {#each archivedConversations as conversation (conversation.id)}
                  <tr class="hover:bg-gray-50 bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center">
                        <Archive class="w-4 h-4 text-gray-400 mr-2" />
                        <span class="text-sm font-medium text-gray-700">{conversation.name}</span>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {conversation.type === 'group' ? 'bg-gray-100 text-gray-600' : 'bg-gray-100 text-gray-600'}">
                        {conversation.type === 'group' ? 'Group' : '1:1'}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div class="flex items-center">
                        <Users class="w-4 h-4 mr-1" />
                        {conversation.participants.length}
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {conversation.messageCount}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatTimestamp(conversation.lastActivity)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div class="flex items-center space-x-2">
                        <button
                          onclick={() => openConversationModal(conversation)}
                          class="text-[#01c0a4] hover:text-[#00a08a] flex items-center space-x-1"
                        >
                          <Eye class="w-4 h-4" />
                          <span>View</span>
                        </button>
                        <button
                          onclick={() => confirmUnarchiveConversation(conversation)}
                          class="text-blue-600 hover:text-blue-500 flex items-center space-x-1"
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
        {/if}

        <!-- Empty State -->
        {#if (activeTab === 'conversations' && conversations.length === 0) || 
             (activeTab === 'flagged' && flaggedMessages.length === 0) ||
             (activeTab === 'archived' && archivedConversations.length === 0) ||
             (activeTab === 'messages' && messages.length === 0)}
          <div class="text-center py-12">
            <MessageSquare class="mx-auto h-12 w-12 text-gray-400" />
            <h3 class="mt-2 text-sm font-medium text-gray-900">No {activeTab} found</h3>
            <p class="mt-1 text-sm text-gray-500">Try adjusting your search criteria or filters.</p>
          </div>
        {/if}
        {/key}
        {/if}
      </div>
</div>

<!-- Conversation Modal -->
{#if showConversationModal && selectedConversation}
  <div 
    class="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
    onclick={closeConversationModal}
  >
    <div 
      class="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Modal Header -->
      <div class="flex items-center justify-between p-4 border-b border-gray-200">
        <div class="flex items-center space-x-3">
          <div class="flex items-center space-x-2">
            <MessageSquare class="w-5 h-5 text-[#01c0a4]" />
            <h2 class="text-lg font-semibold text-gray-900">{selectedConversation.name}</h2>
          </div>
          <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {selectedConversation.type === 'group' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}">
            {selectedConversation.type === 'group' ? 'Group Chat' : '1:1 Chat'}
          </span>
        </div>
        <button
          onclick={closeConversationModal}
          class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Conversation Info -->
      <div class="p-4 bg-gray-50 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <div class="flex items-center space-x-2">
              <Users class="w-4 h-4 text-gray-500" />
              <span class="text-sm text-gray-600">Participants: {selectedConversation.participants.join(', ')}</span>
            </div>
            <div class="flex items-center space-x-2">
              <MessageSquare class="w-4 h-4 text-gray-500" />
              <span class="text-sm text-gray-600">{selectedConversation.messageCount} messages</span>
            </div>
          </div>
          <div class="text-sm text-gray-500">
            Last activity: {formatTimestamp(selectedConversation.lastActivity)}
          </div>
        </div>
      </div>

      <!-- Messages Area -->
      <div class="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {#each selectedConversation.messages as message (message.id)}
          <div class="flex items-start space-x-3">
            <ProfileAvatar 
              user={{ name: message.sender.split('@')[0], profilePhoto: '/placeholder.svg' }} 
              size="sm" 
            />
            <div class="flex-1">
              <div class="flex items-center space-x-2 mb-1">
                <span class="font-medium text-gray-900 text-sm">{message.sender}</span>
                <span class="text-xs text-gray-500">{formatTimestamp(message.timestamp)}</span>
                {#if message.flagged}
                  <AlertTriangle class="w-3 h-3 text-red-500" />
                {/if}
                {#if message.status === 'deleted'}
                  <span class="text-xs text-red-500">(Deleted)</span>
                {/if}
              </div>
              <div class="bg-white rounded-lg p-3 shadow-sm border">
                <p class="text-gray-900 text-sm">{message.content}</p>
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
    class="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
    onclick={closeMessageModal}
  >
    <div 
      class="bg-white rounded-xl shadow-2xl w-full max-w-2xl"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Modal Header -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200">
        <div class="flex items-center space-x-3">
          <MessageSquare class="w-5 h-5 text-[#01c0a4]" />
          <h2 class="text-lg font-semibold text-gray-900">Message Details</h2>
          {#if selectedMessage.flagged}
            <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
              Flagged
            </span>
          {/if}
        </div>
        <button
          onclick={closeMessageModal}
          class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Message Content -->
      <div class="p-6 space-y-4">
        <!-- Message Info -->
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <label class="font-medium text-gray-700">From:</label>
            <p class="text-gray-900">{selectedMessage.sender}</p>
          </div>
          <div>
            <label class="font-medium text-gray-700">Conversation:</label>
            <p class="text-gray-900">{selectedMessage.conversationName || 'Unknown'}</p>
          </div>
          <div>
            <label class="font-medium text-gray-700">Type:</label>
            <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {selectedMessage.type === 'group' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}">
              {selectedMessage.type === 'group' ? 'Group Chat' : '1:1 Chat'}
            </span>
          </div>
          <div>
            <label class="font-medium text-gray-700">Timestamp:</label>
            <p class="text-gray-900">{formatTimestamp(selectedMessage.timestamp)}</p>
          </div>
          <div>
            <label class="font-medium text-gray-700">Status:</label>
            <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {selectedMessage.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
              {selectedMessage.status === 'active' ? 'Active' : 'Deleted'}
            </span>
          </div>
          <div>
            <label class="font-medium text-gray-700">Participants:</label>
            <p class="text-gray-900 text-xs">{selectedMessage.participants.join(', ')}</p>
          </div>
        </div>

        <!-- Flag Information (if flagged) -->
        {#if selectedMessage.flagged}
          <div class="space-y-2">
            <label class="font-medium text-gray-700 block">Flag Information:</label>
            <div class="bg-red-50 border border-red-200 rounded-lg p-3">
              <div class="flex items-center space-x-2 mb-2">
                <AlertTriangle class="w-4 h-4 text-red-500" />
                <span class="font-medium text-red-800">Flagged for Review</span>
              </div>
              {#if selectedMessage.flagType}
                <div class="mb-2">
                  <span class="text-sm font-medium text-red-700">Type: </span>
                  <span class="text-sm text-red-600">{selectedMessage.flagType}</span>
                </div>
              {/if}
              {#if selectedMessage.flagReason}
                <div>
                  <span class="text-sm font-medium text-red-700">Reason: </span>
                  <span class="text-sm text-red-600">{selectedMessage.flagReason}</span>
                </div>
              {/if}
            </div>
          </div>
        {/if}

        <!-- Message Content -->
        <div>
          <label class="font-medium text-gray-700 block mb-2">Message Content:</label>
          <div class="bg-gray-50 rounded-lg p-4 border">
            <p class="text-gray-900">{selectedMessage.content}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Restore Modal -->
{#if showRestoreModal && selectedConversation}
  <div 
    class="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
    onclick={() => {
      showRestoreModal = false;
      selectedConversation = null;
    }}
  >
    <div 
      class="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 transform transition-all"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200">
        <div class="flex items-center space-x-3">
          <div class="flex-shrink-0">
            <Undo2 class="w-6 h-6 text-blue-600" />
          </div>
          <h2 class="text-lg font-semibold text-gray-900">
            Restore Conversation
          </h2>
        </div>
      </div>

      <!-- Content -->
      <div class="p-6">
        <p class="text-gray-600 leading-relaxed">
          Are you sure you want to restore "{selectedConversation.name}"? This will move it back to active conversations.
        </p>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
        <button
          onclick={() => {
            showRestoreModal = false;
            selectedConversation = null;
          }}
          class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-200"
        >
          Cancel
        </button>
        <button
          onclick={() => unarchiveConversation(selectedConversation)}
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600"
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