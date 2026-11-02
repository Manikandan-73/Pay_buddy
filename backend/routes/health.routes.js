/**
 * System Health & Observability Routes
 */

const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'paybuddy-api',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    memoryUsage: process.memoryUsage()
  });
});

module.exports = router;
