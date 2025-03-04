import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Mic, MicOff, Minimize2, Maximize2 } from 'lucide-react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import 'regenerator-runtime/runtime';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

interface AIAssistantProps {
  onClose: () => void;
  aiResponse: string;
  onAskAI: (query: string) => void;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({
  onClose,
  aiResponse,
  onAskAI,
}) => {
  const [query, setQuery] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  useEffect(() => {
    if (transcript) {
      setQuery(transcript);
    }
  }, [transcript]);

  useEffect(() => {
    scrollToBottom();
  }, [aiResponse]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setIsLoading(true);
    await onAskAI(query);
    setIsLoading(false);
    setQuery('');
    resetTranscript();
  };

  const toggleListening = () => {
    if (listening) {
      SpeechRecognition.stopListening();
      setIsListening(false);
    } else {
      resetTranscript();
      SpeechRecognition.startListening({ continuous: true });
      setIsListening(true);
    }
  };

  const formatResponse = (response: string) => {
    // Check if response contains code blocks
    if (response.includes('```')) {
      const parts = response.split(/```(\w+)?\n/);
      return (
        <>
          {parts.map((part, index) => {
            if (index % 3 === 0) {
              // Text content
              return <p key={index} className="mb-4 whitespace-pre-wrap">{part}</p>;
            } else if (index % 3 === 1) {
              // Language identifier
              return null;
            } else {
              // Code block
              const language = parts[index - 1] || 'javascript';
              return (
                <div key={index} className="mb-4 rounded overflow-hidden">
                  <SyntaxHighlighter
                    language={language}
                    style={atomOneDark}
                    className="rounded neo-brutal"
                  >
                    {part}
                  </SyntaxHighlighter>
                </div>
              );
            }
          })}
        </>
      );
    }
    
    return <p className="whitespace-pre-wrap">{response}</p>;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={`fixed bottom-4 right-4 bg-white dark:bg-gray-900 neo-brutal rounded-lg overflow-hidden shadow-xl z-40 ${
        isMinimized ? 'w-64 h-12' : 'w-96 h-[500px]'
      }`}
    >
      <div className="flex items-center justify-between p-3 border-b dark:border-gray-700 bg-gradient-to-r from-blue-500 to-purple-500 text-white">
        <h3 className="font-semibold">AI Assistant</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-white/20 rounded"
          >
            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded"
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
            <div className="h-[400px] overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-800">
              {aiResponse ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-white dark:bg-gray-700 shadow-sm"
                >
                  {formatResponse(aiResponse)}
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                  <div className="w-16 h-16 mb-4 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-white"
                    >
                      <path d="M12 8V4H8"></path>
                      <rect width="16" height="12" x="4" y="8" rx="2"></rect>
                      <path d="M2 14h2"></path>
                      <path d="M20 14h2"></path>
                      <path d="M15 13v2"></path>
                      <path d="M9 13v2"></path>
                    </svg>
                  </div>
                  <p className="text-sm">Ask me anything about your code or programming concepts!</p>
                  <p className="text-xs mt-2">Try: "How do I implement a binary search tree?"</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="p-3 border-t dark:border-gray-700 bg-white dark:bg-gray-900">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={query || transcript}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask the AI assistant..."
                  className="flex-1 p-2 neo-brutal bg-white dark:bg-gray-800 rounded"
                />
                {browserSupportsSpeechRecognition && (
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`p-2 neo-brutal rounded ${
                      isListening ? 'bg-red-500 text-white' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="p-2 neo-brutal bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded hover:opacity-90"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Send size={16} />
                  )}
                </button>
              </div>
              {isListening && (
                <div className="mt-2 text-xs text-gray-500 flex items-center">
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
                  Listening... {transcript ? `"${transcript}"` : ''}
                </div>
              )}
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};