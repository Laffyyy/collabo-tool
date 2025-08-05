<script lang="ts">
	import { onMount } from 'svelte';
	import Navigation from '$lib/components/Navigation.svelte';
	import LoginBackground from '../login/LoginBackground.svelte';
	import { 
		Search, Plus, Archive, MessageCircle, Users, Send, Paperclip, 
		Smile, MoreVertical, Reply, ChevronDown, ChevronRight, X, 
		UserPlus, Volume2, VolumeX, UserMinus, Crown, Eye, EyeOff, Camera 
	} from 'lucide-svelte';

	// Type definitions
	interface User {
		id: string;
		name: string;
		avatar: string;
		department: string;
		role: string;
		isOnline?: boolean;
		isMuted?: boolean;
	}

	interface Message {
		id: string;
		senderId: string;
		senderName: string;
		senderDepartment: string;
		senderRole: string;
		content: string;
		timestamp: Date | string;
		type: string;
		replyTo?: Message;
		reactions: Array<{
			emoji: string;
			users: string[];
			count: number;
		}>;
	}

	interface Conversation {
		id: string;
		name: string;
		department?: string;
		role?: string;
		type: 'direct' | 'group';
		lastMessage: string;
		lastMessageTime: Date | string;
		unreadCount: number;
		avatar: string;
		isOnline: boolean;
		messages: Message[];
		members: User[];
		isTemporary?: boolean; // For conversations that haven't been saved yet
		settings?: {
			allowEmojis: boolean;
			allowAttachments: boolean;
			isArchived: boolean;
		};
	}

	// State management
	let conversations = $state<Conversation[]>([]);
	let groupChats = $state<Conversation[]>([]);
	let currentConversation = $state<Conversation | null>(null);
	let showGroupSettings = $state(false);
	let showMembersPanel = $state(false);
	let showCreateGroup = $state(false);
	let showConversations = $state(true);
	let showGroups = $state(true);
	
	// Chat state
	let messageInput = $state('');
	let replyingTo = $state<Message | null>(null);
	let showSearchInChat = $state(false);
	let searchInChatQuery = $state('');
	let searchInput = $state('');
	let othersTyping = $state(false); // Changed from isTyping to othersTyping
	let typingTimeout: number | null = null;
	let showEmojiPicker = $state(false);
	let editingMessage = $state<Message | null>(null);
	let editingContent = $state('');
	
	// Create group state
	let groupName = $state('');
	let selectedUsers = $state<User[]>([]);
	
	// Group settings edit state
	let editingGroupName = $state('');

	// Sample data
	const availableUsers: User[] = [
		{ 
			id: '2', 
			name: 'John Doe', 
			avatar: '/placeholder.svg?height=32&width=32',
			department: 'Engineering',
			role: 'Manager'
		},
		{ 
			id: '3', 
			name: 'Alice Johnson', 
			avatar: '/placeholder.svg?height=32&width=32',
			department: 'Marketing',
			role: 'Supervisor'
		},
		{ 
			id: '4', 
			name: 'Bob Smith', 
			avatar: '/placeholder.svg?height=32&width=32',
			department: 'Sales',
			role: 'Frontline'
		},
		{ 
			id: '5', 
			name: 'Carol White', 
			avatar: '/placeholder.svg?height=32&width=32',
			department: 'Support',
			role: 'Support'
		}
	];

	onMount(() => {
		// Initialize conversations
		conversations = [
			{
				id: '1',
				name: 'John Doe',
				department: 'Engineering',
				role: 'Manager',
				type: 'direct',
				lastMessage: 'Hey, how are you doing?',
				lastMessageTime: '2 min ago',
				unreadCount: 2,
				avatar: '/placeholder.svg?height=40&width=40',
				isOnline: true,
				messages: [
					{
						id: '1',
						senderId: '2',
						senderName: 'John Doe',
						senderDepartment: 'Engineering',
						senderRole: 'Manager',
						content: 'Hey, how are you doing?',
						timestamp: new Date(Date.now() - 120000),
						type: 'text',
						reactions: []
					}
				],
				members: [
					{ 
						id: '1', 
						name: 'You', 
						avatar: '/placeholder.svg?height=32&width=32', 
						isOnline: true, 
						isMuted: false,
						department: 'IT',
						role: 'Manager'
					},
					{ 
						id: '2', 
						name: 'John Doe', 
						avatar: '/placeholder.svg?height=32&width=32', 
						isOnline: true, 
						isMuted: false,
						department: 'Engineering',
						role: 'Manager'
					}
				]
			}
		];

		groupChats = [
			{
				id: '2',
				name: 'Project Team',
				type: 'group',
				lastMessage: 'Alice: The deadline has been moved to next week',
				lastMessageTime: '1 hour ago',
				unreadCount: 0,
				avatar: '/placeholder.svg?height=40&width=40',
				isOnline: false,
				messages: [
					{
						id: '1',
						senderId: '3',
						senderName: 'Alice Johnson',
						senderDepartment: 'Marketing',
						senderRole: 'Supervisor',
						content: 'The deadline has been moved to next week',
						timestamp: new Date(Date.now() - 3600000),
						type: 'text',
						reactions: [
							{ emoji: '👍', users: ['1', '4'], count: 2 },
							{ emoji: '😊', users: ['5'], count: 1 }
						]
					}
				],
				members: [
					{ 
						id: '1', 
						name: 'You', 
						avatar: '/placeholder.svg?height=32&width=32', 
						isOnline: true, 
						isMuted: false,
						department: 'IT',
						role: 'Manager'
					},
					{ 
						id: '3', 
						name: 'Alice Johnson', 
						avatar: '/placeholder.svg?height=32&width=32', 
						isOnline: true, 
						isMuted: false,
						department: 'Marketing',
						role: 'Supervisor'
					},
					{ 
						id: '4', 
						name: 'Bob Smith', 
						avatar: '/placeholder.svg?height=32&width=32', 
						isOnline: false, 
						isMuted: false,
						department: 'Sales',
						role: 'Frontline'
					},
					{ 
						id: '5', 
						name: 'Carol White', 
						avatar: '/placeholder.svg?height=32&width=32', 
						isOnline: true, 
						isMuted: true,
						department: 'Support',
						role: 'Support'
					}
				],
				settings: {
					allowEmojis: true,
					allowAttachments: false,
					isArchived: false
				}
			}
		];

		currentConversation = groupChats[0];
	});

	// Available emojis for picker
	const emojiGroups = {
		'Smileys': ['😀', '😃', '😄', '😁', '😊', '😂', '🤣', '😭', '😍', '🥰', '😘', '😗', '😚', '😙', '🙂', '🤗', '🤔', '🤐', '🤨', '😐', '😑', '😶', '🙄', '😏', '😬', '🤥'],
		'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '💕', '💖', '💗', '💘', '💝', '💞', '💟'],
		'Reactions': ['👍', '👎', '👏', '🙌', '🤝', '👋', '🤙', '🤞', '✌️', '🤟', '🤘', '👌', '🤏', '👈', '👉', '👆', '👇', '☝️'],
		'Objects': ['🎉', '🎊', '🔥', '💯', '⭐', '🌟', '✨', '🎯', '🎪', '🎨', '🎭', '🎪', '🎸', '🎤', '🎧', '📱', '💻', '⌚']
	};

	const quickEmojis = ['👍', '❤️', '😂', '😊', '😮', '😢'];

	// Functions
	const selectConversation = (conversation: Conversation) => {
		currentConversation = conversation;
	};

	const sendMessage = () => {
		if (!messageInput.trim() || !currentConversation) return;

		// If this is a temporary conversation, save it to the conversations list
		if (currentConversation.isTemporary) {
			// Remove the temporary flag and generate a proper ID
			const savedConversation = {
				...currentConversation,
				id: Date.now().toString(),
				isTemporary: false
			};
			
			conversations = [...conversations, savedConversation];
			currentConversation = savedConversation;
		}

		const newMessage: Message = {
			id: Date.now().toString(),
			senderId: '1',
			senderName: 'You',
			senderDepartment: 'IT',
			senderRole: 'Manager',
			content: messageInput,
			timestamp: new Date(),
			type: 'text',
			replyTo: replyingTo || undefined,
			reactions: []
		};

		currentConversation.messages.push(newMessage);
		currentConversation.lastMessage = messageInput;
		currentConversation.lastMessageTime = 'now';
		
		messageInput = '';
		replyingTo = null;
	};

	const handleKeyPress = (event: KeyboardEvent) => {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			if (editingMessage) {
				saveEditedMessage();
			} else {
				sendMessage();
			}
		}
	};

	const handleTyping = () => {
		// This function is ready for backend integration
		// When backend is implemented, this would send typing events to other users
		// For now, it's just a placeholder that doesn't trigger the typing indicator for current user
	};

	// Simulate others typing occasionally (demo feature)
	const simulateTyping = () => {
		if (currentConversation && Math.random() > 0.95) {
			othersTyping = true;
			setTimeout(() => {
				othersTyping = false;
			}, 2000 + Math.random() * 3000);
		}
	};

	// Run simulation periodically
	setInterval(simulateTyping, 10000);

	const startReply = (message: Message) => {
		replyingTo = message;
	};

	const cancelReply = () => {
		replyingTo = null;
	};

	const addReaction = (messageId: string, emoji: string) => {
		if (!currentConversation) return;
		const message = currentConversation.messages.find(m => m.id === messageId);
		if (!message) return;

		const existingReaction = message.reactions.find(r => r.emoji === emoji);
		if (existingReaction) {
			if (existingReaction.users.includes('1')) {
				existingReaction.users = existingReaction.users.filter(u => u !== '1');
				existingReaction.count--;
				if (existingReaction.count === 0) {
					message.reactions = message.reactions.filter(r => r.emoji !== emoji);
				}
			} else {
				existingReaction.users.push('1');
				existingReaction.count++;
			}
		} else {
			message.reactions.push({ emoji, users: ['1'], count: 1 });
		}
	};

	const unsendMessage = (messageId: string) => {
		if (!currentConversation) return;
		
		const messageIndex = currentConversation.messages.findIndex(m => m.id === messageId);
		if (messageIndex !== -1) {
			currentConversation.messages.splice(messageIndex, 1);
		}
	};

	const startEditMessage = (message: Message) => {
		if (message.senderId === '1') {
			editingMessage = message;
			editingContent = message.content;
			messageInput = message.content;
		}
	};

	const cancelEdit = () => {
		editingMessage = null;
		editingContent = '';
		messageInput = '';
	};

	const saveEditedMessage = () => {
		if (!editingMessage || !messageInput.trim()) return;
		
		editingMessage.content = messageInput.trim();
		editingMessage.timestamp = new Date(); // Update timestamp to show it was edited
		
		editingMessage = null;
		editingContent = '';
		messageInput = '';
	};

	const addEmojiToMessage = (emoji: string) => {
		messageInput += emoji;
		showEmojiPicker = false;
	};

	const toggleMembersPanel = () => {
		showMembersPanel = !showMembersPanel;
	};

	const openGroupSettings = () => {
		if (currentConversation?.type === 'group') {
			editingGroupName = currentConversation.name;
			showGroupSettings = true;
		}
	};

	const closeGroupSettings = () => {
		showGroupSettings = false;
	};

	const saveGroupSettings = () => {
		if (currentConversation && editingGroupName.trim()) {
			currentConversation.name = editingGroupName.trim();
			closeGroupSettings();
		}
	};

	const toggleEmojis = () => {
		if (currentConversation?.settings) {
			currentConversation.settings.allowEmojis = !currentConversation.settings.allowEmojis;
		}
	};

	const toggleAttachments = () => {
		if (currentConversation?.settings) {
			currentConversation.settings.allowAttachments = !currentConversation.settings.allowAttachments;
		}
	};

	const archiveGroup = () => {
		if (currentConversation?.settings) {
			currentConversation.settings.isArchived = true;
			closeGroupSettings();
		}
	};

	const toggleMute = (memberId: string) => {
		if (currentConversation) {
			const member = currentConversation.members.find(m => m.id === memberId);
			if (member) {
				member.isMuted = !member.isMuted;
			}
		}
	};

	const removeMember = (memberId: string) => {
		if (currentConversation && memberId !== '1') {
			currentConversation.members = currentConversation.members.filter(m => m.id !== memberId);
		}
	};

	const createGroup = () => {
		if (!groupName.trim() || selectedUsers.length === 0) return;

		const newGroup: Conversation = {
			id: Date.now().toString(),
			name: groupName,
			type: 'group',
			lastMessage: 'Group created',
			lastMessageTime: 'now',
			unreadCount: 0,
			avatar: '/placeholder.svg?height=40&width=40',
			isOnline: false,
			messages: [],
			members: [
				{ 
					id: '1', 
					name: 'You', 
					avatar: '/placeholder.svg?height=32&width=32', 
					isOnline: true, 
					isMuted: false,
					department: 'IT',
					role: 'Manager'
				},
				...selectedUsers.map(user => ({ ...user, isOnline: false, isMuted: false } as User))
			],
			settings: {
				allowEmojis: false,
				allowAttachments: false,
				isArchived: false
			}
		};

		groupChats = [...groupChats, newGroup];
		showCreateGroup = false;
		groupName = '';
		selectedUsers = [];
	};

	const toggleUser = (user: User) => {
		const index = selectedUsers.findIndex(u => u.id === user.id);
		if (index > -1) {
			selectedUsers.splice(index, 1);
		} else {
			selectedUsers.push(user);
		}
		selectedUsers = [...selectedUsers];
	};

	const formatTime = (date: Date | string) => {
		if (typeof date === 'string') return date;
		return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	};

	// Derived state for filtered conversations
	const filteredConversations = $derived(conversations.filter(conv => 
		conv.name.toLowerCase().includes(searchInput.toLowerCase()) ||
		conv.lastMessage.toLowerCase().includes(searchInput.toLowerCase())
	));

	const filteredGroupChats = $derived(groupChats.filter(conv => 
		conv.name.toLowerCase().includes(searchInput.toLowerCase()) ||
		conv.lastMessage.toLowerCase().includes(searchInput.toLowerCase())
	));

	// Auto-expand sections when there are search results
	const shouldShowConversations = $derived(showConversations || (searchInput.trim() && filteredConversations.length > 0));
	const shouldShowGroups = $derived(showGroups || (searchInput.trim() && filteredGroupChats.length > 0));

	// Derived state for filtered users (when searching)
	const filteredUsers = $derived.by(() => {
		if (!searchInput.trim()) return [];
		
		// Get users that don't already have conversations (including temporary ones)
		const existingConversationUserIds = [...conversations, ...(currentConversation?.isTemporary ? [currentConversation] : [])]
			.map(conv => conv.type === 'direct' ? conv.members.find(m => m.id !== '1')?.id : null)
			.filter(Boolean);
		
		return availableUsers.filter(user => 
			!existingConversationUserIds.includes(user.id) &&
			(user.name.toLowerCase().includes(searchInput.toLowerCase()) ||
			 user.department.toLowerCase().includes(searchInput.toLowerCase()) ||
			 user.role.toLowerCase().includes(searchInput.toLowerCase()))
		);
	});

	const startNewConversation = (user: User) => {
		// Create a temporary conversation that won't be saved until a message is sent
		const tempConversation: Conversation = {
			id: 'temp-' + Date.now().toString(),
			name: user.name,
			department: user.department,
			role: user.role,
			type: 'direct',
			lastMessage: '',
			lastMessageTime: 'now',
			unreadCount: 0,
			avatar: user.avatar,
			isOnline: false,
			messages: [],
			members: [
				{ 
					id: '1', 
					name: 'You', 
					avatar: '/placeholder.svg?height=32&width=32', 
					isOnline: true, 
					isMuted: false,
					department: 'IT',
					role: 'Manager'
				},
				{ ...user, isOnline: false, isMuted: false }
			],
			isTemporary: true // Mark as temporary
		};

		currentConversation = tempConversation;
		searchInput = ''; // Clear search after starting conversation
	};
