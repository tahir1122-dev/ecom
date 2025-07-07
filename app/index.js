import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
dotenv.config();
import userRoutes from './routes/user.route.js';
import productRoutes from './routes/product.route.js';
import authRoutes from './routes/auth.route.js';
import { connectDB } from './lib/db.js';
import { createAdmin } from './controllers/user.controller.js';

const app = express();
app.use(cookieParser());

app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.json({ limit: '10mb' }));

// Update CORS for Railway
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? [
      process.env.FRONTEND_URL || 'https://boneandbone.netlify.app',
      process.env.RAILWAY_STATIC_URL ? `https://${process.env.RAILWAY_STATIC_URL}` : null
    ].filter(Boolean)
  : [
      'http://localhost:5173', 
      'http://localhost:3000', 
      'http://192.168.18.118:5173'
    ];

app.use(cors({
  origin: function(origin, callback) {
    console.log('Request origin:', origin);
    
    if (!origin) return callback(null, true);
    
    if (process.env.NODE_ENV !== 'production') {
      if (origin.startsWith('http://192.168.18.118') || 
          origin.includes('localhost') || 
          origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
    }
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    console.log(`Origin ${origin} not allowed by CORS`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Use Railway's PORT or default
const PORT = process.env.PORT || 5801;

app.get('/', (req, res) => {
  res.json({ 
    message: 'Backend is working now!',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/auth', authRoutes);

const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  }
});

// Initialize database and start server
const startServer = async () => {
  try {
    console.log('🌐 Initializing database connection...');
    await connectDB();
    console.log('✅ Database connection established');
    
    await createAdmin();
    console.log('✅ Admin user ensured');
    
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server started on port: ${PORT}`);
      console.log(`📦 Environment: ${process.env.NODE_ENV}`);
      
      // For Railway, log the service URL
      if (process.env.RAILWAY_STATIC_URL) {
        console.log(`🌍 Service URL: https://${process.env.RAILWAY_STATIC_URL}`);
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;