import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Minimize2, Maximize2 } from 'lucide-react';
import { getSocket } from '../lib/socket';

interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: number;
}

interface ChatProps {
  roomId: string;
  username: string;
}

export const Chat: React.FC<ChatProps> = ({ roomId, username }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socket = getSocket();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!socket || !roomId) return;

    socket.on('chat-message', (message: Message) => {
      setMessages(prev => [...prev, message]);
      scrollToBottom();
    });

    return () => {
      socket.off('chat-message');
    };
  }, [roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket) return;

    const message = {
      id: Date.now().toString(),
      text: newMessage,
      sender: username,
      timestamp: Date.now()
    };

    socket.emit('send-message', { message, roomId });
    setMessages(prev => [...prev, message]);
    setNewMessage('');
  };

  return (
    <motion.div
      initial={false}
      animate={{ 
        scale: 1,
        opacity: 1,
        x: 0
      }}
      className={`fixed bottom-4 right-4 bg-white dark:bg-gray-900 neo-brutal rounded-lg overflow-hidden shadow-xl z-40 ${
        isMinimized ? 'w-64 h-12' : 'w-96 h-[500px]'
      }`}
    >
      <div className="flex items-center justify-between p-3 border-b dark:border-gray-700">
        <h3 className="font-semibold">Chat</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
          <button
            onClick={() => socket?.emit('close-chat')}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!isMinimized && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="h-[400px] overflow-y-auto p-4 space-y-4">
              {messages.map(message => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-3 rounded-lg neo-brutal ${
                    message.sender === username
                      ? 'ml-auto bg-blue-100 dark:bg-blue-900'
                      : 'bg-gray-100 dark:bg-gray-800'
                  } max-w-[80%]`}
                >
                  <div className="font-semibold text-sm mb-1">{message.sender}</div>
                  <div className="text-sm">{message.text}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="p-3 border-t dark:border-gray-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 p-2 neo-brutal bg-white dark:bg-gray-800 rounded"
                />
                <button
                  type="submit"
                  className="p-2 neo-brutal bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  <Send size={16} />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};