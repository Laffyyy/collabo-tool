<script lang="ts">
	import { onMount } from 'svelte';
	import ProfileAvatar from '$lib/components/ProfileAvatar.svelte';
	import ConfirmationModal from '$lib/components/ConfirmationModal.svelte';
	import ToastContainer from '$lib/components/ToastContainer.svelte';
	import { 
		Search, Filter, Plus, Download, Upload, Edit, Lock, 
		Unlock, UserX, User, Shield, X, ChevronLeft, ChevronRight,
		FileText, AlertCircle, CheckCircle, Eye, EyeOff, Info, Users, ArrowLeft, Key,
		UserPlus, Activity, Headphones, Crown, LockKeyhole, ArrowUpDown, ArrowUp, ArrowDown
	} from 'lucide-svelte';
	
	// Import API functions
	import {
		getUsers,
		createUser,
		updateUser,
		changeUserPassword,
		toggleUserLock,
		toggleUserActivation,
		bulkLockUsers,
		bulkActivateUsers,
		bulkCreateUsers,
		getOrganizationalUnits,
		getHierarchyOptions,
		getUserTeam,
		sendPasswordReset,
		type CreateUserRequest,
		type UpdateUserRequest
	} from '$lib/api/user-management';
	import type { ApiUser } from '$lib/api/types';
	import { toastStore } from '$lib/stores/toast.svelte';

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
		supervisorId?: string;
		managerId?: string;
		supervisorName?: string;
		managerName?: string;
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
		supervisorId: string;
		managerId: string;
	}

	interface BulkData {
		valid: BulkUserData[];
		invalid: BulkUserData[];
	}

	// State management
	let users = $state<UserData[]>([]);
	let filteredUsers = $state<UserData[]>([]);
	let currentTab = $state<string>('first-time');
	let searchQuery = $state<string>('');
	let selectedOU = $state<string>('all');
	let selectedRole = $state<string>('all');
	let selectedStatus = $state<string>('all');
	let currentPage = $state<number>(1);
	let itemsPerPage = 10;
	let totalUsers = $state<number>(0);
	let totalPages = $state<number>(1);
	let loading = $state<boolean>(false);
	let error = $state<string>('');
	let isNavigatingPages = $state<boolean>(false); // Flag to prevent filter effect during page navigation
	// Previous filter values to track changes
	let prevSearchQuery = $state<string>('');
	let prevSelectedOU = $state<string>('all');
	let prevSelectedRole = $state<string>('all');
	let prevSelectedStatus = $state<string>('all');
	let lastNavigationTime = $state<number>(0); // Track when navigation occurred
	
	// Sorting states
	let sortColumn = $state<string>('');
	let sortDirection = $state<'asc' | 'desc'>('asc');
	
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
	let showSuccessModal = $state<boolean>(false);
	let showErrorModal = $state<boolean>(false);
	let showTeamModal = $state<boolean>(false);
	let confirmationAction = $state<string>('');
	let selectedUser = $state<UserData | null>(null);
	let teamModalUser = $state<UserData | null>(null);
	let successMessage = $state<string>('');
	let errorMessage = $state<string>('');
	
	// Team modal navigation and data
	let teamViewStack = $state<UserData[]>([]); // Stack for navigation
	let currentTeamView = $state<UserData | null>(null);
	let selectedSupervisorView = $state<UserData | null>(null); // Which supervisor's team we're viewing
	let teamData = $state<any>(null);
	
	// Data caching for performance - tab-specific caching
	let cachedUsersByTab = $state<Record<string, UserData[]>>({});
	let cachedPaginationByTab = $state<Record<string, { totalPages: number; totalUsers: number }>>({});
	let cachedHierarchy = $state<any>(null);
	let cachedOUs = $state<any[]>([]);
	let lastFetchTimeByTab = $state<Record<string, number>>({});
	let lastHierarchyFetchTime = $state<number>(0);
	let lastOUFetchTime = $state<number>(0);
	let cacheExpiry = 5 * 60 * 1000; // 5 minutes cache

	// Clear all cached data (used after create/edit/delete operations)
	function clearAllCache() {
		cachedUsersByTab = {};
		cachedPaginationByTab = {};
		lastFetchTimeByTab = {};
		cachedHierarchy = null;
		cachedOUs = [];
		lastHierarchyFetchTime = 0;
		lastOUFetchTime = 0;
	}

	// Loading states
	let loadingUsers = $state<boolean>(false);
	let loadingCreate = $state<boolean>(false);
	let loadingEdit = $state<boolean>(false);
	let loadingPassword = $state<boolean>(false);
	let loadingLock = $state<boolean>(false);
	let loadingBulk = $state<boolean>(false);
	let loadingTeamData = $state<boolean>(false);
	let loadingHierarchy = $state<boolean>(false);
	let loadingOUs = $state<boolean>(false);
	
	// Individual add form
	let individualForm = $state<IndividualFormData>({
		employeeId: '',
		name: '',
		email: '',
		ou: '',
		role: '',
		supervisorId: '',
		managerId: ''
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
		role: '',
		supervisorId: '',
		managerId: ''
	});
	
	// Password management
	let showPasswordSection = $state<boolean>(false);
	let passwordForm = $state({
		newPassword: '',
		confirmPassword: '',
		requirePasswordChange: false
	});
	let showPasswordFields = $state<boolean>(false);
	
	// Options
	let ouOptions = $state<string[]>([]);
	let hierarchyOptions = $state<{ supervisors: ApiUser[]; managers: ApiUser[] }>({
		supervisors: [],
		managers: []
	});
	
	// Tab counts - loaded independently for each tab
	let tabCounts = $state({
		frontline: 0,
		support: 0,
		supervisor: 0,
		manager: 0,
		admin: 0,
		deactivated: 0,
		locked: 0,
		firstTime: 0
	});
	
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
		'Deactivated',
		'First-time'
	];

	// Sample data
	onMount(() => {
		loadUsers();
		loadOUs();
		loadHierarchyOptions();
		loadTabCounts();
	});

	// Load all tab counts
	async function loadTabCounts() {
		try {
			// Load counts for each tab by making separate API calls
			const [
				frontlineResponse,
				supportResponse,
				supervisorResponse,
				managerResponse,
				adminResponse,
				deactivatedResponse,
				lockedResponse,
				firstTimeResponse
			] = await Promise.all([
				getUsers({ role: 'Frontline', status: 'active', limit: 1, page: 1 }),
				getUsers({ role: 'Support', status: 'active', limit: 1, page: 1 }),
				getUsers({ role: 'Supervisor', status: 'active', limit: 1, page: 1 }),
				getUsers({ role: 'Manager', status: 'active', limit: 1, page: 1 }),
				getUsers({ role: 'Admin', status: 'active', limit: 1, page: 1 }),
				getUsers({ status: 'deactivated', limit: 1, page: 1 }),
				getUsers({ status: 'locked', limit: 1, page: 1 }),
				getUsers({ status: 'first-time', limit: 1, page: 1 })
			]);

			// Update tab counts with total user counts from pagination
			tabCounts.frontline = frontlineResponse.ok ? frontlineResponse.data.pagination.totalUsers : 0;
			tabCounts.support = supportResponse.ok ? supportResponse.data.pagination.totalUsers : 0;
			tabCounts.supervisor = supervisorResponse.ok ? supervisorResponse.data.pagination.totalUsers : 0;
			tabCounts.manager = managerResponse.ok ? managerResponse.data.pagination.totalUsers : 0;
			tabCounts.admin = adminResponse.ok ? adminResponse.data.pagination.totalUsers : 0;
			tabCounts.deactivated = deactivatedResponse.ok ? deactivatedResponse.data.pagination.totalUsers : 0;
			tabCounts.locked = lockedResponse.ok ? lockedResponse.data.pagination.totalUsers : 0;
			tabCounts.firstTime = firstTimeResponse.ok ? firstTimeResponse.data.pagination.totalUsers : 0;
		} catch (err) {
			console.error('Failed to load tab counts:', err);
		}
	}

	// Load organizational units with caching
	async function loadOUs() {
		try {
			// Use cached data if available and not expired
			const now = Date.now();
			if (cachedOUs.length > 0 && (now - lastOUFetchTime) < cacheExpiry) {
				ouOptions = cachedOUs;
				return;
			}

			loadingOUs = true;
			const response = await getOrganizationalUnits();
			if (response.ok) {
				ouOptions = response.data.ous.map((ou: any) => ou.name);
				cachedOUs = [...ouOptions]; // Cache the data
				lastOUFetchTime = now;
			}
		} catch (err) {
			console.error('Failed to load organizational units:', err);
		} finally {
			loadingOUs = false;
		}
	}

	// Load hierarchy options (supervisors and managers) with caching
	async function loadHierarchyOptions(filters = {}) {
		try {
			// Use cached data if available and not expired
			const now = Date.now();
			if (cachedHierarchy && (now - lastHierarchyFetchTime) < cacheExpiry && Object.keys(filters).length === 0) {
				hierarchyOptions = cachedHierarchy;
				return;
			}

			loadingHierarchy = true;
			const response = await getHierarchyOptions(filters);
			if (response.ok) {
				hierarchyOptions = response.data;
				if (Object.keys(filters).length === 0) {
					cachedHierarchy = response.data; // Only cache unfiltered data
					lastHierarchyFetchTime = now;
				}
			}
		} catch (err) {
			console.error('Failed to load hierarchy options:', err);
		} finally {
			loadingHierarchy = false;
		}
	}

	// Get available supervisors based on current form role and selected manager (for OU filtering)
	function getAvailableSupervisors() {
		if (individualForm.role === 'Frontline' || individualForm.role === 'Support') {
			// For Frontline/Support, filter supervisors by manager's OUs if manager is selected
			if (individualForm.managerId) {
				const selectedManager = hierarchyOptions.managers.find(m => m.id === individualForm.managerId);
				if (selectedManager) {
					// Return supervisors that work under this manager
					return hierarchyOptions.supervisors.filter(s => s.managerId === individualForm.managerId);
				}
			}
			// If no manager selected, return all supervisors
			return hierarchyOptions.supervisors;
		}
		return [];
	}

	// Get available managers based on current form role
	function getAvailableManagers() {
		if (individualForm.role === 'Supervisor') {
			return hierarchyOptions.managers;
		}
		return [];
	}

	// Get available OUs based on role and selected supervisor/manager
	function getAvailableOUs() {
		if (individualForm.role === 'Manager' || individualForm.role === 'Admin') {
			// Managers and Admins can select any OU
			return ouOptions;
		}
		
		if (individualForm.role === 'Supervisor' && individualForm.managerId) {
			// Supervisors can only select OUs that their manager manages
			const selectedManager = hierarchyOptions.managers.find(m => m.id === individualForm.managerId);
			if (selectedManager && selectedManager.ou) {
				// Return OUs managed by the selected manager (for now, just their OU)
				return ouOptions.filter(ou => ou === selectedManager.ou);
			}
		}
		
		if ((individualForm.role === 'Frontline' || individualForm.role === 'Support') && individualForm.supervisorId) {
			// Frontline/Support can only select OUs that their supervisor manages
			const selectedSupervisor = getAvailableSupervisors().find(s => s.id === individualForm.supervisorId);
			if (selectedSupervisor && selectedSupervisor.ou) {
				return ouOptions.filter(ou => ou === selectedSupervisor.ou);
			}
		}
		
		return ouOptions; // Default to all OUs if no constraints
	}

	// Handle role change to reset dependent fields and load appropriate options
	function handleRoleChange() {
		// Reset dependent fields when role changes
		individualForm.supervisorId = '';
		individualForm.managerId = '';
		individualForm.ou = '';
		
		// Load hierarchy options if needed
		if (individualForm.role === 'Frontline' || individualForm.role === 'Support' || individualForm.role === 'Supervisor') {
			loadHierarchyOptions();
		}
	}

	// Handle manager selection change (for supervisor role)
	function handleManagerChange() {
		// Reset OU when manager changes
		individualForm.ou = '';
		
		// For Frontline/Support, reset supervisor when manager changes
		if (individualForm.role === 'Frontline' || individualForm.role === 'Support') {
			individualForm.supervisorId = '';
		}
	}

	// Handle supervisor selection change (for frontline/support roles)
	function handleSupervisorChange() {
		// Reset OU when supervisor changes
		individualForm.ou = '';
		
		// Auto-assign manager based on supervisor selection
		if (individualForm.supervisorId) {
			const selectedSupervisor = getAvailableSupervisors().find(s => s.id === individualForm.supervisorId);
			if (selectedSupervisor && selectedSupervisor.managerId) {
				individualForm.managerId = selectedSupervisor.managerId;
			}
		} else {
			individualForm.managerId = '';
		}
	}

	// Similar functions for edit form
	function getAvailableSupervisorsEdit() {
		if (editForm.role === 'Frontline' || editForm.role === 'Support') {
			if (editForm.managerId) {
				const selectedManager = hierarchyOptions.managers.find(m => m.id === editForm.managerId);
				if (selectedManager) {
					return hierarchyOptions.supervisors.filter(s => s.managerId === editForm.managerId);
				}
			}
			return hierarchyOptions.supervisors;
		}
		return [];
	}

	function getAvailableManagersEdit() {
		if (editForm.role === 'Supervisor') {
			return hierarchyOptions.managers;
		}
		return [];
	}

	function getAvailableOUsEdit() {
		if (editForm.role === 'Manager' || editForm.role === 'Admin') {
			return ouOptions;
		}
		
		if (editForm.role === 'Supervisor' && editForm.managerId) {
			const selectedManager = hierarchyOptions.managers.find(m => m.id === editForm.managerId);
			if (selectedManager && selectedManager.ou) {
				return ouOptions.filter(ou => ou === selectedManager.ou);
			}
		}
		
		if ((editForm.role === 'Frontline' || editForm.role === 'Support') && editForm.supervisorId) {
			const selectedSupervisor = getAvailableSupervisorsEdit().find(s => s.id === editForm.supervisorId);
			if (selectedSupervisor && selectedSupervisor.ou) {
				return ouOptions.filter(ou => ou === selectedSupervisor.ou);
			}
		}
		
		return ouOptions;
	}

	function handleRoleChangeEdit() {
		editForm.supervisorId = '';
		editForm.managerId = '';
		editForm.ou = '';
		
		if (editForm.role === 'Frontline' || editForm.role === 'Support' || editForm.role === 'Supervisor') {
			loadHierarchyOptions();
		}
	}

	function handleManagerChangeEdit() {
		editForm.ou = '';
		if (editForm.role === 'Frontline' || editForm.role === 'Support') {
			editForm.supervisorId = '';
		}
	}

	function handleSupervisorChangeEdit() {
		editForm.ou = '';
		if (editForm.supervisorId) {
			const selectedSupervisor = getAvailableSupervisorsEdit().find(s => s.id === editForm.supervisorId);
			if (selectedSupervisor && selectedSupervisor.managerId) {
				editForm.managerId = selectedSupervisor.managerId;
			}
		} else {
			editForm.managerId = '';
		}
	}

	// Reactive statements for filters
	$effect(() => {
		const timeSinceNavigation = Date.now() - lastNavigationTime;
		// Check if any filter values have actually changed
		const filtersChanged = searchQuery !== prevSearchQuery || selectedOU !== prevSelectedOU || selectedRole !== prevSelectedRole || selectedStatus !== prevSelectedStatus;
		const shouldTrigger = !isNavigatingPages && timeSinceNavigation > 100 && filtersChanged;
		console.log(`Filter effect triggered - filtersChanged: ${filtersChanged}, isNavigatingPages: ${isNavigatingPages}, timeSinceNavigation: ${timeSinceNavigation}ms, currentPage: ${currentPage}, shouldTrigger: ${shouldTrigger}`); // Debug log
		
		if (shouldTrigger) {
			console.log(`Resetting currentPage from ${currentPage} to 1 due to filter change`); // Debug log
			currentPage = 1; // Reset to first page when filtering
			loadUsers();
		}
		
		// Update previous values
		prevSearchQuery = searchQuery;
		prevSelectedOU = selectedOU;
		prevSelectedRole = selectedRole;
		prevSelectedStatus = selectedStatus;
	});



	// Load users from API with tab-specific caching for performance
	async function loadUsers(forceRefresh = false) {
		try {
			console.log(`loadUsers called - forceRefresh: ${forceRefresh}, isNavigatingPages: ${isNavigatingPages}, currentPage: ${currentPage}`); // Enhanced debug log
			// Create cache key based on current tab and filters (excluding page for status-based filtering)
			const statusFilter = getStatusFilter();
			const cacheKey = `${currentTab}_${currentPage}_${itemsPerPage}_${searchQuery}_${selectedOU}_${selectedRole}_${statusFilter}_${sortColumn}_${sortDirection}`;
			console.log('Cache key:', cacheKey); // Debug log
			
			// Check tab-specific cache first
			const now = Date.now();
			if (!forceRefresh && 
				cachedUsersByTab[cacheKey] && 
				cachedPaginationByTab[cacheKey] &&
				lastFetchTimeByTab[cacheKey] && 
				(now - lastFetchTimeByTab[cacheKey]) < cacheExpiry) {
				console.log('Using cached data for:', cacheKey, 'Users count:', users.length, 'Page:', currentPage); // Debug log
				users = cachedUsersByTab[cacheKey];
				const cachedPagination = cachedPaginationByTab[cacheKey];
				totalPages = cachedPagination.totalPages;
				totalUsers = cachedPagination.totalUsers;
				filteredUsers = users;
				return;
			}

			console.log('Fetching fresh data for:', cacheKey); // Debug log
			loadingUsers = true;
			
			const params = {
				page: currentPage,
				limit: itemsPerPage,
				search: searchQuery || undefined,
				ou: selectedOU !== 'all' ? selectedOU : undefined,
				role: getRoleFilter() || (selectedRole !== 'all' ? selectedRole : undefined),
				status: getStatusFilter(),
				sortBy: sortColumn || undefined,
				sortOrder: sortDirection
			};

			const response = await getUsers(params);
			
			if (response.ok) {
				users = response.data.users.map((apiUser: ApiUser) => transformApiUser(apiUser));
				// Cache the data with tab-specific key
				cachedUsersByTab[cacheKey] = [...users];
				cachedPaginationByTab[cacheKey] = {
					totalPages: response.data.pagination.totalPages,
					totalUsers: response.data.pagination.totalUsers
				};
				lastFetchTimeByTab[cacheKey] = now;
				console.log('Fresh data loaded for:', cacheKey, 'Users count:', users.length, 'Page:', currentPage); // Debug log
				totalPages = response.data.pagination.totalPages;
				totalUsers = response.data.pagination.totalUsers;
				filteredUsers = users; // API already filters, so set filtered to all users
				
				// If current page is greater than total pages, reset to page 1
				if (currentPage > totalPages && totalPages > 0) {
					currentPage = 1;
					// Re-fetch with corrected page
					await loadUsers(true);
					return;
				}
			} else {
				throw new Error('Failed to load users');
			}
		} catch (err) {
			console.error('Failed to load users:', err);
			error = err instanceof Error ? err.message : 'Failed to load users';
		} finally {
			loadingUsers = false;
		}
	}

	// Transform API user to frontend user format
	function transformApiUser(apiUser: ApiUser): UserData {
		return {
			id: apiUser.id,
			employeeId: apiUser.employeeId,
			name: apiUser.name,
			email: apiUser.email,
			ou: apiUser.ou || '',
			role: apiUser.role,
			status: apiUser.status,
			type: apiUser.type,
			supervisorId: apiUser.supervisorId,
			managerId: apiUser.managerId,
			supervisorName: apiUser.supervisorName || '',
			managerName: apiUser.managerName || ''
		};
	}

	// Get status filter based on current tab
	function getStatusFilter(): string | undefined {
		switch (currentTab) {
			case 'first-time':
				return 'first-time';
			case 'locked':
				return 'locked';
			case 'deactivated':
				return 'deactivated';
			case 'frontline':
			case 'support':
			case 'supervisor':
			case 'manager':
			case 'admin':
				// For role-based tabs, exclude status-based users (first-time, locked, deactivated)
				return 'active';
			default:
				return selectedStatus !== 'all' ? selectedStatus : undefined;
		}
	}

	// Get role filter based on current tab
	function getRoleFilter(): string | undefined {
		switch (currentTab) {
			case 'frontline':
				return 'Frontline';
			case 'support':
				return 'Support';
			case 'supervisor':
				return 'Supervisor';
			case 'manager':
				return 'Manager';
			case 'admin':
				return 'Admin';
			default:
				return selectedRole !== 'all' ? selectedRole : undefined;
		}
	}

	// Helper functions for hierarchy
	const getUserById = (id: string) => users.find(u => u.id === id);
	const getSupervisorName = (supervisorId?: string) => {
		if (!supervisorId) return '';
		const supervisor = getUserById(supervisorId);
		return supervisor ? supervisor.name : '';
	};
	const getManagerName = (managerId?: string) => {
		if (!managerId) return '';
		const manager = getUserById(managerId);
		return manager ? manager.name : '';
	};

	// Get available supervisors and managers for dropdowns
	const availableSupervisors = $derived(users.filter(u => u.role === 'Supervisor' && u.status === 'Active'));
	const availableManagers = $derived(users.filter(u => u.role === 'Manager' && u.status === 'Active'));

	// Get selected supervisor's manager
	const getSelectedSupervisorManager = (supervisorId: string) => {
		const supervisor = getUserById(supervisorId);
		return supervisor?.managerId ? getManagerName(supervisor.managerId) : '';
	};

	// Get team members for a user (for team modal)
	const getTeamMembers = (userId: string) => {
		const user = getUserById(userId);
		if (!user) return [];
		
		if (user.role === 'Manager') {
			// Get all supervisors and their team members under this manager
			const supervisors = users.filter(u => u.managerId === userId && u.role === 'Supervisor');
			const directReports = users.filter(u => u.managerId === userId && (u.role === 'Frontline' || u.role === 'Support'));
			const indirectReports = users.filter(u => supervisors.some(s => s.id === u.supervisorId));
			return [...supervisors, ...directReports, ...indirectReports];
		} else if (user.role === 'Supervisor') {
			// Get all frontline and support under this supervisor
			return users.filter(u => u.supervisorId === userId);
		}
		return [];
	};

	const paginatedUsers = () => filteredUsers;

	// Functions

	const handleSort = async (column: string) => {
		if (sortColumn === column) {
			// Three-state toggle: asc → desc → reset
			if (sortDirection === 'asc') {
				sortDirection = 'desc';
			} else if (sortDirection === 'desc') {
				// Reset sorting
				sortColumn = '';
				sortDirection = 'asc';
				await loadUsers(); // Re-load to get original order
				return;
			}
		} else {
			// New column, default to ascending
			sortColumn = column;
			sortDirection = 'asc';
		}
		
		await loadUsers(); // Re-load with new sort
	};

	// Helper function to get sort icon
	const getSortIcon = (column: string) => {
		if (sortColumn !== column) return ArrowUpDown;
		return sortDirection === 'asc' ? ArrowUp : ArrowDown;
	};

	const changeTab = async (tab: string) => {
		currentTab = tab;
		currentPage = 1; // Reset to first page when switching tabs
		// Clear selections when switching tabs
		selectedRows = new Set();
		selectAll = false;
		lastSelectedIndex = -1;
		// Reset sorting when switching tabs
		sortColumn = '';
		sortDirection = 'asc';
		await loadUsers();
		// Refresh tab counts to ensure they're up-to-date
		await loadTabCounts();
	};

	const addIndividualUser = async () => {
		try {
			loadingCreate = true;
			
			// For Admin users, OU is not required
			const isAdmin = individualForm.role === 'Admin';
			const requiredFields = isAdmin 
				? [individualForm.employeeId, individualForm.name, individualForm.email, individualForm.role]
				: [individualForm.employeeId, individualForm.name, individualForm.email, individualForm.ou, individualForm.role];
			
			if (requiredFields.some(field => !field)) {
				alert('Please fill in all required fields');
				return;
			}

			// Prepare user data for API
			const userData = {
				employeeId: individualForm.employeeId,
				name: individualForm.name,
				email: individualForm.email,
				ou: isAdmin ? undefined : individualForm.ou,
				role: individualForm.role,
				supervisorId: individualForm.supervisorId || undefined,
				managerId: individualForm.managerId || undefined
			};

			console.log('Sending user data:', userData);
			console.log('Available managers:', hierarchyOptions.managers);

			// Call API to create user
			const response = await createUser(userData);
			
			if (response.ok) {
				// Clear cache to ensure fresh data
				clearAllCache();
				// Reload users to get the updated list
				await loadUsers(true); // Force refresh
				// Reload tab counts to update the numbers
				await loadTabCounts();
				
				// Reset form
				individualForm = {
					employeeId: '',
					name: '',
					email: '',
					ou: '',
					role: '',
					supervisorId: '',
					managerId: ''
				};
				
				showAddUserModal = false;
				alert('User added successfully!');
			} else {
				throw new Error(response.message || 'Failed to create user');
			}
		} catch (err) {
			console.error('Failed to add user:', err);
			alert(err instanceof Error ? err.message : 'Failed to add user');
		} finally {
			loadingCreate = false;
		}
	};

	const handleFileUpload = (event: Event) => {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		uploadedFile = file;
		
		// TODO: Replace with actual file upload and processing API
		// Example:
		// try {
		//   const result = await uploadAndProcessFile(file);
		//   bulkData = result;
		//   showBulkPreview = true;
		// } catch (error) {
		//   console.error('File upload failed:', error);
		// }
		
		// Temporary placeholder - remove when implementing real backend
		setTimeout(() => {
			bulkData = { valid: [], invalid: [] };
			showBulkPreview = true;
		}, 1000);
	};

	const processBulkUpload = async () => {
		try {
			loadingBulk = true;
			const result = await bulkCreateUsers(bulkData.valid);
			// Clear cache to ensure fresh data
			clearAllCache();
			await loadUsers(true); // Force refresh
			showBulkPreview = false;
			showAddUserModal = false;
			uploadedFile = null;
			bulkData = { valid: [], invalid: [] };
			
			const { successful, failed } = result.data;
			const successCount = successful.length;
			const failedCount = failed.length;
			
			if (failedCount > 0) {
				alert(`Bulk upload completed. ${successCount} users created successfully, ${failedCount} failed. Check console for details.`);
				console.log('Failed users:', failed);
			} else {
				alert(`${successCount} users added successfully!`);
			}
		} catch (error) {
			console.error('Bulk upload failed:', error);
			alert('Failed to upload users. Please try again.');
		} finally {
			loadingBulk = false;
		}
	};

	const downloadTemplate = () => {
		// Create separate CSV templates for different roles
		const frontlineSupportTemplate = "Employee ID,Name,Email,OU,Supervisor Name,Manager Name\nEMP001,John Smith,john.smith@company.com,Engineering,Bob Wilson,Alice Johnson\nEMP002,Mary Davis,mary.davis@company.com,Sales,Carol White,Sarah Wilson\n";
		
		const supervisorTemplate = "Employee ID,Name,Email,OU,Manager Name\nEMP100,Bob Wilson,bob.wilson@company.com,Engineering,Alice Johnson\nEMP101,Carol White,carol.white@company.com,Sales,Sarah Wilson\n";
		
		const managerTemplate = "Employee ID,Name,Email,OU\nEMP200,Alice Johnson,alice.johnson@company.com,Engineering\nEMP201,Sarah Wilson,sarah.wilson@company.com,Sales\n";

		const adminTemplate = "Employee ID,Name,Email,OU\nADM001,System Admin,admin@company.com,IT\nADM002,Security Admin,security.admin@company.com,IT\n";

		// Since we can't create actual Excel files with multiple sheets in the browser,
		// we'll create four separate CSV files
		const templates = [
			{ name: 'frontline_support_template.csv', content: frontlineSupportTemplate },
			{ name: 'supervisor_template.csv', content: supervisorTemplate },
			{ name: 'manager_template.csv', content: managerTemplate },
			{ name: 'admin_template.csv', content: adminTemplate }
		];

		templates.forEach(template => {
			const blob = new Blob([template.content], { type: 'text/csv' });
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = template.name;
			a.click();
			window.URL.revokeObjectURL(url);
		});

		// Show success toast instead of alert
    	toastStore.success('Templates Downloaded Successfully');
	};

	const editUser = (user: UserData) => {
		selectedUser = user;
		editForm = {
			employeeId: user.employeeId,
			name: user.name,
			email: user.email,
			ou: user.ou,
			role: user.role,
			supervisorId: user.supervisorId || '',
			managerId: user.managerId || ''
		};
		showEditUserModal = true;
	};

	const saveEditUser = async () => {
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

		try {
			loadingEdit = true;
			
			// Auto-assign manager for Frontline/Support based on supervisor selection
			let finalManagerId = editForm.managerId;
			if ((editForm.role === 'Frontline' || editForm.role === 'Support') && editForm.supervisorId) {
				const supervisor = getUserById(editForm.supervisorId);
				if (supervisor && supervisor.managerId) {
					finalManagerId = supervisor.managerId;
				}
			}

			const updateData: UpdateUserRequest = {
				name: editForm.name,
				email: editForm.email,
				ou: isAdmin ? undefined : editForm.ou,
				role: isAdmin ? undefined : editForm.role,
				supervisorId: isAdmin ? undefined : (editForm.supervisorId || null),
				managerId: isAdmin ? undefined : (finalManagerId || null)
			};

			// Remove undefined values and convert empty strings to null
			Object.keys(updateData).forEach(key => {
				const value = updateData[key as keyof UpdateUserRequest];
				if (value === undefined) {
					delete updateData[key as keyof UpdateUserRequest];
				} else if (value === '') {
					updateData[key as keyof UpdateUserRequest] = null as any;
				}
			});

			await updateUser(selectedUser.id, updateData);
			// Clear cache to ensure fresh data
			clearAllCache();
			await loadUsers(true); // Force refresh
			showEditUserModal = false;
			selectedUser = null;
			alert('User updated successfully!');
		} catch (error) {
			console.error('Failed to update user:', error);
			alert('Failed to update user. Please try again.');
		} finally {
			loadingEdit = false;
		}
	};

	// Password management functions
	const resetPasswordForm = () => {
		passwordForm = {
			newPassword: '',
			confirmPassword: '',
			requirePasswordChange: false
		};
		showPasswordFields = false;
	};

	const togglePasswordSection = () => {
		showPasswordSection = !showPasswordSection;
		if (!showPasswordSection) {
			resetPasswordForm();
		}
	};

	const validatePassword = () => {
		if (!passwordForm.newPassword) {
			alert('Please enter a new password');
			return false;
		}
		if (passwordForm.newPassword.length < 8) {
			alert('Password must be at least 8 characters long');
			return false;
		}
		if (passwordForm.newPassword !== passwordForm.confirmPassword) {
			alert('Passwords do not match');
			return false;
		}
		return true;
	};

	const changePassword = async () => {
		if (!validatePassword()) return;
		
		try {
			loadingPassword = true;
			await changeUserPassword(selectedUser!.id, {
				newPassword: passwordForm.newPassword,
				requirePasswordChange: passwordForm.requirePasswordChange
			});
			alert(`Password changed successfully for ${selectedUser?.name}${passwordForm.requirePasswordChange ? '. User will be required to change password on next login.' : ''}`);
			resetPasswordForm();
			showPasswordSection = false;
		} catch (error) {
			console.error('Failed to change password:', error);
			alert('Failed to change password. Please try again.');
		} finally {
			loadingPassword = false;
		}
	};

	const handlePasswordReset = async () => {
		if (!selectedUser) return;
		
		try {
			await sendPasswordReset(selectedUser.id);
			alert(`Password reset email sent to ${selectedUser.email}`);
		} catch (error) {
			console.error('Failed to send password reset:', error);
			alert('Failed to send password reset email. Please try again.');
		}
	};

	const confirmAction = (user: UserData, action: string) => {
		selectedUser = user;
		confirmationAction = action;
		showConfirmationModal = true;
	};

	const showTeamInfo = async (user: UserData) => {
		teamModalUser = user;
		currentTeamView = user;
		selectedSupervisorView = null; // Reset supervisor view
		teamViewStack = [user]; // Initialize with the root user
		showTeamModal = true;
		
		// Fetch team data from API
		await loadTeamData(user.id);
	};

	const loadTeamData = async (userId: string) => {
		try {
			loadingTeamData = true;
			const response = await getUserTeam(userId);
			teamData = response.data;
		} catch (error) {
			console.error('Failed to load team data:', error);
			alert('Failed to load team information. Please try again.');
		} finally {
			loadingTeamData = false;
		}
	};

	// Team navigation functions
	const navigateToSupervisor = async (supervisor: UserData) => {
		selectedSupervisorView = supervisor;
		// Load supervisor's team data
		await loadTeamData(supervisor.id);
	};

	const navigateBack = async () => {
		selectedSupervisorView = null; // Go back to manager's overview
		if (teamModalUser) {
			await loadTeamData(teamModalUser.id);
		}
	};

	const resetToRootView = () => {
		selectedSupervisorView = null;
		if (teamModalUser) {
			currentTeamView = teamModalUser;
		}
	};

	// Get direct supervisors under a manager (from API data)
	const getDirectSupervisors = () => {
		if (!teamData?.teamMembers) return [];
		return teamData.teamMembers.filter((member: any) => member.role === 'Supervisor');
	};

	// Get team members under a supervisor (from API data) 
	const getSupervisorTeam = () => {
		if (!teamData?.teamMembers) return [];
		return teamData.teamMembers.filter((member: any) => member.role === 'Frontline' || member.role === 'Support');
	};

	const executeConfirmedAction = async () => {
		console.log('executeConfirmedAction called:', { selectedUser, confirmationAction, selectedRows: selectedRows.size }); // Debug log
		
		// For bulk operations, we don't need selectedUser, just selectedRows
		if (!confirmationAction) return;
		if (!confirmationAction.startsWith('bulk-') && !selectedUser) return;

		try {
			switch (confirmationAction) {
				case 'lock':
					await toggleUserLock(selectedUser.id, true);
					successMessage = `User ${selectedUser.firstName} ${selectedUser.lastName} has been locked successfully.`;
					showSuccessModal = true;
					break;
				case 'unlock':
					await toggleUserLock(selectedUser.id, false);
					successMessage = `User ${selectedUser.firstName} ${selectedUser.lastName} has been unlocked successfully.`;
					showSuccessModal = true;
					break;
				case 'activate':
					await toggleUserActivation(selectedUser.id, true);
					successMessage = `User ${selectedUser.firstName} ${selectedUser.lastName} has been activated successfully.`;
					showSuccessModal = true;
					break;
				case 'deactivate':
					await toggleUserActivation(selectedUser.id, false);
					successMessage = `User ${selectedUser.firstName} ${selectedUser.lastName} has been deactivated successfully.`;
					showSuccessModal = true;
					break;
				case 'bulk-lock':
					console.log('Confirmation handler: executing bulk-lock action'); // Debug log
					await handleBulkLockUsers();
					break;
				case 'bulk-deactivate':
					await handleBulkDeactivateUsers();
					break;
				case 'bulk-unlock':
					await bulkUnlockUsers();
					break;
				case 'bulk-reactivate':
					await bulkReactivateUsers();
					break;
			}
			
			if (confirmationAction.startsWith('bulk-')) {
				// Bulk operations handle their own success messages
			} else {
				clearAllCache();
				await loadUsers();
			}
		} catch (error) {
			console.error(`Failed to ${confirmationAction}:`, error);
			errorMessage = `Failed to ${confirmationAction} user. Please try again.`;
			showErrorModal = true;
		} finally {
			showConfirmationModal = false;
			selectedUser = null;
			confirmationAction = '';
		}
	};

	const confirmBulkLockUsers = () => {
		if (selectedRows.size === 0) return;
		
		confirmationAction = 'bulk-lock';
		showConfirmationModal = true;
	};

	const confirmBulkDeactivateUsers = () => {
		if (selectedRows.size === 0) return;
		
		confirmationAction = 'bulk-deactivate';
		showConfirmationModal = true;
	};

	const handleBulkLockUsers = async () => {
		console.log('handleBulkLockUsers called with selectedRows:', Array.from(selectedRows)); // Debug log
		try {
			loadingLock = true;
			const userIds = Array.from(selectedRows);
			console.log('About to call bulkLockUsers API with userIds:', userIds); // Debug log
			const result = await bulkLockUsers(userIds, true);
			console.log('bulkLockUsers API result:', result); // Debug log
			// Clear cache to ensure fresh data
			clearAllCache();
			await loadUsers(true); // Force refresh
			selectedRows = new Set();
			selectAll = false;
			// Use toast store directly
			const { success } = $toastStore;
			success(`${userIds.length} users have been locked successfully!`);
		} catch (error) {
			console.error('Failed to bulk lock users:', error);
			const { error: errorFn } = $toastStore;
			errorFn(error instanceof Error ? error.message : 'Failed to lock users. Please try again.');
		} finally {
			loadingLock = false;
		}
	};

	const handleBulkDeactivateUsers = async () => {
		try {
			loadingBulk = true;
			const userIds = Array.from(selectedRows);
			const result = await bulkActivateUsers(userIds, false);
			// Clear cache to ensure fresh data
			clearAllCache();
			await loadUsers(true); // Force refresh
			selectedRows = new Set();
			selectAll = false;
			const { success } = $toastStore;
			success(`${userIds.length} users have been deactivated successfully!`);
		} catch (error) {
			console.error('Failed to bulk deactivate users:', error);
			const { error: errorFn } = $toastStore;
			errorFn(error instanceof Error ? error.message : 'Failed to deactivate users. Please try again.');
		} finally {
			loadingBulk = false;
		}
	};

	const confirmBulkUnlockUsers = () => {
		if (selectedRows.size === 0) return;
		
		confirmationAction = 'bulk-unlock';
		showConfirmationModal = true;
	};

	const confirmBulkReactivateUsers = () => {
		if (selectedRows.size === 0) return;
		
		confirmationAction = 'bulk-reactivate';
		showConfirmationModal = true;
	};

	const bulkUnlockUsers = async () => {
		try {
			loadingLock = true;
			const userIds = Array.from(selectedRows);
			const result = await bulkLockUsers(userIds, false);
			// Clear cache to ensure fresh data
			clearAllCache();
			await loadUsers(true); // Force refresh
			selectedRows = new Set();
			selectAll = false;
			const { success } = $toastStore;
			success(`${userIds.length} users have been unlocked successfully!`);
		} catch (error) {
			console.error('Failed to bulk unlock users:', error);
			const { error: errorFn } = $toastStore;
			errorFn(error instanceof Error ? error.message : 'Failed to unlock users. Please try again.');
		} finally {
			loadingLock = false;
		}
	};

	const bulkReactivateUsers = async () => {
		try {
			loadingBulk = true;
			const userIds = Array.from(selectedRows);
			const result = await bulkActivateUsers(userIds, true);
			// Clear cache to ensure fresh data
			clearAllCache();
			await loadUsers(true); // Force refresh
			selectedRows = new Set();
			selectAll = false;
			const { success } = $toastStore;
			success(`${userIds.length} users have been reactivated successfully!`);
		} catch (error) {
			console.error('Failed to bulk reactivate users:', error);
			const { error: errorFn } = $toastStore;
			errorFn(error instanceof Error ? error.message : 'Failed to reactivate users. Please try again.');
		} finally {
			loadingBulk = false;
		}
	};

	const getConfirmationMessage = () => {
		if (!confirmationAction) return '';
		
		switch (confirmationAction) {
			case 'lock':
				return `Are you sure you want to lock ${selectedUser?.name}? They will not be able to access the system.`;
			case 'unlock':
				return `Are you sure you want to unlock ${selectedUser?.name}? They will regain access to the system.`;
			case 'activate':
				return `Are you sure you want to activate ${selectedUser?.name}? They will regain access to the system.`;
			case 'deactivate':
				return `Are you sure you want to deactivate ${selectedUser?.name}? They will lose access to the system.`;
			case 'bulk-lock':
				return `Are you sure you want to lock ${selectedRows.size} selected users? They will not be able to access the system.`;
			case 'bulk-deactivate':
				return `Are you sure you want to deactivate ${selectedRows.size} selected users? They will lose access to the system.`;
			case 'bulk-unlock':
				return `Are you sure you want to unlock ${selectedRows.size} selected users? They will regain access to the system.`;
			case 'bulk-reactivate':
				return `Are you sure you want to reactivate ${selectedRows.size} selected users? They will regain access to the system.`;
			default:
				return '';
		}
	};

	// Modal close protection
	const isAnyLoading = () => {
		return loadingUsers || loadingCreate || loadingEdit || loadingPassword || loadingLock || loadingBulk;
	};

	const closeModal = (modalType: string) => {
		if (isAnyLoading()) {
			return; // Prevent closing during loading
		}
		
		switch (modalType) {
			case 'add':
				showAddUserModal = false;
				break;
			case 'edit':
				showEditUserModal = false;
				selectedUser = null;
				break;
			case 'team':
				showTeamModal = false;
				teamModalUser = null;
				break;
			case 'confirmation':
				showConfirmationModal = false;
				selectedUser = null;
				confirmationAction = '';
				break;
		}
	};

	// Keyboard event handler for modal closing
	const handleKeydown = (event: KeyboardEvent) => {
		if (event.key === 'Escape' && !isAnyLoading()) {
			if (showConfirmationModal) closeModal('confirmation');
			else if (showEditUserModal) closeModal('edit');
			else if (showTeamModal) closeModal('team');
			else if (showAddUserModal) closeModal('add');
		}
	};



	const lockUser = (user: UserData) => {
		const isLocked = user.status === 'Locked';
		confirmAction(user, isLocked ? 'unlock' : 'lock');
	};

	const deactivateUser = (user: UserData) => {
		const isActive = user.status === 'Active' || user.status === 'First-time';
		confirmAction(user, isActive ? 'deactivate' : 'activate');
	};

	const goToPage = async (page: number) => {
		if (page >= 1 && page <= totalPages) {
			console.log(`Navigating from page ${currentPage} to page ${page}`); // Debug log
			isNavigatingPages = true; // Set flag to prevent filter effect
			lastNavigationTime = Date.now(); // Record navigation time
			console.log(`Setting currentPage to ${page}`); // Debug log
			currentPage = page;
			await loadUsers(true); // Force refresh to ensure new page data is fetched
			console.log(`Navigation completed, currentPage is now ${currentPage}`); // Debug log
			isNavigatingPages = false; // Reset flag
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

	// Toast management functions
	const addToast = (type: 'success' | 'error' | 'info', message: string) => {
		const id = Math.random().toString(36).substr(2, 9);
		toasts = [...toasts, { id, type, message }];
	};

	const removeToast = (id: string) => {
		toasts = toasts.filter(toast => toast.id !== id);
	};
</script>

<svelte:head>
	<title>User Management - Workspace</title>
</svelte:head>

<div class="h-screen bg-gray-50 flex flex-col">
	<div class="w-full max-w-[98%] mx-auto flex-1 flex flex-col p-6 min-h-0">
		<!-- Header -->
		<div class="mb-4 fade-in">
			<h1 class="text-xl font-bold text-gray-900 mb-1">User Management</h1>
			<p class="text-sm text-gray-600">Manage users, administrators, and access permissions</p>
		</div>

		<!-- Search and Filters -->
		<div class="bg-white rounded-xl shadow-sm border border-gray-200 mb-4 flex-shrink-0 fade-in">
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
							<!-- OU Filter - only show for non-admin tabs -->
							{#if currentTab !== 'admin'}
								<select
									bind:value={selectedOU}
									class="flex-1 max-w-[250px] px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent text-sm"
								>
									<option value="all">All OUs</option>
									{#each ouOptions as ou}
										<option value={ou}>{ou}</option>
									{/each}
								</select>
							{/if}

							<!-- Role Filter - only show for locked, deactivated, and first-time tabs -->
							{#if ['locked', 'deactivated', 'first-time'].includes(currentTab)}
								<select
									bind:value={selectedRole}
									class="flex-1 max-w-[150px] px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent text-sm"
								>
									<option value="all">All Roles</option>
									{#each roleOptions as role}
										<option value={role}>{role}</option>
									{/each}
								</select>
							{/if}

							<!-- Status Filter - only show for tabs that have mixed statuses (not locked, deactivated, first-time, or active role tabs) -->
							{#if !['locked', 'deactivated', 'first-time', 'frontline', 'support', 'supervisor', 'manager', 'admin'].includes(currentTab)}
								<select
									bind:value={selectedStatus}
									class="flex-1 max-w-[120px] px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent text-sm"
								>
									<option value="all">All Status</option>
									{#each statusOptions as status}
										<option value={status}>{status}</option>
									{/each}
								</select>
							{/if}

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
							onclick={() => changeTab('first-time')}
							class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {currentTab === 'first-time' ? 'border-[#01c0a4] text-[#01c0a4]' : 'border-transparent text-gray-500 hover:text-gray-700'}"
						>
							<div class="flex items-center space-x-2">
								<UserPlus class="w-4 h-4" />
								<span>First-time</span>
								<span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{tabCounts.firstTime}</span>
							</div>
						</button>

						<button
							onclick={() => changeTab('frontline')}
							class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {currentTab === 'frontline' ? 'border-[#01c0a4] text-[#01c0a4]' : 'border-transparent text-gray-500 hover:text-gray-700'}"
						>
							<div class="flex items-center space-x-2">
								<User class="w-4 h-4" />
								<span>Frontline</span>
								<span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{tabCounts.frontline}</span>
							</div>
						</button>

						<button
							onclick={() => changeTab('support')}
							class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {currentTab === 'support' ? 'border-[#01c0a4] text-[#01c0a4]' : 'border-transparent text-gray-500 hover:text-gray-700'}"
						>
							<div class="flex items-center space-x-2">
								<Headphones class="w-4 h-4" />
								<span>Support</span>
								<span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{tabCounts.support}</span>
							</div>
						</button>

						<button
							onclick={() => changeTab('supervisor')}
							class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {currentTab === 'supervisor' ? 'border-[#01c0a4] text-[#01c0a4]' : 'border-transparent text-gray-500 hover:text-gray-700'}"
						>
							<div class="flex items-center space-x-2">
								<Users class="w-4 h-4" />
								<span>Supervisor</span>
								<span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{tabCounts.supervisor}</span>
							</div>
						</button>

						<button
							onclick={() => changeTab('manager')}
							class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {currentTab === 'manager' ? 'border-[#01c0a4] text-[#01c0a4]' : 'border-transparent text-gray-500 hover:text-gray-700'}"
						>
							<div class="flex items-center space-x-2">
								<Crown class="w-4 h-4" />
								<span>Manager</span>
								<span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{tabCounts.manager}</span>
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
							onclick={() => changeTab('locked')}
							class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {currentTab === 'locked' ? 'border-[#01c0a4] text-[#01c0a4]' : 'border-transparent text-gray-500 hover:text-gray-700'}"
						>
							<div class="flex items-center space-x-2">
								<LockKeyhole class="w-4 h-4" />
								<span>Locked</span>
								<span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{tabCounts.locked}</span>
							</div>
						</button>

						<button
							onclick={() => changeTab('deactivated')}
							class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {currentTab === 'deactivated' ? 'border-[#01c0a4] text-[#01c0a4]' : 'border-transparent text-gray-500 hover:text-gray-700'}"
						>
							<div class="flex items-center space-x-2">
								<X class="w-4 h-4" />
								<span>Deactivated</span>
								<span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{tabCounts.deactivated}</span>
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
								{#if currentTab === 'locked'}
									<button
										onclick={() => confirmBulkUnlockUsers()}
										class="flex items-center space-x-1 bg-green-100 text-green-700 hover:bg-green-200 px-2.5 py-1 rounded-md transition-colors text-sm font-medium"
										title="Unlock selected users"
									>
										<Unlock class="w-3.5 h-3.5" />
										<span>Unlock</span>
									</button>
								{:else if currentTab === 'deactivated'}
									<button
										onclick={() => confirmBulkReactivateUsers()}
										class="flex items-center space-x-1 bg-green-100 text-green-700 hover:bg-green-200 px-2.5 py-1 rounded-md transition-colors text-sm font-medium"
										title="Reactivate selected users"
									>
										<User class="w-3.5 h-3.5" />
										<span>Reactivate</span>
									</button>
								{:else}
									<button
										onclick={() => confirmBulkLockUsers()}
										disabled={loadingLock}
										class="flex items-center space-x-1 bg-orange-100 text-orange-700 hover:bg-orange-200 px-2.5 py-1 rounded-md transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
										title="Lock selected users"
									>
										{#if loadingLock}
											<div class="animate-spin rounded-full h-3 w-3 border-b-2 border-orange-700"></div>
										{:else}
											<Shield class="w-3.5 h-3.5" />
										{/if}
										<span>{loadingLock ? 'Locking...' : 'Lock'}</span>
									</button>
									<button
										onclick={() => confirmBulkDeactivateUsers()}
										disabled={loadingBulk}
										class="flex items-center space-x-1 bg-red-100 text-red-700 hover:bg-red-200 px-2.5 py-1 rounded-md transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
										title="Deactivate selected users"
									>
										{#if loadingBulk}
											<div class="animate-spin rounded-full h-3 w-3 border-b-2 border-red-700"></div>
										{:else}
											<X class="w-3.5 h-3.5" />
										{/if}
										<span>{loadingBulk ? 'Deactivating...' : 'Deactivate'}</span>
									</button>
								{/if}
							</div>
						</div>
					</div>
				{/if}

				<!-- Table -->
				<div class="w-full overflow-x-auto flex-1 min-h-0 relative">
					<!-- Loading Overlay -->
					{#if loadingUsers}
						<div class="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
							<div class="text-center">
								<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
								<p class="text-gray-500">Loading users...</p>
							</div>
						</div>
					{/if}
					
					<div class="h-full overflow-y-auto">
					<table class="w-full table-fixed min-w-[1400px]">
						<thead class="bg-gray-50">
							<tr>
								<th class="w-12 px-3 py-3 text-left">
									<input
										type="checkbox"
										checked={selectAll}
										onchange={handleSelectAll}
										class="rounded border-gray-300 text-[#01c0a4] focus:ring-[#01c0a4]"
									/>
								</th>
								<th class="w-32 px-3 py-3 text-left">
									<button 
										onclick={() => handleSort('employeeId')}
										class="flex items-center space-x-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
									>
										<span>Employee ID</span>
										<svelte:component this={getSortIcon('employeeId')} class="w-3 h-3" />
									</button>
								</th>
								<th class="w-56 px-3 py-3 text-left">
									<button 
										onclick={() => handleSort('name')}
										class="flex items-center space-x-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
									>
										<span>Name</span>
										<svelte:component this={getSortIcon('name')} class="w-3 h-3" />
									</button>
								</th>
								<th class="w-64 px-3 py-3 text-left">
									<button 
										onclick={() => handleSort('email')}
										class="flex items-center space-x-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
									>
										<span>Email</span>
										<svelte:component this={getSortIcon('email')} class="w-3 h-3" />
									</button>
								</th>
								<th class="w-36 px-3 py-3 text-left">
									<button 
										onclick={() => handleSort('ou')}
										class="flex items-center space-x-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
									>
										<span>OU</span>
										<svelte:component this={getSortIcon('ou')} class="w-3 h-3" />
									</button>
								</th>
								<th class="w-32 px-3 py-3 text-left">
									<button 
										onclick={() => handleSort('role')}
										class="flex items-center space-x-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
									>
										<span>Role</span>
										<svelte:component this={getSortIcon('role')} class="w-3 h-3" />
									</button>
								</th>
								{#if currentTab === 'frontline' || currentTab === 'support'}
									<th class="w-40 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supervisor</th>
									<th class="w-40 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manager</th>
								{:else if currentTab === 'supervisor'}
									<th class="w-40 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manager</th>
								{/if}
								<th class="w-28 px-3 py-3 text-left">
									<button 
										onclick={() => handleSort('status')}
										class="flex items-center space-x-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
									>
										<span>Status</span>
										<svelte:component this={getSortIcon('status')} class="w-3 h-3" />
									</button>
								</th>
								<th class="w-48 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
							</tr>
						</thead>
						<tbody class="bg-white divide-y divide-gray-200">
							{#each paginatedUsers() as user, index (user.id || `user-${index}`)}
								<tr 
									class="hover:bg-gray-50 {selectedRows.has(user.id) ? 'bg-blue-50' : ''} cursor-pointer" 
									onclick={(e) => handleRowSelection(user.id, index, e)}
								>
									<td class="w-12 px-3 py-3 whitespace-nowrap" onclick={(e) => e.stopPropagation()}>
										<input
											type="checkbox"
											checked={selectedRows.has(user.id)}
											onchange={() => handleCheckboxChange(user.id, index)}
											class="rounded border-gray-300 text-[#01c0a4] focus:ring-[#01c0a4]"
										/>
									</td>
									<td class="w-32 px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
										{user.employeeId}
									</td>
									<td class="w-56 px-3 py-3 whitespace-nowrap">
										<div class="flex items-center">
											<div class="mr-2"><ProfileAvatar user={{ name: user.name }} size="sm" showOnlineStatus={false} /></div>
											<div class="text-sm font-medium text-gray-900 truncate">{user.name}</div>
										</div>
									</td>
									<td class="w-64 px-3 py-3 whitespace-nowrap text-sm text-gray-500 truncate">
										{user.email}
									</td>
									<td class="w-36 px-3 py-3 whitespace-nowrap text-sm text-gray-500">
										{user.ou}
									</td>
									<td class="w-32 px-3 py-3 whitespace-nowrap text-sm text-gray-500">
										{user.role}
									</td>
									{#if currentTab === 'frontline' || currentTab === 'support'}
										<td class="w-40 px-3 py-3 whitespace-nowrap text-sm text-gray-500">
											{getSupervisorName(user.supervisorId)}
										</td>
										<td class="w-40 px-3 py-3 whitespace-nowrap text-sm text-gray-500">
											{getManagerName(user.managerId)}
										</td>
									{:else if currentTab === 'supervisor'}
										<td class="w-40 px-3 py-3 whitespace-nowrap text-sm text-gray-500">
											{getManagerName(user.managerId)}
										</td>
									{/if}
									<td class="w-28 px-3 py-3 whitespace-nowrap">
										<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {
											user.status === 'Active' ? 'bg-green-100 text-green-800' :
											user.status === 'Locked' ? 'bg-red-100 text-red-800' :
											user.status === 'Deactivated' ? 'bg-gray-100 text-gray-800' :
											'bg-yellow-100 text-yellow-800'
										}">
											{user.status}
										</span>
									</td>
									<td class="w-48 px-3 py-3 whitespace-nowrap text-sm font-medium" onclick={(e) => e.stopPropagation()}>
										<div class="flex items-center space-x-2">
											{#if user.role === 'Manager' || user.role === 'Supervisor'}
												<button
													onclick={() => showTeamInfo(user)}
													class="flex items-center space-x-1 bg-purple-50 text-purple-600 hover:bg-purple-100 hover:text-purple-700 px-2 py-1 rounded-md transition-colors text-xs font-medium"
													title="View team"
												>
													<Info class="w-3 h-3" />
													<span>Team</span>
												</button>
											{/if}
											
											<button
												onclick={() => editUser(user)}
												class="flex items-center space-x-1 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 px-2 py-1 rounded-md transition-colors text-xs font-medium"
												title="Edit user"
											>
												<Edit class="w-3 h-3" />
												<span>Edit</span>
											</button>
										</div>
									</td>
								</tr>
							{/each}
							
							<!-- Empty State Messages -->
							{#if paginatedUsers().length === 0}
								<tr>
									<td colspan="9" class="px-6 py-12 text-center">
										<div class="flex flex-col items-center justify-center space-y-3">
											{#if currentTab === 'frontline'}
												<Users class="w-12 h-12 text-gray-300" />
												<div class="text-lg font-medium text-gray-500">No Frontline Users Found</div>
												<div class="text-sm text-gray-400 max-w-md">
													{#if searchQuery || selectedOU !== 'all' || selectedRole !== 'all' || selectedStatus !== 'all'}
														No frontline users match your current filters. Try adjusting your search or filters.
													{:else}
														There are currently no active frontline users in the system.
													{/if}
												</div>
											{:else if currentTab === 'support'}
												<Headphones class="w-12 h-12 text-gray-300" />
												<div class="text-lg font-medium text-gray-500">No Support Users Found</div>
												<div class="text-sm text-gray-400 max-w-md">
													{#if searchQuery || selectedOU !== 'all' || selectedRole !== 'all' || selectedStatus !== 'all'}
														No support users match your current filters. Try adjusting your search or filters.
													{:else}
														There are currently no active support users in the system.
													{/if}
												</div>
											{:else if currentTab === 'supervisor'}
												<Activity class="w-12 h-12 text-gray-300" />
												<div class="text-lg font-medium text-gray-500">No Supervisors Found</div>
												<div class="text-sm text-gray-400 max-w-md">
													{#if searchQuery || selectedOU !== 'all' || selectedRole !== 'all' || selectedStatus !== 'all'}
														No supervisors match your current filters. Try adjusting your search or filters.
													{:else}
														There are currently no active supervisors in the system.
													{/if}
												</div>
											{:else if currentTab === 'manager'}
												<Crown class="w-12 h-12 text-gray-300" />
												<div class="text-lg font-medium text-gray-500">No Managers Found</div>
												<div class="text-sm text-gray-400 max-w-md">
													{#if searchQuery || selectedOU !== 'all' || selectedRole !== 'all' || selectedStatus !== 'all'}
														No managers match your current filters. Try adjusting your search or filters.
													{:else}
														There are currently no active managers in the system.
													{/if}
												</div>
											{:else if currentTab === 'admin'}
												<Shield class="w-12 h-12 text-gray-300" />
												<div class="text-lg font-medium text-gray-500">No Admin Users Found</div>
												<div class="text-sm text-gray-400 max-w-md">
													{#if searchQuery || selectedOU !== 'all' || selectedRole !== 'all' || selectedStatus !== 'all'}
														No admin users match your current filters. Try adjusting your search or filters.
													{:else}
														There are currently no active admin users in the system.
													{/if}
												</div>
											{:else if currentTab === 'locked'}
												<LockKeyhole class="w-12 h-12 text-gray-300" />
												<div class="text-lg font-medium text-gray-500">No Locked Users Found</div>
												<div class="text-sm text-gray-400 max-w-md">
													{#if searchQuery || selectedOU !== 'all' || selectedRole !== 'all' || selectedStatus !== 'all'}
														No locked users match your current filters. Try adjusting your search or filters.
													{:else}
														There are currently no locked users in the system.
													{/if}
												</div>
											{:else if currentTab === 'deactivated'}
												<X class="w-12 h-12 text-gray-300" />
												<div class="text-lg font-medium text-gray-500">No Deactivated Users Found</div>
												<div class="text-sm text-gray-400 max-w-md">
													{#if searchQuery || selectedOU !== 'all' || selectedRole !== 'all' || selectedStatus !== 'all'}
														No deactivated users match your current filters. Try adjusting your search or filters.
													{:else}
														There are currently no deactivated users in the system.
													{/if}
												</div>
											{:else if currentTab === 'first-time'}
												<UserPlus class="w-12 h-12 text-gray-300" />
												<div class="text-lg font-medium text-gray-500">No First-time Users Found</div>
												<div class="text-sm text-gray-400 max-w-md">
													{#if searchQuery || selectedOU !== 'all' || selectedRole !== 'all' || selectedStatus !== 'all'}
														No first-time users match your current filters. Try adjusting your search or filters.
													{:else}
														There are currently no first-time users requiring setup in the system.
													{/if}
												</div>
											{:else}
												<User class="w-12 h-12 text-gray-300" />
												<div class="text-lg font-medium text-gray-500">No Users Found</div>
												<div class="text-sm text-gray-400 max-w-md">
													{#if searchQuery || selectedOU !== 'all' || selectedRole !== 'all' || selectedStatus !== 'all'}
														No users match your current filters. Try adjusting your search or filters.
													{:else}
														There are currently no users in the system.
													{/if}
												</div>
											{/if}
										</div>
									</td>
								</tr>
							{/if}
						</tbody>
					</table>
				</div>

				<!-- Pagination -->
				{#if totalPages > 1}
					<div class="bg-white px-6 py-3 border-t border-gray-200 flex items-center justify-between">
						<div class="text-sm text-gray-700">
							Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalUsers)} of {totalUsers} results
						</div>
						<div class="flex items-center space-x-2">
							<button
								onclick={() => goToPage(currentPage - 1)}
								disabled={currentPage === 1}
								class="p-2 text-gray-500 hover:text-[#01c0a4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								<ChevronLeft class="w-5 h-5" />
							</button>

							{#each Array.from({ length: totalPages }, (_, i) => i + 1) as page}
								{#if page === 1 || page === totalPages || (page >= currentPage - 2 && page <= currentPage + 2)}
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
								disabled={currentPage === totalPages}
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

<!-- Edit User Modal -->
{#if showEditUserModal && selectedUser}
	<div 
		class="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50" 
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={() => closeModal('edit')}
		onkeydown={(e) => e.key === 'Escape' && closeModal('edit')}
	>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
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
									onchange={handleRoleChangeEdit}
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

						<!-- Hierarchical Field Selection for Edit Form -->
						{#if selectedUser.type !== 'admin' && editForm.role === 'Supervisor'}
							<div>
								<label for="editManager" class="block text-sm font-medium text-gray-700 mb-2">Manager</label>
								<select
									id="editManager"
									bind:value={editForm.managerId}
									onchange={handleManagerChangeEdit}
									class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent"
								>
									<option value="">Select Manager</option>
									{#each getAvailableManagersEdit() as manager}
										<option value={manager.id}>{manager.name} - {manager.ou}</option>
									{/each}
								</select>
							</div>
						{:else if selectedUser.type !== 'admin' && (editForm.role === 'Frontline' || editForm.role === 'Support')}
							<div>
								<label for="editSupervisor" class="block text-sm font-medium text-gray-700 mb-2">Supervisor</label>
								<select
									id="editSupervisor"
									bind:value={editForm.supervisorId}
									onchange={handleSupervisorChangeEdit}
									class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent"
								>
									<option value="">Select Supervisor</option>
									{#each getAvailableSupervisorsEdit() as supervisor}
										<option value={supervisor.id}>{supervisor.name} - {supervisor.ou}</option>
									{/each}
								</select>
							</div>
						{/if}
					</div>

					{#if selectedUser.type !== 'admin' && editForm.supervisorId && (editForm.role === 'Frontline' || editForm.role === 'Support')}
						{@const selectedSupervisor = getAvailableSupervisorsEdit().find(s => s.id === editForm.supervisorId)}
						{#if selectedSupervisor && selectedSupervisor.managerId}
							{@const selectedManager = hierarchyOptions.managers.find(m => m.id === selectedSupervisor.managerId)}
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">Manager (Auto-assigned)</label>
								<div class="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg text-gray-700">
									{selectedManager ? `${selectedManager.name} - ${selectedManager.ou}` : 'Manager not found'}
								</div>
							</div>
						{/if}
					{/if}

					{#if selectedUser.type !== 'admin'}
						<div>
							<label for="editOu" class="block text-sm font-medium text-gray-700 mb-2">
								Organizational Unit *
								{#if editForm.role === 'Supervisor' && editForm.managerId}
									<span class="text-sm text-gray-500">(Based on Manager's OUs)</span>
								{:else if (editForm.role === 'Frontline' || editForm.role === 'Support') && editForm.supervisorId}
									<span class="text-sm text-gray-500">(Based on Supervisor's OU)</span>
								{/if}
							</label>
							<select
								id="editOu"
								bind:value={editForm.ou}
								class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent"
							>
								<option value="">Select OU</option>
								{#each getAvailableOUsEdit() as ou}
									<option value={ou}>{ou}</option>
								{/each}
							</select>
						</div>
					{/if}

					<!-- Password Section -->
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

					<!-- Password Management Section -->
					<div class="border-t border-gray-200 pt-4">
						<div class="flex items-center justify-between mb-3">
							<div class="flex items-center space-x-2">
								<Key class="w-5 h-5 text-gray-600" />
								<span class="text-sm font-medium text-gray-700">Password Management</span>
							</div>
							<button
								onclick={togglePasswordSection}
								class="text-sm text-[#01c0a4] hover:text-[#00a085] font-medium"
							>
								{showPasswordSection ? 'Cancel' : 'Change Password'}
							</button>
						</div>

						{#if !showPasswordSection}
							<div class="flex space-x-3">
								<button
									onclick={handlePasswordReset}
									class="flex-1 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
								>
									Send Reset Email
								</button>
								<button
									onclick={togglePasswordSection}
									class="flex-1 px-4 py-2 bg-[#01c0a4]/10 text-[#01c0a4] rounded-lg hover:bg-[#01c0a4]/20 transition-colors text-sm font-medium"
								>
									Set New Password
								</button>
							</div>
						{:else}
							<div class="space-y-4">
								<div>
									<label for="newPassword" class="block text-sm font-medium text-gray-700 mb-2">New Password *</label>
									<div class="relative">
										<input
											id="newPassword"
											bind:value={passwordForm.newPassword}
											type={showPasswordFields ? 'text' : 'password'}
											placeholder="Enter new password (min 8 characters)"
											class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent pr-12"
										/>
										<button
											type="button"
											onclick={() => showPasswordFields = !showPasswordFields}
											class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
										>
											{#if showPasswordFields}
												<EyeOff class="w-5 h-5" />
											{:else}
												<Eye class="w-5 h-5" />
											{/if}
										</button>
									</div>
								</div>

								<div>
									<label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-2">Confirm Password *</label>
									<input
										id="confirmPassword"
										bind:value={passwordForm.confirmPassword}
										type={showPasswordFields ? 'text' : 'password'}
										placeholder="Confirm new password"
										class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent"
									/>
								</div>

								<div class="flex items-center space-x-2">
									<input
										id="requirePasswordChange"
										type="checkbox"
										bind:checked={passwordForm.requirePasswordChange}
										class="w-4 h-4 text-[#01c0a4] border-gray-300 rounded focus:ring-[#01c0a4] focus:ring-2"
									/>
									<label for="requirePasswordChange" class="text-sm text-gray-700">
										Require user to change password on next login
									</label>
								</div>

								<div class="flex space-x-3">
									<button
										onclick={resetPasswordForm}
										class="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
									>
										Cancel
									</button>
									<button
										onclick={changePassword}
										disabled={loadingPassword}
										class="flex-1 px-4 py-2 bg-gradient-to-r from-[#01c0a4] to-[#00a085] text-white rounded-lg hover:shadow-lg hover:shadow-[#01c0a4]/25 transition-all duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
									>
										{#if loadingPassword}
											<div class="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
											Updating...
										{:else}
											Update Password
										{/if}
									</button>
								</div>
							</div>
						{/if}
					</div>
				</div>
			</div>

			<!-- Footer -->
			<div class="flex justify-end space-x-3 p-6 border-t border-gray-200">
				<button
					onclick={() => closeModal('edit')}
					class="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
					disabled={isAnyLoading()}
				>
					Cancel
				</button>
				<button
					onclick={saveEditUser}
					disabled={loadingEdit}
					class="px-6 py-3 bg-gradient-to-r from-[#01c0a4] to-[#00a085] text-white rounded-lg hover:shadow-lg hover:shadow-[#01c0a4]/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
				>
					{#if loadingEdit}
						<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
						Saving...
					{:else}
						Save Changes
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Confirmation Modal -->
{#if showConfirmationModal}
	<ConfirmationModal
		show={showConfirmationModal}
		title="Confirm Action"
		message={getConfirmationMessage()}
		confirmText={confirmationAction.startsWith('bulk-') ? 
			confirmationAction.replace('bulk-', '').replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) :
			confirmationAction.charAt(0).toUpperCase() + confirmationAction.slice(1)}
		confirmStyle={
			confirmationAction === 'deactivate' || confirmationAction === 'bulk-deactivate'
				? 'danger'
				: confirmationAction === 'lock' || confirmationAction === 'bulk-lock'
				? 'warning' 
				: 'primary'
		}
		onConfirm={executeConfirmedAction}
		onCancel={() => closeModal('confirmation')}
	/>
{/if}

<!-- Team Modal -->
{#if showTeamModal && teamModalUser}
	<div 
		class="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50" 
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={() => closeModal('team')}
		onkeydown={(e) => e.key === 'Escape' && closeModal('team')}
	>
		<div 
			class="bg-white rounded-2xl shadow-2xl w-full max-w-7xl mx-4 max-h-[90vh] overflow-y-auto" 
			role="document"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<!-- Header -->
			<div class="flex items-center justify-between p-6 border-b border-gray-200">
				<div class="flex items-center space-x-3">
					<div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
						<Users class="w-5 h-5 text-blue-600" />
					</div>
					<div>
						<h2 class="text-xl font-semibold text-gray-900">
							{selectedSupervisorView ? `${selectedSupervisorView.name}'s Team` : 
							 teamModalUser?.role === 'Supervisor' ? `${teamModalUser.name}'s Team` :
							 `${teamModalUser.name}'s Organization`}
						</h2>
						<p class="text-sm text-gray-500">
							{selectedSupervisorView ? `Supervisor - ${selectedSupervisorView.ou}` : `${teamModalUser.role} - ${teamModalUser.ou}`}
						</p>
					</div>
				</div>
				{#if selectedSupervisorView}
					<button
						onclick={navigateBack}
						class="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
					>
						<ArrowLeft class="w-4 h-4" />
						<span>Back to Overview</span>
					</button>
				{/if}
			</div>

			<!-- Content -->
			<div class="p-6">
				{#if loadingTeamData}
					<!-- Loading State -->
					<div class="flex items-center justify-center py-12">
						<div class="text-center">
							<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
							<p class="text-gray-500">Loading team information...</p>
						</div>
					</div>
				{:else if selectedSupervisorView}
					<!-- Supervisor's Team View -->
					{@const supervisorTeam = getSupervisorTeam()}
					
					<!-- Supervisor Card -->
					<div class="mb-6">
						<div class="flex items-center justify-center mb-4">
							<div class="bg-emerald-600 text-white p-4 rounded-lg shadow-lg min-w-[200px] text-center">
								<div class="mx-auto mb-2"><ProfileAvatar user={{ name: selectedSupervisorView.name }} size="lg" showOnlineStatus={false} /></div>
								<div class="font-semibold">{selectedSupervisorView.name}</div>
								<div class="text-sm opacity-90">{selectedSupervisorView.role}</div>
								<div class="text-xs opacity-75">{selectedSupervisorView.ou}</div>
							</div>
						</div>
						
						<!-- Vertical Connection Line -->
						{#if supervisorTeam.length > 0}
							<div class="flex justify-center">
								<div class="w-0.5 h-8 bg-gray-300"></div>
							</div>
						{/if}
					</div>

					<!-- Team Members -->
					{#if supervisorTeam.length > 0}
						<div class="space-y-6">
							<h3 class="text-lg font-medium text-gray-900 text-center">Team Members ({supervisorTeam.length})</h3>
							
							<!-- Single horizontal line -->
							<div class="flex justify-center">
								<div class="w-full max-w-6xl h-0.5 bg-gray-300"></div>
							</div>

							<!-- Team Member Cards -->
							<div class="flex justify-center">
								<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 max-w-7xl">
									{#each supervisorTeam as member}
										<div class="{
											member.role === 'Frontline' ? 'bg-cyan-100 border-cyan-300' :
											member.role === 'Support' ? 'bg-teal-100 border-teal-300' :
											'bg-green-100 border-green-200'
										} border rounded-lg p-3 text-center min-w-[160px]">
											<div class="mx-auto mb-2"><ProfileAvatar user={{ name: member.name }} size="md" showOnlineStatus={false} /></div>
											<div class="font-medium text-gray-900 text-sm truncate" title="{member.name}">{member.name}</div>
											<div class="text-xs {
												member.role === 'Frontline' ? 'text-cyan-700' :
												member.role === 'Support' ? 'text-teal-700' :
												'text-gray-600'
											} font-semibold">{member.role}</div>
											<div class="text-xs text-gray-500 truncate" title="{member.ou}">{member.ou}</div>
											<div class="text-xs text-gray-500 mt-1 truncate" title="{member.email}">{member.email}</div>
										</div>
									{/each}
								</div>
							</div>
						</div>
					{:else}
						<div class="text-center py-8">
							<Users class="w-12 h-12 text-gray-400 mx-auto mb-4" />
							<h3 class="text-lg font-medium text-gray-900 mb-2">No Team Members</h3>
							<p class="text-gray-500">This supervisor doesn't have any direct reports yet.</p>
						</div>
					{/if}
				{:else if teamModalUser?.role === 'Supervisor'}
					<!-- Supervisor's Own Team View (when supervisor is the root user) -->
					{@const supervisorTeam = getSupervisorTeam()}
					
					<!-- Team Summary at Top -->
					{#if supervisorTeam.length > 0}
						<div class="mb-8 bg-gray-50 rounded-lg p-4">
							<h4 class="font-medium text-gray-900 mb-3 text-center">Team Summary</h4>
							<div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
								<div class="bg-white rounded p-3">
									<div class="text-2xl font-bold text-blue-600">{supervisorTeam.filter(m => m.role === 'Frontline').length}</div>
									<div class="text-xs text-gray-600">Frontline</div>
								</div>
								<div class="bg-white rounded p-3">
									<div class="text-2xl font-bold text-purple-600">{supervisorTeam.filter(m => m.role === 'Support').length}</div>
									<div class="text-xs text-gray-600">Support</div>
								</div>
								<div class="bg-white rounded p-3">
									<div class="text-2xl font-bold text-gray-600">{supervisorTeam.length}</div>
									<div class="text-xs text-gray-600">Total Team</div>
								</div>
							</div>
						</div>
					{/if}

					<!-- Supervisor Card -->
					<div class="mb-6">
						<div class="flex items-center justify-center mb-4">
							<div class="bg-emerald-600 text-white p-6 rounded-lg shadow-lg min-w-[250px] text-center">
								<div class="mx-auto mb-3"><ProfileAvatar user={{ name: teamModalUser.name }} size="xl" showOnlineStatus={false} /></div>
								<div class="text-lg font-bold">{teamModalUser.name}</div>
								<div class="text-sm opacity-90">{teamModalUser.role}</div>
								<div class="text-xs opacity-75">{teamModalUser.ou}</div>
							</div>
						</div>
						
						<!-- Vertical Connection Line -->
						{#if supervisorTeam.length > 0}
							<div class="flex justify-center">
								<div class="w-0.5 h-12 bg-gray-300"></div>
							</div>
						{/if}
					</div>

					<!-- Team Members -->
					{#if supervisorTeam.length > 0}
						<div class="space-y-6">
							<h3 class="text-lg font-medium text-gray-900 text-center">Team Members ({supervisorTeam.length})</h3>
							
							<!-- Single horizontal line -->
							<div class="flex justify-center">
								<div class="w-full max-w-6xl h-0.5 bg-gray-300"></div>
							</div>

							<!-- Team Member Cards -->
							<div class="flex justify-center">
								<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 max-w-7xl">
									{#each supervisorTeam as member}
										<div class="{
											member.role === 'Frontline' ? 'bg-cyan-100 border-cyan-300' :
											member.role === 'Support' ? 'bg-teal-100 border-teal-300' :
											'bg-green-100 border-green-200'
										} border rounded-lg p-3 text-center min-w-[160px]">
											<div class="mx-auto mb-2"><ProfileAvatar user={{ name: member.name }} size="md" showOnlineStatus={false} /></div>
											<div class="font-medium text-gray-900 text-sm truncate" title="{member.name}">{member.name}</div>
											<div class="text-xs {
												member.role === 'Frontline' ? 'text-cyan-700' :
												member.role === 'Support' ? 'text-teal-700' :
												'text-gray-600'
											} font-semibold">{member.role}</div>
											<div class="text-xs text-gray-500 truncate" title="{member.ou}">{member.ou}</div>
											<div class="text-xs text-gray-500 mt-1 truncate" title="{member.email}">{member.email}</div>
										</div>
									{/each}
								</div>
							</div>
						</div>
					{:else}
						<div class="text-center py-8">
							<Users class="w-12 h-12 text-gray-400 mx-auto mb-4" />
							<h3 class="text-lg font-medium text-gray-900 mb-2">No Team Members</h3>
							<p class="text-gray-500">This supervisor doesn't have any direct reports yet.</p>
						</div>
					{/if}
				{:else}
					<!-- Manager's Organization Overview -->
					{@const directSupervisors = getDirectSupervisors()}
					
					<!-- Manager Team Summary moved to top -->
					<div class="mb-8 bg-gray-50 rounded-lg p-4">
						<h4 class="font-medium text-gray-900 mb-3 text-center">Manager Team Summary</h4>
						<div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
							<div class="bg-white rounded p-3">
								<div class="text-2xl font-bold text-blue-600">{directSupervisors.length}</div>
								<div class="text-xs text-gray-600">Supervisors</div>
							</div>
							<div class="bg-white rounded p-3">
								<div class="text-2xl font-bold text-green-600">
									{teamData?.teamMembers ? teamData.teamMembers.filter((m: any) => m.role === 'Frontline' || m.role === 'Support').length : 0}
								</div>
								<div class="text-xs text-gray-600">Team Members</div>
							</div>
							<div class="bg-white rounded p-3">
								<div class="text-2xl font-bold text-purple-600">
									{teamData?.teamMembers ? teamData.teamMembers.length + 1 : 1}
								</div>
								<div class="text-xs text-gray-600">Total People</div>
							</div>
						</div>
					</div>

					<!-- Manager Card at the top -->
					<div class="mb-6">
						<div class="flex items-center justify-center mb-4">
							<div class="bg-teal-600 text-white p-6 rounded-lg shadow-lg min-w-[250px] text-center">
								<div class="mx-auto mb-3"><ProfileAvatar user={{ name: teamModalUser.name }} size="xl" showOnlineStatus={false} /></div>
								<div class="text-lg font-bold">{teamModalUser.name}</div>
								<div class="text-sm opacity-90">{teamModalUser.role}</div>
								<div class="text-xs opacity-75">{teamModalUser.ou}</div>
							</div>
						</div>
						
						<!-- Vertical Connection Line -->
						{#if directSupervisors.length > 0}
							<div class="flex justify-center">
								<div class="w-0.5 h-12 bg-gray-300"></div>
							</div>
						{/if}
					</div>

					{#if directSupervisors.length > 0}
						<!-- Single horizontal line -->
						<div class="flex justify-center mb-8">
							<div class="w-full max-w-5xl h-0.5 bg-gray-300"></div>
						</div>

						<!-- Supervisor Cards -->
						<div class="space-y-6">
							<h3 class="text-lg font-medium text-gray-900 text-center">Supervisors ({directSupervisors.length})</h3>
							
							<div class="flex justify-center">
								<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 max-w-6xl">
								{#each directSupervisors as supervisor}
									{@const supervisorTeamCount = teamData?.teamMembers ? teamData.teamMembers.filter((m: any) => m.supervisorId === supervisor.id).length : 0}
									<button
										onclick={() => navigateToSupervisor(supervisor)}
										class="bg-emerald-100 border border-emerald-300 rounded-lg p-3 text-center hover:bg-emerald-200 transition-colors cursor-pointer group min-w-[180px]"
									>
										<div class="mx-auto mb-2"><ProfileAvatar user={{ name: supervisor.name }} size="md" showOnlineStatus={false} /></div>
										<div class="font-medium text-gray-900 text-sm truncate" title="{supervisor.name}">{supervisor.name}</div>
										<div class="text-xs text-emerald-700 font-semibold">{supervisor.role}</div>
										<div class="text-xs text-gray-500 truncate" title="{supervisor.ou}">{supervisor.ou}</div>
										<div class="text-xs text-gray-500 mt-1 truncate" title="{supervisor.email}">{supervisor.email}</div>
										
										<!-- Team count indicator -->
										<div class="mt-2 pt-2 border-t border-emerald-400">
											<div class="text-xs text-emerald-700 font-medium">
												{supervisorTeamCount} Team Member{supervisorTeamCount === 1 ? '' : 's'}
											</div>
											{#if supervisorTeamCount > 0}
												<div class="text-xs text-emerald-600 mt-1">Click to view team</div>
											{/if}
										</div>
									</button>
								{/each}
							</div>
						</div>
					</div>
					{:else}
						<div class="text-center py-8">
							<Users class="w-12 h-12 text-gray-400 mx-auto mb-4" />
							<h3 class="text-lg font-medium text-gray-900 mb-2">No Team Structure</h3>
							<p class="text-gray-500">This manager doesn't have any supervisors or direct reports yet.</p>
						</div>
					{/if}
				{/if}
			</div>

			<!-- Footer -->
			<div class="flex justify-end p-6 border-t border-gray-200">
				<button
					onclick={() => closeModal('team')}
					class="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
				>
					Close
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
		onclick={() => closeModal('add')}
		onkeydown={(e) => e.key === 'Escape' && closeModal('add')}
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
									onchange={handleRoleChange}
									class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent"
								>
									<option value="">Select Role</option>
									{#each roleOptions as role}
										<option value={role}>{role}</option>
									{/each}
								</select>
							</div>

							<!-- Hierarchical Field Selection -->
							{#if individualForm.role === 'Supervisor'}
								<div>
									<label for="manager" class="block text-sm font-medium text-gray-700 mb-2">Manager</label>
									<select
										id="manager"
										bind:value={individualForm.managerId}
										onchange={handleManagerChange}
										class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent"
									>
										<option value="">Select Manager</option>
										{#each getAvailableManagers() as manager}
											<option value={manager.id}>{manager.name} - {manager.ou}</option>
										{/each}
									</select>
								</div>
							{:else if individualForm.role === 'Frontline' || individualForm.role === 'Support'}
								<div>
									<label for="supervisor" class="block text-sm font-medium text-gray-700 mb-2">Supervisor</label>
									<select
										id="supervisor"
										bind:value={individualForm.supervisorId}
										onchange={handleSupervisorChange}
										class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent"
									>
										<option value="">Select Supervisor</option>
										{#each getAvailableSupervisors() as supervisor}
											<option value={supervisor.id}>{supervisor.name} - {supervisor.ou}</option>
										{/each}
									</select>
								</div>

								{#if individualForm.supervisorId}
									{@const selectedSupervisor = getAvailableSupervisors().find(s => s.id === individualForm.supervisorId)}
									{#if selectedSupervisor && selectedSupervisor.managerId}
										{@const selectedManager = hierarchyOptions.managers.find(m => m.id === selectedSupervisor.managerId)}
										<div>
											<label class="block text-sm font-medium text-gray-700 mb-2">Manager (Auto-assigned)</label>
											<div class="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg text-gray-700">
												{selectedManager ? `${selectedManager.name} - ${selectedManager.ou}` : 'Manager not found'}
											</div>
										</div>
									{/if}
								{/if}
							{/if}

							{#if individualForm.role !== 'Admin'}
								<div>
									<label for="ou" class="block text-sm font-medium text-gray-700 mb-2">
										Organizational Unit
										{#if individualForm.role === 'Supervisor' && individualForm.managerId}
											<span class="text-sm text-gray-500">(Based on Manager's OUs)</span>
										{:else if (individualForm.role === 'Frontline' || individualForm.role === 'Support') && individualForm.supervisorId}
											<span class="text-sm text-gray-500">(Based on Supervisor's OU)</span>
										{/if}
									</label>
									<select
										id="ou"
										bind:value={individualForm.ou}
										class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent"
									>
										<option value="">Select OU</option>
										{#each getAvailableOUs() as ou}
											<option value={ou}>{ou}</option>
										{/each}
									</select>
								</div>
							{/if}
						</div>

						<!-- Remove old hierarchical sections as they're now integrated above -->
						<!-- The old sections with manual filtering are replaced by the new functions -->
					</div>

					<!-- Individual Add Footer -->
					<div class="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
						<button
							onclick={() => closeModal('add')}
							class="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
							disabled={isAnyLoading()}
						>
							Cancel
						</button>
						<button
							onclick={addIndividualUser}
							disabled={loadingCreate}
							class="px-6 py-3 bg-gradient-to-r from-[#01c0a4] to-[#00a085] text-white rounded-lg hover:shadow-lg hover:shadow-[#01c0a4]/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
						>
							{#if loadingCreate}
								<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
								Creating...
							{:else}
								Add User
							{/if}
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
									<span>Download Templates</span>
								</button>
							</div>
							<div class="text-sm text-gray-600 mb-4 space-y-2">
								<p class="font-medium">Four template files will be downloaded:</p>
								<div class="text-left max-w-md mx-auto space-y-1">
									<p><strong>• Frontline/Support:</strong> Includes Supervisor Name and Manager Name columns</p>
									<p><strong>• Supervisor:</strong> Includes Manager Name column</p>
									<p><strong>• Manager:</strong> Basic user information only</p>
									<p><strong>• Admin:</strong> Basic user information only</p>
								</div>
								<p class="mt-3">Fill the appropriate template with user data and upload it back.</p>
							</div>
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
						disabled={loadingBulk}
						class="px-6 py-3 bg-gradient-to-r from-[#01c0a4] to-[#00a085] text-white rounded-lg hover:shadow-lg hover:shadow-[#01c0a4]/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
					>
						{#if loadingBulk}
							<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
							Creating {bulkData.valid.length} Users...
						{:else}
							Add {bulkData.valid.length} Valid Users
						{/if}
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}

<ToastContainer />

</div>

<svelte:window onkeydown={handleKeydown} />
