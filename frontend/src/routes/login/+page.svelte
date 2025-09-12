<script lang="ts">
	import { goto } from '$app/navigation';
	import LoginForm from './LoginForm.svelte';
	import LoginBackground from './LoginBackground.svelte';
	import LoginHeader from './LoginHeader.svelte';
	import { onMount } from 'svelte';
	import { apiClient } from '$lib/api/client';
    import { API_CONFIG } from '$lib/api/config';
    import type { LoginResponse } from '$lib/api/types';
	
   	let loginUsername = $state('');
    let loginPassword = $state('');
    let loginShowPassword = $state(false);
    let loginIsLoading = $state(false);
    let loginError = $state('');
	
	// Forgot password modal state
	let showForgotPasswordModal = $state(false);
	let forgotPasswordEmail = $state('');
	let forgotPasswordIsLoading = $state(false);
	let forgotPasswordError = $state('');
	let forgotPasswordSuccess = $state(false);
	let forgotPasswordEmailInput: HTMLInputElement | undefined;
	
	const handleLoginSubmit = async (event: Event) => {
		event.preventDefault();
		loginIsLoading = true;
		loginError = '';
		
		console.log('Login attempt:', { username: loginUsername });
		
		try {
		// Use the API client instead of direct fetch
		const data = await apiClient.post<LoginResponse>(
			API_CONFIG.endpoints.auth.login,
			{
			username: loginUsername,
			password: loginPassword
			}
		);
		
		console.log('Login response:', data);
		
		if (data.step === 'FAILED') {
			// Show error message in form
			const errorMessage = data.message || 'Invalid Credentials';
			console.log('Login failed, showing error:', errorMessage);
			loginError = errorMessage;
			loginIsLoading = false;
			return;
		}
		
		// Store info needed for OTP verification
		localStorage.setItem('auth_userId', data.userId);
		localStorage.setItem('auth_userEmail', data.email);
		localStorage.setItem('auth_username', data.username || loginUsername);
		localStorage.setItem('auth_tempPassword', loginPassword); // For OTP resend
	
		
		// Set OTP expiry time (5 minutes from now)
		const expiryTime = Date.now() + (5 * 60 * 1000);
		localStorage.setItem('auth_otpExpiresAt', expiryTime.toString());
		
		// Navigate to OTP verification page
		goto('/otp');
		} catch (error: any) {
		console.error('Login error caught:', error);
		const errorMessage = error.message || 'Invalid Credentials';
		console.log('Setting error message:', errorMessage);
		loginError = errorMessage;
		} finally {
		loginIsLoading = false;
		}
	};
	
	const toggleLoginPasswordVisibility = () => {
		loginShowPassword = !loginShowPassword;
	};
	
	const openForgotPasswordModal = () => {
		showForgotPasswordModal = true;
		forgotPasswordEmail = '';
		forgotPasswordError = '';
		forgotPasswordSuccess = false;
		
		// Focus the email input after modal opens
		setTimeout(() => {
			if (forgotPasswordEmailInput) {
				forgotPasswordEmailInput.focus();
			}
		}, 100);
	};
	
	const closeForgotPasswordModal = () => {
		showForgotPasswordModal = false;
		forgotPasswordEmail = '';
		forgotPasswordError = '';
		forgotPasswordIsLoading = false;
		forgotPasswordSuccess = false;
	};
	
	const forgotPasswordValidateEmailInput = (value: string): string => {
		// Only allow alphanumeric characters and specified symbols: @ _ - .
		const filteredValue = value.replace(/[^a-zA-Z0-9@_.-]/g, '');
		// Strictly limit to 30 characters max
		return filteredValue.slice(0, 30);
	};
	
	const forgotPasswordValidateEmailFormat = (email: string): string => {
		if (!email) return '';
		
		// Basic email format validation
		const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
		
		if (!emailRegex.test(email)) {
			// Check specific issues
			if (!email.includes('@')) {
				return 'Email must contain @ symbol';
			}
			if (email.indexOf('@') !== email.lastIndexOf('@')) {
				return 'Email can only contain one @ symbol';
			}
			if (!email.includes('.') || email.lastIndexOf('.') < email.indexOf('@')) {
				return 'Email must contain a valid domain';
			}
			if (email.startsWith('.') || email.startsWith('@') || email.startsWith('-') || email.startsWith('_')) {
				return 'Email cannot start with special characters';
			}
			if (email.endsWith('.') || email.endsWith('@') || email.endsWith('-') || email.endsWith('_')) {
				return 'Email cannot end with special characters';
			}
			if (email.includes('..') || email.includes('@.') || email.includes('.@')) {
				return 'Email contains invalid character combinations';
			}
			return 'Please enter a valid email address';
		}
		
		return '';
	};
	
	const forgotPasswordHandleEmailInput = (event: Event) => {
		const target = event.target as HTMLInputElement;
		const filteredValue = forgotPasswordValidateEmailInput(target.value);
		forgotPasswordEmail = filteredValue;
		
		// Update the input value if it was filtered
		if (target.value !== filteredValue) {
			target.value = filteredValue;
		}
		
		// Validate email format and update error
		forgotPasswordError = forgotPasswordValidateEmailFormat(filteredValue);
	};
	
	const forgotPasswordHandleEmailPaste = (event: ClipboardEvent) => {
		event.preventDefault();
		const pastedText = event.clipboardData?.getData('text') || '';
		const target = event.target as HTMLInputElement;
		const filteredText = forgotPasswordValidateEmailInput(pastedText);
		
		forgotPasswordEmail = filteredText;
		target.value = filteredText;
		
		// Validate email format and update error
		forgotPasswordError = forgotPasswordValidateEmailFormat(filteredText);
	};
	
	const forgotPasswordValidateEmail = (email: string) => {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	};
	
	const forgotPasswordHandleSubmit = async () => {
		const emailFormatError = forgotPasswordValidateEmailFormat(forgotPasswordEmail);
		if (emailFormatError) {
			forgotPasswordError = emailFormatError;
			return;
		}
		
		if (!forgotPasswordValidateEmail(forgotPasswordEmail)) {
			forgotPasswordError = 'Please enter a valid email address';
			return;
		}
		
		forgotPasswordIsLoading = true;
		forgotPasswordError = '';
		
		// Simulate API call
		await new Promise(resolve => setTimeout(resolve, 1500));
		
		forgotPasswordIsLoading = false;
		forgotPasswordSuccess = true;
		
		// Auto-close modal after showing success message
		setTimeout(() => {
			closeForgotPasswordModal();
			goto('/security-question');
		}, 2000);
	};
	
	const forgotPasswordHandleKeydown = (event: KeyboardEvent) => {
		if (!showForgotPasswordModal) return;
		
		if (event.key === 'Enter') {
			forgotPasswordHandleSubmit();
		}
		if (event.key === 'Escape') {
			closeForgotPasswordModal();
		}
	};
