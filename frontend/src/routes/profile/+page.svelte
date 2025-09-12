<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    User, Save, Edit, X, Mail, Calendar, Clock, Shield, 
    Building2, Users, Settings, Camera, Loader
  } from 'lucide-svelte';
  import Navigation from '$lib/components/Navigation.svelte';
  import ProfileAvatar from '$lib/components/ProfileAvatar.svelte';
  import { authStore } from '$lib/stores/auth.svelte';
  import { profileAPI, type UserProfile } from '$lib/api/profile';
  import { toastStore } from '$lib/stores/toast.svelte';
  import ToastContainer from '$lib/components/ToastContainer.svelte';
  import { ImageUploadService } from '$lib/services/image-upload.service';
  import ProfilePhotoUploadModal from '$lib/components/ProfilePhotoUploadModal.svelte';

  // Profile state
  let userProfile = $state<UserProfile | null>(null);
  let isLoading = $state(true);
  let isEditing = $state(false);
  let editedName = $state('');
  
  let showTeamStructure = $state(false);
  let showTeamModal = $state(false);
  let selectedSupervisor = $state<any>(null);
  //Image Upload State Variable
  let isUploadingProfilePhoto = $state(false);
  let isUploadingCoverPhoto = $state(false);
  let uploadError = $state<string | null>(null);
  let showProfilePhotoModal = $state(false);

    

  // Get current user from auth store
  const authUser = $derived($authStore.user);

  // Computed online status color
  const onlineStatusColor = $derived(() => {
    switch (authUser?.onlineStatus) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'idle': return 'bg-orange-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  });

  // Profile state based on authenticated user - using derived for reactivity
  const user = $derived({
  id: userProfile?.id || authUser?.id || '1',
  name: userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 
        (authUser ? `${authUser.firstName || 'John'} ${authUser.lastName || 'Doe'}` : 'John Doe'),
  email: userProfile?.email || authUser?.email || 'john.doe@company.com',
  role: userProfile?.role || authUser?.role || 'Manager',
  organizationUnit: userProfile?.organizationUnit || authUser?.organizationUnit || 'Sales Department',
  onlineStatus: userProfile?.onlineStatus || authUser?.onlineStatus || 'online',
  // PRIORITY: userProfile first, then authUser, ensuring reactivity
  profilePhoto: userProfile?.profilePhoto || authUser?.profilePhoto || null,
  ou: userProfile?.organizationUnit || authUser?.organizationUnit || 'Sales Department',
  // Convert string dates to Date objects
  joinDate: userProfile?.joinDate ? new Date(userProfile.joinDate) : new Date('2023-01-15'),
  lastLogin: userProfile?.lastLogin ? new Date(userProfile.lastLogin) : new Date(),
  manager: userProfile?.manager || 'Sarah Wilson',
  supervisor: userProfile?.supervisor || 'Mike Johnson',
  coverPhoto: userProfile?.coverPhoto || '/placeholder.svg?height=300&width=800'
});

  const debugProfileData = () => {
    console.group('[Profile Debug] Complete Data Analysis');
    console.log('1. Raw userProfile from API:', userProfile);
    console.log('2. Auth store user:', authUser);
    console.log('3. Derived user object:', user);
    console.log('4. Profile photo sources:');
    console.log('   - userProfile?.profilePhoto:', userProfile?.profilePhoto);
    console.log('   - authUser?.profilePhoto:', authUser?.profilePhoto);
    console.log('   - user.profilePhoto:', user.profilePhoto);
    console.groupEnd();
  };

  onMount(async () => {
    try {
      console.log('[Profile Debug] Fetching user profile...');
      const result = await profileAPI.getUserProfile();
      console.log('[Profile Debug] Raw API response:', result);
      
      // Add detailed logging of the response structure
      console.log('[Profile Debug] Response structure analysis:');
      console.log('- result.ok:', result.ok);
      console.log('- result.data:', result.data);
      console.log('- result.data.profile:', result.data.profile);
      console.log('- result.data.profile.profilePhoto:', result.data.profile?.profilePhoto);
      console.log('- result.data.profile.coverPhoto:', result.data.profile?.coverPhoto);
      
      userProfile = result.data.profile;
      console.log('[Profile Debug] Assigned userProfile:', userProfile);
      
      // Call debug function after assignment
      setTimeout(debugProfileData, 100);
      
      // Sync with auth store if needed
      if (userProfile && !authUser) {
        $authStore.user = {
          id: userProfile.id,
          username: userProfile.username,
          email: userProfile.email,
          role: userProfile.role,
          firstName: userProfile.firstName,
          lastName: userProfile.lastName,
          organizationUnit: userProfile.organizationUnit,
          onlineStatus: userProfile.onlineStatus || 'offline',
          profilePhoto: userProfile.profilePhoto // Make sure this is included
        };
        console.log('[Profile Debug] Updated auth store with profile photo:', userProfile.profilePhoto);
      }
      
      if (userProfile) {
        editedName = `${userProfile.firstName} ${userProfile.lastName}`;
      }
    } catch (error) {
      console.error('Failed to load profile data:', error);
      $toastStore.error('Failed to load profile data');
    } finally {
      isLoading = false;
    }
  });

  $effect(() => {
    if (userProfile || authUser) {
      console.log('[Profile Debug] Reactive update detected:');
      console.log('- userProfile.profilePhoto changed to:', userProfile?.profilePhoto);
      console.log('- authUser.profilePhoto is:', authUser?.profilePhoto);
      console.log('- Final user.profilePhoto is:', user.profilePhoto);
    }
  });

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
        const managerTeam = mockTeamData.supervisors.filter(s => s.managerId === user.id);
        const teamMembers = mockTeamData.team.filter(t => t.managerId === user.id);
        return {
          type: 'manager',
          supervisors: managerTeam,
          teamMembers: teamMembers
        };
        
      case 'supervisor':
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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString();
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString();
  };

  const handleProfilePhotoChange = () => {
    showProfilePhotoModal = true;
  };

  const handleSaveProfilePhoto = async (blob: Blob) => {
    if (!blob || !authUser) return;
    
    try {
      isUploadingProfilePhoto = true;
      
      // Create a File object from the Blob
      const file = new File([blob], `profile-${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      const result = await ImageUploadService.uploadUserImage(
        file,
        user.id,
        'profile'
      );
      
      // Update profile in backend
      const response = await profileAPI.updateUserProfile({
        profilePhoto: result.url
      });
      
      // Update userProfile state
      userProfile = {
        ...response.data.profile,
        profilePhoto: result.url
      };
      
      // Update auth store with the new photo URL
      $authStore.updateProfilePhoto(result.url);
      
      $toastStore.success('Profile photo updated successfully');
      showProfilePhotoModal = false;
    } catch (error) {
      console.error('Failed to update profile photo:', error);
      uploadError = error instanceof Error ? error.message : 'Failed to upload image';
      $toastStore.error(uploadError);
    } finally {
      isUploadingProfilePhoto = false;
    }
  };

  const handleCoverPhotoChange = async () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    
    const currentUser = $authStore.user;
    if (!currentUser) {
      $toastStore.error('Please log in to upload photos');
      return;
    }
    
    try {
      isUploadingCoverPhoto = true;
      uploadError = null;
      
      const result = await ImageUploadService.uploadUserImage(
        file,
        user.id,
        'cover'
      );
      
      // Update profile in backend
      const response = await profileAPI.updateUserProfile({
        coverPhoto: result.url
      });
      
      // Update local state
      userProfile = {
        ...response.data.profile,
        coverPhoto: result.url
      };
      
      $toastStore.success('Cover photo updated successfully');
    } catch (error) {
      console.error('Failed to update cover photo:', error);
      uploadError = error instanceof Error ? error.message : 'Failed to upload image';
      $toastStore.error(uploadError);
    } finally {
      isUploadingCoverPhoto = false;
    }
  };
  input.click();
};

  const saveProfile = async () => {
    if (!userProfile || !editedName.trim()) return;

    try {
      const [firstName, ...lastNameParts] = editedName.trim().split(' ');
      const lastName = lastNameParts.join(' ');

      const result = await profileAPI.updateUserProfile({
        firstName,
        lastName
      });

      userProfile = result.data.profile;
      isEditing = false;
      $toastStore.success('Profile updated successfully');
    } catch (error) {
      console.error('Failed to update profile:', error);
      $toastStore.error('Failed to update profile');
    }
  };

  const cancelEdit = () => {
    if (userProfile) {
      editedName = `${userProfile.firstName} ${userProfile.lastName}`;
    }
    isEditing = false;
  };

const updateOnlineStatus = async (status: 'online' | 'away' | 'idle' | 'offline') => {
    if (!userProfile) return;

    try {
      const result = await profileAPI.updateUserProfile({
        onlineStatus: status
      });

      userProfile = result.data.profile;
      $toastStore.success('Status updated');
    } catch (error) {
      console.error('Failed to update status:', error);
      $toastStore.error('Failed to update status');
    }
  };

  const switchRole = (newRole: "admin" | "manager" | "supervisor" | "support" | "frontline") => {
    if ($authStore.user) {
      $authStore.user.role = newRole;
      showTeamStructure = false;
    }
  };

  const showTeam = () => {
    showTeamModal = true;
  };

  const getTeamMembers = () => {
    const userRole = authUser?.role?.toLowerCase();
    
    if (userRole === 'manager') {
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
            disabled={isUploadingCoverPhoto}
            class="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded-lg hover:bg-opacity-70 transition-colors"
            title="Change cover photo"
          >
            {#if isUploadingCoverPhoto}
              <Loader class="w-4 h-4 animate-spin" />
            {:else}
              <Camera class="w-4 h-4" />
            {/if}
          </button>
        </div>

        <!-- Profile Info -->
        <div class="p-6">
          <div class="flex flex-col sm:flex-row items-start sm:items-end space-y-4 sm:space-y-0 sm:space-x-6">
            <!-- Profile Photo -->
            <div class="relative -mt-16 sm:-mt-20">
              <div class="relative">
                <div class="border-4 border-white shadow-lg rounded-full">
                  <ProfileAvatar 
                    user={{ 
                      ...user, 
                      profilePhoto: user.profilePhoto || undefined,
                      name: user.name
                    }} 
                    size="2xl" 
                    altText={user.name}
                  />
                </div>


              <button
                onclick={handleProfilePhotoChange}
                disabled={isUploadingProfilePhoto}
                class="absolute bottom-0 right-0 bg-[#01c0a4] text-white p-2 rounded-full hover:bg-[#00a085] transition-colors shadow-lg"
                title="Change profile photo"
              >
                {#if isUploadingProfilePhoto}
                  <Loader class="w-4 h-4 animate-spin" />
                {:else}
                  <Camera class="w-4 h-4" />
                {/if}
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
                </div>

                <div class="mt-4 sm:mt-0">
                  <!-- Online Status Combobox -->
                  <div class="space-y-2">
                    <p class="text-xs text-gray-500 text-center">Status</p>
                    <div class="relative">
                      <select 
                        onchange={(e) => {
                          const target = e.target as HTMLSelectElement;
                          if (target && ['online', 'away', 'idle', 'offline'].includes(target.value)) {
                            $authStore.updateOnlineStatus(target.value as 'online' | 'away' | 'idle' | 'offline');
                          }
                        }}
                        value={authUser?.onlineStatus || 'online'}
                        class="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent min-w-[120px]"
                      >
                        <option value="online">🟢 Online</option>
                        <option value="away">🟡 Away</option>
                        <option value="idle">🟠 Idle</option>
                        <option value="offline">⚫ Offline</option>
                      </select>
                      <div class="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">

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
            {#if (authUser?.role === 'manager' || authUser?.role === 'supervisor') || (userProfile?.role === 'manager' || userProfile?.role === 'supervisor')}
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Team Management</label>
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
    onkeydown={(e) => e.key === 'Escape' && (showTeamModal = false)}
    role="button"
    tabindex="0"
    aria-label="Close team modal"
  >
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto"
      role="document"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
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
          
          <!-- Manager View: Show supervisors, click to show their teams -->
          <div class="space-y-8">
            <!-- Current Manager -->
            <div class="text-center">
              <div class="flex justify-center mb-4">
                <div class="bg-teal-600 text-white p-6 rounded-lg shadow-lg min-w-[250px] text-center">
                  <div class="mx-auto mb-3"><ProfileAvatar user={{ name: user.name }} size="xl" showOnlineStatus={false} /></div>
                  <div class="text-lg font-bold">{user.name}</div>
                  <div class="text-sm opacity-90">{user.role}</div>
                  <div class="text-xs opacity-75">{user.ou}</div>
                </div>
              </div>

              <!-- Vertical Connection Line -->
              {#if teamData.supervisors.length > 0}
                <div class="flex justify-center">
                  <div class="w-0.5 h-12 bg-gray-300"></div>
                </div>
              {/if}
            </div>

            {#if teamData.supervisors.length > 0}
              <!-- Supervisors Section -->
              <div class="space-y-6">
                <h3 class="text-lg font-medium text-gray-900 text-center">Supervisors ({teamData.supervisors.length})</h3>
                <p class="text-sm text-gray-600 text-center">Click on a supervisor to view their team members</p>
                
                <!-- Horizontal line -->
                <div class="flex justify-center">
                  <div class="w-full max-w-4xl h-0.5 bg-gray-300"></div>
                </div>

                <!-- Supervisor Cards - Clickable -->
                <div class="flex justify-center">
                  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl">
                    {#each teamData.supervisors as supervisor}
                      <button
                        onclick={() => selectedSupervisor = selectedSupervisor?.id === supervisor.id ? null : supervisor}
                        class="bg-emerald-600 hover:bg-emerald-700 text-white p-4 rounded-lg shadow-lg text-center min-w-[200px] transition-all duration-200 transform hover:scale-105 cursor-pointer"
                      >
                        <div class="mx-auto mb-2"><ProfileAvatar user={{ name: supervisor.name }} size="lg" showOnlineStatus={false} /></div>
                        <div class="font-semibold">{supervisor.name}</div>
                        <div class="text-sm opacity-90">{supervisor.role}</div>
                        <div class="text-xs opacity-75">{supervisor.ou}</div>
                        <div class="text-xs opacity-75 mt-1">{supervisor.email}</div>
                      </button>
                    {/each}
                  </div>
                </div>

                <!-- Selected Supervisor's Team Members -->
                {#if selectedSupervisor && selectedSupervisor.teamMembers && selectedSupervisor.teamMembers.length > 0}
                  <div class="mt-8 p-6 bg-gray-50 rounded-lg">
                    <h4 class="text-lg font-medium text-gray-900 text-center mb-4">
                      {selectedSupervisor.name}'s Team ({selectedSupervisor.teamMembers.length})
                    </h4>
                    
                    <!-- Team Member Cards -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {#each selectedSupervisor.teamMembers as member}
                        <div class="{
                          member.role === 'Frontline' ? 'bg-cyan-100 border-cyan-300' :
                          member.role === 'Support' ? 'bg-teal-100 border-teal-300' :
                          'bg-green-100 border-green-200'
                        } border-2 rounded-lg p-4 text-center shadow-sm">
                          <div class="mx-auto mb-2"><ProfileAvatar user={{ name: member.name }} size="lg" showOnlineStatus={false} /></div>
                          <div class="font-medium text-gray-900 text-sm" title="{member.name}">{member.name}</div>
                          <div class="text-xs {
                            member.role === 'Frontline' ? 'text-cyan-700' :
                            member.role === 'Support' ? 'text-teal-700' :
                            'text-gray-600'
                          } font-semibold">{member.role}</div>
                          <div class="text-xs text-gray-500 mt-1" title="{member.ou}">{member.ou}</div>
                          <div class="text-xs text-gray-500 truncate" title="{member.email}">{member.email}</div>
                        </div>
                      {/each}
                    </div>
                  </div>
                {/if}
              </div>
            {/if}
          </div>
          
        {:else if authUser?.role === 'supervisor'}
          {@const teamData = getTeamMembers()}
          
          <!-- Supervisor View: Show team members with better spacing -->
          <div class="space-y-6">
            <!-- Current Supervisor -->
            <div class="text-center">
              <div class="flex justify-center mb-6">
                <div class="bg-emerald-600 text-white p-6 rounded-lg shadow-lg min-w-[250px] text-center">
                  <div class="mx-auto mb-3"><ProfileAvatar user={{ name: user.name }} size="xl" showOnlineStatus={false} /></div>
                  <div class="text-lg font-bold">{user.name}</div>
                  <div class="text-sm opacity-90">{user.role}</div>
                  <div class="text-xs opacity-75">{user.ou}</div>
                </div>
              </div>
            </div>

            {#if teamData.teamMembers && teamData.teamMembers.length > 0}
              <!-- Team Members Section -->
              <div class="space-y-4">
                <h3 class="text-lg font-medium text-gray-900 text-center">My Team Members ({teamData.teamMembers?.length || 0})</h3>
                
                <!-- Vertical Connection Line -->
                <div class="flex justify-center">
                  <div class="w-0.5 h-8 bg-gray-300"></div>
                </div>
                
                <!-- Team Member Cards with proper spacing -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                  {#each teamData.teamMembers || [] as member}
                    <div class="{
                      member.role === 'Frontline' ? 'bg-cyan-100 border-cyan-300' :
                      member.role === 'Support' ? 'bg-teal-100 border-teal-300' :
                      'bg-green-100 border-green-200'
                    } border-2 rounded-lg p-4 text-center shadow-md hover:shadow-lg transition-shadow">
                      <div class="mx-auto mb-3"><ProfileAvatar user={{ name: member.name }} size="lg" showOnlineStatus={false} /></div>
                      <div class="font-semibold text-gray-900" title="{member.name}">{member.name}</div>
                      <div class="text-sm {
                        member.role === 'Frontline' ? 'text-cyan-700' :
                        member.role === 'Support' ? 'text-teal-700' :
                        'text-gray-600'
                      } font-medium">{member.role}</div>
                      <div class="text-xs text-gray-600 mt-1" title="{member.ou}">{member.ou}</div>
                      <div class="text-xs text-gray-500 mt-1 truncate" title="{member.email}">{member.email}</div>
                    </div>
                  {/each}
                </div>
              </div>
            {:else}
              <div class="text-center text-gray-500 py-8">
                <Users class="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No team members assigned yet</p>
              </div>
            {/if}
          </div>
          
        {:else if authUser?.role === 'frontline' || authUser?.role === 'support'}
          <!-- Frontline/Support View: Show manager and supervisor hierarchy -->
          <div class="space-y-8">
            <!-- Show hierarchy: Manager -> Supervisor -> Current User -->
            {#if teamStructure?.manager}
              <div class="text-center">
                <h3 class="text-lg font-medium text-gray-900 mb-4">My Manager</h3>
                <div class="flex justify-center mb-4">
                  <div class="bg-teal-600 text-white p-4 rounded-lg shadow-lg min-w-[200px] text-center">
                    <div class="mx-auto mb-2"><ProfileAvatar user={{ name: teamStructure.manager.name }} size="lg" showOnlineStatus={false} /></div>
                    <div class="font-semibold">{teamStructure.manager.name}</div>
                    <div class="text-sm opacity-90">{teamStructure.manager.role}</div>
                    <div class="text-xs opacity-75">{teamStructure.manager.ou}</div>
                    <div class="text-xs opacity-75 mt-1">{teamStructure.manager.email}</div>
                  </div>
                </div>
                
                <!-- Connection line -->
                {#if teamStructure?.supervisor}
                  <div class="flex justify-center">
                    <div class="w-0.5 h-8 bg-gray-300"></div>
                  </div>
                {/if}
              </div>
            {/if}

            {#if teamStructure?.supervisor}
              <div class="text-center">
                <h3 class="text-lg font-medium text-gray-900 mb-4">My Supervisor</h3>
                <div class="flex justify-center mb-4">
                  <div class="bg-emerald-600 text-white p-4 rounded-lg shadow-lg min-w-[200px] text-center">
                    <div class="mx-auto mb-2"><ProfileAvatar user={{ name: teamStructure.supervisor.name }} size="lg" showOnlineStatus={false} /></div>
                    <div class="font-semibold">{teamStructure.supervisor.name}</div>
                    <div class="text-sm opacity-90">{teamStructure.supervisor.role}</div>
                    <div class="text-xs opacity-75">{teamStructure.supervisor.ou}</div>
                    <div class="text-xs opacity-75 mt-1">{teamStructure.supervisor.email}</div>
                  </div>
                </div>
                
                <!-- Connection line -->
                <div class="flex justify-center">
                  <div class="w-0.5 h-8 bg-gray-300"></div>
                </div>
              </div>
            {/if}

            <!-- Current User -->
            <div class="text-center">
              <h3 class="text-lg font-medium text-gray-900 mb-4">Me</h3>
              <div class="flex justify-center">
                <div class="{
                  user.role === 'Frontline' ? 'bg-cyan-100 border-cyan-300' :
                  user.role === 'Support' ? 'bg-teal-100 border-teal-300' :
                  'bg-green-100 border-green-200'
                } border rounded-lg p-4 text-center min-w-[200px]">
                  <div class="mx-auto mb-2"><ProfileAvatar user={{ name: user.name }} size="lg" showOnlineStatus={false} /></div>
                  <div class="font-medium text-gray-900">{user.name}</div>
                  <div class="text-sm {
                    user.role === 'Frontline' ? 'text-cyan-700' :
                    user.role === 'Support' ? 'text-teal-700' :
                    'text-gray-600'
                  } font-semibold">{user.role}</div>
                  <div class="text-sm text-gray-500">{user.ou}</div>
                  <div class="text-sm text-gray-500 mt-1">{user.email}</div>
                </div>
              </div>
            </div>
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

<!-- Modals at the end, outside of any other elements -->
<ToastContainer />

{#if showProfilePhotoModal}
  <ProfilePhotoUploadModal 
    show={showProfilePhotoModal}
    onClose={() => showProfilePhotoModal = false}
    onSave={handleSaveProfilePhoto}
  />
{/if}

