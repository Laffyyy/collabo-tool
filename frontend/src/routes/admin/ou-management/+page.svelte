<script lang="ts">
  import { Building2, Plus, Search, Edit, Trash2, Users, MapPin, FileText, MessageCircle, Radio, Shield, User, UserCheck, Send, ChevronRight, ChevronDown, X } from 'lucide-svelte';
  import ConfirmationModal from '$lib/components/ConfirmationModal.svelte';
  import { onMount } from 'svelte';
  import { createOU as createOUAPI, transformOUDataForAPI, getActiveOUs, getInactiveOUs, deactivateOUs as deactivateOUsAPI, deactivateOU as deactivateOUAPI, reactivateOU as reactivateOUAPI, reactivateOUs as reactivateOUsAPI, updateOU as updateOUAPI } from '$lib/api/OUmanagement';

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
  let selectedRows = $state<Set<string>>(new Set());
  let selectAll = $state<boolean>(false);
  let showCreateModal = $state<boolean>(false);
  let showEditModal = $state<boolean>(false);
  let showConfirmationModal = $state<boolean>(false);
  let showDetailsModal = $state<boolean>(false);
  let selectedOU = $state<OrganizationUnit | null>(null);
  let showOUDetails = $state<boolean>(false);
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

  const mapBackendToOU = (row: any): OrganizationUnit => {
    const created = row?.tcreatedat ? new Date(row.tcreatedat) : new Date();
    const isActive = !!row?.bisActive;
    
    console.log('Mapping backend OU:', {
      id: row?.ouid || row?.did,
      name: row?.dname,
      jsSettings: row?.jsSettings
    });
    
    const rules = parseJsSettingsToRules(row?.jsSettings);
    
    const mappedOU: OrganizationUnit = {
      id: row?.ouid || row?.did || String(Date.now()),
      name: row?.dname || 'Unknown',
      description: row?.ddescription || '',
      parentId: row?.dparentouid || null,
      memberCount: Number(row?.membercount) || 0,
      location: row?.dLocation || row?.dlocation || '',
      createdAt: created,
      modifiedAt: created,
      status: isActive ? 'active' : 'inactive',
      rules,
      // Store original jsSettings for tab determination
      _originalJsSettings: row?.jsSettings
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

      const activeRows = (activeRes.data as any)?.data || [];
      const inactiveRows = (inactiveRes.data as any)?.data || [];

      activeList = activeRows.map(mapBackendToOU);
      inactiveList = inactiveRows.map(mapBackendToOU);
      organizationUnits = currentTab === 'active' ? activeList : inactiveList;
    } catch (e) {
      console.error(e);
      loadError = 'Failed to load organization units';
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

  let filteredOUs = $derived.by(() => {
    let filtered = organizationUnits;

    // Filter by tab
    if (currentTab === 'active') {
      filtered = filtered.filter(ou => ou.status === 'active');
    } else if (currentTab === 'inactive') {
      filtered = filtered.filter(ou => ou.status === 'inactive');
    }

    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter(ou =>
        ou.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ou.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ou.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  });

  // Functions
  const createOU = async () => {
    if (newOU.name.trim() && newOU.description.trim()) {
      // Clear previous messages
      apiError = '';
      apiSuccess = '';
      isCreatingOU = true;

      try {
        // Transform frontend data to backend API format
        // Only send settings for the currently active tab
        const apiData = transformOUDataForAPI(newOU, activeRulesTab);
        
        // Call the API
        const result = await createOUAPI(apiData);
        
        if (result.success) {
          // Create local OU object for immediate UI update
          const ou: OrganizationUnit = {
            id: result.data?.id || Date.now().toString(),
            name: newOU.name.trim(),
            description: newOU.description.trim(),
            parentId: null,
            memberCount: 0,
            location: newOU.location.trim(),
            createdAt: new Date(),
            modifiedAt: new Date(),
            status: 'active',
            rules: newOU.rules
          };

          // Update the local state
          activeList = [ou, ...activeList];
          organizationUnits = currentTab === 'active' ? activeList : inactiveList;
          
          // Show success message
          apiSuccess = result.message || 'Organization Unit created successfully!';
          
          // Reset form
          resetNewOUForm();
          
          // Close modal after a short delay to show success message
          setTimeout(() => {
            showCreateModal = false;
            apiSuccess = '';
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
      // Build backend changes payload
      const apiData = transformOUDataForAPI(
        {
          name: editOU.name!.trim(),
          description: editOU.description!.trim(),
          location: editOU.location?.trim() || '',
          rules: editOU.rules
        } as any,
        activeRulesTab
      );

      const changes: any = {
        OrgName: apiData.OrgName,
        Description: apiData.Description,
        Location: apiData.Location,
        Settings: apiData.Settings
      };

      if (editOU.status) {
        changes.isactive = editOU.status === 'active';
      }

      const res = await updateOUAPI({ id: selectedOU.id, changes });
      if (!res.success) {
        alert(res.error || 'Failed to update Organization Unit');
        return;
      }

      organizationUnits = organizationUnits.map(ou =>
        ou.id === selectedOU!.id
          ? {
              ...ou,
              name: editOU!.name!.trim(),
              description: editOU!.description!.trim(),
              location: editOU!.location?.trim() || '',
              modifiedAt: new Date(),
              status: editOU!.status || 'active',
              rules: editOU!.rules || ou.rules
            }
          : ou
      );
      
      showEditModal = false;
      editOU = null;
      selectedOU = null;
      alert('Organization Unit updated successfully!');
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
          alert('Organization Unit deleted successfully!');
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

  const confirmBulkDeactivateOUs = () => {
    if (selectedRows.size === 0) return;
    
    actionConfirm = {
      message: `Are you sure you want to deactivate ${selectedRows.size} selected organization units? This will make them inactive but preserve all data.`,
      confirmText: 'Deactivate All',
      action: () => bulkDeactivateOUs()
    };
    showConfirmationModal = true;
  };

  const confirmBulkReactivateOUs = () => {
    if (selectedRows.size === 0) return;
    
    actionConfirm = {
      message: `Are you sure you want to reactivate ${selectedRows.size} selected organization units? This will make them active again.`,
      confirmText: 'Reactivate All',
      action: () => bulkReactivateOUs()
    };
    showConfirmationModal = true;
  };

  const bulkDeactivateOUs = async () => {
    const ids = Array.from(selectedRows);
    if (ids.length === 0) return;
    try {
      const res = await deactivateOUsAPI(ids);
      if (!res.success) throw new Error(res.error || 'Failed');
      const selectedCount = ids.length;
      if (currentTab === 'active') {
        const toMove = new Set(ids);
        const moved = activeList.filter(ou => toMove.has(ou.id)).map(ou => ({ ...ou, status: 'inactive' as const, modifiedAt: new Date() }));
        activeList = activeList.filter(ou => !toMove.has(ou.id));
        inactiveList = [...moved, ...inactiveList];
        organizationUnits = activeList;
      }
      alert(`${selectedCount} organization units have been deactivated successfully!`);
    } catch (e) {
      console.error(e);
      alert('Failed to deactivate selected organization units.');
    } finally {
      showConfirmationModal = false;
      selectedRows = new Set();
      selectAll = false;
      actionConfirm = null;
    }
  };

  const bulkReactivateOUs = async () => {
    const ids = Array.from(selectedRows);
    if (ids.length === 0) return;
    
    try {
      const res = await reactivateOUsAPI(ids);
      if (!res.success) throw new Error(res.error || 'Failed');
      
      const selectedCount = ids.length;
      if (currentTab === 'inactive') {
        const toMove = new Set(ids);
        const moved = inactiveList.filter(ou => toMove.has(ou.id)).map(ou => ({ ...ou, status: 'active' as const, modifiedAt: new Date() }));
        inactiveList = inactiveList.filter(ou => !toMove.has(ou.id));
        activeList = [...moved, ...activeList];
        organizationUnits = inactiveList;
      }
      alert(`${selectedCount} organization units have been reactivated successfully!`);
    } catch (e) {
      console.error(e);
      alert('Failed to reactivate selected organization units.');
    } finally {
      showConfirmationModal = false;
      selectedRows = new Set();
      selectAll = false;
      actionConfirm = null;
    }
  };

  const deleteOU = (ouId: string) => {
    if (confirm('Are you sure you want to delete this Organization Unit?')) {
      organizationUnits = organizationUnits.filter(ou => ou.id !== ouId);
      alert('Organization Unit deleted successfully!');
    }
  };

  const viewOUDetails = (ou: OrganizationUnit) => {
    selectedOU = ou;
    showDetailsModal = true;
  };

  const closeDetailsModal = () => {
    showDetailsModal = false;
    selectedOU = null;
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
  const changeTab = (tab: string) => {
    currentTab = tab;
    // Clear selections when switching tabs
    selectedRows = new Set();
    selectAll = false;
    organizationUnits = currentTab === 'active' ? activeList : inactiveList;
  };

  // Row selection functions
  const handleSelectAll = () => {
    selectAll = !selectAll;
    if (selectAll) {
      selectedRows = new Set(filteredOUs.map(ou => ou.id));
    } else {
      selectedRows = new Set();
    }
  };

  const handleRowSelect = (ouId: string) => {
    const newSelectedRows = new Set(selectedRows);
    if (newSelectedRows.has(ouId)) {
      newSelectedRows.delete(ouId);
    } else {
      newSelectedRows.add(ouId);
    }
    selectedRows = newSelectedRows;
    selectAll = filteredOUs.length > 0 && filteredOUs.every(ou => selectedRows.has(ou.id));
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
      alert('Organization Unit deactivated successfully!');
    } catch (e) {
      console.error(e);
      alert('Failed to deactivate Organization Unit.');
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
      alert('Organization Unit reactivated successfully!');
    } catch (e) {
      console.error(e);
      alert('Failed to reactivate Organization Unit.');
    }
  };
</script>

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

  <!-- Search and Filters -->
  <div class="collaboration-card fade-in mb-6">
    <div class="p-6">
      <div class="flex items-center space-x-4">
        <div class="relative flex-1">
          <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            bind:value={searchQuery}
            type="text"
            placeholder="Search organization units..."
            class="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent"
          />
        </div>
        <div class="text-sm text-gray-500 whitespace-nowrap">
          {filteredOUs.length} of {organizationUnits.length} units
        </div>
        <button
          onclick={() => showCreateModal = true}
          class="primary-button flex items-center space-x-2 whitespace-nowrap"
        >
          <Plus class="w-5 h-5" />
          <span>Create OU</span>
        </button>
      </div>
    </div>
  </div>

  <!-- OUs Table with Tabs -->
  <div class="collaboration-card fade-in">
    <!-- Tabs -->
    <div class="border-b border-gray-200">
      <nav class="flex space-x-6 px-6">
        <button
          onclick={() => changeTab('active')}
          class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {currentTab === 'active' ? 'border-[#01c0a4] text-[#01c0a4]' : 'border-transparent text-gray-500 hover:text-gray-700'}"
        >
          <div class="flex items-center space-x-2">
            <Building2 class="w-4 h-4" />
            <span>Active</span>
            <span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{tabCounts.active}</span>
          </div>
        </button>

        <button
          onclick={() => changeTab('inactive')}
          class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {currentTab === 'inactive' ? 'border-[#01c0a4] text-[#01c0a4]' : 'border-transparent text-gray-500 hover:text-gray-700'}"
        >
          <div class="flex items-center space-x-2">
            <X class="w-4 h-4" />
            <span>Deactivated</span>
            <span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{tabCounts.inactive}</span>
          </div>
        </button>
      </nav>
    </div>

    <!-- Selection Toolbar -->
    {#if selectedRows.size > 0}
      <div class="bg-blue-50 border-b border-blue-200 px-6 py-2.5">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <span class="text-sm font-medium text-blue-900">
              {selectedRows.size} {selectedRows.size === 1 ? 'unit' : 'units'} selected
            </span>
            <button
              onclick={() => { selectedRows = new Set(); selectAll = false; }}
              class="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear selection
            </button>
          </div>
          <div class="flex items-center space-x-2">
            {#if currentTab === 'active'}
              <button
                onclick={() => confirmBulkDeactivateOUs()}
                class="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Deactivate Selected
              </button>
            {:else}
              <button
                onclick={() => confirmBulkReactivateOUs()}
                class="px-3 py-1.5 text-sm bg-[#01c0a4] text-white rounded-lg hover:bg-[#00a085] transition-colors"
              >
                Reactivate Selected
              </button>
            {/if}
          </div>
        </div>
      </div>
    {/if}

    <!-- OUs Table -->
    <div class="overflow-x-auto">
      <table class="w-full" tabindex="0" role="table" aria-label="Organization units table">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div class="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onchange={handleSelectAll}
                  class="rounded border-gray-300 text-[#01c0a4] focus:ring-[#01c0a4]"
                />
                <span>Unit</span>
              </div>
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Members</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          {#each filteredOUs as ou}
            <tr 
              class="hover:bg-gray-50 transition-colors cursor-pointer {selectedRows.has(ou.id) ? 'bg-blue-50' : ''}"
              onclick={(e) => {
                // Only select row if clicking outside of buttons and checkboxes
                const target = e.target as HTMLElement;
                if (target && !target.closest('button') && !target.closest('input[type="checkbox"]')) {
                  handleRowSelect(ou.id);
                }
              }}
            >
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedRows.has(ou.id)}
                    onchange={() => handleRowSelect(ou.id)}
                    class="rounded border-gray-300 text-[#01c0a4] focus:ring-[#01c0a4]"
                  />
                  <div class="flex items-center">
                    <div class="flex-shrink-0 h-10 w-10">
                      <div class="h-10 w-10 rounded-lg bg-gradient-to-r from-[#01c0a4] to-[#00a085] flex items-center justify-center">
                        <Building2 class="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <div class="ml-4">
                      <div class="text-sm font-medium text-gray-900">{ou.name}</div>
                      <div class="text-sm text-gray-500">{ou.description}</div>
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <Users class="w-4 h-4 text-gray-400 mr-1" />
                  <span class="text-sm text-gray-900">{ou.memberCount}</span>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <MapPin class="w-4 h-4 text-gray-400 mr-1" />
                  <span class="text-sm text-gray-900">{ou.location}</span>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {ou.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                  {ou.status === 'active' ? 'Active' : 'Deactivated'}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex items-center space-x-2">
                  <button
                    onclick={() => viewOUDetails(ou)}
                    class="flex items-center space-x-1 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 px-2 py-1 rounded-md transition-colors text-xs font-medium"
                    title="View Details"
                  >
                    <FileText class="w-3 h-3" />
                    <span>Details</span>
                  </button>
                  <button
                    onclick={() => editOUFunction(ou)}
                    class="flex items-center space-x-1 bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700 px-2 py-1 rounded-md transition-colors text-xs font-medium"
                    title="Edit"
                  >
                    <Edit class="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                  {#if ou.status === 'active'}
                    <button
                      onclick={() => confirmDeactivateOU(ou)}
                      class="flex items-center space-x-1 bg-orange-50 text-orange-600 hover:bg-orange-100 hover:text-orange-700 px-2 py-1 rounded-md transition-colors text-xs font-medium"
                      title="Deactivate"
                    >
                      <X class="w-3 h-3" />
                      <span>Deactivate</span>
                    </button>
                  {:else}
                    <button
                      onclick={() => reactivateOU(ou.id)}
                      class="flex items-center space-x-1 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 px-2 py-1 rounded-md transition-colors text-xs font-medium"
                      title="Reactivate"
                    >
                      <Building2 class="w-3 h-3" />
                      <span>Reactivate</span>
                    </button>
                  {/if}
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    {#if filteredOUs.length === 0}
      <div class="text-center py-12">
        <Building2 class="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 class="text-xl font-semibold text-gray-600 mb-2">No organization units found</h3>
        <p class="text-gray-500">
          {searchQuery ? 'Try adjusting your search criteria.' : 'Create your first organization unit to get started.'}
        </p>
      </div>
    {/if}
  </div>
</div>

<!-- Create OU Modal -->
{#if showCreateModal}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50" onclick={() => showCreateModal = false}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-6xl mx-4 max-h-[90vh] overflow-hidden" onclick={(e) => e.stopPropagation()}>
      <div class="flex h-full">
        <!-- Left Side - Form -->
        <div class="w-1/2 p-6 border-r border-gray-200">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold text-gray-900">Create Organization Unit</h2>
            <button onclick={() => showCreateModal = false} class="text-gray-500 hover:text-gray-700">
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

<!-- OU Details Modal -->
{#if showDetailsModal && selectedOU}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50" onclick={() => showDetailsModal = false}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4" onclick={(e) => e.stopPropagation()}>
      <div class="p-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">Organization Unit Details</h2>
        
        <div class="space-y-4">
          <div class="flex items-center space-x-4">
            <div class="h-16 w-16 rounded-lg bg-gradient-to-r from-[#01c0a4] to-[#00a085] flex items-center justify-center">
              <Building2 class="w-8 h-8 text-white" />
            </div>
            <div>
              <div class="text-lg font-medium text-gray-900">{selectedOU.name}</div>
              <div class="text-sm text-gray-500">{selectedOU.description}</div>
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-gray-500">Location:</span>
              <div class="font-medium">{selectedOU.location}</div>
            </div>
            <div>
              <span class="text-gray-500">Members:</span>
              <div class="font-medium">{selectedOU.memberCount} people</div>
            </div>
            <div>
              <span class="text-gray-500">Status:</span>
              <div class="font-medium text-green-600">{selectedOU.status === 'active' ? 'Active' : 'Deactivated'}</div>
            </div>
            <div>
              <span class="text-gray-500">Created:</span>
              <div class="font-medium">{formatDate(selectedOU.createdAt)}</div>
            </div>
            <div>
              <span class="text-gray-500">Modified:</span>
              <div class="font-medium">{formatDate(selectedOU.modifiedAt)}</div>
            </div>
          </div>
        </div>

        <div class="flex space-x-3 mt-6">
          <button
            onclick={() => showDetailsModal = false}
            class="flex-1 secondary-button"
          >
            Close
          </button>
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
