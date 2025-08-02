<script lang="ts">
	import { goto } from '$app/navigation';
	import { writable } from 'svelte/store';
	
	const firstTimeShowTermsModal = writable(true);
	const firstTimeTermsAccepted = writable(false);
	const firstTimeShowCancelModal = writable(false);
	const firstTimeIsLoading = writable(false);
	
	// Security questions
	const firstTimeSecurityQuestions = [
		"What was the name of your first pet?",
		"What city were you born in?",
		"What was your mother's maiden name?",
		"What was the name of your elementary school?",
		"What was your childhood nickname?",
		"What is your favorite movie?",
		"What was the make of your first car?",
		"What street did you grow up on?"
	];
	
	const firstTimeSelectedQuestions = writable(['', '', '']);
	const firstTimeAnswers = writable(['', '', '']);
	
	const firstTimeAcceptTerms = () => {
		firstTimeShowTermsModal.set(false);
	};
	
	const firstTimeHandleQuestionChange = (index: number, value: string) => {
		firstTimeSelectedQuestions.update(selectedQuestions => {
			selectedQuestions[index] = value;
			
			// Ensure no duplicate questions
			const otherQuestions = selectedQuestions.filter((_, i) => i !== index);
			if (otherQuestions.includes(value)) {
				selectedQuestions[index] = '';
			}
			return selectedQuestions;
		});
	};
	
	const firstTimeGetAvailableQuestions = (currentIndex: number) => {
		return firstTimeSecurityQuestions.filter(question => !$firstTimeSelectedQuestions.includes(question) || currentIndex === $firstTimeSelectedQuestions.indexOf(question));
	};
	
	const firstTimeCanSubmit = () => {
		return $firstTimeSelectedQuestions.every(q => q !== '') && 
			   $firstTimeAnswers.every(a => a.trim() !== '');
	};
	
	const firstTimeHandleSubmit = async () => {
		if (firstTimeCanSubmit()) {
			firstTimeIsLoading.set(true);
			
			// Simulate API call
			await new Promise(resolve => setTimeout(resolve, 2000));
			
			goto('/change-password?from=first-time');
		}
	};
	
	const firstTimeHandleCancel = () => {
		firstTimeShowCancelModal.set(true);
	};
	
	const firstTimeConfirmCancel = () => {
		goto('/login');
	};
	
	const firstTimeHandleKeydown = (event: KeyboardEvent) => {
		if (event.key === 'Escape') {
			firstTimeHandleCancel();
		}
	};
</script>

<svelte:head>
	<title>First Time Setup</title>
</svelte:head>

<svelte:window onkeydown={firstTimeHandleKeydown} />

