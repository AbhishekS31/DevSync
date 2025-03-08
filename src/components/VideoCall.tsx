import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Mic, MicOff, PhoneOff, Video, VideoOff, X } from 'lucide-react';
import { DyteMeeting } from '@dytesdk/react-ui-kit';
import { DyteProvider, useDyteClient } from '@dytesdk/react-web-core';
import { Button } from './ui/button';

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
  const [meeting, setMeeting] = useState<any>(null);

  useEffect(() => {
    if (!isVisible) return;

    let cleanup = false;

    const initCall = async () => {
      try {
        setIsConnecting(true);
        setError(null);

        // Create a new meeting
        const response = await fetch('https://api.dyte.io/v2/meetings', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(import.meta.env.VITE_DYTE_ORG_ID + ':' + import.meta.env.VITE_DYTE_API_KEY)}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: `Room ${roomId}`,
            preferred_region: 'ap-south-1',
            record_on_start: false,
          }),
        });

        const meetingData = await response.json();
        if (!meetingData.success) {
          throw new Error('Failed to create meeting');
        }

        const meetingId = meetingData.data.id;

        // Add participant
        const participantResponse = await fetch(`https://api.dyte.io/v2/meetings/${meetingId}/participants`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(import.meta.env.VITE_DYTE_ORG_ID + ':' + import.meta.env.VITE_DYTE_API_KEY)}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: username,
            client_specific_id: userId,
            preset_name: 'group_call_participant',
          }),
        });

        const participantData = await participantResponse.json();
        if (!participantData.success) {
          throw new Error('Failed to add participant');
        }

        const authToken = participantData.data.authToken;

        // Initialize DyteClient
        const dyteClient = await DyteClient.init({
          authToken,
          defaults: {
            audio: true,
            video: true,
          },
        });

        if (!cleanup) {
          setMeeting(dyteClient);
          await dyteClient.joinRoom();
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
      if (meeting) {
        meeting.leaveRoom();
      }
    };
  }, [isVisible, roomId, userId, username]);

  const handleEndCall = async () => {
    if (meeting) {
      await meeting.leaveRoom();
    }
    setMeeting(null);
    onClose();
  };

  if (!isVisible) return null;

  return (
    <DyteProvider value={meeting}>
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
          ) : meeting ? (
            <DyteMeeting
              meeting={meeting}
              mode="fill"
              showSetupScreen={false}
            />
          ) : null}
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
    </DyteProvider>
  );
};