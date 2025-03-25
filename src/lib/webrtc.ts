import { getSocket } from './socket';

type VideoChatEventCallback = (data: any) => void;

interface VideoCallState {
  localStream: MediaStream | null;
  peerConnections: Map<string, RTCPeerConnection>;
  remoteStreams: Map<string, MediaStream>;
  roomId: string;
  userId: string;
  activeParticipants: Set<string>;
}

// Video call state
const state: VideoCallState = {
  localStream: null,
  peerConnections: new Map(),
  remoteStreams: new Map(),
  roomId: '',
  userId: '',
  activeParticipants: new Set()
};

// ICE servers for WebRTC
const iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    {
      urls: 'turn:numb.viagenie.ca',
      credential: 'muazkh',
      username: 'webrtc@live.com',
    },
  ],
};

// Setup socket event listeners for WebRTC signaling
export const setupVideoCallListeners = () => {
  const socket = getSocket();
  if (!socket) return;

  // Listen for incoming call offers
  socket.on('video-offer', async (data) => {
    console.log('Received video offer from:', data.senderId);
    await handleVideoOffer(data);
  });

  // Listen for call answers
  socket.on('video-answer', async (data) => {
    console.log('Received video answer from:', data.senderId);
    await handleVideoAnswer(data);
  });

  // Listen for ICE candidates from peers
  socket.on('ice-candidate', async (data) => {
    console.log('Received ICE candidate from:', data.senderId);
    await handleNewICECandidate(data);
  });

  // Listen for users leaving
  socket.on('user-disconnected', (data) => {
    console.log('User disconnected:', data.userId);
    handleUserDisconnected(data.userId);
  });
  
  // Listen for new users joining the room who need to be called
  socket.on('new-user-to-call', async (data) => {
    const { userId, username } = data;
    console.log('New user joined room and needs to be called:', userId);
    // Create connection with this new user if we're currently broadcasting
    if (state.localStream) {
      try {
        await initiateCallToUser(state.roomId, state.userId, userId);
      } catch (error) {
        console.error('Failed to call new user:', error);
      }
    }
  });
  
  // Listen for broadcasting status updates from other users
  socket.on('user-broadcasting', (data) => {
    console.log('User is broadcasting:', data.userId);
    // If we're not already in a call with this user, we should call them
    if (!state.peerConnections.has(data.userId) && state.localStream) {
      initiateCallToUser(state.roomId, state.userId, data.userId);
    }
  });
};

// Initialize media devices and create local stream
export const initializeLocalStream = async (
  video: boolean = true,
  audio: boolean = true
): Promise<MediaStream> => {
  try {
    if (state.localStream) {
      // Stop all existing tracks
      state.localStream.getTracks().forEach(track => track.stop());
    }
    
    const stream = await navigator.mediaDevices.getUserMedia({
      video,
      audio,
    });
    
    state.localStream = stream;
    return stream;
  } catch (error) {
    console.error('Error accessing media devices:', error);
    throw new Error('Could not access camera or microphone. Please check permissions.');
  }
};

// Create a new peer connection for a specific user
export const createPeerConnection = (targetUserId: string): RTCPeerConnection => {
  // Close existing connection if it exists
  if (state.peerConnections.has(targetUserId)) {
    state.peerConnections.get(targetUserId)?.close();
  }
  
  const peerConnection = new RTCPeerConnection(iceServers);
  
  // Add all local tracks to the peer connection
  if (state.localStream) {
    state.localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, state.localStream!);
    });
  }
  
  // Set up event handlers
  peerConnection.onicecandidate = (event) => handleICECandidateEvent(event, targetUserId);
  peerConnection.ontrack = (event) => handleTrackEvent(event, targetUserId);
  peerConnection.oniceconnectionstatechange = () => handleConnectionStateChange(peerConnection, targetUserId);
  
  state.peerConnections.set(targetUserId, peerConnection);
  state.activeParticipants.add(targetUserId);
  
  return peerConnection;
};

