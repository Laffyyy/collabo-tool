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
		min-height: 100vh;
		background: linear-gradient(to bottom right, #f8fafc, #ffffff, #f0fdfa);
		padding: 2rem;
	}
	
	.dashboard-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
	}
	
	.dashboard-title {
		font-size: 1.875rem;
		line-height: 2.25rem;
		font-weight: 700;
		color: #1f2937;
	}
	
	.dashboard-logout-btn {
		background-color: #dc2626;
		color: white;
		padding: 0.5rem 1.5rem;
		border-radius: 0.5rem;
		font-weight: 500;
		border: none;
		cursor: pointer;
		transition: background-color 0.2s;
	}
	
	.dashboard-logout-btn:hover {
		background-color: #b91c1c;
	}
	
	.dashboard-content {
		background-color: white;
		border-radius: 1rem;
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
		padding: 2rem;
	}
	
	.dashboard-message {
		font-size: 1.125rem;
		line-height: 1.75rem;
		color: #4b5563;
		margin-bottom: 2rem;
	}
	
	.dashboard-navigation {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	
	.dashboard-nav-title {
		font-size: 1.25rem;
		line-height: 1.75rem;
		font-weight: 600;
		color: #1f2937;
		margin-bottom: 1rem;
	}
	
	.dashboard-nav-buttons {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}
	
	.dashboard-nav-btn {
		background-color: #01c0a4;
		color: white;
		padding: 0.75rem 1.5rem;
		border-radius: 0.5rem;
		font-weight: 500;
		border: none;
		cursor: pointer;
		transition: background-color 0.2s;
	}
	
	.dashboard-nav-btn:hover {
		background-color: #00a085;
	}
</style>
