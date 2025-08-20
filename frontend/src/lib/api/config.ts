/**
 * API configuration for different environments
 */
export const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  version: 'v1',
  endpoints: {
    auth: {
      login: '/auth/login',
      otp: '/auth/otp',
      resendOtp: '/auth/resend-otp',
      register: '/auth/register',
      password: '/auth/password',
      forgotPassword: '/auth/forgot-password',
      securityQuestions: '/auth/security-questions'
    },
    user: {
      profile: '/user/profile',
      settings: '/user/settings'
    },
    chat: {
      messages: '/chat/messages',
      groups: '/chat/groups'
    }
  }
};