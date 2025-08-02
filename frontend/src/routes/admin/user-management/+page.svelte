<script lang="ts">
	import { onMount } from 'svelte';
	import Navigation from '$lib/components/Navigation.svelte';
	import { 
		Search, Filter, Plus, Download, Upload, Edit, Lock, 
		Unlock, UserX, User, Shield, X, ChevronLeft, ChevronRight,
		FileText, AlertCircle, CheckCircle, Eye, EyeOff
	} from 'lucide-svelte';

	// TypeScript interfaces
	interface UserData {
		id: string;
		employeeId: string;
		name: string;
		email: string;
		ou: string;
		role: string;
		status: string;
		type: 'user' | 'admin';
	}

	interface BulkUserData {
		employeeId: string;
		name: string;
		email: string;
		ou: string;
		role: string;
		errors?: string[];
	}

	interface IndividualFormData {
		employeeId: string;
		name: string;
		email: string;
		ou: string;
		role: string;
	}

	interface BulkData {
		valid: BulkUserData[];
		invalid: BulkUserData[];
	}

	// State management
	let users = $state<UserData[]>([]);
	let filteredUsers = $state<UserData[]>([]);
	let currentTab = $state<string>('users');
	let searchQuery = $state<string>('');
	let selectedOU = $state<string>('all');
	let selectedRole = $state<string>('all');
	let selectedStatus = $state<string>('all');
	let currentPage = $state<number>(1);
	let itemsPerPage = 15;
	
	// Selection states
	let selectedRows = $state<Set<string>>(new Set());
	let lastSelectedIndex = $state<number>(-1);
	let selectAll = $state<boolean>(false);
	
	// Modal states
	let showAddUserModal = $state<boolean>(false);
	let addUserTab = $state<string>('individual');
	let showBulkPreview = $state<boolean>(false);
	let bulkPreviewTab = $state<string>('valid');
	let showEditUserModal = $state<boolean>(false);
	let showConfirmationModal = $state<boolean>(false);
	let confirmationAction = $state<string>('');
	let selectedUser = $state<UserData | null>(null);
	
	// Individual add form
	let individualForm = $state<IndividualFormData>({
		employeeId: '',
		name: '',
		email: '',
		ou: '',
		role: ''
	});
	
	// Bulk upload
	let uploadedFile = $state<File | null>(null);
	let bulkData = $state<BulkData>({ valid: [], invalid: [] });
	
	// Edit user form
	let editForm = $state<IndividualFormData>({
		employeeId: '',
		name: '',
		email: '',
		ou: '',
		role: ''
	});
	
	// Options
	const ouOptions = [
		'Engineering',
		'Marketing', 
		'Sales',
		'Support',
		'HR',
		'Finance',
		'IT'
	];
	
	const roleOptions = [
		'Manager',
		'Supervisor', 
		'Frontline',
		'Support',
		'Admin'
	];
	
	const statusOptions = [
		'Active',
		'Inactive',
		'Locked',
		'Deactivated'
	];

	// Sample data
	onMount(() => {
		// Base users
		const baseUsers: UserData[] = [
			{
				id: '1',
				employeeId: 'EMP001',
				name: 'John Doe',
				email: 'john.doe@company.com',
				ou: 'Engineering',
				role: 'Manager',
				status: 'Active',
				type: 'user'
			},
			{
				id: '2',
				employeeId: 'EMP002',
				name: 'Alice Johnson',
				email: 'alice.johnson@company.com',
				ou: 'N/A',
				role: 'Admin',
				status: 'Active',
				type: 'admin'
			},
			{
				id: '3',
				employeeId: 'EMP003',
				name: 'Bob Smith',
				email: 'bob.smith@company.com',
				ou: 'Sales',
				role: 'Frontline',
				status: 'Locked',
				type: 'user'
			},
			{
				id: '4',
				employeeId: 'EMP004',
				name: 'Carol White',
				email: 'carol.white@company.com',
				ou: 'Support',
				role: 'Support',
				status: 'Deactivated',
				type: 'user'
			},
			{
				id: '5',
				employeeId: 'EMP005',
				name: 'David Brown',
				email: 'david.brown@company.com',
				ou: 'N/A',
				role: 'Admin',
				status: 'Active',
				type: 'admin'
			}
		];

		// Generate additional users
		const generatedUsers: UserData[] = [];
		const nonAdminRoles = ['Manager', 'Supervisor', 'Frontline', 'Support'];
		const sampleOUs = ['Engineering', 'Marketing', 'Sales', 'Support', 'HR', 'Finance', 'IT'];
		const sampleStatuses = ['Active', 'Inactive', 'Locked', 'Deactivated'];

		for (let i = 0; i < 25; i++) {
			const isAdmin = i % 7 === 0; // Every 7th user is admin
			generatedUsers.push({
				id: `${i + 6}`,
				employeeId: `EMP${String(i + 6).padStart(3, '0')}`,
				name: `User ${i + 6}`,
				email: `user${i + 6}@company.com`,
				ou: isAdmin ? 'N/A' : sampleOUs[i % sampleOUs.length],
				role: isAdmin ? 'Admin' : nonAdminRoles[i % nonAdminRoles.length],
				status: sampleStatuses[i % sampleStatuses.length],
				type: isAdmin ? 'admin' : 'user'
			});
		}

		// Combine base users with generated users
		users = [...baseUsers, ...generatedUsers];
		
		filterUsers();
	});

	// Computed values
	const tabCounts = $derived({
		users: users.filter(u => u.type === 'user' && u.status === 'Active').length,
		admin: users.filter(u => u.type === 'admin' && u.status === 'Active').length,
		deactivated: users.filter(u => u.status === 'Deactivated').length,
		locked: users.filter(u => u.status === 'Locked').length
	});

	const totalPages = () => Math.ceil(filteredUsers.length / itemsPerPage);
	const paginatedUsers = () => filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

	// Functions
	const filterUsers = () => {
		let filtered = users;

		// Filter by tab
		switch (currentTab) {
			case 'users':
				filtered = filtered.filter(u => u.type === 'user' && u.status === 'Active');
				break;
			case 'admin':
				filtered = filtered.filter(u => u.type === 'admin' && u.status === 'Active');
				break;
			case 'deactivated':
				filtered = filtered.filter(u => u.status === 'Deactivated');
				break;
			case 'locked':
				filtered = filtered.filter(u => u.status === 'Locked');
				break;
		}

		// Apply search
		if (searchQuery) {
			filtered = filtered.filter(u => 
				u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
				u.employeeId.toLowerCase().includes(searchQuery.toLowerCase())
			);
		}

		// Apply filters
		if (selectedOU !== 'all') {
			filtered = filtered.filter(u => u.ou === selectedOU);
		}
		if (selectedRole !== 'all') {
			filtered = filtered.filter(u => u.role === selectedRole);
		}
		if (selectedStatus !== 'all') {
			filtered = filtered.filter(u => u.status === selectedStatus);
		}

		filteredUsers = filtered;
		currentPage = 1; // Reset to first page when filtering
	};

	const changeTab = (tab: string) => {
		currentTab = tab;
		filterUsers();
	};

	const addIndividualUser = () => {
		// For Admin users, OU is not required
		const isAdmin = individualForm.role === 'Admin';
		const requiredFields = isAdmin 
			? [individualForm.employeeId, individualForm.name, individualForm.email, individualForm.role]
			: [individualForm.employeeId, individualForm.name, individualForm.email, individualForm.ou, individualForm.role];
		
		if (requiredFields.some(field => !field)) {
			alert('Please fill in all required fields');
			return;
		}

		const newUser: UserData = {
			id: Date.now().toString(),
			employeeId: individualForm.employeeId,
			name: individualForm.name,
			email: individualForm.email,
			ou: isAdmin ? 'N/A' : individualForm.ou,
			role: individualForm.role,
			status: 'Active',
			type: individualForm.role === 'Admin' ? 'admin' : 'user'
		};

		users = [...users, newUser];
		filterUsers();
		
		// Reset form
		individualForm = {
			employeeId: '',
			name: '',
			email: '',
			ou: '',
			role: ''
		};
		
		showAddUserModal = false;
		alert('User added successfully!');
	};

	const handleFileUpload = (event: Event) => {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		uploadedFile = file;
		
		// Simulate file processing
		setTimeout(() => {
			// Mock data for demonstration
			bulkData = {
				valid: [
					{
						employeeId: 'EMP100',
						name: 'Test User 1',
						email: 'test1@company.com',
						ou: 'Engineering',
						role: 'Frontline'
					},
					{
						employeeId: 'EMP101',
						name: 'Test User 2',
						email: 'test2@company.com',
						ou: 'Marketing',
						role: 'Support'
					}
				],
				invalid: [
					{
						employeeId: 'EMP102',
						name: '',
						email: 'invalid-email',
						ou: 'Unknown',
						role: 'Invalid',
						errors: ['Name is required', 'Invalid email format', 'Unknown OU', 'Invalid role']
					}
				]
			};
			showBulkPreview = true;
		}, 1000);
	};

	const processBulkUpload = () => {
		// Add valid users
		const newUsers: UserData[] = bulkData.valid.map(user => ({
			id: Date.now().toString() + Math.random(),
			...user,
			status: 'Active',
			type: user.role === 'Admin' ? 'admin' : 'user'
		}));

		users = [...users, ...newUsers];
		filterUsers();
		
		showBulkPreview = false;
		showAddUserModal = false;
		uploadedFile = null;
		bulkData = { valid: [], invalid: [] };
		
		alert(`${newUsers.length} users added successfully!`);
	};

	const downloadTemplate = () => {
		// Create a simple CSV template
		const csvContent = "Employee ID,Name,Email,OU,Role\nEMP001,John Doe,john.doe@company.com,Engineering,Manager\n";
		const blob = new Blob([csvContent], { type: 'text/csv' });
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'user_template.csv';
		a.click();
		window.URL.revokeObjectURL(url);
	};

	const editUser = (user: UserData) => {
		selectedUser = user;
		editForm = {
			employeeId: user.employeeId,
			name: user.name,
			email: user.email,
			ou: user.ou,
			role: user.role
		};
		showEditUserModal = true;
	};

	const saveEditUser = () => {
		const isAdmin = selectedUser?.type === 'admin';
		
		// For admin users, OU is not required and role cannot be changed
		const requiredFields = isAdmin 
			? [editForm.name, editForm.email]
			: [editForm.name, editForm.email, editForm.ou, editForm.role];
		
		if (!selectedUser || requiredFields.some(field => !field)) {
			alert('Please fill in all required fields');
			return;
		}

		// Check if trying to change admin to non-admin or vice versa
		const isCurrentlyAdmin = selectedUser.type === 'admin';
		const willBeAdmin = editForm.role === 'Admin';
		
		if (isCurrentlyAdmin && !willBeAdmin) {
			alert('Admin users cannot be changed to other roles');
			return;
		}
		
		if (!isCurrentlyAdmin && willBeAdmin) {
			alert('Non-admin users cannot be changed to admin role');
			return;
		}

		const updatedUsers = users.map(u => 
			u.id === selectedUser!.id ? { 
				...u, 
				name: editForm.name,
				email: editForm.email,
				ou: isAdmin ? u.ou : editForm.ou, // Keep existing OU for admin users
				role: isAdmin ? u.role : editForm.role, // Keep existing role for admin users
				type: (isAdmin ? 'admin' : (editForm.role === 'Admin' ? 'admin' : 'user')) as 'admin' | 'user'
			} : u
		);
		users = updatedUsers;
		filterUsers();
		showEditUserModal = false;
		selectedUser = null;
		alert('User updated successfully!');
	};

	const confirmAction = (user: UserData, action: string) => {
		selectedUser = user;
		confirmationAction = action;
		showConfirmationModal = true;
	};

	const executeConfirmedAction = () => {
		if (!selectedUser || !confirmationAction) return;

		switch (confirmationAction) {
			case 'lock':
			case 'unlock':
				lockUser(selectedUser);
				break;
			case 'activate':
			case 'deactivate':
				deactivateUser(selectedUser);
				break;
		}
		
		showConfirmationModal = false;
		selectedUser = null;
		confirmationAction = '';
	};

	const getConfirmationMessage = () => {
		if (!selectedUser || !confirmationAction) return '';
		
		const userName = selectedUser.name;
		switch (confirmationAction) {
			case 'lock':
				return `Are you sure you want to lock ${userName}? They will not be able to access the system.`;
			case 'unlock':
				return `Are you sure you want to unlock ${userName}? They will regain access to the system.`;
			case 'activate':
				return `Are you sure you want to activate ${userName}? They will regain access to the system.`;
			case 'deactivate':
				return `Are you sure you want to deactivate ${userName}? They will lose access to the system.`;
			default:
				return '';
		}
	};

	const lockUser = (user: UserData) => {
		const updatedUsers = users.map(u => 
			u.id === user.id ? { ...u, status: u.status === 'Locked' ? 'Active' : 'Locked' } : u
		);
		users = updatedUsers;
		filterUsers();
	};

	const deactivateUser = (user: UserData) => {
		const updatedUsers = users.map(u => 
			u.id === user.id ? { ...u, status: u.status === 'Deactivated' ? 'Active' : 'Deactivated' } : u
		);
		users = updatedUsers;
		filterUsers();
	};

	const goToPage = (page: number) => {
		if (page >= 1 && page <= totalPages()) {
			currentPage = page;
		}
	};

	// Selection functions
	const handleSelectAll = () => {
		if (selectAll) {
			selectedRows = new Set();
			selectAll = false;
		} else {
			selectedRows = new Set(paginatedUsers().map(user => user.id));
			selectAll = true;
		}
	};

	const handleRowSelection = (userId: string, index: number, event: MouseEvent) => {
		if (event.shiftKey && lastSelectedIndex !== -1) {
			// Shift+click for range selection
			const currentUsers = paginatedUsers();
			const start = Math.min(lastSelectedIndex, index);
			const end = Math.max(lastSelectedIndex, index);
			
			for (let i = start; i <= end; i++) {
				selectedRows.add(currentUsers[i].id);
			}
			selectedRows = new Set(selectedRows); // Trigger reactivity
		} else {
			// Regular click for single selection
			if (selectedRows.has(userId)) {
				selectedRows.delete(userId);
			} else {
				selectedRows.add(userId);
			}
			selectedRows = new Set(selectedRows); // Trigger reactivity
			lastSelectedIndex = index;
		}
		
		// Update select all state
		const currentPageUserIds = new Set(paginatedUsers().map(user => user.id));
		selectAll = [...currentPageUserIds].every(id => selectedRows.has(id));
	};

	const handleCheckboxChange = (userId: string, index: number) => {
		if (selectedRows.has(userId)) {
			selectedRows.delete(userId);
		} else {
			selectedRows.add(userId);
		}
		selectedRows = new Set(selectedRows); // Trigger reactivity
		lastSelectedIndex = index;
		
		// Update select all state
		const currentPageUserIds = new Set(paginatedUsers().map(user => user.id));
		selectAll = [...currentPageUserIds].every(id => selectedRows.has(id));
	};

	// Update select all state when filtering changes
	$effect(() => {
		const currentPageUserIds = new Set(paginatedUsers().map(user => user.id));
		selectAll = currentPageUserIds.size > 0 && [...currentPageUserIds].every(id => selectedRows.has(id));
	});
