const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const routes = require('./routes');
const { env } = require('./config');
const chatRoutes = require('./routes/v1/chat.routes');



const app = express();

// Core Middlewares
app.use(helmet());
const corsEnv = (env.CORS_ORIGIN || '').trim();
const allowAllOrigins = corsEnv === '*';
const corsOrigins = allowAllOrigins
  ? []
  : (corsEnv ? corsEnv.split(',').map((o) => o.trim()).filter(Boolean) : ['http://localhost:5173']);

app.use(cors({
  origin: allowAllOrigins
    ? true // reflect request origin (required when credentials: true)
    : function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if(!origin) return callback(null, true);
        if(corsOrigins.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true, service: 'collabo-tool-backend', env: env.NODE_ENV || 'development' });
});

// API Routes
app.use('/api/chat', chatRoutes);
app.use('/api', routes);

// 404 handler
app.use((req, res, _next) => {
  if (res.headersSent) {
    return; // Do nothing if headers already sent
  }
  return res.status(404).json({ ok: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  if (res.headersSent) {
    return next(err);
  }
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  return res.status(statusCode).json({
    ok: false,
    message: message,
    ...(env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;
