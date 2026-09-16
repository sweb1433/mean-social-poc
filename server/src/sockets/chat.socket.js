const { Server } = require('socket.io');
const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');
const Message = require('../models/Message');

// userId -> Set of socket ids. A plain in-memory map is fine here because
// this only ever runs as a single Node process on one EC2 instance - no
// need for a Redis adapter at this scale.
const onlineUsers = new Map();

function initChatSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: process.env.FRONTEND_URL || '*' },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) throw new Error('missing token');
      const payload = verifyToken(token);
      const user = await User.findById(payload.id);
      if (!user) throw new Error('user not found');
      socket.userId = String(user._id);
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const { userId } = socket;

    // Every socket for this user joins a personal room, so a message "to"
    // this user reaches all of their open tabs/devices at once.
    socket.join(`user:${userId}`);

    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);
    io.emit('online-users', [...onlineUsers.keys()]);

    socket.on('send-message', async ({ to, text } = {}, ack) => {
      const trimmed = (text || '').trim();
      if (!trimmed || !to) return ack?.({ error: 'Recipient and text are required' });

      const recipientExists = await User.exists({ _id: to });
      if (!recipientExists) return ack?.({ error: 'Recipient not found' });

      const message = await Message.create({ from: userId, to, text: trimmed });

      // Broadcast to both sides of the conversation (recipient + all of the
      // sender's own open tabs) instead of also pushing via the ack, so
      // there's a single source of truth for "a message landed".
      io.to(`user:${to}`).to(`user:${userId}`).emit('new-message', message.toJSON());
      ack?.({ ok: true });
    });

    socket.on('disconnect', () => {
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) onlineUsers.delete(userId);
      }
      io.emit('online-users', [...onlineUsers.keys()]);
    });
  });

  return io;
}

module.exports = initChatSocket;
