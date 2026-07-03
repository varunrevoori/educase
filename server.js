const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { initDB } = require('./config/db');
const profileRoutes = require('./routes/profileRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/profiles', profileRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'GitHub Profile Analyzer API is running.' 
  });
});

// Root fallback
app.get('/', (req, res) => {
  res.send('Welcome to the GitHub Profile Analyzer API. Use the API endpoints at /api/profiles.');
});

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'An unexpected internal server error occurred' });
});

// Start Server
async function startServer() {
  try {
    console.log('Initializing database connection pool...');
    await initDB();
    app.listen(PORT, () => {
      console.log(`==================================================`);
      console.log(`🚀 GitHub Profile Analyzer API is live!`);
      console.log(`👉 Server Port: ${PORT}`);
      console.log(`👉 Health check: http://localhost:${PORT}/health`);
      console.log(`==================================================`);
    });
  } catch (error) {
    console.error('❌ Server failed to start:', error.message);
    process.exit(1);
  }
}

module.exports = app;

startServer();
