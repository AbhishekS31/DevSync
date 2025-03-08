import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, VideoOff, Users, Mic, MicOff, Camera, X } from 'lucide-react';
import { getSocket } from '../lib/socket';
import { DyteMeeting } from '@dytesdk/react-ui-kit';
import { DyteProvider, useDyteClient } from '@dytesdk/react-web-core';

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

export const UserList: React.FC<UserListProps> = ({ roomId }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [activeCall, setActiveCall] = useState<{
    userId: string;
    meeting: any;
    isMinimized: boolean;
  } | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const socket = getSocket();

  useEffect(() => {
    if (!socket || !roomId) return;

    socket.on('users-update', (updatedUsers: User[]) => {
      setUsers(updatedUsers);
    });

    return () => {
      socket.off('users-update');
      if (activeCall?.meeting) {
        activeCall.meeting.leaveRoom();
      }
    };
  }, [roomId]);

  const handleVideoClick = async (userId: string, username: string) => {
    try {
      if (activeCall?.userId === userId) {
        // End the call if clicking on the same user
        activeCall.meeting.leaveRoom();
        setActiveCall(null);
        return;
      }

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
          title: `Room ${roomId}-${userId}`,
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
      const meeting = await DyteClient.init({
        authToken,
        defaults: {
          audio: true,
          video: true,
        },
      });

      await meeting.joinRoom();
      setActiveCall({ userId, meeting, isMinimized: false });
      setIsAudioEnabled(true);
      setIsVideoEnabled(true);
    } catch (error) {
      console.error('Video call error:', error);
      setError(error.message || 'Failed to start video call');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleEndCall = async () => {
    if (activeCall?.meeting) {
      await activeCall.meeting.leaveRoom();
      setActiveCall(null);
    }
  };

  const handleToggleVideo = async () => {
    if (activeCall?.meeting) {
      const newState = !isVideoEnabled;
      if (newState) {
        await activeCall.meeting.video.enable();
      } else {
        await activeCall.meeting.video.disable();
      }
      setIsVideoEnabled(newState);
    }
  };

  const handleToggleAudio = async () => {
    if (activeCall?.meeting) {
      const newState = !isAudioEnabled;
      if (newState) {
        await activeCall.meeting.audio.enable();
      } else {
        await activeCall.meeting.audio.disable();
      }
      setIsAudioEnabled(newState);
    }
  };

  const handleToggleMinimize = () => {
    if (activeCall) {
      setActiveCall({ ...activeCall, isMinimized: !activeCall.isMinimized });
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

  return (
    <>
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
                className="neo-brutal bg-white dark:bg-gray-800 p-3 rounded-lg overflow-hidden"
              >
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
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleVideoClick(user.id, user.username)}
                      className={`p-1.5 ${
                        activeCall?.userId === user.id ? 'bg-red-500' : 'bg-blue-500'
                      } text-white rounded neo-brutal`}
                    >
                      {activeCall?.userId === user.id ? (
                        <VideoOff size={14} />
                      ) : (
                        <Video size={14} />
                      )}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {activeCall && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ 
              x: 0, 
              opacity: 1,
              height: activeCall.isMinimized ? '120px' : '400px',
              width: activeCall.isMinimized ? '300px' : '400px'
            }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            className={`fixed right-4 bottom-4 bg-gray-900 rounded-lg overflow-hidden shadow-xl neo-brutal z-50`}
          >
            <div className="flex items-center justify-between p-3 bg-gray-800 border-b border-gray-700">
              <h3 className="text-white font-medium">Video Call</h3>
              <div className="flex gap-2">
                <button
                  onClick={handleToggleMinimize}
                  className="p-1.5 hover:bg-gray-700 rounded-md text-gray-300"
                >
                  {activeCall.isMinimized ? <Camera size={16} /> : <VideoOff size={16} />}
                </button>
                <button
                  onClick={handleEndCall}
                  className="p-1.5 hover:bg-gray-700 rounded-md text-gray-300"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <DyteProvider value={activeCall.meeting}>
              {isConnecting ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-white">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white mx-auto mb-2"></div>
                    <p className="text-sm">Connecting...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-white">
                    <p className="text-red-400 text-sm mb-2">{error}</p>
                    <button
                      onClick={() => setError(null)}
                      className="px-3 py-1 bg-gray-700 rounded-md text-sm hover:bg-gray-600"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative h-full">
                  <DyteMeeting
                    meeting={activeCall.meeting}
                    mode="fill"
                    showSetupScreen={false}
                  />
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-4 z-10">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleToggleAudio}
                      className={`p-2 rounded-full ${
                        isAudioEnabled ? 'bg-blue-500' : 'bg-red-500'
                      } text-white neo-brutal`}
                    >
                      {isAudioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleToggleVideo}
                      className={`p-2 rounded-full ${
                        isVideoEnabled ? 'bg-blue-500' : 'bg-red-500'
                      } text-white neo-brutal`}
                    >
                      {isVideoEnabled ? <Camera size={20} /> : <VideoOff size={20} />}
                    </motion.button>
                  </div>
                </div>
              )}
            </DyteProvider>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};