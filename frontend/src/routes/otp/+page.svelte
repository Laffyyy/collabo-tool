<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	
	let otpValues = $state(['', '', '', '', '', '']);
	let otpTimeLeft = $state(300); // 5 minutes in seconds
	let otpIsExpired = $state(false);
	let otpIsLoading = $state(false);
	let otpShowCancelModal = $state(false);
	let otpFromForgotPassword = $state(false);
	
	// Timer functionality
	let otpTimerInterval: ReturnType<typeof setInterval>;
	
	onMount(() => {
		// Check if coming from forgot password
		const urlParams = new URLSearchParams(window.location.search);
		otpFromForgotPassword = urlParams.get('from') === 'forgot-password';
		
		otpStartTimer();
		
		// Focus first input
		document.getElementById('otp-input-0')?.focus();
		
		return () => {
			if (otpTimerInterval) clearInterval(otpTimerInterval);
		};
	});
	
	const otpStartTimer = () => {
		if (otpTimerInterval) clearInterval(otpTimerInterval);
		otpTimerInterval = setInterval(() => {
			otpTimeLeft--;
			if (otpTimeLeft <= 0) {
				otpIsExpired = true;
				clearInterval(otpTimerInterval);
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
	
	const otpHandleResend = async () => {
		otpIsLoading = true;
		otpValues = ['', '', '', '', '', ''];
		otpTimeLeft = 300;
		otpIsExpired = false;
		
		// Simulate API call
		await new Promise(resolve => setTimeout(resolve, 1000));
		
		otpIsLoading = false;
		otpStartTimer();
		
		// Focus first input
		document.getElementById('otp-input-0')?.focus();
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
			
			<div class="otp-timer">
				{#if otpIsExpired}
					<span class="otp-timer-expired">Code expired</span>
				{:else}
					<span class="otp-timer-text">Time remaining: {otpFormatTime(otpTimeLeft)}</span>
				{/if}
			</div>
			
			<div class="otp-actions">
				<button
					onclick={otpHandleResend}
					disabled={!otpIsExpired && otpTimeLeft > 240}
					class="otp-resend-btn"
				>
					{otpIsLoading ? 'Sending...' : 'Resend Code'}
				</button>
				
				<button
					onclick={otpHandleCancel}
					class="otp-cancel-btn"
				>
					Cancel
				</button>
			</div>
		</div>
	</div>
</div>

<!-- Cancel Confirmation Modal -->
{#if otpShowCancelModal}
	<div class="otp-modal-overlay">
		<div class="otp-modal">
			<h3 class="otp-modal-title">Cancel Verification?</h3>
			<p class="otp-modal-text">Your progress will be lost. Are you sure you want to cancel?</p>
			<div class="otp-modal-actions">
				<button onclick={otpConfirmCancel} class="otp-modal-confirm">Yes, Cancel</button>
				<button onclick={() => otpShowCancelModal = false} class="otp-modal-dismiss">Continue</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.otp-container {
		min-height: 100vh;
		background: linear-gradient(to bottom right, #f8fafc, #ffffff, #f0fdfa);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}
	
	.otp-card {
		background-color: white;
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
		line-height: 2rem;
		font-weight: 700;
		color: #1f2937;
		margin-bottom: 0.5rem;
	}
	
	.otp-subtitle {
		color: #4b5563;
	}
	
	.otp-inputs {
		display: flex;
		justify-content: center;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}
	
	.otp-input {
		width: 3rem;
		height: 3rem;
		text-align: center;
		font-size: 1.25rem;
		line-height: 1.75rem;
		font-weight: 700;
		border: 2px solid #d1d5db;
		border-radius: 0.5rem;
		transition: border-color 0.2s;
	}
	
	.otp-input:focus {
		border-color: #01c0a4;
		outline: none;
	}
	
	.otp-input:disabled {
		opacity: 0.5;
	}
	
	.otp-timer {
		text-align: center;
		margin-bottom: 1.5rem;
	}
	
	.otp-timer-text {
		color: #4b5563;
	}
	
	.otp-timer-expired {
		color: #dc2626;
		font-weight: 500;
	}
	
	.otp-actions {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	
	.otp-resend-btn {
		background-color: #01c0a4;
		color: white;
		padding: 0.75rem 1.5rem;
		border-radius: 0.75rem;
		font-weight: 500;
		border: none;
		cursor: pointer;
		transition: background-color 0.2s;
	}
	
	.otp-resend-btn:hover:not(:disabled) {
		background-color: #00a085;
	}
	
	.otp-resend-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	
	.otp-cancel-btn {
		border: 1px solid #d1d5db;
		color: #374151;
		background-color: white;
		padding: 0.75rem 1.5rem;
		border-radius: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}
	
	.otp-cancel-btn:hover {
		background-color: #f9fafb;
	}
	
	.otp-modal-overlay {
		position: fixed;
		inset: 0;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 50;
	}
	
	.otp-modal {
		background-color: white;
		border-radius: 1rem;
		padding: 1.5rem;
		max-width: 24rem;
		margin: 1rem;
	}
	
	.otp-modal-title {
		font-size: 1.125rem;
		line-height: 1.75rem;
		font-weight: 700;
		color: #1f2937;
		margin-bottom: 0.5rem;
	}
	
	.otp-modal-text {
		color: #4b5563;
		margin-bottom: 1.5rem;
	}
	
	.otp-modal-actions {
		display: flex;
		gap: 0.75rem;
	}
	
	.otp-modal-confirm {
		background-color: #dc2626;
		color: white;
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		font-weight: 500;
		border: none;
		cursor: pointer;
		flex: 1;
		transition: background-color 0.2s;
	}
	
	.otp-modal-confirm:hover {
		background-color: #b91c1c;
	}
	
	.otp-modal-dismiss {
		border: 1px solid #d1d5db;
		color: #374151;
		background-color: white;
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		font-weight: 500;
		cursor: pointer;
		flex: 1;
		transition: background-color 0.2s;
	}
	
	.otp-modal-dismiss:hover {
		background-color: #f9fafb;
	}
</style>
