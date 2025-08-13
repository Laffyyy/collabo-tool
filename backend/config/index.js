const env = {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-me',
  CORS_ORIGIN: process.env.CORS_ORIGIN,
  TOKEN_EXP_MINUTES: Number(process.env.TOKEN_EXP_MINUTES || 60),
};

module.exports = { env };

