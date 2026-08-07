const mongoose = require('mongoose');
const config = require('./env');

async function connectDB() {
  mongoose.connection.on('connected', () => {
    console.log(`[mongo] connected -> ${mongoose.connection.name}`);
  });

  mongoose.connection.on('error', (err) => {
    console.error('[mongo] connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[mongo] disconnected');
  });

  await mongoose.connect(config.mongoUri);
}

module.exports = connectDB;
