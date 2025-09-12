<script lang="ts">
  import { Building2, Plus, Search, Edit, Trash2, Users, MapPin, FileText, MessageCircle, Radio, Shield, User, UserCheck, Send, ChevronRight, ChevronDown, X } from 'lucide-svelte';
  import ConfirmationModal from '$lib/components/ConfirmationModal.svelte';
  import { onMount } from 'svelte';
  import { createOU as createOUAPI, transformOUDataForAPI, transformOUDataForUpdate, getActiveOUs, getInactiveOUs, deactivateOUs as deactivateOUsAPI, deactivateOU as deactivateOUAPI, reactivateOU as reactivateOUAPI, reactivateOUs as reactivateOUsAPI, updateOU as updateOUAPI } from '$lib/api/OUmanagement';

  // TypeScript interfaces
  interface OrganizationUnit {
    id: string;
    name: string;
    description: string;
    parentId: string | null;
    memberCount: number;
    location: string;
    createdAt: Date;
    modifiedAt: Date;
    status: 'active' | 'inactive';
    rules: OURules;
    _originalJsSettings?: any; // Store original jsSettings for tab determination
  }

  interface OURules {
    chat: {
      frontlineCanInitiate1v1: boolean;
      frontlineCanCreateGroups: boolean;
      frontlineCanJoinGroups: boolean;
      frontlineCanShareFiles: boolean;
      frontlineCanForwardMessages: boolean;
      supportCanInitiate1v1: boolean;
      supportCanCreateGroups: boolean;
      supportCanJoinGroups: boolean;
      supportCanShareFiles: boolean;
      supportCanForwardMessages: boolean;
      supervisorCanCreateGroups: boolean;
      supervisorCanShareFiles: boolean;
      supervisorCanForwardMessages: boolean;
      managerCanAccessAllGroups: boolean;
      managerCanShareFiles: boolean;
      managerCanForwardMessages: boolean;
      allowFileSharing: boolean;
      allowEmojis: boolean;
      messageRetentionDays: number;
      maxFileSize: number;
      allowedFileTypes: boolean;
      maxGroupSize: number;
      messageEditWindow: number;
      pinnedMessages: {
        enabled: boolean;
        maxPinnedPerConversation: number;
      };
    };
    broadcast: {
      frontlineCanCreateBroadcast: boolean;
      frontlineCanReplyToBroadcast: boolean;
      supportCanCreateBroadcast: boolean;
      supportCanReplyToBroadcast: boolean;
      supervisorCanCreateBroadcast: boolean;
      managerCanCreateBroadcast: boolean;
      requireApprovalForBroadcast: boolean;
      allowScheduledBroadcasts: boolean;
      allowPriorityBroadcasts: boolean;
      broadcastRetentionDays: number;
      requireAcknowledgment: boolean;
      acknowledgmentReminders: boolean;
      reminderInterval: number;
      maxBroadcastTargets: number;
    };
  }

  // Data state
  let organizationUnits = $state<OrganizationUnit[]>([]);
  let activeList = $state<OrganizationUnit[]>([]);
  let inactiveList = $state<OrganizationUnit[]>([]);

  let searchQuery = $state<string>('');
  let currentTab = $state<string>('active');
  let selectedOU = $state<OrganizationUnit | null>(null);
  let expandedNodes = $state<Set<string>>(new Set());
  let showCreateModal = $state<boolean>(false);
  let showEditModal = $state<boolean>(false);
  let showParentDetailsModal = $state<boolean>(false);
  let showConfirmationModal = $state<boolean>(false);
  let activeRulesTab = $state<'chat' | 'broadcast'>('chat');
  let confirmationAction = $state<string>('');
  let editOU = $state<Partial<OrganizationUnit> & { rules: OURules } | null>(null);
  let actionConfirm = $state<{
    message: string;
    confirmText: string;
    action: () => void;
  } | null>(null);

  // API state management
  let isCreatingOU = $state<boolean>(false);
  let apiError = $state<string>('');
  let apiSuccess = $state<string>('');
  let isLoading = $state<boolean>(false);
  let loadError = $state<string>('');
  let parentOUForNewChild = $state<OrganizationUnit | null>(null);
  let selectedRows = $state<Set<string>>(new Set());

  // Notification modal state
  let showNotificationModal = $state<boolean>(false);
  let notificationData = $state<{
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
    onClose?: () => void;
  } | null>(null);
  let timerProgress = $state<number>(100);
  let timerInterval: number | null = null;

  const defaultRules: OURules = {
    chat: {
      frontlineCanInitiate1v1: true,
      frontlineCanCreateGroups: false,
      frontlineCanJoinGroups: true,
      frontlineCanShareFiles: false,
      frontlineCanForwardMessages: false,
      supportCanInitiate1v1: true,
      supportCanCreateGroups: false,
      supportCanJoinGroups: true,
      supportCanShareFiles: true,
      supportCanForwardMessages: true,
      supervisorCanCreateGroups: true,
      supervisorCanShareFiles: true,
      supervisorCanForwardMessages: true,
      managerCanAccessAllGroups: true,
      managerCanShareFiles: true,
      managerCanForwardMessages: true,
      allowFileSharing: true,
      allowEmojis: true,
      messageRetentionDays: 365,
      maxFileSize: 10,
      allowedFileTypes: false,
      maxGroupSize: 50,
      messageEditWindow: 15,
      pinnedMessages: { enabled: true, maxPinnedPerConversation: 10 }
    },
    broadcast: {
      frontlineCanCreateBroadcast: false,
      frontlineCanReplyToBroadcast: true,
      supportCanCreateBroadcast: false,
      supportCanReplyToBroadcast: true,
      supervisorCanCreateBroadcast: true,
      managerCanCreateBroadcast: true,
      requireApprovalForBroadcast: false,
      allowScheduledBroadcasts: true,
      allowPriorityBroadcasts: true,
      broadcastRetentionDays: 365,
      requireAcknowledgment: true,
      acknowledgmentReminders: true,
      reminderInterval: 1440,
      maxBroadcastTargets: 1000
    }
  };

  const parseJsSettingsToRules = (jsSettings: any): OURules => {
    const base: OURules = JSON.parse(JSON.stringify(defaultRules));
    
    console.log('Parsing jsSettings:', jsSettings);
    
    if (!jsSettings) return base;
    const arr = Array.isArray(jsSettings) ? jsSettings : [jsSettings];

    for (const item of arr) {
      // Handle Chat settings
      if (item && item.Chat) {
        const chat = item.Chat;
        console.log('Processing Chat settings:', chat);
        
        if (chat.General) {
          base.chat.allowFileSharing = !!chat.General.FileSharing;
          base.chat.allowEmojis = !!chat.General.Emoji;
          if (chat.General.Retention != null) base.chat.messageRetentionDays = Number(chat.General.Retention) || base.chat.messageRetentionDays;
        }
        if (chat.Frontline) {
          base.chat.frontlineCanInitiate1v1 = !!chat.Frontline.Init1v1;
          base.chat.frontlineCanCreateGroups = !!chat.Frontline.CreateGroup;
          base.chat.frontlineCanJoinGroups = !!chat.Frontline.JoinGroupChats;
          base.chat.frontlineCanShareFiles = !!chat.Frontline.ShareFiles;
          base.chat.frontlineCanForwardMessages = !!chat.Frontline.ForwardMessage;
        }
        if (chat.support) {
          base.chat.supportCanInitiate1v1 = !!chat.support.Init1v1;
          base.chat.supportCanCreateGroups = !!chat.support.CreateGroup;
          base.chat.supportCanJoinGroups = !!chat.support.JoinGroupChats;
          base.chat.supportCanShareFiles = !!chat.support.ShareFiles;
          base.chat.supportCanForwardMessages = !!chat.support.ForwardMessage;
        }
        if (chat.supervisor) {
          base.chat.supervisorCanCreateGroups = !!chat.supervisor.CreateGroup;
          base.chat.supervisorCanShareFiles = !!chat.supervisor.ShareFiles;
          base.chat.supervisorCanForwardMessages = !!chat.supervisor.ForwardMessage;
        }
      }
      
      // Handle lowercase chat for backward compatibility
      if (item && item.chat) {
        const chat = item.chat;
        if (chat.general) {
          base.chat.allowFileSharing = !!chat.general.fileSharing;
          base.chat.allowEmojis = !!chat.general.emoji;
          if (chat.general.retention != null) base.chat.messageRetentionDays = Number(chat.general.retention) || base.chat.messageRetentionDays;
        }
        if (chat.frontline) {
          base.chat.frontlineCanInitiate1v1 = !!chat.frontline.init1v1;
          base.chat.frontlineCanCreateGroups = !!chat.frontline.createGroup;
          base.chat.frontlineCanJoinGroups = !!chat.frontline.joinGroupChats;
          base.chat.frontlineCanShareFiles = !!chat.frontline.shareFiles;
          base.chat.frontlineCanForwardMessages = !!chat.frontline.forwardMessage;
        }
        if (chat.support) {
          base.chat.supportCanInitiate1v1 = !!chat.support.init1v1;
          base.chat.supportCanCreateGroups = !!chat.support.createGroup;
          base.chat.supportCanJoinGroups = !!chat.support.joinGroupChats;
          base.chat.supportCanShareFiles = !!chat.support.shareFiles;
          base.chat.supportCanForwardMessages = !!chat.support.forwardMessage;
        }
        if (chat.supervisor) {
          base.chat.supervisorCanCreateGroups = !!chat.supervisor.createGroup;
          base.chat.supervisorCanShareFiles = !!chat.supervisor.shareFiles;
          base.chat.supervisorCanForwardMessages = !!chat.supervisor.forwardMessage;
        }
      }
      
      // Handle Broadcast settings
      if (item && item.broadcast) {
        const b = item.broadcast;
        console.log('Processing broadcast settings:', b);
        
        if (b.General) {
          base.broadcast.requireApprovalForBroadcast = !!b.General.ApprovalforBroadcast;
          base.broadcast.allowScheduledBroadcasts = !!b.General.ScheduleBroadcast;
          base.broadcast.allowPriorityBroadcasts = !!b.General.PriorityBroadcast;
          if (b.General.Retention != null) base.broadcast.broadcastRetentionDays = Number(b.General.Retention) || base.broadcast.broadcastRetentionDays;
        }
        if (b.general) {
          base.broadcast.requireApprovalForBroadcast = !!b.general.approvalforBroadcast;
          base.broadcast.allowScheduledBroadcasts = !!b.general.scheduleBroadcast;
          base.broadcast.allowPriorityBroadcasts = !!b.general.priorityBroadcast;
          if (b.general.retention != null) base.broadcast.broadcastRetentionDays = Number(b.general.retention) || base.broadcast.broadcastRetentionDays;
        }
        if (b.Frontline) {
          base.broadcast.frontlineCanCreateBroadcast = !!b.Frontline.CreateBroadcasts;
          base.broadcast.frontlineCanReplyToBroadcast = !!b.Frontline.ReplyToBroadcasts;
        }
        if (b.frontline) {
          base.broadcast.frontlineCanCreateBroadcast = !!b.frontline.createBroadcasts;
          base.broadcast.frontlineCanReplyToBroadcast = !!b.frontline.replyToBroadcasts;
        }
        if (b.support) {
          base.broadcast.supportCanCreateBroadcast = !!b.support.CreateBroadcasts || !!b.support.createBroadcasts;
          base.broadcast.supportCanReplyToBroadcast = !!b.support.ReplyToBroadcasts || !!b.support.replyToBroadcasts;
        }
        if (b.supervisor) {
          base.broadcast.supervisorCanCreateBroadcast = !!b.supervisor.CreateBroadcasts || !!b.supervisor.createBroadcasts;
        }
      }
    }

    console.log('Parsed rules result:', base);
    return base;
  };

  const mapBackendToOU = (row: any): OrganizationUnit & { children?: OrganizationUnit[] } => {
    const created = row?.tcreatedat ? new Date(row.tcreatedat) : new Date();
    const isActive = row?.bisActive !== undefined ? !!row.bisActive : true;
    
    console.log('Mapping backend OU:', {
      id: row?.ouid || row?.did,
      name: row?.dname,
      jsSettings: row?.jsSettings,
      membercount: row?.membercount,
      bisActive: row?.bisActive,
      children: row?.children
    });
    
    const rules = parseJsSettingsToRules(row?.jsSettings);
    
    const mappedOU: OrganizationUnit & { children?: OrganizationUnit[] } = {
      id: String(row?.ouid || row?.did || Date.now()),
      name: row?.dname || 'Unknown',
      description: row?.ddescription || '',
      parentId: row?.dparentouid ? String(row.dparentouid) : null,
      memberCount: Number(row?.membercount) || 0,
      location: row?.dLocation || row?.dlocation || '',
      createdAt: created,
      modifiedAt: row?.tmodifiedat ? new Date(row.tmodifiedat) : created,
      status: isActive ? 'active' : 'inactive',
      rules,
      // Store original jsSettings for tab determination
      _originalJsSettings: row?.jsSettings,
      // Map children recursively if they exist
      children: row?.children && Array.isArray(row.children) 
        ? row.children.map(mapBackendToOU)
        : []
    };
    
    console.log('Mapped OU result:', mappedOU);
    return mappedOU;
  };


  const loadLists = async () => {
    isLoading = true;
    loadError = '';
    try {
      const [activeRes, inactiveRes] = await Promise.all([
        getActiveOUs({ start: 0, limit: 50, sort: 'ASC', sortby: 'dname' }),
        getInactiveOUs({ start: 0, limit: 50, sort: 'ASC', sortby: 'dname' })
      ]);

      if (!activeRes.success) {
        throw new Error(activeRes.error || 'Failed to fetch active OUs');
      }
      if (!inactiveRes.success) {
        throw new Error(inactiveRes.error || 'Failed to fetch inactive OUs');
      }

      const activeRows = (activeRes.data as any)?.data || [];
      const inactiveRows = (inactiveRes.data as any)?.data || [];

      activeList = activeRows.map(mapBackendToOU);
      inactiveList = inactiveRows.map(mapBackendToOU);
      
      organizationUnits = currentTab === 'active' ? activeList : inactiveList;
    } catch (e) {
      console.error('Error loading organization units:', e);
      loadError = e instanceof Error ? e.message : 'Failed to load organization units';
    } finally {
      isLoading = false;
    }
  };

  onMount(() => {
    loadLists();
  });

  let newOU = $state({
    name: '',
    description: '',
    location: '',
    rules: {
      chat: {
        frontlineCanInitiate1v1: true,
        frontlineCanCreateGroups: false,
        frontlineCanJoinGroups: true,
        frontlineCanShareFiles: false,
        frontlineCanForwardMessages: false,
        supportCanInitiate1v1: true,
        supportCanCreateGroups: false,
        supportCanJoinGroups: true,
        supportCanShareFiles: true,
        supportCanForwardMessages: true,
        supervisorCanCreateGroups: true,
        supervisorCanShareFiles: true,
        supervisorCanForwardMessages: true,
        managerCanAccessAllGroups: true,
        managerCanShareFiles: true,
        managerCanForwardMessages: true,
        allowFileSharing: true,
        allowEmojis: true,
        messageRetentionDays: 365,
        maxFileSize: 10,
        allowedFileTypes: false,
        maxGroupSize: 50,
        messageEditWindow: 15,
        pinnedMessages: {
          enabled: true,
          maxPinnedPerConversation: 10
        }
      },
      broadcast: {
        frontlineCanCreateBroadcast: false,
        frontlineCanReplyToBroadcast: true,
        supportCanCreateBroadcast: false,
        supportCanReplyToBroadcast: true,
        supervisorCanCreateBroadcast: true,
        managerCanCreateBroadcast: true,
        requireApprovalForBroadcast: false,
        allowScheduledBroadcasts: true,
        allowPriorityBroadcasts: true,
        broadcastRetentionDays: 365,
        requireAcknowledgment: true,
        acknowledgmentReminders: true,
        reminderInterval: 1440,
        maxBroadcastTargets: 1000
      }
    }
  });

  // Computed values
  const tabCounts = $derived.by(() => {
    const matches = (list: OrganizationUnit[]) => {
      if (!searchQuery) return list.length;
      const q = searchQuery.toLowerCase();
      return list.filter(ou =>
        ou.name.toLowerCase().includes(q) ||
        ou.description.toLowerCase().includes(q) ||
        ou.location.toLowerCase().includes(q)
      ).length;
    };
    return {
      active: matches(activeList),
      inactive: matches(inactiveList)
    };
  });

  // Build hierarchical structure - now uses children from API
  const hierarchicalOUs = $derived.by(() => {
    const currentList = currentTab === 'active' ? activeList : inactiveList;
    
    // Filter by search if needed
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      
      // Recursive function to filter OUs and their children
      const filterOUWithChildren = (ou: OrganizationUnit & { children?: OrganizationUnit[] }): (OrganizationUnit & { children?: OrganizationUnit[] }) | null => {
        const matchesSearch = ou.name.toLowerCase().includes(searchLower) ||
          ou.description.toLowerCase().includes(searchLower) ||
          ou.location.toLowerCase().includes(searchLower);
        
        // Filter children recursively
        const filteredChildren = ou.children?.map(filterOUWithChildren).filter((child): child is OrganizationUnit & { children?: OrganizationUnit[] } => child !== null) || [];
        
        // Include OU if it matches search OR if any of its children match
        if (matchesSearch || filteredChildren.length > 0) {
          return {
            ...ou,
            children: filteredChildren
          };
        }
        
        return null;
      };
      
      // Only return root nodes (those without parentId) and filter them
      return currentList
        .filter(ou => !ou.parentId) // Only root nodes
        .map(filterOUWithChildren)
        .filter((ou): ou is OrganizationUnit & { children?: OrganizationUnit[] } => ou !== null);
    }

    // No search - return only root nodes with their children intact
    return currentList.filter(ou => !ou.parentId) as (OrganizationUnit & { children?: OrganizationUnit[] })[];
  });

  // Helper function to show notifications
  const showNotification = (type: 'success' | 'error' | 'info', title: string, message: string, onClose?: () => void) => {
    // Clear any existing timer
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    
    notificationData = { type, title, message, onClose };
    showNotificationModal = true;
    timerProgress = 100;
    
    // Start 3-second countdown timer
    const startTime = Date.now();
    const duration = 3000; // 3 seconds
    
    timerInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, duration - elapsed);
      timerProgress = (remaining / duration) * 100;
      
      if (remaining <= 0) {
        closeNotification();
      }
    }, 16); // ~60fps updates
  };

  const closeNotification = () => {
    // Clear timer
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    
    showNotificationModal = false;
    if (notificationData?.onClose) {
      notificationData.onClose();
    }
    notificationData = null;
    timerProgress = 100;
  };

  // Functions
  const createOU = async () => {
    if (newOU.name.trim() && newOU.description.trim()) {
      // Clear previous messages
      apiError = '';
      apiSuccess = '';
      isCreatingOU = true;

      try {
        // Transform frontend data to backend API format
        // Send BOTH Chat and broadcast settings (new requirement)
        const apiData = transformOUDataForAPI(
          newOU,
          parentOUForNewChild?.id // Pass parent ID if creating a child OU
        );
        
        console.log('Sending API data:', apiData);
        
        // Call the API
        const result = await createOUAPI(apiData);
        
        if (result.success) {
          // Show success message
          apiSuccess = result.message || 'Organization Unit created successfully!';
          
          // Reset form
          resetNewOUForm();
          
          // Reload the data to get the updated hierarchy with the new OU
          await loadLists();
          
          // Close modal after a short delay to show success message
          setTimeout(() => {
            showCreateModal = false;
            apiSuccess = '';
            parentOUForNewChild = null;
          }, 2000);
          
        } else {
          // Handle API error
          apiError = result.error || 'Failed to create Organization Unit';
        }
      } catch (error) {
        console.error('Error creating OU:', error);
        apiError = 'Network error: Failed to create Organization Unit';
      } finally {
        isCreatingOU = false;
      }
    }
  };

  // Helper function to reset the form
  const resetNewOUForm = () => {
    newOU = {
      name: '',
      description: '',
      location: '',
      rules: {
        chat: {
          frontlineCanInitiate1v1: true,
          frontlineCanCreateGroups: false,
          frontlineCanJoinGroups: true,
          frontlineCanShareFiles: false,
          frontlineCanForwardMessages: false,
          supportCanInitiate1v1: true,
          supportCanCreateGroups: false,
          supportCanJoinGroups: true,
          supportCanShareFiles: true,
          supportCanForwardMessages: true,
          supervisorCanCreateGroups: true,
          supervisorCanShareFiles: true,
          supervisorCanForwardMessages: true,
          managerCanAccessAllGroups: true,
          managerCanShareFiles: true,
          managerCanForwardMessages: true,
          allowFileSharing: true,
          allowEmojis: true,
          messageRetentionDays: 365,
          maxFileSize: 10,
          allowedFileTypes: false,
          maxGroupSize: 50,
          messageEditWindow: 15,
          pinnedMessages: {
            enabled: true,
            maxPinnedPerConversation: 10
          }
        },
        broadcast: {
          frontlineCanCreateBroadcast: false,
          frontlineCanReplyToBroadcast: true,
          supportCanCreateBroadcast: false,
          supportCanReplyToBroadcast: true,
          supervisorCanCreateBroadcast: true,
          managerCanCreateBroadcast: true,
          requireApprovalForBroadcast: false,
          allowScheduledBroadcasts: true,
          allowPriorityBroadcasts: true,
          broadcastRetentionDays: 365,
          requireAcknowledgment: true,
          acknowledgmentReminders: true,
          reminderInterval: 1440,
          maxBroadcastTargets: 1000
        }
      }
    };
  };

  // Helper function to determine which tab should be active based on jsSettings
  const determinePrimarySettingsTab = (jsSettings: any): 'chat' | 'broadcast' => {
    if (!jsSettings) return 'chat'; // default to chat
    
    const arr = Array.isArray(jsSettings) ? jsSettings : [jsSettings];
    
    // Check if any item has broadcast settings
    const hasBroadcast = arr.some(item => item && item.broadcast);
    const hasChat = arr.some(item => item && (item.Chat || item.chat));
    
    console.log('Settings analysis:', { hasBroadcast, hasChat, jsSettings });
    
    // If only broadcast settings exist, show broadcast tab
    if (hasBroadcast && !hasChat) {
      return 'broadcast';
    }
    
    // If both exist, check which has more substantial settings
    if (hasBroadcast && hasChat) {
      // Count non-default broadcast settings
      let broadcastSettingsCount = 0;
      let chatSettingsCount = 0;
      
      arr.forEach(item => {
        if (item.broadcast) {
          if (item.broadcast.general) broadcastSettingsCount += Object.keys(item.broadcast.general).length;
          if (item.broadcast.frontline) broadcastSettingsCount += Object.keys(item.broadcast.frontline).length;
          if (item.broadcast.support) broadcastSettingsCount += Object.keys(item.broadcast.support).length;
          if (item.broadcast.supervisor) broadcastSettingsCount += Object.keys(item.broadcast.supervisor).length;
        }
        
        if (item.Chat || item.chat) {
          const chatSettings = item.Chat || item.chat;
          if (chatSettings.General || chatSettings.general) chatSettingsCount += Object.keys(chatSettings.General || chatSettings.general).length;
          if (chatSettings.Frontline || chatSettings.frontline) chatSettingsCount += Object.keys(chatSettings.Frontline || chatSettings.frontline).length;
          if (chatSettings.support) chatSettingsCount += Object.keys(chatSettings.support).length;
          if (chatSettings.supervisor) chatSettingsCount += Object.keys(chatSettings.supervisor).length;
        }
      });
      
      console.log('Settings count:', { broadcastSettingsCount, chatSettingsCount });
      
      // If broadcast has more settings, show broadcast tab
      if (broadcastSettingsCount > chatSettingsCount) {
        return 'broadcast';
      }
    }
    
    // Default to chat
    return 'chat';
  };

  const editOUFunction = (ou: OrganizationUnit) => {
    selectedOU = ou;
    
    // Determine which tab should be active based on original jsSettings
    const primaryTab = determinePrimarySettingsTab(ou._originalJsSettings);
    activeRulesTab = primaryTab;
    
    console.log('Setting active tab to:', primaryTab, 'based on jsSettings:', ou._originalJsSettings);
    
    // Deep copy the rules to ensure all nested properties are properly copied
    editOU = {
      name: ou.name,
      description: ou.description,
      location: ou.location,
      status: ou.status,
      rules: {
        chat: {
          frontlineCanInitiate1v1: ou.rules.chat.frontlineCanInitiate1v1,
          frontlineCanCreateGroups: ou.rules.chat.frontlineCanCreateGroups,
          frontlineCanJoinGroups: ou.rules.chat.frontlineCanJoinGroups,
          frontlineCanShareFiles: ou.rules.chat.frontlineCanShareFiles,
          frontlineCanForwardMessages: ou.rules.chat.frontlineCanForwardMessages,
          supportCanInitiate1v1: ou.rules.chat.supportCanInitiate1v1,
          supportCanCreateGroups: ou.rules.chat.supportCanCreateGroups,
          supportCanJoinGroups: ou.rules.chat.supportCanJoinGroups,
          supportCanShareFiles: ou.rules.chat.supportCanShareFiles,
          supportCanForwardMessages: ou.rules.chat.supportCanForwardMessages,
          supervisorCanCreateGroups: ou.rules.chat.supervisorCanCreateGroups,
          supervisorCanShareFiles: ou.rules.chat.supervisorCanShareFiles,
          supervisorCanForwardMessages: ou.rules.chat.supervisorCanForwardMessages,
          managerCanAccessAllGroups: ou.rules.chat.managerCanAccessAllGroups,
          managerCanShareFiles: ou.rules.chat.managerCanShareFiles,
          managerCanForwardMessages: ou.rules.chat.managerCanForwardMessages,
          allowFileSharing: ou.rules.chat.allowFileSharing,
          allowEmojis: ou.rules.chat.allowEmojis,
          messageRetentionDays: ou.rules.chat.messageRetentionDays,
          maxFileSize: ou.rules.chat.maxFileSize,
          allowedFileTypes: ou.rules.chat.allowedFileTypes,
          maxGroupSize: ou.rules.chat.maxGroupSize,
          messageEditWindow: ou.rules.chat.messageEditWindow,
          pinnedMessages: {
            enabled: ou.rules.chat.pinnedMessages.enabled,
            maxPinnedPerConversation: ou.rules.chat.pinnedMessages.maxPinnedPerConversation
          }
        },
        broadcast: {
          frontlineCanCreateBroadcast: ou.rules.broadcast.frontlineCanCreateBroadcast,
          frontlineCanReplyToBroadcast: ou.rules.broadcast.frontlineCanReplyToBroadcast,
          supportCanCreateBroadcast: ou.rules.broadcast.supportCanCreateBroadcast,
          supportCanReplyToBroadcast: ou.rules.broadcast.supportCanReplyToBroadcast,
          supervisorCanCreateBroadcast: ou.rules.broadcast.supervisorCanCreateBroadcast,
          managerCanCreateBroadcast: ou.rules.broadcast.managerCanCreateBroadcast,
          requireApprovalForBroadcast: ou.rules.broadcast.requireApprovalForBroadcast,
          allowScheduledBroadcasts: ou.rules.broadcast.allowScheduledBroadcasts,
          allowPriorityBroadcasts: ou.rules.broadcast.allowPriorityBroadcasts,
          broadcastRetentionDays: ou.rules.broadcast.broadcastRetentionDays,
          requireAcknowledgment: ou.rules.broadcast.requireAcknowledgment,
          acknowledgmentReminders: ou.rules.broadcast.acknowledgmentReminders,
          reminderInterval: ou.rules.broadcast.reminderInterval,
          maxBroadcastTargets: ou.rules.broadcast.maxBroadcastTargets
        }
      }
    };
    
    console.log('Edit OU - Original OU rules:', ou.rules);
    console.log('Edit OU - Copied editOU rules:', editOU.rules);
    
    showEditModal = true;
  };

  const saveEditOU = async () => {
    if (!selectedOU || !editOU) return;
    
    if (editOU.name?.trim() && editOU.description?.trim()) {
      try {
        // Build backend changes payload using the proper update transformation
        const changes = transformOUDataForUpdate({
          name: editOU.name!.trim(),
          description: editOU.description!.trim(),
          location: editOU.location?.trim() || '',
          rules: editOU.rules
        } as any);

        // Add status change if needed
        if (editOU.status) {
          changes.isactive = editOU.status === 'active';
        }

        console.log('Updating OU with data:', { id: selectedOU.id, changes });

        const res = await updateOUAPI({ id: selectedOU.id, changes });
        if (!res.success) {
          showNotification('error', 'Update Failed', res.error || 'Failed to update Organization Unit');
          return;
        }

        // Reload the data to get the updated information
        await loadLists();
        
        showEditModal = false;
        editOU = null;
        selectedOU = null;
        showNotification('success', 'Success!', 'Organization Unit updated successfully!');
      } catch (error) {
        console.error('Error updating OU:', error);
        showNotification('error', 'Network Error', 'Failed to update Organization Unit. Please check your connection.');
      }
    }
  };  const confirmDeleteOU = (ou: OrganizationUnit) => {
    selectedOU = ou;
    actionConfirm = {
      message: `Are you sure you want to delete "${ou.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      action: () => {
        if (selectedOU) {
          organizationUnits = organizationUnits.filter(u => u.id !== selectedOU!.id);
          showConfirmationModal = false;
          selectedOU = null;
          actionConfirm = null;
          showNotification('success', 'Deleted!', 'Organization Unit deleted successfully!');
        }
      }
    };
    showConfirmationModal = true;
  };

  const executeConfirmedAction = () => {
    if (actionConfirm) {
      actionConfirm.action();
    }
  };



  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  const toggleRule = (category: 'chat' | 'broadcast', rule: string, isEdit = false) => {
    const target = isEdit ? editOU : newOU;
    if (category === 'chat') {
      // @ts-ignore
      target.rules.chat[rule] = !target.rules.chat[rule];
    } else {
      // @ts-ignore
      target.rules.broadcast[rule] = !target.rules.broadcast[rule];
    }
  };

  // Tab change function
  const changeTab = async (tab: string) => {
    if (currentTab === tab) return; // No need to change if same tab
    
    currentTab = tab;
    selectedOU = null; // Clear selection when switching tabs
    organizationUnits = currentTab === 'active' ? activeList : inactiveList;
    
    // If we don't have data for this tab yet, load it
    if ((tab === 'active' && activeList.length === 0) || (tab === 'inactive' && inactiveList.length === 0)) {
      await loadLists();
    }
  };

  // Directory navigation functions
  const toggleExpand = (ouId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(ouId)) {
      newExpanded.delete(ouId);
    } else {
      newExpanded.add(ouId);
    }
    expandedNodes = newExpanded;
  };

  const selectOU = (ou: OrganizationUnit) => {
    selectedOU = ou;
  };

  // Deactivate function (instead of delete)
  const confirmDeactivateOU = (ou: OrganizationUnit) => {
    actionConfirm = {
      message: `Are you sure you want to deactivate "${ou.name}"? This will make it inactive but preserve all data.`,
      confirmText: 'Deactivate',
      action: () => deactivateOU(ou.id)
    };
    showConfirmationModal = true;
  };

  const deactivateOU = async (ouId: string) => {
    try {
      const res = await deactivateOUAPI(ouId);
      if (!res.success) throw new Error(res.error || 'Failed');
      const found = activeList.find(ou => ou.id === ouId);
      if (found) {
        const updated = { ...found, status: 'inactive' as const, modifiedAt: new Date() };
        activeList = activeList.filter(ou => ou.id !== ouId);
        inactiveList = [updated, ...inactiveList];
        organizationUnits = currentTab === 'active' ? activeList : inactiveList;
      }
      showNotification('success', 'Deactivated!', 'Organization Unit deactivated successfully!');
    } catch (e) {
      console.error(e);
      showNotification('error', 'Deactivation Failed', 'Failed to deactivate Organization Unit.');
    } finally {
      showConfirmationModal = false;
      selectedRows = new Set();
    }
  };

  // Reactivate function
  const reactivateOU = async (ouId: string) => {
    try {
      const res = await reactivateOUAPI(ouId);
      if (!res.success) throw new Error(res.error || 'Failed');
      
      // Move from inactive to active list
      const found = inactiveList.find(ou => ou.id === ouId);
      if (found) {
        const updated = { ...found, status: 'active' as const, modifiedAt: new Date() };
        inactiveList = inactiveList.filter(ou => ou.id !== ouId);
        activeList = [updated, ...activeList];
        organizationUnits = currentTab === 'inactive' ? inactiveList : activeList;
      }
      showNotification('success', 'Reactivated!', 'Organization Unit reactivated successfully!');
    } catch (e) {
      console.error(e);
      showNotification('error', 'Reactivation Failed', 'Failed to reactivate Organization Unit.');
    }
  };
</script>

<!-- Tree Node Component -->
{#snippet ouTreeNode(ou: OrganizationUnit & { children?: OrganizationUnit[] }, depth: number)}
  <div class="w-full relative">
    <div 
      class="flex items-center py-2 px-2 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors {selectedOU?.id === ou.id ? 'bg-blue-50 border-l-4 border-[#01c0a4]' : ''}"
      style="margin-left: {depth * 16}px"
      onclick={() => selectOU(ou)}
    >
      <!-- Dropdown Arrow for Parent OUs -->
      {#if ou.children && ou.children.length > 0}
        <button
          onclick={(e) => { e.stopPropagation(); toggleExpand(ou.id); }}
          class="mr-2 p-1 rounded hover:bg-gray-200 transition-all duration-200 flex items-center justify-center"
          title={expandedNodes.has(ou.id) ? 'Collapse children' : 'Expand children'}
          aria-label={expandedNodes.has(ou.id) ? 'Collapse children' : 'Expand children'}
        >
          <div class="transform transition-transform duration-200 {expandedNodes.has(ou.id) ? 'rotate-90' : 'rotate-0'}">
            <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </div>
        </button>
      {:else}
        <div class="w-6 h-6 mr-2"></div>
      {/if}

      <!-- OU Icon and Info -->
      <div class="flex items-center space-x-2 flex-1 min-w-0">
        <div class="h-6 w-6 rounded bg-gradient-to-r from-[#01c0a4] to-[#00a085] flex items-center justify-center flex-shrink-0">
          <Building2 class="w-3 h-3 text-white" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-gray-900 truncate flex items-center">
            {ou.name}
            {#if ou.children && ou.children.length > 0}
              <span class="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {ou.children.length} {ou.children.length === 1 ? 'child' : 'children'}
              </span>
            {/if}
          </div>
          {#if ou.memberCount > 0}
            <div class="text-xs text-gray-500">{ou.memberCount} members</div>
          {/if}
        </div>
        <div class="flex-shrink-0 flex items-center space-x-2">
          <!-- Status Indicator -->
          <span class="w-2 h-2 rounded-full {ou.status === 'active' ? 'bg-green-400' : 'bg-red-400'}"></span>
          
          <!-- Additional Dropdown Indicator for Parent OUs -->
          {#if ou.children && ou.children.length > 0}
            <div class="text-xs text-gray-400 font-medium">
              {expandedNodes.has(ou.id) ? 'Expanded' : 'Collapsed'}
            </div>
          {/if}
        </div>
      </div>
    </div>

    <!-- Dropdown Children Container -->
    {#if ou.children && ou.children.length > 0}
      <div class="transition-all duration-300 ease-in-out overflow-hidden {expandedNodes.has(ou.id) ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'}">
        <div class="border-l-2 border-gray-200 ml-4" style="margin-left: {depth * 16 + 16}px">
          {#each ou.children as child}
            <div class="relative">
              <!-- Connection line -->
              <div class="absolute left-0 top-0 w-4 h-6 border-b-2 border-gray-200"></div>
              <div class="pl-6">
                {@render ouTreeNode(child, depth + 1)}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
{/snippet}

<svelte:head>
  <title>OU Management - Admin Controls</title>
</svelte:head>

<div class="p-6 bg-gray-50 min-h-screen space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between fade-in">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 mb-1">Organization Unit Management</h1>
      <p class="text-sm text-gray-600">Manage organizational structure and communication policies</p>
    </div>
  </div>

  <!-- Main Layout: Directory + Details -->
  <div class="collaboration-card fade-in">
    <div class="flex h-[calc(100vh-200px)]">
      <!-- Left Side: Directory Tree -->
      <div class="w-1/4 border-r border-gray-200 flex flex-col">
        <!-- Header with Search and Create Button -->
        <div class="p-4 border-b border-gray-200 bg-gray-50">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-900">Organization Units</h3>
            <button
              onclick={() => { parentOUForNewChild = null; showCreateModal = true; }}
              class="primary-button flex items-center space-x-2 text-sm px-3 py-2"
            >
              <Plus class="w-4 h-4" />
              <span>Create OU</span>
            </button>
          </div>
          
          <div class="relative mb-4">
            <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              bind:value={searchQuery}
              type="text"
              placeholder="Search organization units..."
              class="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent text-sm"
            />
          </div>

          <!-- Tabs -->
          <div class="grid grid-cols-2 gap-1">
            <button
              onclick={() => changeTab('active')}
              class="flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors {currentTab === 'active' ? 'bg-[#01c0a4] text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}"
            >
              <Building2 class="w-4 h-4" />
              <span>Activated ({tabCounts.active})</span>
            </button>

            <button
              onclick={() => changeTab('inactive')}
              class="flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors {currentTab === 'inactive' ? 'bg-[#01c0a4] text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}"
            >
              <X class="w-4 h-4" />
              <span>Deactivated ({tabCounts.inactive})</span>
            </button>
          </div>
        </div>

        <!-- Directory Tree -->
        <div class="flex-1 overflow-y-auto p-4">
          {#if isLoading}
            <div class="text-center py-8">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#01c0a4] mx-auto mb-3"></div>
              <p class="text-gray-500 text-sm">Loading organization units...</p>
            </div>
          {:else if loadError}
            <div class="text-center py-8">
              <div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                <svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <p class="text-red-600 text-sm mb-2">Error loading organization units</p>
              <p class="text-gray-500 text-xs mb-3">{loadError}</p>
              <button 
                onclick={loadLists}
                class="text-sm px-3 py-1 bg-[#01c0a4] text-white rounded hover:bg-[#00a085] transition-colors"
              >
                Retry
              </button>
            </div>
          {:else}
            {#each hierarchicalOUs as ou}
              {@render ouTreeNode(ou, 0)}
            {/each}

            {#if hierarchicalOUs.length === 0}
              <div class="text-center py-8">
                <Building2 class="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p class="text-gray-500 text-sm">
                  {searchQuery ? 'No units match your search.' : 'No organization units found.'}
                </p>
              </div>
            {/if}
          {/if}
        </div>
      </div>

      <!-- Right Side: Details Panel -->
      <div class="w-3/4 flex flex-col">
        {#if selectedOU}
          <!-- Check if this OU has children to determine view type -->
          {@const currentList = currentTab === 'active' ? activeList : inactiveList}
          {@const hasChildren = selectedOU ? currentList.some(ou => ou.parentId === selectedOU!.id) : false}
          
          <!-- OU Header -->
          <div class="p-6 border-b border-gray-200 bg-gray-50">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-4">
                <div class="h-12 w-12 rounded-lg bg-gradient-to-r from-[#01c0a4] to-[#00a085] flex items-center justify-center">
                  <Building2 class="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 class="text-xl font-bold text-gray-900">{selectedOU.name}</h2>
                  <p class="text-gray-600">{selectedOU.description}</p>
                </div>
              </div>
              
              <div class="flex items-center space-x-2">
                {#if hasChildren}
                  <button
                    onclick={() => showParentDetailsModal = true}
                    class="flex items-center space-x-1 px-3 py-1.5 bg-blue-400 text-white rounded-lg hover:bg-blue-500 transition-colors text-sm"
                  >
                    <FileText class="w-3 h-3" />
                    <span>Details</span>
                  </button>
                {/if}
              </div>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto">
            {#if hasChildren}
              <!-- Parent OU View: Show Children in Table -->
              <div class="p-6">
                <div class="mb-6">
                  <p class="text-sm text-gray-600">Handles day-to-day office operations, procurement, facility management, and administrative support.</p>
                </div>
                
                <div class="bg-white rounded-lg border border-gray-200">
                  <div class="px-6 py-4 border-b border-gray-200">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center space-x-2">
                        <h3 class="text-lg font-semibold text-gray-900">Sub-Organization Units</h3>
                      </div>
                      <button
                        onclick={() => { if (selectedOU) { parentOUForNewChild = selectedOU; showCreateModal = true; } }}
                        class="flex items-center space-x-2 px-3 py-1.5 bg-[#01c0a4] text-white rounded-lg hover:bg-[#00a085] transition-colors text-sm"
                      >
                        <Plus class="w-3 h-3" />
                        <span>Add Child OU</span>
                      </button>
                    </div>
                  </div>
                  
                  <div class="overflow-x-auto">
                    <table class="w-full">
                      <thead class="bg-gray-50">
                        <tr>
                          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Members</th>
                          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-gray-200">
                        {#each currentList.filter(ou => selectedOU && ou.parentId === selectedOU.id) as childOU}
                          <tr class="hover:bg-gray-50">
                            <td class="px-6 py-4">
                              <div class="flex items-center space-x-3">
                                <div class="h-8 w-8 rounded bg-gradient-to-r from-[#01c0a4] to-[#00a085] flex items-center justify-center">
                                  <Building2 class="w-4 h-4 text-white" />
                                </div>
                                <div>
                                  <div class="text-sm font-medium text-gray-900">{childOU.name}</div>
                                  <div class="text-sm text-gray-500">{childOU.location || 'No location specified'}</div>
                                </div>
                              </div>
                            </td>
                            <td class="px-6 py-4">
                              <div class="flex items-center space-x-1">
                                <Users class="w-3 h-3 text-gray-400" />
                                <span class="text-sm text-gray-900">{childOU.memberCount}</span>
                              </div>
                            </td>
                            <td class="px-6 py-4">
                              <span class="px-2 py-1 text-xs font-medium rounded-full {childOU.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                {childOU.status === 'active' ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td class="px-6 py-4">
                              <span class="text-sm text-gray-600">Organization Unit</span>
                            </td>
                            <td class="px-6 py-4">
                              <div class="flex items-center space-x-2">
                                <!-- Details Button - Calm blue style -->
                                <button
                                  onclick={() => selectOU(childOU)}
                                  class="px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 hover:text-blue-800 text-sm font-medium rounded-lg transition-all duration-200 border border-blue-200 hover:border-blue-300"
                                >
                                  Details
                                </button>
                                <!-- Edit Button - Compact with icon -->
                                <button
                                  onclick={() => editOUFunction(childOU)}
                                  class="group flex items-center space-x-1.5 px-3 py-1.5 bg-[#01c0a4]/10 text-[#01c0a4] hover:bg-[#01c0a4] hover:text-white text-sm font-medium rounded-lg transition-all duration-200"
                                >
                                  <Edit class="w-3 h-3 group-hover:scale-110 transition-transform duration-200" />
                                  <span>Edit</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        {/each}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            {:else}
              <!-- Child OU View: Show Detailed Configuration -->
              <div class="p-6">
                <!-- Basic Information -->
                <div class="grid grid-cols-2 gap-6 mb-8">
                  <div class="space-y-4">
                    <div>
                      <label class="block text-sm font-medium text-gray-500 mb-1">Location</label>
                      <div class="flex items-center space-x-2">
                        <MapPin class="w-4 h-4 text-gray-400" />
                        <span class="text-gray-900">{selectedOU.location || 'Not specified'}</span>
                      </div>
                    </div>
                    
                    <div>
                      <label class="block text-sm font-medium text-gray-500 mb-1">Members</label>
                      <div class="flex items-center space-x-2">
                        <Users class="w-4 h-4 text-gray-400" />
                        <span class="text-gray-900">{selectedOU.memberCount} people</span>
                      </div>
                    </div>
                  </div>
                  
                  <div class="space-y-4">
                    <div>
                      <label class="block text-sm font-medium text-gray-500 mb-1">Created</label>
                      <span class="text-gray-900">{formatDate(selectedOU.createdAt)}</span>
                    </div>
                    
                    <div>
                      <label class="block text-sm font-medium text-gray-500 mb-1">Last Modified</label>
                      <span class="text-gray-900">{formatDate(selectedOU.modifiedAt)}</span>
                    </div>
                  </div>
                </div>

                <!-- Rules & Policies Preview -->
                <div class="mb-8">
                  <h3 class="text-lg font-semibold text-gray-900 mb-4">Rules & Policies</h3>
                  <div class="grid grid-cols-2 gap-4">
                    <div class="bg-gray-50 p-4 rounded-lg">
                      <div class="flex items-center space-x-2 mb-2">
                        <MessageCircle class="w-4 h-4 text-[#01c0a4]" />
                        <span class="font-medium text-gray-900">Chat Permissions</span>
                      </div>
                      <div class="space-y-1 text-sm text-gray-600">
                        <div>File Sharing: {selectedOU.rules.chat.allowFileSharing ? 'Enabled' : 'Disabled'}</div>
                        <div>Group Creation: {selectedOU.rules.chat.frontlineCanCreateGroups ? 'All Users' : 'Restricted'}</div>
                        <div>Message Retention: {selectedOU.rules.chat.messageRetentionDays} days</div>
                      </div>
                    </div>
                    
                    <div class="bg-gray-50 p-4 rounded-lg">
                      <div class="flex items-center space-x-2 mb-2">
                        <Radio class="w-4 h-4 text-[#01c0a4]" />
                        <span class="font-medium text-gray-900">Broadcast Permissions</span>
                      </div>
                      <div class="space-y-1 text-sm text-gray-600">
                        <div>Create Broadcasts: {selectedOU.rules.broadcast.frontlineCanCreateBroadcast ? 'All Users' : 'Restricted'}</div>
                        <div>Approval Required: {selectedOU.rules.broadcast.requireApprovalForBroadcast ? 'Yes' : 'No'}</div>
                        <div>Retention: {selectedOU.rules.broadcast.broadcastRetentionDays} days</div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Actions -->
                <div class="border-t border-gray-200 pt-6">
                  <div class="flex justify-end gap-3">
                    <button
                      onclick={() => selectedOU && confirmDeleteOU(selectedOU)}
                      class="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Trash2 class="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                    
                    {#if selectedOU.status === 'active'}
                      <button
                        onclick={() => selectedOU && confirmDeactivateOU(selectedOU)}
                        class="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                      >
                        <X class="w-4 h-4" />
                        <span>Deactivate</span>
                      </button>
                    {:else}
                      <button
                        onclick={() => selectedOU && reactivateOU(selectedOU.id)}
                        class="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <UserCheck class="w-4 h-4" />
                        <span>Reactivate</span>
                      </button>
                    {/if}
                    
                    <button
                      onclick={() => selectedOU && editOUFunction(selectedOU)}
                      class="flex items-center space-x-2 px-4 py-2 bg-[#01c0a4] text-white rounded-lg hover:bg-[#00a085] transition-colors"
                    >
                      <Edit class="w-4 h-4" />
                      <span>Edit Details</span>
                    </button>
                    
                    <button
                      onclick={() => { if (selectedOU) { parentOUForNewChild = selectedOU; showCreateModal = true; } }}
                      class="flex items-center space-x-2 px-4 py-2 bg-[#01c0a4] text-white rounded-lg hover:bg-[#00a085] transition-colors"
                    >
                      <Plus class="w-4 h-4" />
                      <span>Add Child OU</span>
                    </button>
                  </div>
                </div>
              </div>
            {/if}
          </div>
        {:else}
          <!-- Empty State -->
          <div class="flex-1 flex items-center justify-center">
            <div class="text-center">
              <Building2 class="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 class="text-xl font-semibold text-gray-600 mb-2">Select an Organization Unit</h3>
              <p class="text-gray-500">Choose an OU from the directory to view its details and manage settings.</p>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

<!-- Create OU Modal -->
{#if showCreateModal}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50" onclick={() => { showCreateModal = false; parentOUForNewChild = null; }}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-6xl mx-4 max-h-[90vh] overflow-hidden" onclick={(e) => e.stopPropagation()}>
      <div class="flex h-full">
        <!-- Left Side - Form -->
        <div class="w-1/2 p-6 border-r border-gray-200">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold text-gray-900">{parentOUForNewChild ? `Create Child OU under "${parentOUForNewChild.name}"` : 'Create Organization Unit'}</h2>
            <button onclick={() => { showCreateModal = false; parentOUForNewChild = null; }} class="text-gray-500 hover:text-gray-700">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <!-- Error/Success Messages -->
          {#if apiError}
            <div class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div class="flex">
                <div class="flex-shrink-0">
                  <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                  </svg>
                </div>
                <div class="ml-3">
                  <p class="text-sm text-red-800">{apiError}</p>
                </div>
              </div>
            </div>
          {/if}

          {#if apiSuccess}
            <div class="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div class="flex">
                <div class="flex-shrink-0">
                  <svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                </div>
                <div class="ml-3">
                  <p class="text-sm text-green-800">{apiSuccess}</p>
                </div>
              </div>
            </div>
          {/if}

          <!-- Parent OU Context (when creating child) -->
          {#if parentOUForNewChild}
            <div class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div class="flex items-center space-x-2">
                <Building2 class="w-4 h-4 text-blue-600" />
                <span class="text-sm font-medium text-blue-900">Parent Organization:</span>
                <span class="text-sm text-blue-800">{parentOUForNewChild.name}</span>
              </div>
              <p class="text-xs text-blue-600 mt-1">This new OU will be created as a child under the selected parent organization.</p>
            </div>
          {/if}

          <form onsubmit={(e) => { e.preventDefault(); createOU(); }} class="space-y-6">
            <div>
              <label for="name" class="block text-sm font-semibold text-gray-700 mb-2">Organization Unit Name</label>
              <input
                id="name"
                bind:value={newOU.name}
                placeholder="Enter unit name"
                required
                disabled={isCreatingOU}
                class="input-field disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label for="description" class="block text-sm font-semibold text-gray-700 mb-2">Description</label>
              <textarea
                id="description"
                bind:value={newOU.description}
                placeholder="Describe the purpose and responsibilities of this unit"
                required
                rows="3"
                disabled={isCreatingOU}
                class="input-field resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              ></textarea>
            </div>

            <div class="grid grid-cols-1 gap-4">
              <div>
                <label for="location" class="block text-sm font-semibold text-gray-700 mb-2">Location</label>
                <input
                  id="location"
                  bind:value={newOU.location}
                  placeholder="Enter location"
                  disabled={isCreatingOU}
                  class="input-field disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div class="flex space-x-3 pt-6">
              <button 
                type="submit" 
                disabled={isCreatingOU}
                class="primary-button flex-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {#if isCreatingOU}
                  <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                {:else}
                  Create Organization Unit
                {/if}
              </button>
              <button
                type="button"
                onclick={() => {
                  showCreateModal = false;
                  apiError = '';
                  apiSuccess = '';
                }}
                disabled={isCreatingOU}
                class="secondary-button flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        <!-- Right Side - Rules and Policies -->
        <div class="w-1/2 p-6 bg-gray-50">
          <h3 class="text-xl font-semibold text-gray-900 mb-6">Rules & Policies</h3>
          
          <!-- Tab Navigation -->
          <div class="flex space-x-4 mb-6">
            <button
              onclick={() => activeRulesTab = 'chat'}
              class="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors {activeRulesTab === 'chat' ? 'bg-[#01c0a4] text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}"
            >
              <MessageCircle class="w-4 h-4" />
              <span>Chat</span>
            </button>
            <button
              onclick={() => activeRulesTab = 'broadcast'}
              class="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors {activeRulesTab === 'broadcast' ? 'bg-[#01c0a4] text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}"
            >
              <Radio class="w-4 h-4" />
              <span>Broadcast</span>
            </button>
          </div>

          <!-- Chat Rules -->
          {#if activeRulesTab === 'chat'}
            <div class="space-y-4 max-h-127 overflow-y-auto">
              <div class="bg-white p-4 rounded-lg border">
                <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
                  <User class="w-4 h-4 mr-2" />
                  Frontline User Permissions
                </h4>
                <div class="space-y-3">
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can initiate 1:1 conversations</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'frontlineCanInitiate1v1')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.chat.frontlineCanInitiate1v1 ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.chat.frontlineCanInitiate1v1 ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can create group chats</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'frontlineCanCreateGroups')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.chat.frontlineCanCreateGroups ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.chat.frontlineCanCreateGroups ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can join group chats</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'frontlineCanJoinGroups')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.chat.frontlineCanJoinGroups ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.chat.frontlineCanJoinGroups ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can share files</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'frontlineCanShareFiles')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.chat.frontlineCanShareFiles ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.chat.frontlineCanShareFiles ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can forward messages</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'frontlineCanForwardMessages')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.chat.frontlineCanForwardMessages ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.chat.frontlineCanForwardMessages ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                </div>
              </div>

              <div class="bg-white p-4 rounded-lg border">
                <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
                  <User class="w-4 h-4 mr-2" />
                  Support User Permissions
                </h4>
                <div class="space-y-3">
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can initiate 1:1 conversations</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'supportCanInitiate1v1')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.chat.supportCanInitiate1v1 ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.chat.supportCanInitiate1v1 ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can create group chats</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'supportCanCreateGroups')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.chat.supportCanCreateGroups ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.chat.supportCanCreateGroups ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can join group chats</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'supportCanJoinGroups')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.chat.supportCanJoinGroups ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.chat.supportCanJoinGroups ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can share files</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'supportCanShareFiles')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.chat.supportCanShareFiles ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.chat.supportCanShareFiles ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can forward messages</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'supportCanForwardMessages')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.chat.supportCanForwardMessages ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.chat.supportCanForwardMessages ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                </div>
              </div>

              <div class="bg-white p-4 rounded-lg border">
                <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
                  <UserCheck class="w-4 h-4 mr-2" />
                  Supervisor Permissions
                </h4>
                <div class="space-y-3">
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can create group chats</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'supervisorCanCreateGroups')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.chat.supervisorCanCreateGroups ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.chat.supervisorCanCreateGroups ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can share files</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'supervisorCanShareFiles')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.chat.supervisorCanShareFiles ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.chat.supervisorCanShareFiles ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can forward messages</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'supervisorCanForwardMessages')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.chat.supervisorCanForwardMessages ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.chat.supervisorCanForwardMessages ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                </div>
              </div>

              <div class="bg-white p-4 rounded-lg border">
                <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
                  <Shield class="w-4 h-4 mr-2" />
                  Manager Permissions
                </h4>
                <div class="space-y-3">
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can access all group chats</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'managerCanAccessAllGroups')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.chat.managerCanAccessAllGroups ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.chat.managerCanAccessAllGroups ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can share files</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'managerCanShareFiles')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.chat.managerCanShareFiles ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.chat.managerCanShareFiles ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can forward messages</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'managerCanForwardMessages')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.chat.managerCanForwardMessages ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.chat.managerCanForwardMessages ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                </div>
              </div>

              <div class="bg-white p-4 rounded-lg border">
                <h4 class="font-semibold text-gray-900 mb-3">General Chat Settings</h4>
                <div class="space-y-3">
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Allow file sharing</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'allowFileSharing')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.chat.allowFileSharing ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.chat.allowFileSharing ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Allow emojis and reactions</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'allowEmojis')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.chat.allowEmojis ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.chat.allowEmojis ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <div>
                    <label class="block text-sm text-gray-700 mb-2">Message retention (days)</label>
                    <input
                      type="number"
                      bind:value={newOU.rules.chat.messageRetentionDays}
                      min="1"
                      max="365"
                      class="input-field w-24"
                    />
                  </div>
                </div>
              </div>
            </div>
          {/if}

          <!-- Broadcast Rules -->
          {#if activeRulesTab === 'broadcast'}
            <div class="space-y-4 max-h-127 overflow-y-auto">
              <div class="bg-white p-4 rounded-lg border">
                <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
                  <User class="w-4 h-4 mr-2" />
                  Frontline User Permissions
                </h4>
                <div class="space-y-3">
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can create broadcasts</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('broadcast', 'frontlineCanCreateBroadcast')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.broadcast.frontlineCanCreateBroadcast ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.broadcast.frontlineCanCreateBroadcast ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can reply to broadcasts</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('broadcast', 'frontlineCanReplyToBroadcast')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.broadcast.frontlineCanReplyToBroadcast ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.broadcast.frontlineCanReplyToBroadcast ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                </div>
              </div>

              <div class="bg-white p-4 rounded-lg border">
                <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
                  <User class="w-4 h-4 mr-2" />
                  Support User Permissions
                </h4>
                <div class="space-y-3">
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can create broadcasts</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('broadcast', 'supportCanCreateBroadcast')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.broadcast.supportCanCreateBroadcast ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.broadcast.supportCanCreateBroadcast ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can reply to broadcasts</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('broadcast', 'supportCanReplyToBroadcast')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.broadcast.supportCanReplyToBroadcast ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.broadcast.supportCanReplyToBroadcast ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                </div>
              </div>

              <div class="bg-white p-4 rounded-lg border">
                <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
                  <UserCheck class="w-4 h-4 mr-2" />
                  Supervisor Permissions
                </h4>
                <div class="space-y-3">
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can create broadcasts</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('broadcast', 'supervisorCanCreateBroadcast')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.broadcast.supervisorCanCreateBroadcast ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.broadcast.supervisorCanCreateBroadcast ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                </div>
              </div>

              <div class="bg-white p-4 rounded-lg border">
                <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
                  <Shield class="w-4 h-4 mr-2" />
                  Manager Permissions
                </h4>
                <div class="space-y-3">
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can create broadcasts</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('broadcast', 'managerCanCreateBroadcast')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.broadcast.managerCanCreateBroadcast ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.broadcast.managerCanCreateBroadcast ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                </div>
              </div>

              <div class="bg-white p-4 rounded-lg border">
                <h4 class="font-semibold text-gray-900 mb-3">General Broadcast Settings</h4>
                <div class="space-y-3">
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Require approval for broadcasts</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('broadcast', 'requireApprovalForBroadcast')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.broadcast.requireApprovalForBroadcast ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.broadcast.requireApprovalForBroadcast ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Allow scheduled broadcasts</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('broadcast', 'allowScheduledBroadcasts')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.broadcast.allowScheduledBroadcasts ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.broadcast.allowScheduledBroadcasts ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Allow priority broadcasts</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('broadcast', 'allowPriorityBroadcasts')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.broadcast.allowPriorityBroadcasts ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.broadcast.allowPriorityBroadcasts ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <div>
                    <label class="block text-sm text-gray-700 mb-2">Broadcast retention (days)</label>
                    <input
                      type="number"
                      bind:value={newOU.rules.broadcast.broadcastRetentionDays}
                      min="1"
                      max="365"
                      class="input-field w-24"
                    />
                  </div>
                </div>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}


<!-- Edit OU Modal -->
{#if showEditModal && editOU}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50" onclick={() => showEditModal = false}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-6xl mx-4 max-h-[90vh] overflow-hidden" onclick={(e) => e.stopPropagation()}>
      <div class="flex h-full">
        <!-- Left Side - Form -->
        <div class="w-1/2 p-6 border-r border-gray-200">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold text-gray-900">Edit Organization Unit</h2>
            <button onclick={() => showEditModal = false} class="text-gray-500 hover:text-gray-700">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <form onsubmit={(e) => { e.preventDefault(); saveEditOU(); }} class="space-y-6">
            <div>
              <label for="edit-name" class="block text-sm font-semibold text-gray-700 mb-2">Organization Unit Name</label>
              <input
                id="edit-name"
                bind:value={editOU.name}
                placeholder="Enter unit name"
                required
                class="input-field"
              />
            </div>

            <div>
              <label for="edit-description" class="block text-sm font-semibold text-gray-700 mb-2">Description</label>
              <textarea
                id="edit-description"
                bind:value={editOU.description}
                placeholder="Describe the purpose and responsibilities of this unit"
                required
                rows="3"
                class="input-field resize-none"
              ></textarea>
            </div>

            <div>
              <label for="edit-location" class="block text-sm font-semibold text-gray-700 mb-2">Location</label>
              <input
                id="edit-location"
                bind:value={editOU.location}
                placeholder="Enter location"
                class="input-field"
              />
            </div>

            <div>
              <label for="edit-status" class="block text-sm font-semibold text-gray-700 mb-2">Status</label>
              <select id="edit-status" bind:value={editOU.status} class="input-field">
                <option value="active">Active</option>
                <option value="inactive">Deactivated</option>
              </select>
            </div>

            <div class="flex space-x-3 pt-6">
              <button type="submit" class="primary-button flex-1">
                Save Changes
              </button>
              <button
                type="button"
                onclick={() => showEditModal = false}
                class="secondary-button flex-1"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        <!-- Right Side - Rules and Policies -->
        <div class="w-1/2 p-6 bg-gray-50">
          <h3 class="text-xl font-semibold text-gray-900 mb-6">Rules & Policies</h3>
          
          <!-- Tab Navigation -->
          <div class="flex space-x-4 mb-6">
            <button
              onclick={() => activeRulesTab = 'chat'}
              class="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors {activeRulesTab === 'chat' ? 'bg-[#01c0a4] text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}"
            >
              <MessageCircle class="w-4 h-4" />
              <span>Chat</span>
            </button>
            <button
              onclick={() => activeRulesTab = 'broadcast'}
              class="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors {activeRulesTab === 'broadcast' ? 'bg-[#01c0a4] text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}"
            >
              <Radio class="w-4 h-4" />
              <span>Broadcast</span>
            </button>
          </div>

          <!-- Chat Rules -->
          {#if activeRulesTab === 'chat'}
            <div class="space-y-4 max-h-96 overflow-y-auto">
              <div class="bg-white p-4 rounded-lg border">
                <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
                  <User class="w-4 h-4 mr-2" />
                  Frontline User Permissions
                </h4>
                <div class="space-y-3">
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can initiate 1:1 conversations</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'frontlineCanInitiate1v1', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.chat?.frontlineCanInitiate1v1 ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.chat?.frontlineCanInitiate1v1 ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can create group chats</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'frontlineCanCreateGroups', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.chat?.frontlineCanCreateGroups ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.chat?.frontlineCanCreateGroups ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can join group chats</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'frontlineCanJoinGroups', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.chat?.frontlineCanJoinGroups ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.chat?.frontlineCanJoinGroups ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can share files</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'frontlineCanShareFiles', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.chat?.frontlineCanShareFiles ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.chat?.frontlineCanShareFiles ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can forward messages</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'frontlineCanForwardMessages', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.chat?.frontlineCanForwardMessages ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.chat?.frontlineCanForwardMessages ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                </div>
              </div>

              <div class="bg-white p-4 rounded-lg border">
                <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
                  <User class="w-4 h-4 mr-2" />
                  Support User Permissions
                </h4>
                <div class="space-y-3">
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can initiate 1:1 conversations</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'supportCanInitiate1v1', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.chat?.supportCanInitiate1v1 ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.chat?.supportCanInitiate1v1 ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can create group chats</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'supportCanCreateGroups', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.chat?.supportCanCreateGroups ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.chat?.supportCanCreateGroups ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can join group chats</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'supportCanJoinGroups', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.chat?.supportCanJoinGroups ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.chat?.supportCanJoinGroups ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can share files</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'supportCanShareFiles', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.chat?.supportCanShareFiles ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.chat?.supportCanShareFiles ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can forward messages</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'supportCanForwardMessages', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.chat?.supportCanForwardMessages ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.chat?.supportCanForwardMessages ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                </div>
              </div>

              <div class="bg-white p-4 rounded-lg border">
                <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
                  <UserCheck class="w-4 h-4 mr-2" />
                  Supervisor Permissions
                </h4>
                <div class="space-y-3">
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can create group chats</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'supervisorCanCreateGroups', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.chat?.supervisorCanCreateGroups ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.chat?.supervisorCanCreateGroups ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can share files</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'supervisorCanShareFiles', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.chat?.supervisorCanShareFiles ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.chat?.supervisorCanShareFiles ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can forward messages</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'supervisorCanForwardMessages', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.chat?.supervisorCanForwardMessages ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.chat?.supervisorCanForwardMessages ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                </div>
              </div>

              <div class="bg-white p-4 rounded-lg border">
                <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
                  <Shield class="w-4 h-4 mr-2" />
                  Manager Permissions
                </h4>
                <div class="space-y-3">
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can access all group chats</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'managerCanAccessAllGroups', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.chat?.managerCanAccessAllGroups ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.chat?.managerCanAccessAllGroups ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can share files</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'managerCanShareFiles', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.chat?.managerCanShareFiles ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.chat?.managerCanShareFiles ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can forward messages</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'managerCanForwardMessages', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.chat?.managerCanForwardMessages ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.chat?.managerCanForwardMessages ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                </div>
              </div>

              <div class="bg-white p-4 rounded-lg border">
                <h4 class="font-semibold text-gray-900 mb-3">General Chat Settings</h4>
                <div class="space-y-3">
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Allow file sharing</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'allowFileSharing', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.chat?.allowFileSharing ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.chat?.allowFileSharing ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Allow emojis and reactions</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'allowEmojis', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.chat?.allowEmojis ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.chat?.allowEmojis ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <div>
                    <label class="block text-sm text-gray-700 mb-2">Message retention (days)</label>
                    <input
                      type="number"
                      bind:value={editOU.rules.chat.messageRetentionDays}
                      min="1"
                      max="365"
                      class="input-field w-24"
                    />
                  </div>
                </div>
              </div>
            </div>
          {/if}

          <!-- Broadcast Rules -->
          {#if activeRulesTab === 'broadcast'}
            <div class="space-y-4 max-h-96 overflow-y-auto">
              <div class="bg-white p-4 rounded-lg border">
                <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
                  <User class="w-4 h-4 mr-2" />
                  Frontline User Permissions
                </h4>
                <div class="space-y-3">
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can create broadcasts</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('broadcast', 'frontlineCanCreateBroadcast', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.broadcast?.frontlineCanCreateBroadcast ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.broadcast?.frontlineCanCreateBroadcast ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can reply to broadcasts</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('broadcast', 'frontlineCanReplyToBroadcast', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.broadcast?.frontlineCanReplyToBroadcast ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.broadcast?.frontlineCanReplyToBroadcast ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                </div>
              </div>

              <div class="bg-white p-4 rounded-lg border">
                <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
                  <User class="w-4 h-4 mr-2" />
                  Support User Permissions
                </h4>
                <div class="space-y-3">
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can create broadcasts</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('broadcast', 'supportCanCreateBroadcast', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.broadcast?.supportCanCreateBroadcast ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.broadcast?.supportCanCreateBroadcast ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can reply to broadcasts</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('broadcast', 'supportCanReplyToBroadcast', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.broadcast?.supportCanReplyToBroadcast ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.broadcast?.supportCanReplyToBroadcast ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                </div>
              </div>

              <div class="bg-white p-4 rounded-lg border">
                <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
                  <UserCheck class="w-4 h-4 mr-2" />
                  Supervisor Permissions
                </h4>
                <div class="space-y-3">
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can create broadcasts</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('broadcast', 'supervisorCanCreateBroadcast', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.broadcast?.supervisorCanCreateBroadcast ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.broadcast?.supervisorCanCreateBroadcast ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                </div>
              </div>

              <div class="bg-white p-4 rounded-lg border">
                <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
                  <Shield class="w-4 h-4 mr-2" />
                  Manager Permissions
                </h4>
                <div class="space-y-3">
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can create broadcasts</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('broadcast', 'managerCanCreateBroadcast', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.broadcast?.managerCanCreateBroadcast ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.broadcast?.managerCanCreateBroadcast ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                </div>
              </div>

              <div class="bg-white p-4 rounded-lg border">
                <h4 class="font-semibold text-gray-900 mb-3">General Broadcast Settings</h4>
                <div class="space-y-3">
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Require approval for broadcasts</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('broadcast', 'requireApprovalForBroadcast', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.broadcast?.requireApprovalForBroadcast ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.broadcast?.requireApprovalForBroadcast ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Allow scheduled broadcasts</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('broadcast', 'allowScheduledBroadcasts', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.broadcast?.allowScheduledBroadcasts ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.broadcast?.allowScheduledBroadcasts ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Allow priority broadcasts</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('broadcast', 'allowPriorityBroadcasts', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.broadcast?.allowPriorityBroadcasts ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.broadcast?.allowPriorityBroadcasts ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <div>
                    <label class="block text-sm text-gray-700 mb-2">Broadcast retention (days)</label>
                    <input
                      type="number"
                      bind:value={editOU.rules.broadcast.broadcastRetentionDays}
                      min="1"
                      max="365"
                      class="input-field w-24"
                    />
                  </div>
                </div>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Parent OU Details Modal -->
{#if showParentDetailsModal && selectedOU}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50" onclick={() => showParentDetailsModal = false}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden" onclick={(e) => e.stopPropagation()}>
      <div class="p-6 border-b border-gray-200 bg-gray-50">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <div class="h-12 w-12 rounded-lg bg-gradient-to-r from-[#01c0a4] to-[#00a085] flex items-center justify-center">
              <Building2 class="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 class="text-2xl font-bold text-gray-900">{selectedOU.name}</h2>
              <p class="text-gray-600">{selectedOU.description}</p>
            </div>
          </div>
          <button onclick={() => showParentDetailsModal = false} class="text-gray-500 hover:text-gray-700">
            <X class="w-6 h-6" />
          </button>
        </div>
      </div>

      <div class="p-6 overflow-y-auto max-h-[calc(90vh-120px)] relative">
        <!-- Basic Information -->
        <div class="grid grid-cols-2 gap-6 mb-6">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-500 mb-1">Location</label>
              <div class="flex items-center space-x-2">
                <MapPin class="w-4 h-4 text-gray-400" />
                <span class="text-gray-900">{selectedOU.location || 'Not specified'}</span>
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-500 mb-1">Members</label>
              <div class="flex items-center space-x-2">
                <Users class="w-4 h-4 text-gray-400" />
                <span class="text-gray-900">{selectedOU.memberCount} people</span>
              </div>
            </div>
          </div>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-500 mb-1">Created</label>
              <span class="text-gray-900">{formatDate(selectedOU.createdAt)}</span>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-500 mb-1">Last Modified</label>
              <span class="text-gray-900">{formatDate(selectedOU.modifiedAt)}</span>
            </div>
          </div>
        </div>

        <!-- Rules & Policies Overview -->
        <div class="mb-20">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Rules & Policies Overview</h3>
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-gray-50 p-4 rounded-lg">
              <div class="flex items-center space-x-2 mb-2">
                <MessageCircle class="w-4 h-4 text-[#01c0a4]" />
                <span class="font-medium text-gray-900">Chat Permissions</span>
              </div>
              <div class="space-y-1 text-sm text-gray-600">
                <div>File Sharing: {selectedOU.rules.chat.allowFileSharing ? 'Enabled' : 'Disabled'}</div>
                <div>Group Creation: {selectedOU.rules.chat.frontlineCanCreateGroups ? 'All Users' : 'Restricted'}</div>
                <div>Message Retention: {selectedOU.rules.chat.messageRetentionDays} days</div>
              </div>
            </div>
            
            <div class="bg-gray-50 p-4 rounded-lg">
              <div class="flex items-center space-x-2 mb-2">
                <Radio class="w-4 h-4 text-[#01c0a4]" />
                <span class="font-medium text-gray-900">Broadcast Permissions</span>
              </div>
              <div class="space-y-1 text-sm text-gray-600">
                <div>Create Broadcasts: {selectedOU.rules.broadcast.frontlineCanCreateBroadcast ? 'All Users' : 'Restricted'}</div>
                <div>Approval Required: {selectedOU.rules.broadcast.requireApprovalForBroadcast ? 'Yes' : 'No'}</div>
                <div>Retention: {selectedOU.rules.broadcast.broadcastRetentionDays} days</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons - Bottom Right -->
        <div class="absolute bottom-6 right-6">
          <div class="flex space-x-2">
            <button
              onclick={() => { if (selectedOU) { showParentDetailsModal = false; selectOU(selectedOU); } }}
              class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-400 rounded-lg hover:bg-blue-500 transition-colors"
            >
              <FileText class="w-4 h-4 mr-2" />
              Details
            </button>
            
            <button
              onclick={() => { if (selectedOU) { showParentDetailsModal = false; editOUFunction(selectedOU); } }}
              class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#01c0a4] rounded-lg hover:bg-[#00a085] transition-colors"
            >
              <Edit class="w-4 h-4 mr-2" />
              Edit
            </button>
            
            {#if selectedOU.status === 'active'}
              <button
                onclick={() => { if (selectedOU) { showParentDetailsModal = false; confirmDeactivateOU(selectedOU); } }}
                class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors"
              >
                <X class="w-4 h-4 mr-2" />
                Deactivate
              </button>
            {:else}
              <button
                onclick={() => { if (selectedOU) { showParentDetailsModal = false; reactivateOU(selectedOU.id); } }}
                class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-lg hover:bg-green-600 transition-colors"
              >
                <UserCheck class="w-4 h-4 mr-2" />
                Reactivate
              </button>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Confirmation Modal -->
{#if showConfirmationModal && actionConfirm}
  <ConfirmationModal
    show={showConfirmationModal}
    title="Confirm Action"
    message={actionConfirm.message}
    confirmText={actionConfirm.confirmText}
    confirmStyle={
      actionConfirm.confirmText === 'Deactivate' || actionConfirm.confirmText === 'Deactivate All'
        ? 'danger'
        : actionConfirm.confirmText === 'Delete'
        ? 'danger'
        : 'primary'
    }
    onConfirm={executeConfirmedAction}
    onCancel={() => { showConfirmationModal = false; actionConfirm = null; }}
  />
{/if}

<!-- Notification Modal -->
{#if showNotificationModal && notificationData}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50" onclick={closeNotification}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onclick={(e) => e.stopPropagation()}>
      <!-- Progress Bar -->
      <div class="h-1 bg-gray-200">
        <div 
          class="h-full transition-all duration-75 ease-linear {notificationData?.type === 'success' ? 'bg-green-500' : notificationData?.type === 'error' ? 'bg-red-500' : 'bg-blue-500'}"
          style="width: {timerProgress}%"
        ></div>
      </div>
      
      <!-- Header -->
      <div class="p-6 border-b border-gray-200">
        <div class="flex items-center space-x-3">
          <!-- Icon based on notification type -->
          {#if notificationData.type === 'success'}
            <div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
          {:else if notificationData.type === 'error'}
            <div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </div>
          {:else}
            <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          {/if}
          
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-gray-900">{notificationData.title}</h3>
          </div>
          
          <button onclick={closeNotification} class="text-gray-400 hover:text-gray-600 transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>
      
      <!-- Content -->
      <div class="p-6">
        <p class="text-gray-600">{notificationData.message}</p>
      </div>
      
      <!-- Footer -->
      <div class="p-6 border-t border-gray-200 bg-gray-50">
        <button
          onclick={closeNotification}
          class="w-full px-4 py-2 {notificationData.type === 'success' ? 'bg-green-600 hover:bg-green-700' : notificationData.type === 'error' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-lg font-medium transition-colors"
        >
          OK
        </button>
      </div>
    </div>
  </div>
{/if}
