<script lang="ts">
	import { goto } from '$app/navigation';
	
	let securityQuestionText = $state("What was the name of your first pet?"); // This would come from API
	let securityQuestionAnswer = $state('');
	let securityQuestionIsLoading = $state(false);
	let securityQuestionError = $state('');
	let securityQuestionShowCancelModal = $state(false);
	let securityQuestionAttempts = $state(0);
	let securityQuestionMaxAttempts = $state(3);
	
	const securityQuestionHandleSubmit = async () => {
		if (!securityQuestionAnswer.trim()) {
			securityQuestionError = 'Please provide an answer';
			return;
		}
		
		securityQuestionIsLoading = true;
		securityQuestionError = '';
		
		// Simulate API call
		await new Promise(resolve => setTimeout(resolve, 1500));
		
		// Simulate validation (in real app, this would be server-side)
		const isCorrect = Math.random() > 0.3; // 70% success rate for demo
		
		if (isCorrect) {
			goto('/change-password?from=forgot-password');
		} else {
			securityQuestionAttempts++;
			if (securityQuestionAttempts >= securityQuestionMaxAttempts) {
				securityQuestionError = 'Maximum attempts exceeded. Please contact support.';
			} else {
				securityQuestionError = `Incorrect answer. ${securityQuestionMaxAttempts - securityQuestionAttempts} attempts remaining.`;
			}
		}
		
		securityQuestionIsLoading = false;
	};
	
	const securityQuestionHandleCancel = () => {
		securityQuestionShowCancelModal = true;
	};
	
	const securityQuestionConfirmCancel = () => {
		goto('/login');
	};
	
	const securityQuestionHandleKeydown = (event: KeyboardEvent) => {
		if (event.key === 'Enter') {
			securityQuestionHandleSubmit();
		}
		if (event.key === 'Escape') {
			securityQuestionHandleCancel();
		}
	};
</script>

<svelte:head>
	<title>Security Question</title>
</svelte:head>

<svelte:window onkeydown={securityQuestionHandleKeydown} />

