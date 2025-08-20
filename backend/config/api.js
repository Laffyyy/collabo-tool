const { env } = require('./index');

/**
 * API configuration settings for the backend
 */
const apiConfig = {
  // API version for URL construction
  version: 'v1',
  
  // Server configuration
  server: {
    // Get port from environment variable or use 5000 as default
    port: env.PORT || 5000,
    
    // Base URL constructed from environment variables or defaults
    baseUrl: env.API_BASE_URL || `http://localhost:${env.PORT || 5000}`,
    
    // Environment-specific settings
    env: env.NODE_ENV || 'development',
    
    // CORS configuration
    cors: {
      // Get allowed origins from environment or use frontend dev server as default
      origin: env.CORS_ORIGIN || 'http://localhost:5173'
    }
  },
  
  // Centralized endpoint definitions
  endpoints: {
    auth: {
      login: '/auth/login',
      otp: '/auth/otp',
      register: '/auth/register',
      password: '/auth/password',
      forgotPassword: '/auth/forgot-password',
      resetPassword: '/auth/reset-password',
      securityQuestions: '/auth/security-questions',
      firstTimeSetup: '/auth/first-time'
    },
    user: {
      profile: '/user/profile',
      settings: '/user/settings',
      presence: '/user/presence'
    },
    chat: {
      messages: '/chat/messages',
      groups: '/chat/groups',
      files: '/chat/files'
    },
    admin: {
      users: '/admin/users',
      groups: '/admin/groups',
      organizations: '/admin/organizations',
      logs: '/admin/logs',
      settings: '/admin/settings',
      broadcast: '/admin/broadcast'
    }
  },
  
  // Authentication settings
  auth: {
    tokenExpiration: env.TOKEN_EXP_MINUTES || 60, // minutes
    cookieName: 'token',
    cookieOptions: {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 1 day in ms
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict'
    }
  }
};

module.exports = apiConfig;