// server.js
const http = require('http');
const app = require('./app');
const { redisClient } = require('./config/redisClient');
const { connectRabbitMQ } = require('./utils/rabbitmq');
const { connectToDatabase } = require('./config/db');
// const { consumePaymentSuccess } = require('./consumers/payment.consumer');

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

(async () => {
  await connectToDatabase();
  await connectRabbitMQ();
  // await consumePaymentSuccess()

  app.listen(2222, () => console.log('📚 Services Service running'));
})();

// Graceful shutdown
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

function shutdown() {
  console.log('🛑 Gracefully shutting down...');
  server.close(() => {
    console.log('✅ HTTP server closed');
    redisClient.quit().then(() => {
      console.log('🔌 Redis client closed');
      process.exit(0);
    });
  });
}