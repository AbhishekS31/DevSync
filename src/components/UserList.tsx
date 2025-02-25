import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, VideoOff, Phone, PhoneOff } from 'lucide-react';
import { getSocket } from '../lib/socket';
import { initVideoCall } from '../lib/zegoCloud';
import type { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';

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
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [zegoInstance, setZegoInstance] = useState<ZegoUIKitPrebuilt | null>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const socket = getSocket();

  useEffect(() => {
    if (!socket || !roomId) return;

    socket.on('users-update', (updatedUsers: User[]) => {
      setUsers(updatedUsers);
    });

    return () => {
      socket.off('users-update');
      if (zegoInstance) {
        zegoInstance.destroy();
        setZegoInstance(null);
      }
    };
  }, [roomId, zegoInstance]);

  const handleVideoClick = async (userId: string, username: string) => {
    try {
      if (expandedUser === userId) {
        if (zegoInstance) {
          zegoInstance.destroy();
          setZegoInstance(null);
        }
        setExpandedUser(null);
      } else {
        if (!videoContainerRef.current) return;

        if (zegoInstance) {
          zegoInstance.destroy();
        }

        const zp = await initVideoCall(
          videoContainerRef.current,
          roomId,
          userId,
          username,
          'Host'
        );

        setZegoInstance(zp);
        setExpandedUser(userId);
      }
    } catch (error) {
      console.error('Video call error:', error);
    }
  };

  const handleVoiceCall = async (userId: string) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      if (user.isInCall) {
        if (zegoInstance) {
          zegoInstance.destroy();
          setZegoInstance(null);
        }
        user.isInCall = false;
      } else {
        if (!videoContainerRef.current) return;

        const zp = await initVideoCall(
          videoContainerRef.current,
          roomId,
          userId,
          user.username,
          'Cohost'
        );

        setZegoInstance(zp);
        user.isInCall = true;
      }
      setUsers([...users]);
    } catch (error) {
      console.error('Voice call error:', error);
    }
  };

  return (
    <div className="w-72 bg-white dark:bg-gray-900 border-l-2 border-black p-4 overflow-y-auto">
      <h3 className="font-bold mb-4">Online Users</h3>
      <div className="space-y-4">
        <AnimatePresence>
          {users.map((user) => (
            <motion.div
              key={user.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="neo-brutal bg-white dark:bg-gray-800 p-3 rounded-lg"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm font-medium">{user.username}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleVoiceCall(user.id)}
                    className={`p-1.5 ${
                      user.isInCall ? 'bg-red-500' : 'bg-green-500'
                    } text-white rounded neo-brutal`}
                  >
                    {user.isInCall ? <PhoneOff size={14} /> : <Phone size={14} />}
                  </button>
                  <button
                    onClick={() => handleVideoClick(user.id, user.username)}
                    className={`p-1.5 ${
                      expandedUser === user.id ? 'bg-red-500' : 'bg-blue-500'
                    } text-white rounded neo-brutal`}
                  >
                    {expandedUser === user.id ? (
                      <VideoOff size={14} />
                    ) : (
                      <Video size={14} />
                    )}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {expandedUser === user.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div 
                      ref={videoContainerRef}
                      className="relative w-full h-40 mt-2 overflow-hidden rounded neo-brutal"
                    />
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
