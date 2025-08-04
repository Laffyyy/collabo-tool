<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	
	let securityQuestionText = $state("What was the name of your first pet?"); // This would come from API
	let securityQuestionAnswer = $state('');
	let securityQuestionIsLoading = $state(false);
	let securityQuestionError = $state('');
	let securityQuestionShowCancelModal = $state(false);
	let securityQuestionAttempts = $state(0);
	let securityQuestionMaxAttempts = $state(3);
	let securityQuestionInput: HTMLInputElement | undefined;
	
	onMount(() => {
		// Auto-focus the answer input
		if (securityQuestionInput) {
			securityQuestionInput.focus();
		}
	});
	
	const securityQuestionValidateInput = (value: string): string => {
		// Only allow alphanumeric characters, specified symbols (! @ _ - .), and spaces
		let filteredValue = value.replace(/[^a-zA-Z0-9!@_.\- ]/g, '');
		
		// Replace multiple consecutive spaces with single space
		filteredValue = filteredValue.replace(/\s+/g, ' ');
		
		// Strictly limit to 30 characters max
		return filteredValue.slice(0, 30);
	};
	
	const securityQuestionHandleInput = (event: Event) => {
		const target = event.target as HTMLInputElement;
		const filteredValue = securityQuestionValidateInput(target.value);
		securityQuestionAnswer = filteredValue;
		
		// Update the input value if it was filtered
		if (target.value !== filteredValue) {
			target.value = filteredValue;
		}
	};
	
	const securityQuestionHandlePaste = (event: ClipboardEvent) => {
		event.preventDefault();
		const pastedText = event.clipboardData?.getData('text') || '';
		const target = event.target as HTMLInputElement;
		const filteredText = securityQuestionValidateInput(pastedText);
		
		securityQuestionAnswer = filteredText;
		target.value = filteredText;
	};
	
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
			<p class="securityquestion-subtitle">Verify your identity to proceed with password recovery</p>
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
					bind:this={securityQuestionInput}
					type="text"
					bind:value={securityQuestionAnswer}
					oninput={securityQuestionHandleInput}
					onpaste={securityQuestionHandlePaste}
					class="securityquestion-input"
					id="securityQuestionInput"
					placeholder="Enter your answer"
					maxlength="30"
					disabled={securityQuestionIsLoading || securityQuestionAttempts >= securityQuestionMaxAttempts}
				/>
			</div>
			
			<div class="securityquestion-attempts">
				Attempts: {securityQuestionAttempts} / {securityQuestionMaxAttempts}
			</div>
			
			<div class="securityquestion-actions">
				<button
					onclick={securityQuestionHandleCancel}
					class="securityquestion-cancel-btn"
					disabled={securityQuestionIsLoading}
				>
					Cancel
				</button>
				
				<button
					onclick={securityQuestionHandleSubmit}
					disabled={securityQuestionIsLoading || !securityQuestionAnswer.trim() || securityQuestionAttempts >= securityQuestionMaxAttempts}
					class="securityquestion-submit-btn"
				>
					{securityQuestionIsLoading ? 'Verifying...' : 'Submit Answer'}
				</button>
			</div>
		</div>
	</div>
</div>

<!-- Cancel Confirmation Modal -->
{#if securityQuestionShowCancelModal}
	<div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
		<div class="bg-white rounded-xl p-6 max-w-sm w-full mx-4" style="box-shadow: 0 20px 30px -8px rgba(0, 0, 0, 0.3);">
			<h3 class="text-lg font-bold text-gray-800 mb-2">Cancel Process?</h3>
			<p class="text-gray-600 mb-6">Your progress will be lost.</p>
			<div class="flex flex-row gap-3">
				<button onclick={securityQuestionConfirmCancel} class="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 cursor-pointer">Yes</button>
				<button onclick={() => securityQuestionShowCancelModal = false} class="flex-1 border-2 border-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-xl hover:bg-gray-50 transition-all duration-200 cursor-pointer">No</button>
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
		flex-direction: row;
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
		flex: 1;
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
		flex: 1;
	}
	
	.securityquestion-cancel-btn:hover:not(:disabled) {
		background-color: #f9fafb;
	}
	
	.securityquestion-cancel-btn:disabled {
		opacity: 0.5;
	}
</style>
