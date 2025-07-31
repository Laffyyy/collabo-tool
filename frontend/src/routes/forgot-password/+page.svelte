<script lang="ts">
	import { goto } from '$app/navigation';
	
	let forgotPasswordEmail = $state('');
	let forgotPasswordIsLoading = $state(false);
	let forgotPasswordError = $state('');
	let forgotPasswordShowModal = true;
	
	const forgotPasswordValidateEmail = (email: string) => {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	};
	
	const forgotPasswordHandleSubmit = async () => {
		if (!forgotPasswordValidateEmail(forgotPasswordEmail)) {
			forgotPasswordError = 'Please enter a valid email address';
			return;
		}
		
		forgotPasswordIsLoading = true;
		forgotPasswordError = '';
		
		// Simulate API call
		await new Promise(resolve => setTimeout(resolve, 1500));
		
		// Go to security questions for verification
		goto('/security-question');
	};
	
	const forgotPasswordHandleCancel = () => {
		goto('/login');
	};
	
	const forgotPasswordHandleKeydown = (event: KeyboardEvent) => {
		if (event.key === 'Enter') {
			forgotPasswordHandleSubmit();
		}
		if (event.key === 'Escape') {
			forgotPasswordHandleCancel();
		}
	};
</script>

<svelte:head>
	<title>Forgot Password</title>
</svelte:head>

<svelte:window onkeydown={forgotPasswordHandleKeydown} />

<div class="forgotpassword-container">
	{#if forgotPasswordShowModal}
		<div class="forgotpassword-modal-overlay">
			<div class="forgotpassword-modal">
				<div class="forgotpassword-header">
					<h2 class="forgotpassword-title">Reset Password</h2>
					<p class="forgotpassword-subtitle">Enter your registered email address</p>
				</div>
				
				<div class="forgotpassword-form">
					{#if forgotPasswordError}
						<div class="forgotpassword-error">
							{forgotPasswordError}
						</div>
					{/if}
					
					<div class="forgotpassword-field">
						<label class="forgotpassword-label" for="email">Email Address</label>
						<input
							type="email"
							bind:value={forgotPasswordEmail}
							class="forgotpassword-input"
							id="email"
							placeholder="Enter your email"
							disabled={forgotPasswordIsLoading}
						/>
					</div>
					
					<div class="forgotpassword-actions">
						<button
							onclick={forgotPasswordHandleSubmit}
							disabled={forgotPasswordIsLoading || !forgotPasswordEmail.trim()}
							class="forgotpassword-submit-btn"
						>
							{forgotPasswordIsLoading ? 'Sending...' : 'Send Reset Code'}
						</button>
						
						<button
							onclick={forgotPasswordHandleCancel}
							class="forgotpassword-cancel-btn"
							disabled={forgotPasswordIsLoading}
						>
							Cancel
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.forgotpassword-container {
		min-height: 100vh;
		background: linear-gradient(to bottom right, #f8fafc, #ffffff, #f0fdfa);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}
	
	.forgotpassword-modal-overlay {
		position: fixed;
		inset: 0;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 50;
	}
	
	.forgotpassword-modal {
		background-color: white;
		border-radius: 1rem;
		padding: 2rem;
		max-width: 28rem;
		width: 100%;
		margin: 1rem;
	}
	
	.forgotpassword-header {
		text-align: center;
		margin-bottom: 1.5rem;
	}
	
	.forgotpassword-title {
		font-size: 1.25rem;
		line-height: 1.75rem;
		font-weight: 700;
		color: #1f2937;
		margin-bottom: 0.5rem;
	}
	
	.forgotpassword-subtitle {
		color: #4b5563;
	}
	
	.forgotpassword-error {
		background-color: #fef2f2;
		border: 1px solid #fecaca;
		color: #b91c1c;
		padding: 1rem;
		border-radius: 0.75rem;
		font-size: 0.875rem;
		line-height: 1.25rem;
		margin-bottom: 1rem;
	}
	
	.forgotpassword-field {
		margin-bottom: 1.5rem;
	}
	
	.forgotpassword-label {
		display: block;
		font-size: 0.875rem;
		line-height: 1.25rem;
		font-weight: 500;
		color: #374151;
		margin-bottom: 0.5rem;
	}
	
	.forgotpassword-input {
		width: 100%;
		padding: 0.75rem 1rem;
		border: 2px solid #d1d5db;
		border-radius: 0.75rem;
		transition: border-color 0.2s;
	}
	
	.forgotpassword-input:focus {
		border-color: #01c0a4;
		outline: none;
	}
	
	.forgotpassword-input:disabled {
		opacity: 0.5;
	}
	
	.forgotpassword-actions {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	
	.forgotpassword-submit-btn {
		background-color: #01c0a4;
		color: white;
		padding: 0.75rem 1.5rem;
		border-radius: 0.75rem;
		font-weight: 500;
		border: none;
		cursor: pointer;
		transition: background-color 0.2s;
	}
	
	.forgotpassword-submit-btn:hover:not(:disabled) {
		background-color: #00a085;
	}
	
	.forgotpassword-submit-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	
	.forgotpassword-cancel-btn {
		border: 1px solid #d1d5db;
		color: #374151;
		background-color: white;
		padding: 0.75rem 1.5rem;
		border-radius: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}
	
	.forgotpassword-cancel-btn:hover:not(:disabled) {
		background-color: #f9fafb;
	}
	
	.forgotpassword-cancel-btn:disabled {
		opacity: 0.5;
	}
</style>
