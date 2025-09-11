<script lang="ts">
	import { Users, Building2, MessageSquare, Radio, Globe, FileText, BarChart3, Shield, Activity, User } from 'lucide-svelte';
	import { authStore } from '$lib/stores/auth.svelte';
	import { goto } from '$app/navigation';
	
	// Get current user from auth store
	let user = $derived($authStore?.user);
	
	const adminModules = [
		{
			name: 'User Management',
			description: 'Manage user accounts, roles, and permissions',
			icon: Users,
			path: '/admin/user-management',
			color: 'bg-blue-500'
		},
		{
			name: 'OU Management',
			description: 'Organizational unit structure and hierarchy',
			icon: Building2,
			path: '/admin/ou-management',
			color: 'bg-green-500'
		},
		{
			name: 'Chat Management',
			description: 'Monitor and manage chat communications',
			icon: MessageSquare,
			path: '/admin/chat-management',
			color: 'bg-purple-500'
		},
		{
			name: 'Broadcast Management',
			description: 'Control system-wide messaging and alerts',
			icon: Radio,
			path: '/admin/broadcast-management',
			color: 'bg-orange-500'
		},
		{
			name: 'Global Configuration',
			description: 'System-wide settings and policies',
			icon: Globe,
			path: '/admin/global-configuration',
			color: 'bg-indigo-500'
		},
		{
			name: 'Admin Logs',
			description: 'View administrative actions and audit trail',
			icon: FileText,
			path: '/admin/admin-logs',
			color: 'bg-red-500'
		}
	];
	
	const navigateToModule = (path: string) => {
		goto(path);
	};
</script>

<svelte:head>
	<title>Admin Dashboard - Collaby</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<div class="bg-white shadow-sm border-b border-gray-200">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex justify-between items-center py-6">
				<div class="flex items-center space-x-4">
					<div class="flex items-center justify-center w-12 h-12 bg-[#01c0a4] rounded-xl">
						<Shield class="w-6 h-6 text-white" />
					</div>
					<div>
						<h1 class="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
						<p class="text-sm text-gray-500">System administration and management</p>
					</div>
				</div>
				<div class="flex items-center space-x-3">
					<div class="text-right">
						<p class="text-sm font-medium text-gray-900">
							{user?.firstName} {user?.lastName}
						</p>
						<p class="text-xs text-gray-500 capitalize">{user?.role}</p>
					</div>
					<div class="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
						<User class="w-5 h-5 text-gray-600" />
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Main Content -->
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<!-- Welcome Section -->
		<div class="bg-gradient-to-r from-[#01c0a4] to-[#00a085] rounded-2xl p-8 mb-8 text-white">
			<div class="flex items-center justify-between">
				<div>
					<h2 class="text-3xl font-bold mb-2">Welcome back, {user?.firstName}!</h2>
					<p class="text-[#01c0a4]/80 text-lg">Manage your organization's collaboration platform</p>
				</div>
				<div class="hidden md:block">
					<Activity class="w-24 h-24 text-white/20" />
				</div>
			</div>
		</div>

		<!-- Quick Stats -->
		<div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
			<div class="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-gray-600">Total Users</p>
						<p class="text-2xl font-bold text-gray-900">248</p>
					</div>
					<div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
						<Users class="w-6 h-6 text-blue-600" />
					</div>
				</div>
			</div>
			
			<div class="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-gray-600">Active Chats</p>
						<p class="text-2xl font-bold text-gray-900">156</p>
					</div>
					<div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
						<MessageSquare class="w-6 h-6 text-green-600" />
					</div>
				</div>
			</div>
			
			<div class="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-gray-600">Broadcasts</p>
						<p class="text-2xl font-bold text-gray-900">12</p>
					</div>
					<div class="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
						<Radio class="w-6 h-6 text-orange-600" />
					</div>
				</div>
			</div>
			
			<div class="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-gray-600">Organizations</p>
						<p class="text-2xl font-bold text-gray-900">8</p>
					</div>
					<div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
						<Building2 class="w-6 h-6 text-purple-600" />
					</div>
				</div>
			</div>
		</div>

		<!-- Admin Modules Grid -->
		<div class="mb-8">
			<h3 class="text-xl font-bold text-gray-900 mb-6">Administration Modules</h3>
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{#each adminModules as module}
					<button
						onclick={() => navigateToModule(module.path)}
						class="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all duration-200 text-left group"
					>
						<div class="flex items-start space-x-4">
							<div class="w-12 h-12 {module.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
								<svelte:component this={module.icon} class="w-6 h-6 text-white" />
							</div>
							<div class="flex-1">
								<h4 class="text-lg font-semibold text-gray-900 mb-2">{module.name}</h4>
								<p class="text-sm text-gray-600">{module.description}</p>
							</div>
						</div>
					</button>
				{/each}
			</div>
		</div>

		<!-- System Status -->
		<div class="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
			<h3 class="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div class="flex items-center space-x-3">
					<div class="w-3 h-3 bg-green-500 rounded-full"></div>
					<span class="text-sm text-gray-600">Database: Online</span>
				</div>
				<div class="flex items-center space-x-3">
					<div class="w-3 h-3 bg-green-500 rounded-full"></div>
					<span class="text-sm text-gray-600">API Server: Healthy</span>
				</div>
				<div class="flex items-center space-x-3">
					<div class="w-3 h-3 bg-yellow-500 rounded-full"></div>
					<span class="text-sm text-gray-600">Email Service: Degraded</span>
				</div>
			</div>
		</div>
	</div>
</div>
