const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const passport = require('passport');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const receiptRoutes = require('./routes/receipts');
const aiRoutes = require('./routes/ai');
const recurringTransactionRoutes = require('./routes/recurringTransactionRoutes');
const scheduleRecurringTransactions = require('./utils/recurringTransactionScheduler');
const logger = require('./utils/logger');

const app = express();

// Security middleware
app.use(helmet());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'https://typeface-finance-app.vercel.app'
    ];
    
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin || allowedOrigins.some(allowed => 
      origin.startsWith(allowed) || 
      origin.includes('accounts.google.com') ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1')
    )) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-HTTP-Method-Override'
  ],
  exposedHeaders: [
    'set-cookie',
    'Content-Length',
    'X-Foo',
    'X-Bar'
  ],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Enable CORS pre-flight across the board
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

// Rate limiting (relaxed in development)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 10000,
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({
  verify: (req, res, buf) => {
    // Store the raw body for signature verification if needed
    req.rawBody = buf.toString();
  }
}));
app.use(express.urlencoded({ extended: true }));

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/recurring-transactions', recurringTransactionRoutes);

// Special route for Google OAuth that needs to handle raw text
app.use('/auth/google', express.text({ type: 'text/*' }));

// Static files for uploaded receipts
app.use('/uploads', express.static('uploads'));

// MongoDB connection with retry logic
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/finance-app';

const connectWithRetry = () => {
  return mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
};

// Handle MongoDB connection events
mongoose.connection.on('error', (err) => {
  logger.error('MongoDB connection error:', err);
  // Try to reconnect after 5 seconds
  setTimeout(() => connectWithRetry(), 5000);
});

mongoose.connection.on('connected', () => {
  logger.info('Successfully connected to MongoDB');
  
  // Initialize recurring transaction scheduler after successful connection
  if (process.env.NODE_ENV !== 'test') {
    try {
      scheduleRecurringTransactions();
      logger.info('Recurring transaction scheduler started');
    } catch (error) {
      logger.error('Failed to start recurring transaction scheduler:', error);
    }
  }
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

// Initial connection attempt
connectWithRetry().catch(err => {
  logger.error('Initial MongoDB connection failed:', err);
  process.exit(1);
});

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/v1/receipts', receiptRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/recurring-transactions', recurringTransactionRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime() 
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/finance-app')
.then(() => {
  console.log('✅ Connected to MongoDB');
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  console.log('⚠️  Server will start without database connection');
  console.log('💡 To fix this, install MongoDB or set MONGODB_URI environment variable');
  // Don't exit the process, let the server start without DB
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📖 API Documentation: https://github.com/ItsAJ1005/typeface-finance-app?tab=readme-ov-file#-api-endpoints`);
});