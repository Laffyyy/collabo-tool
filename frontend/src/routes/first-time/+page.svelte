<script lang="ts">
	import { goto } from '$app/navigation';
	import { writable } from 'svelte/store';
	import { onMount } from 'svelte';
	import { apiClient } from '$lib/api/client';
    import { API_CONFIG } from '$lib/api/config';
	
	const firstTimeShowTermsModal = writable(true);
	const firstTimeTermsAccepted = writable(false);
	const firstTimeShowCancelModal = writable(false);
	const firstTimeIsLoading = writable(false);

	// User data from OTP verification
    let userId = $state('');
    let username = $state('');
    let userEmail = $state('');
    let userRole = $state('');
    let userName = $state('');

	// Error handling
    let error = $state('');
	
	// Auto-focus reference
	let firstTimeFirstAnswerInput: HTMLInputElement | undefined;
	
	// Function to handle binding the first input
	const firstTimeBindFirstInput = (element: HTMLInputElement | null, index: number) => {
		if (index === 0 && element) {
			firstTimeFirstAnswerInput = element;
		}
	};
	
	onMount(() => {
		// Get stored user data from OTP verification
        userId = localStorage.getItem('firstTime_userId') || '';
        username = localStorage.getItem('firstTime_username') || '';
        userEmail = localStorage.getItem('firstTime_email') || '';
        userRole = localStorage.getItem('firstTime_role') || '';
        userName = localStorage.getItem('firstTime_name') || '';
        
        console.log('First-time page loaded with user data:', { userId, username, userEmail });
        
        // If no user data is found, redirect to login
        if (!userId || !username) {
            console.log('No first-time user data found, redirecting to login');
            goto('/login');
            return;
        }


		// Wait for terms modal to close, then focus first answer input
		const unsubscribe = firstTimeShowTermsModal.subscribe(showModal => {
			if (!showModal && firstTimeFirstAnswerInput) {
				setTimeout(() => {
					if (firstTimeFirstAnswerInput) {
						firstTimeFirstAnswerInput.focus();
					}
				}, 100);
			}
		});
		
		return unsubscribe;
	});
	
	// Input validation function
	const firstTimeValidateAnswerInput = (value: string): string => {
		// Only allow alphanumeric characters, specified symbols (! @ _ - .), and spaces
		let filteredValue = value.replace(/[^a-zA-Z0-9!@_.\- ]/g, '');
		
		// Replace multiple consecutive spaces with single space
		filteredValue = filteredValue.replace(/\s+/g, ' ');
		
		// Strictly limit to 30 characters max
		return filteredValue.slice(0, 30);
	};
	
	const firstTimeHandleAnswerInput = (event: Event, index: number) => {
		const target = event.target as HTMLInputElement;
		const filteredValue = firstTimeValidateAnswerInput(target.value);
		
		// Update the answers array
		firstTimeAnswers.update(answers => {
			answers[index] = filteredValue;
			return answers;
		});
		
		// Update the input value if it was filtered
		if (target.value !== filteredValue) {
			target.value = filteredValue;
		}
	};
	
	const firstTimeHandleAnswerPaste = (event: ClipboardEvent, index: number) => {
		event.preventDefault();
		const pastedText = event.clipboardData?.getData('text') || '';
		const target = event.target as HTMLInputElement;
		const filteredText = firstTimeValidateAnswerInput(pastedText);
		
		// Update the answers array
		firstTimeAnswers.update(answers => {
			answers[index] = filteredText;
			return answers;
		});
		
		target.value = filteredText;
	};
	
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
        if (!firstTimeCanSubmit()) {
            error = 'Please complete all security questions';
            return;
        }
        
        firstTimeIsLoading.set(true);
        error = '';
        
        try {
            // Prepare security questions data
            const securityQuestions = $firstTimeSelectedQuestions.map((question, index) => ({
                question,
                answer: $firstTimeAnswers[index].trim()
            }));
            
            console.log('Submitting security questions for user:', userId);
            
			// Submit security questions to backend
			const response = await apiClient.post(
				API_CONFIG.endpoints.auth.setupSecurityQuestions || '/api/v1/auth/security-questions',
				{
					userId,
					securityQuestions
				}
			);
			
			console.log('Security questions setup response:', response);

			// Type guard for expected response shape
			const res = response as { ok?: boolean; success?: boolean; message?: string };

			if (res.ok || res.success) {
				// Store data for password change step
				localStorage.setItem('passwordChange_userId', userId);
				localStorage.setItem('passwordChange_username', username);
				localStorage.setItem('passwordChange_email', userEmail);
				localStorage.setItem('passwordChange_role', userRole);
				localStorage.setItem('passwordChange_name', userName);
				
				// Clear first-time data
				localStorage.removeItem('firstTime_userId');
				localStorage.removeItem('firstTime_username');
				localStorage.removeItem('firstTime_email');
				localStorage.removeItem('firstTime_role');
				localStorage.removeItem('firstTime_name');
				localStorage.removeItem('firstTime_tempPassword');
				
				// Redirect to password change
				goto('/change-password?from=first-time');
			} else {
				error = res.message || 'Failed to save security questions';
			}
        } catch (err: any) {
            console.error('Error submitting security questions:', err);
            error = err.message || 'Connection error. Please try again.';
        } finally {
            firstTimeIsLoading.set(false);
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
				<h2 class="firsttime-section-title">Security Setup</h2>
				<p class="firsttime-section-subtitle">Choose 3 unique questions and provide answers for account recovery</p>
				
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
						
						<label class="firsttime-label" for={`answer-${index + 1}`}>Your answer</label>
						<input
							use:firstTimeBindFirstInput={index}
							type="text"
							value={$firstTimeAnswers[index]}
							oninput={(e) => firstTimeHandleAnswerInput(e, index)}
							onpaste={(e) => firstTimeHandleAnswerPaste(e, index)}
							onkeydown={(e) => {
								// Prevent certain key combinations and special characters
								if (e.ctrlKey && (e.key === 'v' || e.key === 'c' || e.key === 'x')) {
									if (e.key === 'v') {
										e.preventDefault(); // Prevent default paste
									}
									return;
								}
							}}
							class="firsttime-input"
							id={`answer-${index + 1}`}
							placeholder="Enter your answer"
							disabled={!$firstTimeSelectedQuestions[index]}
							maxlength="30"
							autocomplete="off"
							spellcheck="false"
						/>
					</div>
				{/each}
			</div>
			
			<div class="firsttime-actions">
				<button
					onclick={firstTimeHandleCancel}
					class="firsttime-cancel-btn"
				>
					Cancel
				</button>
				
				<button
					onclick={firstTimeHandleSubmit}
					disabled={!firstTimeCanSubmit() || $firstTimeIsLoading}
					class="firsttime-submit-btn"
				>
					{$firstTimeIsLoading ? 'Setting up...' : 'Continue'}
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
			<p class="text-gray-600 mb-6">Your progress will be lost.</p>
			<div class="flex flex-row gap-3">
				<button onclick={firstTimeConfirmCancel} class="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 cursor-pointer">Yes</button>
				<button onclick={() => firstTimeShowCancelModal.set(false)} class="flex-1 border-2 border-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-xl hover:bg-gray-50 transition-all duration-200 cursor-pointer">No</button>
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
		padding: 1.5rem;
		width: 100%;
		max-width: 42rem;
		max-height: 95vh;
		overflow-y: auto;
	}
	
	.firsttime-header {
		text-align: center;
		margin-bottom: 1.5rem;
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
		margin-bottom: 1.5rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid #e5e7eb;
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
		margin-bottom: 0.75rem;
	}
	
	.firsttime-label {
		display: block;
		font-size: 0.875rem;
		line-height: 1.25rem;
		font-weight: 500;
		color: #374151;
		margin-bottom: 0.25rem;
	}
	
	.firsttime-input {
		width: 100%;
		padding: 0.5rem 0.75rem;
		border: 2px solid #d1d5db;
		border-radius: 0.75rem;
		transition: border-color 0.2s;
		margin-bottom: 0.25rem;
	}
	
	.firsttime-input:focus {
		border-color: #01c0a4;
		outline: none;
	}
	
	.firsttime-input:disabled {
		background-color: #f3f4f6;
		color: #9ca3af;
		cursor: not-allowed;
		border-color: #e5e7eb;
	}
	
	.firsttime-select {
		width: 100%;
		padding: 0.5rem 0.75rem;
		border: 2px solid #d1d5db;
		border-radius: 0.75rem;
		margin-bottom: 0.25rem;
		transition: border-color 0.2s;
	}
	
	.firsttime-select:focus {
		border-color: #01c0a4;
		outline: none;
	}
	
	.firsttime-question-group {
		margin-top: 1.25rem;
		margin-bottom: 1rem;
	}
	
	.firsttime-question-group:first-child {
		margin-top: 0;
	}
	
	.firsttime-actions {
		display: flex;
		flex-direction: row;
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
		flex: 1;
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
		flex: 1;
	}
	
	.firsttime-cancel-btn:hover {
		background-color: #f9fafb;
	}
</style>