</script>

<svelte:head>
	<title>Login - Private Organization Portal</title>
	<meta name="description" content="Sign in to access your workspace" />
</svelte:head>

<svelte:window onkeydown={forgotPasswordHandleKeydown} />

<div class="min-h-screen flex items-center justify-center p-4" style="background: linear-gradient(to bottom right, #f8fafc, #ffffff, #f0fdfa);">
	<LoginBackground />
	
	<div class="w-full max-w-md relative">
		<div class="rounded-3xl p-8 backdrop-blur-sm" style="background: rgba(255, 255, 255, 0.8); box-shadow: 0 20px 30px -8px rgba(20, 184, 166, 0.15), 0 8px 16px -12px rgba(20, 184, 166, 0.1);">
			<LoginHeader />
			
			<LoginForm
				bind:loginUsername
				bind:loginPassword
				bind:loginShowPassword
				isLoading={loginIsLoading}
				error={loginError}
				onSubmit={handleLoginSubmit}
				onTogglePassword={toggleLoginPasswordVisibility}
				onForgotPassword={openForgotPasswordModal}
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
	
	<!-- Forgot Password Modal -->
	{#if showForgotPasswordModal}
		<div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
			<div class="bg-white rounded-xl p-6 max-w-md w-full mx-4" style="box-shadow: 0 20px 30px -8px rgba(0, 0, 0, 0.3);">
				<div class="text-center mb-6">
					<h2 class="text-xl font-bold text-gray-800 mb-2">Reset Password</h2>
					<p class="text-gray-600">Enter your registered email address</p>
				</div>
				
				<div class="space-y-4">
					{#if forgotPasswordSuccess}
						<div class="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg text-sm text-center">
							<div class="flex items-center justify-center mb-2">
								<svg class="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
									<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
								</svg>
								<span class="font-semibold">Reset link sent!</span>
							</div>
							<p>A password reset link has been sent to your registered email address. Please check your inbox and follow the instructions.</p>
						</div>
					{:else}
						{#if forgotPasswordError}
							<div class="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
								{forgotPasswordError}
							</div>
						{/if}
						
						<div>
							<label class="block text-sm font-semibold text-gray-700 mb-2" for="forgotEmail">
								Email Address
							</label>
							<input
								bind:this={forgotPasswordEmailInput}
								type="email"
								bind:value={forgotPasswordEmail}
								oninput={forgotPasswordHandleEmailInput}
								onpaste={forgotPasswordHandleEmailPaste}
								class="w-full px-4 py-3 bg-gray-50/50 border-2 {forgotPasswordError ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-[#01c0a4]'} rounded-xl focus:bg-white focus:outline-none transition-all duration-200 placeholder-gray-400"
								id="forgotEmail"
								placeholder="Enter your email"
								maxlength="30"
								disabled={forgotPasswordIsLoading}
							/>
						</div>
						
						<div class="flex flex-row gap-3 pt-2">
							<button
								onclick={closeForgotPasswordModal}
								class="flex-1 border-2 border-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-gray-200 transition-all duration-200 cursor-pointer disabled:opacity-50"
								disabled={forgotPasswordIsLoading}
							>
								Cancel
							</button>
							
							<button
								onclick={forgotPasswordHandleSubmit}
								disabled={forgotPasswordIsLoading || !forgotPasswordEmail.trim()}
								class="flex-1 bg-gradient-to-r from-[#01c0a4] to-[#00a085] text-white font-semibold py-3 px-6 rounded-xl hover:shadow-lg hover:shadow-[#01c0a4]/25 focus:outline-none focus:ring-4 focus:ring-[#01c0a4]/20 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
							>
								{forgotPasswordIsLoading ? 'Sending...' : 'Send Reset Code'}
							</button>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>
