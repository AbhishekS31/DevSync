import { Server } from 'socket.io';
import http from 'http';
import { v4 as uuidv4 } from 'uuid';

const server = http.createServer();

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true,
  },
});

const generateRoomId = () => {
  return uuidv4().split('-')[0];
};

const rooms = new Map();
const calls = new Map();
const sharedFiles = new Map();

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('create-room', () => {
    const roomId = generateRoomId();
    console.log(`Room created with ID: ${roomId}`);
    rooms.set(roomId, { users: [] });
    sharedFiles.set(roomId, []);
    socket.emit('room-id', roomId);
  });

  socket.on('join-room', ({ roomId, username }) => {
    if (!rooms.has(roomId)) {
      rooms.set(roomId, { users: [] });
      sharedFiles.set(roomId, []);
    }

    const room = rooms.get(roomId);
    const user = { id: socket.id, username };
    room.users.push(user);
    socket.join(roomId);

    // Send existing shared files to the new user
    const files = sharedFiles.get(roomId) || [];
    files.forEach(file => {
      socket.emit('file-shared', file);
    });

    // Notify other users in the room
    socket.to(roomId).emit('user-joined', { userId: socket.id });
    io.to(roomId).emit('users-update', room.users);
    console.log(`${username} (${socket.id}) joined room ${roomId}`);
  });

  // File sharing
  socket.on('share-file', ({ roomId, file }) => {
    if (!sharedFiles.has(roomId)) {
      sharedFiles.set(roomId, []);
    }
    
    const files = sharedFiles.get(roomId);
    // Check if file already exists
    const fileExists = files.some(f => f.id === file.id);
    
    if (!fileExists) {
      files.push(file);
      socket.to(roomId).emit('file-shared', file);
      console.log(`File ${file.name} shared in room ${roomId}`);
    }
  });

  // WebRTC signaling
  socket.on('signal', ({ userId, signal }) => {
    socket.to(userId).emit('user-signal', {
      userId: socket.id,
      signal
    });
  });

  socket.on('disconnect', () => {
    console.log(`A user disconnected: ${socket.id}`);

    // End any active calls
    calls.forEach((call, key) => {
      if (call.from === socket.id || call.to === socket.id) {
        io.to(call.roomId).emit('call-ended', {
          userId: call.from === socket.id ? call.to : call.from,
          roomId: call.roomId,
        });
        calls.delete(key);
      }
    });

    // Remove user from rooms
    rooms.forEach((room, roomId) => {
      const userIndex = room.users.findIndex(user => user.id === socket.id);
      if (userIndex > -1) {
        room.users.splice(userIndex, 1);
        socket.leave(roomId);
        io.to(roomId).emit('users-update', room.users);
        console.log(`${socket.id} left room ${roomId}`);
      }
    });
  });

  socket.on('send-message', ({ roomId, message }) => {
    io.to(roomId).emit('chat-message', message);
  });
});

server.listen(3001, () => {
  console.log('Server is running on http://localhost:3001');
});