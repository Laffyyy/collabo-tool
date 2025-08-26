<script lang="ts">
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { apiClient } from '$lib/api/client';
    import { API_CONFIG } from '$lib/api/config';
    import { authStore } from '$lib/stores/auth.svelte';
    import type { OtpVerificationResponse, LoginResponse } from '$lib/api/types';
    
    let otpValues = $state(['', '', '', '', '', '']);
    let otpTimeLeft = $state(300); // 5 minutes in seconds
    let otpResendTimeLeft = $state(150); // 2:30 in seconds for resend availability
    let otpIsExpired = $state(false);
    let otpIsLoading = $state(false);
    let otpResendLoading = $state(false);
    let otpShowCancelModal = $state(false);
    let otpFromForgotPassword = false;
    let userEmail = $state('');
    let userId = $state('');
    let otpError = $state('');
    let otpSuccessMessage = $state('');
    
    // Timer functionality
    let otpTimerInterval: ReturnType<typeof setInterval>;
    let otpResendTimerInterval: ReturnType<typeof setInterval>;
    
onMount(() => {
        // Check if coming from forgot password
        const urlParams = new URLSearchParams(window.location.search);
        otpFromForgotPassword = urlParams.get('from') === 'forgot-password';
        
        // Get stored user data from localStorage
        userId = localStorage.getItem('auth_userId') || '';
        userEmail = localStorage.getItem('auth_userEmail') || '';
        const username = localStorage.getItem('auth_username') || '';
        
        console.log('Retrieved from localStorage - userId:', userId);
        console.log('Retrieved from localStorage - userEmail:', userEmail);
        
        // If no email is found, redirect back to login
        if (!userEmail) {
            goto('/login');
            return;
        }
        
        // Check if OTP has expired
        const expiresAt = parseInt(localStorage.getItem('auth_otpExpiresAt') || '0');
        if (expiresAt < Date.now()) {
            otpIsExpired = true;
        } else {
            // Set remaining time
            otpTimeLeft = Math.floor((expiresAt - Date.now()) / 1000);
            otpResendTimeLeft = Math.min(otpTimeLeft - 150, 150); // Resend after 2:30 or half the remaining time
        }
        
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
            otpError = '';
            
            const otpCode = otpValues.join('');
            
            try {
                const username = localStorage.getItem('auth_username');
                const userId = localStorage.getItem('auth_userId');
                
                console.log('Submitting OTP with:', { username, userId, otpCode });
                
                if (!username || !userId) {
                    otpError = 'Session expired. Please log in again.';
                    otpIsLoading = false;
                    return;
                }

                const data = await apiClient.post<{
                    ok: boolean;
                    user: {
                        id: string;
                        username: string;
                        email: string;
                        firstName: string;
                        lastName: string;
                        role: string;
                        mustChangePassword?: boolean;
                        profilePhotoUrl?: string;
                        organizationUnit?: string;
                        onlineStatus?: 'online' | 'away' | 'idle' | 'offline';
                        ouId?: string;
                    };
                    token: string;
                    sessionToken: string;
                    refreshToken: string;
                    expiresAt: string;
                    message: string;
                }>(
                    API_CONFIG.endpoints.auth.otp,
                    {
                        username,
                        userId,
                        otp: otpCode
                    }
                );
                
                console.log('OTP verification response:', data);
                
                if (data.ok) {
                    if (data.user) {
                        // For first-time users (mustChangePassword = true), store data for security question setup
                        if (data.user?.mustChangePassword) {
                            // Store user data in localStorage for the first-time setup flow
                            localStorage.setItem('firstTime_userId', data.user.id);
                            localStorage.setItem('firstTime_username', data.user.username);
                            localStorage.setItem('firstTime_email', data.user.email);
                            localStorage.setItem('firstTime_role', data.user.role);
                            localStorage.setItem('firstTime_name', `${data.user.firstName} ${data.user.lastName}`);
                            
                            // Keep the temporary password if it exists (from registration)
                            const tempPassword = localStorage.getItem('auth_tempPassword');
                            if (tempPassword) {
                                localStorage.setItem('firstTime_tempPassword', tempPassword);
                            }
                            
                            // Clear OTP-related localStorage
                            localStorage.removeItem('auth_userId');
                            localStorage.removeItem('auth_userEmail');
                            localStorage.removeItem('auth_otpExpiresAt');
                            localStorage.removeItem('auth_username');
                            localStorage.removeItem('auth_tempPassword');
                            
                            // Redirect to first-time security question setup
                            goto('/first-time');
                            return;
                        }
                        
                        // For returning users, format user data correctly for the auth store
                        const formattedUser = {
                            id: data.user.id,
                            username: data.user.username,
                            email: data.user.email,
                            role: data.user.role,
                            firstName: data.user.firstName,
                            lastName: data.user.lastName,
                            organizationUnit: data.user.organizationUnit,
                            onlineStatus: data.user.onlineStatus || 'online',
                            profilePhoto: data.user.profilePhotoUrl,
                            ouId: data.user.ouId
                        };
                        
                        // Login with the properly formatted user data
                        $authStore.login(
                            formattedUser,
                            data.token,
                            data.sessionToken
                        );
                        
                        // Clear OTP-related localStorage
                        localStorage.removeItem('auth_userId');
                        localStorage.removeItem('auth_userEmail');
                        localStorage.removeItem('auth_otpExpiresAt');
                        localStorage.removeItem('auth_username');
                        localStorage.removeItem('auth_tempPassword');
                        
                        // Wait a tick to ensure auth store is updated before navigation
                        await new Promise(resolve => setTimeout(resolve, 0));
                        
                        // Redirect based on user role
                        console.log('Redirecting user with role:', data.user.role);
                        if (data.user.role.toLowerCase() === 'admin') {
                            goto('/admin/user-management');
                        } else {
                            goto('/chat');
                        }
                    } else {
                        otpError = 'Invalid user data received. Please try again.';
                        otpIsLoading = false;
                        return;
                    }
                } else {
                    otpError = data.message || 'Invalid OTP';
                    otpIsLoading = false;
                }
            } catch (error: any) {
                console.error('OTP verification error:', error);
                otpError = error.message || 'Connection error. Please try again.';
                otpIsLoading = false;
            }
        }
    };
    
        const otpHandleResend = async () => {
            // Only allow resend if resend timer has reached zero
            if (otpResendTimeLeft > 0 || otpIsLoading || otpResendLoading) {
                return;
            }
            
            otpResendLoading = true;
            otpValues = ['', '', '', '', '', ''];
            otpError = '';
            otpSuccessMessage = '';
            
            try {
                // Get username from localStorage
                const username = localStorage.getItem('auth_username') || userEmail;
                
                if (!username) {
                    otpError = 'Session expired. Please log in again.';
                    otpResendLoading = false;
                    return;
                }
                
                // Use the API client to call the dedicated resend-otp endpoint
                const data = await apiClient.post<LoginResponse>(
                    API_CONFIG.endpoints.auth.resendOtp, 
                    { username }
                );
                
                if (!data.ok) {
                    throw new Error(data.message || 'Failed to resend verification code');
                }
                
                // Update stored data in localStorage
                localStorage.setItem('auth_userId', data.userId);
                localStorage.setItem('auth_userEmail', data.email);
                localStorage.setItem('auth_username', data.username);
                
                // Set new expiry time (5 minutes from now)
                const expiryTime = Date.now() + (5 * 60 * 1000);
                localStorage.setItem('auth_otpExpiresAt', expiryTime.toString());
                
                // Reset timers
                otpTimeLeft = 300; // 5 minutes
                otpResendTimeLeft = 150; // 2:30 minutes
                otpIsExpired = false;
                
                // Restart timers
                otpStartTimers();
                
                // Show success message
                otpSuccessMessage = 'New verification code sent to your email';
                
                // Focus first input
                document.getElementById('otp-input-0')?.focus();
            } catch (error: any) {
                console.error('OTP resend error:', error);
                otpError = error.message || 'Failed to resend verification code';
            } finally {
                otpResendLoading = false;
            }
        };
    
    const otpHandleCancel = () => {
        otpShowCancelModal = true;
    };
    
    const otpConfirmCancel = () => {
        // Clear OTP data
        localStorage.removeItem('auth_userId');
        localStorage.removeItem('auth_userEmail');
        localStorage.removeItem('auth_otpExpiresAt');
        localStorage.removeItem('auth_username');
        localStorage.removeItem('auth_tempPassword');
        
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
            <p class="otp-subtitle">We've sent a 6-digit code to {userEmail}</p>
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
            
            {#if otpError}
                <div class="otp-error">
                    {otpError}
                </div>
            {/if}
            
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
    
    .otp-error {
        text-align: center;
        color: #dc2626;
        margin-bottom: 1rem;
        font-size: 0.875rem;
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