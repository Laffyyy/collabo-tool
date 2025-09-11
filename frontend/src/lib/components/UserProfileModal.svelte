<script lang="ts">
	import { X, Mail, Building, Users, Shield, Clock, User } from 'lucide-svelte';
	import ProfileAvatar from './ProfileAvatar.svelte';
	import { getUserByUsername, getStatusColor, getStatusText, formatLastActivity, type UserStatus } from '$lib/services/userStatusService';
	import { onMount } from 'svelte';

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

	// State for user data
	let userData = $state<UserStatus | null>(null);
	let loading = $state(false);

	// Load user data when userName changes
	$effect(() => {
		if (userName && show) {
			loading = true;
			const loadUserData = async () => {
				try {
					const user = await getUserByUsername(userName);
					userData = user;
					console.log('🔍 UserProfileModal loaded data:', user);
				} catch (error) {
					console.error('Error loading user data:', error);
					userData = null;
				} finally {
					loading = false;
				}
			};
			loadUserData();
		}
	});

	// Fallback data for unknown users
	const fallbackUserData = {
		id: 'unknown',
		username: 'Unknown User',
		firstName: 'Unknown',
		lastName: 'User',
		email: 'unknown@company.com',
		organizationalUnit: 'Unknown',
		role: 'Unknown',
		avatar: '/placeholder.svg',
		status: 'offline' as const,
		isOnline: false,
		lastActivity: ''
	};

	// Get current user data or fallback
	const currentUserData = $derived(() => {
		if (loading) {
			return {
				...fallbackUserData,
				username: userName || 'Loading...',
				firstName: 'Loading',
				lastName: '...'
			};
		}
		
		return userData || {
			...fallbackUserData,
			username: userName || 'Unknown User'
		};
	});

	// Team modal state
	let showTeamModal = $state(false);
	let selectedSupervisor = $state<any>(null);

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
		const userRole = userData?.role?.toLowerCase();
		const currentUser = userData;
		
		// For now, return null since organizational structure isn't implemented
		// This will be enhanced once the backend supports organizational hierarchy
		return null;
	};

	// Get team members for managers and supervisors  
	const getTeamMembers = () => {
		// For now, return empty since organizational structure isn't implemented
		// This will be enhanced once the backend supports organizational hierarchy
		return { supervisors: [], teamMembers: [] };
	};

	// Computed online status color
	const onlineStatusColor = $derived(() => {
		const user = userData;
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
			onkeydown={(e) => e.stopPropagation()}
			role="dialog"
			tabindex="-1"
		>
			<!-- Header with Cover Photo (like profile page) -->
			<div class="relative h-48 bg-gradient-to-r from-[#01c0a4] to-[#00a085]">
				<img 
					src="/placeholder.svg?height=200&width=800" 
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
										user={{
											firstName: currentUserData().firstName,
											lastName: currentUserData().lastName,
											name: currentUserData().username,
											profilePhoto: currentUserData().avatar
										}} 
										size="xl" 
										showOnlineStatus={true} 
										onlineStatus={currentUserData().status}
									/>
								</div>
							</div>
						</div>

						<!-- Basic Info -->
						<div class="flex-1">
							<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
							<div>
								<h1 class="text-2xl font-bold text-gray-900 mb-2">{currentUserData().firstName} {currentUserData().lastName}</h1>
							</div>								
							<div class="mt-4 sm:mt-0">
								<!-- Online Status Display -->
								<div class="space-y-2">
									<p class="text-xs text-gray-500 text-center">Status</p>
									<div class="bg-gray-100 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 min-w-[120px] text-center">
										<div class="flex items-center justify-center space-x-2">
											<div class="w-2 h-2 rounded-full {getStatusColor(currentUserData().status)}"></div>
											<span>{getStatusText(currentUserData().status)}</span>
										</div>
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
										<span class="text-gray-900">{currentUserData().email}</span>
									</div>
								</div>

								<div>
									<p class="text-sm font-medium text-gray-700 mb-1">Last Login</p>
									<div class="flex items-center space-x-2">
										<Clock class="w-4 h-4 text-gray-400" />
										<span class="text-gray-900">{formatLastActivity(currentUserData().lastActivity)}</span>
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
											{currentUserData().role || 'Not specified'}
										</span>
									</div>
								</div>
								
								{#if currentUserData().organizationalUnit && currentUserData().organizationalUnit !== 'Unknown'}
									<div>
										<p class="text-sm font-medium text-gray-700 mb-1">Organization Unit</p>
										<div class="flex items-center space-x-2">
											<Building class="w-4 h-4 text-gray-400" />
											<span class="text-gray-900">{currentUserData().organizationalUnit}</span>
										</div>
									</div>
								{/if}

								<!-- Manager/Supervisor Relationships -->
								<!-- Note: Team management features will be added when backend supports organizational structure -->
								<div>
									<p class="text-sm font-medium text-gray-700 mb-2">Team Management</p>
									<p class="text-sm text-gray-500">
										Team hierarchy and management features will be available once organizational structure is configured.
									</p>
								</div>
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
					{userData?.role === 'manager' ? 'Team Structure' : userData?.role === 'supervisor' ? 'Team Members' : 'Team Hierarchy'}
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
				<div class="text-center py-12">
					<Users class="w-16 h-16 mx-auto mb-4 text-gray-400" />
					<h3 class="text-lg font-medium text-gray-900 mb-2">Team Structure</h3>
					<p class="text-gray-500">
						Team hierarchy and organizational structure features will be available once configured in the system.
					</p>
				</div>
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
