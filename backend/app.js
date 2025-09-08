const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const routes = require('./routes');
const { env } = require('./config');

const app = express();

// Core Middlewares
app.use(helmet());

// CORS configuration (development-friendly)
const defaultCorsOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];
const envOrigins = env.CORS_ORIGIN ? env.CORS_ORIGIN.split(',').map(o => o.trim()).filter(Boolean) : [];
const corsOrigins = Array.from(new Set([
  ...defaultCorsOrigins,
  ...envOrigins
]));

const isAllowedOrigin = (origin) => {
  if (!origin) return true; // Allow tools like curl/Postman
  if (corsOrigins.includes(origin)) return true;
  try {
    const { hostname } = new URL(origin);
    // Allow ngrok *.ngrok-free.app during development
    if (/\.ngrok-free\.app$/i.test(hostname)) return true;
  } catch (_e) {
    // fall through
  }
  return false;
};

const corsOptions = {
  origin: function(origin, callback) {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    // Don't throw; just disable CORS for this origin
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
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
