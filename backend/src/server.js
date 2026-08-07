const app = require('./app');
const config = require('./config/env');
const connectDB = require('./config/db');

async function start() {
  await connectDB();

  const server = app.listen(config.port, () => {
    console.log(`[server] FundFlow API running on port ${config.port} (${config.env})`);
  });

  // Fail loudly instead of leaving the process in a half-broken state.
  process.on('unhandledRejection', (err) => {
    console.error('[server] Unhandled rejection:', err);
    server.close(() => process.exit(1));
  });
}

start().catch((err) => {
  console.error('[server] Failed to start:', err);
  process.exit(1);
});
