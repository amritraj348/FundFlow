const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

const MONGO_STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'FundFlow API is healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    mongo: MONGO_STATES[mongoose.connection.readyState],
  });
});

module.exports = router;