// Start a video call broadcast to the room
export const startVideoCall = async (roomId: string, userId: string): Promise<void> => {
  const socket = getSocket();
  if (!socket) throw new Error('Socket connection not established');
  
  state.roomId = roomId;
  state.userId = userId;
  
  // Notify server that we're broadcasting and ready to receive calls
  socket.emit('start-broadcasting', {
    roomId,
    userId
  });
  
  // Get list of other users in the room to call
  socket.emit('get-room-participants', { roomId }, async (participants: string[]) => {
    console.log('Room participants to call:', participants);
    
    // Call each participant
    for (const participantId of participants) {
      if (participantId !== userId) {
        try {
          await initiateCallToUser(roomId, userId, participantId);
        } catch (error) {
          console.error(`Error calling participant ${participantId}:`, error);
        }
      }
    }
  });
};

// Initiate a call to a specific user
const initiateCallToUser = async (roomId: string, senderId: string, targetId: string): Promise<void> => {
  try {
    const peerConnection = createPeerConnection(targetId);
    
    // Create an offer
    const offer = await peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true
    });
    
    await peerConnection.setLocalDescription(offer);
    
    // Send the offer to the target user
    const socket = getSocket();
    if (!socket) throw new Error('Socket connection lost');
    
    socket.emit('video-offer', {
      roomId,
      senderId,
      targetId,
      sdp: peerConnection.localDescription
    });
    
    console.log('Sent video offer to:', targetId);
  } catch (error) {
    console.error('Error creating offer:', error);
    throw new Error('Failed to create offer');
  }
};

// End call with a specific user
export const endCallWithUser = async (targetUserId: string): Promise<void> => {
  // Close the peer connection
  if (state.peerConnections.has(targetUserId)) {
    const pc = state.peerConnections.get(targetUserId)!;
    pc.close();
    
    state.peerConnections.delete(targetUserId);
    state.remoteStreams.delete(targetUserId);
    state.activeParticipants.delete(targetUserId);
    
    // Notify UI that remote stream has ended
    const videoEndEvent = new CustomEvent('remote-stream-ended', {
      detail: { userId: targetUserId }
    });
    window.dispatchEvent(videoEndEvent);
  }
};

// End all calls
export const endVideoCall = async (): Promise<void> => {
  // Close all peer connections
  state.peerConnections.forEach((pc, userId) => {
    pc.close();
  });
  
  // Clear maps and sets
  state.peerConnections.clear();
  state.remoteStreams.clear();
  state.activeParticipants.clear();
  
  // Stop local stream tracks
  if (state.localStream) {
    state.localStream.getTracks().forEach(track => track.stop());
    state.localStream = null;
  }
  
  // Notify UI that all calls have ended
  const callEndEvent = new CustomEvent('call-ended');
  window.dispatchEvent(callEndEvent);
};

// Toggle video on/off
export const toggleVideo = (enabled: boolean): void => {
  if (!state.localStream) return;
  
  state.localStream.getVideoTracks().forEach(track => {
    track.enabled = enabled;
  });
};

// Toggle audio on/off
export const toggleAudio = (enabled: boolean): void => {
  if (!state.localStream) return;
  
  state.localStream.getAudioTracks().forEach(track => {
    track.enabled = enabled;
  });
};

// Handle incoming video offers
const handleVideoOffer = async (data: any): Promise<void> => {
  const { senderId, sdp, roomId } = data;
  
  try {
    // Make sure we have local media before accepting the call
    if (!state.localStream) {
      state.localStream = await initializeLocalStream(true, true);
    }
    
    // Create peer connection for this user
    const peerConnection = createPeerConnection(senderId);
    
    // Set the remote description from the offer
    await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
    
    // Create an answer
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    
    // Send the answer
    const socket = getSocket();
    if (!socket) throw new Error('Socket connection lost');
    
    socket.emit('video-answer', {
      roomId,
      senderId: state.userId,
      targetId: senderId,
      sdp: peerConnection.localDescription
    });
    
    console.log('Sent video answer to:', senderId);
    
    // Notify that we've accepted the call and are sending our stream
    const videoAcceptedEvent = new CustomEvent('video-call-accepted', {
      detail: { 
        userId: senderId
      }
    });
    window.dispatchEvent(videoAcceptedEvent);
  } catch (error) {
    console.error('Error handling offer:', error);
  }
};

