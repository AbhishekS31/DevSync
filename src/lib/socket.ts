import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const connectSocket = () => {
  try {
    if (!socket) {
      socket = io('http://localhost:3001', {
        autoConnect: false,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socket.on('connect', () => {
        console.log('Socket connected with ID:', socket?.id);
      });

      socket.on('connect_error', (err: Error) => {
        console.log('Connection failed:', err.message);
      });

      socket.on('disconnect', (reason: string) => {
        console.log('Socket disconnected:', reason);
      });

      // Add call-related event handlers
      socket.on('call-started', ({ userId, roomId }) => {
        console.log('Call started:', { userId, roomId });
      });

      socket.on('call-ended', ({ userId, roomId }) => {
        console.log('Call ended:', { userId, roomId });
      });

      // Add file sharing event handlers
      socket.on('file-shared', (file) => {
        console.log('File shared:', file);
      });
    }

    if (!socket.connected) {
      socket.connect();
    }

    return socket;
  } catch (error) {
    console.error('Error connecting to socket:', error);
    throw error;
  }
};

export const getSocket = () => {
  if (!socket) {
    socket = connectSocket();
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket?.connected) {
    socket.disconnect();
    console.log('Socket disconnected');
  }
};

export { socket };