<script lang="ts">
	//import {goto} from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import { getConversations, getAllUsers, createConversation, findOrCreateDirectConversation, checkExistingDirectConversation, addMemberToConversation, getMessagesForConversation, sendMessageToApi } from '$lib/services/chatServices';
	import { initializeUserStatus, getAllUsersWithStatus, usersWithStatus, currentUserStatus, type UserStatus } from '$lib/services/userStatusService';
	import Navigation from '$lib/components/Navigation.svelte';
	import ConfirmationModal from '$lib/components/ConfirmationModal.svelte';
	import ProfileAvatar from '$lib/components/ProfileAvatar.svelte';
	import GroupAvatar from '$lib/components/GroupAvatar.svelte';
	import UserProfileModal from '$lib/components/UserProfileModal.svelte';
	import LoginBackground from '../login/LoginBackground.svelte';
	import { supabase } from '$lib/supabaseClient';
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
		updatedAt?: Date | string; // Add updatedAt property
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
		targetUser?: User; // Store target user for temporary conversations
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
	let directConversations = $state<Conversation[]>([]);
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
	let fileUploadStatus = $state<Array<{name: string, progress: number, status: string}>>([]);
	
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
	
	// Debug effect for modal state
	$effect(() => {
		console.log('🎯 Modal state changed - showUserProfileModal:', showUserProfileModal, 'selectedUserName:', `"${selectedUserName}"`);
		console.log('🎯 Modal condition result:', showUserProfileModal && selectedUserName);
	});
	
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
	
	// Mobile responsiveness state
	let showSidebar = $state(false);
	let isMobile = $state(false);
	
	// Undo functionality for forwards
	let recentForwards = $state<{id: string, messageId: string, conversationIds: string[], timestamp: Date}[]>([]);
	let showUndoToast = $state(false);
	let undoToastTimeout: ReturnType<typeof setTimeout> | null = null;
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

let currentUserId = $state<string | null>(null);
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

