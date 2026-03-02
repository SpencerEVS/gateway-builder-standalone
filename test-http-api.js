const express = require('express');
const app = express();

// Simple test to verify Express is working
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

app.get('/test', (req, res) => {
  res.json({
    message: 'HTTP API test successful',
    timestamp: new Date().toISOString()
  });
});

const port = 3002;
app.listen(port, () => {
  console.log(`🧪 Test HTTP server running on http://localhost:${port}`);
  console.log(`📡 Test endpoints:`);
  console.log(`   http://localhost:${port}/health`);
  console.log(`   http://localhost:${port}/test`);
});