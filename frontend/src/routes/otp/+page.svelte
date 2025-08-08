<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	
	let otpValues = $state(['', '', '', '', '', '']);
	let otpTimeLeft = $state(300); // 5 minutes in seconds
	let otpResendTimeLeft = $state(150); // 2:30 in seconds for resend availability
	let otpIsExpired = $state(false);
	let otpIsLoading = $state(false);
	let otpShowCancelModal = $state(false);
	let otpFromForgotPassword = false;
	
	// Timer functionality
	let otpTimerInterval: ReturnType<typeof setInterval>;
	let otpResendTimerInterval: ReturnType<typeof setInterval>;
	
	onMount(() => {
		// Check if coming from forgot password
		const urlParams = new URLSearchParams(window.location.search);
		otpFromForgotPassword = urlParams.get('from') === 'forgot-password';
		
		otpStartTimers();
		
		// Focus first input
		document.getElementById('otp-input-0')?.focus();
		
		return () => {
			if (otpTimerInterval) clearInterval(otpTimerInterval);
			if (otpResendTimerInterval) clearInterval(otpResendTimerInterval);
		};
	});
	
	const otpStartTimers = () => {
		// Main OTP expiration timer
		if (otpTimerInterval) clearInterval(otpTimerInterval);
		otpTimerInterval = setInterval(() => {
			otpTimeLeft--;
			if (otpTimeLeft <= 0) {
				otpIsExpired = true;
				clearInterval(otpTimerInterval);
			}
		}, 1000);
		
		// Resend availability timer
		if (otpResendTimerInterval) clearInterval(otpResendTimerInterval);
		otpResendTimerInterval = setInterval(() => {
			otpResendTimeLeft--;
			if (otpResendTimeLeft <= 0) {
				clearInterval(otpResendTimerInterval);
			}
		}, 1000);
	};
	
	const otpFormatTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	};
	
	const otpHandleInput = (index: number, event: Event) => {
		const target = event.target as HTMLInputElement;
		const value = target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
		
		if (value.length <= 1) {
			otpValues[index] = value;
			
			// Auto-focus next input
			if (value && index < 5) {
				const nextInput = document.getElementById(`otp-input-${index + 1}`);
				nextInput?.focus();
			}
			
			// Auto-submit when all fields are filled
			if (otpValues.every(val => val !== '')) {
				otpHandleSubmit();
			}
		}
	};
	
	const otpHandleKeydown = (index: number, event: KeyboardEvent) => {
		if (event.key === 'Backspace' && !otpValues[index] && index > 0) {
			const prevInput = document.getElementById(`otp-input-${index - 1}`);
			prevInput?.focus();
		}
		
		if (event.key === 'Enter') {
			otpHandleSubmit();
		}
		
		if (event.key === 'Escape') {
			otpShowCancelModal = true;
		}
	};
	
	const otpHandleSubmit = async () => {
		if (otpValues.every(val => val !== '') && !otpIsExpired) {
			otpIsLoading = true;
			
			// Simulate API call
			await new Promise(resolve => setTimeout(resolve, 1000));
			
			// Navigate based on source
			if (otpFromForgotPassword) {
				goto('/security-question');
			} else {
				goto('/first-time');
			}
		}
	};
	
	const otpHandleResend = () => {
		// Only allow resend if resend timer has reached zero
		if (otpResendTimeLeft > 0 || otpIsLoading) {
			return;
		}
		
		otpIsLoading = true;
		otpValues = ['', '', '', '', '', ''];
		
		// Simulate API call
		setTimeout(() => {
			otpTimeLeft = 300; // Reset to 5 minutes
			otpResendTimeLeft = 150; // Reset resend timer to 2:30
			otpIsExpired = false;
			otpIsLoading = false;
			
			// Restart timers
			otpStartTimers();
			
			// Focus first input
			document.getElementById('otp-input-0')?.focus();
		}, 1000);
	};
	
	const otpHandleCancel = () => {
		otpShowCancelModal = true;
	};
	
	const otpConfirmCancel = () => {
		goto('/login');
	};
</script>

<svelte:head>
	<title>OTP Verification</title>
</svelte:head>