<div class="securityquestion-container">
	<div class="securityquestion-card">
		<div class="securityquestion-header">
			<h1 class="securityquestion-title">Security Question</h1>
			<p class="securityquestion-subtitle">Answer your security question to continue</p>
		</div>
		
		<div class="securityquestion-form">
			{#if securityQuestionError}
				<div class="securityquestion-error">
					{securityQuestionError}
				</div>
			{/if}
			
			<div class="securityquestion-question">
				<label class="securityquestion-label" for="securityQuestionInput">Question:</label>
				<div class="securityquestion-question-text">
					{securityQuestionText}
				</div>
			</div>
			
			<div class="securityquestion-field">
				<label class="securityquestion-label" for="securityQuestionInput">Your Answer</label>
				<input
					type="text"
					bind:value={securityQuestionAnswer}
					class="securityquestion-input"
					id="securityQuestionInput"
					placeholder="Enter your answer"
					disabled={securityQuestionIsLoading || securityQuestionAttempts >= securityQuestionMaxAttempts}
				/>
			</div>
			
			<div class="securityquestion-attempts">
				Attempts: {securityQuestionAttempts} / {securityQuestionMaxAttempts}
			</div>
			
			<div class="securityquestion-actions">
				<button
					onclick={securityQuestionHandleSubmit}
					disabled={securityQuestionIsLoading || !securityQuestionAnswer.trim() || securityQuestionAttempts >= securityQuestionMaxAttempts}
					class="securityquestion-submit-btn"
				>
					{securityQuestionIsLoading ? 'Verifying...' : 'Submit Answer'}
				</button>
				
				<button
					onclick={securityQuestionHandleCancel}
					class="securityquestion-cancel-btn"
					disabled={securityQuestionIsLoading}
				>
					Cancel
				</button>
			</div>
		</div>
	</div>
</div>

<!-- Cancel Confirmation Modal -->
{#if securityQuestionShowCancelModal}
	<div class="securityquestion-modal-overlay">
		<div class="securityquestion-modal">
			<h3 class="securityquestion-modal-title">Cancel Process?</h3>
			<p class="securityquestion-modal-text">Your progress will be lost. Are you sure you want to cancel?</p>
			<div class="securityquestion-modal-actions">
				<button onclick={securityQuestionConfirmCancel} class="securityquestion-modal-confirm">Yes, Cancel</button>
				<button onclick={() => securityQuestionShowCancelModal = false} class="securityquestion-modal-dismiss">Continue</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.securityquestion-container {
		min-height: 100vh;
		background: linear-gradient(to bottom right, #f8fafc, #ffffff, #f0fdfa);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}
	
	.securityquestion-card {
		background-color: white;
		border-radius: 1.5rem;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
		padding: 2rem;
		width: 100%;
		max-width: 28rem;
	}
	
	.securityquestion-header {
		text-align: center;
		margin-bottom: 2rem;
	}
	
	.securityquestion-title {
		font-size: 1.5rem;
		line-height: 2rem;
		font-weight: 700;
		color: #1f2937;
		margin-bottom: 0.5rem;
	}
	
	.securityquestion-subtitle {
		color: #4b5563;
	}
	
	.securityquestion-error {
		background-color: #fef2f2;
		border: 1px solid #fecaca;
		color: #b91c1c;
		padding: 1rem;
		border-radius: 0.75rem;
		font-size: 0.875rem;
		line-height: 1.25rem;
		margin-bottom: 1rem;
	}
	
	.securityquestion-question {
		margin-bottom: 1.5rem;
	}
	
	.securityquestion-label {
		display: block;
		font-size: 0.875rem;
		line-height: 1.25rem;
		font-weight: 500;
		color: #374151;
		margin-bottom: 0.5rem;
	}
	
	.securityquestion-question-text {
		background-color: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 0.75rem;
		padding: 1rem;
		color: #1f2937;
		font-weight: 500;
	}
	
	.securityquestion-field {
		margin-bottom: 1rem;
	}
	
	.securityquestion-input {
		width: 100%;
		padding: 0.75rem 1rem;
		border: 2px solid #d1d5db;
		border-radius: 0.75rem;
		transition: border-color 0.2s;
	}
	
	.securityquestion-input:focus {
		border-color: #01c0a4;
		outline: none;
	}
	
	.securityquestion-input:disabled {
		opacity: 0.5;
	}
	
	.securityquestion-attempts {
		font-size: 0.875rem;
		line-height: 1.25rem;
		color: #4b5563;
		margin-bottom: 1.5rem;
	}
	
	.securityquestion-actions {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	
	.securityquestion-submit-btn {
		background-color: #01c0a4;
		color: white;
		padding: 0.75rem 1.5rem;
		border-radius: 0.75rem;
		font-weight: 500;
		border: none;
		cursor: pointer;
		transition: background-color 0.2s;
	}
	
	.securityquestion-submit-btn:hover:not(:disabled) {
		background-color: #00a085;
	}
	
	.securityquestion-submit-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	
	.securityquestion-cancel-btn {
		border: 1px solid #d1d5db;
		color: #374151;
		background-color: white;
		padding: 0.75rem 1.5rem;
		border-radius: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}
	
	.securityquestion-cancel-btn:hover:not(:disabled) {
		background-color: #f9fafb;
	}
	
	.securityquestion-cancel-btn:disabled {
		opacity: 0.5;
	}
	
	.securityquestion-modal-overlay {
		position: fixed;
		inset: 0;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 50;
	}
	
	.securityquestion-modal {
		background-color: white;
		border-radius: 1rem;
		padding: 1.5rem;
		max-width: 24rem;
		margin: 1rem;
	}
	
	.securityquestion-modal-title {
		font-size: 1.125rem;
		line-height: 1.75rem;
		font-weight: 700;
		color: #1f2937;
		margin-bottom: 0.5rem;
	}
	
	.securityquestion-modal-text {
		color: #4b5563;
		margin-bottom: 1.5rem;
	}
	
	.securityquestion-modal-actions {
		display: flex;
		gap: 0.75rem;
	}
	
	.securityquestion-modal-confirm {
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
	
	.securityquestion-modal-confirm:hover {
		background-color: #b91c1c;
	}
	
	.securityquestion-modal-dismiss {
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
	
	.securityquestion-modal-dismiss:hover {
		background-color: #f9fafb;
	}
</style>
