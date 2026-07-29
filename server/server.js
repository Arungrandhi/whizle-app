require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

// Import routes
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const adRoutes = require('./routes/adRoutes');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Share socket instance globally
app.set('io', io);

// Socket.io Connection Handlers
io.on('connection', (socket) => {
  socket.on('joinBusiness', (businessId) => {
    if (businessId) {
      socket.join(businessId.toString());
      console.log(`Socket connected: client joined business room ${businessId}`);
    }
  });

  socket.on('joinSuperAdmin', () => {
    socket.join('superadmin');
    console.log('Socket connected: client joined superadmin room');
  });

  socket.on('disconnect', () => {
    // disconnected
  });
});

// Connect to Database
connectDB();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' })); // expanded limit for base64 branding images
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check Route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Whistlez & Tokens Server is healthy and running' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/superadmin', superAdminRoutes);
app.use('/api/ads', adRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
