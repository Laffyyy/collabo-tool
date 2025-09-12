<script lang="ts">
	import { goto } from '$app/navigation';
	import { Eye, EyeOff } from 'lucide-svelte';
	import { onMount } from 'svelte';
	
	interface LoginFormProps {
		loginUsername: string;
		loginPassword: string;
		loginShowPassword: boolean;
		 isLoading: boolean;
        error?: string;
		onSubmit: (event: Event) => void;
		onTogglePassword: () => void;
		onForgotPassword: () => void;
	}
	
	let {
		loginUsername = $bindable(),
		loginPassword = $bindable(),
		loginShowPassword = $bindable(),
		isLoading = false,
		error = '',
		onSubmit,
		onTogglePassword,
		onForgotPassword
	}: LoginFormProps = $props();
	
	let loginUsernameInput: HTMLInputElement | undefined;
	let loginEmailError = $state('');
	
	onMount(() => {
		// Auto-focus the email input
		if (loginUsernameInput) {
			loginUsernameInput.focus();
		}
	});
	
	const loginValidateEmailInput = (value: string): string => {
		// Only allow alphanumeric characters and specified symbols: @ _ - .
		const filteredValue = value.replace(/[^a-zA-Z0-9@_.-]/g, '');
		// Strictly limit to 30 characters max
		return filteredValue.slice(0, 30);
	};
	
	const loginValidateEmailFormat = (email: string): string => {
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
	
	const loginHandleEmailInput = (event: Event) => {
		const target = event.target as HTMLInputElement;
		const filteredValue = loginValidateEmailInput(target.value);
		loginUsername = filteredValue;
		
		// Update the input value if it was filtered
		if (target.value !== filteredValue) {
			target.value = filteredValue;
		}
		
		// Validate email format
		loginEmailError = loginValidateEmailFormat(filteredValue);
	};
	
	const loginHandleEmailPaste = (event: ClipboardEvent) => {
		event.preventDefault();
		const pastedText = event.clipboardData?.getData('text') || '';
		const target = event.target as HTMLInputElement;
		const filteredText = loginValidateEmailInput(pastedText);
		
		loginUsername = filteredText;
		target.value = filteredText;
		
		// Validate email format
		loginEmailError = loginValidateEmailFormat(filteredText);
	};
	
	const loginValidatePasswordInput = (value: string): string => {
		// Only allow alphanumeric characters and specified symbols: ! @ - _ .
		const filteredValue = value.replace(/[^a-zA-Z0-9!@_.-]/g, '');
		// Strictly limit to 20 characters max
		return filteredValue.slice(0, 20);
	};
	
	const loginHandlePasswordInput = (event: Event) => {
		const target = event.target as HTMLInputElement;
		const filteredValue = loginValidatePasswordInput(target.value);
		loginPassword = filteredValue;
		// Update the input value if it was filtered
		if (target.value !== filteredValue) {
			target.value = filteredValue;
		}
	};
	
	const loginHandlePasswordPaste = (event: ClipboardEvent) => {
		event.preventDefault();
		const pastedText = event.clipboardData?.getData('text') || '';
		const target = event.target as HTMLInputElement;
		const filteredText = loginValidatePasswordInput(pastedText);
		
		loginPassword = filteredText;
		target.value = filteredText;
	};
</script>

<form onsubmit={onSubmit} class="space-y-6">
	<!-- Email field -->
	<div class="space-y-2">
		<label for="loginUsername" class="block text-sm font-semibold text-gray-700">
			Username
		</label>
		<div class="relative">
			<input
				bind:this={loginUsernameInput}
				id="loginUsername"
				type="email"
				bind:value={loginUsername}
				oninput={loginHandleEmailInput}
				onpaste={loginHandleEmailPaste}
				placeholder="you@company.com"
				maxlength="30"
				required
				class="w-full px-4 py-3 bg-gray-50/50 border-2 {loginEmailError ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-[#01c0a4]'} rounded-xl focus:bg-white focus:outline-none transition-all duration-200 placeholder-gray-400"
			/>
		</div>
		{#if loginEmailError}
			<p class="text-sm text-red-600 mt-1">{loginEmailError}</p>
		{/if}
	</div>
	
	<!-- Password field -->
	<div class="space-y-2">
		<label for="loginPassword" class="block text-sm font-semibold text-gray-700">
			Password
		</label>
		<div class="relative">
			<input
				id="loginPassword"
				type={loginShowPassword ? 'text' : 'password'}
				bind:value={loginPassword}
				oninput={loginHandlePasswordInput}
				onpaste={loginHandlePasswordPaste}
				placeholder="Enter your password"
				maxlength="20"
				required
				class="w-full px-4 py-3 pr-12 bg-gray-50/50 border-2 border-gray-200 rounded-xl focus:border-[#01c0a4] focus:bg-white focus:outline-none transition-all duration-200 placeholder-gray-400"
			/>
			<button
				type="button"
				onclick={onTogglePassword}
				class="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-[#01c0a4] transition-colors duration-200"
			>
				{#if loginShowPassword}
					<EyeOff class="w-5 h-5" />
				{:else}
					<Eye class="w-5 h-5" />
				{/if}
			</button>
		</div>
	</div>
	
	<!-- Forgot password link -->
	<div class="text-right">
		<button type="button" class="text-sm font-medium text-[#01c0a4] hover:text-[#00a085] transition-colors duration-200 hover:underline bg-transparent border-none cursor-pointer" onclick={onForgotPassword}>
			Forgot your password?
		</button>
	</div>
	
	<!-- Submit button -->
	<button
    type="submit"
    disabled={isLoading}
    class="w-full bg-gradient-to-r from-[#01c0a4] to-[#00a085] text-white font-semibold py-3 px-6 rounded-xl hover:shadow-lg hover:shadow-[#01c0a4]/25 focus:outline-none focus:ring-4 focus:ring-[#01c0a4]/20 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-none"
>
    <span class="flex items-center justify-center">
        {#if isLoading}
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Logging in...
        {:else}
            Log in to your workspace
        {/if}
    </span>
</button>
</form>

