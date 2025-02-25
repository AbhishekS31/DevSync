import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Mic, MicOff, PhoneOff, Video, VideoOff, X } from 'lucide-react';
import { Button } from './ui/button';
import { initVideoCall } from '../lib/zegoCloud';
import type { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';

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
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zegoInstance, setZegoInstance] = useState<ZegoUIKitPrebuilt | null>(null);

  useEffect(() => {
    if (!isVisible || !videoContainerRef.current) return;

    let cleanup = false;

    const initCall = async () => {
      try {
        setIsConnecting(true);
        setError(null);

        const zp = await initVideoCall(
          videoContainerRef.current!,
          roomId,
          userId,
          username,
          'Host'
        );

        if (!cleanup) {
          setZegoInstance(zp);
        }
      } catch (err: any) {
        if (!cleanup) {
          setError(err.message || 'Failed to initialize video call');
          console.error('Video call error:', err);
        }
      } finally {
        if (!cleanup) {
          setIsConnecting(false);
        }
      }
    };

    initCall();

    return () => {
      cleanup = true;
      if (zegoInstance) {
        zegoInstance.destroy();
        setZegoInstance(null);
      }
    };
  }, [isVisible, roomId, userId, username]);

  const handleEndCall = () => {
    if (zegoInstance) {
      zegoInstance.destroy();
      setZegoInstance(null);
    }
    onClose();
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
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
            <div 
              ref={videoContainerRef}
              className="w-full h-full"
            />
          )}
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="p-4 flex justify-center gap-4"
        >
          <Button
            variant="destructive"
            size="icon"
            onClick={handleEndCall}
            className="neo-brutal"
          >
            <PhoneOff size={20} />
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