</script>

<svelte:head>
	<title>Messages - Workspace</title>
</svelte:head>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="h-screen flex flex-col bg-gray-50" onclick={() => showEmojiPicker = false}>
	<Navigation />
	
	<div class="flex-1 flex overflow-hidden">
		<!-- Sidebar -->
		<aside class="w-80 bg-white border-r border-gray-300 flex flex-col">
			<!-- Search and Create -->
			<div class="p-3 border-b border-gray-200 bg-gray-50">
				<div class="relative mb-3">
					<Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
					<input
						bind:value={searchInput}
						type="text"
						placeholder="Search conversations..."
						class="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent text-sm"
					/>
				</div>
				
				<button
					onclick={() => showCreateGroup = true}
					class="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-[#01c0a4] to-[#00a085] text-white py-2 px-3 rounded-lg hover:shadow-lg hover:shadow-[#01c0a4]/25 transition-all duration-200 text-sm"
				>
					<Plus class="w-4 h-4" />
					<span>New Group Chat</span>
				</button>
			</div>

			<!-- Conversations List -->
			<div class="flex-1 overflow-y-auto">
				<!-- Group Chats Section -->
				<div class="border-b border-gray-200">
					<button
						onclick={() => showGroups = !showGroups}
						class="w-full flex items-center justify-between p-2 hover:bg-gray-50 text-left"
					>
						<div class="flex items-center space-x-2">
							{#if showGroups}
								<ChevronDown class="w-4 h-4 text-gray-500" />
							{:else}
								<ChevronRight class="w-4 h-4 text-gray-500" />
							{/if}
							<span class="font-medium text-gray-700 text-sm">Group Chats</span>
						</div>
						<span class="text-xs text-gray-500">{groupChats.length}</span>
					</button>
					
					{#if shouldShowGroups}
						{#each filteredGroupChats as conversation (conversation.id)}
							<button
								onclick={() => selectConversation(conversation)}
								class="w-full p-2 flex items-center space-x-2 hover:bg-gray-50 border-b border-gray-100 text-left transition-colors {currentConversation?.id === conversation.id ? 'bg-[#01c0a4]/5 border-r-2 border-r-[#01c0a4]' : ''}"
							>
								<div class="relative">
									<img
										src={conversation.avatar || "/placeholder.svg"}
										alt={conversation.name}
										class="w-8 h-8 rounded-full"
									/>
								</div>
								
								<div class="flex-1 min-w-0">
									<div class="flex items-center justify-between">
										<h3 class="font-medium text-gray-900 truncate flex items-center space-x-1 text-sm">
											<span>{conversation.name}</span>
											<Users class="w-3 h-3 text-gray-500" />
										</h3>
										<span class="text-xs text-gray-500">{formatTime(conversation.lastMessageTime)}</span>
									</div>
									<p class="text-xs text-gray-500">{conversation.members.length} members</p>
								</div>
								
								{#if conversation.unreadCount > 0}
									<div class="bg-[#01c0a4] text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
										{conversation.unreadCount}
									</div>
								{/if}
							</button>
						{/each}
					{/if}
				</div>

				<!-- Conversations Section -->
				<div>
					<button
						onclick={() => showConversations = !showConversations}
						class="w-full flex items-center justify-between p-2 hover:bg-gray-50 text-left"
					>
						<div class="flex items-center space-x-2">
							{#if showConversations}
								<ChevronDown class="w-4 h-4 text-gray-500" />
							{:else}
								<ChevronRight class="w-4 h-4 text-gray-500" />
							{/if}
							<span class="font-medium text-gray-700 text-sm">Conversations</span>
						</div>
						<span class="text-xs text-gray-500">{conversations.length}</span>
					</button>
					
					{#if shouldShowConversations}
						{#each filteredConversations as conversation (conversation.id)}
							<button
								onclick={() => selectConversation(conversation)}
								class="w-full p-2 flex items-center space-x-2 hover:bg-gray-50 border-b border-gray-100 text-left transition-colors {currentConversation?.id === conversation.id ? 'bg-[#01c0a4]/5 border-r-2 border-r-[#01c0a4]' : ''}"
							>
								<div class="relative">
									<img
										src={conversation.avatar || "/placeholder.svg"}
										alt={conversation.name}
										class="w-8 h-8 rounded-full"
									/>
									{#if conversation.isOnline}
										<div class="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border border-white"></div>
									{/if}
								</div>
								
								<div class="flex-1 min-w-0">
									<div class="flex items-center justify-between">
										<h3 class="font-medium text-gray-900 truncate text-sm">
											{conversation.name}
										</h3>
										<span class="text-xs text-gray-500">{formatTime(conversation.lastMessageTime)}</span>
									</div>
									<p class="text-xs text-gray-500">{conversation.department} • {conversation.role}</p>
								</div>
								
								{#if conversation.unreadCount > 0}
									<div class="bg-[#01c0a4] text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
										{conversation.unreadCount}
									</div>
								{/if}
							</button>
						{/each}
					{/if}
				</div>

				<!-- Start New Conversation Section (only when searching) -->
				{#if searchInput.trim() && filteredUsers.length > 0}
					<div class="border-b border-gray-200">
						<div class="p-2">
							<div class="flex items-center space-x-2">
								<UserPlus class="w-4 h-4 text-gray-500" />
								<span class="font-medium text-gray-700 text-sm">Start New Conversation</span>
							</div>
						</div>
						
						{#each filteredUsers as user (user.id)}
							<button
								onclick={() => startNewConversation(user)}
								class="w-full p-2 flex items-center space-x-2 hover:bg-gray-50 border-b border-gray-100 text-left transition-colors"
							>
								<div class="relative">
									<img
										src={user.avatar || "/placeholder.svg"}
										alt={user.name}
										class="w-8 h-8 rounded-full"
									/>
								</div>
								
								<div class="flex-1 min-w-0">
									<div class="flex items-center justify-between">
										<h3 class="font-medium text-gray-900 truncate text-sm">
											{user.name}
										</h3>
										<MessageCircle class="w-3 h-3 text-gray-400" />
									</div>
									<p class="text-xs text-gray-500">{user.department} • {user.role}</p>
								</div>
							</button>
						{/each}
					</div>
				{/if}
			</div>
		</aside>

		<!-- Chat Area -->
		{#if currentConversation}
			<main class="flex-1 flex flex-col bg-gray-50">
				<!-- Chat Header -->
				<div class="px-6 py-4 border-b border-gray-300 flex items-center justify-between bg-white">
					<div class="flex items-center space-x-3">
						<img
							src={currentConversation.avatar || "/placeholder.svg"}
							alt={currentConversation.name}
							class="w-10 h-10 rounded-full"
						/>
						<div>
							<h2 class="font-semibold text-gray-900">{currentConversation.name}</h2>
							{#if currentConversation.type === 'group'}
								<p class="text-sm text-gray-500">{currentConversation.members.length} members</p>
							{:else}
								<p class="text-sm text-gray-500">
									{currentConversation.department} • {currentConversation.role}
									{currentConversation.isOnline ? ' • Online' : ' • Offline'}
								</p>
							{/if}
						</div>
					</div>
					
					<div class="flex items-center space-x-2">
						<button
							onclick={() => showSearchInChat = !showSearchInChat}
							class="p-2 text-gray-600 hover:text-[#01c0a4] hover:bg-gray-100 rounded-lg transition-colors"
						>
							<Search class="w-5 h-5" />
						</button>
						
						{#if currentConversation.type === 'group'}
							<button
								onclick={toggleMembersPanel}
								class="p-2 text-gray-600 hover:text-[#01c0a4] hover:bg-gray-100 rounded-lg transition-colors"
							>
								<Users class="w-5 h-5" />
							</button>
							
							<button
								onclick={openGroupSettings}
								class="p-2 text-gray-600 hover:text-[#01c0a4] hover:bg-gray-100 rounded-lg transition-colors"
							>
								<MoreVertical class="w-5 h-5" />
							</button>
						{/if}
					</div>
				</div>

				<!-- Search in Chat -->
				{#if showSearchInChat}
					<div class="px-6 py-3 bg-gray-100 border-b border-gray-300">
						<div class="relative">
							<Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
							<input
								bind:value={searchInChatQuery}
								type="text"
								placeholder="Search in this conversation..."
								class="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent"
							/>
						</div>
					</div>
				{/if}

				<!-- Messages -->
				<div class="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
					{#each currentConversation.messages as message (message.id)}
						<div class="flex {message.senderId === '1' ? 'justify-end' : 'justify-start'} group">
							<div class="flex items-start space-x-2 max-w-xs lg:max-w-md">
								{#if message.senderId !== '1'}
									<img
										src={currentConversation.members.find(m => m.id === message.senderId)?.avatar || '/placeholder.svg?height=32&width=32'}
										alt=""
										class="w-8 h-8 rounded-full mt-1"
									/>
								{/if}
								
								<div class="flex flex-col {message.senderId === '1' ? 'items-end' : 'items-start'}">
									{#if message.senderId !== '1'}
										<div class="text-xs text-gray-500 mb-1">
											{message.senderName}
											{#if message.senderDepartment && message.senderRole}
												<span class="text-gray-400">• {message.senderDepartment} • {message.senderRole}</span>
											{/if}
										</div>
									{/if}
									
									{#if message.replyTo}
										<div class="mb-2 p-2 bg-gray-100 rounded-lg border-l-2 border-[#01c0a4] text-sm">
											<div class="text-xs text-gray-500 mb-1">Replying to {message.replyTo.senderName}</div>
											<div class="text-gray-700">{message.replyTo.content}</div>
										</div>
									{/if}
									
									<div class="relative">
										<div class="px-4 py-2 rounded-2xl {message.senderId === '1' ? 'bg-gradient-to-r from-[#01c0a4] to-[#00a085] text-white' : 'bg-gray-100 text-gray-900'}">
											<p class="whitespace-pre-wrap">{message.content}</p>
										</div>
										
										<!-- Message actions -->
										<div class="absolute top-0 {message.senderId === '1' ? 'right-full mr-2' : 'left-full ml-2'} opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
											<button
												onclick={() => startReply(message)}
												class="p-1 bg-white border border-gray-200 rounded-full shadow-sm hover:bg-gray-50 transition-colors"
												aria-label="Reply to message"
											>
												<Reply class="w-3 h-3 text-gray-600" />
											</button>
											{#if message.senderId === '1'}
												<button
													onclick={() => startEditMessage(message)}
													class="p-1 bg-white border border-gray-200 rounded-full shadow-sm hover:bg-gray-50 transition-colors"
													aria-label="Edit message"
												>
													<svg class="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
													</svg>
												</button>
												<button
													onclick={() => unsendMessage(message.id)}
													class="p-1 bg-white border border-gray-200 rounded-full shadow-sm hover:bg-red-50 hover:border-red-200 transition-colors"
													aria-label="Unsend message"
												>
													<X class="w-3 h-3 text-red-600" />
												</button>
											{/if}
											{#if currentConversation.settings?.allowEmojis !== false}
												{#each quickEmojis as emoji}
													<button
														onclick={() => addReaction(message.id, emoji)}
														class="p-1 bg-white border border-gray-200 rounded-full shadow-sm hover:bg-gray-50 transition-colors text-sm"
														aria-label={`Add ${emoji} reaction`}
													>
														{emoji}
													</button>
												{/each}
											{/if}
										</div>
									</div>
									
									<!-- Reactions -->
									{#if message.reactions && message.reactions.length > 0}
										<div class="flex space-x-1 mt-1">
											{#each message.reactions as reaction}
												<button
													onclick={() => addReaction(message.id, reaction.emoji)}
													class="flex items-center space-x-1 px-2 py-1 bg-gray-100 rounded-full text-xs hover:bg-gray-200 transition-colors {reaction.users.includes('1') ? 'bg-[#01c0a4]/10 text-[#01c0a4]' : ''}"
													aria-label={`Toggle ${reaction.emoji} reaction`}
												>
													<span>{reaction.emoji}</span>
													<span>{reaction.count}</span>
												</button>
											{/each}
										</div>
									{/if}
									
									<span class="text-xs text-gray-500 mt-1">{formatTime(message.timestamp)}</span>
								</div>
								
								{#if message.senderId === '1'}
									<img
										src="/placeholder.svg?height=32&width=32"
										alt=""
										class="w-8 h-8 rounded-full mt-1"
									/>
								{/if}
							</div>
						</div>
					{/each}

					<!-- Typing Indicator -->
					{#if othersTyping && currentConversation}
						<div class="flex justify-start">
							<div class="flex items-center space-x-2 max-w-xs">
								<img
									src={currentConversation.type === 'group' ? currentConversation.members.find(m => m.id !== '1')?.avatar || '/placeholder.svg?height=32&width=32' : currentConversation.members.find(m => m.id !== '1')?.avatar || '/placeholder.svg?height=32&width=32'}
									alt=""
									class="w-8 h-8 rounded-full"
								/>
								<div class="bg-gray-200 px-4 py-2 rounded-2xl">
									<div class="flex space-x-1">
										<div class="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
										<div class="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
										<div class="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
									</div>
								</div>
							</div>
						</div>
					{/if}
				</div>

				<!-- Reply Preview -->
				{#if replyingTo}
					<div class="px-6 py-2 bg-gray-100 border-t border-gray-300 flex items-center justify-between">
						<div class="flex items-center space-x-2">
							<Reply class="w-4 h-4 text-gray-500" />
							<span class="text-sm text-gray-600">Replying to {replyingTo.senderName}</span>
							<span class="text-sm text-gray-500 truncate max-w-xs">{replyingTo.content}</span>
						</div>
						<button onclick={cancelReply} class="text-gray-500 hover:text-gray-700" aria-label="Cancel reply">
							×
						</button>
					</div>
				{/if}

				<!-- Edit Preview -->
				{#if editingMessage}
					<div class="px-6 py-2 bg-blue-50 border-t border-blue-200 flex items-center justify-between">
						<div class="flex items-center space-x-2">
							<svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
							</svg>
							<span class="text-sm text-blue-600">Editing message</span>
						</div>
						<button onclick={cancelEdit} class="text-blue-500 hover:text-blue-700" aria-label="Cancel edit">
							×
						</button>
					</div>
				{/if}

				<!-- Message Input -->
				<div class="px-6 py-4 border-t border-gray-300 bg-white">
					<div class="flex items-end space-x-3">
						<div class="flex-1 relative">
							<div class="relative">
								<textarea
									bind:value={messageInput}
									oninput={handleTyping}
									onkeypress={handleKeyPress}
									placeholder={editingMessage ? "Edit your message..." : "Type a message..."}
									rows="1"
									class="w-full px-4 py-3 pr-20 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent resize-none"
								></textarea>
								
								<div class="absolute right-2 bottom-2 flex items-center space-x-1">
									{#if currentConversation.settings?.allowAttachments !== false}
										<button class="p-1 text-gray-500 hover:text-[#01c0a4] transition-colors" aria-label="Attach file">
											<Paperclip class="w-4 h-4" />
										</button>
									{/if}
									
									{#if currentConversation.settings?.allowEmojis !== false}
										<button 
											onclick={(e) => { e.stopPropagation(); showEmojiPicker = !showEmojiPicker; }}
											class="p-1 text-gray-500 hover:text-[#01c0a4] transition-colors" 
											aria-label="Add emoji"
										>
											<Smile class="w-4 h-4" />
										</button>
									{/if}
								</div>

								<!-- Emoji Picker -->
								{#if showEmojiPicker}
									<!-- svelte-ignore a11y_click_events_have_key_events -->
									<!-- svelte-ignore a11y_no_static_element_interactions -->
									<div class="absolute bottom-full right-2 mb-2 bg-white border border-gray-200 rounded-xl shadow-lg p-4 w-80 max-h-64 overflow-y-auto z-50" onclick={(e) => e.stopPropagation()}>
										<div class="space-y-3">
											{#each Object.entries(emojiGroups) as [category, emojis]}
												<div>
													<h4 class="text-sm font-medium text-gray-700 mb-2">{category}</h4>
													<div class="grid grid-cols-8 gap-2">
														{#each emojis as emoji}
															<button
																onclick={() => addEmojiToMessage(emoji)}
																class="p-2 hover:bg-gray-100 rounded-lg transition-colors text-lg"
																aria-label={`Add ${emoji} emoji`}
															>
																{emoji}
															</button>
														{/each}
													</div>
												</div>
											{/each}
										</div>
									</div>
								{/if}
							</div>
						</div>
						
						<button
							onclick={editingMessage ? saveEditedMessage : sendMessage}
							disabled={!messageInput.trim()}
							class="p-3 bg-gradient-to-r from-[#01c0a4] to-[#00a085] text-white rounded-xl hover:shadow-lg hover:shadow-[#01c0a4]/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
							aria-label={editingMessage ? "Save edited message" : "Send message"}
						>
							{#if editingMessage}
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
								</svg>
							{:else}
								<Send class="w-5 h-5" />
							{/if}
						</button>
					</div>
				</div>
			</main>
		{:else}
			<main class="flex-1 flex items-center justify-center bg-gray-50">
				<div class="text-center">
					<div class="w-16 h-16 bg-gradient-to-r from-[#01c0a4] to-[#00a085] rounded-2xl mx-auto mb-4 flex items-center justify-center">
						<MessageCircle class="w-8 h-8 text-white" />
					</div>
					<h3 class="text-xl font-semibold text-gray-900 mb-2">Select a conversation</h3>
					<p class="text-gray-600">Choose a conversation from the sidebar to start messaging</p>
				</div>
			</main>
		{/if}

		<!-- Members Panel -->
		{#if showMembersPanel && currentConversation?.type === 'group'}
			<aside class="w-80 bg-white border-l border-gray-300 flex flex-col">
				<!-- Header -->
				<div class="p-4 border-b border-gray-200">
					<div class="flex items-center justify-between">
						<h3 class="font-semibold text-gray-900 flex items-center space-x-2">
							<Users class="w-5 h-5" />
							<span>Members ({currentConversation.members.length})</span>
						</h3>
						<div class="flex items-center space-x-2">
							<button class="p-2 text-[#01c0a4] hover:bg-[#01c0a4]/10 rounded-lg transition-colors" aria-label="Add member">
								<UserPlus class="w-4 h-4" />
							</button>
							<button
								onclick={toggleMembersPanel}
								class="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
								aria-label="Close members panel"
							>
								<X class="w-4 h-4" />
							</button>
						</div>
					</div>
				</div>

				<!-- Members List -->
				<div class="flex-1 overflow-y-auto">
					{#each currentConversation.members as member (member.id)}
						<div class="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
							<div class="flex items-center space-x-3">
								<div class="relative">
									<img
										src={member.avatar || "/placeholder.svg"}
										alt={member.name}
										class="w-10 h-10 rounded-full"
									/>
									{#if member.isOnline}
										<div class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
									{/if}
								</div>
								
								<div>
									<div class="flex items-center space-x-2">
										<h4 class="font-medium text-gray-900">{member.name}</h4>
										{#if member.id === '1'}
											<Crown class="w-3 h-3 text-yellow-500" />
										{/if}
									</div>
									<p class="text-sm text-gray-500">
										{member.department} • {member.role}
									</p>
									<p class="text-xs text-gray-400">
										{member.isOnline ? 'Online' : 'Offline'}
										{#if member.isMuted}
											<span class="text-red-500">• Muted</span>
										{/if}
									</p>
								</div>
							</div>
							
							{#if member.id !== '1'}
								<div class="flex items-center space-x-1">
									<button
										onclick={() => toggleMute(member.id)}
										class="p-1 text-gray-500 hover:text-[#01c0a4] transition-colors"
										title={member.isMuted ? 'Unmute' : 'Mute'}
										aria-label={member.isMuted ? 'Unmute member' : 'Mute member'}
									>
										{#if member.isMuted}
											<VolumeX class="w-4 h-4" />
										{:else}
											<Volume2 class="w-4 h-4" />
										{/if}
									</button>
									
									<button
										onclick={() => removeMember(member.id)}
										class="p-1 text-gray-500 hover:text-red-500 transition-colors"
										title="Remove member"
										aria-label="Remove member"
									>
										<UserMinus class="w-4 h-4" />
									</button>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</aside>
		{/if}
	</div>
</div>

<!-- Group Settings Modal -->
{#if showGroupSettings}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="fixed inset-0 flex items-center justify-center z-50" onclick={closeGroupSettings}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4" onclick={(e) => e.stopPropagation()}>
			<!-- Header -->
			<div class="flex items-center justify-between p-6 border-b border-gray-200">
				<h2 class="text-xl font-semibold text-gray-900 flex items-center space-x-2">
					<Users class="w-5 h-5" />
					<span>Group Settings</span>
				</h2>
				<button onclick={closeGroupSettings} class="p-2 text-gray-500 hover:text-gray-700 transition-colors" aria-label="Close group settings">
					<X class="w-5 h-5" />
				</button>
			</div>

			<!-- Content -->
			<div class="p-6 space-y-6">
				<!-- Group Info - Editable -->
				<div class="space-y-4">
					<h4 class="font-medium text-gray-900">Group Information</h4>
					
					<!-- Group Photo and Name -->
					<div class="flex items-center space-x-4">
						<div class="relative">
							<img
								src={currentConversation?.avatar || "/placeholder.svg"}
								alt="Group avatar"
								class="w-16 h-16 rounded-full object-cover"
							/>
							<button 
								class="absolute -bottom-1 -right-1 w-8 h-8 bg-[#01c0a4] text-white rounded-full flex items-center justify-center text-sm hover:bg-[#00a085] transition-colors shadow-lg"
								aria-label="Change group photo"
							>
								<Camera class="w-4 h-4" />
							</button>
						</div>
						<div class="flex-1">
							<label for="editGroupName" class="block text-sm font-medium text-gray-700 mb-1">
								Group Name
							</label>
							<input
								id="editGroupName"
								bind:value={editingGroupName}
								type="text"
								placeholder="Enter group name..."
								class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent"
							/>
						</div>
					</div>

					<div class="text-sm text-gray-500">
						{currentConversation?.members.length} members
					</div>
				</div>

				<!-- Settings -->
				<div class="space-y-4">
					<h4 class="font-medium text-gray-900">Chat Settings</h4>
					
					<!-- Allow Emojis -->
					<div class="flex items-center justify-between">
						<div class="flex items-center space-x-3">
							<Smile class="w-5 h-5 text-gray-500" />
							<div>
								<p class="font-medium text-gray-900">Allow Emojis & Reactions</p>
								<p class="text-sm text-gray-500">Enable emoji reactions in this group</p>
							</div>
						</div>
						<button
							onclick={toggleEmojis}
							class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {currentConversation?.settings?.allowEmojis ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
							aria-label="Toggle emojis"
						>
							<span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {currentConversation?.settings?.allowEmojis ? 'translate-x-6' : 'translate-x-1'}"></span>
						</button>
					</div>

					<!-- Allow Attachments -->
					<div class="flex items-center justify-between">
						<div class="flex items-center space-x-3">
							<Paperclip class="w-5 h-5 text-gray-500" />
							<div>
								<p class="font-medium text-gray-900">Allow File Attachments</p>
								<p class="text-sm text-gray-500">Enable file and image sharing</p>
							</div>
						</div>
						<button
							onclick={toggleAttachments}
							class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {currentConversation?.settings?.allowAttachments ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
							aria-label="Toggle attachments"
						>
							<span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {currentConversation?.settings?.allowAttachments ? 'translate-x-6' : 'translate-x-1'}"></span>
						</button>
					</div>
				</div>

				<!-- Actions -->
				<div class="pt-4 border-t border-gray-200 space-y-3">
					<button
						onclick={archiveGroup}
						class="w-full flex items-center justify-center space-x-2 bg-gray-100 text-gray-700 py-3 px-4 rounded-xl hover:bg-gray-200 transition-colors"
						aria-label="Archive group"
					>
						<Archive class="w-4 h-4" />
						<span>Archive Group</span>
					</button>
				</div>
			</div>

			<!-- Footer -->
			<div class="p-6 border-t border-gray-200 flex space-x-3">
				<button
					onclick={closeGroupSettings}
					class="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
					aria-label="Cancel changes"
				>
					Cancel
				</button>
				<button
					onclick={saveGroupSettings}
					disabled={!editingGroupName.trim()}
					class="flex-1 py-3 px-4 bg-gradient-to-r from-[#01c0a4] to-[#00a085] text-white rounded-xl hover:shadow-lg hover:shadow-[#01c0a4]/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
					aria-label="Save changes"
				>
					Save Changes
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Create Group Modal -->
{#if showCreateGroup}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onclick={() => showCreateGroup = false}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4" onclick={(e) => e.stopPropagation()}>
			<!-- Header -->
			<div class="flex items-center justify-between p-6 border-b border-gray-200">
				<h2 class="text-xl font-semibold text-gray-900 flex items-center space-x-2">
					<Users class="w-5 h-5" />
					<span>Create Group Chat</span>
				</h2>
				<button onclick={() => showCreateGroup = false} class="p-2 text-gray-500 hover:text-gray-700 transition-colors" aria-label="Close create group">
					<X class="w-5 h-5" />
				</button>
			</div>

			<!-- Content -->
			<div class="p-6 space-y-6">
				<!-- Group Name -->
				<div>
					<label for="groupName" class="block text-sm font-medium text-gray-700 mb-2">
						Group Name
					</label>
					<input
						id="groupName"
						bind:value={groupName}
						type="text"
						placeholder="Enter group name..."
						class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent"
					/>
				</div>

				<!-- Selected Users -->
				{#if selectedUsers.length > 0}
					<div>
						<p class="text-sm font-medium text-gray-700 mb-2">Selected Members ({selectedUsers.length})</p>
						<div class="flex flex-wrap gap-2">
							{#each selectedUsers as user}
								<button
									onclick={() => toggleUser(user)}
									class="flex items-center space-x-2 bg-[#01c0a4]/10 text-[#01c0a4] px-3 py-1 rounded-full text-sm"
									aria-label={`Remove ${user.name} from group`}
								>
									<img src={user.avatar || "/placeholder.svg"} alt={user.name} class="w-4 h-4 rounded-full" />
									<span>{user.name}</span>
									<span class="hover:text-[#00a085]">×</span>
								</button>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Available Users -->
				<div>
					<p class="text-sm font-medium text-gray-700 mb-2">Add Members</p>
					<div class="max-h-48 overflow-y-auto space-y-2">
						{#each availableUsers as user}
							<button
								onclick={() => toggleUser(user)}
								class="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors {selectedUsers.some(u => u.id === user.id) ? 'bg-[#01c0a4]/5 border border-[#01c0a4]/20' : ''}"
								aria-label={selectedUsers.some(u => u.id === user.id) ? `Remove ${user.name} from selected users` : `Add ${user.name} to selected users`}
							>
								<img src={user.avatar || "/placeholder.svg"} alt={user.name} class="w-8 h-8 rounded-full" />
								<div class="flex-1 text-left">
									<p class="font-medium text-gray-900">{user.name}</p>
									<p class="text-sm text-gray-500">{user.department} • {user.role}</p>
								</div>
								{#if selectedUsers.some(u => u.id === user.id)}
									<div class="w-5 h-5 bg-[#01c0a4] rounded-full flex items-center justify-center">
										<span class="text-white text-xs">✓</span>
									</div>
								{:else}
									<div class="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
								{/if}
							</button>
						{/each}
					</div>
				</div>
			</div>

			<!-- Footer -->
			<div class="p-6 border-t border-gray-200 flex space-x-3">
				<button
					onclick={() => showCreateGroup = false}
					class="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
					aria-label="Cancel create group"
				>
					Cancel
				</button>
				<button
					onclick={createGroup}
					disabled={!groupName.trim() || selectedUsers.length === 0}
					class="flex-1 py-3 px-4 bg-gradient-to-r from-[#01c0a4] to-[#00a085] text-white rounded-xl hover:shadow-lg hover:shadow-[#01c0a4]/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
					aria-label="Create group"
				>
					Create Group
				</button>
			</div>
		</div>
	</div>
{/if}
