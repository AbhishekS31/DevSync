import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Mic, MicOff, PhoneOff, Video, VideoOff, X } from 'lucide-react';
import { Button } from './ui/button';
import { 
  initializeLocalStream, 
  createPeerConnection, 
  startVideoCall, 
  endVideoCall, 
  toggleAudio, 
  toggleVideo,
  setupVideoCallListeners,
  acceptCall,
  processAnswer,
  addIceCandidate
} from '../lib/webrtc';

interface VideoCallProps {
  roomId: string;
  userId: string;
  username: string;
  isVisible: boolean;
  onClose: () => void;
}

export const VideoCall: React.FC<VideoCallProps> = ({
  roomId,
  userId,
  username,
  isVisible,
  onClose,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [participants, setParticipants] = useState<string[]>([]);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  // Initialize video call
  useEffect(() => {
    if (!isVisible) return;

    let mounted = true;
    
    const initCall = async () => {
      try {
        setIsConnecting(true);
        setError(null);

        // Initialize local stream
        const stream = await initializeLocalStream(true, true);
        if (!mounted) return;
        
        localStreamRef.current = stream;
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        
        // Create peer connection
        const peerConnection = createPeerConnection();
        peerConnectionRef.current = peerConnection;
        
        // Start video call
        await startVideoCall(roomId, userId);
        
        // Set up event listeners
        setupVideoCallListeners(
          handleIncomingCall,
          handleUserJoined,
          handleUserLeft,
          handleIceCandidate,
          handleCallEnded
        );
        
        // Listen for remote stream event
        window.addEventListener('remote-stream-ready', handleRemoteStream);
        
        setIsConnecting(false);
        
      } catch (err: any) {
        if (!mounted) return;
        setError(err.message || 'Failed to initialize video call');
        console.error('Video call error:', err);
        setIsConnecting(false);
      }
    };

    initCall();

    return () => {
      mounted = false;
      window.removeEventListener('remote-stream-ready', handleRemoteStream);
      handleEndCall();
    };
  }, [isVisible, roomId, userId]);

  // Handle incoming call from remote peer
  const handleIncomingCall = async (data: any) => {
    try {
      if (data.offer) {
        await acceptCall(data.offer);
      }
    } catch (error) {
      console.error('Error handling incoming call:', error);
      setError('Failed to accept incoming call');
    }
  };

  // Handle remote user joining the call
  const handleUserJoined = (data: any) => {
    setParticipants(prev => [...prev, data.userId]);
    console.log(`User joined: ${data.userId}`);
  };

  // Handle remote user leaving the call
  const handleUserLeft = (data: any) => {
    setParticipants(prev => prev.filter(id => id !== data.userId));
    console.log(`User left: ${data.userId}`);
  };

  // Handle ICE candidates from remote peer
  const handleIceCandidate = async (data: any) => {
    if (data.candidate) {
      await addIceCandidate(data.candidate);
    }
  };

  // Handle call being ended by remote peer
  const handleCallEnded = () => {
    setParticipants([]);
    onClose();
  };

  // Handle receiving remote stream
  const handleRemoteStream = (event: Event) => {
    const customEvent = event as CustomEvent;
    if (customEvent.detail && customEvent.detail.stream) {
      remoteStreamRef.current = customEvent.detail.stream;
      
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = customEvent.detail.stream;
      }
    }
  };

  // End the call and cleanup
  const handleEndCall = async () => {
    await endVideoCall();
    onClose();
  };

  // Toggle video on/off
  const handleToggleVideo = () => {
    const newState = !isVideoEnabled;
    toggleVideo(newState);
    setIsVideoEnabled(newState);
  };

  // Toggle audio on/off
  const handleToggleAudio = () => {
    const newState = !isAudioEnabled;
    toggleAudio(newState);
    setIsAudioEnabled(newState);
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      className={`fixed ${
        isMinimized
          ? 'bottom-4 right-4 w-64 h-48'
          : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px]'
      } bg-white dark:bg-gray-900 neo-brutal rounded-lg shadow-xl overflow-hidden transition-all duration-300 z-50`}
    >
      <div className="p-4 flex justify-between items-center border-b dark:border-gray-700">
        <h3 className="font-semibold">Video Call</h3>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? <Video size={16} /> : <VideoOff size={16} />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEndCall}
          >
            <X size={16} />
          </Button>
        </div>
      </div>

      <div className={`relative ${isMinimized ? 'h-36' : 'h-[500px]'}`}>
        {isConnecting ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
              <p>Connecting to call...</p>
            </div>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50">
            <div className="text-center text-white">
              <p className="text-red-400 mb-4">{error}</p>
              <Button variant="secondary" onClick={handleEndCall}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="h-full w-full bg-gray-900 flex flex-col">
            {/* Main video area - now showing local video primarily */}
            <div className="flex-1 relative">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              
              {!isVideoEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                  <VideoOff size={64} className="text-white opacity-50" />
                  <p className="text-white mt-4">Your camera is off</p>
                </div>
              )}
              
              {/* Status banner */}
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-green-500 bg-opacity-80 text-white px-4 py-1 rounded-full text-sm font-medium">
                Your video is being shared with {participants.length} participant{participants.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        )}
      </div>

      {(!isConnecting && !error) && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="p-4 flex justify-center gap-4"
        >
          <Button
            variant="outline"
            size="icon"
            onClick={handleToggleAudio}
            className={`neo-brutal ${!isAudioEnabled ? 'bg-red-500 text-white' : ''}`}
          >
            {isAudioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleToggleVideo}
            className={`neo-brutal ${!isVideoEnabled ? 'bg-red-500 text-white' : ''}`}
          >
            {isVideoEnabled ? <Camera size={20} /> : <VideoOff size={20} />}
          </Button>
          <Button
            variant="destructive"
            size="icon"
            onClick={handleEndCall}
            className="neo-brutal"
          >
            <PhoneOff size={20} />
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
};