</script>

<svelte:head>
	<title>User Management - Workspace</title>
</svelte:head>

<div class="h-screen flex flex-col bg-gray-50">
	<Navigation />
	
	<div class="flex-1 p-6 overflow-auto">
		<div class="w-full max-w-[98%] mx-auto">
			<!-- Header -->
			<div class="mb-4">
				<h1 class="text-xl font-bold text-gray-900 mb-1">User Management</h1>
				<p class="text-sm text-gray-600">Manage users, administrators, and access permissions</p>
			</div>

			<!-- Search and Filters -->
			<div class="bg-white rounded-xl shadow-sm border border-gray-200 mb-4">
				<!-- Search Bar Section -->
				<div class="p-4 border-b border-gray-200">
					<div class="flex flex-col lg:flex-row gap-3">
						<!-- Search Bar -->
						<div class="flex-1 lg:flex-initial lg:min-w-[800px] lg:max-w-[500px]">
							<div class="relative">
								<Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
								<input
									bind:value={searchQuery}
									type="text"
									placeholder="Search by name, email, or employee ID..."
									class="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent text-sm"
								/>
							</div>
						</div>

						<!-- Filters -->
						<div class="flex flex-col sm:flex-row gap-2 flex-1">
							<select
								bind:value={selectedOU}
								class="flex-1 max-w-[250px] px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent text-sm"
							>
								<option value="all">All OUs</option>
								{#each ouOptions as ou}
									<option value={ou}>{ou}</option>
								{/each}
							</select>

							<select
								bind:value={selectedRole}
								class="flex-1 max-w-[200px] px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent text-sm"
							>
								<option value="all">All Roles</option>
								{#each roleOptions as role}
									<option value={role}>{role}</option>
								{/each}
							</select>

							<select
								bind:value={selectedStatus}
								class="flex-1 max-w-[120px] px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent text-sm"
							>
								<option value="all">All Status</option>
								{#each statusOptions as status}
									<option value={status}>{status}</option>
								{/each}
							</select>

							<button
								onclick={() => showAddUserModal = true}
								class="flex-shrink-0 flex items-center space-x-2 bg-gradient-to-r from-[#01c0a4] to-[#00a085] text-white px-4 py-2.5 rounded-lg hover:shadow-lg hover:shadow-[#01c0a4]/25 transition-all duration-200 text-sm font-medium whitespace-nowrap"
							>
								<Plus class="w-4 h-4" />
								<span class="hidden sm:inline">Add User</span>
								<span class="sm:hidden">Add</span>
							</button>
						</div>
					</div>
				</div>

				<!-- Tabs -->
				<div class="border-b border-gray-200">
					<nav class="flex space-x-6 px-4">
						<button
							onclick={() => changeTab('users')}
							class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {currentTab === 'users' ? 'border-[#01c0a4] text-[#01c0a4]' : 'border-transparent text-gray-500 hover:text-gray-700'}"
						>
							<div class="flex items-center space-x-2">
								<User class="w-4 h-4" />
								<span>Users</span>
								<span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{tabCounts.users}</span>
							</div>
						</button>

						<button
							onclick={() => changeTab('admin')}
							class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {currentTab === 'admin' ? 'border-[#01c0a4] text-[#01c0a4]' : 'border-transparent text-gray-500 hover:text-gray-700'}"
						>
							<div class="flex items-center space-x-2">
								<Shield class="w-4 h-4" />
								<span>Admin</span>
								<span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{tabCounts.admin}</span>
							</div>
						</button>

						<button
							onclick={() => changeTab('deactivated')}
							class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {currentTab === 'deactivated' ? 'border-[#01c0a4] text-[#01c0a4]' : 'border-transparent text-gray-500 hover:text-gray-700'}"
						>
							<div class="flex items-center space-x-2">
								<UserX class="w-4 h-4" />
								<span>Deactivated</span>
								<span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{tabCounts.deactivated}</span>
							</div>
						</button>

						<button
							onclick={() => changeTab('locked')}
							class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {currentTab === 'locked' ? 'border-[#01c0a4] text-[#01c0a4]' : 'border-transparent text-gray-500 hover:text-gray-700'}"
						>
							<div class="flex items-center space-x-2">
								<Lock class="w-4 h-4" />
								<span>Locked</span>
								<span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{tabCounts.locked}</span>
							</div>
						</button>
					</nav>
				</div>

				<!-- Selection Toolbar -->
				{#if selectedRows.size > 0}
					<div class="bg-blue-50 border-b border-blue-200 px-4 py-2.5">
						<div class="flex items-center justify-between">
							<div class="flex items-center space-x-3">
								<span class="text-sm font-medium text-blue-900">
									{selectedRows.size} {selectedRows.size === 1 ? 'user' : 'users'} selected
								</span>
								<button
									onclick={() => { selectedRows = new Set(); selectAll = false; }}
									class="text-sm text-blue-600 hover:text-blue-800"
								>
									Clear selection
								</button>
							</div>
							<div class="flex items-center space-x-2">
								<button
									class="flex items-center space-x-1 bg-orange-100 text-orange-700 hover:bg-orange-200 px-2.5 py-1 rounded-md transition-colors text-sm font-medium"
									title="Lock selected users"
								>
									<Lock class="w-3.5 h-3.5" />
									<span>Lock</span>
								</button>
								<button
									class="flex items-center space-x-1 bg-red-100 text-red-700 hover:bg-red-200 px-2.5 py-1 rounded-md transition-colors text-sm font-medium"
									title="Deactivate selected users"
								>
									<UserX class="w-3.5 h-3.5" />
									<span>Deactivate</span>
								</button>
							</div>
						</div>
					</div>
				{/if}

				<!-- Table -->
				<div class="w-full">
					<table class="w-full table-fixed">
						<thead class="bg-gray-50">
							<tr>
								<th class="w-12 px-3 py-3 text-left">
									<input
										type="checkbox"
										checked={selectAll}
										onchange={handleSelectAll}
										class="w-4 h-4 text-black bg-gray-100 border-gray-300 rounded focus:ring-black focus:ring-2"
									/>
								</th>
								<th class="w-25 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
								<th class="w-46 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
								<th class="w-53 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
								<th class="w-35 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">OU</th>
								<th class="w-20 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
								<th class="w-20 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
								<th class="w-33 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
							</tr>
						</thead>
						<tbody class="bg-white divide-y divide-gray-200">
							{#each paginatedUsers() as user, index (user.id)}
								<tr 
									class="hover:bg-gray-50 {selectedRows.has(user.id) ? 'bg-blue-50' : ''} cursor-pointer" 
									onclick={(e) => handleRowSelection(user.id, index, e)}
								>
									<td class="px-3 py-3 whitespace-nowrap" onclick={(e) => e.stopPropagation()}>
										<input
											type="checkbox"
											checked={selectedRows.has(user.id)}
											onchange={() => handleCheckboxChange(user.id, index)}
											class="w-4 h-4 text-black bg-gray-100 border-gray-300 rounded focus:ring-black focus:ring-2"
										/>
									</td>
									<td class="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
										{user.employeeId}
									</td>
									<td class="px-3 py-3 whitespace-nowrap">
										<div class="flex items-center">
											<img src="/placeholder.svg?height=24&width=24" alt="" class="w-6 h-6 rounded-full mr-2" />
											<div class="text-sm font-medium text-gray-900 truncate">{user.name}</div>
										</div>
									</td>
									<td class="px-3 py-3 whitespace-nowrap text-sm text-gray-500 truncate">
										{user.email}
									</td>
									<td class="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
										{user.ou}
									</td>
									<td class="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
										{user.role}
									</td>
									<td class="px-3 py-3 whitespace-nowrap">
										<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {
											user.status === 'Active' ? 'bg-green-100 text-green-800' :
											user.status === 'Locked' ? 'bg-red-100 text-red-800' :
											user.status === 'Deactivated' ? 'bg-gray-100 text-gray-800' :
											'bg-yellow-100 text-yellow-800'
										}">
											{user.status}
										</span>
									</td>
									<td class="px-3 py-3 whitespace-nowrap text-sm font-medium pr-6" onclick={(e) => e.stopPropagation()}>
										<div class="flex items-center space-x-1 justify-end">
											<button
												onclick={() => editUser(user)}
												class="flex items-center space-x-1 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 px-2 py-1 rounded-md transition-colors text-xs font-medium"
												title="Edit user"
											>
												<Edit class="w-3 h-3" />
												<span>Edit</span>
											</button>

											{#if currentTab === 'locked'}
												<button
													onclick={() => confirmAction(user, 'unlock')}
													class="flex items-center space-x-1 bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700 px-2 py-1 rounded-md transition-colors text-xs font-medium"
													title="Unlock user"
												>
													<Unlock class="w-3 h-3" />
													<span>Unlock</span>
												</button>
											{:else if currentTab === 'deactivated'}
												<button
													onclick={() => confirmAction(user, 'activate')}
													class="flex items-center space-x-1 bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700 px-2 py-1 rounded-md transition-colors text-xs font-medium"
													title="Activate user"
												>
													<User class="w-3 h-3" />
													<span>Activate</span>
												</button>
											{:else}
												<button
													onclick={() => confirmAction(user, 'lock')}
													class="flex items-center space-x-1 bg-orange-50 text-orange-600 hover:bg-orange-100 hover:text-orange-700 px-2 py-1 rounded-md transition-colors text-xs font-medium"
													title="Lock user"
												>
													<Lock class="w-3 h-3" />
													<span>Lock</span>
												</button>
												<button
													onclick={() => confirmAction(user, 'deactivate')}
													class="flex items-center space-x-1 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 px-2 py-1 rounded-md transition-colors text-xs font-medium"
													title="Deactivate user"
												>
													<UserX class="w-3 h-3" />
													<span>Deactivate</span>
												</button>
											{/if}
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<!-- Pagination -->
				{#if totalPages() > 1}
					<div class="bg-white px-6 py-3 border-t border-gray-200 flex items-center justify-between">
						<div class="text-sm text-gray-700">
							Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} results
						</div>
						<div class="flex items-center space-x-2">
							<button
								onclick={() => goToPage(currentPage - 1)}
								disabled={currentPage === 1}
								class="p-2 text-gray-500 hover:text-[#01c0a4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								<ChevronLeft class="w-5 h-5" />
							</button>

							{#each Array.from({ length: totalPages() }, (_, i) => i + 1) as page}
								{#if page === 1 || page === totalPages() || (page >= currentPage - 2 && page <= currentPage + 2)}
									<button
										onclick={() => goToPage(page)}
										class="px-3 py-2 text-sm font-medium rounded-lg transition-colors {
											page === currentPage 
												? 'bg-[#01c0a4] text-white' 
												: 'text-gray-700 hover:bg-gray-100'
										}"
									>
										{page}
									</button>
								{:else if page === currentPage - 3 || page === currentPage + 3}
									<span class="px-2 py-2 text-gray-500">...</span>
								{/if}
							{/each}

							<button
								onclick={() => goToPage(currentPage + 1)}
								disabled={currentPage === totalPages()}
								class="p-2 text-gray-500 hover:text-[#01c0a4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								<ChevronRight class="w-5 h-5" />
							</button>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- Edit User Modal -->
{#if showEditUserModal && selectedUser}
	<div 
		class="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50" 
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={() => showEditUserModal = false}
		onkeydown={(e) => e.key === 'Escape' && (showEditUserModal = false)}
	>
		<div 
			class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" 
			role="document"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<!-- Header -->
			<div class="flex items-center justify-between p-6 border-b border-gray-200">
				<h2 class="text-xl font-semibold text-gray-900">Edit User</h2>
			</div>

			<!-- Content -->
			<div class="p-6">
				<div class="space-y-4">
					<!-- Employee ID (Read-only) -->
					<div>
						<label for="editEmployeeId" class="block text-sm font-medium text-gray-700 mb-2">Employee ID</label>
						<input
							id="editEmployeeId"
							value={selectedUser.employeeId}
							type="text"
							disabled
							class="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed"
						/>
						<p class="text-xs text-gray-500 mt-1">Employee ID cannot be changed</p>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label for="editName" class="block text-sm font-medium text-gray-700 mb-2">Name *</label>
							<input
								id="editName"
								bind:value={editForm.name}
								type="text"
								placeholder="Enter full name"
								class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent"
							/>
						</div>
						<div>
							<label for="editEmail" class="block text-sm font-medium text-gray-700 mb-2">Email *</label>
							<input
								id="editEmail"
								bind:value={editForm.email}
								type="email"
								placeholder="Enter email address"
								class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent"
							/>
						</div>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						{#if selectedUser.type !== 'admin'}
							<div>
								<label for="editOu" class="block text-sm font-medium text-gray-700 mb-2">Organizational Unit *</label>
								<select
									id="editOu"
									bind:value={editForm.ou}
									class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent"
								>
									<option value="">Select OU</option>
									{#each ouOptions as ou}
										<option value={ou}>{ou}</option>
									{/each}
								</select>
							</div>
						{/if}
						<div>
							{#if selectedUser.type === 'admin'}
								<label for="editRole" class="block text-sm font-medium text-gray-700 mb-2">Role</label>
								<div class="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg text-gray-500">
									Admin
								</div>
								<p class="text-xs text-orange-600 mt-1">Admin role cannot be changed</p>
							{:else}
								<label for="editRole" class="block text-sm font-medium text-gray-700 mb-2">Role *</label>
								<select
									id="editRole"
									bind:value={editForm.role}
									class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent"
								>
									<option value="">Select Role</option>
									{#each roleOptions as role}
										{#if role !== 'Admin'}
											<option value={role}>{role}</option>
										{/if}
									{/each}
								</select>
								<p class="text-xs text-orange-600 mt-1">Non-admin users cannot be changed to Admin role</p>
							{/if}
						</div>
					</div>

					<!-- Current Status Display -->
					<div>
						<div class="block text-sm font-medium text-gray-700 mb-2">Current Status</div>
						<div class="flex items-center space-x-2">
							<span class="inline-flex px-3 py-1 text-sm font-semibold rounded-full {
								selectedUser.status === 'Active' ? 'bg-green-100 text-green-800' :
								selectedUser.status === 'Locked' ? 'bg-red-100 text-red-800' :
								selectedUser.status === 'Deactivated' ? 'bg-gray-100 text-gray-800' :
								'bg-yellow-100 text-yellow-800'
							}">
								{selectedUser.status}
							</span>
							<span class="text-xs text-gray-500">Status can be changed using action buttons in the main table</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Footer -->
			<div class="flex justify-end space-x-3 p-6 border-t border-gray-200">
				<button
					onclick={() => showEditUserModal = false}
					class="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
				>
					Cancel
				</button>
				<button
					onclick={saveEditUser}
					class="px-6 py-3 bg-gradient-to-r from-[#01c0a4] to-[#00a085] text-white rounded-lg hover:shadow-lg hover:shadow-[#01c0a4]/25 transition-all duration-200"
				>
					Save Changes
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Confirmation Modal -->
{#if showConfirmationModal && selectedUser}
	<div 
		class="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50" 
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={() => showConfirmationModal = false}
		onkeydown={(e) => e.key === 'Escape' && (showConfirmationModal = false)}
	>
		<div 
			class="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4" 
			role="document"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<!-- Header -->
			<div class="flex items-center justify-between p-6 border-b border-gray-200">
				<h2 class="text-lg font-semibold text-gray-900">Confirm Action</h2>
			</div>

			<!-- Content -->
			<div class="p-6">
				<div class="flex items-center space-x-3 mb-4">
					{#if confirmationAction === 'lock'}
						<div class="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
							<Lock class="w-5 h-5 text-orange-600" />
						</div>
					{:else if confirmationAction === 'unlock'}
						<div class="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
							<Unlock class="w-5 h-5 text-green-600" />
						</div>
					{:else if confirmationAction === 'activate'}
						<div class="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
							<User class="w-5 h-5 text-green-600" />
						</div>
					{:else if confirmationAction === 'deactivate'}
						<div class="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
							<UserX class="w-5 h-5 text-red-600" />
						</div>
					{/if}
					<div>
						<h3 class="text-lg font-medium text-gray-900 capitalize">{confirmationAction} User</h3>
						<p class="text-sm text-gray-600">{getConfirmationMessage()}</p>
					</div>
				</div>
			</div>

			<!-- Footer -->
			<div class="flex justify-end space-x-3 p-6 border-t border-gray-200">
				<button
					onclick={() => showConfirmationModal = false}
					class="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
				>
					Cancel
				</button>
				<button
					onclick={executeConfirmedAction}
					class="px-6 py-3 bg-gradient-to-r {
						confirmationAction === 'deactivate' || confirmationAction === 'lock' 
							? 'from-red-500 to-red-600 hover:shadow-red-500/25' 
							: 'from-green-500 to-green-600 hover:shadow-green-500/25'
					} text-white rounded-lg hover:shadow-lg transition-all duration-200 capitalize"
				>
					{confirmationAction}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Add User Modal -->
{#if showAddUserModal}
	<div 
		class="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50" 
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={() => showAddUserModal = false}
		onkeydown={(e) => e.key === 'Escape' && (showAddUserModal = false)}
	>
		<div 
			class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" 
			role="document"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<!-- Header -->
			<div class="flex items-center justify-between p-6 border-b border-gray-200">
				<h2 class="text-xl font-semibold text-gray-900">Add New User</h2>
			</div>

			<!-- Tabs -->
			<div class="border-b border-gray-200">
				<nav class="flex space-x-8 px-6">
					<button
						onclick={() => addUserTab = 'individual'}
						class="py-4 px-1 border-b-2 font-medium text-sm transition-colors {addUserTab === 'individual' ? 'border-[#01c0a4] text-[#01c0a4]' : 'border-transparent text-gray-500 hover:text-gray-700'}"
					>
						Individual Add
					</button>
					<button
						onclick={() => addUserTab = 'bulk'}
						class="py-4 px-1 border-b-2 font-medium text-sm transition-colors {addUserTab === 'bulk' ? 'border-[#01c0a4] text-[#01c0a4]' : 'border-transparent text-gray-500 hover:text-gray-700'}"
					>
						Bulk Add
					</button>
				</nav>
			</div>

			<!-- Content -->
			<div class="p-6">
				{#if addUserTab === 'individual'}
					<!-- Individual Add Form -->
					<div class="space-y-4">
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label for="employeeId" class="block text-sm font-medium text-gray-700 mb-2">Employee ID</label>
								<input
									id="employeeId"
									bind:value={individualForm.employeeId}
									type="text"
									placeholder="Enter employee ID"
									class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent"
								/>
							</div>
							<div>
								<label for="name" class="block text-sm font-medium text-gray-700 mb-2">Name</label>
								<input
									id="name"
									bind:value={individualForm.name}
									type="text"
									placeholder="Enter full name"
									class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent"
								/>
							</div>
						</div>

						<div>
							<label for="email" class="block text-sm font-medium text-gray-700 mb-2">Email</label>
							<input
								id="email"
								bind:value={individualForm.email}
								type="email"
								placeholder="Enter email address"
								class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent"
							/>
						</div>

						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label for="role" class="block text-sm font-medium text-gray-700 mb-2">Role</label>
								<select
									id="role"
									bind:value={individualForm.role}
									class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent"
								>
									<option value="">Select Role</option>
									{#each roleOptions as role}
										<option value={role}>{role}</option>
									{/each}
								</select>
							</div>
							{#if individualForm.role !== 'Admin'}
								<div>
									<label for="ou" class="block text-sm font-medium text-gray-700 mb-2">Organizational Unit</label>
									<select
										id="ou"
										bind:value={individualForm.ou}
										class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent"
									>
										<option value="">Select OU</option>
										{#each ouOptions as ou}
											<option value={ou}>{ou}</option>
										{/each}
									</select>
								</div>
							{/if}
						</div>
					</div>

					<!-- Individual Add Footer -->
					<div class="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
						<button
							onclick={() => showAddUserModal = false}
							class="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
						>
							Cancel
						</button>
						<button
							onclick={addIndividualUser}
							class="px-6 py-3 bg-gradient-to-r from-[#01c0a4] to-[#00a085] text-white rounded-lg hover:shadow-lg hover:shadow-[#01c0a4]/25 transition-all duration-200"
						>
							Add User
						</button>
					</div>
				{:else}
					<!-- Bulk Add -->
					<div class="space-y-6">
						<div class="text-center">
							<div class="mb-4">
								<button
									onclick={downloadTemplate}
									class="inline-flex items-center space-x-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors"
								>
									<Download class="w-5 h-5" />
									<span>Download Template</span>
								</button>
							</div>
							<p class="text-sm text-gray-600 mb-4">Download the template, fill it with user data, and upload it back.</p>
						</div>

						<div class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
							<Upload class="w-12 h-12 text-gray-400 mx-auto mb-4" />
							<div class="mb-4">
								<label for="fileUpload" class="cursor-pointer">
									<span class="text-[#01c0a4] hover:text-[#00a085] font-medium">Click to upload</span>
									<span class="text-gray-600"> or drag and drop</span>
								</label>
								<input
									id="fileUpload"
									type="file"
									accept=".csv,.xlsx,.xls"
									onchange={handleFileUpload}
									class="hidden"
								/>
							</div>
							<p class="text-xs text-gray-500">CSV, XLSX, XLS up to 10MB</p>
						</div>

						{#if uploadedFile}
							<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
								<div class="flex items-center space-x-2">
									<FileText class="w-5 h-5 text-blue-600" />
									<span class="text-sm font-medium text-blue-900">{uploadedFile.name}</span>
								</div>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<!-- Bulk Preview Modal -->
{#if showBulkPreview}
	<div 
		class="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50" 
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={() => showBulkPreview = false}
		onkeydown={(e) => e.key === 'Escape' && (showBulkPreview = false)}
	>
		<div 
			class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto" 
			role="document"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<!-- Header -->
			<div class="flex items-center justify-between p-6 border-b border-gray-200">
				<h2 class="text-xl font-semibold text-gray-900">Preview Upload Data</h2>
				<button onclick={() => showBulkPreview = false} class="p-2 text-gray-500 hover:text-gray-700 transition-colors">
					<X class="w-5 h-5" />
				</button>
			</div>

			<!-- Tabs -->
			<div class="border-b border-gray-200">
				<nav class="flex space-x-8 px-6">
					<button
						onclick={() => bulkPreviewTab = 'valid'}
						class="py-4 px-1 border-b-2 font-medium text-sm transition-colors {bulkPreviewTab === 'valid' ? 'border-[#01c0a4] text-[#01c0a4]' : 'border-transparent text-gray-500 hover:text-gray-700'}"
					>
						<div class="flex items-center space-x-2">
							<CheckCircle class="w-4 h-4" />
							<span>Valid ({bulkData.valid.length})</span>
						</div>
					</button>
					<button
						onclick={() => bulkPreviewTab = 'invalid'}
						class="py-4 px-1 border-b-2 font-medium text-sm transition-colors {bulkPreviewTab === 'invalid' ? 'border-[#01c0a4] text-[#01c0a4]' : 'border-transparent text-gray-500 hover:text-gray-700'}"
					>
						<div class="flex items-center space-x-2">
							<AlertCircle class="w-4 h-4" />
							<span>Invalid ({bulkData.invalid.length})</span>
						</div>
					</button>
				</nav>
			</div>

			<!-- Content -->
			<div class="p-6">
				<div class="overflow-x-auto">
					<table class="w-full">
						<thead class="bg-gray-50">
							<tr>
								<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee ID</th>
								<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
								<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
								<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">OU</th>
								<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
								{#if bulkPreviewTab === 'invalid'}
									<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Errors</th>
								{/if}
							</tr>
						</thead>
						<tbody class="bg-white divide-y divide-gray-200">
							{#each bulkPreviewTab === 'valid' ? bulkData.valid : bulkData.invalid as user, index}
								<tr class="{bulkPreviewTab === 'invalid' ? 'bg-red-50' : ''}">
									<td class="px-4 py-3 text-sm text-gray-900">{user.employeeId}</td>
									<td class="px-4 py-3 text-sm text-gray-900">{user.name}</td>
									<td class="px-4 py-3 text-sm text-gray-900">{user.email}</td>
									<td class="px-4 py-3 text-sm text-gray-900">{user.ou}</td>
									<td class="px-4 py-3 text-sm text-gray-900">{user.role}</td>
									{#if bulkPreviewTab === 'invalid' && user.errors}
										<td class="px-4 py-3 text-sm text-red-600">
											<ul class="list-disc list-inside">
												{#each user.errors as error}
													<li>{error}</li>
												{/each}
											</ul>
										</td>
									{/if}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>

			<!-- Footer -->
			<div class="flex justify-end space-x-3 p-6 border-t border-gray-200">
				<button
					onclick={() => showBulkPreview = false}
					class="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
				>
					Cancel
				</button>
				{#if bulkData.valid.length > 0}
					<button
						onclick={processBulkUpload}
						class="px-6 py-3 bg-gradient-to-r from-[#01c0a4] to-[#00a085] text-white rounded-lg hover:shadow-lg hover:shadow-[#01c0a4]/25 transition-all duration-200"
					>
						Add {bulkData.valid.length} Valid Users
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}
