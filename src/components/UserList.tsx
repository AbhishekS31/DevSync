import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, VideoOff, Mic, MicOff, Phone, PhoneOff, User, Users } from 'lucide-react';
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
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
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
      }
    };
  }, [roomId]);

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
    
    // Use the username to generate a consistent color
    const index = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  return (
    <div className="w-72 bg-white dark:bg-gray-900 border-l-2 border-black p-4 overflow-y-auto">
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
                    onClick={() => handleVoiceCall(user.id)}
                    className={`p-1.5 ${
                      user.isInCall ? 'bg-red-500' : 'bg-green-500'
                    } text-white rounded neo-brutal`}
                  >
                    {user.isInCall ? <PhoneOff size={14} /> : <Phone size={14} />}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
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
                  </motion.button>
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
                    <div className="flex justify-center gap-2 mt-2">
                      <button
                        onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                        className={`p-1.5 ${
                          isAudioEnabled ? 'bg-blue-500' : 'bg-gray-500'
                        } text-white rounded neo-brutal`}
                      >
                        {isAudioEnabled ? <Mic size={14} /> : <MicOff size={14} />}
                      </button>
                      <button
                        onClick={() => setIsVideoEnabled(!isVideoEnabled)}
                        className={`p-1.5 ${
                          isVideoEnabled ? 'bg-blue-500' : 'bg-gray-500'
                        } text-white rounded neo-brutal`}
                      >
                        {isVideoEnabled ? <Video size={14} /> : <VideoOff size={14} />}
                      </button>
                    </div>
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