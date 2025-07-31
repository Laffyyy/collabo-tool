<script lang="ts">
	import { goto } from '$app/navigation';
	import LoginForm from './LoginForm.svelte';
	import LoginBackground from './LoginBackground.svelte';
	import LoginHeader from './LoginHeader.svelte';
	
	let loginUsername = $state('');
	let loginPassword = $state('');
	let loginShowPassword = $state(false);
	
	const handleLoginSubmit = (event: Event) => {
		event.preventDefault();
		// Navigate to OTP page after successful login
		goto('/otp');
	};
	
	const toggleLoginPasswordVisibility = () => {
		loginShowPassword = !loginShowPassword;
	};
</script>

<svelte:head>
	<title>Login - Private Organization Portal</title>
	<meta name="description" content="Sign in to access your workspace" />
</svelte:head>

<div class="min-h-screen flex items-center justify-center p-4" style="background: linear-gradient(to bottom right, #f8fafc, #ffffff, #f0fdfa);">
	<LoginBackground />
	
	<div class="w-full max-w-md relative">
		<div class="rounded-3xl p-8 backdrop-blur-sm" style="background: rgba(255, 255, 255, 0.8); box-shadow: 0 20px 30px -8px rgba(20, 184, 166, 0.15), 0 8px 16px -12px rgba(20, 184, 166, 0.1);">
			<LoginHeader />
			
			<LoginForm
				bind:loginUsername
				bind:loginPassword
				bind:loginShowPassword
				onSubmit={handleLoginSubmit}
				onTogglePassword={toggleLoginPasswordVisibility}
			/>
		</div>
		
		<div class="text-center mt-8">
			<p class="text-sm text-gray-500">
				Having trouble signing in? 
				<button 
					class="font-medium transition-colors cursor-pointer bg-transparent border-none hover:underline text-teal-600 hover:text-teal-700" 
					onclick={() => alert('Support contact: demo only!')}
				>
					Contact IT support
				</button>
			</p>
		</div>
	</div>
</div>
