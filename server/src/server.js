require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const initChatSocket = require('./sockets/chat.socket');

const PORT = process.env.PORT || 3000;

async function start() {
  await connectDB();
  const httpServer = http.createServer(app);
  initChatSocket(httpServer);
  httpServer.listen(PORT, () => {
    console.log(`API listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