<div class="firsttime-container">
	<div class="firsttime-card">
		<div class="firsttime-header">
			<h1 class="firsttime-title">Complete Your Setup</h1>
			<p class="firsttime-subtitle">Set up your security questions</p>
		</div>
		
		<div class="firsttime-form">
			<!-- Security Questions Section -->
			<div class="firsttime-section">
				<h2 class="firsttime-section-title">Security Questions</h2>
				<p class="firsttime-section-subtitle">Select 3 unique security questions</p>
				
				{#each Array(3) as _, index}
					<div class="firsttime-question-group">
						<label class="firsttime-label" for={`question-${index + 1}`}>Question {index + 1}</label>
						<select
							bind:value={$firstTimeSelectedQuestions[index]}
							onchange={(e) => firstTimeHandleQuestionChange(index, (e.target as HTMLSelectElement).value)}
							class="firsttime-select"
							id={`question-${index + 1}`}
						>
							<option value="">Select a question...</option>
							{#each firstTimeGetAvailableQuestions(index) as question}
								<option value={question}>{question}</option>
							{/each}
						</select>
						
						{#if $firstTimeSelectedQuestions[index]}
							<label class="firsttime-label" for={`answer-${index + 1}`}>Your answer</label>
							<input
								type="text"
								bind:value={$firstTimeAnswers[index]}
								class="firsttime-input"
								id={`answer-${index + 1}`}
							/>
						{/if}
					</div>
				{/each}
			</div>
			
			<div class="firsttime-actions">
				<button
					onclick={firstTimeHandleSubmit}
					disabled={!firstTimeCanSubmit() || $firstTimeIsLoading}
					class="firsttime-submit-btn"
				>
					{$firstTimeIsLoading ? 'Setting up...' : 'Continue'}
				</button>
				
				<button
					onclick={firstTimeHandleCancel}
					class="firsttime-cancel-btn"
				>
					Cancel
				</button>
			</div>
		</div>
	</div>
</div>

<!-- Terms Modal -->
{#if $firstTimeShowTermsModal}
	<div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
		<div class="bg-white rounded-xl p-6 max-w-md w-full mx-4" style="box-shadow: 0 20px 30px -8px rgba(0, 0, 0, 0.3);">
			<h3 class="text-lg font-bold text-gray-800 mb-4">Terms of Service & PII Protection</h3>
			<div class="text-gray-600 mb-6 space-y-3">
				<p>By using this system, you agree to:</p>
				<ul class="list-disc list-inside space-y-1 ml-4">
					<li>Protect your login credentials</li>
					<li>Not share your account with others</li>
					<li>Report any security incidents</li>
					<li>Comply with company policies</li>
				</ul>
				<p>Your personal information is protected and will not be shared with third parties.</p>
			</div>
			<div class="flex items-center gap-3 mb-6">
				<input
					type="checkbox"
					id="firsttime-terms"
					bind:checked={$firstTimeTermsAccepted}
					class="w-4 h-4 text-[#01c0a4] border-gray-300 rounded focus:ring-[#01c0a4]"
				/>
				<label for="firsttime-terms" class="text-sm text-gray-700">I agree to the terms and conditions</label>
			</div>
			<button
				onclick={firstTimeAcceptTerms}
				disabled={!$firstTimeTermsAccepted}
				class="w-full bg-gradient-to-r from-[#01c0a4] to-[#00a085] text-white font-semibold py-3 px-6 rounded-xl hover:shadow-lg hover:shadow-[#01c0a4]/25 focus:outline-none focus:ring-4 focus:ring-[#01c0a4]/20 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
			>
				Accept & Continue
			</button>
		</div>
	</div>
{/if}

<!-- Cancel Confirmation Modal -->
{#if $firstTimeShowCancelModal}
	<div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
		<div class="bg-white rounded-xl p-6 max-w-sm w-full mx-4" style="box-shadow: 0 20px 30px -8px rgba(0, 0, 0, 0.3);">
			<h3 class="text-lg font-bold text-gray-800 mb-2">Cancel Setup?</h3>
			<p class="text-gray-600 mb-6">Your progress will be lost. Are you sure you want to cancel?</p>
			<div class="flex flex-col gap-3">
				<button onclick={firstTimeConfirmCancel} class="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 cursor-pointer">Yes, Cancel</button>
				<button onclick={() => firstTimeShowCancelModal.set(false)} class="w-full border-2 border-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-xl hover:bg-gray-50 transition-all duration-200 cursor-pointer">Continue Setup</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.firsttime-container {
		min-height: 100vh;
		background: linear-gradient(to bottom right, #f8fafc, #ffffff, #f0fdfa);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}
	
	.firsttime-card {
		background-color: white;
		border-radius: 1.5rem;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
		padding: 2rem;
		width: 100%;
		max-width: 42rem;
		max-height: 90vh;
		overflow-y: auto;
	}
	
	.firsttime-header {
		text-align: center;
		margin-bottom: 2rem;
	}
	
	.firsttime-title {
		font-size: 1.5rem;
		line-height: 2rem;
		font-weight: 700;
		color: #1f2937;
		margin-bottom: 0.5rem;
	}
	
	.firsttime-subtitle {
		color: #4b5563;
	}
	
	.firsttime-section {
		margin-bottom: 2rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid #e5e7eb;
	}
	
	.firsttime-section:last-child {
		border-bottom: none;
	}
	
	.firsttime-section-title {
		font-size: 1.125rem;
		line-height: 1.75rem;
		font-weight: 600;
		color: #1f2937;
		margin-bottom: 0.5rem;
	}
	
	.firsttime-section-subtitle {
		color: #4b5563;
		margin-bottom: 1rem;
	}
	
	.firsttime-field {
		margin-bottom: 1rem;
	}
	
	.firsttime-label {
		display: block;
		font-size: 0.875rem;
		line-height: 1.25rem;
		font-weight: 500;
		color: #374151;
		margin-bottom: 0.5rem;
	}
	
	.firsttime-input {
		width: 100%;
		padding: 0.75rem 1rem;
		border: 2px solid #d1d5db;
		border-radius: 0.75rem;
		transition: border-color 0.2s;
	}
	
	.firsttime-input:focus {
		border-color: #01c0a4;
		outline: none;
	}
	
	.firsttime-select {
		width: 100%;
		padding: 0.75rem 1rem;
		border: 2px solid #d1d5db;
		border-radius: 0.75rem;
		margin-bottom: 0.5rem;
		transition: border-color 0.2s;
	}
	
	.firsttime-select:focus {
		border-color: #01c0a4;
		outline: none;
	}
	
	.firsttime-question-group {
		margin-bottom: 1.5rem;
	}
	
	.firsttime-errors {
		margin-bottom: 1rem;
	}
	
	.firsttime-errors > * + * {
		margin-top: 0.25rem;
	}
	
	.firsttime-error {
		color: #dc2626;
		font-size: 0.875rem;
		line-height: 1.25rem;
	}
	
	.firsttime-password-hint {
		background-color: #dbeafe;
		border: 1px solid #bfdbfe;
		border-radius: 0.5rem;
		padding: 0.75rem;
		font-size: 0.75rem;
		line-height: 1rem;
	}
	
	.firsttime-hint-title {
		font-weight: 500;
		color: #1e40af;
		margin-bottom: 0.25rem;
	}
	
	.firsttime-hint-list {
		color: #1d4ed8;
		margin-left: 1rem;
		list-style-type: disc;
	}
	
	.firsttime-hint-list > * + * {
		margin-top: 0.25rem;
	}
	
	.firsttime-actions {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	
	.firsttime-submit-btn {
		background-color: #01c0a4;
		color: white;
		padding: 0.75rem 1.5rem;
		border-radius: 0.75rem;
		font-weight: 500;
		border: none;
		cursor: pointer;
		transition: background-color 0.2s;
	}
	
	.firsttime-submit-btn:hover:not(:disabled) {
		background-color: #00a085;
	}
	
	.firsttime-submit-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	
	.firsttime-cancel-btn {
		border: 1px solid #d1d5db;
		color: #374151;
		background-color: white;
		padding: 0.75rem 1.5rem;
		border-radius: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}
	
	.firsttime-cancel-btn:hover {
		background-color: #f9fafb;
	}
	
	.firsttime-modal-overlay {
		position: fixed;
		inset: 0;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 50;
	}
	
	.firsttime-modal {
		background-color: white;
		border-radius: 1rem;
		padding: 1.5rem;
		max-width: 28rem;
		margin: 1rem;
	}
	
	.firsttime-modal-title {
		font-size: 1.125rem;
		line-height: 1.75rem;
		font-weight: 700;
		color: #1f2937;
		margin-bottom: 1rem;
	}
	
	.firsttime-modal-content {
		color: #4b5563;
		margin-bottom: 1rem;
		font-size: 0.875rem;
		line-height: 1.25rem;
	}
	
	.firsttime-modal-content ul {
		list-style-type: disc;
		margin-left: 1rem;
	}
	
	.firsttime-modal-content ul > * + * {
		margin-top: 0.25rem;
	}
	
	.firsttime-modal-checkbox {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}
	
	.firsttime-modal-accept {
		width: 100%;
		background-color: #01c0a4;
		color: white;
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		font-weight: 500;
		border: none;
		cursor: pointer;
		transition: background-color 0.2s;
	}
	
	.firsttime-modal-accept:hover:not(:disabled) {
		background-color: #00a085;
	}
	
	.firsttime-modal-accept:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	
	.firsttime-modal-text {
		color: #4b5563;
		margin-bottom: 1.5rem;
	}
	
	.firsttime-modal-actions {
		display: flex;
		gap: 0.75rem;
	}
	
	.firsttime-modal-confirm {
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
	
	.firsttime-modal-confirm:hover {
		background-color: #b91c1c;
	}
	
	.firsttime-modal-dismiss {
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
	
	.firsttime-modal-dismiss:hover {
		background-color: #f9fafb;
	}
</style>
