// import { ZegoExpressEngine } from 'zego-express-engine-webrtc';

// let zegoEngine: ZegoExpressEngine | null = null;

// // ZEGO credentials - these should be in environment variables
// const appID = parseInt(import.meta.env.VITE_ZEGO_APP_ID || '0', 10);
// const serverSecret = import.meta.env.VITE_ZEGO_SERVER_SECRET || '';
// const server = 'wss://webliveroom-api.zego.im/ws';

// export const initializeZego = () => {
//   if (!zegoEngine) {
//     try {
//       if (!appID || !serverSecret) {
//         throw new Error('Zego credentials not configured');
//       }

//       zegoEngine = new ZegoExpressEngine(appID, server);
      
//       // Set up event handlers
//       zegoEngine.on('roomStreamUpdate', (roomID, updateType, streamList) => {
//         console.log('Room stream update:', { roomID, updateType, streamList });
//       });

//       zegoEngine.on('roomUserUpdate', (roomID, updateType, userList) => {
//         console.log('Room user update:', { roomID, updateType, userList });
//       });

//       zegoEngine.on('publisherStateUpdate', (result) => {
//         console.log('Publisher state update:', result);
//       });

//       zegoEngine.on('playerStateUpdate', (result) => {
//         console.log('Player state update:', result);
//       });
//     } catch (error) {
//       console.error('Failed to initialize Zego:', error);
//       return null;
//     }
//   }
//   return zegoEngine;
// };

// // Generate token for authentication
// const generateToken = (userID: string, roomID: string, effectiveTimeInSeconds = 3600): string => {
//   if (!serverSecret) {
//     throw new Error('Server secret not configured');
//   }

//   const timestamp = Math.floor(Date.now() / 1000);
//   const nonce = Math.floor(Math.random() * 2147483647);

//   const payload = {
//     app_id: appID,
//     user_id: userID,
//     room_id: roomID,
//     privilege: {
//       1: 1, // Login room permission
//       2: 1  // Publish permission
//     },
//     stream_id_list: null,
//     effective_time_in_seconds: effectiveTimeInSeconds,
//     create_time: timestamp,
//     nonce
//   };

//   // In a production environment, this token should be generated on the server side
//   // This is just for demonstration purposes
//   const token = btoa(JSON.stringify(payload));
//   return token;
// };

// // Join the room
// export const joinRoom = async (roomID: string, userID: string, userName: string) => {
//   if (!zegoEngine) return;

//   try {
//     const token = generateToken(userID, roomID);

//     await zegoEngine.loginRoom(roomID, token, {
//       userID,
//       userName,
//     }, {
//       userUpdate: true,
//       maxMemberCount: 4,
//     });

//     console.log('Successfully joined room:', roomID);
//   } catch (error) {
//     console.error('Failed to join room:', error);
//     throw error;
//   }
// };

// // Start video call
// export const startVideoCall = async (localStream: HTMLVideoElement) => {
//   if (!zegoEngine) return;

//   try {
//     // Get user media
//     const mediaStream = await navigator.mediaDevices.getUserMedia({
//       audio: true,
//       video: true,
//     });

//     // Set up local preview
//     localStream.srcObject = mediaStream;
//     await localStream.play().catch(() => {
//       console.warn('Local stream play was interrupted');
//     });

//     // Create and publish stream
//     const streamID = `stream-${Date.now()}`;
//     await zegoEngine.startPublishingStream(streamID, mediaStream);

//     return mediaStream;
//   } catch (error) {
//     console.error('Failed to start video call:', error);
//     throw error;
//   }
// };

// // Leave room
// export const leaveRoom = async () => {
//   if (!zegoEngine) return;

//   try {
//     await zegoEngine.stopPublishingStream();
//     await zegoEngine.logoutRoom();
//   } catch (error) {
//     console.error('Failed to leave room:', error);
//   }
// };

// // Destroy Zego engine instance
// export const destroyZego = () => {
//   if (zegoEngine) {
//     try {
//       zegoEngine.stopPublishingStream();
//       zegoEngine.logoutRoom();
//       zegoEngine.off('roomStreamUpdate');
//       zegoEngine.off('roomUserUpdate');
//       zegoEngine.off('publisherStateUpdate');
//       zegoEngine.off('playerStateUpdate');
//       zegoEngine = null;
//     } catch (error) {
//       console.error('Error destroying Zego:', error);
//     }
//   }
// };