<div class="otp-container">
	<div class="otp-card">
		<div class="otp-header">
			<h1 class="otp-title">Enter Verification Code</h1>
			<p class="otp-subtitle">We've sent a 6-digit code to your registered email</p>
		</div>
		
		<div class="otp-form">
			<div class="otp-inputs">
				{#each otpValues as value, index}
					<input
						id="otp-input-{index}"
						type="text"
						maxlength="1"
						bind:value={otpValues[index]}
						oninput={(e) => otpHandleInput(index, e)}
						onkeydown={(e) => otpHandleKeydown(index, e)}
						class="otp-input"
						disabled={otpIsExpired || otpIsLoading}
					/>
				{/each}
			</div>
			
			<!-- Two timers on the same row -->
			<div class="otp-timers-row">
				<div class="otp-timer-left">
					{#if otpIsExpired}
						<span class="otp-timer-expired">Code expired</span>
					{:else}
						<span class="otp-timer-text">Expires: {otpFormatTime(otpTimeLeft)}</span>
					{/if}
				</div>
				
				<div class="otp-timer-right">
					{#if otpResendTimeLeft > 0}
						<span class="otp-resend-timer">Resend in: {otpFormatTime(otpResendTimeLeft)}</span>
					{:else if otpIsLoading}
						<span class="otp-resend-loading">Sending...</span>
					{:else}
						<button 
							onclick={otpHandleResend}
							class="otp-resend-link"
						>
							Resend OTP
						</button>
					{/if}
				</div>
			</div>
			
			<!-- Cancel and Verify buttons on the same row -->
			<div class="otp-actions-row">
				<button
					onclick={otpHandleCancel}
					class="otp-cancel-btn"
					disabled={otpIsLoading}
				>
					Cancel
				</button>
				
				<button
					onclick={otpHandleSubmit}
					disabled={otpIsLoading || !otpValues.every(val => val !== '')}
					class="otp-verify-btn"
				>
					{otpIsLoading ? 'Verifying...' : 'Verify'}
				</button>
			</div>
		</div>
	</div>
</div>

<!-- Cancel Confirmation Modal -->
{#if otpShowCancelModal}
	<div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
		<div class="bg-white rounded-xl p-6 max-w-sm w-full mx-4" style="box-shadow: 0 20px 30px -8px rgba(0, 0, 0, 0.3);">
			<h3 class="text-lg font-bold text-gray-800 mb-2">Cancel Verification?</h3>
			<p class="text-gray-600 mb-6">Your progress will be lost.</p>
			<div class="flex flex-row gap-3">
				<button onclick={otpConfirmCancel} class="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 cursor-pointer">Yes</button>
				<button onclick={() => otpShowCancelModal = false} class="flex-1 border-2 border-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-xl hover:bg-gray-50 transition-all duration-200 cursor-pointer">No</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.otp-container {
		min-height: 100vh;
		background: linear-gradient(135deg, #f8fafc 0%, #ffffff 50%, #f0fdfa 100%);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}
	
	.otp-card {
		background: white;
		border-radius: 1.5rem;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
		padding: 2rem;
		width: 100%;
		max-width: 28rem;
	}
	
	.otp-header {
		text-align: center;
		margin-bottom: 2rem;
	}
	
	.otp-title {
		font-size: 1.5rem;
		font-weight: bold;
		color: #1f2937;
		margin-bottom: 0.5rem;
	}
	
	.otp-subtitle {
		color: #6b7280;
	}
	
	.otp-inputs {
		display: flex;
		justify-content: center;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}
	
	.otp-input {
		width: 3rem;
		height: 4rem;
		text-align: center;
		font-size: 1.25rem;
		font-weight: bold;
		border: 2px solid #d1d5db;
		border-radius: 0.5rem;
		outline: none;
		transition: border-color 0.2s ease;
	}
	
	.otp-input:focus {
		border-color: #01c0a4;
	}
	
	.otp-input:disabled {
		opacity: 0.5;
	}
	
	.otp-timers-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
		text-align: left;
	}
	
	.otp-timer-left {
		text-align: left;
		padding-left: 1.25rem;
	}
	
	.otp-timer-right {
		text-align: right;
		padding-right: 1.25rem;
	}
	
	.otp-timer-text {
		color: #6b7280;
		font-size: 0.875rem;
		font-weight: 500;
	}
	
	.otp-timer-expired {
		color: #dc2626;
		font-weight: 500;
		font-size: 0.875rem;
	}
	
	.otp-resend-timer {
		color: #6b7280;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: default;
	}
	
	.otp-resend-loading {
		color: #6b7280;
		font-size: 0.875rem;
		font-style: italic;
	}
	
	.otp-resend-link {
		background: transparent;
		color: #01c0a4;
		border: none;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		text-decoration: underline;
		padding: 0;
		transition: color 0.2s ease;
	}
	
	.otp-resend-link:hover {
		color: #00a085;
	}
	
	.otp-actions-row {
		display: flex;
		justify-content: space-between;
		padding: 0 0;
		margin: 0;
		gap: 1rem;
	}
	
	.otp-cancel-btn {
		border: 1px solid #d1d5db;
		color: #374151;
		background: white;
		width: 100%;
		padding: 0.75rem 0;
		margin-left: 1.25rem;
		text-align: center;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s ease;
		min-width: 6rem;
	}

	.otp-cancel-btn:hover:not(:disabled) {
		background: #f9fafb;
	}
	
	.otp-cancel-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	
	.otp-verify-btn {
		background: #01c0a4;
		color: white;
		width: 100%;
		padding: 0.75rem 0;
		margin-right: 1.25rem;
		text-align: center;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 0.75rem;
		font-weight: 500;
		border: none;
		cursor: pointer;
		transition: background-color 0.2s ease;
		min-width: 6rem;
		text-align: center;
	}
	
	.otp-verify-btn:hover:not(:disabled) {
		background: #00a085;
	}
	
	.otp-verify-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
