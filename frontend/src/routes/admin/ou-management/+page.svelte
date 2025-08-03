<script lang="ts">
  import { Building2, Plus, Search, Edit, Trash2, Users, MapPin, FileText, MessageCircle, Radio, Shield, User, UserCheck, Send, ChevronRight, ChevronDown, X } from 'lucide-svelte';

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
  }

  interface OURules {
    chat: {
      frontlineCanInitiate1v1: boolean;
      frontlineCanReply1v1: boolean;
      frontlineCanCreateGroups: boolean;
      frontlineCanJoinGroups: boolean;
      supervisorCanCreateGroups: boolean;
      managerCanAccessAllGroups: boolean;
      allowFileSharing: boolean;
      allowEmojis: boolean;
      messageRetentionDays: number;
    };
    broadcast: {
      frontlineCanCreateBroadcast: boolean;
      frontlineCanReplyToBroadcast: boolean;
      supervisorCanCreateBroadcast: boolean;
      managerCanCreateBroadcast: boolean;
      requireApprovalForBroadcast: boolean;
      allowScheduledBroadcasts: boolean;
      allowPriorityBroadcasts: boolean;
      broadcastRetentionDays: number;
    };
  }

  // Mock OU data
  let organizationUnits = $state<OrganizationUnit[]>([
    {
      id: '1',
      name: 'Engineering',
      description: 'Software development and technical teams',
      parentId: null,
      memberCount: 15,
      location: 'New York, NY',
      createdAt: new Date(Date.now() - 86400000 * 180),
      modifiedAt: new Date(Date.now() - 86400000 * 30),
      status: 'active',
      rules: {
        chat: {
          frontlineCanInitiate1v1: true,
          frontlineCanReply1v1: true,
          frontlineCanCreateGroups: false,
          frontlineCanJoinGroups: true,
          supervisorCanCreateGroups: true,
          managerCanAccessAllGroups: true,
          allowFileSharing: true,
          allowEmojis: true,
          messageRetentionDays: 365
        },
        broadcast: {
          frontlineCanCreateBroadcast: false,
          frontlineCanReplyToBroadcast: true,
          supervisorCanCreateBroadcast: true,
          managerCanCreateBroadcast: true,
          requireApprovalForBroadcast: false,
          allowScheduledBroadcasts: true,
          allowPriorityBroadcasts: true,
          broadcastRetentionDays: 365
        }
      }
    },
    {
      id: '2',
      name: 'Frontend Team',
      description: 'UI/UX and frontend development',
      parentId: '1',
      memberCount: 8,
      location: 'New York, NY',
      createdAt: new Date(Date.now() - 86400000 * 120),
      modifiedAt: new Date(Date.now() - 86400000 * 15),
      status: 'active',
      rules: {
        chat: {
          frontlineCanInitiate1v1: true,
          frontlineCanReply1v1: true,
          frontlineCanCreateGroups: false,
          frontlineCanJoinGroups: true,
          supervisorCanCreateGroups: true,
          managerCanAccessAllGroups: true,
          allowFileSharing: true,
          allowEmojis: true,
          messageRetentionDays: 365
        },
        broadcast: {
          frontlineCanCreateBroadcast: false,
          frontlineCanReplyToBroadcast: true,
          supervisorCanCreateBroadcast: true,
          managerCanCreateBroadcast: true,
          requireApprovalForBroadcast: false,
          allowScheduledBroadcasts: true,
          allowPriorityBroadcasts: true,
          broadcastRetentionDays: 365
        }
      }
    },
    {
      id: '3',
      name: 'Human Resources',
      description: 'HR operations and people management',
      parentId: null,
      memberCount: 5,
      location: 'Chicago, IL',
      createdAt: new Date(Date.now() - 86400000 * 200),
      modifiedAt: new Date(Date.now() - 86400000 * 7),
      status: 'active',
      rules: {
        chat: {
          frontlineCanInitiate1v1: false,
          frontlineCanReply1v1: true,
          frontlineCanCreateGroups: false,
          frontlineCanJoinGroups: false,
          supervisorCanCreateGroups: true,
          managerCanAccessAllGroups: true,
          allowFileSharing: false,
          allowEmojis: false,
          messageRetentionDays: 90
        },
        broadcast: {
          frontlineCanCreateBroadcast: false,
          frontlineCanReplyToBroadcast: false,
          supervisorCanCreateBroadcast: false,
          managerCanCreateBroadcast: true,
          requireApprovalForBroadcast: true,
          allowScheduledBroadcasts: true,
          allowPriorityBroadcasts: true,
          broadcastRetentionDays: 90
        }
      }
    }
  ]);

  let searchQuery = $state<string>('');
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

  let newOU = $state({
    name: '',
    description: '',
    location: '',
    rules: {
      chat: {
        frontlineCanInitiate1v1: true,
        frontlineCanReply1v1: true,
        frontlineCanCreateGroups: false,
        frontlineCanJoinGroups: true,
        supervisorCanCreateGroups: true,
        managerCanAccessAllGroups: true,
        allowFileSharing: true,
        allowEmojis: true,
        messageRetentionDays: 365
      },
      broadcast: {
        frontlineCanCreateBroadcast: false,
        frontlineCanReplyToBroadcast: true,
        supervisorCanCreateBroadcast: true,
        managerCanCreateBroadcast: true,
        requireApprovalForBroadcast: false,
        allowScheduledBroadcasts: true,
        allowPriorityBroadcasts: true,
        broadcastRetentionDays: 365
      }
    }
  });

  // Computed values
  let filteredOUs = $derived(
    organizationUnits.filter(ou =>
      ou.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ou.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ou.location.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  // Functions
  const createOU = () => {
    if (newOU.name.trim() && newOU.description.trim()) {
      const ou: OrganizationUnit = {
        id: Date.now().toString(),
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

      organizationUnits = [ou, ...organizationUnits];
      
      // Reset form
      newOU = {
        name: '',
        description: '',
        location: '',
        rules: {
          chat: {
            frontlineCanInitiate1v1: true,
            frontlineCanReply1v1: true,
            frontlineCanCreateGroups: false,
            frontlineCanJoinGroups: true,
            supervisorCanCreateGroups: true,
            managerCanAccessAllGroups: true,
            allowFileSharing: true,
            allowEmojis: true,
            messageRetentionDays: 365
          },
          broadcast: {
            frontlineCanCreateBroadcast: false,
            frontlineCanReplyToBroadcast: true,
            supervisorCanCreateBroadcast: true,
            managerCanCreateBroadcast: true,
            requireApprovalForBroadcast: false,
            allowScheduledBroadcasts: true,
            allowPriorityBroadcasts: true,
            broadcastRetentionDays: 365
          }
        }
      };
      showCreateModal = false;
      
      alert('Organization Unit created successfully!');
    }
  };

  const editOUFunction = (ou: OrganizationUnit) => {
    selectedOU = ou;
    editOU = {
      name: ou.name,
      description: ou.description,
      location: ou.location,
      status: ou.status,
      rules: {
        chat: { ...ou.rules.chat },
        broadcast: { ...ou.rules.broadcast }
      }
    };
    showEditModal = true;
  };

  const saveEditOU = () => {
    if (!selectedOU || !editOU) return;
    
    if (editOU.name?.trim() && editOU.description?.trim()) {
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
</script>

<svelte:head>
  <title>OU Management - Admin Controls</title>
</svelte:head>

<div class="h-screen flex flex-col bg-gray-50">
  
  <div class="flex-1 overflow-auto">
    <div class="p-6 space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between fade-in">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 mb-1">Organization Unit Management</h1>
      <p class="text-sm text-gray-600">Manage organizational structure and communication policies</p>
    </div>
    <button
      onclick={() => showCreateModal = true}
      class="primary-button flex items-center space-x-2"
    >
      <Plus class="w-5 h-5" />
      <span>Create OU</span>
    </button>
  </div>

  <!-- Search and Filters -->
  <div class="collaboration-card p-6 fade-in">
    <div class="flex items-center space-x-4">
      <div class="relative flex-1">
        <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          bind:value={searchQuery}
          type="text"
          placeholder="Search organization units by name, description, or location..."
          class="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent"
        />
      </div>
      <div class="text-sm text-gray-500">
        {filteredOUs.length} of {organizationUnits.length} units
      </div>
    </div>
  </div>

  <!-- OUs Table -->
  <div class="collaboration-card fade-in">
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Members</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          {#each filteredOUs as ou}
            <tr class="hover:bg-gray-50 transition-colors">
              <td class="px-6 py-4 whitespace-nowrap">
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
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {ou.status.charAt(0).toUpperCase() + ou.status.slice(1)}
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
                  <button
                    onclick={() => confirmDeleteOU(ou)}
                    class="flex items-center space-x-1 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 px-2 py-1 rounded-md transition-colors text-xs font-medium"
                    title="Delete"
                  >
                    <Trash2 class="w-3 h-3" />
                    <span>Delete</span>
                  </button>
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

          <form onsubmit={(e) => { e.preventDefault(); createOU(); }} class="space-y-6">
            <div>
              <label for="name" class="block text-sm font-semibold text-gray-700 mb-2">Organization Unit Name</label>
              <input
                id="name"
                bind:value={newOU.name}
                placeholder="Enter unit name"
                required
                class="input-field"
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
                class="input-field resize-none"
              ></textarea>
            </div>

            <div class="grid grid-cols-1 gap-4">
              <div>
                <label for="location" class="block text-sm font-semibold text-gray-700 mb-2">Location</label>
                <input
                  id="location"
                  bind:value={newOU.location}
                  placeholder="Enter location"
                  class="input-field"
                />
              </div>
            </div>

            <div class="flex space-x-3 pt-6">
              <button type="submit" class="primary-button flex-1">
                Create Organization Unit
              </button>
              <button
                type="button"
                onclick={() => showCreateModal = false}
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
                      onclick={() => toggleRule('chat', 'frontlineCanInitiate1v1')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.chat.frontlineCanInitiate1v1 ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.chat.frontlineCanInitiate1v1 ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can reply in 1:1 conversations</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'frontlineCanReply1v1')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.chat.frontlineCanReply1v1 ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.chat.frontlineCanReply1v1 ? 'translate-x-6' : 'translate-x-1'}"></span>
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
              <div class="font-medium text-green-600">{selectedOU.status.charAt(0).toUpperCase() + selectedOU.status.slice(1)}</div>
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
                <option value="inactive">Inactive</option>
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
                    <span class="text-sm text-gray-700">Can reply in 1:1 conversations</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'frontlineCanReply1v1', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.chat?.frontlineCanReply1v1 ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.chat?.frontlineCanReply1v1 ? 'translate-x-6' : 'translate-x-1'}"></span>
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
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 backdrop-blur-sm overflow-y-auto h-full w-full z-50" onclick={() => showConfirmationModal = false}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white" onclick={(e) => e.stopPropagation()}>
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900">Confirm Action</h3>
        <button onclick={() => showConfirmationModal = false} class="text-gray-400 hover:text-gray-600">
          <X class="w-5 h-5" />
        </button>
      </div>
      <div class="mb-6">
        <p class="text-gray-700">{actionConfirm.message}</p>
      </div>
      <div class="flex justify-end space-x-3">
        <button
          onclick={() => showConfirmationModal = false}
          class="secondary-button"
        >
          Cancel
        </button>
        <button
          onclick={executeConfirmedAction}
          class="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
        >
          {actionConfirm.confirmText}
        </button>
      </div>
    </div>
  </div>
{/if}
