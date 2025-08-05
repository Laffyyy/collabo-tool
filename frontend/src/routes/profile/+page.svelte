<script lang="ts">
  import { User, Camera, Save, Edit, Mail, Shield, Building2, Users, Calendar, Clock, Settings, X } from 'lucide-svelte';
  import Navigation from '$lib/components/Navigation.svelte';
  import { authStore } from '$lib/stores/auth.svelte';

  // Get user data from auth store
  let authUser = $derived($authStore?.user);
  let userInitials = $derived($authStore?.userInitials || 'U.U');
  let onlineStatusColor = $derived($authStore?.onlineStatusColor || 'bg-gray-500');

  // Mock additional user data
  let user = $derived({
    id: '1',
    name: `${authUser?.firstName || 'John'} ${authUser?.lastName || 'Doe'}`,
    email: authUser?.email || 'john.doe@company.com',
    role: authUser?.role || 'Manager',
    ou: authUser?.role === 'admin' ? null : (authUser?.organizationUnit || 'Sales Department'),
    employeeId: 'EMP001',
    manager: authUser?.role === 'admin' || authUser?.role === 'manager' ? null : 'Sarah Wilson',
    supervisor: (authUser?.role === 'frontline' || authUser?.role === 'support') ? 'Mike Johnson' : null,
    joinDate: new Date('2023-01-15'),
    lastLogin: new Date('2024-01-15T14:30:00'),
    profilePhoto: authUser?.profilePhoto || null,
    coverPhoto: '/placeholder.svg?height=300&width=800'
  });

  let isEditing = $state(false);
  let editedName = $state('');
  let showTeamStructure = $state(false);
  let showTeamModal = $state(false);

  // Sync editedName when editing starts
  $effect(() => {
    if (isEditing) {
      editedName = user.name;
    }
  });

  // Mock team data based on role hierarchy
  const mockTeamData = {
    managers: [
      { id: '1', name: 'Sarah Wilson', role: 'Manager', email: 'sarah.wilson@company.com', ou: 'Sales Department' },
      { id: '2', name: 'Mike Johnson', role: 'Manager', email: 'mike.johnson@company.com', ou: 'Engineering' }
    ],
    supervisors: [
      { id: '3', name: 'Lisa Chen', role: 'Supervisor', email: 'lisa.chen@company.com', ou: 'Sales Department', managerId: '1' },
      { id: '4', name: 'David Brown', role: 'Supervisor', email: 'david.brown@company.com', ou: 'Engineering', managerId: '2' }
    ],
    team: [
      { id: '5', name: 'Alice Cooper', role: 'Frontline', email: 'alice.cooper@company.com', ou: 'Sales Department', supervisorId: '3', managerId: '1' },
      { id: '6', name: 'Bob Smith', role: 'Support', email: 'bob.smith@company.com', ou: 'Sales Department', supervisorId: '3', managerId: '1' },
      { id: '7', name: 'Carol Davis', role: 'Frontline', email: 'carol.davis@company.com', ou: 'Engineering', supervisorId: '4', managerId: '2' },
      { id: '8', name: 'Dan Wilson', role: 'Support', email: 'dan.wilson@company.com', ou: 'Engineering', supervisorId: '4', managerId: '2' }
    ]
  };

  interface TeamMember {
    id: string;
    name: string;
    role: string;
    email: string;
    ou: string;
    supervisorId?: string;
    managerId?: string;
  }

  interface TeamStructure {
    type: 'manager' | 'supervisor' | 'team_member';
    supervisors?: TeamMember[];
    teamMembers?: TeamMember[];
    manager?: TeamMember;
    supervisor?: TeamMember;
  }

  // Get team structure based on user role
  const getTeamStructure = (): TeamStructure | null => {
    const userRole = authUser?.role?.toLowerCase();
    
    switch (userRole) {
      case 'manager':
        // Show direct reports (supervisors and their teams)
        const managerTeam = mockTeamData.supervisors.filter(s => s.managerId === user.id);
        const teamMembers = mockTeamData.team.filter(t => t.managerId === user.id);
        return {
          type: 'manager',
          supervisors: managerTeam,
          teamMembers: teamMembers
        };
        
      case 'supervisor':
        // Show manager and team under that manager
        const supervisor = mockTeamData.supervisors.find(s => s.name === user.name);
        const manager = mockTeamData.managers.find(m => m.id === supervisor?.managerId);
        const supervisorTeam = mockTeamData.team.filter(t => t.supervisorId === supervisor?.id);
        return {
          type: 'supervisor',
          manager: manager,
          teamMembers: supervisorTeam
        };
        
      case 'frontline':
      case 'support':
        // Show manager and supervisor
        const teamMember = mockTeamData.team.find(t => t.name === user.name);
        const memberSupervisor = mockTeamData.supervisors.find(s => s.id === teamMember?.supervisorId);
        const memberManager = mockTeamData.managers.find(m => m.id === teamMember?.managerId);
        return {
          type: 'team_member',
          manager: memberManager,
          supervisor: memberSupervisor
        };
        
      default:
        return null;
    }
  };

  const teamStructure = $derived(getTeamStructure());

  // Helper function to get initials from name
  const getInitials = (name: string) => {
    return name.split(' ').map((n: string) => n[0]).join('.');
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString();
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString();
  };

  const handleProfilePhotoChange = () => {
    // In a real app, this would handle file upload
    alert('Profile photo upload functionality would be implemented here');
  };

  const handleCoverPhotoChange = () => {
    // In a real app, this would handle file upload
    alert('Cover photo upload functionality would be implemented here');
  };

  const saveProfile = () => {
    user.name = editedName;
    isEditing = false;
    alert('Profile updated successfully!');
  };

  const cancelEdit = () => {
    editedName = user.name;
    isEditing = false;
  };

  // Demo role switching function for testing
  const switchRole = (newRole: "admin" | "manager" | "supervisor" | "support" | "frontline") => {
    if ($authStore.user) {
      $authStore.user.role = newRole;
      // Reset team structure visibility when role changes
      showTeamStructure = false;
    }
  };

  // Team management function
  const showTeam = () => {
    showTeamModal = true;
  };

  // Mock team data for managers and supervisors
  const getTeamMembers = () => {
    const userRole = authUser?.role?.toLowerCase();
    
    if (userRole === 'manager') {
      // Manager sees supervisors and their team members with proper hierarchy
      return {
        supervisors: [
          { 
            id: '3', 
            name: 'Lisa Chen', 
            role: 'Supervisor', 
            email: 'lisa.chen@company.com', 
            ou: 'Sales Department',
            teamMembers: [
              { id: '5', name: 'Alice Cooper', role: 'Frontline', email: 'alice.cooper@company.com', ou: 'Sales Department' },
              { id: '6', name: 'Bob Smith', role: 'Support', email: 'bob.smith@company.com', ou: 'Sales Department' }
            ]
          },
          { 
            id: '4', 
            name: 'David Brown', 
            role: 'Supervisor', 
            email: 'david.brown@company.com', 
            ou: 'Engineering',
            teamMembers: [
              { id: '7', name: 'Carol Davis', role: 'Frontline', email: 'carol.davis@company.com', ou: 'Engineering' },
              { id: '8', name: 'Dan Wilson', role: 'Support', email: 'dan.wilson@company.com', ou: 'Engineering' }
            ]
          }
        ]
      };
    } else if (userRole === 'supervisor') {
      // Supervisor sees only their direct team members
      return {
        supervisors: [],
        teamMembers: [
          { id: '5', name: 'Alice Cooper', role: 'Frontline', email: 'alice.cooper@company.com', ou: 'Sales Department' },
          { id: '6', name: 'Bob Smith', role: 'Support', email: 'bob.smith@company.com', ou: 'Sales Department' }
        ]
      };
    }
    
    return { supervisors: [], teamMembers: [] };
  };
