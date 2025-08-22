export const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  version: 'v1',
  endpoints: {
    auth: {
      login: '/api/v1/auth/login',
      otp: '/api/v1/auth/otp',
      resendOtp: '/api/v1/auth/resend-otp',
      register: '/api/v1/auth/register',
      password: '/api/v1/auth/password',
      forgotPassword: '/api/v1/auth/forgot-password',
      resetPassword: '/api/v1/auth/reset-password',
      securityQuestions: '/api/v1/auth/security-questions',
      validateResetToken: '/api/v1/auth/validate-reset-token'
    },
    securityQuestions: {
      questions: '/api/v1/security-questions/questions',
      saveAnswers: '/api/v1/security-questions/user-answers',
      userQuestions: '/api/v1/security-questions/user-questions',
      verifyAnswers: '/api/v1/security-questions/verify-answers',
      userStatus: '/api/v1/security-questions/user-status'
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