<script lang="ts">
	import { goto } from '$app/navigation';
	import { Eye, EyeOff } from 'lucide-svelte';
	
	interface LoginFormProps {
		loginUsername: string;
		loginPassword: string;
		loginShowPassword: boolean;
		onSubmit: (event: Event) => void;
		onTogglePassword: () => void;
		onForgotPassword: () => void;
	}
	
	let {
		loginUsername = $bindable(),
		loginPassword = $bindable(),
		loginShowPassword = $bindable(),
		onSubmit,
		onTogglePassword,
		onForgotPassword
	}: LoginFormProps = $props();
</script>

<form onsubmit={onSubmit} class="space-y-6">
	<!-- Email field -->
	<div class="space-y-2">
		<label for="loginUsername" class="block text-sm font-semibold text-gray-700">
			Username
		</label>
		<div class="relative">
			<input
				id="loginUsername"
				type="email"
				bind:value={loginUsername}
				placeholder="you@company.com"
				required
				class="w-full px-4 py-3 bg-gray-50/50 border-2 border-gray-200 rounded-xl focus:border-[#01c0a4] focus:bg-white focus:outline-none transition-all duration-200 placeholder-gray-400"
			/>
		</div>
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
				placeholder="Enter your password"
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
		class="w-full bg-gradient-to-r from-[#01c0a4] to-[#00a085] text-white font-semibold py-3 px-6 rounded-xl hover:shadow-lg hover:shadow-[#01c0a4]/25 focus:outline-none focus:ring-4 focus:ring-[#01c0a4]/20 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
	>
		<span>Sign in to your workspace</span>
	</button>
</form>

