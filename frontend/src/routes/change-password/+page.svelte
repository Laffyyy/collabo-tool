<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	
	let changePasswordNew = $state('');
	let changePasswordConfirm = $state('');
	let changePasswordErrors: string[] = $state([]);
	let changePasswordValid = $state(false);
	let changePasswordsMatch = $state(false);
	let changePasswordIsLoading = $state(false);
	let changePasswordShowCancelModal = $state(false);
	let changePasswordFromForgotPassword = $state(false);
	
	onMount(() => {
		// Check if coming from forgot password flow
		const urlParams = new URLSearchParams(window.location.search);
		changePasswordFromForgotPassword = urlParams.get('from') === 'forgot-password';
	});
	
	const changePasswordValidatePassword = () => {
		const errors: string[] = [];
		
		if (changePasswordNew.length > 0) {
			if (changePasswordNew.length < 15) {
				errors.push("Password must be at least 15 characters long");
			}
			
			if (changePasswordNew.length > 20) {
				errors.push("Password must not exceed 20 characters");
			}
			
			const allowedPattern = /^[a-zA-Z0-9!@\-_&]*$/;
			if (!allowedPattern.test(changePasswordNew)) {
				errors.push("Password can only contain letters, numbers, and these symbols: ! @ - _ &");
			}
		}
		
		changePasswordErrors = errors;
		changePasswordValid = errors.length === 0 && changePasswordNew.length > 0;
	};
	
	$effect(() => {
		changePasswordValidatePassword();
	});
	
	$effect(() => {
		changePasswordsMatch = changePasswordNew === changePasswordConfirm && changePasswordConfirm !== '';
	});
	
	const changePasswordCanSubmit = () => {
		return changePasswordValid && changePasswordsMatch;
	};
	
	const changePasswordHandleSubmit = async () => {
		if (changePasswordCanSubmit()) {
			changePasswordIsLoading = true;
			
			// Simulate API call
			await new Promise(resolve => setTimeout(resolve, 2000));
			
			// Navigate based on source
			if (changePasswordFromForgotPassword) {
				goto('/login');
			} else {
				goto('/dashboard');
			}
		}
	};
	
	const changePasswordHandleCancel = () => {
		changePasswordShowCancelModal = true;
	};
	
	const changePasswordConfirmCancel = () => {
		goto('/login');
	};
	
	const changePasswordHandleKeydown = (event: KeyboardEvent) => {
		if (event.key === 'Enter') {
			changePasswordHandleSubmit();
		}
		if (event.key === 'Escape') {
			changePasswordHandleCancel();
		}
	};
</script>

<svelte:head>
	<title>Change Password</title>
</svelte:head>

<svelte:window onkeydown={changePasswordHandleKeydown} />