</script>

<svelte:head>
  <title>Profile - {user.name}</title>
</svelte:head>

<div class="h-screen flex flex-col bg-gray-50">
  <Navigation />
  
  <div class="flex-1 overflow-auto">
    <div class="max-w-4xl mx-auto p-6 space-y-6">
      <!-- Profile Header -->
      <div class="collaboration-card overflow-hidden fade-in">
        <!-- Cover Photo -->
        <div class="relative h-48 bg-gradient-to-r from-[#01c0a4] to-[#00a085]">
          <img 
            src={user.coverPhoto} 
            alt="Cover" 
            class="w-full h-full object-cover"
          />
          <button
            onclick={handleCoverPhotoChange}
            class="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded-lg hover:bg-opacity-70 transition-colors"
            title="Change cover photo"
          >
            <Camera class="w-4 h-4" />
          </button>
        </div>

        <!-- Profile Info -->
        <div class="p-6">
          <div class="flex flex-col sm:flex-row items-start sm:items-end space-y-4 sm:space-y-0 sm:space-x-6">
            <!-- Profile Photo -->
            <div class="relative -mt-16 sm:-mt-20">
              <div class="relative">
                {#if user.profilePhoto}
                  <img 
                    src={user.profilePhoto} 
                    alt={user.name}
                    class="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white bg-white shadow-lg object-cover"
                  />
                {:else}
                  <div class="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white bg-[#01c0a4] shadow-lg flex items-center justify-center text-white text-2xl sm:text-3xl font-bold">
                    {userInitials}
                  </div>
                {/if}
                <!-- Online Status Indicator -->
                <div class="absolute bottom-2 right-2 w-6 h-6 {onlineStatusColor} rounded-full border-4 border-white"></div>
                <button
                  onclick={handleProfilePhotoChange}
                  class="absolute bottom-0 right-0 bg-[#01c0a4] text-white p-2 rounded-full hover:bg-[#00a085] transition-colors shadow-lg"
                  title="Change profile photo"
                >
                  <Camera class="w-4 h-4" />
                </button>
              </div>
            </div>

            <!-- Basic Info -->
            <div class="flex-1">
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  {#if isEditing}
                    <div class="flex items-center space-x-2 mb-2">
                      <input
                        bind:value={editedName}
                        class="text-2xl font-bold text-gray-900 bg-gray-50 border border-gray-300 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent"
                      />
                      <button
                        onclick={saveProfile}
                        class="text-green-600 hover:text-green-500 p-1"
                        title="Save"
                      >
                        <Save class="w-4 h-4" />
                      </button>
                      <button
                        onclick={cancelEdit}
                        class="text-gray-600 hover:text-gray-500 p-1"
                        title="Cancel"
                      >
                        <X class="w-4 h-4" />
                      </button>
                    </div>
                  {:else}
                    <div class="flex items-center space-x-2 mb-2">
                      <h1 class="text-2xl font-bold text-gray-900">{user.name}</h1>
                      <button
                        onclick={() => isEditing = true}
                        class="text-gray-600 hover:text-gray-500 p-1"
                        title="Edit name"
                      >
                        <Edit class="w-4 h-4" />
                      </button>
                    </div>
                  {/if}
                  <p class="text-gray-600 mb-1">{user.role} • {user.ou || 'Administration'}</p>
                  <p class="text-sm text-gray-500">Employee ID: {user.employeeId}</p>
                </div>

                <div class="mt-4 sm:mt-0">
                  <!-- Online Status Combobox -->
                  <div class="space-y-2">
                    <p class="text-xs text-gray-500 text-center">Status</p>
                    <div class="relative">
                      <select 
                        onchange={(e) => $authStore.updateOnlineStatus(e.target.value)}
                        value={authUser?.onlineStatus || 'online'}
                        class="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent min-w-[120px]"
                      >
                        <option value="online">🟢 Online</option>
                        <option value="away">🟡 Away</option>
                        <option value="idle">🟠 Idle</option>
                        <option value="offline">⚫ Offline</option>
                      </select>
                      <div class="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Profile Details -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Contact Information -->
        <div class="collaboration-card p-6 fade-in">
          <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Mail class="w-5 h-5 text-[#01c0a4] mr-2" />
            Contact Information
          </h2>
          
          <div class="space-y-4">
            <div>
              <label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <div class="flex items-center space-x-2" id="email">
                <Mail class="w-4 h-4 text-gray-400" />
                <span class="text-gray-900">{user.email}</span>
              </div>
            </div>
            
            <div>
              <label for="employee-id" class="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
              <span class="text-gray-900" id="employee-id">{user.employeeId}</span>
            </div>

            <div>
              <label for="join-date" class="block text-sm font-medium text-gray-700 mb-1">Join Date</label>
              <div class="flex items-center space-x-2" id="join-date">
                <Calendar class="w-4 h-4 text-gray-400" />
                <span class="text-gray-900">{formatDate(user.joinDate)}</span>
              </div>
            </div>

            <div>
              <label for="last-login" class="block text-sm font-medium text-gray-700 mb-1">Last Login</label>
              <div class="flex items-center space-x-2" id="last-login">
                <Clock class="w-4 h-4 text-gray-400" />
                <span class="text-gray-900">{formatDateTime(user.lastLogin)}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Role & Organization -->
        <div class="collaboration-card p-6 fade-in">
          <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Shield class="w-5 h-5 text-[#01c0a4] mr-2" />
            Role & Organization
          </h2>
          
          <div class="space-y-4">
            <div>
              <label for="role" class="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <div class="flex items-center space-x-2" id="role">
                <Shield class="w-4 h-4 text-gray-400" />
                <span class="inline-flex px-2 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800">
                  {user.role}
                </span>
              </div>
            </div>
            
            <!-- Show Organization Unit for non-admin users only -->
            {#if user.ou}
              <div>
                <label for="ou" class="block text-sm font-medium text-gray-700 mb-1">Organization Unit</label>
                <div class="flex items-center space-x-2" id="ou">
                  <Building2 class="w-4 h-4 text-gray-400" />
                  <span class="text-gray-900">{user.ou}</span>
                </div>
              </div>
            {/if}

            <!-- Show manager field for supervisor, frontline, and support roles -->
            {#if user.manager && (authUser?.role === 'supervisor' || authUser?.role === 'frontline' || authUser?.role === 'support')}
              <div>
                <label for="manager" class="block text-sm font-medium text-gray-700 mb-1">Manager</label>
                <div class="flex items-center space-x-2" id="manager">
                  <User class="w-4 h-4 text-gray-400" />
                  <span class="text-gray-900">{user.manager}</span>
                </div>
              </div>
            {/if}

            <!-- Show supervisor field only for frontline and support roles -->
            {#if user.supervisor && (authUser?.role === 'frontline' || authUser?.role === 'support')}
              <div>
                <label for="supervisor" class="block text-sm font-medium text-gray-700 mb-1">Supervisor</label>
                <div class="flex items-center space-x-2" id="supervisor">
                  <Users class="w-4 h-4 text-gray-400" />
                  <span class="text-gray-900">{user.supervisor}</span>
                </div>
              </div>
            {/if}

            <!-- Show team button for manager and supervisor roles -->
            {#if authUser?.role === 'manager' || authUser?.role === 'supervisor'}
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Team Management</label>
                <button
                  onclick={showTeam}
                  class="flex items-center space-x-2 px-4 py-2 bg-[#01c0a4] text-white rounded-lg hover:bg-[#00a085] transition-colors"
                >
                  <Users class="w-4 h-4" />
                  <span>View Team</span>
                </button>
              </div>
            {/if}
          </div>
        </div>


      </div>



      <!-- Account Settings -->
      <div class="collaboration-card p-6 fade-in">
        <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Settings class="w-5 h-5 text-[#01c0a4] mr-2" />
          Account Settings
        </h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 class="font-medium text-gray-900 mb-2">Notifications</h3>
            <div class="space-y-2">
              <label class="flex items-center">
                <input type="checkbox" checked class="rounded border-gray-300 text-[#01c0a4] focus:ring-[#01c0a4]" />
                <span class="ml-2 text-sm text-gray-700">Email notifications</span>
              </label>
              <label class="flex items-center">
                <input type="checkbox" checked class="rounded border-gray-300 text-[#01c0a4] focus:ring-[#01c0a4]" />
                <span class="ml-2 text-sm text-gray-700">Broadcast alerts</span>
              </label>
              <label class="flex items-center">
                <input type="checkbox" class="rounded border-gray-300 text-[#01c0a4] focus:ring-[#01c0a4]" />
                <span class="ml-2 text-sm text-gray-700">Chat mentions only</span>
              </label>
            </div>
          </div>

          <div>
            <h3 class="font-medium text-gray-900 mb-2">Privacy</h3>
            <div class="space-y-2">
              <label class="flex items-center">
                <input type="checkbox" checked class="rounded border-gray-300 text-[#01c0a4] focus:ring-[#01c0a4]" />
                <span class="ml-2 text-sm text-gray-700">Show online status</span>
              </label>
              <label class="flex items-center">
                <input type="checkbox" checked class="rounded border-gray-300 text-[#01c0a4] focus:ring-[#01c0a4]" />
                <span class="ml-2 text-sm text-gray-700">Allow direct messages</span>
              </label>
              <label class="flex items-center">
                <input type="checkbox" class="rounded border-gray-300 text-[#01c0a4] focus:ring-[#01c0a4]" />
                <span class="ml-2 text-sm text-gray-700">Hide from directory</span>
              </label>
            </div>
          </div>
        </div>

        <div class="mt-6 pt-6 border-t border-gray-200">
          <button class="primary-button flex items-center space-x-2">
            <Save class="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>

      <!-- Demo Role Switcher (for testing) -->
      <div class="collaboration-card p-6 fade-in">
        <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Settings class="w-5 h-5 text-[#01c0a4] mr-2" />
          Demo Role Switcher (Testing Only)
        </h2>
        
        <div class="space-y-3">
          <p class="text-sm text-gray-600 mb-4">Switch roles to test different team structure views:</p>
          
          <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
            <button 
              onclick={() => switchRole('admin')}
              class="px-4 py-2 border rounded-lg text-sm font-medium transition-colors {authUser?.role === 'admin' ? 'bg-purple-100 border-purple-500 text-purple-700' : 'border-gray-200 hover:border-purple-300'}"
            >
              Admin
            </button>
            
            <button 
              onclick={() => switchRole('manager')}
              class="px-4 py-2 border rounded-lg text-sm font-medium transition-colors {authUser?.role === 'manager' ? 'bg-blue-100 border-blue-500 text-blue-700' : 'border-gray-200 hover:border-blue-300'}"
            >
              Manager
            </button>
            
            <button 
              onclick={() => switchRole('supervisor')}
              class="px-4 py-2 border rounded-lg text-sm font-medium transition-colors {authUser?.role === 'supervisor' ? 'bg-green-100 border-green-500 text-green-700' : 'border-gray-200 hover:border-green-300'}"
            >
              Supervisor
            </button>
            
            <button 
              onclick={() => switchRole('support')}
              class="px-4 py-2 border rounded-lg text-sm font-medium transition-colors {authUser?.role === 'support' ? 'bg-yellow-100 border-yellow-500 text-yellow-700' : 'border-gray-200 hover:border-yellow-300'}"
            >
              Support
            </button>
            
            <button 
              onclick={() => switchRole('frontline')}
              class="px-4 py-2 border rounded-lg text-sm font-medium transition-colors {authUser?.role === 'frontline' ? 'bg-red-100 border-red-500 text-red-700' : 'border-gray-200 hover:border-red-300'}"
            >
              Frontline
            </button>
          </div>
          
          <div class="mt-4 p-3 bg-blue-50 rounded-lg">
            <p class="text-sm text-blue-700">
              <strong>Current Role:</strong> 
              <span class="capitalize">{authUser?.role || 'Unknown'}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Team Modal -->
{#if showTeamModal}
  <div 
    class="fixed inset-0 z-50 flex items-center justify-center p-4"
    onclick={() => showTeamModal = false}
  >
    <div
      class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto"
      role="document"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200">
        <h2 class="text-2xl font-semibold text-gray-900">
          {authUser?.role === 'manager' ? 'My Team Structure' : 'My Team Members'}
        </h2>
        <button
          onclick={() => showTeamModal = false}
          class="p-2 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <X class="w-6 h-6" />
        </button>
      </div>

      <!-- Content -->
      <div class="p-6">
        {#if authUser?.role === 'manager'}
          {@const teamData = getTeamMembers()}
          
          <!-- Manager View: Show supervisors and team members -->
          <div class="space-y-8">
            <!-- Current Manager -->
            <div class="text-center">
              <div class="flex justify-center mb-4">
                <div class="bg-purple-100 border border-purple-200 rounded-lg p-4 text-center min-w-[200px]">
                  <div class="w-12 h-12 bg-purple-500 rounded-full mx-auto mb-2 flex items-center justify-center text-white text-lg font-bold">
                    {userInitials}
                  </div>
                  <div class="font-medium text-gray-900">{user.name}</div>
                  <div class="text-sm text-gray-600">{user.role}</div>
                  <div class="text-sm text-gray-500">{user.ou}</div>
                </div>
              </div>
            </div>

            {#if teamData.supervisors.length > 0}
              <!-- Supervisors Section -->
              <div>
                <h3 class="text-lg font-medium text-gray-900 text-center mb-4">Supervisors ({teamData.supervisors.length})</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {#each teamData.supervisors as supervisor}
                    <div class="bg-blue-100 border border-blue-200 rounded-lg p-4 text-center">
                      <div class="w-10 h-10 bg-blue-500 rounded-full mx-auto mb-2 flex items-center justify-center text-white text-sm font-bold">
                        {getInitials(supervisor.name)}
                      </div>
                      <div class="font-medium text-gray-900 text-sm">{supervisor.name}</div>
                      <div class="text-xs text-gray-600">{supervisor.role}</div>
                      <div class="text-xs text-gray-500">{supervisor.ou}</div>
                      <div class="text-xs text-gray-500 mt-1">{supervisor.email}</div>
                      
                      <!-- Show team members under this supervisor -->
                      {#if supervisor.teamMembers && supervisor.teamMembers.length > 0}
                        <div class="mt-3 pt-3 border-t border-blue-300">
                          <div class="text-xs font-medium text-blue-700 mb-2">Team Members ({supervisor.teamMembers.length})</div>
                          <div class="space-y-1">
                            {#each supervisor.teamMembers as member}
                              <div class="text-xs {member.role === 'frontline' ? 'text-red-600 bg-red-50' : 'text-blue-600 bg-blue-50'} px-2 py-1 rounded">
                                {member.name} • {member.role}
                              </div>
                            {/each}
                          </div>
                        </div>
                      {/if}
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
          
        {:else if authUser?.role === 'supervisor'}
          {@const teamData = getTeamMembers()}
          
          <!-- Supervisor View: Show only team members with color coding -->
          <div class="space-y-8">
            <!-- Current Supervisor -->
            <div class="text-center">
              <div class="flex justify-center mb-4">
                <div class="bg-blue-100 border border-blue-200 rounded-lg p-4 text-center min-w-[200px]">
                  <div class="w-12 h-12 bg-blue-500 rounded-full mx-auto mb-2 flex items-center justify-center text-white text-lg font-bold">
                    {userInitials}
                  </div>
                  <div class="font-medium text-gray-900">{user.name}</div>
                  <div class="text-sm text-gray-600">{user.role}</div>
                  <div class="text-sm text-gray-500">{user.ou}</div>
                </div>
              </div>
            </div>

            {#if teamData.teamMembers.length > 0}
              <!-- Team Members Section with Color Coding -->
              <div>
                <h3 class="text-lg font-medium text-gray-900 text-center mb-4">My Team Members ({teamData.teamMembers.length})</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {#each teamData.teamMembers as member}
                    <div class="{member.role === 'frontline' ? 'bg-red-100 border-red-200' : 'bg-blue-100 border-blue-200'} border rounded-lg p-4 text-center">
                      <div class="w-10 h-10 {member.role === 'frontline' ? 'bg-red-500' : 'bg-blue-500'} rounded-full mx-auto mb-2 flex items-center justify-center text-white text-sm font-bold">
                        {getInitials(member.name)}
                      </div>
                      <div class="font-medium text-gray-900 text-sm">{member.name}</div>
                      <div class="text-xs text-gray-600 font-medium {member.role === 'frontline' ? 'text-red-700' : 'text-blue-700'}">{member.role}</div>
                      <div class="text-xs text-gray-500">{member.ou}</div>
                      <div class="text-xs text-gray-500 mt-1">{member.email}</div>
                    </div>
                  {/each}
                </div>
              </div>
            {:else}
              <div class="text-center py-8">
                <Users class="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 class="text-lg font-medium text-gray-900 mb-2">No Team Members</h3>
                <p class="text-gray-500">You don't have any team members assigned yet.</p>
              </div>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <div class="flex justify-end p-6 border-t border-gray-200">
        <button
          onclick={() => showTeamModal = false}
          class="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  </div>
{/if}
