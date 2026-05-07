// ─────────────────────────────────────────────────────
// GrievAI — MongoDB Connection (Mongoose)
// ─────────────────────────────────────────────────────
const mongoose = require('mongoose');

let isConnected = false;

async function connectDB() {
  if (isConnected) return;

  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is not defined in .env');

  try {
    await mongoose.connect(uri, {
      maxPoolSize: 10,          // max 10 concurrent connections
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    console.log(`✅ MongoDB connected: ${mongoose.connection.host}`);

    // Auto-create indexes on startup
    mongoose.connection.once('open', () => {
      console.log('📦 MongoDB connection open');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB error:', err.message);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected, will retry on next request');
      isConnected = false;
    });

  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);       // crash fast on startup failure
  }
}

module.exports = { connectDB };
