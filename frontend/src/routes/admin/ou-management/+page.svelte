<script lang="ts">
  import { Building2, Plus, Search, Edit, Trash2, Users, MapPin, FileText } from 'lucide-svelte';
  import Navigation from '$lib/components/Navigation.svelte';

  // TypeScript interfaces
  interface OrganizationUnit {
    id: string;
    name: string;
    description: string;
    parentId: string | null;
    manager: string;
    memberCount: number;
    location: string;
    createdAt: Date;
    status: 'active' | 'inactive';
  }

  // Mock OU data
  let organizationUnits = $state<OrganizationUnit[]>([
    {
      id: '1',
      name: 'Engineering',
      description: 'Software development and technical teams',
      parentId: null,
      manager: 'John Smith',
      memberCount: 15,
      location: 'New York, NY',
      createdAt: new Date(Date.now() - 86400000 * 180),
      status: 'active'
    },
    {
      id: '2',
      name: 'Frontend Team',
      description: 'UI/UX and frontend development',
      parentId: '1',
      manager: 'Sarah Johnson',
      memberCount: 8,
      location: 'New York, NY',
      createdAt: new Date(Date.now() - 86400000 * 120),
      status: 'active'
    },
    {
      id: '3',
      name: 'Backend Team',
      description: 'Server-side development and APIs',
      parentId: '1',
      manager: 'Mike Davis',
      memberCount: 7,
      location: 'New York, NY',
      createdAt: new Date(Date.now() - 86400000 * 100),
      status: 'active'
    },
    {
      id: '4',
      name: 'Human Resources',
      description: 'HR operations and people management',
      parentId: null,
      manager: 'Lisa Wilson',
      memberCount: 5,
      location: 'Chicago, IL',
      createdAt: new Date(Date.now() - 86400000 * 200),
      status: 'active'
    },
    {
      id: '5',
      name: 'Sales Team',
      description: 'Sales operations and customer relations',
      parentId: null,
      manager: 'Robert Brown',
      memberCount: 12,
      location: 'Los Angeles, CA',
      createdAt: new Date(Date.now() - 86400000 * 150),
      status: 'active'
    }
  ]);

  let searchQuery = $state<string>('');
  let showCreateOU = $state<boolean>(false);
  let selectedOU = $state<OrganizationUnit | null>(null);
  let showOUDetails = $state<boolean>(false);

  let newOU = $state({
    name: '',
    description: '',
    parentId: '',
    manager: '',
    location: ''
  });

  // Computed values
  let filteredOUs = $derived(
    organizationUnits.filter(ou =>
      ou.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ou.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ou.manager.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ou.location.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  let parentOUs = $derived(
    organizationUnits.filter(ou => ou.parentId === null)
  );

  const createOU = () => {
    if (newOU.name.trim() && newOU.description.trim()) {
      const ou = {
        id: Date.now().toString(),
        name: newOU.name.trim(),
        description: newOU.description.trim(),
        parentId: newOU.parentId || null,
        manager: newOU.manager.trim(),
        memberCount: 0,
        location: newOU.location.trim(),
        createdAt: new Date(),
        status: 'active' as 'active' | 'inactive'
      };

      organizationUnits = [ou, ...organizationUnits];
      
      // Reset form
      newOU = {
        name: '',
        description: '',
        parentId: '',
        manager: '',
        location: ''
      };
      showCreateOU = false;
      
      alert('Organization Unit created successfully!');
    }
  };

  const deleteOU = (ouId: string) => {
    // Check if OU has children
    const hasChildren = organizationUnits.some(ou => ou.parentId === ouId);
    
    if (hasChildren) {
      alert('Cannot delete Organization Unit that has sub-units. Please move or delete sub-units first.');
      return;
    }

    if (confirm('Are you sure you want to delete this Organization Unit?')) {
      organizationUnits = organizationUnits.filter(ou => ou.id !== ouId);
      alert('Organization Unit deleted successfully!');
    }
  };

  const viewOUDetails = (ou: any) => {
    selectedOU = ou;
    showOUDetails = true;
  };

  const getParentName = (parentId: string | null) => {
    if (!parentId) return 'Root Level';
    const parent = organizationUnits.find(ou => ou.id === parentId);
    return parent?.name || 'Unknown';
  };

  const getHierarchyLevel = (ou: any, level = 0): number => {
    if (!ou.parentId) return level;
    const parent = organizationUnits.find(p => p.id === ou.parentId);
    return parent ? getHierarchyLevel(parent, level + 1) : level;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };
</script>

<svelte:head>
  <title>OU Management - Admin Controls</title>
</svelte:head>

<div class="h-screen flex flex-col bg-gray-50">
  <Navigation />
  
  <div class="flex-1 overflow-auto">
    <div class="p-6 space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between fade-in">
    <div>
      <h1 class="text-3xl font-bold text-gray-800 mb-2">Organization Unit Management</h1>
      <p class="text-gray-600">Manage organizational structure and hierarchies</p>
    </div>
    <button
      onclick={() => showCreateOU = !showCreateOU}
      class="primary-button flex items-center space-x-2"
    >
      <Plus class="w-5 h-5" />
      <span>Add OU</span>
    </button>
  </div>

  <!-- Search and Filters -->
  <div class="collaboration-card p-4 fade-in">
    <div class="flex items-center space-x-4">
      <div class="relative flex-1">
        <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          bind:value={searchQuery}
          type="text"
          placeholder="Search organization units by name, description, manager, or location..."
          class="input-field pl-10"
        />
      </div>
      <div class="text-sm text-gray-500">
        {filteredOUs.length} of {organizationUnits.length} units
      </div>
    </div>
  </div>

  <!-- Create OU Modal -->
  {#if showCreateOU}
    <div class="collaboration-card p-6 fade-in">
      <h2 class="text-xl font-bold text-gray-800 mb-4">Create New Organization Unit</h2>
      
      <form onsubmit={(e) => { e.preventDefault(); createOU(); }} class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="name" class="block text-sm font-semibold text-gray-700 mb-2">Unit Name</label>
            <input
              id="name"
              bind:value={newOU.name}
              placeholder="Enter unit name"
              required
              class="input-field"
            />
          </div>
          <div>
            <label for="parent" class="block text-sm font-semibold text-gray-700 mb-2">Parent Unit</label>
            <select id="parent" bind:value={newOU.parentId} class="input-field">
              <option value="">Root Level</option>
              {#each parentOUs as ou}
                <option value={ou.id}>{ou.name}</option>
              {/each}
            </select>
          </div>
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

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="manager" class="block text-sm font-semibold text-gray-700 mb-2">Manager</label>
            <input
              id="manager"
              bind:value={newOU.manager}
              placeholder="Enter manager name"
              required
              class="input-field"
            />
          </div>
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

        <div class="flex space-x-3 pt-4">
          <button type="submit" class="primary-button">
            Create Unit
          </button>
          <button
            type="button"
            onclick={() => showCreateOU = false}
            class="secondary-button"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  {/if}

  <!-- OUs Table -->
  <div class="collaboration-card fade-in">
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parent</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manager</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Members</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
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
                    <div class="text-sm font-medium text-gray-900 flex items-center">
                      {#if ou.parentId}
                        <span class="text-gray-400 mr-2">{'└─'.repeat(getHierarchyLevel(ou))}</span>
                      {/if}
                      {ou.name}
                    </div>
                    <div class="text-sm text-gray-500">{ou.description}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">{getParentName(ou.parentId)}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">{ou.manager}</div>
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
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <button
                  onclick={() => viewOUDetails(ou)}
                  class="text-[#01c0a4] hover:text-[#00a085] transition-colors"
                  title="View Details"
                >
                  <FileText class="w-4 h-4" />
                </button>
                <button
                  onclick={() => alert('Edit functionality would be implemented here')}
                  class="text-gray-600 hover:text-gray-800 transition-colors"
                  title="Edit"
                >
                  <Edit class="w-4 h-4" />
                </button>
                <button
                  onclick={() => deleteOU(ou.id)}
                  class="text-red-600 hover:text-red-800 transition-colors"
                  title="Delete"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
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

<!-- OU Details Modal -->
{#if showOUDetails && selectedOU}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onclick={() => showOUDetails = false}>
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
              <span class="text-gray-500">Parent Unit:</span>
              <div class="font-medium">{getParentName(selectedOU.parentId)}</div>
            </div>
            <div>
              <span class="text-gray-500">Manager:</span>
              <div class="font-medium">{selectedOU.manager}</div>
            </div>
            <div>
              <span class="text-gray-500">Members:</span>
              <div class="font-medium">{selectedOU.memberCount} people</div>
            </div>
            <div>
              <span class="text-gray-500">Location:</span>
              <div class="font-medium">{selectedOU.location}</div>
            </div>
            <div>
              <span class="text-gray-500">Status:</span>
              <div class="font-medium text-green-600">{selectedOU.status.charAt(0).toUpperCase() + selectedOU.status.slice(1)}</div>
            </div>
            <div>
              <span class="text-gray-500">Created:</span>
              <div class="font-medium">{formatDate(selectedOU.createdAt)}</div>
            </div>
          </div>
        </div>

        <div class="flex space-x-3 mt-6">
          <button
            onclick={() => showOUDetails = false}
            class="flex-1 secondary-button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
