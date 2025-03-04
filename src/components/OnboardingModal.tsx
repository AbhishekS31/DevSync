import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Code2, Users, Rocket } from 'lucide-react';

interface OnboardingModalProps {
  onCreateRoom: () => void;
  onJoinRoom: (roomId: string) => void;
  onSetUsername: (username: string) => void;
}

const Character = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    className="absolute"
    animate={{
      y: [0, -10, 0],
    }}
    transition={{
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }}
  >
    {children}
  </motion.div>
);

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  onCreateRoom,
  onJoinRoom,
  onSetUsername,
}) => {
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [step, setStep] = useState<'username' | 'room'>('username');

  const handleSubmitUsername = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      onSetUsername(username);
      setStep('room');
    }
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim()) {
      onJoinRoom(roomId);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background shapes */}
      <motion.div
        className="absolute inset-0 z-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="absolute top-20 left-20 w-64 h-64 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-20 right-20 w-64 h-64 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl"
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [90, 0, 90],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </motion.div>

      {/* Main content */}
      <motion.div
        className="relative bg-white neo-brutal-lg p-8 max-w-md w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 flex justify-center space-x-8">
          <Character>
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white">
              <Code2 size={32} />
            </div>
          </Character>
          <Character>
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white">
              <Users size={32} />
            </div>
          </Character>
          <Character>
            <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center text-white">
              <Rocket size={32} />
            </div>
          </Character>
        </div>

        <AnimatePresence mode="wait">
          {step === 'username' ? (
            <motion.div
              key="username"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <h1 className="text-3xl font-bold mb-6 text-center">Join DevSync 🚀</h1>
              <form onSubmit={handleSubmitUsername} className="space-y-4">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                    Choose your coding identity
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="neo-brutal w-full p-2 bg-white"
                    placeholder="Enter your username"
                    required
                  />
                </div>
                <motion.button
                  type="submit"
                  className="neo-brutal w-full bg-blue-500 text-white p-2 mt-4"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Continue to Collaboration
                </motion.button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="room"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <h1 className="text-3xl font-bold mb-6 text-center">Choose Your Space</h1>
              <motion.button
                onClick={onCreateRoom}
                className="neo-brutal w-full bg-green-500 text-white p-3"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Create New Room
              </motion.button>

              <div className="text-center text-gray-500">or</div>

              <form onSubmit={handleJoinRoom} className="space-y-4">
                <div>
                  <label htmlFor="roomId" className="block text-sm font-medium text-gray-700 mb-1">
                    Join Existing Room
                  </label>
                  <input
                    type="text"
                    id="roomId"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="neo-brutal w-full p-2 bg-white"
                    placeholder="Enter room ID"
                    required
                  />
                </div>
                <motion.button
                  type="submit"
                  className="neo-brutal w-full bg-blue-500 text-white p-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Join Room
                </motion.button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};