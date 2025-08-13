<script lang="ts">
	import { X, Mail, Building, Users, Shield, Clock, User } from 'lucide-svelte';
	import ProfileAvatar from './ProfileAvatar.svelte';

	// Props - only need userName and modal state
	let {
		userName = '',
		show = false,
		onClose = () => {}
	}: {
		userName?: string;
		show?: boolean;
		onClose?: () => void;
	} = $props();

	// Team modal state
	let showTeamModal = $state(false);
	let selectedSupervisor = $state<any>(null);

	// Complete mock data for all users
	const usersDatabase = {
		'John Doe': {
			id: '2',
			name: 'John Doe',
			firstName: 'John',
			lastName: 'Doe',
			avatar: '/placeholder.svg',
			department: 'Engineering',
			role: 'manager',
			organizationalUnit: 'Product Development',
			email: 'john.doe@company.com',
			status: 'online',
			lastLogin: '2024-08-10 14:30',
			managedTeams: [],
			supervisors: [],
			reportingTo: null, // Managers don't report to anyone
			coverPhoto: '/placeholder.svg?height=200&width=800'
		},
		'Alice Johnson': {
			id: '3',
			name: 'Alice Johnson',
			firstName: 'Alice',
			lastName: 'Johnson',
			avatar: '/placeholder.svg',
			department: 'Marketing',
			role: 'supervisor',
			organizationalUnit: 'Digital Marketing',
			email: 'alice.johnson@company.com',
			status: 'away',
			lastLogin: '2024-08-10 13:45',
			managedTeams: ['Content Team'],
			supervisors: [],
			reportingTo: 'Mike Chen (Manager)',
			coverPhoto: '/placeholder.svg?height=200&width=800'
		},
		'Bob Smith': {
			id: '4',
			name: 'Bob Smith',
			firstName: 'Bob',
			lastName: 'Smith',
			avatar: '/placeholder.svg',
			department: 'Sales',
			role: 'frontline',
			organizationalUnit: 'Regional Sales',
			email: 'bob.smith@company.com',
			status: 'idle',
			lastLogin: '2024-08-10 12:20',
			managedTeams: [],
			supervisors: ['Lisa Brown (Supervisor)'],
			reportingTo: 'Mike Chen (Manager)',
			coverPhoto: '/placeholder.svg?height=200&width=800'
		},
		'Carol White': {
			id: '5',
			name: 'Carol White',
			firstName: 'Carol',
			lastName: 'White',
			avatar: '/placeholder.svg',
			department: 'Support',
			role: 'support',
			organizationalUnit: 'Customer Success',
			email: 'carol.white@company.com',
			status: 'online',
			lastLogin: '2024-08-10 15:10',
			managedTeams: [],
			supervisors: ['David Park (Supervisor)'],
			reportingTo: 'Sarah Wilson (Manager)',
			coverPhoto: '/placeholder.svg?height=200&width=800'
		},
		'Current User': {
			id: '1',
			name: 'Current User',
			firstName: 'Current',
			lastName: 'User',
			avatar: '/placeholder.svg',
			department: 'IT',
			role: 'admin',
			organizationalUnit: 'Information Technology',
			email: 'admin@company.com',
			status: 'online',
			lastLogin: '2024-08-10 14:30',
			managedTeams: ['IT Operations', 'Security Team'],
			supervisors: [],
			reportingTo: null,
			coverPhoto: '/placeholder.svg?height=200&width=800'
		},
		// Fallback for unknown users
		'': {
			id: 'unknown',
			name: 'Unknown User',
			firstName: 'Unknown',
			lastName: 'User',
			avatar: '/placeholder.svg',
			department: 'Unknown',
			role: 'Unknown',
			organizationalUnit: 'Unknown',
			email: 'unknown@company.com',
			status: 'offline',
			lastLogin: 'Never',
			managedTeams: [],
			supervisors: [],
			reportingTo: null,
			coverPhoto: '/placeholder.svg?height=200&width=800'
		}
	};

	// Get user data based on userName
	const userData = $derived(() => {
		console.log('🔍 UserProfileModal Debug:');
		console.log('  - userName:', `"${userName}"`);
		console.log('  - userName length:', userName?.length);
		console.log('  - typeof userName:', typeof userName);
		console.log('  - Available users:', Object.keys(usersDatabase));
		
		if (!userName || userName === '') {
			console.log('  - ❌ userName is empty/null, using fallback');
			return usersDatabase[''];
		}
		
		// Try exact match first
		let foundUser = usersDatabase[userName as keyof typeof usersDatabase];
		if (foundUser) {
			console.log('  - ✅ Found user (exact match):', foundUser.name, foundUser.role);
			return foundUser;
		}
		
		// Try trimmed match
		const trimmedName = userName.trim();
		foundUser = usersDatabase[trimmedName as keyof typeof usersDatabase];
		if (foundUser) {
			console.log('  - ✅ Found user (trimmed match):', foundUser.name, foundUser.role);
			return foundUser;
		}
		
		// Try case-insensitive match
		const lowerName = userName.toLowerCase();
		for (const [key, user] of Object.entries(usersDatabase)) {
			if (key.toLowerCase() === lowerName) {
				console.log('  - ✅ Found user (case-insensitive match):', user.name, user.role);
				return user;
			}
		}
		
		console.log('  - ❌ User not found anywhere, using fallback');
		return usersDatabase[''];
	});

	// Mock team data for all users
	const mockTeamData = {
		managers: [
			{ id: '1', name: 'Sarah Wilson', role: 'Manager', email: 'sarah.wilson@company.com', ou: 'Sales Department' },
			{ id: '2', name: 'Mike Johnson', role: 'Manager', email: 'mike.johnson@company.com', ou: 'Engineering' }
		],
		supervisors: [
			{ id: '3', name: 'Lisa Chen', role: 'Supervisor', email: 'lisa.chen@company.com', ou: 'Sales Department', managerId: '1' },
			{ id: '4', name: 'David Brown', role: 'Supervisor', email: 'david.brown@company.com', ou: 'Engineering', managerId: '2' },
			{ id: '5', name: 'Alice Johnson', role: 'Supervisor', email: 'alice.johnson@company.com', ou: 'Digital Marketing', managerId: '2' }
		],
		team: [
			{ id: '6', name: 'Alice Cooper', role: 'Frontline', email: 'alice.cooper@company.com', ou: 'Sales Department', supervisorId: '3', managerId: '1' },
			{ id: '7', name: 'Bob Smith', role: 'Support', email: 'bob.smith@company.com', ou: 'Sales Department', supervisorId: '3', managerId: '1' },
			{ id: '8', name: 'Carol Davis', role: 'Frontline', email: 'carol.davis@company.com', ou: 'Engineering', supervisorId: '4', managerId: '2' },
			{ id: '9', name: 'Dan Wilson', role: 'Support', email: 'dan.wilson@company.com', ou: 'Engineering', supervisorId: '4', managerId: '2' },
			{ id: '10', name: 'Carol White', role: 'Support', email: 'carol.white@company.com', ou: 'Customer Success', supervisorId: '5', managerId: '2' }
		]
	};

	// Get team structure based on user role
	const getTeamStructure = () => {
		const userRole = userData()?.role?.toLowerCase();
		const currentUser = userData();
		
		switch (userRole) {
			case 'manager':
				const managerTeam = mockTeamData.supervisors.filter(s => s.name === currentUser?.name || currentUser?.managedTeams?.some(team => team.includes('Team')));
				const teamMembers = mockTeamData.team.filter(t => currentUser?.managedTeams?.some(team => team.includes('Team')));
				return {
					type: 'manager',
					supervisors: managerTeam,
					teamMembers: teamMembers
				};
				
			case 'supervisor':
				const supervisor = mockTeamData.supervisors.find(s => s.name === currentUser?.name);
				const manager = mockTeamData.managers.find(m => m.id === supervisor?.managerId);
				const supervisorTeam = mockTeamData.team.filter(t => t.supervisorId === supervisor?.id);
				return {
					type: 'supervisor',
					manager: manager,
					teamMembers: supervisorTeam
				};
				
			case 'frontline':
			case 'support':
				const teamMember = mockTeamData.team.find(t => t.name === currentUser?.name);
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

	// Get team members for managers and supervisors  
	const getTeamMembers = () => {
		const userRole = userData()?.role?.toLowerCase();
		
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
							{ id: '6', name: 'Alice Cooper', role: 'Frontline', email: 'alice.cooper@company.com', ou: 'Sales Department' },
							{ id: '7', name: 'Bob Smith', role: 'Support', email: 'bob.smith@company.com', ou: 'Sales Department' }
						]
					},
					{ 
						id: '4', 
						name: 'David Brown', 
						role: 'Supervisor', 
						email: 'david.brown@company.com', 
						ou: 'Engineering',
						teamMembers: [
							{ id: '8', name: 'Carol Davis', role: 'Frontline', email: 'carol.davis@company.com', ou: 'Engineering' },
							{ id: '9', name: 'Dan Wilson', role: 'Support', email: 'dan.wilson@company.com', ou: 'Engineering' }
						]
					}
				]
			};
		} else if (userRole === 'supervisor') {
			return {
				supervisors: [],
				teamMembers: [
					{ id: '6', name: 'Alice Cooper', role: 'Frontline', email: 'alice.cooper@company.com', ou: 'Sales Department' },
					{ id: '7', name: 'Bob Smith', role: 'Support', email: 'bob.smith@company.com', ou: 'Sales Department' }
				]
			};
		}
		
		return { supervisors: [], teamMembers: [] };
	};

	// Computed online status color
	const onlineStatusColor = $derived(() => {
		const user = userData();
		switch (user?.status) {
			case 'online': return 'bg-green-500';
			case 'away': return 'bg-yellow-500';
			case 'idle': return 'bg-orange-500';
			case 'offline': return 'bg-gray-500';
			default: return 'bg-gray-500';
		}
	});

	// Simple date formatter
	function formatDateTime(dateString: string) {
		if (!dateString) return 'Never';
		try {
			return new Date(dateString).toLocaleString();
		} catch {
			return 'Invalid date';
		}
	}

	// Handle escape key
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}
</script>