// Handle video answers
const handleVideoAnswer = async (data: any): Promise<void> => {
  const { senderId, sdp } = data;
  
  if (!state.peerConnections.has(senderId)) {
    console.warn('No peer connection for user:', senderId);
    return;
  }
  
  try {
    const peerConnection = state.peerConnections.get(senderId)!;
    await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
    console.log('Set remote description for:', senderId);
  } catch (error) {
    console.error('Error handling answer:', error);
  }
};

// Handle new ICE candidates
const handleNewICECandidate = async (data: any): Promise<void> => {
  const { senderId, candidate } = data;
  
  if (!state.peerConnections.has(senderId)) {
    console.warn('No peer connection for user:', senderId);
    return;
  }
  
  try {
    const peerConnection = state.peerConnections.get(senderId)!;
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    console.log('Added ICE candidate for:', senderId);
  } catch (error) {
    console.error('Error adding ICE candidate:', error);
  }
};

// Handle user disconnection
const handleUserDisconnected = (userId: string): void => {
  // Clean up resources for this user
  endCallWithUser(userId);
};

// Handle ICE candidate events
const handleICECandidateEvent = (event: RTCPeerConnectionIceEvent, targetUserId: string) => {
  if (event.candidate) {
    const socket = getSocket();
    if (!socket) return;
    
    socket.emit('ice-candidate', {
      roomId: state.roomId,
      senderId: state.userId,
      targetId: targetUserId,
      candidate: event.candidate
    });
    
    console.log('Sent ICE candidate to:', targetUserId);
  }
};

// Handle track events (receiving remote streams)
const handleTrackEvent = (event: RTCTrackEvent, userId: string) => {
  console.log('Received track from:', userId);
  
  // Store the remote stream
  state.remoteStreams.set(userId, event.streams[0]);
  
  // Notify UI that we have a remote stream
  const videoCallEvent = new CustomEvent('remote-stream-ready', {
    detail: { 
      userId: userId,
      stream: event.streams[0] 
    }
  });
  window.dispatchEvent(videoCallEvent);
};

// Handle connection state changes
const handleConnectionStateChange = (peerConnection: RTCPeerConnection, userId: string) => {
  console.log(`Connection state with ${userId}: ${peerConnection.iceConnectionState}`);
  
  switch(peerConnection.iceConnectionState) {
    case "failed":
    case "closed":
    case "disconnected":
      // Handle disconnection
      endCallWithUser(userId);
      break;
  }
};

// Get a list of active call participants
export const getActiveParticipants = (): string[] => {
  return Array.from(state.activeParticipants);
};

// Check if a call with a specific user is active
export const isCallActiveWithUser = (userId: string): boolean => {
  return state.activeParticipants.has(userId);
};

// Get the local stream
export const getLocalStream = (): MediaStream | null => {
  return state.localStream;
};

// Get the remote stream for a specific user
export const getRemoteStream = (userId: string): MediaStream | null => {
  return state.remoteStreams.get(userId) || null;
};

// Accept an incoming call offer
export const acceptCall = async (offer: RTCSessionDescriptionInit): Promise<void> => {
  const peerConnection = state.peerConnections.values().next().value;
  if (!peerConnection) {
    throw new Error('No active peer connection to accept call');
  }
  
  try {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    
    const socket = getSocket();
    if (!socket) return;
    
    socket.emit('video-answer', {
      roomId: state.roomId,
      senderId: state.userId,
      targetId: Array.from(state.peerConnections.keys())[0],
      sdp: peerConnection.localDescription
    });
  } catch (error) {
    console.error('Error accepting call:', error);
    throw error;
  }
};

// Process an answer to our offer
export const processAnswer = async (answer: RTCSessionDescriptionInit): Promise<void> => {
  const peerConnection = state.peerConnections.values().next().value;
  if (!peerConnection) return;
  
  try {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  } catch (error) {
    console.error('Error processing answer:', error);
    throw error;
  }
};

// Add a received ICE candidate
export const addIceCandidate = async (candidate: RTCIceCandidateInit): Promise<void> => {
  // Try to add the candidate to all peer connections
  for (const peerConnection of state.peerConnections.values()) {
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  }
};
