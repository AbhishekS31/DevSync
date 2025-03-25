import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, VideoOff, Users, Mic, MicOff, Camera, X, PhoneCall } from 'lucide-react';
import { getSocket } from '../lib/socket';
import {
  initializeLocalStream,
  createPeerConnection,
  startVideoCall,
  endCallWithUser,
  endVideoCall,
  toggleAudio,
  toggleVideo,
  setupVideoCallListeners,
  getLocalStream,
  getRemoteStream,
  isCallActiveWithUser
} from '../lib/webrtc';

interface User {
  id: string;
  username: string;
  isVideoEnabled?: boolean;
  isAudioEnabled?: boolean;
  isInCall?: boolean;
}

interface UserListProps {
  roomId: string;
  onVideoCall: (userId: string) => void;
  onVoiceCall: (userId: string) => void;
}

export const UserList: React.FC<UserListProps> = ({ 
  roomId,
  onVideoCall,
  onVoiceCall
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [activeUserCall, setActiveUserCall] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [hasRemoteStream, setHasRemoteStream] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  
  const localVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  
  const socket = getSocket();

  // Get the current user's ID from the socket
  useEffect(() => {
    if (socket && socket.id) {
      setCurrentUserId(socket.id);
    }
  }, [socket]);

  // Set up WebRTC event listeners
  useEffect(() => {
    if (!socket || !roomId) return;

    // Set up WebRTC listeners
    setupVideoCallListeners();

    // Get user list from the server
    socket.on('users-update', (updatedUsers: User[]) => {
      setUsers(updatedUsers);
    });

    // Listen for remote stream events
    const handleRemoteStream = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.stream && customEvent.detail.userId) {
        const { userId, stream } = customEvent.detail;
        
        console.log('Received remote stream from user:', userId);
        setActiveUserCall(userId);
        setHasRemoteStream(true);
        
        // Update the remote video element
        const videoElement = remoteVideoRefs.current.get(userId);
        if (videoElement) {
          videoElement.srcObject = stream;
          videoElement.play().catch(err => {
            console.error("Error playing remote video:", err);
          });
        }
      }
    };

    // Listen for video call accepted events
    const handleVideoCallAccepted = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.userId) {
        console.log('Video call accepted by user:', customEvent.detail.userId);
      }
    };

    // Listen for remote stream ended events
    const handleRemoteStreamEnded = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.userId) {
        const { userId } = customEvent.detail;
        
        if (activeUserCall === userId) {
          setActiveUserCall(null);
          setHasRemoteStream(false);
        }
      }
    };

    // Listen for call ended events
    const handleCallEnded = () => {
      setActiveUserCall(null);
      setHasRemoteStream(false);
    };

    window.addEventListener('remote-stream-ready', handleRemoteStream);
    window.addEventListener('remote-stream-ended', handleRemoteStreamEnded);
    window.addEventListener('call-ended', handleCallEnded);
    window.addEventListener('video-call-accepted', handleVideoCallAccepted);

    return () => {
      socket.off('users-update');
      window.removeEventListener('remote-stream-ready', handleRemoteStream);
      window.removeEventListener('remote-stream-ended', handleRemoteStreamEnded);
      window.removeEventListener('call-ended', handleCallEnded);
      window.removeEventListener('video-call-accepted', handleVideoCallAccepted);
      endVideoCall();
    };
  }, [roomId]);

  // Update video elements when active call changes
  useEffect(() => {
    if (activeUserCall) {
      // Check if we need to update the remote video element
      const remoteStream = getRemoteStream(activeUserCall);
      const remoteVideoElement = remoteVideoRefs.current.get(activeUserCall);
      
      if (remoteStream && remoteVideoElement && !remoteVideoElement.srcObject) {
        remoteVideoElement.srcObject = remoteStream;
        remoteVideoElement.play().catch(err => {
          console.error("Error playing remote video:", err);
        });
      }
    }
  }, [activeUserCall]);

  // Reference callback for local video elements
  const localVideoRef = (userId: string) => (element: HTMLVideoElement | null) => {
    if (element) {
      localVideoRefs.current.set(userId, element);
      
      // If we have a local stream, set it as the srcObject
      const localStream = getLocalStream();
      if (localStream && !element.srcObject) {
        element.srcObject = localStream;
        element.play().catch(err => {
          console.error("Error playing local video:", err);
        });
      }
    }
  };

  // Reference callback for remote video elements
  const remoteVideoRef = (userId: string) => (element: HTMLVideoElement | null) => {
    if (element) {
      remoteVideoRefs.current.set(userId, element);
      
      // If we have a remote stream for this user, set it as the srcObject
      const remoteStream = getRemoteStream(userId);
      if (remoteStream && !element.srcObject) {
        element.srcObject = remoteStream;
        element.play().catch(err => {
          console.error("Error playing remote video:", err);
        });
      }
    }
  };

  const handleEndCall = async () => {
    if (activeUserCall) {
      await endCallWithUser(activeUserCall);
      setActiveUserCall(null);
      setHasRemoteStream(false);
    }
  };

  const handleToggleVideo = () => {
    const newState = !isVideoEnabled;
    toggleVideo(newState);
    setIsVideoEnabled(newState);
  };

  const handleToggleAudio = () => {
    const newState = !isAudioEnabled;
    toggleAudio(newState);
    setIsAudioEnabled(newState);
  };

  const handleStartCall = async (userId: string, username: string) => {
    try {
      // Don't start a call if one is already active
      if (activeUserCall) {
        setError('Already in a call. End the current call first.');
        return;
      }
      
      setIsConnecting(true);
      setError(null);
      
      // Initialize local media
      const localStream = await initializeLocalStream(true, true);
      
      // Update the local video element
      const localVideoElement = localVideoRefs.current.get(currentUserId);
      if (localVideoElement) {
        localVideoElement.srcObject = localStream;
        localVideoElement.play().catch(err => {
          console.error("Error playing local video:", err);
        });
      }
      
      // Start broadcasting to all users in the room
      await startVideoCall(roomId, currentUserId);
      
      setActiveUserCall(currentUserId); // Set ourselves as the active call
      setIsAudioEnabled(true);
      setIsVideoEnabled(true);
      setIsConnecting(false);
    } catch (error: any) {
      console.error('Error creating call:', error);
      setError(error.message || 'Failed to start call');
      setIsConnecting(false);
      setActiveUserCall(null);
    }
  };

  const getRandomColor = (username: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-yellow-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-red-500',
      'bg-teal-500'
    ];

    const index = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  // Determine if this user is the current user (using the socket ID)
  const isCurrentUser = (userId: string) => {
    return userId === currentUserId;
  };

  return (
    <div className="w-72 bg-white dark:bg-gray-900 border-l-2 border-black p-2">
      <div className="flex items-center justify-between mb-4 px-2 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-md">
        <div className="flex items-center gap-2">
          <Users size={18} />
          <h3 className="font-bold">Team Members</h3>
        </div>
        <div className="bg-white/20 px-2 py-0.5 rounded-full text-sm">
          {users.length} online
        </div>
      </div>

      <div className="space-y-4">
        <AnimatePresence>
          {users.map((user) => (
            <motion.div
              key={user.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="neo-brutal bg-white dark:bg-gray-800 rounded-lg overflow-hidden"
            >
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${getRandomColor(user.username)}`}>
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-sm font-medium">{user.username}</span>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-xs text-gray-500">Online</span>
                        {isCurrentUser(user.id) && <span className="ml-1 text-xs text-blue-500">(You)</span>}
                      </div>
                    </div>
                  </div>
                  {/* Only show call button for the current user */}
                  {isCurrentUser(user.id) && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleStartCall(user.id, user.username)}
                      className={`p-1.5 ${
                        activeUserCall === user.id 
                          ? 'bg-green-500 hover:bg-green-600' 
                          : 'bg-blue-500 hover:bg-blue-600'
                      } text-white rounded-full flex items-center justify-center`}
                      disabled={isConnecting || (activeUserCall !== null && activeUserCall !== user.id)}
                    >
                      <PhoneCall size={16} />
                    </motion.button>
                  )}
                </div>
              </div>

              {/* Expandable video call section */}
              <AnimatePresence>
                {activeUserCall !== null && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="bg-gray-900 relative overflow-hidden"
                  >
                    {isConnecting ? (
                      <div className="flex items-center justify-center h-36 p-2">
                        <div className="text-center text-white">
                          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white mx-auto mb-2"></div>
                          <p className="text-sm">Connecting...</p>
                        </div>
                      </div>
                    ) : error ? (
                      <div className="flex items-center justify-center h-24 p-2">
                        <div className="text-center text-white">
                          <p className="text-red-400 text-sm mb-2">{error}</p>
                          <button
                            onClick={() => setError(null)}
                            className="px-3 py-1 bg-gray-700 rounded-md text-sm hover:bg-gray-600"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative h-64">
                        {/* Show local video in the main container */}
                        <div className="w-full h-full flex items-center justify-center bg-gray-800">
                          {isVideoEnabled ? (
                            <video
                              ref={localVideoRef(currentUserId)}
                              autoPlay
                              playsInline
                              muted
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <VideoOff size={40} className="text-white/70" />
                              <p className="text-white text-sm ml-2">Camera is off</p>
                            </div>
                          )}
                        </div>
                        
                        {/* Status indicator for active call */}
                        <div className="absolute top-2 left-2 bg-green-500 px-2 py-1 rounded text-xs text-white">
                          Your video is being shared
                        </div>
                        
                        {/* Controls */}
                        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleToggleAudio}
                            className={`p-2 rounded-full ${
                              isAudioEnabled ? 'bg-blue-500' : 'bg-red-500'
                            } text-white neo-brutal`}
                          >
                            {isAudioEnabled ? <Mic size={14} /> : <MicOff size={14} />}
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleToggleVideo}
                            className={`p-2 rounded-full ${
                              isVideoEnabled ? 'bg-blue-500' : 'bg-red-500'
                            } text-white neo-brutal`}
                          >
                            {isVideoEnabled ? <Camera size={14} /> : <VideoOff size={14} />}
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleEndCall}
                            className="p-2 rounded-full bg-red-500 text-white neo-brutal"
                          >
                            <X size={14} />
                          </motion.button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};