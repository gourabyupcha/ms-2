const amqp = require('amqplib');

let channel = null;

const connectRabbitMQ = async () => {
  const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost:5672');
  channel = await connection.createChannel();
  console.log('✅ Connected to RabbitMQ');
};

const getChannel = () => {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized');
  }
  return channel;
};

module.exports = {
  connectRabbitMQ,
  getChannel,
};