onMount(async () => {
// Load user authentication data
function loadUserIdFromAuth() {
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
}

 try {
    console.log('Loading conversations and users from backend...');
    loadUserIdFromAuth();
    
    conversations = await getConversations();
    console.log("Raw conversations from backend:", conversations);
    console.log("Current user ID for filtering:", currentUserId);
    
    // Backend already filters conversations for the current user
    const userConversations = conversations;
    
    // ADDED: Fetch the last message for each conversation during initial load
    for (const conversation of userConversations) {
      try {
        const messages = await getMessagesForConversation(conversation.id);
        if (messages && messages.length > 0) {
          conversation.messages = messages;
          // Update conversation properties based on last message
          conversation.lastMessage = messages[messages.length - 1].content;
          conversation.lastMessageTime = messages[messages.length - 1].timestamp;
        }
      } catch (error) {
        console.error(`Failed to load messages for conversation ${conversation.id}:`, error);
      }
    }
    
    // Separate direct and group conversations
    directConversations = userConversations
      .filter((c: any) => c.type === 'direct')
      .sort((a: any, b: any) => new Date(b.lastMessage?.timestamp || b.updatedAt || 0).getTime() - new Date(a.lastMessage?.timestamp || a.updatedAt || 0).getTime());
    groupChats = userConversations
      .filter((c: any) => c.type === 'group')
      .sort((a: any, b: any) => new Date(b.lastMessage?.timestamp || b.updatedAt || 0).getTime() - new Date(a.lastMessage?.timestamp || a.updatedAt || 0).getTime());
    
    console.log('Direct conversations:', directConversations);
    console.log('Group chats:', groupChats);
    
    const users = await getAllUsers();
    
    // Debug what's actually coming from the server
    console.log("Raw users from backend:", users);
    
    // Map each property explicitly
 availableUsers = users.filter((u: any) => u.id !== currentUserId)
  .map((u: any) => {
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
      avatar: u.dprofilephotourl || u.avatar || u.profilePhoto || u.image || '/placeholder.svg',
      department: u.ddepartment || u.department || u.org_unit || 'Department',
      role: u.drole || u.role || 'Role'
    };
  });
      
    console.log('Transformed users:', availableUsers);
    
    // Initialize user status tracking and update available users
    try {
      console.log('Initializing user status tracking...');
      await initializeUserStatus();
      
      // Get users with real status information
      const usersWithRealStatus = await getAllUsersWithStatus();
      console.log('Users with status:', usersWithRealStatus);
      console.log('Users with status count:', usersWithRealStatus.length);
      
      // Only update availableUsers if we got real data
      if (usersWithRealStatus && usersWithRealStatus.length > 0) {
        // Update availableUsers with real status data
        availableUsers = usersWithRealStatus
          .filter(user => user.id !== currentUserId)
          .map(user => ({
            id: user.id,
            name: `${user.firstName} ${user.lastName}`.trim() || user.username,
            firstName: user.firstName || user.username,
            lastName: user.lastName || '',
            username: user.username,
            email: user.email,
            department: user.organizationalUnit || 'Unknown',
            role: user.role || 'user',
            organizationalUnit: user.organizationalUnit,
            avatar: user.avatar || '/placeholder.svg',
            status: user.status,
            isOnline: user.isOnline,
            onlineStatus: user.status
          }));
        
        console.log('✅ Updated availableUsers with status data:', availableUsers);
      } else {
        console.warn('⚠️ getAllUsersWithStatus returned empty/no data, keeping original availableUsers');
        console.log('Current availableUsers count:', availableUsers.length);
      }
      
      console.log('User status tracking initialized');
    } catch (error) {
      console.error('Failed to initialize user status:', error);
      console.warn('⚠️ Keeping original availableUsers due to status initialization failure');
      console.log('Current availableUsers count:', availableUsers.length);
    }
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
          
          // Also update the conversation in the sidebar lists
          const updateConversationInList = (list: Conversation[]) => {
            const index = list.findIndex(c => c.id === conversationId);
            if (index !== -1) {
              list[index].lastMessage = lastMsg.content;
              list[index].lastMessageTime = lastMsg.timestamp;
            }
          };
          
          updateConversationInList(directConversations);
          updateConversationInList(groupChats);
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
  
  console.log('Selected conversation:', conversation);
  
  try {
    // Enrich member data with roles and departments
    if (conversation.members) {
      conversation.members = await enrichMemberData(conversation.members);
      console.log('Enriched conversation members:', conversation.members);
    }
    
    const messages = await getMessagesForConversation(conversation.id);
    currentConversation.messages = messages;
    markConversationAsSeen(conversation.id);
    
    // Start polling for new messages
    startMessagePolling(conversation.id);
  } catch (error) {
    console.error('Failed to load conversation data:', error);
  }
};
// Clean up polling on component unmount
onDestroy(() => {
  if (messagePollingInterval) {
    clearInterval(messagePollingInterval);
  }
});

	const sendMessage = async (content?: string, attachment?: any) => {
  // If content is provided, use it, otherwise use messageInput
  // For attachments with no explicit content, we'll use a space to satisfy backend validation
  const msgContent = content !== undefined ? content : messageInput.trim();
  
  if ((!msgContent && !attachment) || !currentConversation) return;

  try {
    // Get the actual message content to send
    console.log(`Sending message with ${attachment ? 'attachment: ' + attachment.name : 'no attachment'}`);
    console.log(`Message content: "${msgContent}"`);
    
    
    // Check if this is a temporary conversation that needs to be created first
    if (currentConversation.isTemporary && currentConversation.targetUser) {
      console.log('Creating real conversation for temporary conversation...');
      
      // Create the actual conversation in the backend
      const result = await findOrCreateDirectConversation({
        targetUserId: currentConversation.targetUser.id,
        targetUserName: currentConversation.targetUser.name
      });
      
      const backendConversation = result.conversation;
      
      // Update the current conversation with real backend data
      currentConversation.id = backendConversation.did;
      currentConversation.isTemporary = false;
      
      // Update in the directConversations array as well
      const conversationIndex = directConversations.findIndex(c => c.id.startsWith('temp-'));
      if (conversationIndex !== -1) {
        directConversations[conversationIndex] = { ...currentConversation };
      }
      
      console.log('Conversation created with ID:', backendConversation.did);
    }
    
      // Prepare message data including reply and attachment information
    const messageData = {
      conversationId: currentConversation.id,
      content: msgContent,
      replyToId: replyingTo ? replyingTo.id : null,
      replyToSenderId: replyingTo ? replyingTo.senderId : null,
      replyToContent: replyingTo ? replyingTo.content : null,
    };
    
    // Add attachment information if present
    if (attachment) {
      messageData.attachmentData = {
        name: attachment.name,
        type: attachment.type,
        url: attachment.url,
        size: attachment.size,
        filePath: attachment.filePath,
        permissions: attachment.permissions
      };
    }
    
    // Now send the message using the real conversation ID
    const sentMsg = await sendMessageToApi(currentConversation.id, msgContent, messageData);
    
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

    console.log('Created message with attachment:', {
      hasAttachment: newMessage.hasAttachment,
      attachment: newMessage.attachment
    });

    // Update UI and state
    currentConversation.messages.push(newMessage);
    currentConversation.lastMessage = msgContent;
    currentConversation.lastMessageTime = new Date();
    
    
    // Also update the conversation in the sidebar lists
    const updateConversationInList = (list: Conversation[]) => {
      const index = list.findIndex(c => c.id === currentConversation?.id);
      if (index !== -1) {
        list[index].lastMessage = msgContent;
        list[index].lastMessageTime = new Date();
      }
    };
    
    updateConversationInList(directConversations);
    updateConversationInList(groupChats);
    
    // Clear input
    if (!attachment) {
      messageInput = '';
    }
    replyingTo = null; // Reset reply state
    
    // Fetch updated messages to ensure UI is in sync with backend
    const updatedMessages = await getMessagesForConversation(currentConversation.id);
    console.log('Updated messages from backend:', updatedMessages);
    
    // Check if any messages have attachments
    const messagesWithAttachments = updatedMessages.filter(msg => msg.hasAttachment || msg.attachment);
    console.log('Messages with attachments:', messagesWithAttachments);
    
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
  // Focus on the message input field
  setTimeout(() => {
    document.querySelector('textarea')?.focus();
  }, 100);
};

	const cancelReply = () => {
		replyingTo = null;
	};

	const addReaction = (messageId: string, emoji: string) => {
  if (!currentConversation) return;
  const message = currentConversation.messages.find(m => m.id === messageId);
  if (!message) return;

  // Get the current user ID
  const userId = currentUserId || '1';
  
  // Find if the user has already reacted to this message
  const userReactionIndex = message.reactions.findIndex(r => r.users.includes(userId));
  
  if (userReactionIndex !== -1) {
    // User has already reacted to this message
    const existingReaction = message.reactions[userReactionIndex];
    
    // If the user is clicking the same emoji, remove it (toggle behavior)
    if (existingReaction.emoji === emoji) {
      // Remove user from this reaction
      existingReaction.users = existingReaction.users.filter(u => u !== userId);
      existingReaction.count--;
      
      // If no users left with this reaction, remove the reaction entirely
      if (existingReaction.count === 0) {
        message.reactions = message.reactions.filter(r => r.emoji !== emoji);
      }
    } else {
      // User is changing their reaction to a different emoji
      // First, remove user from their old reaction
      existingReaction.users = existingReaction.users.filter(u => u !== userId);
      existingReaction.count--;
      
      // If no users left with this reaction, remove the reaction entirely
      if (existingReaction.count === 0) {
        message.reactions = message.reactions.filter(r => r.emoji !== existingReaction.emoji);
      }
      
      // Then add user to the new emoji reaction
      const newReaction = message.reactions.find(r => r.emoji === emoji);
      if (newReaction) {
        // Add to existing emoji reaction
        newReaction.users.push(userId);
        newReaction.count++;
        newReaction.timestamp = new Date();
      } else {
        // Create new reaction with this emoji
        message.reactions.push({ 
          emoji, 
          users: [userId], 
          count: 1, 
          timestamp: new Date() 
        });
      }
    }
  } else {
    // User hasn't reacted to this message yet
    const existingReaction = message.reactions.find(r => r.emoji === emoji);
    if (existingReaction) {
      // Add user to existing emoji reaction
      existingReaction.users.push(userId);
      existingReaction.count++;
      existingReaction.timestamp = new Date();
    } else {
      // Create new reaction with this emoji
      message.reactions.push({ 
        emoji, 
        users: [userId], 
        count: 1, 
        timestamp: new Date() 
      });
    }
  }
};

	const formatFileSize = (bytes: number): string => {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	};

	const getFileType = (fileName: string): 'file' | 'image' | 'video' | 'link' => {
		const extension = fileName.toLowerCase().split('.').pop() || '';
		
		if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(extension)) {
			return 'image';
		} else if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(extension)) {
			return 'video';
		} else if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv'].includes(extension)) {
			// Still returns 'file' for documents but we now explicitly recognize these extensions
			return 'file';
		} else {
			return 'file';
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
			
			// Validate file sizes (max 10MB per file)
			const maxSize = 10 * 1024 * 1024; // 10MB
			const validFiles = newFiles.filter(file => {
				if (file.size > maxSize) {
					alert(`File "${file.name}" is too large. Maximum size allowed is 10MB.`);
					return false;
				}
				return true;
			});
			
			selectedFiles = [...selectedFiles, ...validFiles];
		}
		// Clear the input to allow selecting the same file again
		target.value = '';
	};

	const removeFile = (index: number) => {
		selectedFiles = selectedFiles.filter((_, i) => i !== index);
	};

	const handleFileDrop = (event: DragEvent) => {
		event.preventDefault();
		const files = event.dataTransfer?.files;
		if (files && files.length > 0) {
			const newFiles = Array.from(files);
			
			// Validate file sizes (max 10MB per file)
			const maxSize = 10 * 1024 * 1024; // 10MB
			const validFiles = newFiles.filter(file => {
				if (file.size > maxSize) {
					alert(`File "${file.name}" is too large. Maximum size allowed is 10MB.`);
					return false;
				}
				return true;
			});
			
			selectedFiles = [...selectedFiles, ...validFiles];
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

	const sendMessageWithAttachments = async () => {
		if (selectedFiles.length > 0) {
			try {
				// Show uploading state
				const uploadingFiles = selectedFiles.map(file => ({
					name: file.name,
					progress: 0,
					status: 'uploading'
				}));
				fileUploadStatus = uploadingFiles;
				
				// Array to hold all the uploaded file data
				const attachments = [];
				
				for (let i = 0; i < selectedFiles.length; i++) {
					const file = selectedFiles[i];
					
					try {
						// Create a unique file path in the bucket
						const fileExt = file.name.split('.').pop();
						const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
						const filePath = `attachments/${currentConversation.id}/${fileName}`;
						
						// Update progress
						fileUploadStatus[i].progress = 30;
						fileUploadStatus = [...fileUploadStatus];
						
						// Upload to Supabase
						const { data, error } = await supabase.storage
							.from('chat-attachments')
							.upload(filePath, file, {
								cacheControl: '3600',
								upsert: false
							});
							
						if (error) {
							console.error('Error uploading file:', error);
							fileUploadStatus[i].status = 'error';
							fileUploadStatus = [...fileUploadStatus];
							throw new Error(`Failed to upload ${file.name}: ${error.message}`);
						}
						
						// Update progress
						fileUploadStatus[i].progress = 70;
						fileUploadStatus = [...fileUploadStatus];
						
						// Get the public URL
						const { data: urlData } = supabase.storage
							.from('chat-attachments')
							.getPublicUrl(filePath);
							
						// Determine file type
						const fileType = getFileType(file.name);
						
						// Create attachment object
						const attachment = {
							id: data.path,
							name: file.name,
							type: fileType,
							url: urlData.publicUrl,
							size: file.size,
							filePath: filePath,
							permissions: { ...filePermissionSettings }
						};
						
						console.log(`Processing attachment: ${file.name}, type: ${fileType}, url: ${urlData.publicUrl}`);
						console.log('Full attachment object:', attachment);
						attachments.push(attachment);
						
						// Update progress to complete
						fileUploadStatus[i].progress = 100;
						fileUploadStatus[i].status = 'complete';
						fileUploadStatus = [...fileUploadStatus];
						
					} catch (fileError) {
						console.error(`Error processing file ${file.name}:`, fileError);
						fileUploadStatus[i].status = 'error';
						fileUploadStatus = [...fileUploadStatus];
						alert(`Failed to upload ${file.name}. Please try again.`);
						return;
					}
				}
				
				// Send messages for each attachment
				for (const attachment of attachments) {
					// For attachments, we use a space as content
					await sendMessage(' ', attachment);
					console.log(`Sent message with attachment: ${attachment.name}, type: ${attachment.type}`);
				}
				
				// Clear selected files and status
				selectedFiles = [];
				fileUploadStatus = [];
				closeFilePermissionModal();
				
			} catch (error) {
				console.error('Error in sendMessageWithAttachments:', error);
				alert('Failed to send attachments. Please try again.');
			}
		} else {
			// Send regular message if no attachments
			sendMessage();
		}
	};

	const startEditMessage = (message: Message) => {
		if (message.senderId === currentUserId) {
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
		// Initialize default settings if they don't exist
		if (!currentConversation.settings) {
		currentConversation.settings = {
			allowEmojis: true,
			allowAttachments: true,
			allowForwarding: true,
			allowPinning: false,
			isArchived: false
		};
		}
		
		// Set the editing group name to the current name
		editingGroupName = currentConversation.name;
		
		// Open the settings modal
		showGroupSettings = true;
		
		console.log('Opening group settings for:', currentConversation.name);
	}
	};

	const closeGroupSettings = () => {
		showGroupSettings = false;
	};

	const saveGroupSettings = async () => {
  if (!currentConversation || !editingGroupName.trim()) return;
  
  try {
    console.log('Saving group settings...');
    
    // Update the conversation name
    const originalName = currentConversation.name;
    currentConversation.name = editingGroupName.trim();
    
    // Create payload with all settings
    const settingsPayload = {
      conversationId: currentConversation.id,
      name: editingGroupName.trim(),
      settings: {
        allowEmojis: currentConversation.settings?.allowEmojis || true,
        allowAttachments: currentConversation.settings?.allowAttachments || true,
        allowForwarding: currentConversation.settings?.allowForwarding || true,
        allowPinning: currentConversation.settings?.allowPinning || false,
        isArchived: currentConversation.settings?.isArchived || false
      }
    };
    
    // Save to backend
    const response = await fetch(`http://localhost:5000/api/chat/conversations/${currentConversation.id}/settings`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(settingsPayload)
    });
    
    if (!response.ok) {
      throw new Error('Failed to save group settings');
    }
    
    // Update the conversation in the group chats list too
    const index = groupChats.findIndex(c => c.id === currentConversation.id);
    if (index !== -1) {
      groupChats[index].name = editingGroupName.trim();
      groupChats[index].settings = {...currentConversation.settings};
    }
    
    // Close the settings panel
    closeGroupSettings();
    
    console.log('Group settings saved successfully');
  } catch (error) {
    console.error('Failed to save group settings:', error);
    // Revert the name change if there was an error
    if (originalName) {
      currentConversation.name = originalName;
    }
    alert('Failed to save group settings. Please try again.');
  }
};

const toggleSetting = async (settingName) => {
  if (!currentConversation?.settings) return;
  
  // Toggle the setting
  const newValue = !currentConversation.settings[settingName];
  currentConversation.settings[settingName] = newValue;
  
  try {
    console.log(`Updating ${settingName} to ${newValue}`);
    
    // Save to backend with updated endpoint
    const response = await fetch(`http://localhost:5000/api/chat/conversations/${currentConversation.id}/settings/${settingName}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ value: newValue })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update ${settingName} setting: ${errorText}`);
    }
    
    // Update the conversation in the group chats list too
    const index = groupChats.findIndex(c => c.id === currentConversation.id);
    if (index !== -1) {
      groupChats[index].settings = {...currentConversation.settings};
    }
    
    console.log(`${settingName} setting updated:`, currentConversation.settings[settingName]);
  } catch (error) {
    console.error(`Error updating ${settingName} setting:`, error);
    // Revert the change on error
    currentConversation.settings[settingName] = !newValue;
  }
};

