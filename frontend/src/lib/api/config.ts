/**
 * API configuration for different environments
 */
export const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  endpoints: {
    auth: {
      login: '/api/v1/auth/login', 
      otp: '/api/v1/auth/otp',           
      resendOtp: '/api/v1/auth/resend-otp', 
      logout: '/api/v1/auth/logout',      
      forgotPassword: '/api/v1/auth/forgot-password',
      resetPassword: '/api/v1/auth/reset-password',
      securityQuestions: '/api/v1/auth/security-questions',
      answerSecurityQuestions: '/api/v1/auth/answer-security-questions'
    },
    user: {
      profile: '/api/v1/user/profile',
      settings: '/api/v1/user/settings',
      presence: '/api/v1/user/presence'
    },
    admin: {
      dashboard: '/api/v1/admin/dashboard',
      users: '/api/v1/admin/users',
      organizations: '/api/v1/admin/organizations',
      config: '/api/v1/admin/config',
      logs: '/api/v1/admin/logs'
    }
  }
};