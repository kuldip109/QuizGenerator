require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Import routes
const authRoutes = require('./routes/auth');
const quizRoutes = require('./routes/quiz');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(compression());

// Logging
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/quiz', quizRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'AI Quiz Application API',
    version: '1.0.0',
    endpoints: {
      auth: {
        login: 'POST /api/auth/login',
        register: 'POST /api/auth/register'
      },
      quiz: {
        generate: 'POST /api/quiz/generate',
        submit: 'POST /api/quiz/submit',
        retry: 'POST /api/quiz/retry',
        history: 'GET /api/quiz/history',
        getQuiz: 'GET /api/quiz/:id',
        hint: 'POST /api/quiz/hint',
        leaderboard: 'GET /api/quiz/leaderboard'
      }
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║         AI Quiz Application Server                    ║
║                                                       ║
║  Status: Running                                      ║
║  Port: ${PORT}                                        ║
║  Environment: ${process.env.NODE_ENV || 'development'}                              ║
║                                                       ║
║  API Documentation: http://localhost:${PORT}/         ║
║  Health Check: http://localhost:${PORT}/health        ║
╚═══════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
