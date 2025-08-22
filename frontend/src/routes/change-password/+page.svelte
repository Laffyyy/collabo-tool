<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { Eye, EyeOff } from 'lucide-svelte';
	import { apiClient } from '$lib/api/client';
	import { API_CONFIG } from '$lib/api/config';
	
	let changePasswordNew = $state('');
	let changePasswordConfirm = $state('');
	let changePasswordErrors: string[] = $state([]);
	let changePasswordValid = $state(false);
	let changePasswordsMatch = $state(false);
	let changePasswordIsLoading = $state(false);
	let changePasswordShowCancelModal = $state(false);
	let changePasswordFromForgotPassword = $state(false);
	let changePasswordFromFirstTime = $state(false);
	let changePasswordShowNew = $state(false);
	let changePasswordShowConfirm = $state(false);
	let changePasswordNewInput: HTMLInputElement;
	let changePasswordError = $state('');

	 // User data for first-time password change
    let userId = $state('');
    let username = $state('');
    let userEmail = $state('');
    let savedSecurityAnswers: Array<{ questionId: string; answer: string }> = $state([]);
	
	onMount(() => {
        // Check if coming from different flows
        const urlParams = new URLSearchParams(window.location.search);
        changePasswordFromForgotPassword = urlParams.get('from') === 'forgot-password';
        changePasswordFromFirstTime = urlParams.get('from') === 'first-time'; // Add this
        
        // Get user data for first-time password change
        if (changePasswordFromFirstTime) {
            userId = localStorage.getItem('passwordChange_userId') || '';
            username = localStorage.getItem('passwordChange_username') || '';
            userEmail = localStorage.getItem('passwordChange_email') || '';
            
            // Get saved security answers from localStorage
            const savedAnswers = localStorage.getItem('passwordChange_securityAnswers');
            if (savedAnswers) {
                savedSecurityAnswers = JSON.parse(savedAnswers);
            }

            if (!userId || savedSecurityAnswers.length === 0) {
                console.log('No user data or security answers found for password change, redirecting to login');
                goto('/login');
                return;
            }

            console.log('Password change page loaded with:', { userId, username, savedSecurityAnswers });
        }
        
        // Auto-focus the first input
        setTimeout(() => {
            if (changePasswordNewInput) {
                changePasswordNewInput.focus();
            }
        }, 100);
    });
	
	const changePasswordValidateInput = (value: string): string => {
		// Only allow alphanumeric characters and specified symbols: ! @ - _ .
		const filteredValue = value.replace(/[^a-zA-Z0-9!@_.-]/g, '');
		// Strictly limit to 20 characters max
		return filteredValue.slice(0, 20);
	};

	// Update validation to match backend requirements
    const changePasswordValidatePassword = () => {
        const errors: string[] = [];
        
        if (changePasswordNew.length > 0) {
            if (changePasswordNew.length < 8) { // Backend expects 8-128
                errors.push("Password must be at least 8 characters long");
            }
            
            if (changePasswordNew.length > 128) { // Match backend validation
                errors.push("Password must not exceed 128 characters");
            }
            
            if (!/[A-Z]/.test(changePasswordNew)) {
                errors.push("Password must contain at least 1 uppercase letter");
            }
            
            if (!/[a-z]/.test(changePasswordNew)) {
                errors.push("Password must contain at least 1 lowercase letter");
            }
            
            if (!/[0-9]/.test(changePasswordNew)) {
                errors.push("Password must contain at least 1 number");
            }
            
            if (!/[@$!%*?&]/.test(changePasswordNew)) { // Match backend special chars
                errors.push("Password must contain at least 1 special character (@$!%*?&)");
            }
        }
        
        changePasswordErrors = errors;
        changePasswordValid = errors.length === 0 && changePasswordNew.length >= 8;
    };
	
	const changePasswordHandleNewInput = (event: Event) => {
        const target = event.target as HTMLInputElement;
        changePasswordNew = target.value;
    };
	
	const changePasswordHandleConfirmInput = (event: Event) => {
		const target = event.target as HTMLInputElement;
		const filteredValue = changePasswordValidateInput(target.value);
		changePasswordConfirm = filteredValue;
		// Update the input value if it was filtered
		if (target.value !== filteredValue) {
			target.value = filteredValue;
		}
	};
	
	const changePasswordHandlePaste = (event: ClipboardEvent) => {
		event.preventDefault();
		const pastedText = event.clipboardData?.getData('text') || '';
		const target = event.target as HTMLInputElement;
		const filteredText = changePasswordValidateInput(pastedText);
		
		if (target.id === 'new-password') {
			changePasswordNew = filteredText;
			target.value = filteredText;
		} else if (target.id === 'confirm-password') {
			changePasswordConfirm = filteredText;
			target.value = filteredText;
		}
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
        if (!changePasswordCanSubmit()) return;

        changePasswordIsLoading = true;
        changePasswordError = '';
        
        try {
            if (changePasswordFromFirstTime) {
                console.log('Submitting password change for first-time user:', {
                    userId,
                    hasSecurityAnswers: savedSecurityAnswers.length
                });

                // Use the working password change API endpoint
                const response = await apiClient.post<{
                    ok: boolean;
                    message: string;
                    data?: {
                        userId: string;
                        username: string;
                        mustChangePassword: boolean;
                    };
                }>(API_CONFIG.endpoints.passwordChange.changePassword, {
                    userId,
                    newPassword: changePasswordNew,
                    securityAnswers: savedSecurityAnswers
                });

                console.log('Password change response:', response);

                if (response.ok) {
                    // Clear all stored data
                    localStorage.removeItem('passwordChange_userId');
                    localStorage.removeItem('passwordChange_username');
                    localStorage.removeItem('passwordChange_email');
                    localStorage.removeItem('passwordChange_role');
                    localStorage.removeItem('passwordChange_name');
                    localStorage.removeItem('passwordChange_securityAnswers');

                    // Show success message and redirect to login
                    alert('Password changed successfully! Please log in with your new password.');
                    goto('/login');
                } else {
                    throw new Error(response.message || 'Failed to change password');
                }
            } else {
                // Handle other flows (existing demo behavior)
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                if (changePasswordFromForgotPassword) {
                    goto('/login');
                } else {
                    goto('/chat');
                }
            }
        } catch (error: any) {
            console.error('Password change error:', error);
            changePasswordError = error.message || 'Failed to change password. Please try again.';
        } finally {
            changePasswordIsLoading = false;
        }
    };
	
	const changePasswordHandleCancel = () => {
        if (changePasswordFromFirstTime) {
            changePasswordShowCancelModal = true;
        } else {
            changePasswordShowCancelModal = true;
        }
    };
	
	const changePasswordConfirmCancel = () => {
        // Clear stored data if coming from first-time flow
        if (changePasswordFromFirstTime) {
            localStorage.removeItem('passwordChange_userId');
            localStorage.removeItem('passwordChange_username');
            localStorage.removeItem('passwordChange_email');
            localStorage.removeItem('passwordChange_role');
            localStorage.removeItem('passwordChange_name');
            localStorage.removeItem('passwordChange_securityAnswers');
        }
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
			<p class="changepassword-subtitle">Update your account password for enhanced security</p>
		</div>
		
		<div class="changepassword-form">
			<div class="changepassword-field">
				<label class="changepassword-label" for="new-password">New Password</label>
				<div class="changepassword-input-container">
					<input
						bind:this={changePasswordNewInput}
						type={changePasswordShowNew ? 'text' : 'password'}
						bind:value={changePasswordNew}
						oninput={changePasswordHandleNewInput}
						onpaste={changePasswordHandlePaste}
						class="changepassword-input"
						id="new-password"
						placeholder="Create a strong password"
						maxlength="20"
						disabled={changePasswordIsLoading}
					/>
					<button
						type="button"
						onclick={() => changePasswordShowNew = !changePasswordShowNew}
						class="changepassword-toggle-btn"
						disabled={changePasswordIsLoading}
					>
						{#if changePasswordShowNew}
							<EyeOff size={20} />
						{:else}
							<Eye size={20} />
						{/if}
					</button>
				</div>
			</div>
			
			<div class="changepassword-field">
				<label class="changepassword-label" for="confirm-password">Confirm Password</label>
				<div class="changepassword-input-container">
					<input
						type={changePasswordShowConfirm ? 'text' : 'password'}
						bind:value={changePasswordConfirm}
						oninput={changePasswordHandleConfirmInput}
						onpaste={changePasswordHandlePaste}
						class="changepassword-input"
						id="confirm-password"
						placeholder="Re-type your password"
						maxlength="20"
						disabled={changePasswordIsLoading}
					/>
					<button
						type="button"
						onclick={() => changePasswordShowConfirm = !changePasswordShowConfirm}
						class="changepassword-toggle-btn"
						disabled={changePasswordIsLoading}
					>
						{#if changePasswordShowConfirm}
							<EyeOff size={20} />
						{:else}
							<Eye size={20} />
						{/if}
					</button>
				</div>
			</div>
			
			<div class="changepassword-password-hint">
				<p class="changepassword-hint-title">Password requirements:</p>
				<ul class="changepassword-hint-list">
					<li class={changePasswordNew.length >= 15 && changePasswordNew.length <= 20 ? 'changepassword-requirement-met' : 'changepassword-requirement-unmet'}>
						<span class="changepassword-requirement-icon">
							{#if changePasswordNew.length >= 15 && changePasswordNew.length <= 20}✓{:else}✗{/if}
						</span>
						15-20 characters long
					</li>
					<li class={/[A-Z]/.test(changePasswordNew) ? 'changepassword-requirement-met' : 'changepassword-requirement-unmet'}>
						<span class="changepassword-requirement-icon">
							{#if /[A-Z]/.test(changePasswordNew)}✓{:else}✗{/if}
						</span>
						At least 1 uppercase letter
					</li>
					<li class={/[a-z]/.test(changePasswordNew) ? 'changepassword-requirement-met' : 'changepassword-requirement-unmet'}>
						<span class="changepassword-requirement-icon">
							{#if /[a-z]/.test(changePasswordNew)}✓{:else}✗{/if}
						</span>
						At least 1 lowercase letter
					</li>
					<li class={/[0-9]/.test(changePasswordNew) ? 'changepassword-requirement-met' : 'changepassword-requirement-unmet'}>
						<span class="changepassword-requirement-icon">
							{#if /[0-9]/.test(changePasswordNew)}✓{:else}✗{/if}
						</span>
						At least 1 number
					</li>
					<li class={/[!@_.-]/.test(changePasswordNew) ? 'changepassword-requirement-met' : 'changepassword-requirement-unmet'}>
						<span class="changepassword-requirement-icon">
							{#if /[!@_.-]/.test(changePasswordNew)}✓{:else}✗{/if}
						</span>
						At least 1 symbol (!, @, -, _, .)
					</li>
					<li class={changePasswordsMatch ? 'changepassword-requirement-met' : 'changepassword-requirement-unmet'}>
						<span class="changepassword-requirement-icon">
							{#if changePasswordsMatch}✓{:else}✗{/if}
						</span>
						Passwords must match
					</li>
				</ul>
			</div>
			
			<div class="changepassword-actions">
				<button
					onclick={changePasswordHandleCancel}
					class="changepassword-cancel-btn"
					disabled={changePasswordIsLoading}
				>
					Cancel
				</button>
				
				<button
					onclick={changePasswordHandleSubmit}
					disabled={!changePasswordCanSubmit() || changePasswordIsLoading}
					class="changepassword-submit-btn"
				>
					{changePasswordIsLoading ? 'Submitting...' : 'Change Password'}
				</button>
			</div>
		</div>
	</div>
</div>

<!-- Cancel Confirmation Modal -->
{#if changePasswordShowCancelModal}
	<div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
		<div class="bg-white rounded-xl p-6 max-w-sm w-full mx-4" style="box-shadow: 0 20px 30px -8px rgba(0, 0, 0, 0.3);">
			<h3 class="text-lg font-bold text-gray-800 mb-2">Cancel Password Change?</h3>
			<p class="text-gray-600 mb-6">Your progress will be lost.</p>
			<div class="flex flex-row gap-3">
				<button onclick={changePasswordConfirmCancel} class="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 cursor-pointer">Yes</button>
				<button onclick={() => changePasswordShowCancelModal = false} class="flex-1 border-2 border-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-xl hover:bg-gray-50 transition-all duration-200 cursor-pointer">No</button>
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
	
	.changepassword-input-container {
		position: relative;
		display: flex;
		align-items: center;
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
		padding: 0.75rem 3rem 0.75rem 1rem;
		border: 2px solid #d1d5db;
		border-radius: 0.75rem;
		transition: border-color 0.2s;
		padding-right: 3rem;
	}
	
	.changepassword-input:focus {
		border-color: #01c0a4;
		outline: none;
	}
	
	.changepassword-input:disabled {
		opacity: 0.5;
	}
	
	.changepassword-toggle-btn {
		position: absolute;
		right: 0.75rem;
		background: none;
		border: none;
		color: #6b7280;
		cursor: pointer;
		padding: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: color 0.2s;
	}
	
	.changepassword-toggle-btn:hover:not(:disabled) {
		color: #374151;
	}
	
	.changepassword-toggle-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
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
		color: #6b7280;
		margin-left: 0;
		list-style-type: none;
		padding-left: 0;
	}
	
	.changepassword-hint-list > * + * {
		margin-top: 0.25rem;
	}
	
	.changepassword-requirement-met {
		color: #059669;
		font-weight: 500;
		transition: color 0.15s ease-in-out, font-weight 0.15s ease-in-out;
	}
	
	.changepassword-requirement-unmet {
		color: #dc2626;
		font-weight: 400;
		transition: color 0.15s ease-in-out, font-weight 0.15s ease-in-out;
	}
	
	.changepassword-requirement-icon {
		display: inline-block;
		width: 1rem;
		text-align: center;
		margin-right: 0.5rem;
		font-weight: bold;
		transition: all 0.15s ease-in-out;
	}
	
	.changepassword-actions {
		display: flex;
		flex-direction: row;
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
		flex: 1;
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
		flex: 1;
	}
	
	.changepassword-cancel-btn:hover:not(:disabled) {
		background-color: #f9fafb;
	}
	
	.changepassword-cancel-btn:disabled {
		opacity: 0.5;
	}
</style>
