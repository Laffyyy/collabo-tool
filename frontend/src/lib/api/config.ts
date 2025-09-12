export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const API_CONFIG = {
  baseUrl: API_BASE_URL,
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
      validateResetToken: '/api/v1/auth/validate-reset-token',
      sessionInfo: '/api/v1/auth/session-info', // Fixed: added v1
      refreshSession: '/api/v1/auth/refresh-session'
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
      checkRequired: '/api/v1/password-change/check-required',
      answerSecurityQuestions: '/api/v1/auth/answer-security-questions',
      sessionInfo: '/api/v1/auth/session-info', // Fixed: added v1
      refreshSession: '/api/v1/auth/refresh-session'
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
    },
    broadcast: {
      create: '/api/v1/broadcast',
      getOUs: '/api/v1/broadcast/ou',
      getRoles: '/api/v1/broadcast/roles',
      templates: '/api/v1/broadcast/templates'
    },
    broadcastResponse: {
      acknowledge: '/api/v1/broadcast-responses/:id/acknowledge',
      preferredDate: '/api/v1/broadcast-responses/:id/preferred-date',
      choice: '/api/v1/broadcast-responses/:id/choice',
      text: '/api/v1/broadcast-responses/:id/text',
      myResponse: '/api/v1/broadcast-responses/:id/my-response',
      allResponses: '/api/v1/broadcast-responses/:id/responses',
      stats: '/api/v1/broadcast-responses/:id/stats'
    }
  }
};