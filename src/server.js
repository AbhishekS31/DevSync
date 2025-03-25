require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');const axios = require('axios');
const path = require('path');

const app = express();r(app);
const server = http.createServer(app);= new Server(server, {
const io = new Server(server, {
  cors: {
    origin: '*', methods: ['GET', 'POST']
    methods: ['GET', 'POST']
  }});
});

app.use(cors());app.use(express.static(path.join(__dirname, 'dist')));
app.use(express.static(path.join(__dirname, 'dist')));
const PORT = process.env.PORT || 3001;
const PORT = process.env.PORT || 3001;
 by room
// Store connected users by roomconst rooms = new Map();
const rooms = new Map();
s
// Store broadcasting status of usersconst broadcastingUsers = new Set();
const broadcastingUsers = new Set();

// Store file system state by roomconst fileSystemState = new Map();
const fileSystemState = new Map();

io.on('connection', (socket) => {console.log(`User connected: ${socket.id}`);
  console.log(`User connected: ${socket.id}`);
  
  // Join room ({ roomId, username }) => {
  socket.on('join-room', ({ roomId, username }) => {socket.join(roomId);
    socket.join(roomId);
    n't exist
    // Create room if it doesn't exist
    if (!rooms.has(roomId)) { rooms.set(roomId, new Map());
      rooms.set(roomId, new Map());}
    }
     this room if it doesn't exist
    // Initialize file system state for this room if it doesn't exist{
    if (!fileSystemState.has(roomId)) { fileSystemState.set(roomId, []);
      fileSystemState.set(roomId, []);}
    }
    
    // Add user to roomrooms.get(roomId).set(socket.id, { username });
    rooms.get(roomId).set(socket.id, { username });
    
    // Send updated user list to all clients in the room usersInRoom = Array.from(rooms.get(roomId).entries()).map(([id, data]) => ({
    const usersInRoom = Array.from(rooms.get(roomId).entries()).map(([id, data]) => ({
      id,ername: data.username
      username: data.username
    }));io.to(roomId).emit('users-update', usersInRoom);
    io.to(roomId).emit('users-update', usersInRoom);
    
    // Send the current file system state to the newly joined usersocket.emit('initial-file-system', fileSystemState.get(roomId));
    socket.emit('initial-file-system', fileSystemState.get(roomId));
    onsole.log(`User ${username} (${socket.id}) joined room ${roomId}`);
    console.log(`User ${username} (${socket.id}) joined room ${roomId}`);});
  });
  
  // File system operationsles }) => {
  socket.on('fs-update', ({ roomId, files }) => {
    if (fileSystemState.has(roomId)) {
      fileSystemState.set(roomId, files);s in the room
      // Broadcast the update to all other clients in the room socket.to(roomId).emit('fs-update', files);
      socket.to(roomId).emit('fs-update', files);
    }});
  });
  arentId }) => {
  socket.on('file-create', ({ roomId, file, parentId }) => {if (!fileSystemState.has(roomId)) return;
    if (!fileSystemState.has(roomId)) return;
    ew file
    // Update the file system state with the new fileconst files = fileSystemState.get(roomId);
    const files = fileSystemState.get(roomId);
    a parent, add to that parent's children
    // If file has a parent, add to that parent's children
    if (parentId) {des) => {
      const updateWithParent = (nodes) => {
        return nodes.map(node => {d === parentId) {
          if (node.id === parentId) {
            return {
              ...node,children: [...(node.children || []), file]
              children: [...(node.children || []), file] };
            };
          }hildren) {
          if (node.children) {
            return {
              ...node,children: updateWithParent(node.children)
              children: updateWithParent(node.children) };
            };
          }eturn node;
          return node;});
        });};
      };
      s);
      const updatedFiles = updateWithParent(files);fileSystemState.set(roomId, updatedFiles);
      fileSystemState.set(roomId, updatedFiles);
      room
      // Broadcast the update to all clients in the roomroomId).emit('fs-update', updatedFiles);
      io.to(roomId).emit('fs-update', updatedFiles);
    } else {
      // Add to root
      const updatedFiles = [...files, file];fileSystemState.set(roomId, updatedFiles);
      fileSystemState.set(roomId, updatedFiles);
      room
      // Broadcast the update to all clients in the room io.to(roomId).emit('fs-update', updatedFiles);
      io.to(roomId).emit('fs-update', updatedFiles);
    }});
  });
  }) => {
  socket.on('file-delete', ({ roomId, fileId }) => {if (!fileSystemState.has(roomId)) return;
    if (!fileSystemState.has(roomId)) return;
    g the file
    // Update the file system state by removing the fileconst files = fileSystemState.get(roomId);
    const files = fileSystemState.get(roomId);
     => {
    const deleteFromFiles = (nodes) => {
      return nodes.filter(node => {Id) return false;
        if (node.id === fileId) return false;
        if (node.children) { node.children = deleteFromFiles(node.children);
          node.children = deleteFromFiles(node.children);
        }eturn true;
        return true;});
      });};
    };
    );
    const updatedFiles = deleteFromFiles(files);fileSystemState.set(roomId, updatedFiles);
    fileSystemState.set(roomId, updatedFiles);
    room
    // Broadcast the update to all clients in the roomo.to(roomId).emit('fs-update', updatedFiles);
    io.to(roomId).emit('fs-update', updatedFiles);});
  });
   newName }) => {
  socket.on('file-rename', ({ roomId, fileId, newName }) => {if (!fileSystemState.has(roomId)) return;
    if (!fileSystemState.has(roomId)) return;
    g the file
    // Update the file system state by renaming the fileconst files = fileSystemState.get(roomId);
    const files = fileSystemState.get(roomId);
    ) => {
    const renameInFiles = (nodes) => {
      return nodes.map(node => {
        if (node.id === fileId) { return { ...node, name: newName };
          return { ...node, name: newName };
        }hildren) {
        if (node.children) {
          return {
            ...node,children: renameInFiles(node.children)
            children: renameInFiles(node.children) };
          };
        }eturn node;
        return node;});
      });};
    };
    
    const updatedFiles = renameInFiles(files);fileSystemState.set(roomId, updatedFiles);
    fileSystemState.set(roomId, updatedFiles);
    room
    // Broadcast the update to all clients in the roomo.to(roomId).emit('fs-update', updatedFiles);
    io.to(roomId).emit('fs-update', updatedFiles);});
  });
   fileId, content }) => {
  socket.on('file-update-content', ({ roomId, fileId, content }) => {if (!fileSystemState.has(roomId)) return;
    if (!fileSystemState.has(roomId)) return;
    
    // Update the file content in the stateconst files = fileSystemState.get(roomId);
    const files = fileSystemState.get(roomId);
     (nodes) => {
    const updateContentInFiles = (nodes) => {
      return nodes.map(node => {
        if (node.id === fileId) { return { ...node, content };
          return { ...node, content };
        }hildren) {
        if (node.children) {
          return {
            ...node,children: updateContentInFiles(node.children)
            children: updateContentInFiles(node.children) };
          };
        }eturn node;
        return node;});
      });};
    };
    files);
    const updatedFiles = updateContentInFiles(files);fileSystemState.set(roomId, updatedFiles);
    fileSystemState.set(roomId, updatedFiles);
    
    // Broadcast the update to all clients in the roomo.to(roomId).emit('file-content-updated', { fileId, content });
    io.to(roomId).emit('file-content-updated', { fileId, content });});
  });
  
  // Start broadcasting video
  socket.on('start-broadcasting', ({ roomId, userId }) => {arted broadcasting in room ${roomId}`);
    console.log(`User ${userId} started broadcasting in room ${roomId}`);broadcastingUsers.add(userId);
    broadcastingUsers.add(userId);
    s user is broadcasting
    // Notify all other users in the room that this user is broadcastingroomId).emit('user-broadcasting', { 
    socket.to(roomId).emit('user-broadcasting', {  
      roomId, serId 
      userId );
    });});
  });
  
  // Get room participantsipants', ({ roomId }, callback) => {
  socket.on('get-room-participants', ({ roomId }, callback) => {
    if (rooms.has(roomId)) {ray.from(rooms.get(roomId).keys());
      const participants = Array.from(rooms.get(roomId).keys());ck(participants);
      callback(participants);
    } else { callback([]);
      callback([]);
    }});
  });
  // Handle WebRTC signaling
  // Handle WebRTC signaling
  
  // Video offer
  socket.on('video-offer', (data) => {
    const { roomId, targetId, senderId, sdp } = data;senderId} to ${targetId}`);
    console.log(`Relaying video offer from ${senderId} to ${targetId}`);(targetId).emit('video-offer', {
    socket.to(targetId).emit('video-offer', {
      roomId,derId,
      senderId,dp
      sdp);
    });});
  });
  
  // Video answer
  socket.on('video-answer', (data) => {
    const { roomId, targetId, senderId, sdp } = data;senderId} to ${targetId}`);
    console.log(`Relaying video answer from ${senderId} to ${targetId}`);(targetId).emit('video-answer', {
    socket.to(targetId).emit('video-answer', {
      roomId,derId,
      senderId,dp
      sdp);
    });});
  });
  
  // ICE candidate
  socket.on('ice-candidate', (data) => {te } = data;
    const { roomId, targetId, senderId, candidate } = data;(targetId).emit('ice-candidate', {
    socket.to(targetId).emit('ice-candidate', {
      roomId,
      senderId,andidate
      candidate);
    });});
  });
  
  // Handle chat messages) => {
  socket.on('send-message', ({ message, roomId }) => {o.to(roomId).emit('chat-message', message);
    io.to(roomId).emit('chat-message', message);});
  });
  
  // Handle file sharing{
  socket.on('share-file', ({ roomId, file }) => {ocket.to(roomId).emit('file-shared', file);
    socket.to(roomId).emit('file-shared', file);});
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {const { query, model } = data;
    console.log(`User disconnected: ${socket.id}`);
    
    // Remove user from all rooms they were ins.post('https://api.groq.com/openai/v1/chat/completions', {
    rooms.forEach((users, roomId) => {
      if (users.has(socket.id)) {messages: [{ role: 'user', content: query }],
        users.delete(socket.id);
        
        // Remove room if empty
        if (users.size === 0) {
          rooms.delete(roomId);nt-Type': 'application/json',
          fileSystemState.delete(roomId);EY}`
        } else {
          // Notify remaining users that this user has left
          const usersInRoom = Array.from(users.entries()).map(([id, data]) => ({
            id,onse.status === 200) {
            username: data.usernamenst aiText = response.data.choices?.[0]?.message?.content || 'No response from AI';
          }));
          
          io.to(roomId).emit('users-update', usersInRoom);allback({ 
          io.to(roomId).emit('user-disconnected', { userId: socket.id });   success: false, 
        }   error: `API error: ${response.status} ${response.statusText}` 
      }    });
    });
    
    // Remove from broadcasting usersI:', error.message);
    if (broadcastingUsers.has(socket.id)) { callback({ 
      broadcastingUsers.delete(socket.id);   success: false, 
    }     error: error.response?.data?.error?.message || 'Failed to get response from AI service'
  });      });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);  // Handle disconnection


});  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // Remove user from all rooms they were in
    rooms.forEach((users, roomId) => {
      if (users.has(socket.id)) {
        users.delete(socket.id);
        
        // Remove room if empty
        if (users.size === 0) {
          rooms.delete(roomId);
          fileSystemState.delete(roomId);
        } else {
          // Notify remaining users that this user has left
          const usersInRoom = Array.from(users.entries()).map(([id, data]) => ({
            id,
            username: data.username
          }));
          
          io.to(roomId).emit('users-update', usersInRoom);
          io.to(roomId).emit('user-disconnected', { userId: socket.id });
        }
      }
    });
    
    // Remove from broadcasting users
    if (broadcastingUsers.has(socket.id)) {
      broadcastingUsers.delete(socket.id);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
