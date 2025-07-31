<script lang="ts">
	import { goto } from '$app/navigation';
	
	const dashboardHandleLogout = () => {
		goto('/login');
	};
</script>

<svelte:head>
	<title>Dashboard</title>
</svelte:head>

<div class="dashboard-container">
	<div class="dashboard-header">
		<h1 class="dashboard-title">Welcome to Dashboard</h1>
		<button onclick={dashboardHandleLogout} class="dashboard-logout-btn">
			Logout
		</button>
	</div>
	
	<div class="dashboard-content">
		<p class="dashboard-message">You have successfully logged in!</p>
		
		<div class="dashboard-navigation">
			<h2 class="dashboard-nav-title">Test Navigation:</h2>
			<div class="dashboard-nav-buttons">
				<button onclick={() => goto('/otp')} class="dashboard-nav-btn">
					Test OTP Page
				</button>
				<button onclick={() => goto('/first-time')} class="dashboard-nav-btn">
					Test First Time Setup
				</button>
				<button onclick={() => goto('/forgot-password')} class="dashboard-nav-btn">
					Test Forgot Password
				</button>
				<button onclick={() => goto('/security-question')} class="dashboard-nav-btn">
					Test Security Question
				</button>
				<button onclick={() => goto('/change-password')} class="dashboard-nav-btn">
					Test Change Password
				</button>
			</div>
		</div>
	</div>
</div>

<style>
	.dashboard-container {
		@apply min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50 p-8;
	}
	
	.dashboard-header {
		@apply flex justify-between items-center mb-8;
	}
	
	.dashboard-title {
		@apply text-3xl font-bold text-gray-800;
	}
	
	.dashboard-logout-btn {
		@apply bg-red-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors;
	}
	
	.dashboard-content {
		@apply bg-white rounded-2xl shadow-lg p-8;
	}
	
	.dashboard-message {
		@apply text-lg text-gray-600 mb-8;
	}
	
	.dashboard-navigation {
		@apply space-y-4;
	}
	
	.dashboard-nav-title {
		@apply text-xl font-semibold text-gray-800 mb-4;
	}
	
	.dashboard-nav-buttons {
		@apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4;
	}
	
	.dashboard-nav-btn {
		@apply bg-[#01c0a4] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#00a085] transition-colors;
	}
</style>
