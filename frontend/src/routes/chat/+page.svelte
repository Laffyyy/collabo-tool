<script lang="ts">
	//import {goto} from '$app/navigation';
	import { getAllUsers } from '$lib/services/chatServices';
	import { onMount } from 'svelte';
	import { createConversation, getConversations, addMemberToConversation } from '$lib/services/chatServices';
	import Navigation from '$lib/components/Navigation.svelte';
	import ConfirmationModal from '$lib/components/ConfirmationModal.svelte';
	import ProfileAvatar from '$lib/components/ProfileAvatar.svelte';
	import GroupAvatar from '$lib/components/GroupAvatar.svelte';
	import UserProfileModal from '$lib/components/UserProfileModal.svelte';
	import { onDestroy } from 'svelte';
	import {  getMessagesForConversation, sendMessageToApi } from '$lib/services/chatServices';
	import LoginBackground from '../login/LoginBackground.svelte';
	import { 
		Search, Plus, Archive, MessageCircle, Users, Send, Paperclip, 
		Smile, MoreVertical, Reply, ChevronDown, ChevronRight, X, 
		UserPlus, Volume2, VolumeX, UserMinus, Crown, Eye, EyeOff, Camera,
		Pin, PinOff, Share2, Download, Image, FileText, Link, Filter,
		Forward, Trash2, Flag, Check, User, ArrowUp
	} from 'lucide-svelte';
	// Type definitions
	interface User {
		id: string;
		name: string;
		firstName?: string;
		lastName?: string;
		username?: string;
		avatar: string;
		department: string;
		role: string;
		organizationalUnit?: string;
		status?: 'online' | 'away' | 'idle' | 'offline';
		lastLogin?: string;
		managedTeams?: string[];
		supervisors?: string[];
		reportingTo?: string | null;
		isOnline?: boolean;
		isMuted?: boolean;
		email?: string;
		phone?: string;
		joinDate?: string;
		employeeId?: string;
		onlineStatus?: 'online' | 'away' | 'idle' | 'offline';
		coverPhoto?: string;
		manager?: string | null;
		supervisor?: string | null;
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
		isDeleted?: boolean;
		replyTo?: Message;
		isPinned?: boolean;
		pinningEnabled?: boolean;
		forwardingEnabled?: boolean;
		hasAttachment?: boolean;
		isForwarded?: boolean;
		originalSender?: string;
		attachment?: {
			id: string;
			name: string;
			type: 'file' | 'image' | 'video' | 'link';
			url: string;
			size?: number;
			permissions: {
				type: 'everyone' | 'specific' | 'role' | 'ou' | 'role-in-ou';
				allowedUsers?: string[];
				allowedRoles?: string[];
				allowedOUs?: string[];
				dynamicRule?: string; // e.g., "managers of engineering"
			};
		};
		reactions: Array<{
			emoji: string;
			users: string[];
			count: number;
			timestamp?: Date | string;
		}>;
		pinnedBy?: string;
		pinnedAt?: Date | string;
		seenBy?: Array<{
			userId: string;
			userName: string;
			userAvatar: string;
			seenAt: Date | string;
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
		isRead?: boolean; // For read status indicators
		forwardingEnabled?: boolean; // For message forwarding control
		messages: Message[];
		members: User[];
		pinnedMessages?: Message[];
		mediaHistory?: {
			files: Message[];
			media: Message[];
			links: Message[];
		};
		isTemporary?: boolean; // For conversations that haven't been saved yet
		settings?: {
			allowEmojis: boolean;
			allowAttachments: boolean;
			allowForwarding: boolean;
			allowPinning: boolean;
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
	let showPinnedPanel = $state(false);
	let showForwardModal = $state(false);
	let currentMembersTab = $state<'members' | 'files' | 'media' | 'links'>('members');
	let messagePollingInterval: ReturnType<typeof setInterval> | null = null;
	
	// Reaction modal state
	let showReactionModal = $state(false);
	let reactionModalMessage = $state<Message | null>(null);
	let reactionModalTab = $state<string>('all');
	
	// Forward modal state
	let forwardModalMessage = $state<Message | null>(null);
	let selectedForwardConversations = $state<string[]>([]);
	
	// User profile modal state
	let showUserProfileModal = $state(false);
	let selectedUserName = $state<string>('');
	
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
	let userSearchQuery = $state('');
	let messageToForward = $state<Message | null>(null);
	
	// File attachment state
	let selectedFiles = $state<File[]>([]);
	let showFilePermissionModal = $state(false);
	let filePermissionSettings = $state({
		type: 'everyone' as 'everyone' | 'specific',
		allowedUsers: [] as string[],
		allowedRoles: [] as string[],
		allowedOUs: [] as string[]
	});
	let fileInputRef = $state<HTMLInputElement>();
	let forwardSearchQuery = $state('');
	
	// Undo functionality for forwards
	let recentForwards = $state<{id: string, messageId: string, conversationIds: string[], timestamp: Date}[]>([]);
	let showUndoToast = $state(false);
	let undoToastTimeout: number | null = null;
	let undoAction = $state<(() => void) | null>(null);
	
	// Confirmation modal state
	let showConfirmation = $state(false);
	let confirmationData = $state<{
		title: string;
		message: string;
		confirmText: string;
		action: () => void;
	} | null>(null);
	
	// Group settings edit state
	let editingGroupName = $state('');

	// Sample data
	let availableUsers: User[] = [];

let currentUserId: string | null = null;
let jwtToken = $state<string | null>(null);
if (typeof window !== 'undefined') {
  // If you store the whole user object as JSON:
  const userStr = localStorage.getItem('auth_user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      currentUserId = user.id || user._id; // adjust property name as needed
    } catch (e) {
      currentUserId = null;
    }
  }
}

console.log('currentUserId:', currentUserId);

onMount(async () => {
if (typeof window !== 'undefined') {
    // Try different possible token keys
    jwtToken = localStorage.getItem('jwt') || 
               localStorage.getItem('auth_token') || 
               localStorage.getItem('token');
    
    // Try different possible user ID keys
    currentUserId = localStorage.getItem('auth_userId') || 
                    localStorage.getItem('userId');
    
    // If we have a user object in storage, extract the ID
    const userStr = localStorage.getItem('auth_user');
    if (userStr && !currentUserId) {
      try {
        const user = JSON.parse(userStr);
        currentUserId = user.id || user._id || user.userId;
      } catch (e) {
        console.error('Failed to parse user object:', e);
      }
    }
    
    console.log('Auth state:', { 
      jwtToken: jwtToken ? 'Present' : 'Missing',
      currentUserId
    });
  }

  try {
    conversations = await getConversations();
    groupChats = conversations.filter((c: any) => c.type === 'group');
    const users = await getAllUsers();
    
    // Debug what's actually coming from the server
    console.log("Raw users from backend:", users);
    
    // Map each property explicitly
 availableUsers = users.filter(u => u.id !== currentUserId)
  .map(u => {
    // Log each user to see exact structure
    console.log("Processing user:", u);
    
    return {
      id: u.did || u.uid || u.id || u._id, 
      name: u.firstname || u.firstname || 
            (u.dfirstname && u.dlastname ? `${u.dfirstname} ${u.dlastname}` : null) ||
            (u.firstname && u.lastname ? `${u.firstname} ${u.lastname}` : null) ||
            u.name || 
            'Unknown User',
      firstName: u.dfirstname || u.firstname || u.firstName,
      lastName: u.dlastname || u.lastname || u.lastName,
      username: u.dusername || u.username,
      avatar: u.davatar || u.avatar || u.profilePhoto || u.image || '/placeholder.svg',
      department: u.ddepartment || u.department || u.org_unit || 'Department',
      role: u.drole || u.role || 'Role'
    };
  });
      
    console.log('Transformed users:', availableUsers);
  } catch (e) {
    console.error('Failed to fetch conversations or users:', e);
  }
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

	const startMessagePolling = (conversationId: string) => {
  // Clear any existing polling
  if (messagePollingInterval) {
    clearInterval(messagePollingInterval);
  }
  
  messagePollingInterval = setInterval(async () => {
    if (!currentConversation || currentConversation.id !== conversationId) {
      if (messagePollingInterval) clearInterval(messagePollingInterval);
      return;
    }
    
    try {
      const messages = await getMessagesForConversation(conversationId);
      if (messages.length > currentConversation.messages.length) {
        // Update messages only if there are new ones
        currentConversation.messages = messages;
        // Update last message info
        if (messages.length > 0) {
          const lastMsg = messages[messages.length - 1];
          currentConversation.lastMessage = lastMsg.content;
          currentConversation.lastMessageTime = lastMsg.timestamp;
        }
      }
    } catch (error) {
      console.error('Error polling messages:', error);
    }
  }, 5000); // Poll every 5 seconds
};
const selectConversation = async (conversation: Conversation) => {
  currentConversation = conversation;
  conversation.isRead = true;
  conversation.unreadCount = 0;
  
  try {
    const messages = await getMessagesForConversation(conversation.id);
    currentConversation.messages = messages;
    markConversationAsSeen(conversation.id);
    
    // Start polling for new messages
    startMessagePolling(conversation.id);
  } catch (error) {
    console.error('Failed to load messages:', error);
  }
};

// Clean up polling on component unmount
onDestroy(() => {
  if (messagePollingInterval) {
    clearInterval(messagePollingInterval);
  }
});

	const sendMessage = async (attachment?: any) => {
  if ((!messageInput.trim() && !attachment) || !currentConversation) return;

  try {
    // If this is a temporary conversation, save it to the conversations list
    if (currentConversation.isTemporary) {
      // Save conversation logic here
      console.log('Creating new conversation from temporary one');
    }

    // Send message to backend
    const msgContent = attachment ? `Shared ${attachment.name}` : messageInput;
    const sentMsg = await sendMessageToApi(currentConversation.id, msgContent);
    
    console.log('Message sent:', sentMsg);

    // Create UI message object
    const newMessage: Message = {
      id: sentMsg.did || Date.now().toString(),
      senderId: currentUserId || '1',
      senderName: 'You',
      senderDepartment: 'Your Department',
      senderRole: 'Your Role',
      content: msgContent,
      timestamp: new Date(),
      type: 'text',
      replyTo: replyingTo || undefined,
      reactions: [],
      hasAttachment: !!attachment,
      attachment: attachment,
      forwardingEnabled: true,
      pinningEnabled: true
    };

    // Update UI
    currentConversation.messages.push(newMessage);
    currentConversation.lastMessage = msgContent;
    currentConversation.lastMessageTime = new Date();
    
    // Clear input
    if (!attachment) {
      messageInput = '';
    }
    replyingTo = null;
    
    // Fetch updated messages to ensure UI is in sync with backend
    const updatedMessages = await getMessagesForConversation(currentConversation.id);
    currentConversation.messages = updatedMessages;
  } catch (error) {
    console.error('Error sending message:', error);
    alert('Failed to send message. Please try again.');
  }
};

const markConversationAsSeen = (conversationId?: string) => {
  const targetConversation = conversationId 
    ? conversations.find(c => c.id === conversationId)
    : currentConversation;
    
  if (!targetConversation) return;
  
  // Mark all messages from other users as seen
  targetConversation.messages.forEach(message => {
    if (message.senderId !== currentUserId) {
      markMessageAsSeen(message.id, currentUserId || '1');
    }
  });
};

	const handleKeyPress = (event: KeyboardEvent) => {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			if (editingMessage) {
				saveEditedMessage();
			} else if (selectedFiles.length > 0) {
				// If files are selected, open permission modal instead of sending directly
				openFilePermissionModal();
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

	// Run simulation periodically - DISABLED to prevent layout jumping
	// setInterval(simulateTyping, 10000);

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
				existingReaction.timestamp = new Date();
			}
		} else {
			message.reactions.push({ emoji, users: ['1'], count: 1, timestamp: new Date() });
		}
	};

	const confirmUnsendMessage = (messageId: string) => {
		confirmationData = {
			title: 'Unsend Message',
			message: 'Are you sure you want to unsend this message? This action cannot be undone and the message will be removed for everyone.',
			confirmText: 'Unsend',
			action: () => unsendMessage(messageId)
		};
		showConfirmation = true;
	};

	const unsendMessage = (messageId: string) => {
		if (!currentConversation) return;
		
		const messageIndex = currentConversation.messages.findIndex(m => m.id === messageId);
		if (messageIndex !== -1) {
			// Mark the message as deleted instead of removing it
			currentConversation.messages[messageIndex].isDeleted = true;
			currentConversation.messages[messageIndex].content = 'This message was removed';
		}
		showConfirmation = false;
	};

	// File attachment functions
	const handleFileSelection = () => {
		fileInputRef?.click();
	};

	const handleFileChange = (event: Event) => {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			const newFiles = Array.from(target.files);
			selectedFiles = [...selectedFiles, ...newFiles];
		}
	};

	const removeFile = (index: number) => {
		selectedFiles = selectedFiles.filter((_, i) => i !== index);
	};

	const handleFileDrop = (event: DragEvent) => {
		event.preventDefault();
		const files = event.dataTransfer?.files;
		if (files && files.length > 0) {
			const newFiles = Array.from(files);
			selectedFiles = [...selectedFiles, ...newFiles];
		}
	};

	const handleDragOver = (event: DragEvent) => {
		event.preventDefault();
	};

	const openFilePermissionModal = () => {
		if (selectedFiles.length > 0) {
			showFilePermissionModal = true;
		}
	};

	const closeFilePermissionModal = () => {
		showFilePermissionModal = false;
		filePermissionSettings = {
			type: 'everyone',
			allowedUsers: [],
			allowedRoles: [],
			allowedOUs: []
		};
	};

	const sendMessageWithAttachments = () => {
		if (selectedFiles.length > 0) {
			// Create attachments from selected files
			const attachments = selectedFiles.map(file => ({
				id: Date.now().toString() + Math.random(),
				name: file.name,
				type: getFileType(file.name),
				url: URL.createObjectURL(file),
				size: file.size,
				permissions: { ...filePermissionSettings }
			}));

			// Send messages with attachments
			attachments.forEach(attachment => {
				sendMessage(attachment);
			});

			// Clear selected files and close modal
			selectedFiles = [];
			closeFilePermissionModal();
		} else {
			// Send regular message if no attachments
			sendMessage();
		}
	};

	const getFileType = (fileName: string): 'file' | 'image' | 'video' | 'link' => {
		const extension = fileName.toLowerCase().split('.').pop() || '';
		
		if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(extension)) {
			return 'image';
		} else if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(extension)) {
			return 'video';
		} else {
			return 'file';
		}
	};

	const formatFileSize = (bytes: number): string => {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

	const startForwardMessage = (message: Message) => {
		forwardModalMessage = message;
		selectedForwardConversations = [];
		showForwardModal = true;
	};

	const closeForwardModal = () => {
		showForwardModal = false;
		forwardModalMessage = null;
		selectedForwardConversations = [];
	};

	const toggleForwardConversation = (conversationId: string) => {
		if (selectedForwardConversations.includes(conversationId)) {
			selectedForwardConversations = selectedForwardConversations.filter(id => id !== conversationId);
		} else {
			selectedForwardConversations = [...selectedForwardConversations, conversationId];
		}
	};

	const confirmForward = () => {
		if (forwardModalMessage && selectedForwardConversations.length > 0) {
			// In a real app, this would send the message to selected conversations
			console.log('Forwarding message:', forwardModalMessage.id, 'to:', selectedForwardConversations);
			
			// Show success toast
			showUndoToast = true;
			undoAction = () => {
				console.log('Forward cancelled for message:', forwardModalMessage?.id);
			};
			setTimeout(() => {
				showUndoToast = false;
			}, 3000);
		}
		closeForwardModal();
	};

	// Seen functionality
	const markMessageAsSeen = (messageId: string, userId: string = '1') => {
		if (!currentConversation) return;
		
		const messageIndex = currentConversation.messages.findIndex(m => m.id === messageId);
		if (messageIndex === -1) return;
		
		const message = currentConversation.messages[messageIndex];
		
		// Don't mark own messages as seen by yourself
		if (message.senderId === userId) return;
		
		// Check if already seen by this user
		if (message.seenBy?.some(seen => seen.userId === userId)) return;
		
		// Add seen info
		if (!message.seenBy) {
			message.seenBy = [];
		}
		
		const user = availableUsers.find(u => u.id === userId) || currentConversation.members?.find(m => m.id === userId);
		if (user) {
			message.seenBy.push({
				userId: userId,
				userName: user.name,
				userAvatar: user.avatar,
				seenAt: new Date()
			});
		}
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


const createGroup = async () => {
  console.log('Creating group with:', { groupName, selectedUsers, currentUserId });
  
  if (!groupName.trim() || selectedUsers.length === 0 || !currentUserId) {
    console.error('Missing required fields:', { 
      hasName: !!groupName.trim(), 
      hasUsers: selectedUsers.length > 0, 
      hasUserId: !!currentUserId 
    });
    return;
  }

  try {
    // First create the conversation in the backend
    const newGroup = await createConversation({
      dname: groupName,
      dtype: 'group',
      dcreatedBy: currentUserId
    });
    
    console.log("New group created:", newGroup);
    
    // Now add each member to the conversation in the backend
  for (const user of selectedUsers) {
  try {
    console.log('Adding member:', user);
    await addMemberToConversation({
      conversationId: newGroup.did || newGroup.id,
      userId: user.id
    });
  } catch (memberErr) {
    console.error(`Failed to add member ${user.name}:`, memberErr);
  }
}
    
    // Now enhance with UI data for display
    const enhancedGroup = {
      ...newGroup,
      id: newGroup.did || newGroup.id,
      name: newGroup.dname || groupName,
      type: 'group',
      lastMessage: 'Group created',
      lastMessageTime: new Date(),
      unreadCount: 0,
      isRead: true,
      avatar: '/placeholder.svg',
      isOnline: false,
      messages: [],
      members: [...selectedUsers, { 
        id: currentUserId, 
        name: 'You', 
        avatar: '/placeholder.svg', 
        department: 'My Dept', 
        role: 'My Role' 
      }]
    };
    
    // Update frontend state
    conversations = [...conversations, enhancedGroup];
    groupChats = conversations.filter((c) => c.type === 'group');
    
    // Close modal and reset form
    showCreateGroup = false;
    groupName = '';
    selectedUsers = [];
  } catch (e) {
    console.error('Failed to create group:', e);
    alert('Failed to create group: ' + (e.message || e));
  }
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

	// Derived state for filtered conversations
	const filteredConversations = $derived(conversations.filter(conv => 
		conv.name.toLowerCase().includes(searchInput.toLowerCase()) ||
		conv.lastMessage.toLowerCase().includes(searchInput.toLowerCase())
	));

	const filteredGroupChats = $derived(groupChats.filter(conv => 
		conv.name.toLowerCase().includes(searchInput.toLowerCase()) ||
		conv.lastMessage.toLowerCase().includes(searchInput.toLowerCase())
	));

	// Calculate active (online) members for each group chat
	const getActiveMemberCount = (conversation: Conversation) => {
		if (conversation.type !== 'group') return 0;
		return conversation.members.filter(member => member.isOnline).length;
	};

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
			isRead: true,
			avatar: user.avatar,
			isOnline: false,
			messages: [],
			members: [
				{ 
					id: '1', 
					name: 'You', 
					firstName: 'Current',
					lastName: 'User',
					avatar: '/placeholder.svg?height=32&width=32', 
					isOnline: true, 
					isMuted: false,
					department: 'IT',
					role: 'Manager'
				},
				{ ...user, isOnline: false, isMuted: false }
			],
			isTemporary: true, // Mark as temporary
			settings: {
				allowEmojis: true,
				allowAttachments: true,
				allowForwarding: true,
				allowPinning: false,
				isArchived: false
			}
		};

		currentConversation = tempConversation;
		searchInput = ''; // Clear search after starting conversation
	};

	// Pin/Unpin message
	const togglePinMessage = (messageId: string) => {
		if (!currentConversation || !currentConversation.settings?.allowPinning) return;
		
		const message = currentConversation.messages.find(m => m.id === messageId);
		if (!message) return;

		message.isPinned = !message.isPinned;
		
		if (!currentConversation.pinnedMessages) {
			currentConversation.pinnedMessages = [];
		}
		
		if (message.isPinned) {
			currentConversation.pinnedMessages.push(message);
		} else {
			currentConversation.pinnedMessages = currentConversation.pinnedMessages.filter(m => m.id !== messageId);
		}
	};

	// Toggle settings functions
	const toggleForwarding = () => {
		if (currentConversation?.settings) {
			currentConversation.settings.allowForwarding = !currentConversation.settings.allowForwarding;
		}
	};

	const togglePinning = () => {
		if (currentConversation?.settings) {
			currentConversation.settings.allowPinning = !currentConversation.settings.allowPinning;
		}
	};

	// Filter users function for group creation
	const filteredUsersForGroup = $derived.by(() => {
		if (!userSearchQuery.trim()) return availableUsers;
		
		return availableUsers.filter(user =>
			user.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
			user.department.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
			user.role.toLowerCase().includes(userSearchQuery.toLowerCase())
		);
	});

	// Filter conversations for forwarding
	const filteredForwardConversations = $derived.by(() => {
		if (!forwardSearchQuery.trim()) return conversations;
		
		return conversations.filter(conversation =>
			conversation.name.toLowerCase().includes(forwardSearchQuery.toLowerCase())
		);
	});

	function formatTime(timestamp: Date | string): string {
		const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
		
		// Check for invalid dates and handle them gracefully
		if (isNaN(date.getTime())) {
			return 'now';
		}
		
		return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	function forwardMessage() {
		if (!messageToForward || selectedForwardConversations.length === 0) return;

		const forwardId = `forward_${Date.now()}`;
		const forwardedMessageIds: string[] = [];

		// Forward the message to selected conversations
		selectedForwardConversations.forEach((conversationId: string) => {
			const targetConversation = conversations.find(c => c.id === conversationId);
			if (targetConversation && targetConversation.forwardingEnabled) {
				const forwardedMessage: Message = {
					id: `msg_${Date.now()}_${Math.random()}`,
					content: `[Forwarded] ${messageToForward!.content}`,
					senderId: 'current-user',
					senderName: 'You',
					senderDepartment: 'Current User Department',
					senderRole: 'Current User Role',
					timestamp: new Date(),
					type: 'text',
					isForwarded: true,
					originalSender: messageToForward!.senderName,
					reactions: []
				};
				targetConversation.messages.push(forwardedMessage);
				forwardedMessageIds.push(forwardedMessage.id);
			}
		});

		// Track the forward for undo functionality
		const forwardRecord = {
			id: forwardId,
			messageId: messageToForward.id,
			conversationIds: [...selectedForwardConversations],
			timestamp: new Date()
		};
		recentForwards.push(forwardRecord);
		
		// Clean up old forwards (keep only last 5)
		if (recentForwards.length > 5) {
			recentForwards.shift();
		}

		// Show undo toast
		showUndoToast = true;
		if (undoToastTimeout) {
			clearTimeout(undoToastTimeout);
		}
		undoToastTimeout = setTimeout(() => {
			showUndoToast = false;
		}, 5000);

		// Reset forward modal state
		showForwardModal = false;
		messageToForward = null;
		selectedForwardConversations = [];
		forwardSearchQuery = '';
		
		console.log('Message forwarded successfully');
	}

	function undoLastForward() {
		if (recentForwards.length === 0) return;
		
		const lastForward = recentForwards[recentForwards.length - 1];
		
		// Remove forwarded messages from conversations
		lastForward.conversationIds.forEach(conversationId => {
			const conversation = conversations.find(c => c.id === conversationId);
			if (conversation) {
				// Find and remove the last forwarded message
				const messageIndex = conversation.messages.findIndex(m => 
					m.isForwarded && 
					m.originalSender === lastForward.messageId && 
					new Date(m.timestamp).getTime() >= lastForward.timestamp.getTime()
				);
				if (messageIndex !== -1) {
					conversation.messages.splice(messageIndex, 1);
				}
			}
		});
		
		// Remove from recent forwards
		recentForwards.pop();
		showUndoToast = false;
		
		console.log('Last forward undone');
	}

	function jumpToMessage(messageId: string) {
		// In a real implementation, this would scroll to the message in the chat
		// For now, we'll just close the pinned panel and log the action
		showPinnedPanel = false;
		console.log('Jumping to message:', messageId);
		
		// You could implement actual scrolling here:
		// const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
		// if (messageElement) {
		//   messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
		// }
	}

	function unpinMessage(messageId: string) {
		if (!currentConversation || !currentConversation.pinnedMessages) return;
		
		// Remove the message from pinned messages
		currentConversation.pinnedMessages = currentConversation.pinnedMessages.filter(
			msg => msg.id !== messageId
		);
		
		console.log('Message unpinned:', messageId);
	}

	function openReactionModal(message: Message) {
		reactionModalMessage = message;
		showReactionModal = true;
		reactionModalTab = 'all';
	}

	function closeReactionModal() {
		showReactionModal = false;
		reactionModalMessage = null;
		reactionModalTab = 'all';
	}

	function showUserProfile(user: User) {
		console.log('🎯 Chat showUserProfile called with:', user);
		selectedUserName = user.name || '';
		console.log('🎯 selectedUserName set to:', `"${selectedUserName}"`);
		showUserProfileModal = true;
		console.log('🎯 showUserProfileModal set to:', showUserProfileModal);
	}

	function closeUserProfile() {
		showUserProfileModal = false;
		selectedUserName = '';
	}

	function getReactionUsers(message: Message, emoji?: string) {
		if (!message.reactions) return [];
		
		if (emoji === 'all') {
			// Return all users who reacted with their details and emoji
			const allUsers: Array<{user: User, emoji: string}> = [];
			message.reactions.forEach(reaction => {
				reaction.users.forEach(userId => {
					const user = getUserDetails(userId);
					if (user) {
						allUsers.push({user, emoji: reaction.emoji});
					}
				});
			});
			return allUsers;
		}
		
		if (emoji) {
			const reaction = message.reactions.find(r => r.emoji === emoji);
			return reaction ? reaction.users.map(userId => {
				const user = getUserDetails(userId);
				return user ? {user, emoji} : null;
			}).filter(Boolean) : [];
		}
		
		// Return all users who reacted
		const allUsers = new Set<string>();
		message.reactions.forEach(reaction => {
			reaction.users.forEach(userId => allUsers.add(userId));
		});
		return Array.from(allUsers).map(userId => {
			const user = getUserDetails(userId);
			return user ? {user, emoji: ''} : null;
		}).filter(Boolean);
	}

	function getUserDetails(userId: string) {
		// Find user details from conversation members or available users
		if (currentConversation) {
			const member = currentConversation.members.find(m => m.id === userId);
			if (member) return enhanceUserObject(member);
		}
		
		const user = availableUsers.find(u => u.id === userId);
		if (user) return enhanceUserObject(user);
		
		// Return basic mock user details for system functionality
		const basicMockUsers = {
			'1': {
				id: '1',
				name: 'Current User',
				firstName: 'Current',
				lastName: 'User',
				avatar: '/placeholder.svg',
				department: 'IT',
				role: 'admin'
			}
		};
		
		const mockUser = basicMockUsers[userId as keyof typeof basicMockUsers];
		return mockUser ? enhanceUserObject(mockUser) : enhanceUserObject({
			id: userId,
			name: 'Unknown User',
			firstName: 'Unknown',
			lastName: 'User',
			avatar: '/placeholder.svg',
			department: '',
			role: ''
		});
	}

	// Helper function to enhance user objects with firstName/lastName
	function enhanceUserObject(user: any): User {
		if (!user) return { 
			id: 'unknown', 
			name: 'Unknown User', 
			firstName: 'Unknown',
			lastName: 'User',
			avatar: '/placeholder.svg',
			department: '',
			role: '',
			email: '',
			phone: '',
			joinDate: '',
			employeeId: '',
			lastLogin: '',
			onlineStatus: 'offline',
			coverPhoto: '/placeholder.svg?height=300&width=800',
			manager: null,
			supervisor: null
		};
		
		// If user already has firstName and lastName, return enhanced version
		if (user.firstName && user.lastName) {
			return {
				...user,
				employeeId: user.employeeId || '',
				lastLogin: user.lastLogin || '',
				onlineStatus: user.onlineStatus || 'offline',
				coverPhoto: user.coverPhoto || '/placeholder.svg?height=300&width=800',
				manager: user.manager || null,
				supervisor: user.supervisor || null
			};
		}
		
		// If user has a name but no firstName/lastName, try to parse
		if (user.name && !user.firstName && !user.lastName) {
			const nameParts = user.name.split(' ');
			return {
				...user,
				firstName: nameParts[0] || '',
				lastName: nameParts.length > 1 ? nameParts[nameParts.length - 1] : '',
				employeeId: user.employeeId || '',
				lastLogin: user.lastLogin || '',
				onlineStatus: user.onlineStatus || 'offline',
				coverPhoto: user.coverPhoto || '/placeholder.svg?height=300&width=800',
				manager: user.manager || null,
				supervisor: user.supervisor || null
			};
		}
		
		return {
			...user,
			employeeId: user.employeeId || '',
			lastLogin: user.lastLogin || '',
			onlineStatus: user.onlineStatus || 'offline',
			coverPhoto: user.coverPhoto || '/placeholder.svg?height=300&width=800',
			manager: user.manager || null,
			supervisor: user.supervisor || null
		};
	}

	// Helper function to ensure user objects have firstName and lastName for ProfileAvatar
	function getUserForAvatar(user: any) {
		if (!user) return { name: 'Unknown User' };
		
		// If user already has firstName and lastName, return as is
		if (user.firstName && user.lastName) {
			return user;
		}
		
		// If user has a name, try to extract firstName and lastName
		if (user.name) {
			const nameParts = user.name.split(' ');
			if (nameParts.length >= 2) {
				return {
					...user,
					firstName: nameParts[0],
					lastName: nameParts[nameParts.length - 1]
				};
			}
			return {
				...user,
				firstName: nameParts[0] || user.name,
				lastName: ''
			};
		}
		
		return user;
	}

	function groupMessagesByTime(messages: Message[]) {
  const groups: { 
    timeLabel: string, 
    messages: Message[], 
    timestamp: Date 
  }[] = [];
  const TIME_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds
  
  messages.forEach((message, index) => {
    const messageTime = new Date(message.timestamp);
    const prevMessage = messages[index - 1];
    const prevTime = prevMessage ? new Date(prevMessage.timestamp) : null;
    
    // Check if we need a new time group
    const needNewGroup = !prevTime || 
      (messageTime.getTime() - prevTime.getTime()) > TIME_THRESHOLD ||
      prevMessage.isDeleted ||
      message.isDeleted;
    
    if (needNewGroup) {
      // Create new time group with a unique identifier
      const timeLabel = formatTimeLabel(messageTime);
      groups.push({
        timeLabel,
        messages: [message],
        timestamp: messageTime,
        uniqueId: `${messageTime.getTime()}-${index}` // Add a uniqueId property
      });
    } else {
      // Add to existing group
      const lastGroup = groups[groups.length - 1];
      lastGroup.messages.push(message);
    }
  });
  
  return groups;
}

	function formatTimeLabel(date: Date): string {
		const now = new Date();
		const isToday = date.toDateString() === now.toDateString();
		const yesterday = new Date(now);
		yesterday.setDate(yesterday.getDate() - 1);
		const isYesterday = date.toDateString() === yesterday.toDateString();
		
		if (isToday) {
			return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
		} else if (isYesterday) {
			return `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
		} else {
			return date.toLocaleDateString([], { 
				month: 'short', 
				day: 'numeric',
				hour: '2-digit', 
				minute: '2-digit' 
			});
		}
	}

	function formatExactTime(timestamp: Date | string): string {
		const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
		if (isNaN(date.getTime())) {
			return 'Invalid time';
		}
		return date.toLocaleString([], { 
			weekday: 'short',
			month: 'short', 
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit', 
			minute: '2-digit',
			second: '2-digit'
		});
	}

	// Derived state for grouped messages
const groupedMessages = $derived(() => {
  if (!currentConversation) return [];
  const groups = groupMessagesByTime(currentConversation.messages);
  
  // Add a unique identifier to each group to prevent duplicate keys
  return groups.map((group, index) => ({
    ...group,
    uniqueKey: `${group.timestamp.getTime()}-${index}` // Create a truly unique key
  }));
});

	function getMediaHistory(conversation: Conversation | null) {
		if (!conversation) {
			return { files: [], media: [], links: [] };
		}

		const files: Message[] = [];
		const media: Message[] = [];
		const links: Message[] = [];

		conversation.messages.forEach(message => {
			if (message.hasAttachment && message.attachment) {
				const attachment = message.attachment;
				
				// Categorize by file type
				if (attachment.type === 'file' || attachment.name?.endsWith('.pdf') || 
					attachment.name?.endsWith('.doc') || attachment.name?.endsWith('.docx') ||
					attachment.name?.endsWith('.txt') || attachment.name?.endsWith('.xls') ||
					attachment.name?.endsWith('.xlsx') || attachment.name?.endsWith('.ppt') ||
					attachment.name?.endsWith('.pptx')) {
					files.push(message);
				} else if (attachment.type === 'image' || attachment.name?.endsWith('.jpg') ||
						   attachment.name?.endsWith('.jpeg') || attachment.name?.endsWith('.png') ||
						   attachment.name?.endsWith('.gif') || attachment.name?.endsWith('.bmp') ||
						   attachment.name?.endsWith('.svg') || attachment.name?.endsWith('.webp') ||
						   attachment.type === 'video' || attachment.name?.endsWith('.mp4') ||
						   attachment.name?.endsWith('.avi') || attachment.name?.endsWith('.mov') ||
						   attachment.name?.endsWith('.wmv') || attachment.name?.endsWith('.flv') ||
						   attachment.name?.endsWith('.mp3') || attachment.name?.endsWith('.wav') || 
						   attachment.name?.endsWith('.flac')) {
					media.push(message);
				} else if (attachment.type === 'link' || attachment.url) {
					links.push(message);
				}
			}
			
			// Also check for URLs in message content
			const urlRegex = /(https?:\/\/[^\s]+)/g;
			const urls = message.content.match(urlRegex);
			if (urls && urls.length > 0) {
				// Create a synthetic link message for each URL found
				urls.forEach(url => {
					links.push({
						...message,
						attachment: {
							id: `link_${Date.now()}_${Math.random()}`,
							type: 'link',
							url: url,
							name: url,
							permissions: {
								type: 'everyone'
							}
						}
					});
				});
			}
		});

		// Sort by timestamp (newest first)
		files.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
		media.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
		links.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

		return { files, media, links };
	}
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
			<div class="p-2 border-b border-gray-200 bg-gray-50">
				<div class="relative mb-2">
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
						class="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 text-left"
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
								class="w-full px-3 py-2 flex items-center space-x-3 hover:bg-gray-50 border-b border-gray-100 text-left transition-colors {currentConversation?.id === conversation.id ? 'bg-[#01c0a4]/5 border-r-2 border-r-[#01c0a4]' : ''}"
							>
								<div class="relative flex-shrink-0">
									{#if conversation.type === 'group'}
										<GroupAvatar 
											members={conversation.members || []} 
											groupName={conversation.name}
											size="sm" 
											showOnlineStatus={false}
										/>
									{:else}
										<ProfileAvatar 
											user={enhanceUserObject({ name: conversation.name, profilePhoto: conversation.avatar })} 
											size="sm" 
											showOnlineStatus={false}
										/>
									{/if}
								</div>
								
								<div class="flex-1 min-w-0">
									<div class="flex items-center justify-between">
										<h3 class="font-medium truncate flex items-center space-x-1 text-sm {conversation.isRead === false ? 'text-gray-900' : 'text-gray-500'}">
											<span>{conversation.name}</span>
											<Users class="w-3 h-3 text-gray-500" />
										</h3>
										<span class="text-xs text-gray-500">{formatTime(conversation.lastMessageTime)}</span>
									</div>
									<p class="text-xs {conversation.isRead === false ? 'text-gray-600' : 'text-gray-400'}">
										{getActiveMemberCount(conversation)} active • {conversation.members.length} total
									</p>
								</div>
								
								{#if conversation.unreadCount > 0}
									<div class="bg-[#01c0a4] text-white text-xs rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0">
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
						class="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 text-left"
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
								onclick={(e) => {
									// Check if the click was on the avatar
									const target = e.target as HTMLElement;
									const avatarButton = target.closest('[data-avatar-click]');
									
									if (avatarButton) {
										e.stopPropagation();
										// Try to find the actual user data first
										const actualUser = availableUsers.find(u => u.name === conversation.name);
										if (actualUser) {
											showUserProfile(actualUser);
										} else {
											// Fallback to enhanced user object
											showUserProfile(enhanceUserObject({ name: conversation.name, profilePhoto: conversation.avatar }));
										}
									} else {
										selectConversation(conversation);
									}
								}}
								class="w-full px-3 py-2 flex items-center space-x-3 hover:bg-gray-50 border-b border-gray-100 text-left transition-colors {currentConversation?.id === conversation.id ? 'bg-[#01c0a4]/5 border-r-2 border-r-[#01c0a4]' : ''}"
							>
								<div class="relative flex-shrink-0">
									{#if conversation.type === 'group'}
										<GroupAvatar 
											members={conversation.members || []} 
											groupName={conversation.name}
											size="sm" 
											showOnlineStatus={false}
										/>
									{:else}
										<div 
											data-avatar-click="true"
											class="hover:scale-110 transition-transform cursor-pointer"
										>
											<ProfileAvatar 
												user={enhanceUserObject({ name: conversation.name, profilePhoto: conversation.avatar })} 
												size="sm" 
												showOnlineStatus={conversation.isOnline}
												onlineStatus={conversation.isOnline ? 'online' : 'offline'}
											/>
										</div>
									{/if}
								</div>
								
								<div class="flex-1 min-w-0">
									<div class="flex items-center justify-between">
										<h3 class="font-medium truncate text-sm {conversation.isRead === false ? 'text-gray-900' : 'text-gray-500'}">
											{conversation.name}
										</h3>
										<span class="text-xs text-gray-500">{formatTime(conversation.lastMessageTime)}</span>
									</div>
									<p class="text-xs {conversation.isRead === false ? 'text-gray-600' : 'text-gray-400'}">{conversation.department} • {conversation.role}</p>
								</div>
								
								{#if conversation.unreadCount > 0}
									<div class="bg-[#01c0a4] text-white text-xs rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0">
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
						<div class="px-3 py-2">
							<div class="flex items-center space-x-2">
								<UserPlus class="w-4 h-4 text-gray-500" />
								<span class="font-medium text-gray-700 text-sm">Start New Conversation</span>
							</div>
						</div>
						
						{#each filteredUsers as user (user.id)}
							<button
								onclick={() => startNewConversation(user)}
								class="w-full px-3 py-2 flex items-center space-x-3 hover:bg-gray-50 border-b border-gray-100 text-left transition-colors"
							>
								<div class="relative flex-shrink-0">
									<ProfileAvatar 
										user={{ name: user.name, profilePhoto: user.avatar }} 
										size="sm" 
										showOnlineStatus={false}
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
				<div class="px-4 py-3 border-b border-gray-300 flex items-center justify-between bg-white">
					<div class="flex items-center space-x-3">
						{#if currentConversation.type === 'group'}
							<GroupAvatar 
								members={currentConversation.members || []} 
								groupName={currentConversation.name}
								size="sm" 
								showOnlineStatus={false}
							/>
						{:else}
							<button
								type="button"
								onclick={(event) => {
									event.stopPropagation();
									if (currentConversation) {
										const otherUser = currentConversation.members.find(m => m.id !== '1');
										if (otherUser) {
											const userData = { 
												id: otherUser.id, 
												name: otherUser.name,
												firstName: otherUser.firstName,
												lastName: otherUser.lastName,
											profilePhoto: otherUser.avatar,
											department: otherUser.department,
											role: otherUser.role
										};
										showUserProfile(enhanceUserObject(userData));
									}
								}
								}}
								class="hover:scale-105 transition-transform duration-200 rounded-full"
							>
								{#if currentConversation?.type !== 'direct'}
									<GroupAvatar members={currentConversation?.members || []} groupName={currentConversation?.name || ''} size="sm" />
								{:else}
									<ProfileAvatar user={{ name: currentConversation?.name || 'User' }} size="sm" showOnlineStatus={false} />
								{/if}
							</button>
						{/if}
						<div 
							class="{currentConversation.type === 'direct' ? 'cursor-pointer hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors' : ''}"
							onclick={() => {
								if (currentConversation && currentConversation.type === 'direct') {
									const otherUser = currentConversation.members.find(m => m.id !== '1');
									if (otherUser) {
										const userData = { 
											id: otherUser.id, 
											name: otherUser.name,
											firstName: otherUser.firstName,
											lastName: otherUser.lastName,
											profilePhoto: otherUser.avatar,
											department: otherUser.department,
											role: otherUser.role
										};
										showUserProfile(enhanceUserObject(userData));
									}
								}
							}}
						>
							<h2 class="font-semibold text-gray-900 text-sm">{currentConversation.name}</h2>
							{#if currentConversation.type === 'group'}
								<p class="text-xs text-gray-500">{currentConversation.members.length} members</p>
							{:else}
								<p class="text-xs text-gray-500">
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

				<!-- Pinned Messages Panel -->
				{#if currentConversation.settings?.allowPinning && currentConversation.pinnedMessages && currentConversation.pinnedMessages.length > 0}
					<div class="px-4 py-2 bg-blue-50 border-b border-blue-200 flex items-center justify-between">
						<div class="flex items-center space-x-2 flex-1">
							<Pin class="w-4 h-4 text-blue-600" />
							<div class="flex-1 text-sm text-blue-800 truncate">
								<span class="font-medium">Pinned:</span>
								{currentConversation.pinnedMessages[currentConversation.pinnedMessages.length - 1].content}
							</div>
						</div>
						<button
							onclick={() => showPinnedPanel = true}
							class="text-blue-600 hover:text-blue-800 text-sm font-medium"
						>
							View All ({currentConversation.pinnedMessages.length})
						</button>
					</div>
				{/if}

				<!-- Search in Chat -->
				{#if showSearchInChat}
					<div class="px-4 py-2 bg-gray-100 border-b border-gray-300">
						<div class="relative">
							<Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
							<input
								bind:value={searchInChatQuery}
								type="text"
								placeholder="Search in this conversation..."
								class="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent text-sm"
							/>
						</div>
					</div>
				{/if}

				<!-- Messages -->
				<div class="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
					{#each groupedMessages() as timeGroup (timeGroup.uniqueKey)}
						<!-- Time Divider -->
						<div class="flex items-center space-x-4 my-6">
							<div class="flex-1 h-px bg-gray-300"></div>
							<div class="text-xs text-gray-500 font-medium px-3 py-1 bg-white rounded-full border border-gray-200 shadow-sm">
								{timeGroup.timeLabel}
							</div>
							<div class="flex-1 h-px bg-gray-300"></div>
						</div>
						
						<!-- Messages in this time group -->
						<div class="space-y-1">
							{#each timeGroup.messages as message (message.id)}
								<div class="flex {message.senderId === '1' ? 'justify-end' : 'justify-start'} group">
									<div 
										class="flex items-start space-x-2 max-w-xs lg:max-w-md cursor-pointer"
										title={formatExactTime(message.timestamp)}
									>
										{#if message.senderId !== '1'}
											{@const sender = currentConversation.members.find(m => m.id === message.senderId)}
											<div class="mt-1">
												<button 
													type="button"
													onclick={(event) => {
														event.stopPropagation();
														// Get full user details using the same logic as header
														const fullUserData = getUserDetails(message.senderId);
														if (fullUserData) {
															showUserProfile(fullUserData);
														}
													}}
													class="hover:scale-105 transition-transform duration-200"
												>
													<ProfileAvatar 
														user={getUserForAvatar({ 
															id: message.senderId,
															name: message.senderName, 
															firstName: sender?.firstName,
															lastName: sender?.lastName,
															profilePhoto: sender?.avatar 
														})} 
														size="sm" 
														showOnlineStatus={false}
													/>
												</button>
											</div>
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
													<div class="text-gray-700 {message.replyTo.isDeleted ? 'italic text-gray-500' : ''}">{message.replyTo.content}</div>
												</div>
											{/if}
											
											<div class="relative">
												<div class="px-4 py-2 rounded-2xl {message.isDeleted ? 'bg-gray-50 text-gray-500 border border-gray-200' : message.senderId === '1' ? 'bg-gradient-to-r from-[#01c0a4] to-[#00a085] text-white' : 'bg-gray-100 text-gray-900'}">
													<p class="whitespace-pre-wrap {message.isDeleted ? 'italic' : ''}">{message.content}</p>
												</div>
												
												<!-- Message actions - hide for deleted messages -->
												{#if !message.isDeleted}
											<div class="absolute top-0 {message.senderId === '1' ? 'right-full mr-2' : 'left-full ml-2'} opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
											<button
												onclick={() => startReply(message)}
												class="p-1 bg-white border border-gray-200 rounded-full shadow-sm hover:bg-gray-50 transition-colors"
												aria-label="Reply to message"
												title="Reply"
											>
												<Reply class="w-3 h-3 text-gray-600" />
											</button>
											{#if message.forwardingEnabled && currentConversation.settings?.allowForwarding}
												<button
													onclick={() => startForwardMessage(message)}
													class="p-1 bg-white border border-gray-200 rounded-full shadow-sm hover:bg-gray-50 transition-colors"
													aria-label="Forward message"
													title="Forward"
												>
													<Share2 class="w-3 h-3 text-gray-600" />
												</button>
											{/if}
											{#if currentConversation.settings?.allowPinning && message.pinningEnabled}
												<button
													onclick={() => togglePinMessage(message.id)}
													class="p-1 bg-white border border-gray-200 rounded-full shadow-sm hover:bg-gray-50 transition-colors"
													aria-label={message.isPinned ? "Unpin message" : "Pin message"}
													title={message.isPinned ? "Unpin" : "Pin"}
												>
													{#if message.isPinned}
														<PinOff class="w-3 h-3 text-blue-600" />
													{:else}
														<Pin class="w-3 h-3 text-gray-600" />
													{/if}
												</button>
											{/if}
											{#if message.senderId === '1'}
												<button
													onclick={() => startEditMessage(message)}
													class="p-1 bg-white border border-gray-200 rounded-full shadow-sm hover:bg-gray-50 transition-colors"
													aria-label="Edit message"
													title="Edit"
												>
													<svg class="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
													</svg>
												</button>
												<button
													onclick={() => confirmUnsendMessage(message.id)}
													class="p-1 bg-white border border-gray-200 rounded-full shadow-sm hover:bg-red-50 hover:border-red-200 transition-colors"
													aria-label="Unsend message"
													title="Unsend"
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
									{/if}
									</div>
									
													
													<!-- Reactions -->
													{#if message.reactions && message.reactions.length > 0}
														<div class="flex items-center space-x-1 mt-1">
															{#each message.reactions as reaction}
																<button
																	onclick={() => addReaction(message.id, reaction.emoji)}
																	class="flex items-center space-x-1 px-2 py-1 bg-gray-100 rounded-full text-xs hover:bg-gray-200 transition-colors {reaction.users.includes('1') ? 'bg-[#01c0a4]/10 text-[#01c0a4]' : ''}"
																	aria-label={`Toggle ${reaction.emoji} reaction`}
																	title={`${reaction.emoji} ${reaction.count}`}
																>
																	<span>{reaction.emoji}</span>
																	<span>{reaction.count}</span>
																</button>
															{/each}
															<!-- Show all reactions button -->
															<button
																onclick={() => openReactionModal(message)}
																class="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 hover:bg-gray-100 rounded-full transition-colors"
																title="See all reactions"
															>
																See all
															</button>
														</div>
														<!-- Reaction timestamp -->
														<div class="text-xs text-gray-400 mt-1">
															{formatTime(message.timestamp)}
														</div>
													{/if}

													<!-- Seen indicators for sent messages -->
													{#if message.senderId === '1' && message.seenBy && message.seenBy.length > 0}
														<div class="flex items-center space-x-1 mt-1">
															<span class="text-xs text-gray-500">Seen by</span>
															<div class="flex -space-x-1">
																{#each message.seenBy.slice(0, 3) as seenUser}
																	<button
																		type="button"
																		onclick={(event) => {
																			event.stopPropagation();
																			const fullUserData = getUserDetails(seenUser.userId);
																			if (fullUserData) {
																				showUserProfile(fullUserData);
																			}
																		}}
																		class="w-6 h-6 border border-white rounded-full overflow-hidden cursor-pointer hover:scale-110 transition-transform" 
																		title={`Seen by ${seenUser.userName} at ${formatTime(seenUser.seenAt)}`}
																	>
																		<ProfileAvatar 
																			user={getUserForAvatar({ 
																				id: seenUser.userId,
																				name: seenUser.userName, 
																				profilePhoto: seenUser.userAvatar 
																			})} 
																			size="sm" 
																			showOnlineStatus={false}
																		/>
																	</button>
																{/each}
																{#if message.seenBy.length > 3}
																	<div class="w-6 h-6 rounded-full bg-gray-200 border border-white flex items-center justify-center text-xs text-gray-600 cursor-pointer hover:scale-110 transition-transform"
																		title={`And ${message.seenBy.length - 3} more`}
																	>
																		+{message.seenBy.length - 3}
																	</div>
																{/if}
															</div>
														</div>
													{/if}
												</div>
												
												{#if message.senderId === '1'}
													<ProfileAvatar user={{ name: 'Current User' }} size="sm" showOnlineStatus={false} />
												{/if}
											</div>
										</div>
									{/each}
								</div>
							{/each}					<!-- Typing Indicator -->
					{#if othersTyping && currentConversation}
						{#each currentConversation.members.filter(m => m.id !== '1') as typingMember}
							<div class="flex justify-start">
								<div class="flex items-center space-x-2 max-w-xs">
									<button 
										type="button"
										onclick={(event) => {
											event.stopPropagation();
											const fullUserData = getUserDetails(typingMember.id);
											if (fullUserData) {
												showUserProfile(fullUserData);
											}
										}}
										class="hover:scale-105 transition-transform duration-200"
									>
										<ProfileAvatar 
											user={getUserForAvatar(typingMember)} 
											size="sm" 
											showOnlineStatus={false}
										/>
									</button>
									<div class="bg-gray-200 px-3 py-2 rounded-2xl">
										<div class="flex space-x-1">
											<div class="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
											<div class="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
											<div class="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
										</div>
									</div>
								</div>
							</div>
						{/each}
					{/if}
				</div>

				<!-- Reply Preview -->
				{#if replyingTo}
					<div class="px-4 py-2 bg-gray-100 border-t border-gray-300 flex items-center justify-between">
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
					<div class="px-4 py-2 bg-blue-50 border-t border-blue-200 flex items-center justify-between">
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
				<div class="px-4 py-3 border-t border-gray-300 bg-white">
					<!-- File Preview Section -->
					{#if selectedFiles.length > 0}
						<div class="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
							<div class="flex items-center justify-between mb-2">
								<span class="text-sm font-medium text-gray-700">Files to send ({selectedFiles.length})</span>
								<button 
									onclick={() => selectedFiles = []}
									class="text-gray-400 hover:text-gray-600"
									aria-label="Clear all files"
								>
									<X class="w-4 h-4" />
								</button>
							</div>
							<div class="space-y-2 max-h-32 overflow-y-auto">
								{#each selectedFiles as file, index}
									<div class="flex items-center justify-between p-2 bg-white rounded border">
										<div class="flex items-center space-x-2 flex-1 min-w-0">
											<div class="flex-shrink-0">
												{#if file.type.startsWith('image/')}
													<Image class="w-4 h-4 text-blue-500" />
												{:else if file.type.startsWith('video/')}
													<Camera class="w-4 h-4 text-purple-500" />
												{:else}
													<FileText class="w-4 h-4 text-gray-500" />
												{/if}
											</div>
											<div class="flex-1 min-w-0">
												<p class="text-sm font-medium text-gray-900 truncate">{file.name}</p>
												<p class="text-xs text-gray-500">{formatFileSize(file.size)}</p>
											</div>
										</div>
										<button 
											onclick={() => removeFile(index)}
											class="p-1 text-gray-400 hover:text-red-500 transition-colors"
											aria-label="Remove file"
										>
											<X class="w-3 h-3" />
										</button>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<div class="flex items-end space-x-2">
						<div class="flex-1 relative">
							<!-- Drag and Drop Area -->
							<div 
								class="relative"
								ondrop={handleFileDrop}
								ondragover={handleDragOver}
							>
								<textarea
									bind:value={messageInput}
									oninput={handleTyping}
									onkeypress={handleKeyPress}
									placeholder={editingMessage ? "Edit your message..." : selectedFiles.length > 0 ? "Add a message with your files..." : "Type a message..."}
									rows="1"
									class="w-full px-1 py-2 pr-16 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent resize-none text-sm min-h-[40px]"
								></textarea>
								
								<div class="absolute right-2 bottom-2 flex items-center space-x-1">
									{#if currentConversation.settings?.allowAttachments !== false}
										<button 
											onclick={handleFileSelection}
											class="p-1 text-gray-500 hover:text-[#01c0a4] transition-colors" 
											aria-label="Attach file"
										>
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

								<!-- Hidden file input -->
								<input 
									bind:this={fileInputRef}
									type="file" 
									multiple 
									onchange={handleFileChange}
									class="hidden" 
									accept="*/*"
								/>

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
							onclick={editingMessage ? saveEditedMessage : selectedFiles.length > 0 ? openFilePermissionModal : sendMessage}
							disabled={!messageInput.trim() && selectedFiles.length === 0}
							class="p-4 bg-gradient-to-r from-[#01c0a4] to-[#00a085] text-white rounded-xl hover:shadow-lg hover:shadow-[#01c0a4]/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
							aria-label={editingMessage ? "Save edited message" : selectedFiles.length > 0 ? "Set file permissions and send" : "Send message"}
						>
							{#if editingMessage}
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
								</svg>
							{:else}
								<Send class="w-4 h-4" />
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
							<span>Group Info</span>
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

				<!-- Tabs -->
				<div class="border-b border-gray-200">
					<nav class="flex">
						<button
							onclick={() => currentMembersTab = 'members'}
							class="flex-1 py-2 px-3 text-sm font-medium text-center border-b-2 transition-colors {currentMembersTab === 'members' ? 'border-[#01c0a4] text-[#01c0a4]' : 'border-transparent text-gray-500 hover:text-gray-700'}"
						>
							Members
						</button>
						<button
							onclick={() => currentMembersTab = 'files'}
							class="flex-1 py-2 px-3 text-sm font-medium text-center border-b-2 transition-colors {currentMembersTab === 'files' ? 'border-[#01c0a4] text-[#01c0a4]' : 'border-transparent text-gray-500 hover:text-gray-700'}"
						>
							Files
						</button>
						<button
							onclick={() => currentMembersTab = 'media'}
							class="flex-1 py-2 px-3 text-sm font-medium text-center border-b-2 transition-colors {currentMembersTab === 'media' ? 'border-[#01c0a4] text-[#01c0a4]' : 'border-transparent text-gray-500 hover:text-gray-700'}"
						>
							Media
						</button>
						<button
							onclick={() => currentMembersTab = 'links'}
							class="flex-1 py-2 px-3 text-sm font-medium text-center border-b-2 transition-colors {currentMembersTab === 'links' ? 'border-[#01c0a4] text-[#01c0a4]' : 'border-transparent text-gray-500 hover:text-gray-700'}"
						>
							Links
						</button>
					</nav>
				</div>

				<!-- Tab Content -->
				<div class="flex-1 overflow-y-auto">
					{#if currentMembersTab === 'members'}
						<!-- Members List -->
						{#each currentConversation.members as member (member.id)}
							<div class="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
								<div class="flex items-center space-x-3">
									<button 
										type="button"
										onclick={(event) => {
											event.stopPropagation();
											const fullUserData = getUserDetails(member.id);
											if (fullUserData) {
												showUserProfile(fullUserData);
											}
										}}
										class="relative hover:scale-105 transition-transform duration-200"
									>
										<ProfileAvatar 
											user={getUserForAvatar(member)} 
											size="md" 
											showOnlineStatus={member.isOnline}
											onlineStatus={member.isOnline ? 'online' : 'offline'}
										/>
									</button>
									
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
					{:else if currentMembersTab === 'files'}
						<!-- Files Tab -->
						{#if currentConversation}
							{@const mediaHistory = getMediaHistory(currentConversation)}
							<div class="p-4 space-y-3">
								{#if mediaHistory.files.length > 0}
								{#each mediaHistory.files as fileMessage}
									<div class="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg">
										<FileText class="w-8 h-8 text-blue-500" />
										<div class="flex-1 min-w-0">
											<p class="text-sm font-medium text-gray-900 truncate">
												{fileMessage.attachment?.name || 'Unknown file'}
											</p>
											<p class="text-xs text-gray-500">
												{fileMessage.senderName} • {formatTime(fileMessage.timestamp)}
											</p>
										</div>
										<button class="p-1 text-gray-500 hover:text-[#01c0a4] transition-colors">
											<Download class="w-4 h-4" />
										</button>
									</div>
								{/each}
							{:else}
								<div class="text-center py-8">
									<FileText class="w-8 h-8 text-gray-300 mx-auto mb-2" />
									<p class="text-sm text-gray-500">No files shared yet</p>
								</div>
							{/if}
							</div>
						{/if}
					{:else if currentMembersTab === 'media'}
						<!-- Media Tab -->
						{#if currentConversation}
							{@const mediaHistory = getMediaHistory(currentConversation)}
							<div class="p-4 space-y-3">
								{#if mediaHistory.media.length > 0}
								{#each mediaHistory.media as mediaMessage}
									<div class="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg">
										<Image class="w-8 h-8 text-green-500" />
										<div class="flex-1 min-w-0">
											<p class="text-sm font-medium text-gray-900 truncate">
												{mediaMessage.attachment?.name || 'Media file'}
											</p>
											<p class="text-xs text-gray-500">
												{mediaMessage.senderName} • {formatTime(mediaMessage.timestamp)}
											</p>
										</div>
										<button class="p-1 text-gray-500 hover:text-[#01c0a4] transition-colors">
											<Download class="w-4 h-4" />
										</button>
									</div>
								{/each}
							{:else}
								<div class="text-center py-8">
									<Image class="w-8 h-8 text-gray-300 mx-auto mb-2" />
									<p class="text-sm text-gray-500">No media shared yet</p>
								</div>
							{/if}
							</div>
						{/if}
					{:else if currentMembersTab === 'links'}
						<!-- Links Tab -->
						{#if currentConversation}
							{@const mediaHistory = getMediaHistory(currentConversation)}
							<div class="p-4 space-y-3">
								{#if mediaHistory.links.length > 0}
								{#each mediaHistory.links as linkMessage}
									<div class="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg">
										<Link class="w-8 h-8 text-purple-500" />
										<div class="flex-1 min-w-0">
											<p class="text-sm font-medium text-gray-900 truncate">
												{linkMessage.attachment?.name || linkMessage.attachment?.url || 'Link'}
											</p>
											<p class="text-xs text-gray-500">
												{linkMessage.senderName} • {formatTime(linkMessage.timestamp)}
											</p>
										</div>
										<button class="p-1 text-gray-500 hover:text-[#01c0a4] transition-colors">
											<Eye class="w-4 h-4" />
										</button>
									</div>
								{/each}
							{:else}
								<div class="text-center py-8">
									<Link class="w-8 h-8 text-gray-300 mx-auto mb-2" />
									<p class="text-sm text-gray-500">No links shared yet</p>
								</div>
							{/if}
							</div>
						{/if}
					{/if}
				</div>
			</aside>
		{/if}
	</div>
</div>

<!-- Group Settings Modal -->
{#if showGroupSettings}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50" onclick={closeGroupSettings}>
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
							{#if currentConversation?.type === 'group'}
								<GroupAvatar 
									members={currentConversation.members || []} 
									groupName={currentConversation.name}
									size="xl" 
									showOnlineStatus={false}
								/>
							{:else}
								<GroupAvatar members={currentConversation?.members || []} groupName={currentConversation?.name || ''} size="xl" />
							{/if}
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
								<p class="font-medium text-gray-900">Allow Emojis and Reactions</p>
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

					<!-- Allow Forwarding -->
					<div class="flex items-center justify-between">
						<div class="flex items-center space-x-3">
							<Share2 class="w-5 h-5 text-gray-500" />
							<div>
								<p class="font-medium text-gray-900">Allow Message Forwarding</p>
								<p class="text-sm text-gray-500">Enable forwarding messages to other chats</p>
							</div>
						</div>
						<button
							onclick={toggleForwarding}
							class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {currentConversation?.settings?.allowForwarding ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
							aria-label="Toggle forwarding"
						>
							<span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {currentConversation?.settings?.allowForwarding ? 'translate-x-6' : 'translate-x-1'}"></span>
						</button>
					</div>

					<!-- Allow Pinning -->
					<div class="flex items-center justify-between">
						<div class="flex items-center space-x-3">
							<Pin class="w-5 h-5 text-gray-500" />
							<div>
								<p class="font-medium text-gray-900">Allow Pinned Messages</p>
								<p class="text-sm text-gray-500">Enable pinning important messages</p>
							</div>
						</div>
						<button
							onclick={togglePinning}
							class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {currentConversation?.settings?.allowPinning ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
							aria-label="Toggle pinning"
						>
							<span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {currentConversation?.settings?.allowPinning ? 'translate-x-6' : 'translate-x-1'}"></span>
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
	<div class="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50" onclick={() => showCreateGroup = false}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] mx-4 flex flex-col" onclick={(e) => e.stopPropagation()}>
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
			<div class="flex-1 flex overflow-hidden">
				<!-- Left Panel - Form and User Search -->
				<div class="flex-1 p-6 space-y-6 overflow-y-auto">
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

					<!-- Search Users -->
					<div>
						<label for="userSearch" class="block text-sm font-medium text-gray-700 mb-2">
							Search People
						</label>
						<div class="relative">
							<Search class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
							<input
								id="userSearch"
								bind:value={userSearchQuery}
								type="text"
								placeholder="Search by name, department, or role..."
								class="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent"
							/>
						</div>
					</div>

					<!-- Available Users -->
					<div>
						<p class="text-sm font-medium text-gray-700 mb-3">Add Members</p>
						<div class="max-h-80 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
							{#each filteredUsersForGroup as user}
								<div class="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors {selectedUsers.some(u => u.id === user.id) ? 'bg-[#01c0a4]/5 border border-[#01c0a4]/20' : ''}">
									<button 
										type="button"
										onclick={(event) => {
											event.stopPropagation();
											const fullUserData = getUserDetails(user.id);
											if (fullUserData) {
												showUserProfile(fullUserData);
											}
										}}
										class="hover:scale-105 transition-transform duration-200"
									>
										<ProfileAvatar user={user} size="md" showOnlineStatus={false} />
									</button>
									<button
										onclick={() => toggleUser(user)}
										class="flex-1 text-left"
										aria-label={selectedUsers.some(u => u.id === user.id) ? `Remove ${user.name} from selected users` : `Add ${user.name} to selected users`}
									>
										<p class="font-medium text-gray-900">{user.name}</p>
										<p class="text-sm text-gray-500">{user.department} • {user.role}</p>
									</button>
									{#if selectedUsers.some(u => u.id === user.id)}
										<div class="w-5 h-5 bg-[#01c0a4] rounded-full flex items-center justify-center">
											<span class="text-white text-xs">✓</span>
										</div>
									{:else}
										<div class="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				</div>

				<!-- Right Panel - Selected Users -->
				<div class="w-80 border-l border-gray-200 flex flex-col">
					<div class="p-6 border-b border-gray-200">
						<h3 class="font-medium text-gray-900 flex items-center space-x-2">
							<Users class="w-4 h-4" />
							<span>Selected Members ({selectedUsers.length})</span>
						</h3>
					</div>
					
					<div class="flex-1 overflow-y-auto p-4">
						{#if selectedUsers.length > 0}
							<div class="space-y-3">
								{#each selectedUsers as user}
									<div class="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
										<button 
											type="button"
											onclick={(event) => {
												event.stopPropagation();
												const fullUserData = getUserDetails(user.id);
												if (fullUserData) {
													showUserProfile(fullUserData);
												}
											}}
											class="hover:scale-105 transition-transform duration-200"
										>
											<ProfileAvatar user={user} size="sm" showOnlineStatus={false} />
										</button>
										<div class="flex-1 min-w-0">
											<p class="font-medium text-gray-900 text-sm truncate">{user.name}</p>
											<p class="text-xs text-gray-500 truncate">{user.department}</p>
											<p class="text-xs text-gray-400 truncate">{user.role}</p>
										</div>
										<button
											onclick={() => toggleUser(user)}
											class="p-1 text-gray-400 hover:text-red-500 transition-colors"
											aria-label={`Remove ${user.name} from group`}
										>
											<X class="w-4 h-4" />
										</button>
									</div>
								{/each}
							</div>
						{:else}
							<div class="text-center py-8">
								<Users class="w-8 h-8 text-gray-300 mx-auto mb-2" />
								<p class="text-sm text-gray-500">No members selected</p>
								<p class="text-xs text-gray-400 mt-1">Search and select people to add to your group</p>
							</div>
						{/if}
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
					Create Group ({selectedUsers.length} members)
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Confirmation Modal -->
{#if confirmationData}
	<ConfirmationModal
		show={showConfirmation}
		title={confirmationData.title}
		message={confirmationData.message}
		confirmText={confirmationData.confirmText}
		onConfirm={confirmationData.action}
		onCancel={() => { showConfirmation = false; confirmationData = null; }}
	/>
{/if}

<!-- Forward Message Modal -->
{#if showForwardModal && messageToForward}
	<div 
		class="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={() => showForwardModal = false}
		onkeydown={(e) => e.key === 'Escape' && (showForwardModal = false)}
	>
		<div 
			class="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[70vh] flex flex-col"
			role="dialog"
			tabindex="0"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<!-- Header -->
			<div class="p-4 border-b border-gray-200">
				<h2 class="text-lg font-semibold text-gray-900 flex items-center space-x-2">
					<Share2 class="w-5 h-5 text-blue-600" />
					<span>Forward Message</span>
				</h2>
			</div>

			<!-- Message Preview -->
			<div class="p-4 border-b border-gray-200 bg-gray-50">
				<div class="text-sm text-gray-600 mb-2">Message to forward:</div>
				<div class="bg-white rounded-lg p-3 border">
					<div class="flex items-center space-x-2 mb-2">
						<span class="font-medium text-gray-900 text-sm">{messageToForward.senderName}</span>
						<span class="text-xs text-gray-500">{formatTime(messageToForward.timestamp)}</span>
					</div>
					<p class="text-gray-900 text-sm">{messageToForward.content}</p>
				</div>
			</div>

			<!-- Conversation Selection -->
			<div class="flex-1 overflow-y-auto p-4 space-y-3">
				<div class="mb-4">
					<label for="conversationSearch" class="block text-sm font-medium text-gray-700 mb-2">Select conversations:</label>
					<div class="relative">
						<Search class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
						<input
							id="conversationSearch"
							type="text"
							placeholder="Search conversations..."
							bind:value={forwardSearchQuery}
							class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
						>
					</div>
				</div>

				<div class="space-y-2">
					{#each filteredForwardConversations as conversation (conversation.id)}
						{#if conversation.id !== currentConversation?.id}
							<label class="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
								<input 
									type="checkbox" 
									bind:group={selectedForwardConversations}
									value={conversation.id}
									class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
								>
								<div class="flex items-center space-x-3 flex-1">
									{#if conversation.type === 'group'}
										<div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
											<Users class="w-4 h-4 text-blue-600" />
										</div>
									{:else}
										<ProfileAvatar 
											user={{ name: conversation.name, profilePhoto: '/placeholder.svg' }} 
											size="sm" 
										/>
									{/if}
									<div class="flex-1">
										<div class="font-medium text-gray-900 text-sm">{conversation.name}</div>
										{#if conversation.type === 'group'}
											<div class="text-xs text-gray-500">{conversation.members.length} members</div>
										{:else}
											<div class="text-xs text-gray-500">1:1 Chat</div>
										{/if}
									</div>
								</div>
								{#if !conversation.forwardingEnabled}
									<div class="text-xs text-red-500 bg-red-50 px-2 py-1 rounded">
										Forwarding disabled
									</div>
								{/if}
							</label>
						{/if}
					{/each}
				</div>
			</div>

			<!-- Footer -->
			<div class="p-4 border-t border-gray-200 flex justify-between items-center">
				<div class="text-sm text-gray-500">
					{selectedForwardConversations.length} conversation(s) selected
				</div>
				<div class="flex space-x-3">
					<button
						onclick={() => showForwardModal = false}
						class="secondary-button"
					>
						Cancel
					</button>
					<button
						onclick={forwardMessage}
						disabled={selectedForwardConversations.length === 0}
						class="primary-button disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Forward Message
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Pinned Messages Modal -->
{#if showPinnedPanel && currentConversation && currentConversation.pinnedMessages}
	<div 
		class="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={() => showPinnedPanel = false}
		onkeydown={(e) => e.key === 'Escape' && (showPinnedPanel = false)}
	>
		<div 
			class="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[70vh] flex flex-col"
			role="dialog"
			tabindex="0"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<!-- Header -->
			<div class="p-4 border-b border-gray-200 flex items-center justify-between">
				<div class="flex items-center space-x-2">
					<Pin class="w-5 h-5 text-blue-600" />
					<h2 class="text-lg font-semibold text-gray-900">Pinned Messages</h2>
					<span class="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
						{currentConversation.pinnedMessages.length}
					</span>
				</div>
				<button
					onclick={() => showPinnedPanel = false}
					class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
					aria-label="Close pinned messages"
				>
					<X class="w-5 h-5 text-gray-500" />
				</button>
			</div>

			<!-- Pinned Messages List -->
			<div class="flex-1 overflow-y-auto p-4 space-y-4">
				{#if currentConversation.pinnedMessages.length === 0}
					<div class="text-center py-8">
						<Pin class="w-12 h-12 text-gray-300 mx-auto mb-3" />
						<p class="text-gray-500">No messages have been pinned yet</p>
					</div>
				{:else}
					{#each currentConversation.pinnedMessages as pinnedMessage (pinnedMessage.id)}
						{@const sender = currentConversation.members.find(m => m.id === pinnedMessage.senderId)}
						<div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
							<div class="flex items-start justify-between mb-2">
								<div class="flex items-center space-x-2">
									<button 
										type="button"
										onclick={(event) => {
											event.stopPropagation();
											const fullUserData = getUserDetails(pinnedMessage.senderId);
											if (fullUserData) {
												showUserProfile(fullUserData);
											}
										}}
										class="hover:scale-105 transition-transform duration-200"
									>
										<ProfileAvatar 
											user={getUserForAvatar({ name: pinnedMessage.senderName, profilePhoto: sender?.avatar })} 
											size="sm" 
										/>
									</button>
									<div>
										<span class="font-medium text-gray-900 text-sm">{pinnedMessage.senderName}</span>
										<span class="text-xs text-gray-500 ml-2">{formatTime(pinnedMessage.timestamp)}</span>
									</div>
								</div>
								<div class="flex space-x-1">
									<button
										onclick={() => jumpToMessage(pinnedMessage.id)}
										class="p-1 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-800 transition-colors"
										title="Jump to message"
									>
										<ArrowUp class="w-4 h-4" />
									</button>
									<button
										onclick={() => unpinMessage(pinnedMessage.id)}
										class="p-1 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-800 transition-colors"
										title="Unpin message"
									>
										<X class="w-4 h-4" />
									</button>
								</div>
							</div>
							<div class="text-gray-800 text-sm whitespace-pre-wrap">{pinnedMessage.content}</div>
							{#if pinnedMessage.pinnedBy}
								<div class="text-xs text-gray-500 mt-2 border-t border-gray-100 pt-2">
									Pinned by {pinnedMessage.pinnedBy} • {formatTime(pinnedMessage.pinnedAt || pinnedMessage.timestamp)}
								</div>
							{/if}
						</div>
					{/each}
				{/if}
			</div>
		</div>
	</div>
{/if}

<!-- Reaction Modal -->
{#if showReactionModal && reactionModalMessage}
	<div 
		class="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50" 
		onclick={closeReactionModal}
		onkeydown={(e) => e.key === 'Escape' && closeReactionModal()}
		role="dialog"
		aria-modal="true"
		aria-labelledby="reaction-modal-title"
		tabindex="-1"
	>
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div 
			class="bg-white rounded-lg shadow-xl w-96 max-h-96 overflow-hidden" 
			role="dialog"
			tabindex="0"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<div class="border-b border-gray-200 p-4">
				<div class="flex items-center justify-between">
					<h3 id="reaction-modal-title" class="text-lg font-semibold text-gray-900">Reactions</h3>
					<button
						onclick={closeReactionModal}
						class="text-gray-400 hover:text-gray-500"
					>
						<X class="w-5 h-5" />
					</button>
				</div>
				
				<!-- Reaction Tabs -->
				<div class="flex space-x-1 mt-3">
					<button
						onclick={() => reactionModalTab = 'all'}
						class="px-3 py-1 text-sm rounded-full {reactionModalTab === 'all' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}"
					>
						All {getReactionUsers(reactionModalMessage, 'all').length}
					</button>
					{#each reactionModalMessage.reactions || [] as reaction}
						<button
							onclick={() => reactionModalTab = reaction.emoji}
							class="px-3 py-1 text-sm rounded-full flex items-center space-x-1 {reactionModalTab === reaction.emoji ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}"
						>
							<span>{reaction.emoji}</span>
							<span>{reaction.count}</span>
						</button>
					{/each}
				</div>
			</div>
			
			<!-- Reaction Users List -->
			<div class="p-4 max-h-64 overflow-y-auto">
				{#each getReactionUsers(reactionModalMessage, reactionModalTab) as item}
					{#if item}
						<div class="flex items-center space-x-3 py-2">
							<button 
								type="button"
								onclick={(event) => {
									event.stopPropagation();
									const fullUserData = getUserDetails(item.user.id);
									if (fullUserData) {
										showUserProfile(fullUserData);
									}
								}}
								class="hover:scale-105 transition-transform duration-200"
							>
								<ProfileAvatar user={item.user} size="sm" showOnlineStatus={false} />
							</button>
							<div class="flex-1">
								<div class="text-sm font-medium text-gray-900">
									{#if item.user.firstName && item.user.lastName}
										{item.user.firstName} {item.user.lastName}
									{:else}
										{item.user.name || 'Unknown User'}
									{/if}
								</div>
								<div class="text-xs text-gray-500">
									@{item.user.username || item.user.name?.toLowerCase().replace(' ', '') || 'unknown'}
								</div>
							</div>
							<span class="text-lg">{item.emoji}</span>
						</div>
					{/if}
				{/each}
				
				{#if getReactionUsers(reactionModalMessage, reactionModalTab).length === 0}
					<div class="text-center py-8 text-gray-500">
						<div class="text-2xl mb-2">😊</div>
						<div class="text-sm">No reactions yet</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<!-- Forward Modal -->
{#if showForwardModal && forwardModalMessage}
	<div 
		class="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50" 
		onclick={closeForwardModal}
		onkeydown={(e) => e.key === 'Escape' && closeForwardModal()}
		role="dialog"
		aria-modal="true"
		aria-labelledby="forward-modal-title"
		tabindex="-1"
	>
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div 
			class="bg-white rounded-lg shadow-xl w-96 max-h-96 overflow-hidden" 
			role="dialog"
			tabindex="0"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<div class="border-b border-gray-200 p-4">
				<h3 id="forward-modal-title" class="text-lg font-semibold text-gray-900">Forward Message</h3>
			</div>
			
			<!-- Message Preview -->
			<div class="p-4 border-b border-gray-100">
				<div class="bg-gray-50 rounded-lg p-3">
					<div class="text-xs text-gray-500 mb-1">Message from {forwardModalMessage.senderName}</div>
					<div class="text-sm text-gray-900">{forwardModalMessage.content}</div>
				</div>
			</div>
			
			<!-- Conversation List -->
			<div class="p-4 max-h-48 overflow-y-auto">
				<div class="text-sm font-medium text-gray-700 mb-3">Select conversations:</div>
				{#each conversations as conversation}
					{#if conversation.id !== currentConversation?.id}
						<label class="flex items-center space-x-3 py-2 cursor-pointer hover:bg-gray-50 rounded">
							<input
								type="checkbox"
								checked={selectedForwardConversations.includes(conversation.id)}
								onchange={() => toggleForwardConversation(conversation.id)}
								class="rounded border-gray-300 text-[#01c0a4] focus:ring-[#01c0a4]"
							/>
							<div class="flex items-center space-x-2 flex-1">
								{#if conversation.type === 'group'}
									<GroupAvatar 
										members={conversation.members || []} 
										groupName={conversation.name}
										size="sm" 
										showOnlineStatus={false}
									/>
								{:else}
									<ProfileAvatar 
										user={{ name: conversation.name, profilePhoto: conversation.avatar }} 
										size="sm" 
										showOnlineStatus={false}
									/>
								{/if}
								<div class="flex-1">
									<div class="text-sm font-medium text-gray-900">{conversation.name}</div>
									<div class="text-xs text-gray-500">{conversation.members?.length || 0} members</div>
								</div>
							</div>
						</label>
					{/if}
				{/each}
			</div>
			
			<!-- Action Buttons -->
			<div class="border-t border-gray-200 p-4 flex justify-end space-x-2">
				<button
					onclick={closeForwardModal}
					class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
				>
					Cancel
				</button>
				<button
					onclick={confirmForward}
					disabled={selectedForwardConversations.length === 0}
					class="px-4 py-2 text-sm font-medium text-white bg-[#01c0a4] border border-transparent rounded-md hover:bg-[#00a085] disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Forward ({selectedForwardConversations.length})
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Undo Toast for Forward Actions -->
{#if showUndoToast}
	<div class="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
		<div class="bg-gray-800 text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3">
			<span class="text-sm">Message forwarded</span>
			<button
				onclick={undoLastForward}
				class="text-blue-300 hover:text-blue-200 text-sm font-medium underline"
			>
				Undo
			</button>
			<button
				onclick={() => showUndoToast = false}
				class="text-gray-300 hover:text-white"
				aria-label="Dismiss"
			>
				<X class="w-4 h-4" />
			</button>
		</div>
	</div>
{/if}

<!-- File Permission Modal -->
{#if showFilePermissionModal}
	<div 
		class="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50" 
		onkeydown={(e) => e.key === 'Escape' && closeFilePermissionModal()}
		role="dialog"
		aria-modal="true"
		aria-labelledby="file-permission-modal-title"
		tabindex="-1"
	>
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div 
			class="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden" 
			role="dialog"
			tabindex="0"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<div class="border-b border-gray-200 p-4">
				<h3 id="file-permission-modal-title" class="text-lg font-semibold text-gray-900 flex items-center space-x-2">
					<Paperclip class="w-5 h-5 text-blue-600" />
					<span>File Sharing Permissions</span>
				</h3>
			</div>
			
			<div class="p-6 overflow-y-auto max-h-[60vh]">
				<!-- Files Summary -->
				<div class="mb-6">
					<h4 class="text-sm font-medium text-gray-700 mb-3">Files to share ({selectedFiles.length})</h4>
					<div class="bg-gray-50 rounded-lg p-3 space-y-2 max-h-32 overflow-y-auto">
						{#each selectedFiles as file}
							<div class="flex items-center space-x-2 text-sm">
								{#if file.type.startsWith('image/')}
									<Image class="w-4 h-4 text-blue-500" />
								{:else if file.type.startsWith('video/')}
									<Camera class="w-4 h-4 text-purple-500" />
								{:else}
									<FileText class="w-4 h-4 text-gray-500" />
								{/if}
								<span class="font-medium text-gray-900">{file.name}</span>
								<span class="text-gray-500">({formatFileSize(file.size)})</span>
							</div>
						{/each}
					</div>
				</div>

				<!-- Permission Settings -->
				<div class="space-y-4">
					<h4 class="text-sm font-medium text-gray-700">Who can access these files?</h4>
					
					<div class="space-y-3">
						<label class="flex items-center space-x-3 cursor-pointer">
							<input 
								type="radio" 
								value="everyone" 
								bind:group={filePermissionSettings.type}
								class="rounded border-gray-300 text-[#01c0a4] focus:ring-[#01c0a4]" 
							/>
							<div>
								<div class="font-medium text-gray-900">Everyone in this conversation</div>
								<div class="text-sm text-gray-500">All members can access these files</div>
							</div>
						</label>

						<label class="flex items-center space-x-3 cursor-pointer">
							<input 
								type="radio" 
								value="specific" 
								bind:group={filePermissionSettings.type}
								class="rounded border-gray-300 text-[#01c0a4] focus:ring-[#01c0a4]" 
							/>
							<div>
								<div class="font-medium text-gray-900">Custom permissions</div>
								<div class="text-sm text-gray-500">Choose specific people, roles, or departments</div>
							</div>
						</label>
					</div>

					<!-- Additional Settings based on selection -->
					{#if filePermissionSettings.type === 'specific'}
						<div class="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
							<!-- Specific People -->
							<div>
								<div class="block text-sm font-medium text-gray-700 mb-2">Specific people:</div>
								<div class="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-white">
									<div class="space-y-1">
										{#each currentConversation?.members || [] as member}
											<label class="flex items-center space-x-3 cursor-pointer p-2 hover:bg-gray-50 rounded transition-colors">
												<input 
													type="checkbox" 
													value={member.id}
													bind:group={filePermissionSettings.allowedUsers}
													class="rounded border-gray-300 text-[#01c0a4] focus:ring-[#01c0a4]" 
												/>
												<div class="flex-1 min-w-0">
													<span class="text-sm text-gray-900">{member.name}</span>
													<span class="text-xs text-gray-500 ml-2">{member.department}</span>
													<span class="text-xs text-gray-500">{member.role}</span>
												</div>
											</label>
										{/each}
									</div>
								</div>
							</div>

							<!-- By Role and Organizational Unit - Side by Side -->
							<div class="grid grid-cols-2 gap-4">
								<!-- By Role -->
								<div>
									<div class="block text-sm font-medium text-gray-700 mb-2">By role:</div>
									<p class="text-xs text-gray-500 mb-2">Grant access to users with specific roles</p>
									<div class="space-y-2">
										{#each ['Admin', 'Manager', 'Supervisor', 'Support', 'Frontline'] as role}
											<label class="flex items-center space-x-2 cursor-pointer">
												<input 
													type="checkbox" 
													value={role}
													bind:group={filePermissionSettings.allowedRoles}
													class="rounded border-gray-300 text-[#01c0a4] focus:ring-[#01c0a4]" 
												/>
												<span class="text-sm text-gray-900">{role}</span>
											</label>
										{/each}
									</div>
								</div>

								<!-- By Organizational Unit -->
								<div>
									<div class="block text-sm font-medium text-gray-700 mb-2">By organizational unit:</div>
									<p class="text-xs text-gray-500 mb-2">Grant access to users in specific departments</p>
									<div class="space-y-2">
										{#each ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations'] as ou}
											<label class="flex items-center space-x-2 cursor-pointer">
												<input 
													type="checkbox" 
													value={ou}
													bind:group={filePermissionSettings.allowedOUs}
													class="rounded border-gray-300 text-[#01c0a4] focus:ring-[#01c0a4]" 
												/>
												<span class="text-sm text-gray-900">{ou}</span>
											</label>
										{/each}
									</div>
								</div>
							</div>
						</div>
					{/if}
				</div>
			</div>

			<!-- Footer -->
			<div class="border-t border-gray-200 p-4 flex items-center justify-end space-x-3">
				<button
					onclick={closeFilePermissionModal}
					class="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
				>
					Cancel
				</button>
				<button
					onclick={sendMessageWithAttachments}
					class="px-6 py-2 bg-gradient-to-r from-[#01c0a4] to-[#00a085] text-white rounded-lg hover:shadow-lg hover:shadow-[#01c0a4]/25 transition-all duration-200 flex items-center space-x-2"
				>
					<Send class="w-4 h-4" />
					<span>Send with Files</span>
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- User Profile Modal -->
{#if showUserProfileModal && selectedUserName}
	<UserProfileModal 
		userName={selectedUserName} 
		show={showUserProfileModal} 
		onClose={closeUserProfile} 
	/>
{/if}