// Fix the archiveGroup function
const archiveGroup = async () => {
  if (!currentConversation) return;
  
  try {
    // Set the archived status in the UI
    if (!currentConversation.settings) {
      currentConversation.settings = {
        allowEmojis: true,
        allowAttachments: true,
        allowForwarding: true,
        allowPinning: false,
        isArchived: true
      };
    } else {
      currentConversation.settings.isArchived = true;
    }
    
    // Update in backend
    const response = await fetch(`http://localhost:5000/api/chat/conversations/${currentConversation.id}/archive`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to archive group: ${errorText}`);
    }
    
    // Remove from active group chats and add to archived list if needed
    const index = groupChats.findIndex(c => c.id === currentConversation.id);
    if (index !== -1) {
      const archivedConversation = groupChats[index];
      groupChats.splice(index, 1);
    }
    
    // Close all related panels
    closeGroupSettings();
    showMembersPanel = false;
    currentConversation = null;
    
    console.log('Group archived successfully');
  } catch (error) {
    console.error('Failed to archive group:', error);
    // Revert UI changes
    if (currentConversation?.settings) {
      currentConversation.settings.isArchived = false;
    }
    alert('Failed to archive group. Please try again.');
  }
};

const changeGroupPhoto = () => {
  // Create a file input element
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  
  // Handle file selection
  fileInput.onchange = async (e) => {
    if (!e.target.files || !e.target.files[0]) return;
    
    const file = e.target.files[0];
    
    try {
      // Create form data to upload the file
      const formData = new FormData();
      formData.append('photo', file);
      
      console.log('Uploading photo for conversation:', currentConversation.id);
      
      // Upload the file to the server
      const response = await fetch(`http://localhost:5000/api/chat/conversations/${currentConversation.id}/photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwtToken}`
          // Don't set Content-Type with FormData - browser sets it with boundary
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Photo upload error (${response.status}): ${errorText}`);
        throw new Error('Failed to upload group photo');
      }
      
      const data = await response.json();
      
      // Update the avatar in the UI
      currentConversation.avatar = data.photoUrl;
      
      // Update in the group chats list too
      const index = groupChats.findIndex(c => c.id === currentConversation.id);
      if (index !== -1) {
        groupChats[index].avatar = data.photoUrl;
      }
      
      console.log('Group photo updated successfully');
    } catch (error) {
      console.error('Failed to update group photo:', error);
      alert('Failed to update group photo. Please try again.');
    }
  };
  
  // Trigger the file selection dialog
  fileInput.click();
};

const ensureConversationSettings = () => {
  if (currentConversation) {
    if (!currentConversation.settings) {
      currentConversation.settings = {
        allowEmojis: true,
        allowAttachments: true,
        allowForwarding: true,
        allowPinning: false,
        isArchived: false
      };
    }
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
    
    console.log("New group created with creator:", {
      userId: currentUserId,
      newGroupCreator: newGroup.dcreatedBy || newGroup.createdBy
    });
    
    
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
  members: [
    // Add the selected users
    ...selectedUsers.map(user => ({
      ...user,
      isOnline: user.isOnline || false,
      isMuted: false
    })),
    // Add the current user as a member (creator)
    { 
      id: currentUserId, 
      name: 'You', 
      firstName: 'Current',
      lastName: 'User',
      username: 'currentuser',
      avatar: '/placeholder.svg', 
      department: 'My Department', 
      role: 'My Role',
      isOnline: true,
      isMuted: false
    }
  ],
  // Add additional group properties
  dcreatedBy: currentUserId,
  createdBy: currentUserId,
  settings: {
    allowEmojis: true,
    allowAttachments: true,
    allowForwarding: true,
    allowPinning: false,
    isArchived: false
  },
  pinnedMessages: [],
  mediaHistory: {
    files: [],
    media: [],
    links: []
  }
};
    
    // Update frontend state
    conversations = [...conversations, enhancedGroup];
    // Filter conversations to only show those where current user is a participant
    const userConversations = conversations.filter((c: any) => {
      if (c.type === 'direct') {
        return c.members?.some((member: any) => member.id === currentUserId) ||
               c.participants?.some((participant: any) => participant.userId === currentUserId);
      }
      if (c.type === 'group') {
        return c.members?.some((member: any) => member.id === currentUserId) ||
               c.participants?.some((participant: any) => participant.userId === currentUserId);
      }
      return false;
    });
    
    directConversations = userConversations
      .filter((c: any) => c.type === 'direct')
      .sort((a: any, b: any) => new Date(b.lastMessageTime || b.updatedAt || 0).getTime() - new Date(a.lastMessageTime || a.updatedAt || 0).getTime());
    groupChats = userConversations
      .filter((c: any) => c.type === 'group')
      .sort((a: any, b: any) => new Date(b.lastMessageTime || b.updatedAt || 0).getTime() - new Date(a.lastMessageTime || a.updatedAt || 0).getTime());
    
    // Close modal and reset form
    showCreateGroup = false;
    groupName = '';
    selectedUsers = [];
  } catch (e) {
    console.error('Failed to create group:', e);
    alert('Failed to create group: ' + (e instanceof Error ? e.message : String(e)));
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
	const filteredDirectConversations = $derived(directConversations.filter(conv => 
		conv.name.toLowerCase().includes(searchInput.toLowerCase()) ||
		(conv.lastMessage && conv.lastMessage.toLowerCase().includes(searchInput.toLowerCase()))
	));

	const filteredGroupChats = $derived(groupChats.filter(conv => 
		conv.name.toLowerCase().includes(searchInput.toLowerCase()) ||
		(conv.lastMessage && conv.lastMessage.toLowerCase().includes(searchInput.toLowerCase()))
	));

	// Calculate active (online) members for each group chat
	const getActiveMemberCount = (conversation: Conversation) => {
		if (conversation.type !== 'group' || !conversation.members) return 0;
		return conversation.members.filter(member => member.isOnline === true).length;
	};

	// Auto-expand sections when there are search results
	const shouldShowConversations = $derived(showConversations || (searchInput.trim() && filteredDirectConversations.length > 0));
	const shouldShowGroups = $derived(showGroups || (searchInput.trim() && filteredGroupChats.length > 0));

	// Derived state for filtered users (when searching)
	const filteredUsers = $derived.by(() => {
		if (!searchInput.trim()) return [];
		
		// Get users that don't already have direct conversations
		const existingConversationUserIds = [...directConversations, ...(currentConversation?.isTemporary ? [currentConversation] : [])]
			.map(conv => conv.type === 'direct' ? conv.members.find(m => m.id !== currentUserId)?.id : null)
			.filter(Boolean);
		
		return availableUsers.filter(user => 
			!existingConversationUserIds.includes(user.id) &&
			(user.name.toLowerCase().includes(searchInput.toLowerCase()) ||
			 user.department.toLowerCase().includes(searchInput.toLowerCase()) ||
			 user.role.toLowerCase().includes(searchInput.toLowerCase()))
		);
	});

	// Helper function to generate UUID v4
	function generateUUID() {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			const r = Math.random() * 16 | 0;
			const v = c == 'x' ? r : (r & 0x3 | 0x8);
			return v.toString(16);
		});
	}

	const startNewConversation = async (user: User) => {
		try {
			console.log('Starting new conversation with user:', user);
			console.log('Current user ID:', currentUserId);
			console.log('Target user ID:', user.id);
			
			// Validate that we have proper UUIDs
			if (!currentUserId) {
				throw new Error('Current user ID is not available');
			}
			if (!user.id) {
				throw new Error('Target user ID is not available');
			}
			
			// First check if a conversation already exists locally
			const existingDirectConversation = directConversations.find(conv => 
				conv.type === 'direct' && 
				conv.members.some(member => member.id === user.id)
			);
			
			if (existingDirectConversation && !existingDirectConversation.isTemporary) {
				console.log('Found existing conversation in UI, opening it...');
				selectConversation(existingDirectConversation);
				searchInput = ''; // Clear search
				return;
			}
			
			// Check backend for existing conversations only if no local conversation found
			const result = await checkExistingDirectConversation({
				targetUserId: user.id
			});
			
			console.log('Check existing conversation result:', result);
			
			if (result.exists && result.conversation) {
				console.log('Found existing conversation in backend, loading it...');
				// If conversation already exists, just open it
				const existingConversation: Conversation = {
					id: result.conversation.did,
					name: user.name,
					department: user.department,
					role: user.role,
					type: 'direct',
					lastMessage: 'No messages yet',
					lastMessageTime: result.conversation.tcreatedat || new Date(),
					unreadCount: 0,
					avatar: user.avatar,
					isOnline: user.isOnline || false,
					isRead: true,
					messages: [],
					members: [user],
					isTemporary: false
				};
				
				// Load existing messages
				const messages = await getMessagesForConversation(result.conversation.did);
				existingConversation.messages = messages;
				
				// Add to directConversations if not already there
				const existsInList = directConversations.some(c => c.id === existingConversation.id);
				if (!existsInList) {
					directConversations = [existingConversation, ...directConversations];
				}
				
				selectConversation(existingConversation);
				searchInput = ''; // Clear search
				return;
			}
			
			console.log('No existing conversation found, creating temporary conversation...');
			
			// Create a temporary frontend conversation (not saved to backend yet)
			const tempConversation: Conversation = {
				id: 'temp-' + generateUUID(), // Temporary ID
				name: user.name,
				department: user.department,
				role: user.role,
				type: 'direct',
				lastMessage: '',
				lastMessageTime: new Date(),
				unreadCount: 0,
				isRead: true,
				avatar: user.avatar,
				isOnline: user.isOnline || false,
				messages: [],
				members: [
					{ 
						id: currentUserId, 
						name: 'You', 
						firstName: 'Current',
						lastName: 'User',
						avatar: '/placeholder.svg?height=32&width=32', 
						isOnline: true, 
						isMuted: false,
						department: 'IT',
						role: 'Manager'
					},
					{ ...user, isOnline: user.status === 'online', isMuted: false }
				],
				isTemporary: true, // Mark as temporary
				targetUser: user, // Store target user for later conversation creation
				settings: {
					allowEmojis: true,
					allowAttachments: true,
					allowForwarding: true,
					allowPinning: false,
					isArchived: false
				}
			};

			// Add to conversations list and select it
			directConversations = [...directConversations, tempConversation];
			selectConversation(tempConversation);
			searchInput = ''; // Clear search after starting conversation
		
		} catch (error) {
			console.error('Failed to create conversation:', error);
			console.error('Error details:', {
				message: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				user: user,
				currentUserId: currentUserId
			});
			alert('Failed to start conversation: ' + (error instanceof Error ? error.message : String(error)));
		}
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
	/*const toggleForwarding = () => {
		if (currentConversation?.settings) {
			currentConversation.settings.allowForwarding = !currentConversation.settings.allowForwarding;
		}
	};

	const togglePinning = () => {
		if (currentConversation?.settings) {
			currentConversation.settings.allowPinning = !currentConversation.settings.allowPinning;
		}
	};*/

	// Filter users function for group creation
	const filteredUsersForGroup = $derived.by(() => {
		console.log('🔍 filteredUsersForGroup: availableUsers count:', availableUsers.length);
		console.log('🔍 filteredUsersForGroup: userSearchQuery:', userSearchQuery);
		
		if (!userSearchQuery.trim()) {
			console.log('🔍 filteredUsersForGroup: No search query, returning all availableUsers');
			return availableUsers;
		}
		
		const filtered = availableUsers.filter(user =>
			user.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
			user.department.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
			user.role.toLowerCase().includes(userSearchQuery.toLowerCase())
		);
		
		console.log('🔍 filteredUsersForGroup: Filtered count:', filtered.length);
		return filtered;
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
		console.log('🎯 user.username:', `"${user.username}"`);
		console.log('🎯 user.name:', `"${user.name}"`);
		console.log('🎯 user.id:', `"${user.id}"`);
		
		try {
			// Use username if available, otherwise fall back to name
			selectedUserName = user.username || user.name || '';
			console.log('🎯 selectedUserName set to:', `"${selectedUserName}"`);
			
			// If we used the name as fallback, try to find the actual username by ID
			if (!user.username && user.id) {
				console.log('🎯 Username missing, trying to find by ID:', user.id);
				console.log('🎯 availableUsers count:', availableUsers.length);
				const actualUser = availableUsers.find(u => u.id === user.id);
				if (actualUser && actualUser.username) {
					console.log('🎯 Found actual username:', actualUser.username);
					selectedUserName = actualUser.username;
				}
			}
			
			console.log('🎯 Final selectedUserName:', `"${selectedUserName}"`);
			console.log('🎯 Current showUserProfileModal before setting:', showUserProfileModal);
			
			showUserProfileModal = true;
			console.log('🎯 showUserProfileModal set to:', showUserProfileModal);
			
			// Additional check for modal condition
			console.log('🎯 Modal should show:', showUserProfileModal && selectedUserName);
			console.log('🎯 selectedUserName truthy:', !!selectedUserName);
			console.log('🎯 selectedUserName length:', selectedUserName.length);
			
		} catch (error) {
			console.error('❌ Error in showUserProfile:', error);
		}
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
async function enrichMemberData(members) {
  // For each member, fetch additional data
  for (const member of members) {
    if (!member.roleName && !member.departmentName) {
      try {
        // First try to get data from cached users
        const cachedUser = availableUsers.find(u => 
          u.id === member.userId || u.id === member.id
        );
        
        if (cachedUser) {
          member.roleName = cachedUser.roleName || cachedUser.role || 'Not specified';
          member.departmentName = cachedUser.departmentName || cachedUser.department || 'Not specified';
          continue;
        }
        
        // If not in cache, fetch from backend
        const response = await fetch(`http://localhost:5000/api/users/${member.userId || member.id}/details`, {
          headers: {
            'Authorization': `Bearer ${jwtToken}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        if (response.ok) {
          const userData = await response.json();
          member.roleName = userData.roleName || userData.role || 'Not specified';
          member.departmentName = userData.departmentName || userData.department || 'Not specified';
          
          // Set standard fields too for consistency
          member.role = member.roleName;
          member.department = member.departmentName;
        }
      } catch (error) {
        console.error(`Failed to fetch details for member ${member.name || member.firstName + ' ' + member.lastName}:`, error);
      }
    } else {
      // Ensure standard fields are set too
      if (member.roleName && !member.role) member.role = member.roleName;
      if (member.departmentName && !member.department) member.department = member.departmentName;
    }
  }
  return members;
}
	function groupMessagesByTime(messages: Message[]) {
  const groups: { 
    timeLabel: string, 
    messages: Message[], 
    timestamp: Date,
    uniqueId?: string 
  }[] = [];
  const TIME_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds
  
  // FIXED: Sort messages by timestamp in ASCENDING order (oldest first)
  const sortedMessages = [...messages].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  sortedMessages.forEach((message, index) => {
    const messageTime = new Date(message.timestamp);
    const prevMessage = sortedMessages[index - 1];
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
									<p class="text-xs {conversation.isRead === false ? 'text-gray-600' : 'text-gray-400'} truncate">
										{#if conversation.lastMessage && conversation.lastMessage !== 'No messages yet' && conversation.lastMessage !== 'Group created'}
											{#if conversation.messages && conversation.messages.length > 0}
												{#if conversation.messages[conversation.messages.length - 1].senderId === currentUserId}
													Me: {conversation.lastMessage}
												{:else}
													{conversation.messages[conversation.messages.length - 1].senderName}: {conversation.lastMessage}
												{/if}
											{:else}
												{conversation.lastMessage}
											{/if}
										{:else}
											{getActiveMemberCount(conversation)} active • {conversation.members.length} total
										{/if}
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

				<!-- Direct Messages Section -->
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
							<span class="font-medium text-gray-700 text-sm">Direct Messages</span>
						</div>
						<span class="text-xs text-gray-500">{directConversations.length}</span>
					</button>
					
					{#if shouldShowConversations}
						{#each filteredDirectConversations as conversation (conversation.id)}
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
								</div>
								
								      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between">
          <h3 class="font-medium truncate text-sm {conversation.isRead === false ? 'text-gray-900' : 'text-gray-500'}">
            {conversation.name}
          </h3>
          <span class="text-xs text-gray-500">{formatTime(conversation.lastMessageTime)}</span>
        </div>
        <p class="text-xs {conversation.isRead === false ? 'text-gray-600' : 'text-gray-400'} truncate">
          {#if conversation.messages && conversation.messages.length > 0}
            {#if conversation.messages[conversation.messages.length - 1].senderId === currentUserId}
              Me: {conversation.messages[conversation.messages.length - 1].content}
            {:else}
              {conversation.name}: {conversation.messages[conversation.messages.length - 1].content}
            {/if}
          {:else if conversation.lastMessage && conversation.lastMessage !== 'No messages yet'}
            {conversation.lastMessage}
          {:else}
            {conversation.department && conversation.role ? `${conversation.department} • ${conversation.role}` : 'No messages yet'}
          {/if}
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
										showOnlineStatus={user.status === 'online'}
										onlineStatus={user.status || 'offline'}
									/>
								</div>
								
								<div class="flex-1 min-w-0">
									<div class="flex items-center justify-between">
										<h3 class="font-medium text-gray-900 truncate text-sm">
											{user.name}
										</h3>
										<MessageCircle class="w-3 h-3 text-gray-400" />
									</div>
									<p class="text-xs text-gray-500">{user.organizationalUnit || user.department} • {user.role}</p>
									<p class="text-xs text-gray-400">{user.status === 'online' ? 'Online' : 'Offline'}</p>
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
								<div class="flex {message.senderId === currentUserId ? 'justify-end' : 'justify-start'} group">
									<div 
										class="flex items-start space-x-2 max-w-xs lg:max-w-md cursor-pointer"
										title={formatExactTime(message.timestamp)}
									>
										{#if message.senderId !== currentUserId}
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
										
										<div class="flex flex-col {message.senderId === currentUserId ? 'items-end' : 'items-start'}">
											{#if message.senderId !== currentUserId}
												<div class="text-xs text-gray-500 mb-1">
													{message.senderName}
												</div>
											{/if}
											
											{#if message.replyTo}
											<div class="mb-2 px-3 py-2 bg-gray-100 rounded-lg border-l-2 border-[#01c0a4] text-sm">
												<div class="flex items-center space-x-2 mb-1">
												<Reply class="w-3 h-3 text-gray-500" />
												<div class="text-xs text-gray-600 flex-1">
													Replying to 
													<span class="font-medium">
													{message.replyTo.senderId === currentUserId ? 'Yourself' : message.replyTo.senderName}
													</span>
												</div>
												<div class="text-xs text-gray-400">
													{formatTime(message.replyTo.timestamp)}
												</div>
												</div>
												<div class="text-gray-700 {message.replyTo.isDeleted ? 'italic text-gray-500' : ''}">
												{message.replyTo.content}
												</div>
											</div>
											{/if}
											
											<div class="relative">
												<div class="px-4 py-2 rounded-2xl {message.isDeleted ? 'bg-gray-50 text-gray-500 border border-gray-200' : message.senderId === currentUserId ? 'bg-gradient-to-r from-[#01c0a4] to-[#00a085] text-white' : 'bg-gray-100 text-gray-900'} {message.hasAttachment && (!message.content || message.content.trim().match(/^\s+$/)) ? 'p-2' : ''} {(message.attachment?.type === 'image' && (!message.content || message.content.trim().match(/^\s+$/))) ? 'p-0 overflow-hidden bg-transparent' : ''}">
													{#if message.content && message.content.trim() && !message.content.trim().match(/^\s+$/)}
													<p class="whitespace-pre-wrap {message.isDeleted ? 'italic' : ''}">{message.content}</p>
													{/if}
													{#if fileUploadStatus.length > 0}
													<div class="px-4 pb-3 bg-white">
														<div class="space-y-2">
														{#each fileUploadStatus as file}
															<div class="bg-gray-100 p-2 rounded-lg">
															<div class="flex items-center justify-between mb-1">
																<div class="text-sm">{file.name}</div>
																<div class="text-xs">{file.status === 'complete' ? 'Complete' : `${file.progress}%`}</div>
															</div>
															<div class="w-full bg-gray-200 rounded-full h-1.5">
																<div 
																class="h-1.5 rounded-full {file.status === 'error' ? 'bg-red-500' : 'bg-[#01c0a4]'}" 
																style="width: {file.progress}%"
																></div>
															</div>
															</div>
														{/each}
														</div>
													</div>
													{/if}
													{#if message.hasAttachment && message.attachment}
														<!-- Debug: Log attachment info -->
														{console.log('Rendering attachment for message:', message.id, {
															type: message.attachment.type,
															name: message.attachment.name,
															url: message.attachment.url,
															hasAttachment: message.hasAttachment,
															fullAttachment: message.attachment
														})}
														
														<div class="attachment-container mt-2">
															{#if message.attachment.type === 'image'}
																<!-- For images: Display the actual image -->
																<div class="max-w-xs rounded-lg overflow-hidden bg-gray-100">
																	<img 
																		src={message.attachment.url} 
																		alt={message.attachment.name} 
																		class="w-full max-h-72 object-cover hover:opacity-95 transition-opacity cursor-pointer"
																		loading="lazy"
																		onclick={() => window.open(message.attachment.url, '_blank')}
																		onerror={(e) => {
																			console.error('Image failed to load:', message.attachment.url);
																			e.target.style.display = 'none';
																			e.target.nextElementSibling.style.display = 'block';
																		}}
																	/>
																	<!-- Fallback if image fails to load -->
																	<div class="hidden p-3 text-center text-gray-600 text-sm">
																		<FileText class="w-8 h-8 mx-auto mb-2" />
																		Image failed to load: {message.attachment.name}
																		<br>
																		<a href={message.attachment.url} target="_blank" class="text-blue-600 hover:underline">
																			Open in new tab
																		</a>
																	</div>
																</div>
															{:else if message.attachment.type === 'video'}
																<!-- For videos: Show video player -->
																<div class="max-w-xs">
																	<video controls class="rounded-lg max-h-48 max-w-full">
																		<source src={message.attachment.url} type="video/mp4">
																		Your browser does not support video playback.
																	</video>
																</div>
															{:else}
																<!-- For documents: Just show the filename -->
																<div class="flex items-center p-2 bg-gray-100 rounded {message.senderId === currentUserId ? 'text-white bg-white/20' : 'text-gray-900'}">
																	<FileText class="w-5 h-5 mr-2 {message.senderId === currentUserId ? 'text-white' : 'text-blue-600'}" />
																	<a 
																		href={message.attachment.url} 
																		download={message.attachment.name}
																		class="{message.senderId === currentUserId ? 'text-white' : 'text-blue-600'} hover:underline font-medium"
																	>
																		{message.attachment.name}
																	</a>
																</div>
															{/if}
														</div>
													{:else if message.hasAttachment}
														<!-- Debug: Message claims to have attachment but no attachment object -->
														{console.log('Message has hasAttachment=true but no attachment object:', message)}
														<div class="p-2 bg-red-100 text-red-600 text-sm rounded">
															Missing attachment data for message: {message.id}
														</div>
													{/if}
												
												<!-- Message actions - hide for deleted messages -->
												{#if !message.isDeleted}
													<div class="absolute top-0 {message.senderId === currentUserId ? 'right-full mr-2' : 'left-full ml-2'} opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
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
											{#if message.senderId === currentUserId}
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
																	class="flex items-center space-x-1 px-2 py-1 bg-gray-100 rounded-full text-xs hover:bg-gray-200 transition-colors {reaction.users.includes(currentUserId || '1') ? 'bg-[#01c0a4]/10 text-[#01c0a4]' : ''}"
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
													{#if message.senderId === currentUserId && message.seenBy && message.seenBy.length > 0}
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
												
												{#if message.senderId === currentUserId}
													<div class="w-8 h-8 rounded-full bg-[#01c0a4] text-white text-xs font-medium flex items-center justify-center">
														Me
													</div>
												{/if}
											</div>
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
						<div class="flex-1 flex items-start space-x-2">
						<Reply class="w-4 h-4 text-gray-500 mt-1" />
						<div>
							<div class="flex items-center">
							<span class="text-sm font-medium text-gray-700">
								Replying to {replyingTo.senderId === currentUserId ? 'Yourself' : replyingTo.senderName}
							</span>
							<span class="text-xs text-gray-500 ml-2">
								{formatTime(replyingTo.timestamp)}
							</span>
							</div>
							<p class="text-sm text-gray-600 truncate max-w-md">
							{replyingTo.content}
							</p>
						</div>
						</div>
						<button 
						onclick={cancelReply} 
						class="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-200" 
						aria-label="Cancel reply"
						>
						<X class="w-4 h-4" />
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
						<div class="px-4 pb-3 bg-white">
							<div class="flex flex-wrap gap-2 mt-2">
							{#each selectedFiles as file, index}
								<div class="relative bg-gray-100 rounded p-2 flex items-center">
								<div class="mr-2">
									{#if file.type.startsWith('image/')}
									<Image class="w-5 h-5 text-blue-500" />
									{:else if file.type.startsWith('video/')}
									<Video class="w-5 h-5 text-purple-500" />
									{:else}
									<FileText class="w-5 h-5 text-gray-500" />
									{/if}
								</div>
								<span class="text-sm truncate max-w-[150px]">{file.name}</span>
								<button
									type="button"
									class="ml-2 text-red-500 hover:text-red-700"
									onclick={() => removeFile(index)}
									aria-label="Remove file"
								>
									<X class="w-4 h-4" />
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
									placeholder="Type a message..."
									class="flex-1 py-2 px-3 bg-gray-50 rounded-xl resize-none focus:outline-none focus:ring-1 focus:ring-[#01c0a4] max-h-24"
									rows="1"
									oninput={handleTyping}
									onkeydown={handleKeyPress}
									></textarea>
								
								<div class="absolute right-2 bottom-2 flex items-center space-x-1">
									{#if currentConversation.settings?.allowAttachments !== false}
										<button
											type="button"
											class="p-2 text-gray-500 hover:text-gray-700 focus:outline-none"
											aria-label="Attach file"
											onclick={() => document.getElementById('fileInput').click()}
											>
											<Paperclip class="w-5 h-5" />
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
									id="fileInput"
									type="file"
									class="hidden"
									onchange={handleFileChange}
									multiple
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
							  onclick={() => {
								if (editingMessage) {
								saveEditedMessage();
								} else if (selectedFiles.length > 0) {
								sendMessageWithAttachments();
								} else {
								sendMessage();
								messageInput = ''; // Clear input after sending
								}
							}}
							disabled={!messageInput.trim() && selectedFiles.length === 0}
							class="p-4 bg-gradient-to-r from-[#01c0a4] to-[#00a085] text-white rounded-xl hover:shadow-lg hover:shadow-[#01c0a4]/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
							aria-label="Send message"
							>
							<Send class="w-4 h-4" />
						</button>
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
					{#each currentConversation.members as member, index (member.id || member.userId || `member-${index}`)}
						<div class="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-100">
						<div class="flex items-center space-x-3">
							<button 
							type="button"
							onclick={(event) => {
								event.stopPropagation();
								const fullUserData = getUserDetails(member.id || member.userId);
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
							<!-- Remove the debug output line -->
							<!-- <div class="text-xs text-red-500 mb-1">DEBUG: {JSON.stringify(member)}</div> -->
							
							<div class="flex items-center space-x-2">
								{console.log('Member object:', member)}
								<!-- Show name with fallback options -->
								<h4 class="font-medium text-gray-900">
								{member.name || member.dusername || (member.firstName && member.lastName ? `${member.firstName} ${member.lastName}` : '') || member.id || 'Unknown User'}
								</h4>
								{#if member.id === currentUserId}
								<span class="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">You</span>
								{/if}
								{#if member.id && (member.id === currentConversation.dcreatedBy || member.id === currentConversation.createdBy)}
								<Crown class="w-3 h-3 text-yellow-500" title="Group Admin" />
								{/if}
							</div>
							
							<!-- Enhanced user organization info with better styling -->
						<div class="flex flex-col mt-1">
							<!-- Show role with correct property names -->
								<div class="flex items-center text-sm text-gray-600">
									<span class="inline-block w-20 text-gray-500">Role:</span>
									<span class="font-medium">
									{member.roleName || member.role || 'Not specified'}
									</span>
								</div>
								
								<!-- Show department with correct property names -->
								<div class="flex items-center text-sm text-gray-600">
									<span class="inline-block w-20 text-gray-500">Dept:</span>
									<span class="font-medium">
									{member.departmentName || member.department || 'Not specified'}
									</span>
								</div>
								</div>
							
							<!-- Status info -->
							<p class="text-xs text-gray-400 mt-1 flex items-center">
								<span class={`inline-block w-2 h-2 rounded-full mr-2 ${member.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></span>
								{member.isOnline ? 'Online' : 'Offline'}
								{#if member.isMuted}
								<span class="text-red-500 ml-2 flex items-center">
									<VolumeX class="w-3 h-3 mr-1" /> Muted
								</span>
								{/if}
							</p>
							</div>
						</div>
						
						<!-- Member actions -->
						{#if member.id !== currentUserId && (currentConversation.dcreatedBy === currentUserId || currentConversation.createdBy === currentUserId)}
							<div class="flex items-center space-x-1">
							<button
								onclick={() => toggleMute(member.id)}
								class="p-1 text-gray-500 hover:text-[#01c0a4] transition-colors rounded-full hover:bg-gray-100"
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
								class="p-1 text-gray-500 hover:text-red-500 transition-colors rounded-full hover:bg-gray-100"
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
						onclick={changeGroupPhoto}
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

					<div class="space-y-2">
						<div class="text-sm text-gray-500">
							{currentConversation?.members.length} members
						</div>
						{#if currentConversation?.department}
							<div class="text-sm text-gray-600">
								<span class="font-medium">Department:</span> {currentConversation.department}
							</div>
						{/if}
						{#if currentConversation?.role}
							<div class="text-sm text-gray-600">
								<span class="font-medium">Role:</span> {currentConversation.role}
							</div>
						{/if}
					</div>
				</div>

				<!-- Settings -->
				<div class="space-y-4">
					<h4 class="font-medium text-gray-900">Chat Settings</h4>
					
					<!-- Allow Emojis -->
			  <div class="flex items-center justify-between">
    <div class="flex flex-col">
      <h3 class="font-medium text-gray-800">Allow Emojis and Reactions</h3>
      <p class="text-sm text-gray-500">Enable emoji reactions in this group</p>
    </div>
    <div class={`w-12 h-6 rounded-full p-1 transition-colors ${currentConversation?.settings?.allowEmojis ? 'bg-[#01c0a4]' : 'bg-gray-300'}`} 
         onclick={toggleEmojis} role="switch" tabindex="0" aria-checked={currentConversation?.settings?.allowEmojis}>
      <div class={`w-4 h-4 rounded-full bg-white transform transition-transform ${currentConversation?.settings?.allowEmojis ? 'translate-x-6' : ''}`}></div>
    </div>
  </div>
  
  <!-- Allow File Attachments -->
  <div class="flex items-center justify-between">
    <div class="flex flex-col">
      <h3 class="font-medium text-gray-800">Allow File Attachments</h3>
      <p class="text-sm text-gray-500">Enable file and image sharing</p>
    </div>
    <div class={`w-12 h-6 rounded-full p-1 transition-colors ${currentConversation?.settings?.allowAttachments ? 'bg-[#01c0a4]' : 'bg-gray-300'}`} 
         onclick={toggleAttachments} role="switch" tabindex="0" aria-checked={currentConversation?.settings?.allowAttachments}>
      <div class={`w-4 h-4 rounded-full bg-white transform transition-transform ${currentConversation?.settings?.allowAttachments ? 'translate-x-6' : ''}`}></div>
    </div>
  </div>
  
  <!-- Allow Message Forwarding -->
  <div class="flex items-center justify-between">
    <div class="flex flex-col">
      <h3 class="font-medium text-gray-800">Allow Message Forwarding</h3>
      <p class="text-sm text-gray-500">Enable forwarding messages to other chats</p>
    </div>
    <div class={`w-12 h-6 rounded-full p-1 transition-colors ${currentConversation?.settings?.allowForwarding ? 'bg-[#01c0a4]' : 'bg-gray-300'}`} 
         onclick={toggleForwarding} role="switch" tabindex="0" aria-checked={currentConversation?.settings?.allowForwarding}>
      <div class={`w-4 h-4 rounded-full bg-white transform transition-transform ${currentConversation?.settings?.allowForwarding ? 'translate-x-6' : ''}`}></div>
    </div>
  </div>
  
  <!-- Allow Pinned Messages -->
  <div class="flex items-center justify-between">
    <div class="flex flex-col">
      <h3 class="font-medium text-gray-800">Allow Pinned Messages</h3>
      <p class="text-sm text-gray-500">Enable pinning important messages</p>
    </div>
    <div class={`w-12 h-6 rounded-full p-1 transition-colors ${currentConversation?.settings?.allowPinning ? 'bg-[#01c0a4]' : 'bg-gray-300'}`} 
         onclick={togglePinning} role="switch" tabindex="0" aria-checked={currentConversation?.settings?.allowPinning}>
      <div class={`w-4 h-4 rounded-full bg-white transform transition-transform ${currentConversation?.settings?.allowPinning ? 'translate-x-6' : ''}`}></div>
    </div>
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
						<div class="flex items-center justify-between mb-3">
							<p class="text-sm font-medium text-gray-700">Add Members</p>
							<!-- Debug button (remove in production) -->
							<button 
								onclick={() => {
									console.log('🔍 DEBUG - Available Users:', availableUsers);
									console.log('🔍 DEBUG - Filtered Users:', filteredUsersForGroup);
									console.log('🔍 DEBUG - Search Query:', userSearchQuery);
									alert(`Available: ${availableUsers.length}, Filtered: ${filteredUsersForGroup.length}`);
								}}
								class="px-2 py-1 text-xs bg-blue-500 text-white rounded"
								type="button"
							>
								Debug
							</button>
						</div>
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
										<p class="text-sm text-gray-500">{user.organizationalUnit || user.department} • {user.role}</p>
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
											<p class="text-xs text-gray-500 truncate">{user.organizationalUnit || user.department}</p>
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
