const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const routes = require('./routes');
const { env } = require('./config');

//Import route modules
const securityQuestionsRoutes = require('./routes/v1/securityQuestions.routes');
const passwordChangeRoutes = require('./routes/v1/passwordChange.routes');

const app = express();

// Core Middlewares
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true, service: 'collabo-tool-backend', env: env.NODE_ENV || 'development' });
});

// API Routes
app.use('/api', routes);

// V1 API Routes
app.use('/api/v1/security-questions', securityQuestionsRoutes);
app.use('/api/v1/password-change', passwordChangeRoutes);

// 404 handler
app.use((req, res, _next) => {
  res.status(404).json({ ok: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({ ok: false, message });
});

module.exports = app;

