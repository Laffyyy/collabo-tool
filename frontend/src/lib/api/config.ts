/**
 * API configuration for different environments
 */
export const API_CONFIG = {
  baseUrl: 'http://localhost:5000',
  endpoints: {
    auth: {
      login: '/api/v1/auth/login', 
      otp: '/api/v1/auth/otp',           
      resendOtp: '/api/v1/auth/resend-otp', 
      logout: '/api/v1/auth/logout',      
      forgotPassword: '/api/v1/auth/forgot-password',
      resetPassword: '/api/v1/auth/reset-password'
    },
    securityQuestions: {
      getAll: '/api/v1/security-questions/questions',
      saveAnswers: '/api/v1/security-questions/user-answers',
      getUserQuestions: '/api/v1/security-questions/user-questions',
      verifyAnswers: '/api/v1/security-questions/verify-answers',
      checkUserStatus: '/api/v1/security-questions/user-status'
    },
    passwordChange: {
      changePassword: '/api/v1/password-change/change-password',
      checkRequired: '/api/v1/password-change/check-required'
    },
    user: {
      profile: '/api/v1/user/profile',
      settings: '/api/v1/user/settings',
      presence: '/api/v1/user/presence'
    }
  }
};