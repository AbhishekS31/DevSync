import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Code2, Users, Rocket, ArrowRight, Github, Zap } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <motion.div
        className="absolute inset-0 z-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="absolute top-20 left-20 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-30"
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-20 right-20 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-30"
          animate={{
            scale: [1.2, 1, 1.2],
            x: [0, -50, 0],
            rotate: [90, 0, 90],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/3 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-30"
          animate={{
            scale: [1, 1.3, 1],
            y: [0, 30, 0],
            rotate: [0, -60, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Code particles */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-white/10 font-mono text-xs"
            initial={{ 
              x: Math.random() * window.innerWidth, 
              y: Math.random() * window.innerHeight,
              opacity: 0.1 + Math.random() * 0.3
            }}
            animate={{
              y: [null, Math.random() * -500],
              opacity: [null, 0]
            }}
            transition={{
              duration: 10 + Math.random() * 20,
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * 10
            }}
          >
            {['const', 'function', 'import', 'export', 'class', 'return', 'await', 'async', '<div>', '</div>'][Math.floor(Math.random() * 10)]}
          </motion.div>
        ))}
      </motion.div>

      {/* Main content */}
      <motion.div
        className="relative bg-white/10 backdrop-blur-lg neo-brutal-lg p-8 max-w-md w-full rounded-xl border border-white/20"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 flex justify-center space-x-8">
          <Character>
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white shadow-lg">
              <Code2 size={32} />
            </div>
          </Character>
          <Character>
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white shadow-lg">
              <Users size={32} />
            </div>
          </Character>
          <Character>
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white shadow-lg">
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
              className="text-white"
            >
              <h1 className="text-3xl font-bold mb-2 text-center bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">DevSync 🚀</h1>
              <p className="text-center text-white/70 mb-6">Real-time collaborative coding environment</p>
              
              <form onSubmit={handleSubmitUsername} className="space-y-4">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-white/90 mb-1">
                    Choose your coding identity
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="neo-brutal w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your username"
                    required
                  />
                </div>
                <motion.button
                  type="submit"
                  className="neo-brutal w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white p-3 rounded-lg flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.02, boxShadow: "0 5px 15px rgba(0,0,0,0.1)" }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span>Continue</span>
                  <ArrowRight size={18} />
                </motion.button>
              </form>
              
              <div className="mt-8 pt-6 border-t border-white/10 text-center">
                <p className="text-white/50 text-sm">Powered by collaborative technology</p>
                <div className="flex justify-center gap-4 mt-4">
                  <motion.div whileHover={{ y: -3 }} className="text-white/70">
                    <Zap size={20} />
                  </motion.div>
                  <motion.div whileHover={{ y: -3 }} className="text-white/70">
                    <Github size={20} />
                  </motion.div>
                  <motion.div whileHover={{ y: -3 }} className="text-white/70">
                    <Code2 size={20} />
                  </motion.div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="room"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6 text-white"
            >
              <h1 className="text-3xl font-bold mb-2 text-center bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Join Workspace</h1>
              <p className="text-center text-white/70 mb-6">Create a new room or join an existing one</p>
              
              <motion.button
                onClick={onCreateRoom}
                className="neo-brutal w-full bg-gradient-to-r from-green-500 to-teal-500 text-white p-4 rounded-lg flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02, boxShadow: "0 5px 15px rgba(0,0,0,0.1)" }}
                whileTap={{ scale: 0.98 }}
              >
                <Rocket size={20} />
                <span>Create New Room</span>
              </motion.button>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-white/20"></div>
                <span className="flex-shrink mx-4 text-white/50">or</span>
                <div className="flex-grow border-t border-white/20"></div>
              </div>

              <form onSubmit={handleJoinRoom} className="space-y-4">
                <div>
                  <label htmlFor="roomId" className="block text-sm font-medium text-white/90 mb-1">
                    Join Existing Room
                  </label>
                  <input
                    type="text"
                    id="roomId"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="neo-brutal w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter room ID"
                    required
                  />
                </div>
                <motion.button
                  type="submit"
                  className="neo-brutal w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white p-3 rounded-lg flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.02, boxShadow: "0 5px 15px rgba(0,0,0,0.1)" }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Users size={18} />
                  <span>Join Room</span>
                </motion.button>
              </form>
              
              <button 
                onClick={() => setStep('username')}
                className="text-white/50 text-sm mt-4 hover:text-white transition-colors w-full text-center"
              >
                &larr; Back to username
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};