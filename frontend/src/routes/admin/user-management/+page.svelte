<script lang="ts">
	import { onMount } from 'svelte';
	import ProfileAvatar from '$lib/components/ProfileAvatar.svelte';
	import ConfirmationModal from '$lib/components/ConfirmationModal.svelte';
	import { 
		Search, Filter, Plus, Download, Upload, Edit, Lock, 
		Unlock, UserX, User, Shield, X, ChevronLeft, ChevronRight,
		FileText, AlertCircle, CheckCircle, Eye, EyeOff, Info, Users, ArrowLeft, Key,
		UserPlus, Activity, Headphones, Crown, LockKeyhole, ArrowUpDown, ArrowUp, ArrowDown
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
		supervisorId?: string;
		managerId?: string;
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
	let showTeamModal = $state<boolean>(false);
	let confirmationAction = $state<string>('');
	let selectedUser = $state<UserData | null>(null);
	let teamModalUser = $state<UserData | null>(null);
	
	// Team modal navigation
	let teamViewStack = $state<UserData[]>([]); // Stack for navigation
	let currentTeamView = $state<UserData | null>(null);
	let selectedSupervisorView = $state<UserData | null>(null); // Which supervisor's team we're viewing
	
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
		'Deactivated',
		'First-time'
	];

	// Sample data
	onMount(() => {
		// Base users
		const baseUsers: UserData[] = [
			// Admin
			{
				id: '1',
				employeeId: 'EMP001',
				name: 'Alice Johnson',
				email: 'alice.johnson@company.com',
				ou: 'N/A',
				role: 'Admin',
				status: 'Active',
				type: 'admin'
			},
			// Managers
			{
				id: '2',
				employeeId: 'EMP002',
				name: 'John Doe',
				email: 'john.doe@company.com',
				ou: 'Engineering',
				role: 'Manager',
				status: 'Active',
				type: 'user'
			},
			{
				id: '3',
				employeeId: 'EMP003',
				name: 'Sarah Wilson',
				email: 'sarah.wilson@company.com',
				ou: 'Sales',
				role: 'Manager',
				status: 'Active',
				type: 'user'
			}
		];

		// Generate hierarchical users
		const generatedUsers: UserData[] = [];
		let currentId = 4;
		const sampleOUs = ['Engineering', 'Marketing', 'Sales', 'Support', 'HR', 'Finance'];
		const sampleStatuses = ['Active', 'Active', 'Active', 'Inactive', 'First-time', 'Locked', 'Deactivated']; // Added more variety
		const frontlineRoles = ['Frontline', 'Support'];
		
		// Names for variety
		const firstNames = ['Michael', 'Jennifer', 'David', 'Lisa', 'Robert', 'Karen', 'James', 'Susan', 'William', 'Jessica', 
			'Thomas', 'Nancy', 'Daniel', 'Betty', 'Matthew', 'Helen', 'Anthony', 'Sandra', 'Mark', 'Donna',
			'Donald', 'Carol', 'Steven', 'Ruth', 'Paul', 'Sharon', 'Andrew', 'Michelle', 'Joshua', 'Laura',
			'Kenneth', 'Sarah', 'Kevin', 'Kimberly', 'Brian', 'Deborah', 'George', 'Dorothy', 'Edward', 'Lisa',
			'Ronald', 'Nancy', 'Timothy', 'Karen', 'Jason', 'Betty', 'Jeffrey', 'Helen', 'Ryan', 'Sandra'];
		
		const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
			'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
			'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
			'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores'];

		// Get managers for supervisor assignment
		const managers = baseUsers.filter(u => u.role === 'Manager');
		
		// Add some specific locked and deactivated users for demo purposes
		const lockedAndDeactivatedUsers: UserData[] = [
			{
				id: 'locked-1',
				employeeId: 'EMP900',
				name: 'Michael Thompson',
				email: 'michael.thompson@company.com',
				ou: 'Engineering',
				role: 'Frontline',
				status: 'Locked',
				type: 'user',
				supervisorId: undefined,
				managerId: managers[0]?.id
			},
			{
				id: 'locked-2',
				employeeId: 'EMP901',
				name: 'Sarah Davis',
				email: 'sarah.davis@company.com',
				ou: 'Sales',
				role: 'Support',
				status: 'Locked',
				type: 'user',
				supervisorId: undefined,
				managerId: managers[1]?.id
			},
			{
				id: 'deactivated-1',
				employeeId: 'EMP950',
				name: 'Robert Johnson',
				email: 'robert.johnson@company.com',
				ou: 'Marketing',
				role: 'Supervisor',
				status: 'Deactivated',
				type: 'user',
				managerId: managers[0]?.id
			},
			{
				id: 'deactivated-2',
				employeeId: 'EMP951',
				name: 'Lisa Wilson',
				email: 'lisa.wilson@company.com',
				ou: 'HR',
				role: 'Frontline',
				status: 'Deactivated',
				type: 'user',
				supervisorId: undefined,
				managerId: managers[0]?.id
			},
			{
				id: 'deactivated-3',
				employeeId: 'EMP952',
				name: 'David Brown',
				email: 'david.brown@company.com',
				ou: 'Finance',
				role: 'Support',
				status: 'Deactivated',
				type: 'user',
				supervisorId: undefined,
				managerId: managers[0]?.id
			}
		];
		
		generatedUsers.push(...lockedAndDeactivatedUsers);
		
		// Generate supervisors (5 per manager)
		const supervisors: UserData[] = [];
		managers.forEach((manager, managerIndex) => {
			for (let i = 0; i < 5; i++) {
				const firstName = firstNames[currentId % firstNames.length];
				const lastName = lastNames[(currentId + managerIndex * 5 + i) % lastNames.length];
				
				const supervisor: UserData = {
					id: currentId.toString(),
					employeeId: `SUP${String(currentId).padStart(3, '0')}`,
					name: `${firstName} ${lastName}`,
					email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@company.com`,
					ou: manager.ou,
					role: 'Supervisor',
					status: sampleStatuses[currentId % sampleStatuses.length],
					type: 'user',
					managerId: manager.id
				};
				
				supervisors.push(supervisor);
				generatedUsers.push(supervisor);
				currentId++;
			}
		});

		// Generate frontline/support users (20 per supervisor)
		supervisors.forEach((supervisor, supervisorIndex) => {
			for (let i = 0; i < 20; i++) {
				const firstName = firstNames[(currentId + i) % firstNames.length];
				const lastName = lastNames[(currentId + supervisorIndex * 20 + i) % lastNames.length];
				const role = frontlineRoles[i % frontlineRoles.length];
				
				const frontlineUser: UserData = {
					id: currentId.toString(),
					employeeId: `EMP${String(currentId).padStart(3, '0')}`,
					name: `${firstName} ${lastName}`,
					email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@company.com`,
					ou: supervisor.ou,
					role: role,
					status: sampleStatuses[currentId % sampleStatuses.length],
					type: 'user',
					supervisorId: supervisor.id,
					managerId: supervisor.managerId
				};
				
				generatedUsers.push(frontlineUser);
				currentId++;
			}
		});

		// Combine base users with generated users
		users = [...baseUsers, ...generatedUsers];
		
		filterUsers();
	});

	// Computed values - Dynamic tab counts based on current filters
	const tabCounts = $derived({
		frontline: (() => {
			if (currentTab === 'frontline') return filteredUsers.length;
			let filtered = users.filter(u => u.role === 'Frontline' && u.status === 'Active');
			if (selectedOU !== 'all') filtered = filtered.filter(u => u.ou === selectedOU);
			if (selectedRole !== 'all') filtered = filtered.filter(u => u.role === selectedRole);
			if (selectedStatus !== 'all') filtered = filtered.filter(u => u.status === selectedStatus);
			if (searchQuery) {
				filtered = filtered.filter(u => 
					u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
					u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
					u.employeeId.toLowerCase().includes(searchQuery.toLowerCase())
				);
			}
			return filtered.length;
		})(),
		support: (() => {
			if (currentTab === 'support') return filteredUsers.length;
			let filtered = users.filter(u => u.role === 'Support' && u.status === 'Active');
			if (selectedOU !== 'all') filtered = filtered.filter(u => u.ou === selectedOU);
			if (selectedRole !== 'all') filtered = filtered.filter(u => u.role === selectedRole);
			if (selectedStatus !== 'all') filtered = filtered.filter(u => u.status === selectedStatus);
			if (searchQuery) {
				filtered = filtered.filter(u => 
					u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
					u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
					u.employeeId.toLowerCase().includes(searchQuery.toLowerCase())
				);
			}
			return filtered.length;
		})(),
		supervisor: (() => {
			if (currentTab === 'supervisor') return filteredUsers.length;
			let filtered = users.filter(u => u.role === 'Supervisor' && u.status === 'Active');
			if (selectedOU !== 'all') filtered = filtered.filter(u => u.ou === selectedOU);
			if (selectedRole !== 'all') filtered = filtered.filter(u => u.role === selectedRole);
			if (selectedStatus !== 'all') filtered = filtered.filter(u => u.status === selectedStatus);
			if (searchQuery) {
				filtered = filtered.filter(u => 
					u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
					u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
					u.employeeId.toLowerCase().includes(searchQuery.toLowerCase())
				);
			}
			return filtered.length;
		})(),
		manager: (() => {
			if (currentTab === 'manager') return filteredUsers.length;
			let filtered = users.filter(u => u.role === 'Manager' && u.status === 'Active');
			if (selectedOU !== 'all') filtered = filtered.filter(u => u.ou === selectedOU);
			if (selectedRole !== 'all') filtered = filtered.filter(u => u.role === selectedRole);
			if (selectedStatus !== 'all') filtered = filtered.filter(u => u.status === selectedStatus);
			if (searchQuery) {
				filtered = filtered.filter(u => 
					u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
					u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
					u.employeeId.toLowerCase().includes(searchQuery.toLowerCase())
				);
			}
			return filtered.length;
		})(),
		admin: (() => {
			if (currentTab === 'admin') return filteredUsers.length;
			let filtered = users.filter(u => u.type === 'admin' && u.status === 'Active');
			if (selectedOU !== 'all') filtered = filtered.filter(u => u.ou === selectedOU);
			if (selectedRole !== 'all') filtered = filtered.filter(u => u.role === selectedRole);
			if (selectedStatus !== 'all') filtered = filtered.filter(u => u.status === selectedStatus);
			if (searchQuery) {
				filtered = filtered.filter(u => 
					u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
					u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
					u.employeeId.toLowerCase().includes(searchQuery.toLowerCase())
				);
			}
			return filtered.length;
		})(),
		deactivated: (() => {
			if (currentTab === 'deactivated') return filteredUsers.length;
			let filtered = users.filter(u => u.status === 'Deactivated');
			if (selectedOU !== 'all') filtered = filtered.filter(u => u.ou === selectedOU);
			if (selectedRole !== 'all') filtered = filtered.filter(u => u.role === selectedRole);
			if (selectedStatus !== 'all') filtered = filtered.filter(u => u.status === selectedStatus);
			if (searchQuery) {
				filtered = filtered.filter(u => 
					u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
					u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
					u.employeeId.toLowerCase().includes(searchQuery.toLowerCase())
				);
			}
			return filtered.length;
		})(),
		locked: (() => {
			if (currentTab === 'locked') return filteredUsers.length;
			let filtered = users.filter(u => u.status === 'Locked');
			if (selectedOU !== 'all') filtered = filtered.filter(u => u.ou === selectedOU);
			if (selectedRole !== 'all') filtered = filtered.filter(u => u.role === selectedRole);
			if (selectedStatus !== 'all') filtered = filtered.filter(u => u.status === selectedStatus);
			if (searchQuery) {
				filtered = filtered.filter(u => 
					u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
					u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
					u.employeeId.toLowerCase().includes(searchQuery.toLowerCase())
				);
			}
			return filtered.length;
		})(),
		firstTime: (() => {
			if (currentTab === 'first-time') return filteredUsers.length;
			let filtered = users.filter(u => u.status === 'First-time');
			if (selectedOU !== 'all') filtered = filtered.filter(u => u.ou === selectedOU);
			if (selectedRole !== 'all') filtered = filtered.filter(u => u.role === selectedRole);
			if (selectedStatus !== 'all') filtered = filtered.filter(u => u.status === selectedStatus);
			if (searchQuery) {
				filtered = filtered.filter(u => 
					u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
					u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
					u.employeeId.toLowerCase().includes(searchQuery.toLowerCase())
				);
			}
			return filtered.length;
		})()
	});

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

	const totalPages = () => Math.ceil(filteredUsers.length / itemsPerPage);
	const paginatedUsers = () => filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

	// Functions
	const filterUsers = () => {
		let filtered = users;

		// Filter by tab
		switch (currentTab) {
			case 'frontline':
				filtered = filtered.filter(u => u.role === 'Frontline' && u.status === 'Active');
				break;
			case 'support':
				filtered = filtered.filter(u => u.role === 'Support' && u.status === 'Active');
				break;
			case 'supervisor':
				filtered = filtered.filter(u => u.role === 'Supervisor' && u.status === 'Active');
				break;
			case 'manager':
				filtered = filtered.filter(u => u.role === 'Manager' && u.status === 'Active');
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
			case 'first-time':
				filtered = filtered.filter(u => u.status === 'First-time');
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

	const handleSort = (column: string) => {
		if (sortColumn === column) {
			// Three-state toggle: asc → desc → reset
			if (sortDirection === 'asc') {
				sortDirection = 'desc';
			} else if (sortDirection === 'desc') {
				// Reset sorting
				sortColumn = '';
				sortDirection = 'asc';
				filterUsers(); // Re-filter to get original order
				return;
			}
		} else {
			// New column, default to ascending
			sortColumn = column;
			sortDirection = 'asc';
		}
		
		// Sort filteredUsers
		filteredUsers.sort((a, b) => {
			let aValue: string | number;
			let bValue: string | number;
			
			switch (column) {
				case 'employeeId':
					aValue = a.employeeId;
					bValue = b.employeeId;
					break;
				case 'name':
					aValue = a.name;
					bValue = b.name;
					break;
				case 'email':
					aValue = a.email;
					bValue = b.email;
					break;
				case 'ou':
					aValue = a.ou;
					bValue = b.ou;
					break;
				case 'role':
					// Custom role hierarchy for sorting
					const roleOrder = { 'Admin': 5, 'Manager': 4, 'Supervisor': 3, 'Support': 2, 'Frontline': 1 };
					aValue = roleOrder[a.role as keyof typeof roleOrder] || 0;
					bValue = roleOrder[b.role as keyof typeof roleOrder] || 0;
					break;
				case 'status':
					aValue = a.status;
					bValue = b.status;
					break;
				default:
					return 0;
			}
			
			if (typeof aValue === 'string' && typeof bValue === 'string') {
				const comparison = aValue.localeCompare(bValue);
				return sortDirection === 'asc' ? comparison : -comparison;
			} else if (typeof aValue === 'number' && typeof bValue === 'number') {
				const comparison = aValue - bValue;
				return sortDirection === 'asc' ? comparison : -comparison;
			}
			
			return 0;
		});
	};

	// Helper function to get sort icon
	const getSortIcon = (column: string) => {
		if (sortColumn !== column) return ArrowUpDown;
		return sortDirection === 'asc' ? ArrowUp : ArrowDown;
	};

	const changeTab = (tab: string) => {
		currentTab = tab;
		// Clear selections when switching tabs
		selectedRows = new Set();
		selectAll = false;
		lastSelectedIndex = -1;
		// Reset sorting when switching tabs
		sortColumn = '';
		sortDirection = 'asc';
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

		// Auto-assign manager for Frontline/Support based on supervisor selection
		let finalManagerId = individualForm.managerId;
		if ((individualForm.role === 'Frontline' || individualForm.role === 'Support') && individualForm.supervisorId) {
			const supervisor = getUserById(individualForm.supervisorId);
			if (supervisor && supervisor.managerId) {
				finalManagerId = supervisor.managerId;
			}
		}

		const newUser: UserData = {
			id: Date.now().toString(),
			employeeId: individualForm.employeeId,
			name: individualForm.name,
			email: individualForm.email,
			ou: isAdmin ? 'N/A' : individualForm.ou,
			role: individualForm.role,
			status: 'Active',
			type: individualForm.role === 'Admin' ? 'admin' : 'user',
			supervisorId: individualForm.supervisorId || undefined,
			managerId: finalManagerId || undefined
		};

		users = [...users, newUser];
		filterUsers();
		
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

		alert('Four template files have been downloaded:\n• frontline_support_template.csv\n• supervisor_template.csv\n• manager_template.csv\n• admin_template.csv');
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

		// Auto-assign manager for Frontline/Support based on supervisor selection
		let finalManagerId = editForm.managerId;
		if ((editForm.role === 'Frontline' || editForm.role === 'Support') && editForm.supervisorId) {
			const supervisor = getUserById(editForm.supervisorId);
			if (supervisor && supervisor.managerId) {
				finalManagerId = supervisor.managerId;
			}
		}

		const updatedUsers = users.map(u => 
			u.id === selectedUser!.id ? { 
				...u, 
				name: editForm.name,
				email: editForm.email,
				ou: isAdmin ? u.ou : editForm.ou, // Keep existing OU for admin users
				role: isAdmin ? u.role : editForm.role, // Keep existing role for admin users
				type: (isAdmin ? 'admin' : (editForm.role === 'Admin' ? 'admin' : 'user')) as 'admin' | 'user',
				supervisorId: isAdmin ? undefined : (editForm.supervisorId || undefined),
				managerId: isAdmin ? undefined : (finalManagerId || undefined)
			} : u
		);
		users = updatedUsers;
		filterUsers();
		showEditUserModal = false;
		selectedUser = null;
		alert('User updated successfully!');
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

	const changePassword = () => {
		if (!validatePassword()) return;
		
		// In a real app, this would make an API call
		alert(`Password changed successfully for ${selectedUser?.name}${passwordForm.requirePasswordChange ? '. User will be required to change password on next login.' : ''}`);
		resetPasswordForm();
		showPasswordSection = false;
	};

	const sendPasswordReset = () => {
		if (!selectedUser) return;
		
		// In a real app, this would send a password reset email
		alert(`Password reset email sent to ${selectedUser.email}`);
	};

	const confirmAction = (user: UserData, action: string) => {
		selectedUser = user;
		confirmationAction = action;
		showConfirmationModal = true;
	};

	const showTeamInfo = (user: UserData) => {
		teamModalUser = user;
		currentTeamView = user;
		selectedSupervisorView = null; // Reset supervisor view
		teamViewStack = [user]; // Initialize with the root user
		showTeamModal = true;
	};

	// Team navigation functions
	const navigateToSupervisor = (supervisor: UserData) => {
		selectedSupervisorView = supervisor;
		// Don't change currentTeamView, keep the manager as the main view
	};

	const navigateBack = () => {
		selectedSupervisorView = null; // Go back to manager's overview
	};

	const resetToRootView = () => {
		selectedSupervisorView = null;
		if (teamModalUser) {
			currentTeamView = teamModalUser;
		}
	};

	// Get direct supervisors under a manager
	const getDirectSupervisors = (managerId: string) => {
		return users.filter(u => u.managerId === managerId && u.role === 'Supervisor' && u.status === 'Active');
	};

	// Get team members under a supervisor
	const getSupervisorTeam = (supervisorId: string) => {
		return users.filter(u => u.supervisorId === supervisorId && (u.role === 'Frontline' || u.role === 'Support') && u.status === 'Active');
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
			case 'bulk-lock':
				bulkLockUsers();
				break;
			case 'bulk-deactivate':
				bulkDeactivateUsers();
				break;
			case 'bulk-unlock':
				bulkUnlockUsers();
				break;
			case 'bulk-reactivate':
				bulkReactivateUsers();
				break;
		}
		
		showConfirmationModal = false;
		selectedUser = null;
		confirmationAction = '';
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

	const bulkLockUsers = () => {
		const selectedCount = selectedRows.size;
		const updatedUsers = users.map(u => 
			selectedRows.has(u.id) ? { ...u, status: 'Locked' } : u
		);
		users = updatedUsers;
		filterUsers();
		selectedRows = new Set();
		selectAll = false;
		alert(`${selectedCount} users have been locked successfully!`);
	};

	const bulkDeactivateUsers = () => {
		const selectedCount = selectedRows.size;
		const updatedUsers = users.map(u => 
			selectedRows.has(u.id) ? { ...u, status: 'Deactivated' } : u
		);
		users = updatedUsers;
		filterUsers();
		selectedRows = new Set();
		selectAll = false;
		alert(`${selectedCount} users have been deactivated successfully!`);
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

	const bulkUnlockUsers = () => {
		const selectedCount = selectedRows.size;
		const updatedUsers = users.map(u => 
			selectedRows.has(u.id) ? { ...u, status: 'Active' } : u
		);
		users = updatedUsers;
		filterUsers();
		selectedRows = new Set();
		selectAll = false;
		alert(`${selectedCount} users have been unlocked successfully!`);
	};

	const bulkReactivateUsers = () => {
		const selectedCount = selectedRows.size;
		const updatedUsers = users.map(u => 
			selectedRows.has(u.id) ? { ...u, status: 'Active' } : u
		);
		users = updatedUsers;
		filterUsers();
		selectedRows = new Set();
		selectAll = false;
		alert(`${selectedCount} users have been reactivated successfully!`);
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

	// Reactive effect to filter users when dropdown selections change
	$effect(() => {
		// This effect runs whenever selectedOU, selectedRole, selectedStatus, or searchQuery changes
		selectedOU; selectedRole; selectedStatus; searchQuery;
		filterUsers();
	});
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
										class="flex items-center space-x-1 bg-orange-100 text-orange-700 hover:bg-orange-200 px-2.5 py-1 rounded-md transition-colors text-sm font-medium"
										title="Lock selected users"
									>
										<Shield class="w-3.5 h-3.5" />
										<span>Lock</span>
									</button>
									<button
										onclick={() => confirmBulkDeactivateUsers()}
										class="flex items-center space-x-1 bg-red-100 text-red-700 hover:bg-red-200 px-2.5 py-1 rounded-md transition-colors text-sm font-medium"
										title="Deactivate selected users"
									>
										<X class="w-3.5 h-3.5" />
										<span>Deactivate</span>
									</button>
								{/if}
							</div>
						</div>
					</div>
				{/if}

				<!-- Table -->
				<div class="w-full overflow-x-auto flex-1 min-h-0">
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
							{#each paginatedUsers() as user, index (user.id)}
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

					{#if selectedUser.type !== 'admin'}
						{#if editForm.role === 'Frontline' || editForm.role === 'Support'}
							<div>
								<label for="editSupervisor" class="block text-sm font-medium text-gray-700 mb-2">Supervisor</label>
								<select
									id="editSupervisor"
									bind:value={editForm.supervisorId}
									class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent"
								>
									<option value="">Select Supervisor</option>
									{#each users.filter((u: UserData) => u.role === 'Supervisor') as supervisor}
										<option value={supervisor.id}>{supervisor.name}</option>
									{/each}
								</select>
							</div>

							{#if editForm.supervisorId}
								{#key editForm.supervisorId}
									{@const selectedSupervisor = getUserById(editForm.supervisorId)}
									{#if selectedSupervisor && selectedSupervisor.managerId}
										<div>
											<label class="block text-sm font-medium text-gray-700 mb-2">Manager</label>
											<div class="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg text-gray-700">
												{getManagerName(selectedSupervisor.managerId)}
											</div>
										</div>
									{/if}
								{/key}
							{/if}
						{:else if editForm.role === 'Supervisor'}
							<div>
								<label for="editManager" class="block text-sm font-medium text-gray-700 mb-2">Manager</label>
								<select
									id="editManager"
									bind:value={editForm.managerId}
									class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent"
								>
									<option value="">Select Manager</option>
									{#each users.filter((u: UserData) => u.role === 'Manager') as manager}
										<option value={manager.id}>{manager.name}</option>
									{/each}
								</select>
							</div>
						{/if}
					{/if}

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
									onclick={sendPasswordReset}
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
										class="flex-1 px-4 py-2 bg-gradient-to-r from-[#01c0a4] to-[#00a085] text-white rounded-lg hover:shadow-lg hover:shadow-[#01c0a4]/25 transition-all duration-200 text-sm font-medium"
									>
										Update Password
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
		onCancel={() => { showConfirmationModal = false; selectedUser = null; confirmationAction = ''; }}
	/>
{/if}

<!-- Team Modal -->
{#if showTeamModal && teamModalUser}
	<div 
		class="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50" 
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={() => showTeamModal = false}
		onkeydown={(e) => e.key === 'Escape' && (showTeamModal = false)}
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
				{#if selectedSupervisorView}
					<!-- Supervisor's Team View -->
					{@const supervisorTeam = getSupervisorTeam(selectedSupervisorView.id)}
					
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
					{@const supervisorTeam = getSupervisorTeam(teamModalUser.id)}
					
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
					{@const directSupervisors = getDirectSupervisors(teamModalUser.id)}
					
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
									{directSupervisors.reduce((total, sup) => total + getSupervisorTeam(sup.id).length, 0)}
								</div>
								<div class="text-xs text-gray-600">Team Members</div>
							</div>
							<div class="bg-white rounded p-3">
								<div class="text-2xl font-bold text-purple-600">
									{directSupervisors.length + directSupervisors.reduce((total, sup) => total + getSupervisorTeam(sup.id).length, 0) + 1}
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
									{@const supervisorTeamCount = getSupervisorTeam(supervisor.id).length}
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
					onclick={() => showTeamModal = false}
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

						{#if individualForm.role === 'Frontline' || individualForm.role === 'Support'}
							<div>
								<label for="supervisor" class="block text-sm font-medium text-gray-700 mb-2">Supervisor</label>
								<select
									id="supervisor"
									bind:value={individualForm.supervisorId}
									class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent"
								>
									<option value="">Select Supervisor</option>
									{#each users.filter((u: UserData) => u.role === 'Supervisor') as supervisor}
										<option value={supervisor.id}>{supervisor.name}</option>
									{/each}
								</select>
							</div>

							{#if individualForm.supervisorId}
								{#key individualForm.supervisorId}
									{@const selectedSupervisor = getUserById(individualForm.supervisorId)}
									{#if selectedSupervisor && selectedSupervisor.managerId}
										<div>
											<label class="block text-sm font-medium text-gray-700 mb-2">Manager</label>
											<div class="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg text-gray-700">
												{getManagerName(selectedSupervisor.managerId)}
											</div>
										</div>
									{/if}
								{/key}
							{/if}
						{:else if individualForm.role === 'Supervisor'}
							<div>
								<label for="manager" class="block text-sm font-medium text-gray-700 mb-2">Manager</label>
								<select
									id="manager"
									bind:value={individualForm.managerId}
									class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent"
								>
									<option value="">Select Manager</option>
									{#each users.filter((u: UserData) => u.role === 'Manager') as manager}
										<option value={manager.id}>{manager.name}</option>
									{/each}
								</select>
							</div>
						{/if}
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
									<span>Download Templates</span>
								</button>
							</div>
							<div class="text-sm text-gray-600 mb-4 space-y-2">
								<p class="font-medium">Three template files will be downloaded:</p>
								<div class="text-left max-w-md mx-auto space-y-1">
									<p><strong>• Frontline/Support:</strong> Includes Supervisor Name and Manager Name columns</p>
									<p><strong>• Supervisor:</strong> Includes Manager Name column</p>
									<p><strong>• Manager:</strong> Basic user information only</p>
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
						class="px-6 py-3 bg-gradient-to-r from-[#01c0a4] to-[#00a085] text-white rounded-lg hover:shadow-lg hover:shadow-[#01c0a4]/25 transition-all duration-200"
					>
						Add {bulkData.valid.length} Valid Users
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}

</div>