{#if show}
	<!-- Modal Backdrop with blur effect -->
	<div 
		class="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4"
		onclick={onClose}
		onkeydown={handleKeydown}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<!-- Modal Content -->
		<div 
			class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden" 
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Header with Cover Photo (like profile page) -->
			<div class="relative h-48 bg-gradient-to-r from-[#01c0a4] to-[#00a085]">
				<img 
					src={userData()?.coverPhoto || '/placeholder.svg?height=200&width=800'} 
					alt="Cover" 
					class="w-full h-full object-cover"
				/>
					
					<!-- Close Button -->
					<button
						onclick={onClose}
						class="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded-lg hover:bg-opacity-70 transition-colors"
						aria-label="Close modal"
					>
						<X class="w-5 h-5" />
					</button>
				</div>

				<!-- Profile Info Section (like profile page) -->
				<div class="p-6">
					<div class="flex flex-col sm:flex-row items-start sm:items-end space-y-4 sm:space-y-0 sm:space-x-6">
						<!-- Profile Photo -->
						<div class="relative -mt-16 sm:-mt-20">
							<div class="relative">
								<div class="border-4 border-white shadow-lg rounded-full">
									<ProfileAvatar 
										user={userData() || { name: 'Unknown', firstName: 'Unknown', lastName: 'User' }} 
										size="xl" 
										showOnlineStatus={true} 
										onlineStatus={userData()?.status || 'offline'}
									/>
								</div>
							</div>
						</div>

						<!-- Basic Info -->
						<div class="flex-1">
							<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
							<div>
								<h1 class="text-2xl font-bold text-gray-900 mb-2">{userData()?.name || 'Unknown User'}</h1>
							</div>								<div class="mt-4 sm:mt-0">
									<!-- Online Status Display -->
									<div class="space-y-2">
										<p class="text-xs text-gray-500 text-center">Status</p>
										<div class="bg-gray-100 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 min-w-[120px] text-center">
											{#if userData()?.status === 'online'}
												🟢 Online
											{:else if userData()?.status === 'away'}
												🟡 Away
											{:else if userData()?.status === 'idle'}
												🟠 Idle
											{:else}
												⚫ Offline
											{/if}
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Content -->
				<div class="px-6 pb-6 overflow-y-auto max-h-96">
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<!-- Contact Information -->
						<div class="bg-gray-50 rounded-xl p-6">
							<h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
								<Mail class="w-5 h-5 text-[#01c0a4] mr-2" />
								Contact Information
							</h2>
							
							<div class="space-y-4">
								<div>
									<p class="text-sm font-medium text-gray-700 mb-1">Email Address</p>
									<div class="flex items-center space-x-2">
										<Mail class="w-4 h-4 text-gray-400" />
										<span class="text-gray-900">{userData()?.email || 'N/A'}</span>
									</div>
								</div>

								<div>
									<p class="text-sm font-medium text-gray-700 mb-1">Last Login</p>
									<div class="flex items-center space-x-2">
										<Clock class="w-4 h-4 text-gray-400" />
										<span class="text-gray-900">{formatDateTime(userData()?.lastLogin || '')}</span>
									</div>
								</div>
							</div>
						</div>

						<!-- Role & Organization -->
						<div class="bg-gray-50 rounded-xl p-6">
							<h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
								<Shield class="w-5 h-5 text-[#01c0a4] mr-2" />
								Role & Organization
							</h2>
							
							<div class="space-y-4">
								<div>
									<p class="text-sm font-medium text-gray-700 mb-1">Role</p>
									<div class="flex items-center space-x-2">
										<Shield class="w-4 h-4 text-gray-400" />
										<span class="inline-flex px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800">
											{userData()?.role || 'Not specified'}
										</span>
									</div>
								</div>
								
								{#if userData()?.organizationalUnit && userData()?.role !== 'admin'}
									<div>
										<p class="text-sm font-medium text-gray-700 mb-1">Organization Unit</p>
										<div class="flex items-center space-x-2">
											<Building class="w-4 h-4 text-gray-400" />
											<span class="text-gray-900">{userData()?.organizationalUnit}</span>
										</div>
									</div>
								{/if}

								<!-- Manager/Supervisor Relationships -->
								{#if userData()?.role === 'manager'}
									<!-- Managers don't have "Reports To" - they manage teams directly -->
									{#if userData()?.managedTeams && userData()?.managedTeams.length > 0}
										<div>
											<p class="text-sm font-medium text-gray-700 mb-1">Team Management</p>
											<div class="space-y-2">
												{#each userData()?.managedTeams || [] as team}
													<div class="flex items-center space-x-2">
														<Users class="w-4 h-4 text-gray-400" />
														<span class="text-gray-900">{team}</span>
													</div>
												{/each}
											</div>
										</div>
									{/if}
									<!-- Team View Button for Managers -->
									<div>
										<p class="text-sm font-medium text-gray-700 mb-2">Team Management</p>
										<button
											onclick={() => showTeamModal = true}
											class="flex items-center space-x-2 px-4 py-2 bg-[#01c0a4] text-white rounded-lg hover:bg-[#00a085] transition-colors"
										>
											<Users class="w-4 h-4" />
											<span>View Team Structure</span>
										</button>
									</div>
								{:else if userData()?.role === 'supervisor'}
									<!-- Supervisors have manager above them and teams below -->
									{#if userData()?.reportingTo}
										<div>
											<p class="text-sm font-medium text-gray-700 mb-1">Reports To (Manager)</p>
											<div class="flex items-center space-x-2">
												<User class="w-4 h-4 text-gray-400" />
												<span class="text-gray-900">{userData()?.reportingTo}</span>
											</div>
										</div>
									{/if}
									{#if userData()?.managedTeams && userData()?.managedTeams.length > 0}
										<div>
											<p class="text-sm font-medium text-gray-700 mb-1">Team Management</p>
											<div class="space-y-2">
												{#each userData()?.managedTeams || [] as team}
													<div class="flex items-center space-x-2">
														<Users class="w-4 h-4 text-gray-400" />
														<span class="text-gray-900">{team}</span>
													</div>
												{/each}
											</div>
										</div>
									{/if}
									<!-- Team View Button for Supervisors -->
									<div>
										<p class="text-sm font-medium text-gray-700 mb-2">Team Management</p>
										<button
											onclick={() => showTeamModal = true}
											class="flex items-center space-x-2 px-4 py-2 bg-[#01c0a4] text-white rounded-lg hover:bg-[#00a085] transition-colors"
										>
											<Users class="w-4 h-4" />
											<span>View Team Members</span>
										</button>
									</div>
								{:else if userData()?.role === 'frontline' || userData()?.role === 'support'}
									<!-- Frontline and Support show their reporting hierarchy -->
									{#if userData()?.supervisors && userData()?.supervisors.length > 0}
										<div>
											<p class="text-sm font-medium text-gray-700 mb-1">Reports To (Supervisor)</p>
											<div class="space-y-2">
												{#each userData()?.supervisors || [] as supervisor}
													<div class="flex items-center space-x-2">
														<User class="w-4 h-4 text-gray-400" />
														<span class="text-gray-900">{supervisor}</span>
													</div>
												{/each}
											</div>
										</div>
									{/if}
									{#if userData()?.reportingTo}
										<div>
											<p class="text-sm font-medium text-gray-700 mb-1">Manager</p>
											<div class="flex items-center space-x-2">
												<User class="w-4 h-4 text-gray-400" />
												<span class="text-gray-900">{userData()?.reportingTo}</span>
											</div>
										</div>
									{/if}
									<!-- Team Hierarchy Button for Frontline/Support -->
									<div>
										<p class="text-sm font-medium text-gray-700 mb-2">Team Management</p>
										<button
											onclick={() => showTeamModal = true}
											class="flex items-center space-x-2 px-4 py-2 bg-[#01c0a4] text-white rounded-lg hover:bg-[#00a085] transition-colors"
										>
											<Users class="w-4 h-4" />
											<span>View Team Hierarchy</span>
										</button>
									</div>
								{:else if userData()?.role !== 'admin'}
									<!-- Other roles (if any) show basic reporting -->
									{#if userData()?.reportingTo}
										<div>
											<p class="text-sm font-medium text-gray-700 mb-1">Reports To</p>
											<div class="flex items-center space-x-2">
												<User class="w-4 h-4 text-gray-400" />
												<span class="text-gray-900">{userData()?.reportingTo}</span>
											</div>
										</div>
									{/if}
								{/if}
							</div>
						</div>
					</div>
				</div>

				<!-- Footer -->
				<div class="border-t border-gray-200 px-6 py-4 flex justify-end bg-gray-50">
					<button
						onclick={onClose}
						class="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
					>
						Close
					</button>
				</div>
		</div>
	</div>
{/if}

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
					{userData()?.role === 'manager' ? 'Team Structure' : userData()?.role === 'supervisor' ? 'Team Members' : 'Team Hierarchy'}
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
				{#if userData()?.role === 'manager'}
					{@const teamData = getTeamMembers()}
					
					<!-- Manager View: Show supervisors, click to show their teams -->
					<div class="space-y-8">
						<!-- Current Manager -->
						<div class="text-center">
							<div class="flex justify-center mb-4">
								<div class="bg-teal-600 text-white p-6 rounded-lg shadow-lg min-w-[250px] text-center">
									<div class="mx-auto mb-3"><ProfileAvatar user={{ name: userData()?.name || '' }} size="xl" showOnlineStatus={false} /></div>
									<div class="text-lg font-bold">{userData()?.name}</div>
									<div class="text-sm opacity-90">{userData()?.role}</div>
									<div class="text-xs opacity-75">{userData()?.organizationalUnit}</div>
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
											<div 
												class="bg-emerald-600 text-white p-4 rounded-lg shadow-lg text-center cursor-pointer hover:bg-emerald-700 transition-colors"
												onclick={() => selectedSupervisor = selectedSupervisor?.id === supervisor.id ? null : supervisor}
											>
												<div class="mx-auto mb-2"><ProfileAvatar user={{ name: supervisor.name }} size="lg" showOnlineStatus={false} /></div>
												<div class="font-semibold">{supervisor.name}</div>
												<div class="text-sm opacity-90">{supervisor.role}</div>
												<div class="text-xs opacity-75">{supervisor.ou}</div>
												<div class="text-xs opacity-75 mt-1">{supervisor.email}</div>
											</div>
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
												} border rounded-lg p-4 text-center">
													<div class="mx-auto mb-2"><ProfileAvatar user={{ name: member.name }} size="md" showOnlineStatus={false} /></div>
													<div class="font-medium text-gray-900">{member.name}</div>
													<div class="text-sm text-gray-600 font-semibold">{member.role}</div>
													<div class="text-sm text-gray-500">{member.ou}</div>
													<div class="text-xs text-gray-500 mt-1">{member.email}</div>
												</div>
											{/each}
										</div>
									</div>
								{/if}
							</div>
						{/if}
					</div>
					
				{:else if userData()?.role === 'supervisor'}
					{@const teamData = getTeamMembers()}
					
					<!-- Supervisor View: Show team members -->
					<div class="space-y-6">
						<!-- Current Supervisor -->
						<div class="text-center">
							<div class="flex justify-center mb-6">
								<div class="bg-emerald-600 text-white p-6 rounded-lg shadow-lg min-w-[250px] text-center">
									<div class="mx-auto mb-3"><ProfileAvatar user={{ name: userData()?.name || '' }} size="xl" showOnlineStatus={false} /></div>
									<div class="text-lg font-bold">{userData()?.name}</div>
									<div class="text-sm opacity-90">{userData()?.role}</div>
									<div class="text-xs opacity-75">{userData()?.organizationalUnit}</div>
								</div>
							</div>
						</div>

						{#if teamData.teamMembers && teamData.teamMembers.length > 0}
							<!-- Team Members Section -->
							<div class="space-y-4">
								<h3 class="text-lg font-medium text-gray-900 text-center">My Team Members ({teamData.teamMembers.length})</h3>
								
								<!-- Vertical Connection Line -->
								<div class="flex justify-center">
									<div class="w-0.5 h-8 bg-gray-300"></div>
								</div>
								
								<!-- Team Member Cards -->
								<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
									{#each teamData.teamMembers as member}
										<div class="{
											member.role === 'Frontline' ? 'bg-cyan-100 border-cyan-300' :
											member.role === 'Support' ? 'bg-teal-100 border-teal-300' :
											'bg-green-100 border-green-200'
										} border-2 rounded-lg p-4 text-center shadow-md hover:shadow-lg transition-shadow">
											<div class="mx-auto mb-2"><ProfileAvatar user={{ name: member.name }} size="lg" showOnlineStatus={false} /></div>
											<div class="font-medium text-gray-900">{member.name}</div>
											<div class="text-sm text-gray-600 font-semibold">{member.role}</div>
											<div class="text-sm text-gray-500">{member.ou}</div>
											<div class="text-xs text-gray-500 mt-1">{member.email}</div>
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
					
				{:else if userData()?.role === 'frontline' || userData()?.role === 'support'}
					{@const teamStructure = getTeamStructure()}
					
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
									userData()?.role === 'frontline' ? 'bg-cyan-100 border-cyan-300' :
									userData()?.role === 'support' ? 'bg-teal-100 border-teal-300' :
									'bg-green-100 border-green-200'
								} border rounded-lg p-4 text-center min-w-[200px]">
									<div class="mx-auto mb-2"><ProfileAvatar user={{ name: userData()?.name || '' }} size="lg" showOnlineStatus={false} /></div>
									<div class="font-medium text-gray-900">{userData()?.name}</div>
									<div class="text-sm text-gray-600 font-semibold">{userData()?.role}</div>
									<div class="text-sm text-gray-500">{userData()?.organizationalUnit}</div>
									<div class="text-sm text-gray-500 mt-1">{userData()?.email}</div>
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