<div class="changepassword-container">
	<div class="changepassword-card">
		<div class="changepassword-header">
			<h1 class="changepassword-title">Change Password</h1>
			<p class="changepassword-subtitle">Create a new secure password</p>
		</div>
		
		<div class="changepassword-form">
			<div class="changepassword-field">
				<label class="changepassword-label" for="new-password">New Password</label>
				<input
					type="password"
					bind:value={changePasswordNew}
					class="changepassword-input"
					id="new-password"
					placeholder="Enter new password"
					disabled={changePasswordIsLoading}
				/>
			</div>
			
			<div class="changepassword-field">
				<label class="changepassword-label" for="confirm-password">Confirm Password</label>
				<input
					type="password"
					bind:value={changePasswordConfirm}
					class="changepassword-input"
					id="confirm-password"
					placeholder="Confirm new password"
					disabled={changePasswordIsLoading}
				/>
			</div>
			
			{#if changePasswordErrors.length > 0}
				<div class="changepassword-errors">
					{#each changePasswordErrors as error}
						<div class="changepassword-error">{error}</div>
					{/each}
				</div>
			{/if}
			
			{#if changePasswordConfirm && !changePasswordsMatch}
				<div class="changepassword-error">Passwords do not match</div>
			{/if}
			
			<div class="changepassword-password-hint">
				<p class="changepassword-hint-title">Password requirements:</p>
				<ul class="changepassword-hint-list">
					<li class={changePasswordNew.length >= 15 && changePasswordNew.length <= 20 ? 'changepassword-requirement-met' : ''}>
						15-20 characters long
					</li>
					<li class={/^[a-zA-Z0-9!@\-_&]*$/.test(changePasswordNew) && changePasswordNew.length > 0 ? 'changepassword-requirement-met' : ''}>
						Only alphanumeric characters and: ! @ - _ &
					</li>
				</ul>
			</div>
			
			<div class="changepassword-actions">
				<button
					onclick={changePasswordHandleSubmit}
					disabled={!changePasswordCanSubmit() || changePasswordIsLoading}
					class="changepassword-submit-btn"
				>
					{changePasswordIsLoading ? 'Changing Password...' : 'Change Password'}
				</button>
				
				<button
					onclick={changePasswordHandleCancel}
					class="changepassword-cancel-btn"
					disabled={changePasswordIsLoading}
				>
					Cancel
				</button>
			</div>
		</div>
	</div>
</div>

<!-- Cancel Confirmation Modal -->
{#if changePasswordShowCancelModal}
	<div class="changepassword-modal-overlay">
		<div class="changepassword-modal">
			<h3 class="changepassword-modal-title">Cancel Password Change?</h3>
			<p class="changepassword-modal-text">Your progress will be lost. Are you sure you want to cancel?</p>
			<div class="changepassword-modal-actions">
				<button onclick={changePasswordConfirmCancel} class="changepassword-modal-confirm">Yes, Cancel</button>
				<button onclick={() => changePasswordShowCancelModal = false} class="changepassword-modal-dismiss">Continue</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.changepassword-container {
		min-height: 100vh;
		background: linear-gradient(to bottom right, #f8fafc, #ffffff, #f0fdfa);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}
	
	.changepassword-card {
		background-color: white;
		border-radius: 1.5rem;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
		padding: 2rem;
		width: 100%;
		max-width: 28rem;
	}
	
	.changepassword-header {
		text-align: center;
		margin-bottom: 2rem;
	}
	
	.changepassword-title {
		font-size: 1.5rem;
		line-height: 2rem;
		font-weight: 700;
		color: #1f2937;
		margin-bottom: 0.5rem;
	}
	
	.changepassword-subtitle {
		color: #4b5563;
	}
	
	.changepassword-field {
		margin-bottom: 1rem;
	}
	
	.changepassword-label {
		display: block;
		font-size: 0.875rem;
		line-height: 1.25rem;
		font-weight: 500;
		color: #374151;
		margin-bottom: 0.5rem;
	}
	
	.changepassword-input {
		width: 100%;
		padding: 0.75rem 1rem;
		border: 2px solid #d1d5db;
		border-radius: 0.75rem;
		transition: border-color 0.2s;
	}
	
	.changepassword-input:focus {
		border-color: #01c0a4;
		outline: none;
	}
	
	.changepassword-input:disabled {
		opacity: 0.5;
	}
	
	.changepassword-errors {
		margin-bottom: 1rem;
	}
	
	.changepassword-errors > * + * {
		margin-top: 0.25rem;
	}
	
	.changepassword-error {
		color: #dc2626;
		font-size: 0.875rem;
		line-height: 1.25rem;
	}
	
	.changepassword-password-hint {
		background-color: #dbeafe;
		border: 1px solid #bfdbfe;
		border-radius: 0.5rem;
		padding: 0.75rem;
		font-size: 0.75rem;
		line-height: 1rem;
		margin-bottom: 1.5rem;
	}
	
	.changepassword-hint-title {
		font-weight: 500;
		color: #1e40af;
		margin-bottom: 0.5rem;
	}
	
	.changepassword-hint-list {
		color: #1d4ed8;
		margin-left: 1rem;
		list-style-type: disc;
	}
	
	.changepassword-hint-list > * + * {
		margin-top: 0.25rem;
	}
	
	.changepassword-requirement-met {
		color: #059669;
		font-weight: 500;
	}
	
	.changepassword-actions {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	
	.changepassword-submit-btn {
		background-color: #01c0a4;
		color: white;
		padding: 0.75rem 1.5rem;
		border-radius: 0.75rem;
		font-weight: 500;
		border: none;
		cursor: pointer;
		transition: background-color 0.2s;
	}
	
	.changepassword-submit-btn:hover:not(:disabled) {
		background-color: #00a085;
	}
	
	.changepassword-submit-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	
	.changepassword-cancel-btn {
		border: 1px solid #d1d5db;
		color: #374151;
		background-color: white;
		padding: 0.75rem 1.5rem;
		border-radius: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}
	
	.changepassword-cancel-btn:hover:not(:disabled) {
		background-color: #f9fafb;
	}
	
	.changepassword-cancel-btn:disabled {
		opacity: 0.5;
	}
	
	.changepassword-modal-overlay {
		position: fixed;
		inset: 0;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 50;
	}
	
	.changepassword-modal {
		background-color: white;
		border-radius: 1rem;
		padding: 1.5rem;
		max-width: 24rem;
		margin: 1rem;
	}
	
	.changepassword-modal-title {
		font-size: 1.125rem;
		line-height: 1.75rem;
		font-weight: 700;
		color: #1f2937;
		margin-bottom: 0.5rem;
	}
	
	.changepassword-modal-text {
		color: #4b5563;
		margin-bottom: 1.5rem;
	}
	
	.changepassword-modal-actions {
		display: flex;
		gap: 0.75rem;
	}
	
	.changepassword-modal-confirm {
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
	
	.changepassword-modal-confirm:hover {
		background-color: #b91c1c;
	}
	
	.changepassword-modal-dismiss {
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
	
	.changepassword-modal-dismiss:hover {
		background-color: #f9fafb;
	}
</style>
