<script lang="ts">
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import { apiClient } from '$lib/api/client';
    import { API_CONFIG } from '$lib/api/config';

    // Fisher-Yates shuffle algorithm for randomizing array order
    function shuffleArray<T>(array: T[]): T[] {
        const shuffled = [...array]; // Create a copy to avoid mutating original
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    
    let securityQuestions: Array<{ id: string; questionText: string }> = $state([]);
    let currentQuestionIndex = $state(0);
    let securityQuestionAnswer = $state('');
    let securityQuestionIsLoading = $state(false);
    let securityQuestionError = $state('');
    let securityQuestionShowCancelModal = $state(false);
    let securityQuestionAttempts = $state(0);
    let securityQuestionMaxAttempts = $state(3);
    let securityQuestionInput: HTMLInputElement | undefined;
    let fromForgotPassword = $state(false);
    let resetToken = $state('');
    let userId = $state('');
    let isLoading = $state(true);
    let isExpired = $state(false);
    
    // Computed property for current question text - Svelte 5 way
    let currentQuestionText = $derived(
        securityQuestions.length > 0 && currentQuestionIndex < securityQuestions.length 
            ? securityQuestions[currentQuestionIndex].questionText 
            : ''
    );

    // Computed property for remaining attempts
    let remainingAttempts = $derived(securityQuestionMaxAttempts - securityQuestionAttempts);
    
    onMount(async () => {
        // Check if coming from forgot password flow via URL params
        const urlParams = new URLSearchParams(window.location.search);
        fromForgotPassword = urlParams.get('from') === 'forgot-password';
        const tokenParam = urlParams.get('token');
        
        if (fromForgotPassword && tokenParam) {
            resetToken = tokenParam;
            // Store the token for the password change flow
            localStorage.setItem('auth_resetToken', tokenParam);
            
            // Decode the token to get user information
            try {
                await loadUserFromResetToken(tokenParam);
            } catch (error) {
                console.error('Failed to load user from reset token:', error);
                
                // Check if it's an expiration error
                if (error instanceof Error && (
                    error.message.includes('expired') || 
                    error.message.includes('Invalid or expired') ||
                    error.message.includes('token has expired')
                )) {
                    isExpired = true;
                } else {
                    securityQuestionError = 'Invalid reset link. Please request a new one.';
                }
                isLoading = false;
                return;
            }
        } else {
            // Check if we have user data from previous steps
            userId = localStorage.getItem('auth_userId') || '';
            if (!userId) {
                console.log('No user data found, redirecting to login');
                goto('/login');
                return;
            }
        }
        
        // Load user's security questions
        if (userId) {
            await loadUserSecurityQuestions();
        }
        
        isLoading = false;
        
        // Auto-focus the answer input
        setTimeout(() => {
            if (securityQuestionInput) {
                securityQuestionInput.focus();
            }
        }, 100);
    });

    async function loadUserFromResetToken(token: string) {
        try {
            // Validate the reset token and get user info
            const response = await apiClient.post<{
                ok: boolean;
                userId: string;
                message?: string;
            }>('/api/v1/auth/validate-reset-token', { token });

            if (response.ok && response.userId) {
                userId = response.userId;
                localStorage.setItem('auth_resetUserId', userId);
            } else {
                throw new Error(response.message || 'Invalid reset token');
            }
        } catch (error: any) {
            throw new Error(error.message || 'Failed to validate reset token');
        }
    }

    async function loadUserSecurityQuestions() {
        try {
            const response = await apiClient.get<{
                ok: boolean;
                questions: Array<{
                    id: string;
                    questionId: string;
                    questionText: string;
                    createdAt: string;
                }>;
                message?: string;
            }>(`${API_CONFIG.endpoints.securityQuestions.userQuestions}/${userId}`);

            if (response.ok && response.questions && response.questions.length > 0) {
                // Map the questions to the expected format
                const mappedQuestions = response.questions.map(q => ({
                    id: q.questionId,
                    questionText: q.questionText
                }));
                
                // Randomize the order of questions using Fisher-Yates shuffle
                securityQuestions = shuffleArray(mappedQuestions);
                currentQuestionIndex = 0;
            } else {
                throw new Error('No security questions found for this user');
            }
        } catch (error: any) {
            console.error('Failed to load security questions:', error);
            securityQuestionError = 'Failed to load security questions. Please contact support.';
        }
    }
    
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
        
        try {
            // Verify the security answer with the backend
            const response = await apiClient.post<{
                ok: boolean;
                verified: boolean;
                message: string;
            }>(`${API_CONFIG.endpoints.securityQuestions.verifyAnswers}`, {
                userId,
                questionAnswers: [{
                    questionId: securityQuestions[currentQuestionIndex].id,
                    answer: securityQuestionAnswer.trim()
                }]
            });

            if (response.ok && response.verified) {
                // Security question answered correctly
                if (fromForgotPassword) {
                    // Pass the token to the change password page
                    goto(`/change-password?from=forgot-password&token=${resetToken}`);
                } else {
                    goto('/change-password?from=security-question');
                }
            } else {
                // Wrong answer - increment attempts and show warning
                securityQuestionAttempts++;
                securityQuestionAnswer = ''; // Clear the input
                
                if (securityQuestionAttempts >= securityQuestionMaxAttempts) {
                    securityQuestionError = 'Maximum attempts exceeded. Please contact support or try requesting a new password reset link.';
                } else {
                    const remaining = securityQuestionMaxAttempts - securityQuestionAttempts;
                    securityQuestionError = `Incorrect answer. You have ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`;
                }
                
                // Auto-focus back to input for retry (unless max attempts reached)
                if (securityQuestionAttempts < securityQuestionMaxAttempts) {
                    setTimeout(() => {
                        if (securityQuestionInput) {
                            securityQuestionInput.focus();
                        }
                    }, 100);
                }
            }
        } catch (error: any) {
            console.error('Security question verification error:', error);
            securityQuestionAttempts++;
            securityQuestionAnswer = ''; // Clear the input
            
            if (securityQuestionAttempts >= securityQuestionMaxAttempts) {
                securityQuestionError = 'Maximum attempts exceeded. Please contact support or try requesting a new password reset link.';
            } else {
                const remaining = securityQuestionMaxAttempts - securityQuestionAttempts;
                securityQuestionError = `Verification failed. You have ${remaining} attempt${remaining === 1 ? '' : 's'} remaining. Please try again.`;
            }
            
            // Auto-focus back to input for retry (unless max attempts reached)
            if (securityQuestionAttempts < securityQuestionMaxAttempts) {
                setTimeout(() => {
                    if (securityQuestionInput) {
                        securityQuestionInput.focus();
                    }
                }, 100);
            }
        } finally {
            securityQuestionIsLoading = false;
        }
    };
    
    const securityQuestionHandleCancel = () => {
        securityQuestionShowCancelModal = true;
    };
    
    const securityQuestionConfirmCancel = () => {
        // Clear any stored reset data
        localStorage.removeItem('auth_resetToken');
        localStorage.removeItem('auth_resetUserId');
        goto('/login');
    };

    const handleExpiredGoBack = () => {
        // Clear any stored reset data
        localStorage.removeItem('auth_resetToken');
        localStorage.removeItem('auth_resetUserId');
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
            <h1 class="securityquestion-title">
                {isExpired ? 'Link Expired' : 'Security Question'}
            </h1>
            <p class="securityquestion-subtitle">
                {isExpired 
                    ? 'Your password reset link has expired' 
                    : 'Verify your identity to proceed with password recovery'
                }
            </p>
        </div>
        
        <div class="securityquestion-form">
            {#if isLoading}
                <div class="securityquestion-loading">
                    <div class="spinner"></div>
                    <p>Loading your security question...</p>
                </div>
            {:else if isExpired}
                <div class="securityquestion-expired">
                    <div class="securityquestion-expired-icon">⏰</div>
                    <p class="securityquestion-expired-message">
                        The password reset link you clicked has expired. Password reset links are only valid for a limited time for security reasons.
                    </p>
                    <p class="securityquestion-expired-instruction">
                        Please request a new password reset link from the login page.
                    </p>
                    <div class="securityquestion-expired-actions">
                        <button 
                            onclick={handleExpiredGoBack}
                            class="securityquestion-expired-btn"
                        >
                            Go Back to Login Page
                        </button>
                    </div>
                </div>
            {:else if securityQuestionAttempts >= securityQuestionMaxAttempts}
                <div class="securityquestion-error">
                    {securityQuestionError}
                    <div class="securityquestion-max-attempts-actions">
                        <button 
                            onclick={() => goto('/login')} 
                            class="securityquestion-back-to-login-btn"
                        >
                            Back to Login
                        </button>
                    </div>
                </div>
            {:else if currentQuestionText}
                {#if securityQuestionError}
                    <div class="securityquestion-error">
                        {securityQuestionError}
                    </div>
                {/if}
                
                <div class="securityquestion-question">
                    <label class="securityquestion-label" for="securityQuestionInput">Question:</label>
                    <div class="securityquestion-question-text">
                        {currentQuestionText}
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
                        disabled={securityQuestionIsLoading}
                    />
                </div>
                
                <div class="securityquestion-attempts {securityQuestionAttempts > 0 ? 'securityquestion-attempts-warning' : ''}">
                    Attempts: {securityQuestionAttempts} / {securityQuestionMaxAttempts}
                    {#if securityQuestionAttempts > 0 && remainingAttempts > 0}
                        <span class="securityquestion-remaining">({remainingAttempts} remaining)</span>
                    {/if}
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
                        disabled={securityQuestionIsLoading || !securityQuestionAnswer.trim()}
                        class="securityquestion-submit-btn"
                    >
                        {securityQuestionIsLoading ? 'Verifying...' : 'Submit Answer'}
                    </button>
                </div>
            {:else}
                <div class="securityquestion-error">
                    No security questions found. Please contact support.
                </div>
            {/if}
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

    .securityquestion-loading {
        text-align: center;
        padding: 2rem 0;
    }

    .spinner {
        border: 3px solid #f3f4f6;
        border-top: 3px solid #01c0a4;
        border-radius: 50%;
        width: 2rem;
        height: 2rem;
        animation: spin 1s linear infinite;
        margin: 0 auto 1rem;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    .securityquestion-expired {
        text-align: center;
        padding: 1.5rem 0;
    }

    .securityquestion-expired-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
        opacity: 0.7;
    }

    .securityquestion-expired-message {
        color: #374151;
        font-size: 0.875rem;
        line-height: 1.5rem;
        margin-bottom: 1rem;
    }

    .securityquestion-expired-instruction {
        color: #6b7280;
        font-size: 0.875rem;
        line-height: 1.25rem;
        margin-bottom: 2rem;
    }

    .securityquestion-expired-actions {
        margin-top: 1.5rem;
    }

    .securityquestion-expired-btn {
        background-color: #01c0a4;
        color: white;
        padding: 0.875rem 2rem;
        border-radius: 0.75rem;
        font-weight: 500;
        border: none;
        cursor: pointer;
        transition: background-color 0.2s;
        font-size: 0.875rem;
    }

    .securityquestion-expired-btn:hover {
        background-color: #00a085;
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
    
    .securityquestion-max-attempts-actions {
        margin-top: 1rem;
        text-align: center;
    }
    
    .securityquestion-back-to-login-btn {
        background-color: #dc2626;
        color: white;
        padding: 0.75rem 1.5rem;
        border-radius: 0.75rem;
        font-weight: 500;
        border: none;
        cursor: pointer;
        transition: background-color 0.2s;
    }
    
    .securityquestion-back-to-login-btn:hover {
        background-color: #b91c1c;
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
        transition: color 0.2s;
    }
    
    .securityquestion-attempts-warning {
        color: #dc2626;
        font-weight: 500;
    }
    
    .securityquestion-remaining {
        color: #dc2626;
        font-weight: 500;
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